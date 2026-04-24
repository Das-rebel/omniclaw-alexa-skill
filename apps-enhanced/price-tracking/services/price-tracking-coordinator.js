/**
 * Price Tracking Coordinator
 *
 * Orchestrates all price tracking services:
 * - Manages scraping jobs
 * - Coordinates Redis Streams consumers
 * - Integrates price analysis
 * - Handles alert evaluation
 * - Sends notifications
 *
 * Entry point for scheduled tasks and HTTP endpoints
 */

const RedisStreamsService = require('./redis-streams-service');
const PriceAnalyzer = require('./price-analyzer');
const AlertEvaluator = require('./alert-evaluator');
const NotificationService = require('./notification-service');
const SchedulerService = require('./scheduler-service');
const ScraperFactory = require('../scrapers/scraper-factory');
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('PriceTrackingCoordinator');

class PriceTrackingCoordinator {
  constructor(config = {}) {
    this.config = {
      consumerName: `worker-${process.env.HOSTNAME || 'local'}-${Date.now()}`,
      pollingInterval: 5000,
      maxConcurrentJobs: 5,
      ...config
    };

    // Initialize services
    this.streams = new RedisStreamsService();
    this.analyzer = new PriceAnalyzer();
    this.evaluator = new AlertEvaluator();
    this.notifier = new NotificationService();
    this.scheduler = new SchedulerService();
    this.scraperFactory = new ScraperFactory();

    this.running = false;
    this.activeJobs = new Map();
  }

  /**
   * Initialize coordinator
   */
  async initialize() {
    try {
      logger.info('Initializing Price Tracking Coordinator...');

      // Initialize Redis Streams
      await this.streams.initialize();

      // Create scheduled jobs
      await this.scheduler.createScheduledJobs();

      logger.info('Price Tracking Coordinator initialized');
      return true;

    } catch (error) {
      logger.error('Failed to initialize coordinator:', error);
      throw error;
    }
  }

  /**
   * Start processing jobs
   */
  async start() {
    try {
      if (this.running) {
        logger.warn('Coordinator already running');
        return;
      }

      this.running = true;
      logger.info('Starting Price Tracking Coordinator...');

      // Start consumers
      this.startScrapingConsumer();
      this.startAnalysisConsumer();
      this.startAlertsConsumer();

      logger.info('Price Tracking Coordinator started');

    } catch (error) {
      logger.error('Failed to start coordinator:', error);
      throw error;
    }
  }

