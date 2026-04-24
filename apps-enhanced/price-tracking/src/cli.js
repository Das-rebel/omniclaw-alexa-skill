#!/usr/bin/env node

/**
 * Price Tracking CLI
 *
 * Command-line interface for price tracking operations
 * - scrape: Scrape product prices
 * - schedule: Schedule price checks
 * - monitor: Monitor Redis Streams
 */

const { scrapeProduct, batchScrape, scrapeDeals } = require('../scrapers/scraper-factory');
const { getPublisher } = require('../processors/redis-publisher');
const PriceAnalyzer = require('../processors/price-analyzer');
const NotificationService = require('../notifiers/notification-service');
const { Logger } = require('../../../shared/monitoring/logger');

const logger = new Logger('PriceTrackingCLI');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'scrape':
        await handleScrape(args.slice(1));
        break;

      case 'batch':
        await handleBatchScrape(args.slice(1));
        break;

      case 'deals':
        await handleDeals(args.slice(1));
        break;

      case 'check':
        await handleCheck(args.slice(1));
        break;

      case 'analyze':
        await handleAnalyze();
        break;

      case 'notify':
        await handleNotify();
        break;

      case 'monitor':
        await handleMonitor(args.slice(1));
        break;

      default:
        printUsage();
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle single product scrape
 */
async function handleScrape(args) {
  const url = args[0];

  if (!url) {
    console.error(colorize('Error: Product URL required', 'red'));
    console.log('Usage: npm run scrape <url>');
    process.exit(1);
  }

  console.log(colorize(`\n🔍 Scraping product: ${url}`, 'cyan'));

  const data = await scrapeProduct(url);

  console.log(colorize('\n✅ Scraping complete!', 'green'));
  console.log(colorize('\n📦 Product Data:', 'blue'));
  console.log(JSON.stringify(data, null, 2));

  // Ask if user wants to publish
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nPublish to Redis Stream? (y/n) ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      const publisher = getPublisher();
      await publisher.connect();
      await publisher.publishPriceData(data);
      console.log(colorize('✅ Published to price-data stream', 'green'));
      await publisher.disconnect();
    }
    rl.close();
  });
}

/**
 * Handle batch scrape
 */
async function handleBatchScrape(args) {
  const urlFile = args[0];

  if (!urlFile) {
    console.error(colorize('Error: URL file required', 'red'));
    console.log('Usage: npm run scrape -- batch <urls.txt>');
    process.exit(1);
  }

  const fs = require('fs');
  const urls = fs.readFileSync(urlFile, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(colorize(`\n📦 Batch scraping ${urls.length} products`, 'cyan'));

  const results = await batchScrape(urls, 3);

  console.log(colorize(`\n✅ Complete!`, 'green'));
  console.log(colorize(`Successful: ${results.successful.length}`, 'green'));
  console.log(colorize(`Failed: ${results.failed.length}`, 'red'));

  if (results.failed.length > 0) {
    console.log(colorize('\n❌ Failed URLs:', 'red'));
    results.failed.forEach(({ url, error }) => {
      console.log(`  - ${url}: ${error}`);
    });
  }

  // Publish successful results
  const publisher = getPublisher();
  await publisher.connect();

  for (const data of results.successful) {
    await publisher.publishPriceData(data);
  }

  console.log(colorize(`\n✅ Published ${results.successful.length} products to price-data stream`, 'green'));

  await publisher.disconnect();
}

/**
 * Handle deals scraping
 */
async function handleDeals(args) {
  const platform = args[0] || 'amazon';
  const category = args[1] || 'all';

  console.log(colorize(`\n🔥 Scraping ${platform} deals for category: ${category}`, 'cyan'));

  const deals = await scrapeDeals(platform, category);

  console.log(colorize(`\n✅ Found ${deals.length} deals`, 'green'));

  // Display top deals
  console.log(colorize('\n🏷️  Top Deals:', 'blue'));
  deals.slice(0, 10).forEach((deal, index) => {
    console.log(`\n${index + 1}. ${deal.title}`);
    console.log(`   Price: ${deal.price}`);
    if (deal.originalPrice) {
      console.log(`   Original: ${deal.originalPrice}`);
    }
    if (deal.discount) {
      console.log(`   Discount: ${deal.discount}`);
    }
    console.log(`   URL: ${deal.url}`);
  });
}

/**
 * Handle price check request
 */
async function handleCheck(args) {
  const url = args[0];
  const interval = args[1] || '3600000'; // Default 1 hour

  if (!url) {
    console.error(colorize('Error: Product URL required', 'red'));
    console.log('Usage: npm run scrape -- check <url> [interval_ms]');
    process.exit(1);
  }

  console.log(colorize(`\n⏰ Scheduling price check for: ${url}`, 'cyan'));
  console.log(colorize(`Interval: ${interval}ms`, 'cyan'));

  const publisher = getPublisher();
  await publisher.connect();

  await publisher.publishPriceCheck({
    url,
    priority: 5,
    checkInterval: parseInt(interval),
    thresholds: {
      allTimeLow: true,
      percentageDrop: 10
    }
  });

  console.log(colorize('✅ Price check request published', 'green'));
  await publisher.disconnect();
}

/**
 * Handle analyzer service
 */
async function handleAnalyze() {
  console.log(colorize('\n📊 Starting Price Analyzer Service', 'cyan'));

  const analyzer = new PriceAnalyzer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log(colorize('\n\n⏹️  Stopping analyzer...', 'yellow'));
    await analyzer.stop();
    process.exit(0);
  });

  await analyzer.start();
}

