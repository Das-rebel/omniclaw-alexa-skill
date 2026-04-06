/**
 * Kodi Integration for OmniClaw Media Streaming
 *
 * Provides comprehensive Kodi media center control including:
 * - Kodi JSON-RPC API (HTTP/TCP/WebSocket)
 * - Trakt.tv integration (watchlists, history, resume, trending)
 * - Playback control (play, pause, stop, seek)
 * - Library navigation (movies, TV shows, music)
 * - System control (volume, power)
 *
 * This module provides direct Kodi + Trakt integration for users who run
 * Kodi as their media center solution.
 */

const axios = require('axios');
const FenIntegration = require('./fen-integration');

class KodiIntegration extends FenIntegration {
    constructor(config = {}) {
        super(config);
        this._name = 'Kodi';

        this.traktClientId = config.traktClientId || process.env.TRAKT_CLIENT_ID || '';
        this.traktAccessToken = config.traktAccessToken || process.env.TRAKT_ACCESS_TOKEN || '';
        this.traktBaseUrl = 'https://api.trakt.tv';

        if (this.traktClientId) {
            console.log('🎬 Kodi/Trakt Integration initialized with Trakt support');
        }
    }

    getStatus() {
        return {
            platform: 'kodi',
            connected: true,
            traktConnected: !!(this.traktClientId && this.traktAccessToken),
            host: `${this.kodiProtocol}://${this.kodiHost}:${this.kodiPort}`
        };
    }

