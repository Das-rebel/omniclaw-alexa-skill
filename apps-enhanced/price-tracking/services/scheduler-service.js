/**
 * Cloud Scheduler Integration Service
 *
 * Manages scheduled scraping jobs with different intervals:
 * - 2-hour interval: High-priority products, lightning deals
 * - 6-hour interval: Regular tracking
 * - Daily interval: Low-priority products, historical updates
 *
 * Integrates with Google Cloud Scheduler for reliable cron jobs
 */

const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../../../shared/monitoring/logger');
const fetch = require('node-fetch');

const logger = new Logger('SchedulerService');

class SchedulerService {
  constructor(config = {}) {
    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
      serviceUrl: process.env.SERVICE_URL || 'https://your-service-url.com',
      ...config
    };

    this.schedulerBaseUrl = `https://${this.config.region}-${this.config.projectId}.cloudfunctions.net`;
  }

  /**
   * Create all scheduled jobs
   */
  async createScheduledJobs() {
    try {
      logger.info('Creating scheduled jobs...');

      const jobs = [
        {
          name: 'price-tracking-2hour',
          description: 'Scrape high-priority products every 2 hours',
          schedule: '0 */2 * * *',
          scheduleInterval: '2hour',
          timeZone: 'Asia/Kolkata',
          httpTarget: {
            uri: `${this.config.serviceUrl}/schedule/scrape`,
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: 'high', interval: '2hour' })
          }
        },
        {
          name: 'price-tracking-6hour',
          description: 'Scrape regular products every 6 hours',
          schedule: '0 */6 * * *',
          scheduleInterval: '6hour',
          timeZone: 'Asia/Kolkata',
          httpTarget: {
            uri: `${this.config.serviceUrl}/schedule/scrape`,
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: 'normal', interval: '6hour' })
          }
        },
        {
          name: 'price-tracking-daily',
          description: 'Scrape low-priority products daily',
          schedule: '0 2 * * *',
          scheduleInterval: 'daily',
          timeZone: 'Asia/Kolkata',
          httpTarget: {
            uri: `${this.config.serviceUrl}/schedule/scrape`,
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: 'low', interval: 'daily' })
          }
        },
        {
          name: 'price-tracking-cleanup',
          description: 'Clean up old data daily',
          schedule: '0 3 * * *',
          scheduleInterval: 'daily',
          timeZone: 'Asia/Kolkata',
          httpTarget: {
            uri: `${this.config.serviceUrl}/schedule/cleanup`,
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        },
        {
          name: 'price-tracking-deals',
          description: 'Check lightning deals every hour',
          schedule: '0 * * * *',
          scheduleInterval: 'hourly',
          timeZone: 'Asia/Kolkata',
          httpTarget: {
            uri: `${this.config.serviceUrl}/schedule/deals`,
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        }
      ];

      const results = [];
      for (const job of jobs) {
        const result = await this.createJob(job);
        results.push(result);
      }

      logger.info(`Created ${results.length} scheduled jobs`);
      return results;

    } catch (error) {
      logger.error('Failed to create scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Create a single scheduled job
   */
  async createJob(jobConfig) {
    try {
      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs`;

      const jobData = {
        name: `projects/${this.config.projectId}/locations/${this.config.region}/jobs/${jobConfig.name}`,
        description: jobConfig.description,
        schedule: jobConfig.schedule,
        timeZone: jobConfig.timeZone,
        attemptDeadline: '180s', // 3 minutes
        retryConfig: {
          retryCount: 3,
          backoffSettings: {
            maxBackoffDuration: '3600s',
            minBackoffDuration: '10s',
            maxDoublings: 5
          }
        },
        httpTarget: {
          ...jobConfig.httpTarget,
          oidcToken: {
            serviceAccountEmail: process.env.CLOUD_SCHEDULER_SA,
            audience: this.config.serviceUrl
          }
        }
      };

      // Check if job exists
      const existingJob = await this.getJob(jobConfig.name);

      if (existingJob) {
        // Update existing job
        const updateUrl = `${url}/${jobConfig.name}`;
        const response = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAccessToken()}`
          },
          body: JSON.stringify({ ...jobData, updateMask: 'description,schedule,timeZone,httpTarget' })
        });

        if (response.ok) {
          logger.info(`Updated scheduled job: ${jobConfig.name}`);
          return { name: jobConfig.name, action: 'updated' };
        }
      } else {
        // Create new job
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAccessToken()}`
          },
          body: JSON.stringify(jobData)
        });

        if (response.ok) {
          logger.info(`Created scheduled job: ${jobConfig.name}`);
          return { name: jobConfig.name, action: 'created' };
        }
      }

      return { name: jobConfig.name, action: 'failed' };

    } catch (error) {
      logger.error(`Failed to create job ${jobConfig.name}:`, error);
      return { name: jobConfig.name, action: 'error', error: error.message };
    }
  }

  /**
   * Get scheduled job
   */
  async getJob(jobName) {
    try {
      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs/${jobName}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get job ${jobName}:`, error);
      return null;
    }
  }

  /**
   * List all scheduled jobs
   */
  async listJobs() {
    try {
      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.jobs || [];
      }

      return [];
    } catch (error) {
      logger.error('Failed to list jobs:', error);
      return [];
    }
  }

  /**
   * Delete scheduled job
   */
  async deleteJob(jobName) {
    try {
      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs/${jobName}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      });

      if (response.ok) {
        logger.info(`Deleted scheduled job: ${jobName}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to delete job ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Trigger job manually
   */
  async triggerJob(jobName) {
    try {
      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs/${jobName}:run`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`
        }
      });

      if (response.ok) {
        logger.info(`Triggered job: ${jobName}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to trigger job ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Pause scheduled job
   */
  async pauseJob(jobName) {
    try {
      const job = await this.getJob(jobName);
      if (!job || job.state === 'PAUSED') {
        return false;
      }

      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs/${jobName}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`
        },
        body: JSON.stringify({
          state: 'PAUSED',
          updateMask: 'state'
        })
      });

      if (response.ok) {
        logger.info(`Paused job: ${jobName}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to pause job ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Resume paused job
   */
  async resumeJob(jobName) {
    try {
      const job = await this.getJob(jobName);
      if (!job || job.state === 'ENABLED') {
        return false;
      }

      const url = `https://cloudscheduler.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.region}/jobs/${jobName}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`
        },
        body: JSON.stringify({
          state: 'ENABLED',
          updateMask: 'state'
        })
      });

      if (response.ok) {
        logger.info(`Resumed job: ${jobName}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to resume job ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Get Google Cloud access token
   */
  async getAccessToken() {
    try {
      // If running in Cloud Functions, use metadata server
      if (process.env.FUNCTION_NAME) {
        const fetch = require('node-fetch');
        const response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
          headers: { 'Metadata-Flavor': 'Google' }
        });
        const data = await response.json();
        return data.access_token;
      }

      // Otherwise, use Application Default Credentials
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      return accessToken.token;

    } catch (error) {
      logger.error('Failed to get access token:', error);
      throw error;
    }
  }

  /**
   * Create cron schedule string
   */
  createCronSchedule(minute, hour, dayOfMonth, month, dayOfWeek) {
    return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  /**
   * Validate cron schedule
   */
  validateCronSchedule(schedule) {
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    return cronRegex.test(schedule);
  }

  /**
   * Export scheduler configuration
   */
  exportConfiguration() {
    return {
      jobs: [
        {
          name: 'price-tracking-2hour',
          schedule: '0 */2 * * *',
          description: 'High-priority scraping',
          priority: 'high'
        },
        {
          name: 'price-tracking-6hour',
          schedule: '0 */6 * * *',
          description: 'Regular scraping',
          priority: 'normal'
        },
        {
          name: 'price-tracking-daily',
          schedule: '0 2 * * *',
          description: 'Low-priority scraping',
          priority: 'low'
        },
        {
          name: 'price-tracking-deals',
          schedule: '0 * * * *',
          description: 'Lightning deals check',
          priority: 'high'
        },
        {
          name: 'price-tracking-cleanup',
          schedule: '0 3 * * *',
          description: 'Data cleanup',
          priority: 'low'
        }
      ]
    };
  }
}

module.exports = SchedulerService;
