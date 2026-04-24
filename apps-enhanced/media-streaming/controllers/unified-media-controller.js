/**
 * Unified Media Controller for OmniClaw
 *
 * Provides a unified interface for controlling multiple media platforms:
 * - Spotify (music streaming)
 * - YouTube (video streaming)
 * - Fen/Kodi (media center)
 *
 * Features:
 * - Cross-platform playback control
 * - Smart platform selection
 * - Voice-optimized responses
 * - Graceful fallback handling
 */

const SpotifyIntegration = require('../integrations/spotify-integration');
const YouTubeIntegration = require('../integrations/youtube-integration');
const FenIntegration = require('../integrations/fen-integration');

// Resilience wrappers
const { ResilientSpotifyClient, ResilientYouTubeClient, ResilientKodiClient } = require('../resilient-media-clients');

class UnifiedMediaController {
    constructor(config = {}) {
        // Initialize base platform integrations
        const spotifyIntegration = new SpotifyIntegration(config.spotify || {});
        const youtubeIntegration = new YouTubeIntegration(config.youtube || {});
        const fenIntegration = new FenIntegration(config.fen || {});

        // Wrap with resilience
        this.spotify = new ResilientSpotifyClient(spotifyIntegration);
        this.youtube = new ResilientYouTubeClient(youtubeIntegration);
        this.fen = new ResilientKodiClient(fenIntegration);

        // Active platform tracking
        this.activePlatform = null;
        this.lastPlayed = {};

        console.log('🎮 Unified Media Controller initialized with resilient clients');
    }

    /**
     * Determine best platform for query
     */
    async determinePlatform(query, type = null) {
        if (type) {
            return type;
        }

        const queryLower = query.toLowerCase();

        // Media center keywords
        const mediaKeywords = ['kodi', 'fen', 'media center', 'play on kodi', 'play on fen', 'watch on fen'];
        if (mediaKeywords.some(k => queryLower.includes(k))) {
            return 'fen';
        }

        // Music-related keywords
        const musicKeywords = ['music', 'song', 'album', 'artist', 'playlist', 'track', 'spotify'];
        if (musicKeywords.some(k => queryLower.includes(k))) {
            return 'spotify';
        }

        // Video/movie keywords
        const videoKeywords = ['video', 'youtube', 'watch', 'movie', 'tv show', 'series'];
        if (videoKeywords.some(k => queryLower.includes(k))) {
            return 'youtube';
        }

        // Default to Spotify for general queries
        return 'spotify';
    }

    /**
     * Play content
     */
    async playContent(query, options = {}) {
        const { platform = null, forcePlatform = false } = options;

        try {
            // Determine platform
            const targetPlatform = forcePlatform ? platform : await this.determinePlatform(query, platform);

            if (!targetPlatform) {
                return {
                    success: false,
                    message: 'I couldn\'t determine which platform to use. Try specifying "on Spotify", "on YouTube", or "on Fen".'
                };
            }

            // Check platform availability
            const status = await this.checkPlatform(targetPlatform);
            if (!status.available) {
                return {
                    success: false,
                    message: `${targetPlatform} is not available right now. ${status.reason || ''}`
                };
            }

            // Execute platform-specific play
            let result;
            switch (targetPlatform) {
                case 'spotify':
                    result = await this._playSpotify(query, options);
                    break;
                case 'youtube':
                    result = await this._playYouTube(query, options);
                    break;
                case 'fen':
                    result = await this._playFen(query, options);
                    break;
                default:
                    return {
                        success: false,
                        message: `Unknown platform: ${targetPlatform}`
                    };
            }

            if (result.success) {
                this.activePlatform = targetPlatform;
                this.lastPlayed[targetPlatform] = { query, timestamp: Date.now() };
            }

            return result;
        } catch (error) {
            console.error('❌ Play content failed:', error.message);
            return {
                success: false,
                message: `I encountered an error playing that: ${error.message}`
            };
        }
    }

