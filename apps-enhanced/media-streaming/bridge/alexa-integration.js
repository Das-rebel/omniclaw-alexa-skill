/**
 * Alexa Skill Integration for Media Streaming
 *
 * Provides voice commands for controlling media platforms:
 * - Play content on Spotify/YouTube/Fen
 * - Control playback (pause, resume, skip, stop)
 * - Adjust volume
 * - Search for content
 * - Continue watching/playing
 */

const UnifiedMediaController = require('../controllers/unified-media-controller');

// Initialize controller
const controller = new UnifiedMediaController();

// Alexa request handlers
const handlers = {
    /**
     * Launch request
     */
    LaunchRequest() {
        this.emit(':ask',
            'Welcome to OmniClaw Media Control. You can ask me to play music on Spotify, ' +
            'watch videos on YouTube, or play content from your media library. What would you like to do?',
            'What would you like to play?'
        );
    },

    /**
     * PlayContent intent
     */
    PlayContentIntent() {
        const query = this.event.request.intent.slots.Query.value;
        const platform = this.event.request.intent.slots.Platform.value;

        if (!query) {
            this.emit(':ask', 'What would you like me to play?', 'What content?');
            return;
        }

        console.log(`🎵 PlayContent: "${query}" on ${platform || 'auto'}`);

        controller.playContent(query, { platform })
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('play', result);
                if (result.success) {
                    this.emit(':tell', voiceResponse);
                } else {
                    this.emit(':ask', voiceResponse, 'Try something else?');
                }
            })
            .catch(error => {
                console.error('❌ PlayContent error:', error.message);
                this.emit(':ask',
                    `I encountered an error: ${error.message}`,
                    'Try again or ask for something else.'
                );
            });
    },

    /**
     * PauseIntent
     */
    PauseIntent() {
        console.log('⏸️ Pause request');

        controller.pause()
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('pause', result);
                this.emit(':tell', voiceResponse);
            })
            .catch(error => {
                console.error('❌ Pause error:', error.message);
                this.emit(':ask',
                    'I couldn\'t pause playback. Are you sure something is playing?',
                    'Try again or ask for something else.'
                );
            });
    },

    /**
     * ResumeIntent
     */
    ResumeIntent() {
        console.log('▶️ Resume request');

        controller.resume()
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('resume', result);
                this.emit(':tell', voiceResponse);
            })
            .catch(error => {
                console.error('❌ Resume error:', error.message);
                this.emit(':ask',
                    'I couldn\'t resume playback. Try playing something first.',
                    'Try again or ask for something else.'
                );
            });
    },

    /**
     * StopIntent
     */
    StopIntent() {
        console.log('⏹️ Stop request');

        controller.stop()
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('stop', result);
                this.emit(':tell', voiceResponse);
            })
            .catch(error => {
                console.error('❌ Stop error:', error.message);
                this.emit(':tell', 'Stopped.');
            });
    },

    /**
     * NextIntent
     */
    NextIntent() {
        console.log('⏭️ Next request');

        controller.next()
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('next', result);
                this.emit(':tell', voiceResponse);
            })
            .catch(error => {
                console.error('❌ Next error:', error.message);
                this.emit(':ask',
                    'I couldn\'t skip to the next track.',
                    'Try again or ask for something else.'
                );
            });
    },

    /**
     * PreviousIntent
     */
    PreviousIntent() {
        console.log('⏮️ Previous request');

        controller.previous()
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('previous', result);
                this.emit(':tell', voiceResponse);
            })
            .catch(error => {
                console.error('❌ Previous error:', error.message);
                this.emit(':ask',
                    'I couldn\'t go to the previous track.',
                    'Try again or ask for something else.'
                );
            });
    },

    /**
     * SetVolumeIntent
     */
    SetVolumeIntent() {
        const volume = this.event.request.intent.slots.Volume.value;

        if (!volume) {
            this.emit(':ask', 'What volume level would you like?', 'What volume?');
            return;
        }

        console.log(`🔊 Set volume to ${volume}`);

        controller.setVolume(volume)
            .then(result => {
                const voiceResponse = controller.getVoiceResponse('volume', result);
                this.emit(':tell', voiceResponse);
            })
            .catch(error => {
                console.error('❌ SetVolume error:', error.message);
                this.emit(':ask',
                    `I couldn't set the volume to ${volume}.`,
                    'Try a different volume level.'
                );
            });
    },

    /**
     * SearchMediaIntent
     */
    SearchMediaIntent() {
        const query = this.event.request.intent.slots.Query.value;
        const platform = this.event.request.intent.slots.Platform.value;

        if (!query) {
            this.emit(':ask', 'What would you like me to search for?', 'What query?');
            return;
        }

        console.log(`🔍 Search: "${query}" on ${platform || 'all'}`);

        controller.searchAll(query, platform?.toLowerCase())
            .then(result => {
                if (!result.success) {
                    this.emit(':ask',
                        `I couldn't find anything for "${query}".`,
                        'Try searching for something else.'
                    );
                    return;
                }

                // Format results for voice
                let response = `I found `;
                const results = [];

                if (result.results.spotify && result.results.spotify.length > 0) {
                    results.push(`${result.results.spotify.length} tracks on Spotify`);
                }
                if (result.results.youtube && result.results.youtube.length > 0) {
                    results.push(`${result.results.youtube.length} videos on YouTube`);
                }
                if (result.results.fen && result.results.fen.length > 0) {
                    results.push(`${result.results.fen.length} items in your library`);
                }

                if (results.length === 0) {
                    response += `nothing for "${query}".`;
                } else {
                    response += results.join(', ') + ` for "${query}". Would you like me to play something?`;
                    this.emit(':ask', response, 'Should I play something?');
                    return;
                }

                this.emit(':tell', response);
            })
            .catch(error => {
                console.error('❌ Search error:', error.message);
                this.emit(':ask',
                    `I encountered an error: ${error.message}`,
                    'Try searching for something else.'
                );
            });
    },

    /**
     * ContinueWatchingIntent
     */
    ContinueWatchingIntent() {
        console.log('📺 Continue watching request');

        controller.continueWatching()
            .then(result => {
                if (result.success) {
                    this.emit(':tell', result.message);
                } else {
                    this.emit(':ask',
                        result.message,
                        'Try playing something new?'
                    );
                }
            })
            .catch(error => {
                console.error('❌ Continue watching error:', error.message);
                this.emit(':ask',
                    'I don\'t have any recent content to continue.',
                    'Try playing something new?'
                );
            });
    },

    /**
     * GetPlaybackStateIntent
     */
    GetPlaybackStateIntent() {
        console.log('📊 Get playback state request');

        controller.getAllStatus()
            .then(status => {
                if (!status.activePlatform) {
                    this.emit(':tell',
                        'Nothing is currently playing. Ask me to play something!'
                    );
                    return;
                }

                const platform = status.activePlatform;
                let response = `Currently playing on ${platform}. `;

                if (platform === 'spotify' && status.platforms.spotify.authenticated) {
                    response += 'Spotify is ready.';
                } else if (platform === 'fen' && status.platforms.fen.connected) {
                    response += 'Kodi is connected.';
                } else {
                    response += 'All systems are operational.';
                }

                this.emit(':tell', response);
            })
            .catch(error => {
                console.error('❌ Get playback state error:', error.message);
                this.emit(':tell',
                    'I couldn\'t check the playback state. Try playing something first.'
                );
            });
    },

    /**
     * HelpIntent
     */
    HelpIntent() {
        const helpText =
            'Here are some things you can ask me: ' +
            'Play music on Spotify, like "Play Bohemian Rhapsody on Spotify." ' +
            'Watch videos on YouTube, like "Play cat videos on YouTube." ' +
            'Play from your media library, like "Play The Matrix on Fen." ' +
            'Control playback with "Pause", "Resume", "Skip", or "Stop." ' +
            'Adjust volume by saying "Set volume to 50." ' +
            'Search for content with "Search for jazz on Spotify." ' +
            'Continue where you left off with "Continue watching." ' +
            'What would you like to do?';

        this.emit(':ask', helpText, 'What would you like to do?');
    },

    /**
     * CancelIntent
     */
    CancelIntent() {
        this.emit(':tell', 'Goodbye!');
    },

    /**
     * SessionEndedRequest
     */
    SessionEndedRequest() {
        console.log('Session ended');
    },

    /**
     * Unhandled intent
     */
    Unhandled() {
        this.emit(':ask',
            'I didn\'t understand that. Say "Help" for examples of what you can ask.',
            'What would you like to do?'
        );
    }
};

// Export Alexa skill handlers
module.exports = {
    handlers,
    controller
};
