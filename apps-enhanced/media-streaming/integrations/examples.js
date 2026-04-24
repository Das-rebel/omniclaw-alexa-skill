/**
 * Media Integrations - Usage Examples
 *
 * This file demonstrates common usage patterns for all integrations
 */

const { MediaUnifier } = require('./media-unifier');
const SpotifyIntegration = require('./spotify-integration');
const YouTubeIntegration = require('./youtube-integration');
const KodiBridge = require('./fen-kodi-bridge');
const config = require('./config.example.js');

// ============================================================================
// SPOTIFY EXAMPLES
// ============================================================================

async function spotifyExamples() {
    console.log('\n=== Spotify Examples ===\n');

    const spotify = new SpotifyIntegration(config.spotify);

    try {
        // 1. Authorization
        console.log('1. Getting authorization URL...');
        const authUrl = spotify.getAuthUrl();
        console.log('   Visit:', authUrl);
        console.log('   Then call: spotify.authorize(code)\n');

        // 2. Get available devices
        console.log('2. Getting available devices...');
        const devices = await spotify.getDevices();
        console.log('   Found', devices.length, 'devices');
        if (devices.length > 0) {
            console.log('   First device:', devices[0].name);
        }
        console.log();

        // 3. Search for tracks
        console.log('3. Searching for tracks...');
        const searchResults = await spotify.search('Daft Punk', 'track', 5);
        if (searchResults.success) {
            console.log('   Found', searchResults.results.tracks.length, 'tracks');
            searchResults.results.tracks.forEach((track, i) => {
                console.log(`   ${i + 1}. ${track.name} by ${track.artists}`);
            });
        }
        console.log();

        // 4. Get saved tracks
        console.log('4. Getting saved tracks...');
        const saved = await spotify.getSavedTracks(10);
        if (saved.success) {
            console.log('   Total saved tracks:', saved.total);
            saved.tracks.slice(0, 5).forEach((track, i) => {
                console.log(`   ${i + 1}. ${track.name}`);
            });
        }
        console.log();

        // 5. Get user playlists
        console.log('5. Getting playlists...');
        const playlists = await spotify.getPlaylists(10);
        if (playlists.success) {
            console.log('   Total playlists:', playlists.total);
            playlists.playlists.slice(0, 5).forEach((playlist, i) => {
                console.log(`   ${i + 1}. ${playlist.name} (${playlist.tracksTotal} tracks)`);
            });
        }
        console.log();

        // 6. Get recommendations
        console.log('6. Getting recommendations...');
        const recommendations = await spotify.getRecommendations({
            seedGenres: ['electronic', 'pop'],
            limit: 5
        });
        if (recommendations.success) {
            console.log('   Recommended', recommendations.tracks.length, 'tracks');
            recommendations.tracks.forEach((track, i) => {
                console.log(`   ${i + 1}. ${track.name} by ${track.artists}`);
            });
        }
        console.log();

        // 7. Playback control examples
        console.log('7. Playback control examples...');
        console.log('   Play specific track:');
        console.log('   await spotify.play({ uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" });');
        console.log();
        console.log('   Play playlist:');
        console.log('   await spotify.play({ contextUri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M" });');
        console.log();
        console.log('   Pause playback:');
        console.log('   await spotify.pause();');
        console.log();
        console.log('   Skip to next track:');
        console.log('   await spotify.next();');
        console.log();
        console.log('   Set volume to 50%:');
        console.log('   await spotify.setVolume(50);');
        console.log();

        // 8. Get current playback state
        console.log('8. Getting playback state...');
        const playbackState = await spotify.getPlaybackState();
        if (playbackState.isPlaying) {
            console.log('   Currently playing:', playbackState.item.name);
            console.log('   Artist:', playbackState.item.artists);
            console.log('   Progress:', playbackState.progressMs, 'ms');
        } else {
            console.log('   No active playback');
        }
        console.log();

    } catch (error) {
        console.error('   Error:', error.message);
    }
}

// ============================================================================
// YOUTUBE EXAMPLES
// ============================================================================

