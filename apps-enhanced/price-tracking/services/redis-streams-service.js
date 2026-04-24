/**
 * Redis Streams Service
 *
 * Manages message queues for price tracking with consumer groups:
 * - scraping-queue: For URL scraping jobs
 * - analysis-queue: For price analysis tasks
 * - alerts-queue: For alert notification tasks
 *
 * Three consumer groups for parallel processing:
 * - scrapers: For multiple scraper instances
 * - analyzers: For price analysis workers
 * - notifiers: For alert delivery workers
 */

const { Redis } = require('@upstash/redis');
const { Logger } = require('../../../shared/monitoring/logger');
const logger = new Logger('RedisStreamsService');

class RedisStreamsService {
  constructor(config = {}) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    this.streams = {
      scraping: 'price-tracking:scraping-queue',
      analysis: 'price-tracking:analysis-queue',
      alerts: 'price-tracking:alerts-queue'
    };

    this.consumerGroups = {
      scrapers: 'scrapers-group',
      analyzers: 'analyzers-group',
      notifiers: 'notifiers-group'
    };

    this.config = {
      maxPendingPerConsumer: 10,
      blockTimeout: 5000,
      maxRetries: 3,
      messageTTL: 7 * 24 * 60 * 60, // 7 days
      ...config
    };
  }

  /**
   * Initialize streams and consumer groups
   */
  async initialize() {
    try {
      logger.info('Initializing Redis Streams...');

      // Create streams with consumer groups
      for (const [streamKey, streamName] of Object.entries(this.streams)) {
        try {
          // Try to create stream with consumer group
          await this.redis.xadd(streamName, '*',', 'init', 'true');
          await this.redis.xgroup_create(
            streamName,
            this.consumerGroups[streamKey],
            '0',
            { mkstream: true }
          );
          logger.info(`Created stream: ${streamName}`);
        } catch (error) {
          if (error.message.includes('BUSYGROUP')) {
            logger.info(`Consumer group already exists: ${streamName}`);
          } else {
            logger.error(`Error creating stream ${streamName}:`, error.message);
          }
        }
      }

      logger.info('Redis Streams initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Redis Streams:', error);
      throw error;
    }
  }

  /**
   * Add scraping job to queue
   */
  async addScrapingJob(job) {
    try {
      const jobId = `scrape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const jobData = {
        jobId,
        url: job.url,
        platform: job.platform,
        productId: job.productId,
        priority: job.priority || 'normal',
        scheduledFor: job.scheduledFor || Date.now(),
        retryCount: 0,
        ...job.metadata
      };

      const streamId = await this.redis.xadd(
        this.streams.scraping,
        '*',
        'data', JSON.stringify(jobData)
      );

      logger.info(`Added scraping job: ${jobId} for ${job.url}`);
      return { jobId, streamId };
    } catch (error) {
      logger.error('Failed to add scraping job:', error);
      throw error;
    }
  }

  /**
   * Add analysis job to queue
   */
  async addAnalysisJob(job) {
    try {
      const jobId = `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const jobData = {
        jobId,
        productId: job.productId,
        platform: job.platform,
        priceData: job.priceData,
        previousPrice: job.previousPrice,
        alertThreshold: job.alertThreshold,
        userId: job.userId,
        ...job.metadata
      };

      const streamId = await this.redis.xadd(
        this.streams.analysis,
        '*',
        'data', JSON.stringify(jobData)
      );

      logger.info(`Added analysis job: ${jobId} for product ${job.productId}`);
      return { jobId, streamId };
    } catch (error) {
      logger.error('Failed to add analysis job:', error);
      throw error;
    }
  }

  /**
   * Add alert job to queue
   */
  async addAlertJob(job) {
    try {
      const jobId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const jobData = {
        jobId,
        productId: job.productId,
        userId: job.userId,
        alertType: job.alertType,
        message: job.message,
        channels: job.channels || ['alexa'],
        priority: job.priority || 'normal',
        ...job.metadata
      };

      const streamId = await this.redis.xadd(
        this.streams.alerts,
        '*',
        'data', JSON.stringify(jobData)
      );

      logger.info(`Added alert job: ${jobId} for user ${job.userId}`);
      return { jobId, streamId };
    } catch (error) {
      logger.error('Failed to add alert job:', error);
      throw error;
    }
  }

  /**
   * Read jobs from scraping queue
   */
  async readScrapingJobs(consumerName, count = 1) {
    return this.readJobs(
      this.streams.scraping,
      this.consumerGroups.scrapers,
      consumerName,
      count
    );
  }

  /**
   * Read jobs from analysis queue
   */
  async readAnalysisJobs(consumerName, count = 1) {
    return this.readJobs(
      this.streams.analysis,
      this.consumerGroups.analyzers,
      consumerName,
      count
    );
  }

  /**
   * Read jobs from alerts queue
   */
  async readAlertJobs(consumerName, count = 1) {
    return this.readJobs(
      this.streams.alerts,
      this.consumerGroups.notifiers,
      consumerName,
      count
    );
  }

  /**
   * Generic method to read jobs from stream
   */
  async readJobs(stream, consumerGroup, consumerName, count) {
    try {
      const response = await this.redis.xreadgroup(
        'GROUP',
        consumerGroup,
        consumerName,
        'COUNT',
        count.toString(),
        'BLOCK',
        this.config.blockTimeout.toString(),
        'STREAMS',
        stream,
        '>'
      );

      if (!response || response.length === 0) {
        return [];
      }

      const jobs = response[0][1].map(([messageId, fields]) => {
        const data = JSON.parse(fields[1]);
        return {
          messageId,
          stream,
          ...data
        };
      });

      return jobs;
    } catch (error) {
      if (error.message.includes('NOGROUP')) {
        logger.warn(`Consumer group does not exist: ${consumerGroup}`);
        await this.initialize();
      }
      return [];
    }
  }

  /**
   * Acknowledge job completion
   */
  async acknowledgeJob(stream, messageId) {
    try {
      await this.redis.xack(stream, this.getConsumerGroupForStream(stream), messageId);
      logger.debug(`Acknowledged message: ${messageId}`);
    } catch (error) {
      logger.error(`Failed to acknowledge message ${messageId}:`, error);
    }
  }

  /**
   * Move failed job to dead letter queue
   */
  async moveToDeadLetter(stream, messageId, error) {
    try {
      const dlqStream = `${stream}:dlq`;
      const jobData = await this.redis.xrange(stream, messageId, messageId);

      if (jobData && jobData.length > 0) {
        await this.redis.xadd(
          dlqStream,
          '*',
          'originalMessageId', messageId,
          'originalStream', stream,
          'error', error,
          'data', jobData[0][1].data,
          'failedAt', new Date().toISOString()
        );
      }

      await this.redis.xdel(stream, messageId);
      logger.warn(`Moved message ${messageId} to DLQ`);
    } catch (error) {
      logger.error(`Failed to move message to DLQ:`, error);
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(stream, messageId, retryDelay = 60000) {
    try {
      const jobData = await this.redis.xrange(stream, messageId, messageId);

      if (jobData && jobData.length > 0) {
        const data = JSON.parse(jobData[0][1].data);
        data.retryCount = (data.retryCount || 0) + 1;

        if (data.retryCount > this.config.maxRetries) {
          await this.moveToDeadLetter(stream, messageId, 'Max retries exceeded');
          return false;
        }

        // Add retry delay
        data.scheduledFor = Date.now() + retryDelay;

        await this.redis.xadd(stream, '*', 'data', JSON.stringify(data));
        await this.redis.xdel(stream, messageId);

        logger.info(`Retrying job: ${data.jobId} (attempt ${data.retryCount})`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to retry job:`, error);
      return false;
    }
  }

  /**
   * Get consumer group for stream
   */
  getConsumerGroupForStream(stream) {
    if (stream === this.streams.scraping) return this.consumerGroups.scrapers;
    if (stream === this.streams.analysis) return this.consumerGroups.analyzers;
    if (stream === this.streams.alerts) return this.consumerGroups.notifiers;
    throw new Error(`Unknown stream: ${stream}`);
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    try {
      const stats = {};

      for (const [key, streamName] of Object.entries(this.streams)) {
        const streamInfo = await this.redis.xinfo_stream(streamName);
        const groups = await this.redis.xinfo_groups(streamName);

        stats[key] = {
          streamName,
          length: streamInfo.length,
          groups: groups.map(group => ({
            name: group.name,
            pending: group.pending,
            consumers: group.consumers
          }))
        };
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Clean old messages from streams
   */
  async cleanOldStreams(maxAge = this.config.messageTTL) {
    try {
      const cutoffTime = Date.now() - (maxAge * 1000);

      for (const streamName of Object.values(this.streams)) {
        // Delete messages older than cutoff
        const messages = await this.redis.xrange(streamName, '-', '+', '100');

        for (const [messageId] of messages) {
          const timestamp = parseInt(messageId.split('-')[0]);
          if (timestamp < cutoffTime) {
            await this.redis.xdel(streamName, messageId);
          }
        }
      }

      logger.info('Cleaned old stream messages');
    } catch (error) {
      logger.error('Failed to clean old streams:', error);
    }
  }

  /**
   * Get pending messages for consumer group
   */
  async getPendingMessages(stream, consumerGroup) {
    try {
      const pending = await this.redis.xpending_range(
        stream,
        consumerGroup,
        '-',
        '+',
        100
      );

      return pending.map(msg => ({
        messageId: msg.id,
        consumer: msg.consumer,
        idleTime: msg.idle,
        deliveredCount: msg.delivered
      }));
    } catch (error) {
      logger.error('Failed to get pending messages:', error);
      return [];
    }
  }

  /**
   * Claim stalled messages
   */
  async claimStalledMessages(stream, consumerGroup, consumerName, minIdleTime = 60000) {
    try {
      const pending = await this.getPendingMessages(stream, consumerGroup);
      const now = Date.now();

      const stalledMessages = pending
        .filter(msg => msg.idleTime > minIdleTime)
        .map(msg => msg.messageId);

      if (stalledMessages.length > 0) {
        await this.redis.xclaim(
          stream,
          consumerGroup,
          consumerName,
          minIdleTime,
          stalledMessages
        );

        logger.info(`Claimed ${stalledMessages.length} stalled messages`);
        return stalledMessages;
      }

      return [];
    } catch (error) {
      logger.error('Failed to claim stalled messages:', error);
      return [];
    }
  }
}

module.exports = RedisStreamsService;