    async _traktRequest(endpoint, params = {}) {
        if (!this.traktClientId) {
            throw new Error('Trakt API not configured. Set TRAKT_CLIENT_ID environment variable.');
        }

        const url = `${this.traktBaseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'trakt-api-version': '2',
            'trakt-api-key': this.traktClientId
        };

        if (this.traktAccessToken) {
            headers['Authorization'] = `Bearer ${this.traktAccessToken}`;
        }

        try {
            const response = await axios.get(url, { headers, params });
            return response.data;
        } catch (error) {
            console.error(`❌ Trakt API error for ${endpoint}:`, error.message);
            throw error;
        }
    }

    async getTraktWatchlist(type = 'movies') {
        try {
            const endpoint = `/users/me/watchlist/${type}`;
            const data = await this._traktRequest(endpoint);
            return {
                success: true,
                type,
                count: data.length,
                items: data.map(item => ({
                    traktId: item.movie?.ids?.trakt || item.show?.ids?.trakt,
                    title: item.movie?.title || item.show?.title,
                    year: item.movie?.year || item.show?.year,
                    tmdbId: item.movie?.ids?.tmdb || item.show?.ids?.tmdb,
                    imdbId: item.movie?.ids?.imdb || item.show?.ids?.imdb,
                    mediaType: type === 'movies' ? 'movie' : 'show'
                }))
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTraktTrending(type = 'movies', limit = 10) {
        try {
            const endpoint = `/movies/trending`;
            const params = { limit };
            const data = type === 'shows'
                ? await this._traktRequest('/shows/trending', params)
                : await this._traktRequest(endpoint, params);

            return {
                success: true,
                type,
                items: data.map(item => ({
                    traktId: item.movie?.ids?.trakt || item.show?.ids?.trakt,
                    title: item.movie?.title || item.show?.title,
                    year: item.movie?.year || item.show?.year,
                    tmdbId: item.movie?.ids?.tmdb || item.show?.ids?.tmdb,
                    imdbId: item.movie?.ids?.imdb || item.show?.ids?.imdb,
                    watchers: item.watchers,
                    mediaType: type === 'movies' ? 'movie' : 'show'
                }))
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTraktHistory(limit = 20) {
        try {
            const data = await this._traktRequest('/users/me/history/movies', { limit });
            const showsData = await this._traktRequest('/users/me/history/shows', { limit });

            const movies = data.map(item => ({
                traktId: item.movie?.ids?.trakt,
                title: item.movie?.title,
                year: item.movie?.year,
                watchedAt: item.watched_at,
                tmdbId: item.movie?.ids?.tmdb,
                mediaType: 'movie'
            }));

            const shows = showsData.map(item => ({
                traktId: item.show?.ids?.trakt,
                title: item.show?.title,
                year: item.show?.year,
                episode: item.episode?.title,
                season: item.episode?.season,
                number: item.episode?.number,
                watchedAt: item.watched_at,
                tmdbId: item.show?.ids?.tmdb,
                mediaType: 'show'
            }));

            return { success: true, movies, shows };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTraktResume(type = 'shows') {
        try {
            const data = await this._traktRequest(`/users/me/playback/${type}`, { limit: 10 });

            return {
                success: true,
                type,
                items: data.map(item => ({
                    traktId: item[type === 'movies' ? 'movie' : 'show']?.ids?.trakt,
                    title: item[type === 'movies' ? 'movie' : 'show']?.title,
                    year: item[type === 'movies' ? 'movie' : 'show']?.year,
                    progress: Math.round(item.progress || 0),
                    pausedAt: item.paused_at,
                    tmdbId: item[type === 'movies' ? 'movie' : 'show']?.ids?.tmdb,
                    mediaType: type === 'movies' ? 'movie' : 'show',
                    season: item.episode?.season,
                    episode: item.episode?.number,
                    episodeTitle: item.episode?.title
                }))
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async searchTrakt(query, type = null) {
        try {
            const searchResults = await this._traktRequest('/search/movie', {
                query,
                fields: 'title'
            });

            const showResults = await this._traktRequest('/search/show', {
                query,
                fields: 'title'
            });

            const results = [
                ...searchResults.map(item => ({
                    traktId: item.movie?.ids?.trakt,
                    title: item.movie?.title,
                    year: item.movie?.year,
                    tmdbId: item.movie?.ids?.tmdb,
                    imdbId: item.movie?.ids?.imdb,
                    mediaType: 'movie',
                    score: item.score
                })),
                ...showResults.map(item => ({
                    traktId: item.show?.ids?.trakt,
                    title: item.show?.title,
                    year: item.show?.year,
                    tmdbId: item.show?.ids?.tmdb,
                    imdbId: item.show?.ids?.imdb,
                    mediaType: 'show',
                    score: item.score
                }))
            ];

            results.sort((a, b) => b.score - a.score);

            return { success: true, results };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async playTraktItem(traktId, mediaType = 'movie') {
        try {
            if (mediaType === 'movie') {
                const movie = await this._traktRequest(`/movies/${traktId}`);
                const serenUrl = `plugin://plugin.video.seren/?action=getSources&action_args=${encodeURIComponent(JSON.stringify({ mediatype: 'movie', trakt_id: traktId }))}`;
                const result = await this._rpcCall('Player.Open', { item: { file: serenUrl } });
                return {
                    success: true,
                    message: `Now playing "${movie.title}"`,
                    mediaType: 'movie'
                };
            } else {
                const show = await this._traktRequest(`/shows/${traktId}`);
                const serenUrl = `plugin://plugin.video.seren/?action=getSources&action_args=${encodeURIComponent(JSON.stringify({ mediatype: 'show', trakt_id: traktId }))}`;
                await this._rpcCall('Player.Open', { item: { file: serenUrl } });
                return {
                    success: true,
                    message: `Now playing "${show.title}"`,
                    mediaType: 'show'
                };
            }
        } catch (error) {
            console.error(`❌ Failed to play Trakt item ${traktId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async playNewMovie() {
        try {
            const trending = await this.getTraktTrending('movies', 1);
            if (!trending.success || trending.items.length === 0) {
                return { success: false, message: 'No trending movies found' };
            }

            const movie = trending.items[0];
            const result = await this.playSerenTrakt('movie', movie.traktId);

            if (result.success) {
                return {
                    success: true,
                    message: `Now playing trending movie: "${movie.title}" (${movie.year})`,
                    movie
                };
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async playNewShow() {
        try {
            const trending = await this.getTraktTrending('shows', 1);
            if (!trending.success || trending.items.length === 0) {
                return { success: false, message: 'No trending shows found' };
            }

            const show = trending.items[0];
            const result = await this.playSerenTrakt('show', show.traktId);

            if (result.success) {
                return {
                    success: true,
                    message: `Now playing trending show: "${show.title}" (${show.year})`,
                    show
                };
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async playFromWatchlist(mediaType = 'movies') {
        try {
            const watchlist = await this.getTraktWatchlist(mediaType);
            if (!watchlist.success || watchlist.items.length === 0) {
                return { success: false, message: 'Your watchlist is empty' };
            }

            const item = watchlist.items[0];
            const result = await this.playSerenTrakt(item.mediaType, item.traktId);

            if (result.success) {
                return {
                    success: true,
                    message: `Now playing "${item.title}" from your watchlist`,
                    item
                };
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resumeShow(showTitle = null) {
        try {
            const resumeList = await this.getTraktResume('shows');
            if (!resumeList.success || resumeList.items.length === 0) {
                return { success: false, message: 'No shows to resume' };
            }

            let showToResume = null;
            if (showTitle) {
                showToResume = resumeList.items.find(item =>
                    item.title.toLowerCase().includes(showTitle.toLowerCase())
                );
            } else {
                showToResume = resumeList.items[0];
            }

            if (!showToResume) {
                return { success: false, message: `Could not find show "${showTitle}" in resume list` };
            }

            const serenUrl = `plugin://plugin.video.seren/?action=getSources&action_args=${encodeURIComponent(JSON.stringify({ mediatype: 'show', trakt_id: showToResume.traktId }))}`;
            await this._ensureKodiReady();
            await this._rpcCall('Player.Open', { item: { file: serenUrl } });

            return {
                success: true,
                message: `Resuming "${showToResume.title}" S${showToResume.season}E${showToResume.episode} (${showToResume.progress}% watched)`,
                show: showToResume
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async _ensureKodiReady() {
        try {
            await this._rpcCall('GUI.ActivateWindow', { window: 'home' });
            await this._sleep(3000);
            return true;
        } catch (error) {
            console.warn('⚠️ Could not navigate to home:', error.message);
            return false;
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async launchSeren(serenAction = 'moviesHome') {
        try {
            await this._ensureKodiReady();
            await this._sleep(2000);
            const serenUrl = `plugin://plugin.video.seren/?action=${serenAction}`;
            await this._rpcCall('Player.Open', { item: { file: serenUrl } });
            return { success: true, message: `Launched Seren ${serenAction}` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async playSerenTrakt(mediaType = 'movie', traktId = null) {
        try {
            await this._ensureKodiReady();
            await this._sleep(2000);

            if (!traktId) {
                const trending = mediaType === 'movie'
                    ? await this.getTraktTrending('movies', 1)
                    : await this.getTraktTrending('shows', 1);

                if (!trending.success || trending.items.length === 0) {
                    return { success: false, message: `No trending ${mediaType}s found` };
                }
                traktId = trending.items[0].traktId;
            }

            const serenUrl = `plugin://plugin.video.seren/?action=getSources&action_args=${encodeURIComponent(JSON.stringify({ mediatype: mediaType, trakt_id: traktId }))}`;
            await this._sleep(3000);
            await this._rpcCall('Player.Open', { item: { file: serenUrl } });

            return {
                success: true,
                message: `Playing via Seren (trakt_id: ${traktId})`,
                traktId,
                mediaType
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = KodiIntegration;
