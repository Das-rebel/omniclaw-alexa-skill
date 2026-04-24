/**
 * Media Unifier for OmniClaw Media Streaming
 *
 * Provides unified interface across all media platforms:
 * - Unified GraphQL schema
 * - Cross-platform commands
 * - Smart platform selection
 * - Playback state synchronization
 * - Voice-optimized responses
 */

const SpotifyIntegration = require('./spotify-integration');
const YouTubeIntegration = require('./youtube-integration');
const KodiBridge = require('./fen-kodi-bridge');

/**
 * Media Types
 */
const MediaType = {
    MUSIC: 'music',
    VIDEO: 'video',
    MOVIE: 'movie',
    TV_SHOW: 'tv_show',
    PLAYLIST: 'playlist',
    PODCAST: 'podcast'
};

/**
 * Platform Types
 */
const Platform = {
    SPOTIFY: 'spotify',
    YOUTUBE: 'youtube',
    KODI: 'kodi',
    FEN: 'fen'
};

/**
 * Unified Media Item
 */
class UnifiedMediaItem {
    constructor(data) {
        this.id = data.id;
        this.type = data.type || MediaType.MUSIC;
        this.title = data.title;
        this.artist = data.artist || data.artistName || null;
        this.album = data.album || data.albumName || null;
        this.duration = data.duration || null;
        this.thumbnail = data.thumbnail || data.imageUrl || null;
        this.platform = data.platform;
        this.uri = data.uri || null;
        this.url = data.url || null;
        this.metadata = data.metadata || {};
    }

    /**
     * Format for voice response
     */
    toVoiceResponse() {
        const parts = [this.title];

        if (this.artist) parts.push(`by ${this.artist}`);
        if (this.album) parts.push(`on ${this.album}`);
        if (this.duration) parts.push(`(${this.duration})`);

        return parts.join(' ');
    }
}

/**
 * Playback State
 */
class PlaybackState {
    constructor() {
        this.isPlaying = false;
        this.currentItem = null;
        this.platform = null;
        this.progress = 0;
        this.volume = 50;
        this.shuffle = false;
        this.repeat = 'off';
        this.device = null;
        this.timestamp = null;
    }

    update(data) {
        this.isPlaying = data.isPlaying || false;
        this.currentItem = data.currentItem || null;
        this.platform = data.platform || null;
        this.progress = data.progress || 0;
        this.volume = data.volume !== undefined ? data.volume : this.volume;
        this.shuffle = data.shuffle || false;
        this.repeat = data.repeat || 'off';
        this.device = data.device || null;
        this.timestamp = new Date().toISOString();
    }

    toVoiceResponse() {
        if (!this.isPlaying || !this.currentItem) {
            return 'Nothing is playing right now.';
        }

        const parts = [`Playing ${this.currentItem.toVoiceResponse()}`];
        parts.push(`on ${this.platform}`);
        if (this.device) parts.push(`via ${this.device}`);

        return parts.join(' ');
    }
}

/**
 * Media Unifier - Main Class
 */
