/**
 * Spotify Integration for OmniClaw Media Streaming
 *
 * Provides comprehensive Spotify control including:
 * - OAuth2 authentication with token refresh
 * - Playback control (play, pause, skip, seek, volume)
 * - Device management
 * - Library access (saved tracks, playlists)
 * - Recommendations (Discover Weekly, Release Radar)
 * - Search functionality
 */

const axios = require('axios');
const { getCircuitBreaker } = require('../../../shared/resilience/circuit-breaker');
const { withRetry } = require('../../../shared/resilience/retry');
const { withTimeout } = require('../../../shared/resilience/timeout-wrapper');

class SpotifyIntegration {
    constructor(config = {}) {
        this.clientId = config.clientId || process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = config.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;
        this.redirectUri = config.redirectUri || process.env.SPOTIFY_REDIRECT_URI;
        this.baseUrl = 'https://api.spotify.com/v1';
        this.authUrl = 'https://accounts.spotify.com';

        // Token storage
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;

        // Circuit breaker for API calls
        this.circuitBreaker = getCircuitBreaker('spotify-api', {
            timeout: 10000,
            errorThresholdPercentage: 50,
            resetTimeout: 60000
        });

        // Active device tracking
        this.activeDeviceId = null;

        console.log('🎵 Spotify Integration initialized');
    }

