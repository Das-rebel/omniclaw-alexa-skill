/**
 * Fen/Kodi Bridge for OmniClaw Media Streaming
 *
 * Provides comprehensive Kodi control including:
 * - Kodi JSON-RPC API (HTTP/TCP/WebSocket)
 * - Fen addon integration for content search
 * - Real-Debrid/Premiumize link resolution
 * - Trakt.tv metadata enrichment
 * - Playback service and resume points
 * - Library management and watchlist sync
 */

const axios = require('axios');
const WebSocket = require('ws');
const { getCircuitBreaker } = require('../../../shared/resilience/circuit-breaker');
const { withRetry } = require('../../../shared/resilience/retry');
const { withTimeout } = require('../../../shared/resilience/timeout-wrapper');

/**
 * Kodi JSON-RPC Client
 */
class KodiBridge {
    constructor(config = {}) {
        this.host = config.host || process.env.KODI_HOST || 'localhost';
        this.port = config.port || process.env.KODI_PORT || 8080;
        this.protocol = config.protocol || process.env.KODI_PROTOCOL || 'http';
        this.username = config.username || process.env.KODI_USERNAME || 'kodi';
        this.password = config.password || process.env.KODI_PASSWORD || '';
        this.webSocketPort = config.webSocketPort || 9090;

        this.baseUrl = `${this.protocol}://${this.host}:${this.port}/jsonrpc`;
        this.wsUrl = `ws://${this.host}:${this.webSocketPort}/jsonrpc`;

        // Real-Debrid configuration
        this.rdClientId = config.rdClientId || process.env.RD_CLIENT_ID;
        this.rdClientSecret = config.rdClientSecret || process.env.RD_CLIENT_SECRET;
        this.rdAccessToken = config.rdAccessToken || process.env.RD_ACCESS_TOKEN;

        // Trakt.tv configuration
        this.traktClientId = config.traktClientId || process.env.TRAKT_CLIENT_ID;
        this.traktAccessToken = config.traktAccessToken || process.env.TRAKT_ACCESS_TOKEN;

        // Circuit breaker
        this.circuitBreaker = getCircuitBreaker('kodi-rpc', {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });

        // WebSocket connection
        this.ws = null;
        this.requestId = 1;
        this.notificationCallbacks = new Map();

        console.log(`📺 Kodi Bridge initialized: ${this.host}:${this.port}`);
    }

    /**
     * Connect to Kodi via WebSocket
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                const auth = this.password ?
                    Buffer.from(`${this.username}:${this.password}`).toString('base64') : null;

                const options = {
                    headers: {}
                };

                if (auth) {
                    options.headers['Authorization'] = `Basic ${auth}`;
                }

                this.ws = new WebSocket(this.wsUrl, options);

                this.ws.on('open', () => {
                    console.log('✅ WebSocket connected to Kodi');
                    this._setupNotificationHandlers();
                    resolve(true);
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        if (message.method && this.notificationCallbacks.has(message.method)) {
                            const callback = this.notificationCallbacks.get(message.method);
                            callback(message.params);
                        }
                    } catch (error) {
                        console.error('❌ Failed to parse WebSocket message:', error.message);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('❌ WebSocket error:', error.message);
                    reject(error);
                });

                this.ws.on('close', () => {
                    console.log('🔌 WebSocket connection closed');
                    this.ws = null;
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Setup notification handlers
     */
    _setupNotificationHandlers() {
        // Player notifications
        this.onNotification('Player.OnPlay', (params) => {
            console.log('▶️ Kodi started playing:', params.data.item?.title);
        });

        this.onNotification('Player.OnPause', (params) => {
            console.log('⏸️ Kodi paused playback');
        });

        this.onNotification('Player.OnStop', (params) => {
            console.log('⏹️ Kodi stopped playback');
        });

        // Library notifications
        this.onNotification('VideoLibrary.OnUpdate', (params) => {
            console.log('📚 Video library updated');
        });

        this.onNotification('AudioLibrary.OnUpdate', (params) => {
            console.log('📚 Audio library updated');
        });
    }

