# Media Integrations - Quick Reference Guide

## Quick Setup

```bash
# Install dependencies
npm install axios ws

# Set environment variables
cp .env.example .env
# Edit .env with your API credentials
```

## Platform Setup Guides

### Spotify
1. Create app at https://developer.spotify.com/dashboard
2. Set redirect URI to `http://localhost:3000/callback`
3. Copy Client ID and Client Secret to `.env`

### YouTube
1. Create project at https://console.cloud.google.com
2. Enable YouTube Data API v3
3. Create API key with appropriate restrictions
4. Copy API key to `.env`

### Kodi
1. Enable remote control in Kodi: Settings > Services > Control
2. Configure HTTP port (default: 8080)
3. Enable WebSocket port (default: 9090)
4. Set username and password in Kodi settings

### Real-Debrid
1. Create account at https://real-debrid.com
2. Create application to get client ID/secret
3. Authorize and get access token
4. Add credentials to `.env`

### Trakt.tv
1. Create app at https://trakt.tv/oauth/applications
2. Get client ID
3. Authorize and get access token
4. Add credentials to `.env`

## Common Usage Patterns

### Initialize All Platforms

```javascript
const { MediaUnifier } = require('./media-unifier');

const media = new MediaUnifier({
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI
    },
    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY
    },
    kodi: {
        host: process.env.KODI_HOST,
        port: parseInt(process.env.KODI_PORT),
        username: process.env.KODI_USERNAME,
        password: process.env.KODI_PASSWORD,
        rdAccessToken: process.env.RD_ACCESS_TOKEN,
        traktAccessToken: process.env.TRAKT_ACCESS_TOKEN
    }
});
```

### Voice Command Examples

```javascript
// Music playback
await media.executeCommand('Play Bohemian Rhapsody');
await media.executeCommand('Play jazz music');
await media.executeCommand('Play my Discover Weekly playlist');

// Playback control
await media.executeCommand('Pause');
await media.executeCommand('Resume');
await media.executeCommand('Skip to next track');
await media.executeCommand('Go back');

// Volume and modes
await media.executeCommand('Set volume to 75');
await media.executeCommand('Turn it up'); // Alias for volume
await media.executeCommand('Enable shuffle');
await media.executeCommand('Disable repeat');

// Search
await media.executeCommand('Search for horror movies on Kodi');
await media.executeCommand('Find cooking videos on YouTube');

// Status
await media.executeCommand('What is playing?');
await media.executeCommand('Current track info');
await media.executeCommand('Show playback status');
```

### Direct API Usage

#### Spotify

```javascript
// Authentication
const authUrl = spotify.getAuthUrl();
// User visits URL, gets code
await spotify.authorize(code);

// Playback
await spotify.play({ uri: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh' });
await spotify.play({ contextUri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M' });
await spotify.pause();
await spotify.next();
await spotify.seek(30000); // 30 seconds

// Device management
const devices = await spotify.getDevices();
await spotify.setDevice(devices[0].id);

// Search
const results = await spotify.search('Daft Punk', 'track', 10);
const tracks = results.results.tracks;

// Library
const saved = await spotify.getSavedTracks(50);
const playlists = await spotify.getPlaylists();

// Recommendations
const recommendations = await spotify.getRecommendations({
    seedTracks: ['4iV5W9uYEdYUVa79Axb7Rh'],
    limit: 20
});
```

#### YouTube

```javascript
// Search
const videos = await youtube.searchVideos('music', 10);
const channels = await youtube.searchChannels('TED', 5);
const playlists = await youtube.searchPlaylists('jazz', 10);

// Details
const details = await youtube.getVideoDetails('dQw4w9WgXcQ');
const channel = await youtube.getChannelDetails('UCBR8-60-B28hp2BmDPdntcQ');

// Browse
const trending = await youtube.getTrendingVideos('US', 0, 10);
const related = await youtube.getRelatedVideos('dQw4w9WgXcQ', 5);

// Channel content
const uploads = await youtube.getChannelVideos('UCBR8-60-B28hp2BmDPdntcQ');
const playlistItems = await youtube.getPlaylistItems('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf', 50);

// Utilities
const videoId = YouTubeIntegration.extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ');
const duration = YouTubeIntegration.formatDuration('PT4M13S'); // "4:13"
```

#### Kodi

```javascript
// Connect
await kodi.connectWebSocket();

// Playback
await kodi.playFile('plugin://plugin.video.youtube/play/?video_id=dQw4w9WgXcQ');
await kodi.playItem(123); // Library item ID
await kodi.pause();
await kodi.seek(120); // 2 minutes

// Library search
const movies = await kodi.searchVideos('action');
const shows = await kodi.searchTVShows('comedy');
const episodes = await kodi.getEpisodes(tvShowId, 1);

// Notifications
await kodi.sendNotification('Hello', 'This is a test', 'info');

// Fen addon
await kodi.executeAddon('plugin.video.fen', { action: 'search', query: 'matrix' });
await kodi.searchFen('Inception', 'movie');

// Real-Debrid
const rd = await kodi.resolveRealDebrid('magnet:...');

// Trakt.tv
await kodi.scrobbleTrakt(movieItem, 'start');

// Get current playback
const playing = await kodi.getCurrentlyPlaying();
```

## Response Formats