async function youtubeExamples() {
    console.log('\n=== YouTube Examples ===\n');

    const youtube = new YouTubeIntegration(config.youtube);

    try {
        // 1. Search videos
        console.log('1. Searching for videos...');
        const videos = await youtube.searchVideos('music', 5);
        if (videos.success) {
            console.log('   Found', videos.videos.length, 'videos');
            videos.videos.forEach((video, i) => {
                console.log(`   ${i + 1}. ${video.title}`);
                console.log('      URL:', video.url);
            });
        }
        console.log();

        // 2. Search channels
        console.log('2. Searching for channels...');
        const channels = await youtube.searchChannels('TED', 3);
        if (channels.success) {
            console.log('   Found', channels.channels.length, 'channels');
            channels.channels.forEach((channel, i) => {
                console.log(`   ${i + 1}. ${channel.title}`);
            });
        }
        console.log();

        // 3. Search playlists
        console.log('3. Searching for playlists...');
        const playlists = await youtube.searchPlaylists('jazz', 3);
        if (playlists.success) {
            console.log('   Found', playlists.playlists.length, 'playlists');
            playlists.playlists.forEach((playlist, i) => {
                console.log(`   ${i + 1}. ${playlist.title} (${playlist.itemCount} items)`);
            });
        }
        console.log();

        // 4. Get video details
        if (videos.success && videos.videos.length > 0) {
            console.log('4. Getting video details...');
            const videoId = videos.videos[0].videoId;
            const details = await youtube.getVideoDetails(videoId);
            if (details.success && details.videos.length > 0) {
                const video = details.videos[0];
                console.log('   Title:', video.title);
                console.log('   Duration:', video.duration);
                console.log('   Views:', video.viewCount.toLocaleString());
                console.log('   Likes:', video.likeCount ? video.likeCount.toLocaleString() : 'N/A');
            }
            console.log();
        }

        // 5. Get trending videos
        console.log('5. Getting trending videos...');
        const trending = await youtube.getTrendingVideos('US', 0, 5);
        if (trending.success) {
            console.log('   Trending in US:');
            trending.videos.forEach((video, i) => {
                console.log(`   ${i + 1}. ${video.title}`);
                console.log('      Views:', video.viewCount.toLocaleString());
            });
        }
        console.log();

        // 6. Get related videos
        if (videos.success && videos.videos.length > 0) {
            console.log('6. Getting related videos...');
            const videoId = videos.videos[0].videoId;
            const related = await youtube.getRelatedVideos(videoId, 3);
            if (related.success) {
                console.log('   Related to:', videos.videos[0].title);
                related.videos.forEach((video, i) => {
                    console.log(`   ${i + 1}. ${video.title}`);
                });
            }
            console.log();
        }

        // 7. Get channel details
        if (channels.success && channels.channels.length > 0) {
            console.log('7. Getting channel details...');
            const channelId = channels.channels[0].channelId;
            const channelDetails = await youtube.getChannelDetails(channelId);
            if (channelDetails.success) {
                const channel = channelDetails.channel;
                console.log('   Channel:', channel.title);
                console.log('   Subscribers:', channel.subscriberCount.toLocaleString());
                console.log('   Videos:', channel.videoCount.toLocaleString());
            }
            console.log();
        }

        // 8. URL extraction utilities
        console.log('8. URL extraction utilities...');
        const testUrl = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
        console.log('   URL:', testUrl);
        console.log('   Video ID:', YouTubeIntegration.extractVideoId(testUrl));
        console.log();

        // 9. Quota statistics
        console.log('9. API quota statistics...');
        const quota = youtube.getQuotaStats();
        console.log('   Used:', quota.used);
        console.log('   Remaining:', quota.remaining);
        console.log('   Limit:', quota.limit);
        console.log();

    } catch (error) {
        console.error('   Error:', error.message);
    }
}

// ============================================================================
// KODI EXAMPLES
// ============================================================================

