/**
 * Resilient Media Clients
 * Wraps all media streaming service clients with production-grade resilience patterns
 */

const {
  withTimeout,
  retryWithBackoff,
  CircuitBreaker,
  createResilientFunction
} = require('../../shared/resilience');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESILIENCE_CONFIG = {
  // Media API timeouts
  timeout: {
    fast: 5000,           // 5 seconds for quick lookups
    standard: 10000,      // 10 seconds for standard operations
    slow: 20000,          // 20 seconds for large operations
    verySlow: 60000       // 60 seconds for batch operations
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  },

  // Circuit breaker configuration
  circuitBreaker: {
    threshold: 8,        // Open after 8 failures (rate limits common)
    timeout: 120000,     // Try again after 2 minutes
    halfOpenMaxCalls: 3
  }
};

// ============================================================================
// WRAPPER FUNCTIONS
// ============================================================================

/**
 * Wrap a Spotify API call with resilience
 */
function wrapSpotifyOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: 'SpotifyAPI',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

/**
 * Wrap a YouTube API call with resilience
 */
function wrapYouTubeOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: 'YouTubeAPI',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.standard,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

/**
 * Wrap a Kodi/Fen API call with resilience
 */
function wrapKodiOperation(operation, config = {}) {
  return createResilientFunction(operation, {
    name: 'KodiAPI',
    timeout: config.timeout || RESILIENCE_CONFIG.timeout.slow,
    maxRetries: config.maxRetries || RESILIENCE_CONFIG.retry.maxRetries,
    circuitBreaker: {
      threshold: config.threshold || RESILIENCE_CONFIG.circuitBreaker.threshold,
      timeout: RESILIENCE_CONFIG.circuitBreaker.timeout
    }
  });
}

// ============================================================================
// RESILIENT CLIENT CLASSES
// ============================================================================

class ResilientSpotifyClient {
  constructor(spotifyClient) {
    this.spotifyClient = spotifyClient;
    this._name = 'Spotify';
  }

  async getPlayerState() {
    return wrapSpotifyOperation(
      () => this.spotifyClient.getPlayerState(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async playTrack(trackUri) {
    return wrapSpotifyOperation(
      () => this.spotifyClient.playTrack(trackUri),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async pause() {
    return wrapSpotifyOperation(
      () => this.spotifyClient.pause(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async skipToNext() {
    return wrapSpotifyOperation(
      () => this.spotifyClient.skipToNext(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async search(query, options = {}) {
    return wrapSpotifyOperation(
      () => this.spotifyClient.search(query, options),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async getDevices() {
    return wrapSpotifyOperation(
      () => this.spotifyClient.getDevices(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async play(options = {}) {
    return wrapSpotifyOperation(
      () => this.spotifyClient.play(options),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async next() {
    return wrapSpotifyOperation(
      () => this.spotifyClient.next(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async previous() {
    return wrapSpotifyOperation(
      () => this.spotifyClient.previous(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async setVolume(volume) {
    return wrapSpotifyOperation(
      () => this.spotifyClient.setVolume(volume),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async getStatus() {
    return this.spotifyClient.getStatus();
  }

  async getPlaylist(playlistId, options = {}) {
    return wrapSpotifyOperation(
      () => this.spotifyClient.getPlaylist(playlistId, options),
      { timeout: RESILIENCE_CONFIG.timeout.slow }
    )();
  }

}

class ResilientYouTubeClient {
  constructor(youtubeClient) {
    this.youtubeClient = youtubeClient;
    this._name = 'YouTube';
  }

  async search(query, options = {}) {
    return wrapYouTubeOperation(
      () => this.youtubeClient.search(query, options),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async getVideoInfo(videoId, options = {}) {
    return wrapYouTubeOperation(
      () => this.youtubeClient.getVideoInfo(videoId, options),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async getPlaylist(playlistId, options = {}) {
    return wrapYouTubeOperation(
      () => this.youtubeClient.getPlaylist(playlistId, options),
      { timeout: RESILIENCE_CONFIG.timeout.slow }
    )();
  }

  async searchVideos(query, maxResults = 10, options = {}) {
    return wrapYouTubeOperation(
      () => this.youtubeClient.searchVideos(query, maxResults, options),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async getStatus() {
    return this.youtubeClient.getStatus();
  }

}

class ResilientKodiClient {
  constructor(kodiClient) {
    this.kodiClient = kodiClient;
    this._name = 'Kodi';
  }

  async play(mediaId) {
    return wrapKodiOperation(
      () => this.kodiClient.play(mediaId),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async pause() {
    return wrapKodiOperation(
      () => this.kodiClient.pause(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async getPlayers() {
    return wrapKodiOperation(
      () => this.kodiClient.getPlayers(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async sendNotification(notification) {
    return wrapKodiOperation(
      () => this.kodiClient.sendNotification(notification),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async stop() {
    return wrapKodiOperation(
      () => this.kodiClient.stop(),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async setVolume(volume) {
    return wrapKodiOperation(
      () => this.kodiClient.setVolume(volume),
      { timeout: RESILIENCE_CONFIG.timeout.fast }
    )();
  }

  async searchLibrary(query, type = 'video') {
    return wrapKodiOperation(
      () => this.kodiClient.searchLibrary(query, type),
      { timeout: RESILIENCE_CONFIG.timeout.standard }
    )();
  }

  async getStatus() {
    return this.kodiClient.getStatus();
  }

}

// ============================================================================
// HEALTH CHECKING
// ============================================================================

const circuitBreakers = {
  SpotifyAPI: null,
  YouTubeAPI: null,
  KodiAPI: null
};

function getHealthStatus() {
  return {
    media: {
      spotify: circuitBreakers.SpotifyAPI?.getState() || 'not_configured',
      youtube: circuitBreakers.YouTubeAPI?.getState() || 'not_configured',
      kodi: circuitBreakers.KodiAPI?.getState() || 'not_configured'
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Wrappers
  wrapSpotifyOperation,
  wrapYouTubeOperation,
  wrapKodiOperation,

  // Resilient Client Classes
  ResilientSpotifyClient,
  ResilientYouTubeClient,
  ResilientKodiClient,

  // Factory functions
  createResilientSpotifyClient(client) {
    return new ResilientSpotifyClient(client);
  },
  createResilientYouTubeClient(client) {
    return new ResilientYouTubeClient(client);
  },
  createResilientKodiClient(client) {
    return new ResilientKodiClient(client);
  },

  // Configuration
  RESILIENCE_CONFIG,

  // Health Monitoring
  getHealthStatus,
  circuitBreakers
};