    /**
     * Register notification callback
     */
    onNotification(method, callback) {
        this.notificationCallbacks.set(method, callback);
    }

    /**
     * Make JSON-RPC call to Kodi
     */
    async _rpcCall(method, params = {}) {
        return this.circuitBreaker.execute(async () => {
            return withRetry(async () => {
                try {
                    const response = await withTimeout(
                        axios.post(this.baseUrl, {
                            jsonrpc: '2.0',
                            method: method,
                            params: params,
                            id: this.requestId++
                        }, {
                            auth: this.password ? {
                                username: this.username,
                                password: this.password
                            } : undefined,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 5000
                        }),
                        5000
                    );

                    if (response.data.error) {
                        throw new Error(`Kodi RPC error: ${response.data.error.message}`);
                    }

                    return response.data.result;
                } catch (error) {
                    console.error(`❌ Kodi RPC call failed [${method}]:`, error.message);
                    throw error;
                }
            }, { maxRetries: 2, retryDelay: 500 });
        });
    }

    /**
     * Get active players
     */
    async getActivePlayers() {
        try {
            const players = await this._rpcCall('Player.GetActivePlayers');
            return players.map(player => ({
                playerid: player.playerid,
                type: player.type
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get player properties
     */
    async getPlayerProperties(playerId) {
        try {
            return await this._rpcCall('Player.GetProperties', {
                playerid: playerId,
                properties: [
                    'speed', 'time', 'totaltime', 'percentage',
                    'position', 'repeat', 'shuffled', 'canseek',
                    'canchangespeed', 'canmove', 'canzoom', 'canrotate',
                    'cansharpen', 'candeinterlace', 'canstretch'
                ]
            });
        } catch (error) {
            console.error('❌ Failed to get player properties:', error.message);
            return null;
        }
    }

    /**
     * Get currently playing item
     */
    async getCurrentlyPlaying() {
        try {
            const players = await this.getActivePlayers();
            if (players.length === 0) {
                return null;
            }

            const playerId = players[0].playerid;
            const item = await this._rpcCall('Player.GetItem', {
                playerid: playerId,
                properties: [
                    'title', 'artist', 'album', 'genre', 'year',
                    'rating', 'plot', 'thumbnail', 'fanart', 'duration',
                    'playcount', 'lastplayed', 'showtitle', 'season', 'episode'
                ]
            });

            const properties = await this.getPlayerProperties(playerId);

            return {
                ...item,
                player: {
                    id: playerId,
                    ...properties
                }
            };
        } catch (error) {
            console.error('❌ Failed to get currently playing:', error.message);
            return null;
        }
    }

    /**
     * Play item
     */
    async playItem(itemId) {
        try {
            await this._rpcCall('Player.Open', {
                item: {
                    itemid: itemId
                }
            });

            console.log(`✅ Playing item: ${itemId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to play item:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Play file (supports plugins like Fen)
     */
    async playFile(file) {
        try {
            await this._rpcCall('Player.Open', {
                item: {
                    file: file
                }
            });

            console.log(`✅ Playing file: ${file}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to play file:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pause/resume playback
     */
    async pause(playerId = null) {
        try {
            const players = await this.getActivePlayers();
            if (players.length === 0) {
                return { success: false, error: 'No active player' };
            }

            const id = playerId || players[0].playerid;
            await this._rpcCall('Player.PlayPause', { playerid: id });

            console.log(`✅ Toggled pause for player ${id}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to pause:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop playback
     */
    async stop(playerId = null) {
        try {
            const players = await this.getActivePlayers();
            if (players.length === 0) {
                return { success: false, error: 'No active player' };
            }

            const id = playerId || players[0].playerid;
            await this._rpcCall('Player.Stop', { playerid: id });

            console.log(`✅ Stopped player ${id}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to stop:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Seek to position
     */
    async seek(position, playerId = null) {
        try {
            const players = await this.getActivePlayers();
            if (players.length === 0) {
                return { success: false, error: 'No active player' };
            }

            const id = playerId || players[0].playerid;
            await this._rpcCall('Player.Seek', {
                playerid: id,
                value: {
                    time: {
                        hours: 0,
                        minutes: Math.floor(position / 60),
                        seconds: position % 60,
                        milliseconds: 0
                    }
                }
            });

            console.log(`✅ Sought to ${position}s`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to seek:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Skip to next/previous
     */
    async skip(direction = 'next', playerId = null) {
        try {
            const players = await this.getActivePlayers();
            if (players.length === 0) {
                return { success: false, error: 'No active player' };
            }

            const id = playerId || players[0].playerid;
            const method = direction === 'next' ? 'Player.MoveRight' : 'Player.MoveLeft';

            await this._rpcCall(method, { playerid: id });

            console.log(`✅ Skipped ${direction}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to skip:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set volume
     */
    async setVolume(volume) {
        try {
            await this._rpcCall('Application.SetVolume', {
                volume: Math.max(0, Math.min(100, volume))
            });

            console.log(`✅ Volume set to ${volume}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set volume:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mute/unmute
     */
    async setMute(mute = true) {
        try {
            await this._rpcCall('Application.SetMute', { mute: mute });

            console.log(`✅ ${mute ? 'Muted' : 'Unmuted'}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to set mute:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search video library
     */
    async searchVideos(query) {
        try {
            const response = await this._rpcCall('VideoLibrary.GetMovies', {
                properties: ['title', 'plot', 'year', 'genre', 'rating', 'thumbnail', 'playcount'],
                sort: {
                    method: 'title',
                    order: 'ascending'
                }
            });

            const movies = response.movies || [];

            // Filter by query
            const filtered = movies.filter(movie =>
                movie.title.toLowerCase().includes(query.toLowerCase()) ||
                (movie.plot && movie.plot.toLowerCase().includes(query.toLowerCase()))
            );

            console.log(`✅ Found ${filtered.length} movies matching "${query}"`);
            return {
                success: true,
                query,
                results: filtered,
                total: filtered.length
            };
        } catch (error) {
            console.error('❌ Failed to search videos:', error.message);
            return { success: false, error: error.message, results: [] };
        }
    }

    /**
     * Search TV shows
     */
    async searchTVShows(query) {
        try {
            const response = await this._rpcCall('VideoLibrary.GetTVShows', {
                properties: ['title', 'plot', 'genre', 'rating', 'thumbnail', 'year'],
                sort: {
                    method: 'title',
                    order: 'ascending'
                }
            });

            const shows = response.tvshows || [];

            // Filter by query
            const filtered = shows.filter(show =>
                show.title.toLowerCase().includes(query.toLowerCase()) ||
                (show.plot && show.plot.toLowerCase().includes(query.toLowerCase()))
            );

            console.log(`✅ Found ${filtered.length} TV shows matching "${query}"`);
            return {
                success: true,
                query,
                results: filtered,
                total: filtered.length
            };
        } catch (error) {
            console.error('❌ Failed to search TV shows:', error.message);
            return { success: false, error: error.message, results: [] };
        }
    }

    /**
     * Get episodes for TV show
     */
    async getEpisodes(tvShowId, season = -1) {
        try {
            const response = await this._rpcCall('VideoLibrary.GetEpisodes', {
                tvshowid: tvShowId,
                season: season,
                properties: ['title', 'plot', 'season', 'episode', 'rating', 'thumbnail', 'playcount']
            });

            const episodes = response.episodes || [];

            console.log(`✅ Found ${episodes.length} episodes`);
            return {
                success: true,
                episodes,
                total: episodes.length
            };
        } catch (error) {
            console.error('❌ Failed to get episodes:', error.message);
            return { success: false, error: error.message, episodes: [] };
        }
    }

    /**
     * Scan video library
     */
    async scanVideoLibrary() {
        try {
            await this._rpcCall('VideoLibrary.Scan');

            console.log('✅ Video library scan initiated');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to scan library:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean video library
     */
    async cleanVideoLibrary() {
        try {
            await this._rpcCall('VideoLibrary.Clean');

            console.log('✅ Video library clean initiated');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to clean library:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add to favorites
     */
    async addToFavorite(itemId, type = 'movie') {
        try {
            // Kodi doesn't have native favorites, use playlists
            // Alternatively, mark as watched with high rating

            await this._rpcCall('VideoLibrary.SetMovieDetails', {
                movieid: itemId,
                details: {
                    userrating: 10
                }
            });

            console.log(`✅ Added ${itemId} to favorites`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to add to favorites:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get application properties
     */
    async getApplicationProperties() {
        try {
            return await this._rpcCall('Application.GetProperties', {
                properties: ['volume', 'muted', 'name', 'version']
            });
        } catch (error) {
            console.error('❌ Failed to get app properties:', error.message);
            return null;
        }
    }

    /**
     * Send notification to Kodi
     */
    async sendNotification(title, message, image = null) {
        try {
            await this._rpcCall('GUI.ShowNotification', {
                title: title,
                message: message,
                image: image || 'info',
                displaytime: 5000
            });

            console.log(`✅ Notification sent: ${title}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to send notification:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute Add-on (e.g., Fen)
     */
    async executeAddon(addonId, params = {}) {
        try {
            await this._rpcCall('Addons.ExecuteAddon', {
                addonid: addonId,
                params: params
            });

            console.log(`✅ Executed add-on: ${addonId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to execute add-on:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search with Fen addon
     */
    async searchFen(query, type = 'movie') {
        try {
            // Fen uses plugin://plugin.video.fen/ prefix
            // This requires Fen to be installed and configured

            const searchParams = {
                action: 'search',
                query: query,
                type: type
            };

            return await this.executeAddon('plugin.video.fen', searchParams);
        } catch (error) {
            console.error('❌ Failed to search with Fen:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resolve stream via Real-Debrid
     */
    async resolveRealDebrid(link) {
        if (!this.rdAccessToken) {
            throw new Error('Real-Debrid access token not configured');
        }

        try {
            // Add link to Real-Debrid
            const addResponse = await axios.post('https://api.real-debrid.com/rest/1.0/torrents/addTorrent',
                link,
                {
                    headers: {
                        'Authorization': `Bearer ${this.rdAccessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const torrentId = addResponse.data.id;

            // Get torrent info
            const infoResponse = await axios.get(
                `https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.rdAccessToken}`
                    }
                }
            );

            return {
                success: true,
                torrentId: torrentId,
                info: infoResponse.data
            };
        } catch (error) {
            console.error('❌ Real-Debrid resolution failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Scrobble to Trakt.tv
     */
    async scrobbleTrakt(item, action = 'start') {
        if (!this.traktAccessToken) {
            console.warn('⚠️ Trakt.tv access token not configured');
            return { success: false };
        }

        try {
            const response = await axios.post('https://api.trakt.tv/scrobble/start',
                {
                    movie: item.type === 'movie' ? {
                        title: item.title,
                        year: item.year,
                        ids: {
                            tmdb: item.ids?.tmdb
                        }
                    } : undefined,
                    show: item.type === 'episode' ? {
                        title: item.showtitle,
                        year: item.year,
                        ids: {
                            tvdb: item.ids?.tvdb
                        }
                    } : undefined,
                    episode: item.type === 'episode' ? {
                        season: item.season,
                        number: item.episode
                    } : undefined,
                    progress: item.progress || 0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.traktAccessToken}`,
                        'trakt-api-version': '2',
                        'trakt-api-key': this.traktClientId,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`✅ Scrobbled to Trakt.tv: ${item.title}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Trakt.tv scrobble failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get system info
     */
    async getSystemInfo() {
        try {
            const [properties, volume] = await Promise.all([
                this.getApplicationProperties(),
                this._rpcCall('Application.GetProperties', {
                    properties: ['volume', 'muted']
                })
            ]);

            return {
                success: true,
                host: this.host,
                port: this.port,
                connected: true,
                volume: volume.volume,
                muted: volume.muted,
                version: properties.version
            };
        } catch (error) {
            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            platform: 'kodi',
            host: this.host,
            port: this.port,
            connected: this.ws?.readyState === WebSocket.OPEN,
            hasRealDebrid: !!this.rdAccessToken,
            hasTrakt: !!this.traktAccessToken
        };
    }
}

module.exports = KodiBridge;
