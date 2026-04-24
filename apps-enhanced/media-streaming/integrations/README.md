# Media Platform Integrations

Comprehensive real media platform integrations for Spotify, YouTube, and Fen/Kodi with unified interface.

## Overview

This module provides production-ready integrations with three major media platforms:

- **Spotify**: Music streaming with OAuth2 authentication
- **YouTube**: Video content via YouTube Data API v3
- **Fen/Kodi**: Media center with JSON-RPC and addon support

## Architecture

```
integrations/
├── spotify-integration.js    # Spotify Web API client
├── youtube-integration.js    # YouTube Data API v3 client
├── fen-kodi-bridge.js        # Kodi JSON-RPC + Fen addon
├── media-unifier.js          # Unified cross-platform interface
└── README.md                 # This file
```

## Features

### Spotify Integration

**Authentication:**
- OAuth2 authorization code flow
- Automatic token refresh rotation
- Secure credential management

**Playback Control:**
- Play, pause, skip, seek
- Volume control
- Shuffle and repeat modes
- Device management and transfer

**Library Access:**
- Saved tracks and albums
- User playlists
- Personalized recommendations (Discover Weekly, Release Radar)
- Recently played tracks

**Search:**
- Tracks, artists, albums, playlists
- Advanced filters and sorting
- Popularity-based ranking

**Usage:**
```javascript
const SpotifyIntegration = require('./spotify-integration');

const spotify = new SpotifyIntegration({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/callback'
});

// Get authorization URL
const authUrl = spotify.getAuthUrl();

// Exchange code for token
await spotify.authorize(code);

// Play track
await spotify.play({ uri: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh' });

// Get saved tracks
const saved = await spotify.getSavedTracks(20);
```

### YouTube Integration

**API Features:**
- YouTube Data API v3 integration
- API quota tracking and management
- OAuth2 support for personalized content

**Search Capabilities:**
- Videos, channels, playlists
- Advanced filtering (duration, order, region)
- YouTube Music-optimized search

**Content Access:**
- Video details with statistics
- Channel information
- Playlist items and pagination
- Trending videos
- Related videos

**Library Management (OAuth2):**
- Liked videos
- Subscriptions
- Personal playlists
- Create and manage playlists

**Usage:**
```javascript
const YouTubeIntegration = require('./youtube-integration');

const youtube = new YouTubeIntegration({
    apiKey: process.env.YOUTUBE_API_KEY
});

// Search videos
const results = await youtube.searchVideos('music', 10);

// Get video details
const details = await youtube.getVideoDetails('videoId');

// Get trending videos
const trending = await youtube.getTrendingVideos('US', 0, 10);
```

### Fen/Kodi Bridge

**Kodi JSON-RPC:**
- HTTP and WebSocket transport
- Full playback control
- Library management
- Real-time notifications

**Fen Addon Integration:**
- Content search via Fen
- Provider selection
- Quality settings

**Debrid Services:**
- Real-Debrid link resolution
- Premiumize support (extensible)
- Torrent and hoster support

**Trakt.tv Integration:**
- Scrobble playback
- Sync watchlist
- Metadata enrichment

**Usage:**
```javascript
const KodiBridge = require('./fen-kodi-bridge');

const kodi = new KodiBridge({
    host: 'localhost',
    port: 8080,
    username: 'kodi',
    password: 'kodi',
    rdAccessToken: process.env.RD_ACCESS_TOKEN,
    traktAccessToken: process.env.TRAKT_ACCESS_TOKEN
});

// Connect WebSocket
await kodi.connectWebSocket();

// Play file
await kodi.playFile('plugin://plugin.video.fen/play/...');

// Search library
const results = await kodi.searchVideos('action');

// Get current playback
const playing = await kodi.getCurrentlyPlaying();
```

## Media Unifier

The `MediaUnifier` class provides a unified interface across all platforms:

**Features:**
- Cross-platform search
- Smart platform selection
- Unified media items
- Voice command parsing
- GraphQL schema
- Playback state synchronization

**Voice Commands:**
```
"Play music by Daft Punk"
"Pause playback"
"Skip to next track"
"Set volume to 50"
"Search for comedy movies on Kodi"
"What's currently playing?"
"Enable shuffle"
"Repeat all tracks"
```

**Usage:**
```javascript
const { MediaUnifier } = require('./media-unifier');

const unifier = new MediaUnifier({
    spotify: { clientId, clientSecret, redirectUri },
    youtube: { apiKey },
    kodi: { host, port, username, password }
});

// Execute voice command
const result = await unifier.executeCommand('Play jazz music');

// Search across platforms
const results = await unifier.search('Daft Punk', 'music');

// Sync playback state
await unifier.syncPlaybackState();

// Get status
const status = unifier.getStatus();
```

## Configuration

### Environment Variables

```bash
# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# YouTube
YOUTUBE_API_KEY=your_api_key

# Kodi
KODI_HOST=localhost
KODI_PORT=8080
KODI_USERNAME=kodi
KODI_PASSWORD=kodi

# Real-Debrid
RD_CLIENT_ID=your_client_id
RD_CLIENT_SECRET=your_client_secret
RD_ACCESS_TOKEN=your_access_token

# Trakt.tv
TRAKT_CLIENT_ID=your_client_id
TRAKT_ACCESS_TOKEN=your_access_token
```

## API Reference

### SpotifyIntegration

#### Methods