/**
 * Handle notification service
 */
async function handleNotify() {
  console.log(colorize('\n🔔 Starting Notification Service', 'cyan'));

  const service = new NotificationService();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log(colorize('\n\n⏹️  Stopping notification service...', 'yellow'));
    await service.stop();
    process.exit(0);
  });

  await service.start();
}

/**
 * Handle Redis Streams monitoring
 */
async function handleMonitor(args) {
  const stream = args[0] || 'price-alerts';

  console.log(colorize(`\n👀 Monitoring Redis Stream: ${stream}`, 'cyan'));
  console.log(colorize('Press Ctrl+C to stop\n', 'yellow'));

  const { createClient } = require('redis');
  const client = createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  });

  await client.connect();

  while (true) {
    try {
      const info = await client.xInfoStream(stream);

      console.log(colorize(`\n📊 Stream Info: ${stream}`, 'blue'));
      console.log(`  Length: ${info.length}`);
      console.log(`  Groups: ${info.groups}`);
      console.log(`  First Entry: ${info['first-entry']}`);
      console.log(`  Last Entry: ${info['last-entry']}`);

      // Read last 5 messages
      const messages = await client.xRevRange(stream, '+', '-', 'COUNT', 5);

      if (messages.length > 0) {
        console.log(colorize('\n📨 Recent Messages:', 'cyan'));
        messages.reverse().forEach(([id, message]) => {
          console.log(`\n  ID: ${id}`);
          console.log('  Data:', JSON.stringify(message, null, 2).split('\n').map(line => '    ' + line).join('\n'));
        });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      logger.error(`Error monitoring stream: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(colorize('\n📦 OmniClaw Price Tracking CLI', 'cyan'));
  console.log('\nUsage: npm run scrape <command> [options]\n');

  console.log('Commands:');
  console.log(colorize('  scrape <url>', 'green') + '           - Scrape single product');
  console.log(colorize('  batch <urls.txt>', 'green') + '        - Batch scrape products from file');
  console.log(colorize('  deals [platform] [cat]', 'green') + '  - Scrape deals (amazon, flipkart, myntra)');
  console.log(colorize('  check <url> [interval]', 'green') + '  - Schedule price check');
  console.log(colorize('  analyze', 'green') + '                - Start price analyzer service');
  console.log(colorize('  notify', 'green') + '                  - Start notification service');
  console.log(colorize('  monitor [stream]', 'green') + '         - Monitor Redis streams');

  console.log('\nExamples:');
  console.log('  npm run scrape scrape https://amazon.com/dp/B08N5WRWNW');
  console.log('  npm run scrape deals amazon electronics');
  console.log('  npm run scrape check https://amazon.com/dp/B08N5WRWNW 7200000');
  console.log('  npm run scrape analyze');
  console.log('');
}

// Run CLI
if (require.main === module) {
  main();
}

module.exports = { main };
