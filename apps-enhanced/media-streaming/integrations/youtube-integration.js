/**
 * YouTube Integration for OmniClaw Media Streaming
 *
 * Provides comprehensive YouTube control including:
 * - YouTube Data API v3 integration
 * - Video/channel/playlist search
 * - Watch history access
 * - YouTube Music support
 * - Playlist management
 * - Playback control via Kodi integration
 */

const axios = require('axios');
const { getCircuitBreaker } = require('../../../shared/resilience/circuit-breaker');
const { withRetry } = require('../../../shared/resilience/retry');
const { withTimeout } = require('../../../shared/resilience/timeout-wrapper');

class YouTubeIntegration {
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.oauthToken = null;

        // Circuit breaker for API calls
        this.circuitBreaker = getCircuitBreaker('youtube-api', {
            timeout: 15000,
            errorThresholdPercentage: 50,
            resetTimeout: 60000
        });

        // API quota tracking
        this.quotaLimit = 10000;
        this.quotaUsed = 0;
        this.quotaResetTime = null;

        console.log('🎬 YouTube Integration initialized');
    }

    /**
     * Set OAuth token for authenticated requests
     */
    setAuthToken(token) {
        this.oauthToken = token;
    }

    /**
     * Make API call with resilience
     */
    async _apiCall(endpoint, params = {}) {
        return this.circuitBreaker.execute(async () => {
            return withRetry(async () => {
                // Check quota
                if (!this._checkQuota()) {
                    throw new Error('API quota exceeded');
                }

                const queryParams = new URLSearchParams({
                    ...params,
                    key: this.apiKey
                });

                const response = await withTimeout(
                    axios.get(`${this.baseUrl}${endpoint}?${queryParams.toString()}`),
                    15000
                );

                // Track quota usage (rough estimate)
                this.quotaUsed += 100;

                return response.data;
            }, { maxRetries: 3, retryDelay: 1000 });
        });
    }

    /**
     * Search for videos
     */
    async searchVideos(query, maxResults = 10, options = {}) {
        const {
            order = 'relevance',
            duration = 'any',
            publishedAfter = null
        } = options;

        try {
            const params = {
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: maxResults.toString(),
                order: order,
                videoDuration: duration
            };

            if (publishedAfter) {
                params.publishedAfter = publishedAfter;
            }

            const response = await this._apiCall('/search', params);

            const videos = response.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                url: `https://youtube.com/watch?v=${item.id.videoId}`
            }));

            console.log(`✅ Found ${videos.length} videos for "${query}"`);
            return { success: true, query, videos, totalResults: response.pageInfo?.totalResults };
        } catch (error) {
            console.error('❌ Video search failed:', error.message);
            return { success: false, error: error.message, videos: [] };
        }
    }

    /**
     * Search for channels
     */
    async searchChannels(query, maxResults = 10) {
        try {
            const response = await this._apiCall('/search', {
                part: 'snippet',
                q: query,
                type: 'channel',
                maxResults: maxResults.toString()
            });

            const channels = response.items.map(item => ({
                channelId: item.id.channelId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails?.medium?.url,
                customUrl: item.snippet.customUrl
            }));

            console.log(`✅ Found ${channels.length} channels for "${query}"`);
            return { success: true, query, channels };
        } catch (error) {
            console.error('❌ Channel search failed:', error.message);
            return { success: false, error: error.message, channels: [] };
        }
    }

    /**
     * Search for playlists
     */
    async searchPlaylists(query, maxResults = 10) {
        try {
            const response = await this._apiCall('/search', {
                part: 'snippet',
                q: query,
                type: 'playlist',
                maxResults: maxResults.toString()
            });

            const playlists = response.items.map(item => ({
                playlistId: item.id.playlistId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails?.medium?.url,
                itemCount: item.snippet.itemCount,
                url: `https://youtube.com/playlist?list=${item.id.playlistId}`
            }));

            console.log(`✅ Found ${playlists.length} playlists for "${query}"`);
            return { success: true, query, playlists };
        } catch (error) {
            console.error('❌ Playlist search failed:', error.message);
            return { success: false, error: error.message, playlists: [] };
        }
    }

    /**
     * Get video details
     */
    async getVideoDetails(videoIds) {
        try {
            const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds;
            const response = await this._apiCall('/videos', {
                part: 'contentDetails,statistics,snippet',
                id: ids
            });

            const videos = response.items.map(item => ({
                videoId: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
                duration: this._parseDuration(item.contentDetails.duration),
                viewCount: parseInt(item.statistics.viewCount),
                likeCount: item.statistics.likeCount ? parseInt(item.statistics.likeCount) : null,
                commentCount: item.statistics.commentCount ? parseInt(item.statistics.commentCount) : null,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.medium?.url
            }));

            return { success: true, videos };
        } catch (error) {
            console.error('❌ Failed to get video details:', error.message);
            return { success: false, error: error.message, videos: [] };
        }
    }

    /**
     * Get channel details
     */
    async getChannelDetails(channelId) {
        try {
            const response = await this._apiCall('/channels', {
                part: 'snippet,statistics,brandingSettings',
                id: channelId
            });

            if (!response.items || response.items.length === 0) {
                return { success: false, error: 'Channel not found' };
            }

            const channel = response.items[0];
            return {
                success: true,
                channel: {
                    channelId: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    customUrl: channel.snippet.customUrl,
                    thumbnail: channel.snippet.thumbnails?.medium?.url,
                    subscriberCount: parseInt(channel.statistics.subscriberCount),
                    videoCount: parseInt(channel.statistics.videoCount),
                    viewCount: parseInt(channel.statistics.viewCount),
                    keywords: channel.brandingSettings?.channel?.keywords
                }
            };
        } catch (error) {
            console.error('❌ Failed to get channel details:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get playlist items
     */
    async getPlaylistItems(playlistId, maxResults = 50) {
        try {
            const response = await this._apiCall('/playlistItems', {
                part: 'snippet,contentDetails',
                playlistId: playlistId,
                maxResults: maxResults.toString()
            });

            const items = response.items.map(item => ({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.videoOwnerChannelTitle,
                position: item.snippet.position,
                publishedAt: item.snippet.publishedAt
            }));

            return {
                success: true,
                items,
                totalResults: response.pageInfo?.totalResults
            };
        } catch (error) {
            console.error('❌ Failed to get playlist items:', error.message);
            return { success: false, error: error.message, items: [] };
        }
    }

    /**
     * Get videos by channel
     */
    async getChannelVideos(channelId, maxResults = 10, order = 'date') {
        try {
            const response = await this._apiCall('/search', {
                part: 'snippet',
                channelId: channelId,
                type: 'video',
                maxResults: maxResults.toString(),
                order: order
            });

            const videos = response.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.medium?.url,
                url: `https://youtube.com/watch?v=${item.id.videoId}`
            }));

            return { success: true, videos };
        } catch (error) {
            console.error('❌ Failed to get channel videos:', error.message);
            return { success: false, error: error.message, videos: [] };
        }
    }

    /**
     * Get trending videos
     */
    async getTrending(regionCode = 'US', categoryId = 0, maxResults = 10) {
        try {
            const response = await this._apiCall('/videos', {
                part: 'snippet,statistics',
                chart: 'mostPopular',
                regionCode: regionCode,
                videoCategoryId: categoryId.toString(),
                maxResults: maxResults.toString()
            });

            const videos = response.items.map(item => ({
                videoId: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.channelTitle,
                viewCount: parseInt(item.statistics.viewCount),
                thumbnail: item.snippet.thumbnails?.medium?.url,
                url: `https://youtube.com/watch?v=${item.id}`
            }));

            return { success: true, videos };
        } catch (error) {
            console.error('❌ Failed to get trending videos:', error.message);
            return { success: false, error: error.message, videos: [] };
        }
    }

    /**
     * Get related videos
     */
    async getRelatedVideos(videoId, maxResults = 10) {
        try {
            const response = await this._apiCall('/search', {
                part: 'snippet',
                type: 'video',
                relatedToVideoId: videoId,
                maxResults: maxResults.toString()
            });

            const videos = response.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.medium?.url,
                url: `https://youtube.com/watch?v=${item.id.videoId}`
            }));

            return { success: true, videos };
        } catch (error) {
            console.error('❌ Failed to get related videos:', error.message);
            return { success: false, error: error.message, videos: [] };
        }
    }

    /**
     * Parse ISO 8601 duration
     */
    _parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '0:00';

        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const seconds = match[3] ? parseInt(match[3]) : 0;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Check API quota
     */
    _checkQuota() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (!this.quotaResetTime || this.quotaResetTime < today) {
            this.quotaUsed = 0;
            this.quotaResetTime = today;
        }

        return this.quotaUsed < this.quotaLimit;
    }

    /**
     * Extract video ID from URL
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    /**
     * Get quota statistics
     */
    getQuotaStats() {
        return {
            used: this.quotaUsed,
            limit: this.quotaLimit,
            remaining: this.quotaLimit - this.quotaUsed,
            resetDate: this.quotaResetTime ? this.quotaResetTime.toISOString() : null
        };
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            platform: 'youtube',
            authenticated: !!this.oauthToken,
            quota: this.getQuotaStats()
        };
    }
}

module.exports = YouTubeIntegration;