- `getAuthUrl(state)` - Generate OAuth authorization URL
- `authorize(code)` - Exchange authorization code for token
- `refreshAccessToken()` - Refresh access token
- `getDevices()` - Get available devices
- `play(options)` - Start playback
- `pause()` - Pause playback
- `next()` - Skip to next track
- `previous()` - Go to previous track
- `seek(positionMs)` - Seek to position
- `setVolume(percent)` - Set volume (0-100)
- `setShuffle(enabled)` - Toggle shuffle
- `setRepeat(mode)` - Set repeat mode ('track', 'context', 'off')
- `search(query, type, limit)` - Search content
- `getSavedTracks(limit, offset)` - Get saved tracks
- `getPlaylists(limit, offset)` - Get user playlists
- `getRecommendations(options)` - Get recommendations

### YouTubeIntegration

#### Methods

- `searchVideos(query, maxResults, options)` - Search videos
- `searchChannels(query, maxResults)` - Search channels
- `searchPlaylists(query, maxResults)` - Search playlists
- `getVideoDetails(videoIds)` - Get video details
- `getChannelDetails(channelId)` - Get channel details
- `getPlaylistItems(playlistId, maxResults)` - Get playlist items
- `getChannelVideos(channelId, maxResults, order)` - Get channel videos
- `getTrending(regionCode, categoryId, maxResults)` - Get trending videos
- `getRelatedVideos(videoId, maxResults)` - Get related videos
- `getQuotaStats()` - Get API quota usage

#### Static Methods

- `extractVideoId(url)` - Extract video ID from URL
- `extractPlaylistId(url)` - Extract playlist ID from URL
- `extractChannelId(url)` - Extract channel ID from URL
- `formatDuration(isoDuration)` - Format ISO 8601 duration

### KodiBridge

#### Methods

- `connectWebSocket()` - Connect via WebSocket
- `onNotification(method, callback)` - Register notification handler
- `getActivePlayers()` - Get active players
- `getCurrentlyPlaying()` - Get currently playing item
- `playItem(itemId)` - Play library item
- `playFile(file)` - Play file/plugin
- `pause(playerId)` - Pause playback
- `stop(playerId)` - Stop playback
- `seek(position, playerId)` - Seek to position
- `skip(direction, playerId)` - Skip next/previous
- `setVolume(volume)` - Set volume
- `setMute(mute)` - Mute/unmute
- `searchVideos(query)` - Search video library
- `searchTVShows(query)` - Search TV shows
- `getEpisodes(tvShowId, season)` - Get episodes
- `scanVideoLibrary()` - Scan library
- `cleanVideoLibrary()` - Clean library
- `sendNotification(title, message, image)` - Show notification
- `executeAddon(addonId, params)` - Execute addon
- `searchFen(query, type)` - Search with Fen addon
- `resolveRealDebrid(link)` - Resolve via Real-Debrid
- `scrobbleTrakt(item, action)` - Scrobble to Trakt

### MediaUnifier

#### Methods

- `executeCommand(text)` - Execute voice command
- `search(query, type, platform)` - Search platforms
- `play(item)` - Play unified item
- `pause()` - Pause playback
- `next()` - Skip to next
- `previous()` - Go to previous
- `setVolume(volume)` - Set volume
- `setShuffle(enabled)` - Toggle shuffle
- `setRepeat(mode)` - Set repeat mode
- `syncPlaybackState()` - Sync playback state
- `getStatus()` - Get platform statuses

## GraphQL Schema

The Media Unifier exposes a GraphQL schema for type-safe queries:

```graphql
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
```

## Error Handling

All integrations implement:
- Circuit breaker pattern for fault tolerance
- Automatic retry with exponential backoff
- Timeout protection
- Comprehensive error logging
- Graceful degradation

## Performance

- **Circuit Breakers**: Prevent cascade failures
- **Request Queuing**: Rate limit protection
- **Connection Pooling**: Efficient resource usage
- **WebSocket**: Real-time updates for Kodi
- **Quota Tracking**: API usage monitoring

## Security

- **OAuth2**: Secure token-based authentication
- **Credential Management**: Environment-based configuration
- **Token Rotation**: Automatic refresh token handling
- **Encryption**: HTTPS/WSS for all communications
- **Access Control**: Scoped permissions per platform

## Testing

```javascript
// Test Spotify integration
const spotify = new SpotifyIntegration(config);
await spotify.authorize(code);
const devices = await spotify.getDevices();
console.log('Spotify devices:', devices);

// Test YouTube integration
const youtube = new YouTubeIntegration(config);
const results = await youtube.searchVideos('test', 5);
console.log('YouTube results:', results);

// Test Kodi integration
const kodi = new KodiBridge(config);
await kodi.connectWebSocket();
const info = await kodi.getSystemInfo();
console.log('Kodi info:', info);

// Test Media Unifier
const unifier = new MediaUnifier(config);
const result = await unifier.executeCommand('Play jazz music');
console.log('Command result:', result);
```

## Dependencies

- `axios`: HTTP client
- `ws`: WebSocket client
- Resilience patterns (circuit-breaker, retry, timeout)

## License

MIT

## Contributing

1. Follow existing code style
2. Add JSDoc documentation
3. Implement error handling
4. Add tests for new features
5. Update README

## Support

For issues or questions:
- Check platform documentation (Spotify, YouTube, Kodi)
- Review API rate limits and quotas
- Enable debug logging
- Check network connectivity