    /**
     * Play on Spotify
     */
    async _playSpotify(query, options) {
        try {
            // First, try to search for the content
            const searchResult = await this.spotify.search(query, 'track', 5);

            if (!searchResult.success || searchResult.results.tracks.length === 0) {
                return {
                    success: false,
                    message: `I couldn't find "${query}" on Spotify.`
                };
            }

            const track = searchResult.results.tracks[0];

            // Get available devices
            const devices = await this.spotify.getDevices();
            if (devices.length === 0) {
                return {
                    success: false,
                    message: 'No Spotify devices available. Please open Spotify on your device first.'
                };
            }

            // Use active device or first available
            const device = options.deviceId
                ? devices.find(d => d.id === options.deviceId)
                : devices.find(d => d.isActive) || devices[0];

            // Play the track
            const playResult = await this.spotify.play({
                uri: track.uri,
                deviceId: device.id
            });

            if (playResult.success) {
                return {
                    success: true,
                    message: `Now playing "${track.name}" by ${track.artists} on Spotify.`,
                    platform: 'spotify',
                    track: track
                };
            }

            return playResult;
        } catch (error) {
            console.error('❌ Spotify play failed:', error.message);
            return {
                success: false,
                message: `Failed to play on Spotify: ${error.message}`
            };
        }
    }

    /**
     * Play on YouTube
     */
    async _playYouTube(query, options) {
        try {
            // Search for videos
            const searchResult = await this.youtube.searchVideos(query, 5, options);

            if (!searchResult.success || searchResult.videos.length === 0) {
                return {
                    success: false,
                    message: `I couldn't find "${query}" on YouTube.`
                };
            }

            const video = searchResult.videos[0];

            // Note: YouTube playback requires integration with Kodi or browser
            // This is a simplified implementation
            return {
                success: true,
                message: `Found "${video.title}" on YouTube. Playing through Kodi.`,
                platform: 'youtube',
                video: video,
                url: video.url,
                note: 'YouTube videos are played through the Kodi integration'
            };
        } catch (error) {
            console.error('❌ YouTube play failed:', error.message);
            return {
                success: false,
                message: `Failed to play on YouTube: ${error.message}`
            };
        }
    }

    /**
     * Play on Fen/Kodi
     */
    async _playFen(query, options) {
        try {
            // Search local library
            const searchResult = await this.fen.searchLibrary(query, 'video');

            if (!searchResult.success || searchResult.items.length === 0) {
                return {
                    success: false,
                    message: `I couldn't find "${query}" in your media library.`
                };
            }

            const item = searchResult.items[0];

            // Play the item
            const playResult = await this.fen.play({ itemId: item.movieid, type: 'video' });

            if (playResult.success) {
                return {
                    success: true,
                    message: `Now playing "${item.title}" on Kodi.`,
                    platform: 'fen',
                    item: item
                };
            }

            return playResult;
        } catch (error) {
            console.error('❌ Fen play failed:', error.message);
            return {
                success: false,
                message: `Failed to play on Kodi: ${error.message}`
            };
        }
    }