async function kodiExamples() {
    console.log('\n=== Kodi Examples ===\n');

    const kodi = new KodiBridge(config.kodi);

    try {
        // 1. Connect to Kodi
        console.log('1. Connecting to Kodi...');
        await kodi.connectWebSocket();
        console.log('   Connected successfully');
        console.log();

        // 2. Get system info
        console.log('2. Getting system info...');
        const info = await kodi.getSystemInfo();
        if (info.success) {
            console.log('   Host:', info.host);
            console.log('   Port:', info.port);
            console.log('   Version:', info.version);
            console.log('   Volume:', info.volume);
            console.log('   Muted:', info.muted);
        }
        console.log();

        // 3. Get currently playing
        console.log('3. Getting currently playing...');
        const playing = await kodi.getCurrentlyPlaying();
        if (playing) {
            console.log('   Title:', playing.title);
            console.log('   Type:', playing.type);
            if (playing.showtitle) {
                console.log('   Show:', playing.showtitle);
                console.log('   Season:', playing.season);
                console.log('   Episode:', playing.episode);
            }
        } else {
            console.log('   Nothing playing');
        }
        console.log();

        // 4. Search video library
        console.log('4. Searching video library...');
        const movies = await kodi.searchVideos('action');
        if (movies.success) {
            console.log('   Found', movies.total, 'action movies');
            movies.results.slice(0, 5).forEach((movie, i) => {
                console.log(`   ${i + 1}. ${movie.title} (${movie.year})`);
            });
        }
        console.log();

        // 5. Search TV shows
        console.log('5. Searching TV shows...');
        const shows = await kodi.searchTVShows('comedy');
        if (shows.success) {
            console.log('   Found', shows.total, 'comedy shows');
            shows.results.slice(0, 5).forEach((show, i) => {
                console.log(`   ${i + 1}. ${show.title}`);
            });
        }
        console.log();

        // 6. Playback control examples
        console.log('6. Playback control examples...');
        console.log('   Play file:');
        console.log('   await kodi.playFile("plugin://plugin.video.youtube/play/?video_id=dQw4w9WgXcQ");');
        console.log();
        console.log('   Play library item:');
        console.log('   await kodi.playItem(123);');
        console.log();
        console.log('   Pause playback:');
        console.log('   await kodi.pause();');
        console.log();
        console.log('   Skip to next:');
        console.log('   await kodi.skip("next");');
        console.log();
        console.log('   Seek to 2 minutes:');
        console.log('   await kodi.seek(120);');
        console.log();

        // 7. Send notification
        console.log('7. Sending notification to Kodi...');
        await kodi.sendNotification('Hello', 'This is a test from OmniClaw', 'info');
        console.log('   Notification sent');
        console.log();

        // 8. Fen addon examples
        console.log('8. Fen addon examples...');
        console.log('   Search with Fen:');
        console.log('   await kodi.searchFen("Inception", "movie");');
        console.log();
        console.log('   Execute addon:');
        console.log('   await kodi.executeAddon("plugin.video.fen", { action: "search" });');
        console.log();

        // 9. Real-Debrid examples
        if (config.kodi.rdAccessToken) {
            console.log('9. Real-Debrid examples...');
            console.log('   Resolve torrent:');
            console.log('   await kodi.resolveRealDebrid("magnet:...");');
            console.log();
        }

        // 10. Trakt.tv examples
        if (config.kodi.traktAccessToken) {
            console.log('10. Trakt.tv examples...');
            console.log('   Scrobble playback:');
            console.log('   await kodi.scrobbleTrakt(movieItem, "start");');
            console.log();
        }

        // 11. Get status
        console.log('11. Getting Kodi status...');
        const status = kodi.getStatus();
        console.log('   Platform:', status.platform);
        console.log('   Host:', status.host);
        console.log('   Connected:', status.connected);
        console.log('   Has Real-Debrid:', status.hasRealDebrid);
        console.log('   Has Trakt:', status.hasTrakt);
        console.log();

        // Disconnect
        kodi.disconnect();
        console.log('   Disconnected from Kodi');

    } catch (error) {
        console.error('   Error:', error.message);
    }
}

// ============================================================================
// MEDIA UNIFIER EXAMPLES
// ============================================================================