    /**
     * Generate OAuth authorization URL
     */
    getAuthUrl(state = null) {
        const scopes = [
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'user-read-playback-position',
            'user-library-read',
            'user-library-modify',
            'playlist-read-private',
            'playlist-read-collaborative',
            'user-top-read',
            'user-read-recently-played'
        ].join(' ');

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scopes,
            state: state || this._generateState()
        });

        return `${this.authUrl}/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async authorize(code) {
        try {
            const response = await withTimeout(
                axios.post(`${this.authUrl}/api/token`, {
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.redirectUri,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }),
                10000
            );

            this.accessToken = response.data.access_token;
            this.refreshToken = response.data.refresh_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('✅ Spotify authorization successful');
            return {
                success: true,
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                expiresIn: response.data.expires_in
            };
        } catch (error) {
            console.error('❌ Spotify authorization failed:', error.message);
            throw new Error(`Authorization failed: ${error.message}`);
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await withTimeout(
                axios.post(`${this.authUrl}/api/token`, {
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }),
                10000
            );

            this.accessToken = response.data.access_token;
            if (response.data.refresh_token) {
                this.refreshToken = response.data.refresh_token;
            }
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('✅ Spotify token refreshed');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Token refresh failed:', error.message);
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Ensure token is valid, refresh if needed
     */
    async ensureValidToken() {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authorize() first.');
        }

        if (this.tokenExpiry && Date.now() >= this.tokenExpiry - 60000) {
            await this.refreshAccessToken();
        }

        return this.accessToken;
    }

    /**
     * Make authenticated API call with resilience
     */
    async _apiCall(method, endpoint, data = null) {
        const token = await this.ensureValidToken();

        return this.circuitBreaker.execute(async () => {
            return withRetry(async () => {
                return withTimeout(
                    axios({
                        method,
                        url: `${this.baseUrl}${endpoint}`,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        data: data
                    }),
                    10000
                );
            }, { maxRetries: 3, retryDelay: 1000 });
        });
    }

    /**
     * Get available devices
     */
    async getDevices() {
        try {
            const response = await this._apiCall('GET', '/me/player/devices');
            return response.data.devices.map(device => ({
                id: device.id,
                name: device.name,
                type: device.type,
                isActive: device.is_active,
                volume: device.volume_percent
            }));
        } catch (error) {
            console.error('❌ Failed to get devices:', error.message);
            return [];
        }
    }

    /**
     * Set active device
     */
    async setDevice(deviceId) {
        try {
            await this._apiCall('PUT', '/me/player', { device_ids: [deviceId], play: false });
            this.activeDeviceId = deviceId;
            console.log(`✅ Device set: ${deviceId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set device:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current playback state
     */
    async getPlaybackState() {
        try {
            const response = await this._apiCall('GET', '/me/player');
            if (!response.data) {
                return { isPlaying: false };
            }

            return {
                isPlaying: response.data.is_playing,
                progressMs: response.data.progress_ms,
                item: response.data.item ? {
                    name: response.data.item.name,
                    artists: response.data.item.artists.map(a => a.name).join(', '),
                    album: response.data.item.album.name,
                    durationMs: response.data.item.duration_ms,
                    uri: response.data.item.uri
                } : null,
                device: response.data.device ? {
                    id: response.data.device.id,
                    name: response.data.device.name,
                    type: response.data.device.type
                } : null,
                shuffle: response.data.shuffle_state,
                repeat: response.data.repeat_state
            };
        } catch (error) {
            if (error.response?.status === 204) {
                return { isPlaying: false };
            }
            console.error('❌ Failed to get playback state:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Play track or context
     */
    async play(options = {}) {
        const { uri, deviceId, contextUri, offset } = options;

        try {
            const body = {};
            if (uri) body.uris = [uri];
            if (contextUri) body.context_uri = contextUri;
            if (offset !== undefined) body.offset = { position: offset };
            if (deviceId) body.device_id = deviceId;

            const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
            await this._apiCall('PUT', endpoint, Object.keys(body).length > 0 ? body : null);

            console.log(`✅ Playback started: ${uri || contextUri || 'resume'}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to play:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pause playback
     */
    async pause() {
        try {
            await this._apiCall('PUT', '/me/player/pause');
            console.log('✅ Playback paused');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to pause:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Skip to next track
     */
    async next() {
        try {
            await this._apiCall('POST', '/me/player/next');
            console.log('✅ Skipped to next track');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to skip:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Skip to previous track
     */
    async previous() {
        try {
            await this._apiCall('POST', '/me/player/previous');
            console.log('✅ Skipped to previous track');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to go to previous:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Seek to position
     */
    async seek(positionMs) {
        try {
            await this._apiCall('PUT', `/me/player/seek?position_ms=${positionMs}`);
            console.log(`✅ Seeked to ${positionMs}ms`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to seek:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set volume
     */
    async setVolume(volumePercent) {
        try {
            await this._apiCall('PUT', `/me/player/volume?volume_percent=${volumePercent}`);
            console.log(`✅ Volume set to ${volumePercent}%`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set volume:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set shuffle mode
     */
    async setShuffle(shuffle = true) {
        try {
            await this._apiCall('PUT', `/me/player/shuffle?state=${shuffle}`);
            console.log(`✅ Shuffle ${shuffle ? 'enabled' : 'disabled'}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set shuffle:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set repeat mode
     */
    async setRepeat(mode = 'context') {
        try {
            await this._apiCall('PUT', `/me/player/repeat?state=${mode}`);
            console.log(`✅ Repeat mode set to ${mode}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set repeat:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search for content
     */
    async search(query, type = 'track', limit = 10) {
        try {
            const response = await this._apiCall('GET', `/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);

            const results = {
                tracks: response.data.tracks?.items.map(track => ({
                    id: track.id,
                    name: track.name,
                    uri: track.uri,
                    artists: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    duration: this._formatDuration(track.duration_ms),
                    popularity: track.popularity
                })) || [],
                albums: response.data.albums?.items.map(album => ({
                    id: album.id,
                    name: album.name,
                    uri: album.uri,
                    artists: album.artists.map(a => a.name).join(', '),
                    releaseDate: album.release_date,
                    totalTracks: album.total_tracks
                })) || [],
                playlists: response.data.playlists?.items.map(playlist => ({
                    id: playlist.id,
                    name: playlist.name,
                    uri: playlist.uri,
                    owner: playlist.owner.display_name,
                    tracksTotal: playlist.tracks.total
                })) || []
            };

            console.log(`✅ Search complete: ${results.tracks.length} tracks`);
            return { success: true, query, results };
        } catch (error) {
            console.error('❌ Search failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's saved tracks
     */
    async getSavedTracks(limit = 20, offset = 0) {
        try {
            const response = await this._apiCall('GET', `/me/tracks?limit=${limit}&offset=${offset}`);

            const tracks = response.data.items.map(item => ({
                id: item.track.id,
                name: item.track.name,
                uri: item.track.uri,
                artists: item.track.artists.map(a => a.name).join(', '),
                album: item.track.album.name,
                duration: this._formatDuration(item.track.duration_ms),
                addedAt: item.added_at
            }));

            return { success: true, tracks, total: response.data.total };
        } catch (error) {
            console.error('❌ Failed to get saved tracks:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user's playlists
     */
    async getPlaylists(limit = 20, offset = 0) {
        try {
            const response = await this._apiCall('GET', `/me/playlists?limit=${limit}&offset=${offset}`);

            const playlists = response.data.items.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                uri: playlist.uri,
                owner: playlist.owner.display_name,
                tracksTotal: playlist.tracks.total,
                isCollaborative: playlist.collaborative,
                imageUrl: playlist.images?.[0]?.url
            }));

            return { success: true, playlists, total: response.data.total };
        } catch (error) {
            console.error('❌ Failed to get playlists:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get playlist tracks
     */
    async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
        try {
            const response = await this._apiCall('GET', `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);

            const tracks = response.data.items.map(item => ({
                id: item.track.id,
                name: item.track.name,
                uri: item.track.uri,
                artists: item.track.artists.map(a => a.name).join(', '),
                album: item.track.album.name,
                duration: this._formatDuration(item.track.duration_ms),
                addedAt: item.added_at
            }));

            return { success: true, tracks, total: response.data.total };
        } catch (error) {
            console.error('❌ Failed to get playlist tracks:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get recommendations
     */
    async getRecommendations(options = {}) {
        const {
            seedTracks = [],
            seedArtists = [],
            seedGenres = [],
            limit = 10
        } = options;

        try {
            const params = new URLSearchParams({ limit: limit.toString() });

            if (seedTracks.length > 0) params.append('seed_tracks', seedTracks.join(','));
            if (seedArtists.length > 0) params.append('seed_artists', seedArtists.join(','));
            if (seedGenres.length > 0) params.append('seed_genres', seedGenres.join(','));

            const response = await this._apiCall('GET', `/recommendations?${params.toString()}`);

            const tracks = response.data.tracks.map(track => ({
                id: track.id,
                name: track.name,
                uri: track.uri,
                artists: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                duration: this._formatDuration(track.duration_ms),
                popularity: track.popularity
            }));

            console.log(`✅ Got ${tracks.length} recommendations`);
            return { success: true, tracks };
        } catch (error) {
            console.error('❌ Failed to get recommendations:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get recently played tracks
     */
    async getRecentlyPlayed(limit = 20) {
        try {
            const response = await this._apiCall('GET', `/me/player/recently-played?limit=${limit}`);

            const tracks = response.data.items.map(item => ({
                id: item.track.id,
                name: item.track.name,
                uri: item.track.uri,
                artists: item.track.artists.map(a => a.name).join(', '),
                album: item.track.album.name,
                playedAt: item.played_at
            }));

            return { success: true, tracks };
        } catch (error) {
            console.error('❌ Failed to get recently played:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Format duration for display
     */
    _formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Generate random state for OAuth
     */
    _generateState() {
        return Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            platform: 'spotify',
            authenticated: !!this.accessToken,
            activeDevice: this.activeDeviceId,
            tokenExpiry: this.tokenExpiry
        };
    }
}

module.exports = SpotifyIntegration;
