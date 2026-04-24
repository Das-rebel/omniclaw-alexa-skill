/**
 * Platform Configuration for Price Tracking
 *
 * Defines scraping strategies, rate limits, and anti-detection measures
 * for each e-commerce platform
 */

module.exports = {
  amazon: {
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    domains: ['.amazon.com', '.amazon.in', '.amazon.co.uk'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

    // Rate limiting (requests per minute)
    rateLimit: {
      default: 10,
      burst: 20,
      window: 60000 // 1 minute
    },

    // Anti-detection settings
    stealth: {
      headless: true,
      blockImages: true,
      blockScripts: [
        'https://pagead2.googlesyndication.com',
        'https://googleads.g.doubleclick.net'
      ],
      customHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    },

    // Selectors for price extraction
    selectors: {
      price: ['#priceblock_ourprice', '#priceblock_dealprice', '.a-price .a-offscreen'],
      title: ['#productTitle', '#title h1'],
      availability: ['#availability span', '#availability'],
      lightningDeal: ['.dealBadge', '.dealsBadge', '.lightning-deal-badge'],
      rating: ['.a-icon-alt', '[data-csa-c-type="widget"] .a-icon-alt'],
      prime: ['#primeBadge', '.prime-badge']
    },

    // Platform-specific features
    features: {
      lightningDeals: true,
      primePricing: true,
      coupons: true,
      variations: true
    },

    // Sale events for accelerated checking
    saleEvents: [
      { name: 'Prime Day', month: 6, checkInterval: 1800000 }, // 30 minutes
      { name: 'Black Friday', month: 11, checkInterval: 1800000 },
      { name: 'Cyber Monday', month: 11, checkInterval: 1800000 },
      { name: 'Great Indian Festival', month: 10, checkInterval: 1800000 }
    ]
  },

  flipkart: {
    name: 'Flipkart',
    baseUrl: 'https://www.flipkart.com',
    domains: ['.flipkart.com'],
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',

    // Flipkart mobile-first approach
    rateLimit: {
      default: 8,
      burst: 15,
      window: 60000
    },

    stealth: {
      headless: true,
      mobile: true, // Use mobile viewport
      blockImages: true,
      customHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Device': 'mobile'
      }
    },

    selectors: {
      price: ['._30jeq3', '._25b18c', '.Nx9bqj'],
      title: ['._35KyD6', '.B_NuCI'],
      availability: ['._16FRp0', '.loader-section'],
      flashSale: ['.ZHeGHv', '.col-12-12'],
      rating: ['._2LRCXY', '._3LWZlK'],
      discount: ['._3Ay6Sb', '.VGd6Nr']
    },

    features: {
      flashSales: true,
      exchangeOffers: true,
      emi: true
    },

    saleEvents: [
      { name: 'Big Billion Days', month: 9, checkInterval: 1800000 },
      { name: 'Big Shopping Days', month: 2, checkInterval: 1800000 }
    ]
  },

  myntra: {
    name: 'Myntra',
    baseUrl: 'https://www.myntra.com',
    domains: ['.myntra.com'],
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',

    rateLimit: {
      default: 12,
      burst: 25,
      window: 60000
    },

    stealth: {
      headless: true,
      blockImages: false, // Myntra needs images for fashion
      customHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Site': 'same-origin'
      }
    },

    selectors: {
      price: ['.pdp-price', '. discounted-price', '.final-price'],
      title: ['.pdp-title', '.prod-name'],
      availability: ['.out-of-stock', '.size-unavailable'],
      discount: ['.pdp-discount', '.discount-percent'],
      sizes: ['.size-buttons-div', '.size-unit'],
      images: ['.image-grid-image', '.prod-img']
    },

    features: {
      sizeVariants: true,
      colorVariants: true,
      fashionSpecific: true
    },

    saleEvents: [
      { name: 'End of Season Sale', month: 6, checkInterval: 1800000 },
      { name: 'Fashion Carnival', month: 12, checkInterval: 1800000 }
    ]
  }
};

/**
 * Get platform configuration by URL
 * @param {string} url - Product URL
 * @returns {Object|null} - Platform configuration or null
 */
function getPlatformByUrl(url) {
  const platforms = module.exports;
  for (const [key, config] of Object.entries(platforms)) {
    if (config.domains.some(domain => url.includes(domain))) {
      return { key, ...config };
    }
  }
  return null;
}

/**
 * Get all platform keys
 * @returns {string[]} - Array of platform identifiers
 */
function getPlatformKeys() {
  return Object.keys(module.exports).filter(key => typeof module.exports[key] === 'object');
}

module.exports.getPlatformByUrl = getPlatformByUrl;
module.exports.getPlatformKeys = getPlatformKeys;