async function mediaUnifierExamples() {
    console.log('\n=== Media Unifier Examples ===\n');

    const media = new MediaUnifier(config);

    try {
        // 1. Voice command examples
        console.log('1. Voice command examples...');
        console.log();

        const commands = [
            'Play jazz music',
            'Pause',
            'Skip to next track',
            'Set volume to 75',
            'Search for comedy movies on Kodi',
            'What is playing?',
            'Enable shuffle',
            'Disable repeat'
        ];

        for (const command of commands) {
            console.log(`   Command: "${command}"`);
            const result = await media.executeCommand(command);
            console.log(`   Response: ${result.message}`);
            console.log();
        }

        // 2. Search across platforms
        console.log('2. Searching across platforms...');
        const searchResults = await media.search('Daft Punk', 'music');
        if (searchResults.success) {
            console.log('   Platform:', searchResults.platform);
            console.log('   Results:', searchResults.total);
            searchResults.items.slice(0, 3).forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.toVoiceResponse()}`);
            });
        }
        console.log();

        // 3. Get playback state
        console.log('3. Getting playback state...');
        await media.syncPlaybackState();
        const state = media.playbackState;
        console.log('   Is Playing:', state.isPlaying);
        if (state.currentItem) {
            console.log('   Current:', state.currentItem.toVoiceResponse());
        }
        console.log('   Platform:', state.platform);
        console.log();

        // 4. Get status of all platforms
        console.log('4. Getting status of all platforms...');
        const status = media.getStatus();
        console.log('   Spotify:', status.spotify.authenticated ? 'Authenticated' : 'Not authenticated');
        console.log('   YouTube:', 'Ready');
        console.log('   Kodi:', status.kodi.connected ? 'Connected' : 'Disconnected');
        console.log('   Active Platform:', status.activePlatform || 'None');
        console.log();

    } catch (error) {
        console.error('   Error:', error.message);
    }
}

// ============================================================================
// ADVANCED EXAMPLES
// ============================================================================

async function advancedExamples() {
    console.log('\n=== Advanced Examples ===\n');

    const media = new MediaUnifier(config);

    try {
        // 1. Cross-platform search
        console.log('1. Cross-platform search...');
        const platforms = ['spotify', 'youtube', 'kodi'];
        const query = 'Bohemian Rhapsody';

        for (const platform of platforms) {
            console.log(`   Searching on ${platform}...`);
            const results = await media.search(query, 'music', platform);
            if (results.success) {
                console.log(`   Found ${results.total} results`);
                if (results.items.length > 0) {
                    console.log(`   Top result: ${results.items[0].title}`);
                }
            }
            console.log();
        }

        // 2. Playback control with specific platform
        console.log('2. Platform-specific playback...');
        const searchResults = await media.search('jazz', 'music', 'spotify');
        if (searchResults.success && searchResults.items.length > 0) {
            const item = searchResults.items[0];
            console.log(`   Playing: ${item.toVoiceResponse()}`);
            const playResult = await media.play(item);
            console.log(`   Success: ${playResult.success}`);
        }
        console.log();

        // 3. Synchronized playback state
        console.log('3. Synchronized playback state...');
        console.log('   Syncing every 5 seconds...');
        const syncInterval = setInterval(async () => {
            await media.syncPlaybackState();
            const state = media.playbackState;
            if (state.isPlaying) {
                console.log(`   Now playing: ${state.currentItem?.toVoiceResponse()}`);
            }
        }, 5000);

        // Run for 15 seconds then stop
        setTimeout(() => {
            clearInterval(syncInterval);
            console.log('   Stopped syncing');
        }, 15000);

        // 4. Custom platform selection
        console.log('4. Custom platform selection...');
        console.log('   Automatic selection based on query type:');
        console.log('   - Music queries -> Spotify');
        console.log('   - Video queries -> YouTube');
        console.log('   - Movie queries -> Kodi');
        console.log();

    } catch (error) {
        console.error('   Error:', error.message);
    }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function runExamples() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Media Integrations - Usage Examples                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
        // Uncomment the examples you want to run:

        // await spotifyExamples();
        // await youtubeExamples();
        // await kodiExamples();
        // await mediaUnifierExamples();
        // await advancedExamples();

        console.log('\n✅ Examples completed!');
        console.log('\nNote: Uncomment the examples you want to run in runExamples()');
        console.log('Make sure to set up your credentials in config.js first.\n');

    } catch (error) {
        console.error('\n❌ Error running examples:', error.message);
        console.error('   Make sure all services are running and credentials are correct\n');
    }
}

// Run if called directly
if (require.main === module) {
    runExamples().catch(console.error);
}

module.exports = {
    spotifyExamples,
    youtubeExamples,
    kodiExamples,
    mediaUnifierExamples,
    advancedExamples,
    runExamples
};
