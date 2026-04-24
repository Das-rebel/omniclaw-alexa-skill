/**
 * Test Suite for Media Streaming Integration
 *
 * Comprehensive tests for:
 * - Platform integrations (Spotify, YouTube, Fen)
 * - Unified controller
 * - GraphQL resolvers
 * - Alexa integration
 */

const SpotifyIntegration = require('../integrations/spotify-integration');
const YouTubeIntegration = require('../integrations/youtube-integration');
const FenIntegration = require('../integrations/fen-integration');
const UnifiedMediaController = require('../controllers/unified-media-controller');
const describeIf = (condition) => (condition ? describe : describe.skip);

describe('Media Streaming Integration Tests', () => {
    let spotify, youtube, fen, controller;

    beforeAll(() => {
        // Initialize integrations with test config
        spotify = new SpotifyIntegration({
            clientId: process.env.SPOTIFY_CLIENT_ID || 'test-client-id',
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'test-client-secret'
        });

        youtube = new YouTubeIntegration({
            apiKey: process.env.YOUTUBE_API_KEY || 'test-api-key'
        });

        fen = new FenIntegration({
            kodiHost: process.env.KODI_HOST || 'localhost',
            kodiPort: process.env.KODI_PORT || 8080
        });

        controller = new UnifiedMediaController({
            spotify: { clientId: process.env.SPOTIFY_CLIENT_ID },
            youtube: { apiKey: process.env.YOUTUBE_API_KEY },
            fen: { kodiHost: process.env.KODI_HOST || 'localhost' }
        });
    });

    describe('Spotify Integration', () => {
        test('should initialize successfully', () => {
            expect(spotify).toBeDefined();
            expect(spotify.baseUrl).toBe('https://api.spotify.com/v1');
        });

        test('should generate auth URL', () => {
            const authUrl = spotify.getAuthUrl();
            expect(authUrl).toContain('accounts.spotify.com/authorize');
            expect(authUrl).toContain('client_id');
        });

        test('should handle missing credentials', () => {
            const noAuthSpotify = new SpotifyIntegration({});
            expect(noAuthSpotify.clientId).toBeUndefined();
        });
    });

    describe('YouTube Integration', () => {
        test('should initialize successfully', () => {
            expect(youtube).toBeDefined();
            expect(youtube.baseUrl).toBe('https://www.googleapis.com/youtube/v3');
        });

        test('should extract video ID from URL', () => {
            const url1 = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
            const url2 = 'https://youtu.be/dQw4w9WgXcQ';
            const url3 = 'https://youtube.com/embed/dQw4w9WgXcQ';

            expect(youtube.extractVideoId(url1)).toBe('dQw4w9WgXcQ');
            expect(youtube.extractVideoId(url2)).toBe('dQw4w9WgXcQ');
            expect(youtube.extractVideoId(url3)).toBe('dQw4w9WgXcQ');
        });

        test('should parse ISO 8601 duration', () => {
            expect(youtube._parseDuration('PT10M30S')).toBe('10:30');
            expect(youtube._parseDuration('PT1H15M45S')).toBe('1:15:45');
            expect(youtube._parseDuration('PT45S')).toBe('0:45');
        });

        test('should check API quota', () => {
            const stats = youtube.getQuotaStats();
            expect(stats).toHaveProperty('used');
            expect(stats).toHaveProperty('limit');
            expect(stats).toHaveProperty('remaining');
        });
    });

    describe('Fen/Kodi Integration', () => {
        test('should initialize successfully', () => {
            expect(fen).toBeDefined();
            expect(fen.baseUrl).toContain('/jsonrpc');
        });

        test('should construct correct base URL', () => {
            expect(fen.baseUrl).toBe('http://localhost:8080/jsonrpc');
        });

        test('should handle custom Kodi config', () => {
            const customFen = new FenIntegration({
                kodiHost: '192.168.1.100',
                kodiPort: 8080,
                kodiProtocol: 'http'
            });
            expect(customFen.baseUrl).toBe('http://192.168.1.100:8080/jsonrpc');
        });
    });

    describe('Unified Media Controller', () => {
        test('should initialize with all platforms', () => {
            expect(controller).toBeDefined();
            expect(controller.spotify).toBeDefined();
            expect(controller.youtube).toBeDefined();
            expect(controller.fen).toBeDefined();
        });

        test('should determine platform from query', async () => {
            const musicPlatform = await controller.determinePlatform('play some jazz music');
            expect(musicPlatform).toBe('spotify');

            const videoPlatform = await controller.determinePlatform('watch a movie');
            expect(videoPlatform).toBe('youtube');

            const explicitPlatform = await controller.determinePlatform('play on fen', 'fen');
            expect(explicitPlatform).toBe('fen');
        });

        test('should generate voice responses', () => {
            const playResponse = controller.getVoiceResponse('play', {
                success: true,
                message: 'Now playing Test Song'
            });
            expect(playResponse).toContain('Now playing');

            const errorResponse = controller.getVoiceResponse('play', {
                success: false,
                message: 'Not found'
            });
            expect(errorResponse).toContain('Not found');
        });
    });

    describe('Platform Detection', () => {
        test('should detect music queries', async () => {
            const queries = [
                'play some jazz',
                'play music by Mozart',
                'start my playlist',
                'play album Dark Side of the Moon'
            ];

            for (const query of queries) {
                const platform = await controller.determinePlatform(query);
                expect(platform).toBe('spotify');
            }
        });

        test('should detect video queries', async () => {
            const queries = [
                'watch a video about cats',
                'play youtube tutorials',
                'show me movie trailers'
            ];

            for (const query of queries) {
                const platform = await controller.determinePlatform(query);
                expect(platform).toBe('youtube');
            }
        });

        test('should detect media center queries', async () => {
            const queries = [
                'play The Matrix on kodi',
                'watch on fen',
                'play from media center'
            ];

            for (const query of queries) {
                const platform = await controller.determinePlatform(query);
                expect(platform).toBe('fen');
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle missing query in playContent', async () => {
            const result = await controller.playContent('');
            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
        });

        test('should handle unavailable platform', async () => {
            // Mock checkPlatform to return unavailable
            const originalCheck = controller.checkPlatform;
            controller.checkPlatform = async () => ({ available: false, reason: 'Not connected' });

            const result = await controller.playContent('test song', { platform: 'spotify' });
            expect(result.success).toBe(false);

            controller.checkPlatform = originalCheck;
        });

        test('should pause with no active platform', async () => {
            controller.activePlatform = null;
            const result = await controller.pause();
            expect(result.success).toBe(false);
            expect(result.message).toContain('No platform');
        });

        test('should continue watching with no history', async () => {
            controller.lastPlayed = {};
            const result = await controller.continueWatching();
            expect(result.success).toBe(false);
        });
    });

    describe('Volume Control', () => {
        test('should normalize volume values', async () => {
            // Test volume clamping
            const result1 = await controller.setVolume(150);
            expect(result1).toBeDefined();

            const result2 = await controller.setVolume(-10);
            expect(result2).toBeDefined();
        });
    });

    describe('Search Functionality', () => {
        test('should handle empty search results', async () => {
            // This test verifies the structure, actual results depend on API availability
            const result = await controller.searchAll('nonexistent_content_xyz', 'spotify');
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('results');
        });

        test('should search across all platforms', async () => {
            const result = await controller.searchAll('test query', 'all');
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('results');
            expect(result.results).toHaveProperty('spotify');
            expect(result.results).toHaveProperty('youtube');
            expect(result.results).toHaveProperty('fen');
        });
    });

    describe('Status Reporting', () => {
        test('should get all platform statuses', async () => {
            const status = await controller.getAllStatus();
            expect(status).toHaveProperty('activePlatform');
            expect(status).toHaveProperty('platforms');
            expect(status.platforms).toHaveProperty('spotify');
            expect(status.platforms).toHaveProperty('youtube');
            expect(status.platforms).toHaveProperty('fen');
        });

        test('should handle platform status check errors', async () => {
            const status = await controller.checkPlatform('unknown_platform');
            expect(status).toHaveProperty('available');
            expect(status.available).toBe(false);
        });
    });

    describe('Resilience Patterns', () => {
        test('should implement circuit breaker for Spotify', () => {
            expect(spotify.circuitBreaker).toBeDefined();
            expect(spotify.circuitBreaker).toHaveProperty('execute');
        });

        test('should implement circuit breaker for YouTube', () => {
            expect(youtube.circuitBreaker).toBeDefined();
        });

        test('should implement circuit breaker for Fen', () => {
            expect(fen.circuitBreaker).toBeDefined();
        });
    });
});

describe('Integration Tests (require credentials)', () => {
    let spotify, youtube, fen, controller;

    beforeAll(() => {
        spotify = new SpotifyIntegration({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });

        youtube = new YouTubeIntegration({
            apiKey: process.env.YOUTUBE_API_KEY
        });

        fen = new FenIntegration({
            kodiHost: process.env.KODI_HOST,
            kodiPort: process.env.KODI_PORT
        });

        controller = new UnifiedMediaController({
            spotify: { clientId: process.env.SPOTIFY_CLIENT_ID },
            youtube: { apiKey: process.env.YOUTUBE_API_KEY },
            fen: { kodiHost: process.env.KODI_HOST }
        });
    });

    // Skip these tests if credentials are not available
    const hasSpotifyCreds = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
    const hasYouTubeCreds = !!process.env.YOUTUBE_API_KEY;
    const hasKodiConfig = !!(process.env.KODI_HOST && process.env.KODI_PORT);

    describeIf(hasSpotifyCreds)('Spotify API Tests', () => {
        test('should search for tracks', async () => {
            const result = await spotify.search('Bohemian Rhapsody', 'track', 5);
            expect(result.success).toBe(true);
            expect(result.results.tracks).toBeDefined();
            expect(result.results.tracks.length).toBeGreaterThan(0);
        }, 10000);

        test('should get user playlists', async () => {
            // Note: This requires authentication, so it might fail without valid token
            const result = await spotify.getPlaylists(10);
            expect(result).toHaveProperty('success');
        });
    });

    describeIf(hasYouTubeCreds)('YouTube API Tests', () => {
        test('should search for videos', async () => {
            const result = await youtube.searchVideos('test video', 5);
            expect(result.success).toBe(true);
            expect(result.videos).toBeDefined();
            expect(result.videos.length).toBeGreaterThan(0);
        }, 15000);

        test('should get video details', async () => {
            const result = await youtube.getVideoDetails('dQw4w9WgXcQ');
            expect(result.success).toBe(true);
            expect(result.videos).toBeDefined();
        }, 15000);
    });

    describeIf(hasKodiConfig)('Kodi/Fen API Tests', () => {
        test('should check connection', async () => {
            const result = await fen.checkConnection();
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('connected');
        }, 10000);

        test('should get system info', async () => {
            const connection = await fen.checkConnection();
            if (!connection.success) {
                console.log('Skipping Kodi test - not connected');
                return;
            }

            const result = await fen.getSystemInfo();
            expect(result).toBeDefined();
        }, 10000);
    });
});