### UnifiedMediaItem

```javascript
{
    id: "unique_id",
    type: "music", // or "video", "movie", "tv_show"
    title: "Song Title",
    artist: "Artist Name",
    album: "Album Name",
    duration: "3:45",
    thumbnail: "https://...",
    platform: "spotify", // or "youtube", "kodi"
    uri: "spotify:track:...",
    url: "https://...",
    metadata: { ... }
}
```

### PlaybackState

```javascript
{
    isPlaying: true,
    currentItem: UnifiedMediaItem,
    platform: "spotify",
    progress: 45000, // milliseconds
    volume: 75,
    shuffle: true,
    repeat: "context", // "track", "context", "off"
    device: "Living Room Speaker",
    timestamp: "2026-03-26T10:30:00Z"
}
```

### CommandResult

```javascript
{
    success: true,
    message: "Now playing Bohemian Rhapsody by Queen on Spotify.",
    results: [UnifiedMediaItem, ...],
    state: PlaybackState
}
```

### SearchResult

```javascript
{
    success: true,
    platform: "spotify",
    items: [UnifiedMediaItem, ...],
    total: 42,
    error: null
}
```

## Error Handling

```javascript
// All methods return { success: boolean, ... }
const result = await spotify.play({ uri: '...' });

if (result.success) {
    console.log('Success!');
} else {
    console.error('Error:', result.error);
    // Handle error
}

// Or use try-catch
try {
    await spotify.play({ uri: '...' });
} catch (error) {
    console.error('Playback failed:', error.message);
}
```

## Best Practices

### 1. Check Authentication Status

```javascript
const status = spotify.getStatus();
if (!status.authenticated) {
    const authUrl = spotify.getAuthUrl();
    console.log('Please authorize:', authUrl);
}
```

### 2. Handle Rate Limits

```javascript
const quota = youtube.getQuotaStats();
if (quota.remaining < 1000) {
    console.warn('API quota low:', quota.remaining);
}
```

### 3. Use Circuit Breakers

```javascript
// Automatic circuit breakers prevent cascading failures
// Configure timeouts and thresholds in constructors
```

### 4. Monitor WebSocket Connection

```javascript
kodi.onNotification('Player.OnPlay', (params) => {
    console.log('Playback started:', params);
});

// Check connection status
const status = kodi.getStatus();
if (!status.connected) {
    await kodi.connectWebSocket();
}
```

### 5. Sync Playback State

```javascript
// Call periodically to keep state updated
setInterval(async () => {
    await media.syncPlaybackState();
}, 5000); // Every 5 seconds
```

## Troubleshooting

### Spotify Issues

**Problem**: "Not authenticated"
**Solution**: Call `spotify.getAuthUrl()` and complete OAuth flow

**Problem**: "Token expired"
**Solution**: Tokens auto-refresh, ensure `refreshToken` is saved

**Problem**: "No active device"
**Solution**: Call `spotify.getDevices()` and `spotify.setDevice()`

### YouTube Issues

**Problem**: "API quota exceeded"
**Solution**: Monitor quota with `youtube.getQuotaStats()`, wait for reset

**Problem**: "Video not found"
**Solution**: Check video ID format, ensure video is public

### Kodi Issues

**Problem**: "Connection refused"
**Solution**: Enable remote control in Kodi settings

**Problem**: "WebSocket closed"
**Solution**: Reconnect with `await kodi.connectWebSocket()`

**Problem**: "Addon not found"
**Solution**: Ensure Fen addon is installed in Kodi

## Performance Tips

1. **Batch Requests**: Use bulk operations when possible
2. **Cache Results**: Store search results locally
3. **Limit Pagination**: Set reasonable `maxResults` values
4. **Use WebSocket**: Prefer WebSocket for real-time updates
5. **Monitor Quota**: Track API usage to avoid limits

## Security Best Practices

1. **Never Commit Credentials**: Use environment variables
2. **Rotate Tokens**: Regularly update access tokens
3. **Scope Permissions**: Request minimum required scopes
4. **Use HTTPS**: All API calls use encrypted connections
5. **Validate Input**: Sanitize user-provided search queries

## Advanced Usage

### Custom Platform Selection

```javascript
// Override automatic platform selection
const results = await media.search('query', null, 'youtube');
```

### Cross-Platform Sync

```javascript
// Sync state between platforms
await media.syncPlaybackState();
const state = media.playbackState;

// Resume on different platform
if (state.platform !== 'spotify') {
    await spotify.play({ uri: state.currentItem.uri });
}
```

### GraphQL Integration

```javascript
const { GraphQLSchema, graphql } = require('graphql');

const schema = new GraphQLSchema({
    query: MediaUnifier.getGraphQLSchema()
});

const result = await graphql(schema, `
    query {
        search(query: "jazz", type: music) {
            items {
                title
                artist
                platform
            }
        }
    }
`);
```

## Support Resources

- Spotify Web API: https://developer.spotify.com/documentation/web-api
- YouTube Data API: https://developers.google.com/youtube/v3
- Kodi JSON-RPC: https://kodi.wiki/view/JSON-RPC_API
- Real-Debrid API: https://api.real-debrid.com
- Trakt API: https://trakt.tv/oauth/api

## Version History

- **1.0.0** (2026-03-26): Initial release with full platform support