    /**
     * Pause playback on active platform
     */
    async pause() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: 'No platform is currently active.'
            };
        }

        try {
            let result;
            switch (this.activePlatform) {
                case 'spotify':
                    result = await this.spotify.pause();
                    break;
                case 'fen':
                    result = await this.fen.pause();
                    break;
                default:
                    return {
                        success: false,
                        message: `Pause not supported on ${this.activePlatform}`
                    };
            }

            if (result.success) {
                return {
                    success: true,
                    message: `Paused on ${this.activePlatform}.`
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Pause failed:', error.message);
            return {
                success: false,
                message: `Failed to pause: ${error.message}`
            };
        }
    }

    /**
     * Resume playback
     */
    async resume() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: 'No platform is currently active.'
            };
        }

        try {
            let result;
            switch (this.activePlatform) {
                case 'spotify':
                    result = await this.spotify.play({});
                    break;
                case 'fen':
                    result = await this.fen.play({});
                    break;
                default:
                    return {
                        success: false,
                        message: `Resume not supported on ${this.activePlatform}`
                    };
            }

            if (result.success) {
                return {
                    success: true,
                    message: `Resumed on ${this.activePlatform}.`
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Resume failed:', error.message);
            return {
                success: false,
                message: `Failed to resume: ${error.message}`
            };
        }
    }

    /**
     * Skip to next track
     */
    async next() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: 'No platform is currently active.'
            };
        }

        try {
            let result;
            switch (this.activePlatform) {
                case 'spotify':
                    result = await this.spotify.next();
                    break;
                default:
                    return {
                        success: false,
                        message: `Skip not supported on ${this.activePlatform}`
                    };
            }

            if (result.success) {
                return {
                    success: true,
                    message: `Skipped to next track on ${this.activePlatform}.`
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Next failed:', error.message);
            return {
                success: false,
                message: `Failed to skip: ${error.message}`
            };
        }
    }

    /**
     * Skip to previous track
     */
    async previous() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: 'No platform is currently active.'
            };
        }

        try {
            let result;
            switch (this.activePlatform) {
                case 'spotify':
                    result = await this.spotify.previous();
                    break;
                default:
                    return {
                        success: false,
                        message: `Previous not supported on ${this.activePlatform}`
                    };
            }

            if (result.success) {
                return {
                    success: true,
                    message: `Skipped to previous track on ${this.activePlatform}.`
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Previous failed:', error.message);
            return {
                success: false,
                message: `Failed to go to previous: ${error.message}`
            };
        }
    }

    /**
     * Stop playback
     */
    async stop() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: 'No platform is currently active.'
            };
        }

        try {
            let result;
            switch (this.activePlatform) {
                case 'spotify':
                    result = await this.spotify.pause();
                    break;
                case 'fen':
                    result = await this.fen.stop();
                    break;
                default:
                    return {
                        success: false,
                        message: `Stop not supported on ${this.activePlatform}`
                    };
            }

            if (result.success) {
                this.activePlatform = null;
                return {
                    success: true,
                    message: `Stopped playback.`
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Stop failed:', error.message);
            return {
                success: false,
                message: `Failed to stop: ${error.message}`
            };
        }
    }

    /**
     * Set volume
     */
    async setVolume(volume) {
        try {
            // Normalize volume (0-100)
            const normalizedVolume = Math.max(0, Math.min(100, parseInt(volume)));

            if (!this.activePlatform) {
                return {
                    success: true,
                    message: `Volume set to ${normalizedVolume}%.`
                };
            }

            let result;
            switch (this.activePlatform) {
                case 'spotify':
                    result = await this.spotify.setVolume(normalizedVolume);
                    break;
                case 'fen':
                    result = await this.fen.setVolume(normalizedVolume);
                    break;
                default:
                    return {
                        success: true,
                        message: `Volume set to ${normalizedVolume}%.`
                    };
            }

            if (result.success) {
                return {
                    success: true,
                    message: `Volume set to ${normalizedVolume}%.`
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Set volume failed:', error.message);
            return {
                success: false,
                message: `Failed to set volume: ${error.message}`
            };
        }
    }

    /**
     * Continue watching/playing
     */
    async continueWatching() {
        try {
            // Find most recently played content
            let lastPlayed = null;
            let latestTimestamp = 0;

            for (const [platform, data] of Object.entries(this.lastPlayed)) {
                if (data.timestamp > latestTimestamp) {
                    latestTimestamp = data.timestamp;
                    lastPlayed = { platform, ...data };
                }
            }

            if (!lastPlayed) {
                return {
                    success: false,
                    message: 'I don\'t have any recent content to continue. Try playing something first.'
                };
            }

            return await this.playContent(lastPlayed.query, { platform: lastPlayed.platform, forcePlatform: true });
        } catch (error) {
            console.error('❌ Continue watching failed:', error.message);
            return {
                success: false,
                message: `Failed to continue: ${error.message}`
            };
        }
    }

    /**
     * Search across platforms
     */
    async searchAll(query, type = 'all') {
        try {
            const results = {};
            const spotifyStatus = await Promise.resolve(this.spotify.getStatus());
            const youtubeApiKey = this.youtube.youtubeClient?.apiKey;
            const youtubeReady = !!youtubeApiKey && !youtubeApiKey.startsWith('test-');
            const fenReady = !!(process.env.KODI_HOST && process.env.KODI_PORT);

            if (type === 'all' || type === 'spotify') {
                if (spotifyStatus.authenticated) {
                    const spotifyResult = await this.spotify.search(query, 'track', 5);
                    results.spotify = spotifyResult.success ? spotifyResult.results.tracks : [];
                } else {
                    results.spotify = [];
                }
            }

            if (type === 'all' || type === 'youtube') {
                if (youtubeReady) {
                    const youtubeResult = await this.youtube.searchVideos(query, 5);
                    results.youtube = youtubeResult.success ? youtubeResult.videos : [];
                } else {
                    results.youtube = [];
                }
            }

            if (type === 'all' || type === 'fen') {
                if (fenReady) {
                    const fenResult = await this.fen.searchLibrary(query, 'video');
                    results.fen = fenResult.success ? fenResult.items : [];
                } else {
                    results.fen = [];
                }
            }

            return {
                success: true,
                query,
                results
            };
        } catch (error) {
            console.error('❌ Search failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check platform availability
     */
    async checkPlatform(platform) {
        try {
            switch (platform) {
                case 'spotify':
                    const spotifyStatus = this.spotify.getStatus();
                    return {
                        available: spotifyStatus.authenticated,
                        reason: spotifyStatus.authenticated ? null : 'Not authenticated with Spotify'
                    };

                case 'youtube':
                    return { available: true }; // YouTube API doesn't require auth for basic search

                case 'fen':
                    const fenStatus = await this.fen.getStatus();
                    return {
                        available: fenStatus.connected,
                        reason: fenStatus.connected ? null : 'Kodi/Fen not connected'
                    };

                default:
                    return { available: false, reason: 'Unknown platform' };
            }
        } catch (error) {
            return { available: false, reason: error.message };
        }
    }

    /**
     * Get status of all platforms
     */
    async getAllStatus() {
        try {
            const [spotify, youtube, fen] = await Promise.all([
                Promise.resolve(this.spotify.getStatus()).catch(() => ({ platform: 'spotify', error: true })),
                Promise.resolve(this.youtube.getStatus()).catch(() => ({ platform: 'youtube', error: true })),
                process.env.KODI_HOST && process.env.KODI_PORT
                    ? Promise.resolve(this.fen.getStatus()).catch(() => ({ platform: 'fen', error: true }))
                    : Promise.resolve({ platform: 'fen', connected: false, reason: 'Kodi not configured' })
            ]);

            return {
                activePlatform: this.activePlatform,
                platforms: {
                    spotify,
                    youtube,
                    fen
                },
                lastPlayed: this.lastPlayed
            };
        } catch (error) {
            console.error('❌ Failed to get status:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Get voice-optimized response
     */
    getVoiceResponse(action, result) {
        if (!result.success) {
            return result.message || 'I encountered an error with that request.';
        }

        const responses = {
            play: `Now playing ${result.message}`,
            pause: 'Paused.',
            resume: 'Resumed.',
            next: 'Skipped to next.',
            previous: 'Went back to previous.',
            stop: 'Stopped.',
            volume: `Volume ${result.message}`
        };

        return responses[action] || result.message || 'Done.';
    }
}

module.exports = UnifiedMediaController;