  /**
   * Stop processing jobs
   */
  async stop() {
    try {
      logger.info('Stopping Price Tracking Coordinator...');

      this.running = false;

      // Wait for active jobs to complete
      const maxWait = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.activeJobs.size > 0 && Date.now() - startTime < maxWait) {
        logger.info(`Waiting for ${this.activeJobs.size} active jobs...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.activeJobs.size > 0) {
        logger.warn(`Force stopping with ${this.activeJobs.size} jobs still active`);
      }

      logger.info('Price Tracking Coordinator stopped');

    } catch (error) {
      logger.error('Failed to stop coordinator:', error);
      throw error;
    }
  }

  /**
   * Start scraping consumer
   */
  startScrapingConsumer() {
    const consume = async () => {
      while (this.running) {
        try {
          // Check concurrency limit
          if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // Read scraping jobs
          const jobs = await this.streams.readScrapingJobs(this.config.consumerName, 1);

          if (jobs.length === 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.pollingInterval));
            continue;
          }

          for (const job of jobs) {
            this.processScrapingJob(job).catch(error => {
              logger.error(`Failed to process scraping job ${job.jobId}:`, error);
            });
          }

        } catch (error) {
          logger.error('Error in scraping consumer:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    consume().catch(error => {
      logger.error('Fatal error in scraping consumer:', error);
    });
  }

  /**
   * Process scraping job
   */
  async processScrapingJob(job) {
    const { jobId, messageId, url, platform, productId } = job;

    try {
      logger.info(`Processing scraping job: ${jobId}`);

      // Track active job
      this.activeJobs.set(jobId, { type: 'scraping', url });

      // Get scraper
      const scraper = this.scraperFactory.getScraper(platform);

      // Scrape product
      const result = await scraper.scrape(url);

      if (result.success) {
        // Add analysis job
        await this.streams.addAnalysisJob({
          productId,
          platform,
          priceData: result.data
        });

        // Acknowledge scraping job
        await this.streams.acknowledgeJob(this.streams.streams.scraping, messageId);
      } else {
        // Retry or move to DLQ
        const retried = await this.streams.retryJob(this.streams.streams.scraping, messageId);
        if (!retried) {
          await this.streams.acknowledgeJob(this.streams.streams.scraping, messageId);
        }
      }

    } catch (error) {
      logger.error(`Error processing scraping job ${jobId}:`, error);
      await this.streams.moveToDeadLetter(
        this.streams.streams.scraping,
        messageId,
        error.message
      );
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Start analysis consumer
   */
  startAnalysisConsumer() {
    const consume = async () => {
      while (this.running) {
        try {
          // Read analysis jobs
          const jobs = await this.streams.readAnalysisJobs(this.config.consumerName, 1);

          if (jobs.length === 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.pollingInterval));
            continue;
          }

          for (const job of jobs) {
            this.processAnalysisJob(job).catch(error => {
              logger.error(`Failed to process analysis job ${job.jobId}:`, error);
            });
          }

        } catch (error) {
          logger.error('Error in analysis consumer:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    consume().catch(error => {
      logger.error('Fatal error in analysis consumer:', error);
    });
  }

  /**
   * Process analysis job
   */
  async processAnalysisJob(job) {
    const { jobId, messageId, productId, platform, priceData } = job;

    try {
      logger.info(`Processing analysis job: ${jobId}`);

      // Track active job
      this.activeJobs.set(jobId, { type: 'analysis', productId });

      // Analyze price
      const analysis = await this.analyzer.analyzePrice({
        ...priceData,
        productId,
        platform
      });

      // Get user alerts for this product
      const userAlerts = await this.getUserAlerts(productId);

      // Evaluate alerts
      const triggeredAlerts = await this.evaluator.evaluate(analysis, userAlerts);

      // Add alert jobs
      for (const alert of triggeredAlerts) {
        await this.streams.addAlertJob(alert);
      }

      // Acknowledge analysis job
      await this.streams.acknowledgeJob(this.streams.streams.analysis, messageId);

    } catch (error) {
      logger.error(`Error processing analysis job ${jobId}:`, error);
      await this.streams.moveToDeadLetter(
        this.streams.streams.analysis,
        messageId,
        error.message
      );
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Start alerts consumer
   */
  startAlertsConsumer() {
    const consume = async () => {
      while (this.running) {
        try {
          // Read alert jobs
          const jobs = await this.streams.readAlertJobs(this.config.consumerName, 1);

          if (jobs.length === 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.pollingInterval));
            continue;
          }

          for (const job of jobs) {
            this.processAlertJob(job).catch(error => {
              logger.error(`Failed to process alert job ${job.jobId}:`, error);
            });
          }

        } catch (error) {
          logger.error('Error in alerts consumer:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    consume().catch(error => {
      logger.error('Fatal error in alerts consumer:', error);
    });
  }

  /**
   * Process alert job
   */
  async processAlertJob(job) {
    const { jobId, messageId, userId, ...alert } = job;

    try {
      logger.info(`Processing alert job: ${jobId}`);

      // Track active job
      this.activeJobs.set(jobId, { type: 'alert', userId });

      // Get user preferences
      const userPreferences = await this.getUserPreferences(userId);

      // Send notification
      await this.notifier.sendNotification(userId, alert, userPreferences);

      // Acknowledge alert job
      await this.streams.acknowledgeJob(this.streams.streams.alerts, messageId);

    } catch (error) {
      logger.error(`Error processing alert job ${jobId}:`, error);

      // Retry notification errors
      const retried = await this.streams.retryJob(this.streams.streams.alerts, messageId);
      if (!retried) {
        await this.streams.acknowledgeJob(this.streams.streams.alerts, messageId);
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Get user alerts for product
   */
  async getUserAlerts(productId) {
    try {
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const alerts = await redis.keys(`alert:user:*:${productId}`);
      const userAlerts = [];

      for (const key of alerts) {
        const alertData = await redis.get(key);
        if (alertData) {
          userAlerts.push(JSON.parse(alertData));
        }
      }

      return userAlerts;
    } catch (error) {
      logger.error('Failed to get user alerts:', error);
      return [];
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    try {
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const prefs = await redis.get(`user:preferences:${userId}`);
      return prefs ? JSON.parse(prefs) : {};
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      return {};
    }
  }

  /**
   * Add product to tracking
   */
  async trackProduct(userId, productData) {
    try {
      const { url, platform, alertConfig } = productData;

      // Get scraper and extract product ID
      const scraper = this.scraperFactory.getScraper(platform);
      const productId = scraper.extractProductId(url);

      if (!productId) {
        throw new Error('Could not extract product ID from URL');
      }

      // Store alert configuration
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const alertData = {
        id: `alert-${Date.now()}`,
        userId,
        productId,
        platform,
        url,
        active: true,
        createdAt: Date.now(),
        ...alertConfig
      };

      await redis.set(
        `alert:user:${userId}:${productId}`,
        JSON.stringify(alertData),
        { ex: 2 * 365 * 24 * 60 * 60 } // 2 years
      );

      // Add initial scraping job
      await this.streams.addScrapingJob({
        url,
        platform,
        productId,
        priority: alertConfig.priority || 'normal'
      });

      logger.info(`Started tracking product ${productId} for user ${userId}`);
      return alertData;

    } catch (error) {
      logger.error('Failed to track product:', error);
      throw error;
    }
  }

  /**
   * Get tracking statistics
   */
  async getStats() {
    try {
      const streamStats = await this.streams.getStats();

      return {
        activeJobs: this.activeJobs.size,
        running: this.running,
        consumerName: this.config.consumerName,
        streams: streamStats
      };
    } catch (error) {
      logger.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Handle scheduled scraping request
   */
  async handleScheduledScraping(request) {
    try {
      const { priority, interval } = request;

      logger.info(`Handling scheduled scraping: priority=${priority}, interval=${interval}`);

      // Get products to scrape based on priority
      const products = await this.getProductsByPriority(priority);

      // Add scraping jobs
      const jobs = [];
      for (const product of products) {
        const job = await this.streams.addScrapingJob({
          url: product.url,
          platform: product.platform,
          productId: product.productId,
          priority,
          scheduledFor: Date.now()
        });
        jobs.push(job);
      }

      logger.info(`Scheduled ${jobs.length} scraping jobs`);
      return { success: true, jobsScheduled: jobs.length };

    } catch (error) {
      logger.error('Failed to handle scheduled scraping:', error);
      throw error;
    }
  }

  /**
   * Get products by priority
   */
  async getProductsByPriority(priority) {
    try {
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const key = `products:priority:${priority}`;
      const products = await redis.smembers(key);

      return products.map(p => JSON.parse(p));
    } catch (error) {
      logger.error('Failed to get products by priority:', error);
      return [];
    }
  }

  /**
   * Handle cleanup request
   */
  async handleCleanup() {
    try {
      logger.info('Running cleanup task...');

      // Clean old stream messages
      await this.streams.cleanOldStreams();

      // Clean old price data
      await this.analyzer.clearOldData();

      // Clean old alerts
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const users = await redis.keys('user:preferences:*');
      for (const userKey of users) {
        const userId = userKey.split(':')[2];
        await this.evaluator.clearOldAlerts(userId);
      }

      logger.info('Cleanup completed');
      return { success: true };

    } catch (error) {
      logger.error('Failed to handle cleanup:', error);
      throw error;
    }
  }
}

module.exports = PriceTrackingCoordinator;
