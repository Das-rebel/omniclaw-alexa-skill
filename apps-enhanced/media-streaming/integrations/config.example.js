/**
 * Media Integrations Configuration Example
 *
 * Copy this file to config.js and fill in your credentials
 */

module.exports = {
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || 'your_spotify_client_id',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'your_spotify_client_secret',
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback'
    },

    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY || 'your_youtube_api_key'
    },

    kodi: {
        host: process.env.KODI_HOST || 'localhost',
        port: parseInt(process.env.KODI_PORT) || 8080,
        protocol: process.env.KODI_PROTOCOL || 'http',
        username: process.env.KODI_USERNAME || 'kodi',
        password: process.env.KODI_PASSWORD || '',
        webSocketPort: parseInt(process.env.KODI_WS_PORT) || 9090,

        // Real-Debrid (optional, for premium links)
        rdClientId: process.env.RD_CLIENT_ID || null,
        rdClientSecret: process.env.RD_CLIENT_SECRET || null,
        rdAccessToken: process.env.RD_ACCESS_TOKEN || null,

        // Trakt.tv (optional, for metadata and watchlist sync)
        traktClientId: process.env.TRAKT_CLIENT_ID || null,
        traktAccessToken: process.env.TRAKT_ACCESS_TOKEN || null
    },

    // Media Unifier settings
    unifier: {
        // Platform priority for automatic selection
        platformPriority: ['spotify', 'youtube', 'kodi'],

        // Voice command patterns
        commandPatterns: {
            play: /^(play|start|resume)\s+(.+)/i,
            pause: /^(pause|stop)\s*(.*)$/i,
            skip: /^(skip|next)\s*(.*)$/i,
            previous: /^(previous|prev|back)\s*(.*)$/i,
            search: /^(search|find)\s+(.+)\s+(on|in)\s+(\w+)$/i,
            volume: /^(set\s+)?volume\s+(to\s+)?(\d+)/i,
            shuffle: /^(shuffle|random)\s*(on|off)?$/i,
            repeat: /^(repeat|loop)\s*(one|all|off)?$/i,
            status: /^(what's\s+)?(playing|current|status)\s*(.*)$/i
        },

        // Sync interval for playback state (ms)
        syncInterval: 5000,

        // Enable debug logging
        debug: process.env.DEBUG === 'true'
    },

    // Resilience settings
    resilience: {
        circuitBreaker: {
            timeout: 10000,
            errorThresholdPercentage: 50,
            resetTimeout: 60000
        },
        retry: {
            maxRetries: 3,
            retryDelay: 1000
        },
        timeout: {
            global: 15000
        }
    }
};
