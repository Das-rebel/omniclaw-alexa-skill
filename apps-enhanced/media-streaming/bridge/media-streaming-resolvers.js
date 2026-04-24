/**
 * GraphQL Resolvers for Media Streaming
 *
 * Implements the resolvers for the GraphQL schema
 * using the Unified Media Controller
 */

const UnifiedMediaController = require('../controllers/unified-media-controller');

// Initialize controller
const controller = new UnifiedMediaController();

// Helper function to normalize platform
const normalizePlatform = (platform) => {
    if (!platform) return null;
    return platform.toLowerCase();
};

// Helper function to convert media item
const convertMediaItem = (item, platform) => {
    if (!item) return null;

    switch (platform) {
        case 'SPOTIFY':
            return {
                __typename: 'SpotifyTrack',
                ...item,
                type: 'MUSIC'
            };
        case 'YOUTUBE':
            return {
                __typename: 'YouTubeVideo',
                ...item,
                type: 'VIDEO'
            };
        case 'FEN':
            return {
                __typename: 'FenMediaItem',
                ...item,
                type: 'MOVIE'
            };
        default:
            return item;
    }
};

// Resolvers
const resolvers = {
    // Query resolvers
    Query: {
        /**
         * Get current playback state
         */
        async getPlaybackState(_, { platform }) {
            try {
                const normalizedPlatform = normalizePlatform(platform);

                if (normalizedPlatform === 'spotify') {
                    const state = await controller.spotify.getPlaybackState();
                    return {
                        state: state.isPlaying ? 'PLAYING' : 'PAUSED',
                        platform: 'SPOTIFY',
                        progressMs: state.progressMs,
                        currentItem: state.item ? convertMediaItem(state.item, 'SPOTIFY') : null
                    };
                } else if (normalizedPlatform === 'fen') {
                    const state = await controller.fen.getPlayerState();
                    return {
                        state: state.playing ? 'PLAYING' : state.paused ? 'PAUSED' : 'STOPPED',
                        platform: 'FEN',
                        percentage: state.percentage,
                        volume: state.volume,
                        currentItem: state.currentItem ? convertMediaItem(state.currentItem, 'FEN') : null
                    };
                }

                return {
                    state: 'STOPPED',
                    platform: platform || null
                };
            } catch (error) {
                console.error('❌ getPlaybackState error:', error.message);
                throw new Error(`Failed to get playback state: ${error.message}`);
            }
        },

        /**
         * Search for content
         */
        async searchMedia(_, { query, platforms, types, limit = 10 }) {
            try {
                const targetPlatforms = platforms?.map(p => normalizePlatform(p)) || ['spotify', 'youtube', 'fen'];
                const results = [];

                for (const platform of targetPlatforms) {
                    let searchResult;

                    if (platform === 'spotify') {
                        searchResult = await controller.spotify.search(query, 'track', limit);
                        if (searchResult.success) {
                            results.push({
                                platform: 'SPOTIFY',
                                query,
                                totalResults: searchResult.results.tracks.length,
                                items: searchResult.results.tracks.map(item => convertMediaItem(item, 'SPOTIFY'))
                            });
                        }
                    } else if (platform === 'youtube') {
                        searchResult = await controller.youtube.searchVideos(query, limit);
                        if (searchResult.success) {
                            results.push({
                                platform: 'YOUTUBE',
                                query,
                                totalResults: searchResult.videos.length,
                                items: searchResult.videos.map(item => convertMediaItem(item, 'YOUTUBE'))
                            });
                        }
                    } else if (platform === 'fen') {
                        searchResult = await controller.fen.searchLibrary(query, 'video');
                        if (searchResult.success) {
                            results.push({
                                platform: 'FEN',
                                query,
                                totalResults: searchResult.items.length,
                                items: searchResult.items.map(item => convertMediaItem(item, 'FEN'))
                            });
                        }
                    }
                }

                return {
                    success: true,
                    results,
                    message: `Found results across ${results.length} platforms`
                };
            } catch (error) {
                console.error('❌ searchMedia error:', error.message);
                return {
                    success: false,
                    results: [],
                    message: error.message
                };
            }
        },

        /**
         * Get available devices
         */
        async getDevices(_, { platform }) {
            try {
                const normalizedPlatform = normalizePlatform(platform);

                if (normalizedPlatform === 'spotify') {
                    const devices = await controller.spotify.getDevices();
                    return devices.map(device => ({
                        id: device.id,
                        name: device.name,
                        type: device.type,
                        isActive: device.isActive,
                        volume: device.volume
                    }));
                }

                return [];
            } catch (error) {
                console.error('❌ getDevices error:', error.message);
                throw new Error(`Failed to get devices: ${error.message}`);
            }
        },

        /**
         * Get user's playlists
         */
        async getPlaylists(_, { platform, limit = 20 }) {
            try {
                const normalizedPlatform = normalizePlatform(platform);

                if (normalizedPlatform === 'spotify') {
                    const result = await controller.spotify.getPlaylists(limit);
                    if (result.success) {
                        return result.playlists.map(playlist => ({
                            id: playlist.id,
                            name: playlist.name,
                            owner: playlist.owner,
                            description: playlist.description || '',
                            totalTracks: playlist.tracksTotal,
                            thumbnail: playlist.imageUrl || '',
                            uri: playlist.uri
                        }));
                    }
                }

                return [];
            } catch (error) {
                console.error('❌ getPlaylists error:', error.message);
                throw new Error(`Failed to get playlists: ${error.message}`);
            }
        },

        /**
         * Get platform status
         */
        async getPlatformStatus(_, { platform }) {
            try {
                const normalizedPlatform = normalizePlatform(platform);
                const status = await controller.checkPlatform(normalizedPlatform);

                return {
                    platform: platform.toUpperCase(),
                    available: status.available,
                    authenticated: status.available,
                    active: controller.activePlatform === normalizedPlatform,
                    error: status.reason || null
                };
            } catch (error) {
                console.error('❌ getPlatformStatus error:', error.message);
                return {
                    platform: platform.toUpperCase(),
                    available: false,
                    authenticated: false,
                    active: false,
                    error: error.message
                };
            }
        },

        /**
         * Get all platform statuses
         */
        async getAllPlatformStatuses() {
            try {
                const platforms = ['SPOTIFY', 'YOUTUBE', 'FEN'];
                const statuses = [];

                for (const platform of platforms) {
                    const status = await controller.checkPlatform(platform.toLowerCase());
                    statuses.push({
                        platform,
                        available: status.available,
                        authenticated: status.available,
                        active: controller.activePlatform === platform.toLowerCase(),
                        error: status.reason || null
                    });
                }

                return statuses;
            } catch (error) {
                console.error('❌ getAllPlatformStatuses error:', error.message);
                throw new Error(`Failed to get platform statuses: ${error.message}`);
            }
        },

        /**
         * Get recently played
         */
        async getRecentlyPlayed(_, { platform, limit = 20 }) {
            try {
                const normalizedPlatform = normalizePlatform(platform);

                if (normalizedPlatform === 'spotify') {
                    const result = await controller.spotify.getRecentlyPlayed(limit);
                    if (result.success) {
                        return result.tracks.map(item => convertMediaItem(item, 'SPOTIFY'));
                    }
                }

                return [];
            } catch (error) {
                console.error('❌ getRecentlyPlayed error:', error.message);
                throw new Error(`Failed to get recently played: ${error.message}`);
            }
        },

        /**
         * Get recommendations
         */
        async getRecommendations(_, { platform, limit = 10, seedArtists, seedGenres }) {
            try {
                const normalizedPlatform = normalizePlatform(platform);

                if (normalizedPlatform === 'spotify') {
                    const result = await controller.spotify.getRecommendations({
                        seedArtists: seedArtists || [],
                        seedGenres: seedGenres || [],
                        limit
                    });

                    if (result.success) {
                        return result.tracks.map(item => convertMediaItem(item, 'SPOTIFY'));
                    }
                }

                return [];
            } catch (error) {
                console.error('❌ getRecommendations error:', error.message);
                throw new Error(`Failed to get recommendations: ${error.message}`);
            }
        },

        /**
         * Continue watching
         */
        async continueWatching() {
            try {
                const result = await controller.continueWatching();

                return {
                    platform: (result.platform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Continuing last played content'
                };
            } catch (error) {
                console.error('❌ continueWatching error:', error.message);
                return {
                    platform: 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        }
    },

    // Mutation resolvers
    Mutation: {
        /**
         * Play content
         */
        async playContent(_, { query, platform, deviceId, contextUri }) {
            try {
                const result = await controller.playContent(query, {
                    platform: normalizePlatform(platform),
                    deviceId,
                    contextUri
                });

                return {
                    platform: (result.platform || controller.activePlatform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Playing content'
                };
            } catch (error) {
                console.error('❌ playContent error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Pause playback
         */
        async pause(_, { platform }) {
            try {
                const result = await controller.pause();

                return {
                    platform: (platform || controller.activePlatform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Paused'
                };
            } catch (error) {
                console.error('❌ pause error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Resume playback
         */
        async resume(_, { platform }) {
            try {
                const result = await controller.resume();

                return {
                    platform: (platform || controller.activePlatform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Resumed'
                };
            } catch (error) {
                console.error('❌ resume error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Stop playback
         */
        async stop(_, { platform }) {
            try {
                const result = await controller.stop();

                return {
                    platform: (platform || controller.activePlatform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Stopped'
                };
            } catch (error) {
                console.error('❌ stop error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Skip to next
         */
        async next(_, { platform }) {
            try {
                const result = await controller.next();

                return {
                    platform: (platform || controller.activePlatform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Skipped to next'
                };
            } catch (error) {
                console.error('❌ next error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Skip to previous
         */
        async previous(_, { platform }) {
            try {
                const result = await controller.previous();

                return {
                    platform: (platform || controller.activePlatform || 'UNKNOWN').toUpperCase(),
                    success: result.success,
                    message: result.message || 'Skipped to previous'
                };
            } catch (error) {
                console.error('❌ previous error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Set volume
         */
        async setVolume(_, { volume, platform }) {
            try {
                const result = await controller.setVolume(volume);

                return {
                    platform: (platform || controller.activePlatform || 'FEN').toUpperCase(),
                    volume,
                    success: result.success,
                    message: result.message || `Volume set to ${volume}`
                };
            } catch (error) {
                console.error('❌ setVolume error:', error.message);
                return {
                    platform: platform?.toUpperCase() || 'UNKNOWN',
                    volume,
                    success: false,
                    message: error.message
                };
            }
        },

        /**
         * Authorize Spotify
         */
        async authorizeSpotify(_, { code }) {
            try {
                const result = await controller.spotify.authorize(code);

                return {
                    platform: 'SPOTIFY',
                    success: result.accessToken ? true : false,
                    message: 'Spotify authorization successful'
                };
            } catch (error) {
                console.error('❌ authorizeSpotify error:', error.message);
                return {
                    platform: 'SPOTIFY',
                    success: false,
                    message: error.message
                };
            }
        }
    },

    // Subscription resolvers (for real-time updates)
    Subscription: {
        playbackStateChanged: {
            subscribe: () => {
                // Implementation would use PubSub for real-time updates
                // This is a placeholder
                return {
                    [Symbol.asyncIterator]: async function* () {
                        while (true) {
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            yield {
                                playbackStateChanged: {
                                    state: 'PLAYING',
                                    platform: 'SPOTIFY'
                                }
                            };
                        }
                    }
                };
            }
        },
        trackChanged: {
            subscribe: () => {
                // Implementation would use PubSub for real-time updates
                // This is a placeholder
                return {
                    [Symbol.asyncIterator]: async function* () {
                        while (true) {
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            yield {
                                trackChanged: {
                                    id: '123',
                                    title: 'Example Track',
                                    type: 'MUSIC'
                                }
                            };
                        }
                    }
                };
            }
        }
    }
};

module.exports = { resolvers, controller };