class MediaUnifier {
    constructor(config = {}) {
        this.spotify = new SpotifyIntegration(config.spotify || {});
        this.youtube = new YouTubeIntegration(config.youtube || {});
        this.kodi = new KodiBridge(config.kodi || {});

        this.playbackState = new PlaybackState();
        this.activePlatform = null;
        this.platformPriority = [Platform.SPOTIFY, Platform.YOUTUBE, Platform.KODI];

        // Voice command patterns
        this.commandPatterns = {
            play: /^(play|start|resume)\s+(.+)/i,
            pause: /^(pause|stop)\s*(.*)$/i,
            skip: /^(skip|next)\s*(.*)$/i,
            previous: /^(previous|prev|back)\s*(.*)$/i,
            search: /^(search|find)\s+(.+)\s+(on|in)\s+(\w+)$/i,
            volume: /^(set\s+)?volume\s+(to\s+)?(\d+)/i,
            shuffle: /^(shuffle|random)\s*(on|off)?$/i,
            repeat: /^(repeat|loop)\s*(one|all|off)?$/i,
            status: /^(what's\s+)?(playing|current|status)\s*(.*)$/i
        };

        console.log('🎭 Media Unifier initialized');
    }

    /**
     * Parse voice command
     */
    parseCommand(text) {
        for (const [command, pattern] of Object.entries(this.commandPatterns)) {
            const match = text.match(pattern);
            if (match) {
                return {
                    command: command,
                    raw: text,
                    params: match.slice(1)
                };
            }
        }

        return null;
    }

    /**
     * Execute unified command
     */
    async executeCommand(text) {
        try {
            const parsed = this.parseCommand(text);
            if (!parsed) {
                return {
                    success: false,
                    message: "I didn't understand that command. Try 'play music' or 'pause'."
                };
            }

            console.log(`🎯 Executing command: ${parsed.command}`);

            switch (parsed.command) {
                case 'play':
                    return await this._handlePlay(parsed);
                case 'pause':
                    return await this._handlePause();
                case 'skip':
                    return await this._handleSkip();
                case 'previous':
                    return await this._handlePrevious();
                case 'search':
                    return await this._handleSearch(parsed);
                case 'volume':
                    return await this._handleVolume(parsed);
                case 'shuffle':
                    return await this._handleShuffle(parsed);
                case 'repeat':
                    return await this._handleRepeat(parsed);
                case 'status':
                    return await this._handleStatus();
                default:
                    return {
                        success: false,
                        message: "Command not implemented yet."
                    };
            }
        } catch (error) {
            console.error('❌ Command execution failed:', error.message);
            return {
                success: false,
                message: `Sorry, something went wrong: ${error.message}`
            };
        }
    }

    /**
     * Handle play command
     */
    async _handlePlay(parsed) {
        const query = parsed.params[1].trim();

        // Detect platform from query
        const platform = this._detectPlatform(parsed.params[2]);

        // Search on the detected platform
        const results = await this.search(query, MediaType.MUSIC, platform);

        if (!results.success || results.items.length === 0) {
            return {
                success: false,
                message: `I couldn't find "${query}" on ${platform}.`
            };
        }

        // Play the first result
        const item = results.items[0];
        const playResult = await this.play(item);

        if (playResult.success) {
            return {
                success: true,
                message: `Now playing ${item.toVoiceResponse()} on ${platform}.`
            };
        }

        return playResult;
    }

    /**
     * Handle pause command
     */
    async _handlePause() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: "Nothing is playing right now."
            };
        }

        const result = await this.pause();

        return {
            success: result.success,
            message: result.success ? "Paused playback." : "Failed to pause."
        };
    }

    /**
     * Handle skip command
     */
    async _handleSkip() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: "Nothing is playing right now."
            };
        }

        const result = await this.next();

        return {
            success: result.success,
            message: result.success ? "Skipped to next track." : "Failed to skip."
        };
    }

    /**
     * Handle previous command
     */
    async _handlePrevious() {
        if (!this.activePlatform) {
            return {
                success: false,
                message: "Nothing is playing right now."
            };
        }

        const result = await this.previous();

        return {
            success: result.success,
            message: result.success ? "Went back to previous track." : "Failed to go back."
        };
    }

    /**
     * Handle search command
     */
    async _handleSearch(parsed) {
        const query = parsed.params[1].trim();
        const platform = parsed.params[3].toLowerCase();

        const results = await this.search(query, null, platform);

        if (!results.success || results.items.length === 0) {
            return {
                success: false,
                message: `No results found for "${query}" on ${platform}.`
            };
        }

        // Format results for voice
        const items = results.items.slice(0, 5);
        const itemNames = items.map(item => item.toVoiceResponse());

        return {
            success: true,
            message: `Found ${results.total} results. Top matches: ${itemNames.join(', ')}.`,
            results: items
        };
    }

    /**
     * Handle volume command
     */
    async _handleVolume(parsed) {
        const volume = parseInt(parsed.params[2]);

        const result = await this.setVolume(volume);

        return {
            success: result.success,
            message: result.success ? `Volume set to ${volume}%.` : "Failed to set volume."
        };
    }

    /**
     * Handle shuffle command
     */
    async _handleShuffle(parsed) {
        const enabled = parsed.params[1] !== 'off';

        const result = await this.setShuffle(enabled);

        return {
            success: result.success,
            message: result.success ? `Shuffle ${enabled ? 'enabled' : 'disabled'}.` : "Failed to set shuffle."
        };
    }

    /**
     * Handle repeat command
     */
    async _handleRepeat(parsed) {
        const mode = parsed.params[1] || 'all';

        const result = await this.setRepeat(mode);

        return {
            success: result.success,
            message: result.success ? `Repeat set to ${mode}.` : "Failed to set repeat."
        };
    }

    /**
     * Handle status command
     */
    async _handleStatus() {
        await this.syncPlaybackState();

        if (!this.playbackState.isPlaying) {
            return {
                success: true,
                message: "Nothing is playing right now."
            };
        }

        return {
            success: true,
            message: this.playbackState.toVoiceResponse(),
            state: this.playbackState
        };
    }

    /**
     * Detect platform from text
     */
    _detectPlatform(text) {
        if (!text) return this.activePlatform || Platform.SPOTIFY;

        const normalized = text.toLowerCase();

        if (normalized.includes('spotify') || normalized.includes('spot')) {
            return Platform.SPOTIFY;
        } else if (normalized.includes('youtube') || normalized.includes('yt')) {
            return Platform.YOUTUBE;
        } else if (normalized.includes('kodi') || normalized.includes('fen')) {
            return Platform.KODI;
        }

        return this.activePlatform || Platform.SPOTIFY;
    }

    /**
     * Search across platforms
     */
    async search(query, type = null, platform = null) {
        const targetPlatform = platform || this._selectPlatform(query);

        try {
            let results = { success: false, items: [], total: 0 };

            switch (targetPlatform) {
                case Platform.SPOTIFY:
                    results = await this._searchSpotify(query, type);
                    break;
                case Platform.YOUTUBE:
                    results = await this._searchYouTube(query, type);
                    break;
                case Platform.KODI:
                    results = await this._searchKodi(query, type);
                    break;
            }

            return {
                ...results,
                platform: targetPlatform
            };
        } catch (error) {
            console.error(`❌ Search failed on ${targetPlatform}:`, error.message);
            return {
                success: false,
                platform: targetPlatform,
                items: [],
                total: 0,
                error: error.message
            };
        }
    }

    /**
     * Search Spotify
     */
    async _searchSpotify(query, type) {
        const searchType = type === MediaType.VIDEO ? 'track' : 'track';
        const response = await this.spotify.search(query, searchType, 10);

        if (!response.success) {
            return { success: false, items: [], total: 0 };
        }

        const items = response.results.tracks.map(track => new UnifiedMediaItem({
            id: track.id,
            type: MediaType.MUSIC,
            title: track.name,
            artist: track.artists,
            album: track.album,
            duration: track.duration,
            uri: track.uri,
            platform: Platform.SPOTIFY,
            metadata: {
                popularity: track.popularity
            }
        }));

        return {
            success: true,
            items,
            total: items.length
        };
    }

    /**
     * Search YouTube
     */
    async _searchYouTube(query, type) {
        const isMusic = type === MediaType.MUSIC || !type;
        const response = isMusic
            ? await this.youtube.searchVideos(query, 10, { order: 'relevance' })
            : await this.youtube.searchVideos(query, 10, { order: 'relevance' });

        if (!response.success) {
            return { success: false, items: [], total: 0 };
        }

        const items = response.videos.map(video => new UnifiedMediaItem({
            id: video.videoId,
            type: MediaType.VIDEO,
            title: video.title,
            artist: video.channelTitle,
            duration: this._formatDuration(video.duration),
            thumbnail: video.thumbnail,
            url: video.url,
            platform: Platform.YOUTUBE,
            metadata: {
                channelId: video.channelId,
                publishedAt: video.publishedAt
            }
        }));

        return {
            success: true,
            items,
            total: response.totalResults || items.length
        };
    }

    /**
     * Search Kodi
     */
    async _searchKodi(query, type) {
        if (type === MediaType.MUSIC) {
            // Kodi music search not implemented in this example
            return { success: false, items: [], total: 0 };
        }

        const response = await this.kodi.searchVideos(query);

        if (!response.success) {
            return { success: false, items: [], total: 0 };
        }

        const items = response.results.map(item => new UnifiedMediaItem({
            id: item.movieid,
            type: MediaType.MOVIE,
            title: item.title,
            duration: item.runtime ? `${item.runtime} min` : null,
            thumbnail: item.thumbnail,
            platform: Platform.KODI,
            metadata: {
                plot: item.plot,
                year: item.year,
                rating: item.rating
            }
        }));

        return {
            success: true,
            items,
            total: response.total
        };
    }

    /**
     * Select platform based on query type
     */
    _selectPlatform(query) {
        const normalized = query.toLowerCase();

        // Music queries -> Spotify
        if (normalized.includes('music') || normalized.includes('song') || normalized.includes('artist')) {
            return Platform.SPOTIFY;
        }

        // Video queries -> YouTube
        if (normalized.includes('video') || normalized.includes('watch') || normalized.includes('youtube')) {
            return Platform.YOUTUBE;
        }

        // Movie/TV queries -> Kodi
        if (normalized.includes('movie') || normalized.includes('tv') || normalized.includes('show')) {
            return Platform.KODI;
        }

        // Default to first priority
        return this.platformPriority[0];
    }

    /**
     * Play unified media item
     */
    async play(item) {
        try {
            let result = { success: false };

            switch (item.platform) {
                case Platform.SPOTIFY:
                    result = await this.spotify.play({ uri: item.uri });
                    break;
                case Platform.YOUTUBE:
                    // YouTube playback through Kodi
                    result = await this.kodi.playFile(`plugin://plugin.video.youtube/play/?video_id=${item.id}`);
                    break;
                case Platform.KODI:
                    result = await this.kodi.playItem(item.id);
                    break;
            }

            if (result.success) {
                this.activePlatform = item.platform;
            }

            return result;
        } catch (error) {
            console.error(`❌ Play failed on ${item.platform}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pause playback
     */
    async pause() {
        if (!this.activePlatform) {
            return { success: false, error: 'No active platform' };
        }

        switch (this.activePlatform) {
            case Platform.SPOTIFY:
                return await this.spotify.pause();
            case Platform.YOUTUBE:
            case Platform.KODI:
                return await this.kodi.pause();
            default:
                return { success: false, error: 'Unknown platform' };
        }
    }

    /**
     * Skip to next track
     */
    async next() {
        if (!this.activePlatform) {
            return { success: false, error: 'No active platform' };
        }

        switch (this.activePlatform) {
            case Platform.SPOTIFY:
                return await this.spotify.next();
            case Platform.YOUTUBE:
            case Platform.KODI:
                return await this.kodi.skip('next');
            default:
                return { success: false, error: 'Unknown platform' };
        }
    }

    /**
     * Go to previous track
     */
    async previous() {
        if (!this.activePlatform) {
            return { success: false, error: 'No active platform' };
        }

        switch (this.activePlatform) {
            case Platform.SPOTIFY:
                return await this.spotify.previous();
            case Platform.YOUTUBE:
            case Platform.KODI:
                return await this.kodi.skip('previous');
            default:
                return { success: false, error: 'Unknown platform' };
        }
    }

    /**
     * Set volume
     */
    async setVolume(volume) {
        if (!this.activePlatform) {
            return { success: false, error: 'No active platform' };
        }

        switch (this.activePlatform) {
            case Platform.SPOTIFY:
                return await this.spotify.setVolume(volume);
            case Platform.YOUTUBE:
            case Platform.KODI:
                return await this.kodi.setVolume(volume);
            default:
                return { success: false, error: 'Unknown platform' };
        }
    }

    /**
     * Set shuffle
     */
    async setShuffle(enabled) {
        if (!this.activePlatform) {
            return { success: false, error: 'No active platform' };
        }

        switch (this.activePlatform) {
            case Platform.SPOTIFY:
                return await this.spotify.setShuffle(enabled);
            case Platform.YOUTUBE:
            case Platform.KODI:
                // Shuffle not implemented for Kodi in this example
                return { success: false, error: 'Not supported' };
            default:
                return { success: false, error: 'Unknown platform' };
        }
    }

    /**
     * Set repeat mode
     */
    async setRepeat(mode) {
        if (!this.activePlatform) {
            return { success: false, error: 'No active platform' };
        }

        switch (this.activePlatform) {
            case Platform.SPOTIFY:
                return await this.spotify.setRepeat(mode);
            case Platform.YOUTUBE:
            case Platform.KODI:
                // Repeat not implemented for Kodi in this example
                return { success: false, error: 'Not supported' };
            default:
                return { success: false, error: 'Unknown platform' };
        }
    }

    /**
     * Sync playback state across platforms
     */
    async syncPlaybackState() {
        try {
            let state = null;

            switch (this.activePlatform) {
                case Platform.SPOTIFY:
                    const spotifyState = await this.spotify.getPlaybackState();
                    if (spotifyState && !spotifyState.error) {
                        state = {
                            isPlaying: spotifyState.isPlaying,
                            currentItem: spotifyState.item ? new UnifiedMediaItem({
                                id: spotifyState.item.uri,
                                type: MediaType.MUSIC,
                                title: spotifyState.item.name,
                                artist: spotifyState.item.artists,
                                album: spotifyState.item.album,
                                duration: this._formatMs(spotifyState.item.durationMs),
                                uri: spotifyState.item.uri,
                                platform: Platform.SPOTIFY
                            }) : null,
                            platform: Platform.SPOTIFY,
                            progress: spotifyState.progressMs || 0,
                            shuffle: spotifyState.shuffle,
                            repeat: spotifyState.repeat
                        };
                    }
                    break;
                case Platform.KODI:
                case Platform.YOUTUBE:
                    const kodiState = await this.kodi.getCurrentlyPlaying();
                    if (kodiState) {
                        state = {
                            isPlaying: kodiState.player?.speed > 0,
                            currentItem: new UnifiedMediaItem({
                                id: kodiState.id,
                                type: MediaType.VIDEO,
                                title: kodiState.title,
                                platform: this.activePlatform
                            }),
                            platform: this.activePlatform
                        };
                    }
                    break;
            }

            if (state) {
                this.playbackState.update(state);
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Failed to sync playback state:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Format milliseconds to readable duration
     */
    _formatMs(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Format duration from YouTube
     */
    _formatDuration(duration) {
        if (typeof duration === 'string') return duration;
        if (typeof duration === 'number') {
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return null;
    }

    /**
     * Get GraphQL schema
     */
    static getGraphQLSchema() {
        return `
            type UnifiedMediaItem {
                id: ID!
                type: MediaType!
                title: String!
                artist: String
                album: String
                duration: String
                thumbnail: String
                platform: Platform!
                uri: String
                url: String
                metadata: JSON
            }

            type PlaybackState {
                isPlaying: Boolean!
                currentItem: UnifiedMediaItem
                platform: Platform
                progress: Int!
                volume: Int!
                shuffle: Boolean!
                repeat: String!
                device: String
                timestamp: String
            }

            type SearchResult {
                success: Boolean!
                platform: Platform!
                items: [UnifiedMediaItem!]!
                total: Int!
                error: String
            }

            type CommandResult {
                success: Boolean!
                message: String!
                results: [UnifiedMediaItem]
                state: PlaybackState
            }

            enum MediaType {
                ${Object.values(MediaType).join('\n                ')}
            }

            enum Platform {
                ${Object.values(Platform).join('\n                ')}
            }

            type Query {
                search(query: String!, type: MediaType, platform: Platform): SearchResult!
                playbackState: PlaybackState!
                recommendations(platform: Platform!): [UnifiedMediaItem!]!
            }

            type Mutation {
                play(item: UnifiedMediaItem!): CommandResult!
                pause: CommandResult!
                next: CommandResult!
                previous: CommandResult!
                setVolume(volume: Int!): CommandResult!
                setShuffle(enabled: Boolean!): CommandResult!
                setRepeat(mode: String!): CommandResult!
                executeCommand(text: String!): CommandResult!
            }
        `;
    }

    /**
     * Get status of all platforms
     */
    getStatus() {
        return {
            spotify: this.spotify.getStatus(),
            youtube: this.youtube.getStatus(),
            kodi: this.kodi.getStatus(),
            activePlatform: this.activePlatform,
            playbackState: this.playbackState
        };
    }
}

module.exports = {
    MediaUnifier,
    UnifiedMediaItem,
    PlaybackState,
    MediaType,
    Platform
};
