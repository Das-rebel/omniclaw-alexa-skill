/**
 * Resilient TTS Client with Cascading Failover
 * Priority: ElevenLabs → Sarvam → Google Cloud TTS → MiniMax TTS
 */

const https = require('https');

const TTS_CONFIG = {
  elevenlabs: {
    timeout: 15000,
    model: 'eleven_turbo_v2_5',
    voices: {
      NARRATOR: '21m00Tcm4TlvDq8ikWAM',
      MALE: 'TxGEqnHWrfWFTfGW9XjX',
      FEMALE: 'EXAVITQu4vr4xnSDxMaL'
    }
  },
  sarvam: {
    timeout: 10000,
    model: 'bulbul:v2',
    speakers: ['anushka', 'abhilash', 'manisha', 'vidya', 'arya', 'karun', 'hitesh']
  },
  google: {
    timeout: 10000,
    voices: {
      NARRATOR: { lang: 'en-IN', name: 'en-IN-Neural2-D' },
      MALE: { lang: 'hi-IN', name: 'hi-IN-Standard-C' },
      FEMALE: { lang: 'hi-IN', name: 'hi-IN-Standard-A' }
    }
  },
  minimax: {
    timeout: 12000,
    model: 'speech-2.8-hd',
    voices: {
      NARRATOR: 'male-qn-qingse',
      MALE: 'male-qn-qingse',
      FEMALE: 'female-shaonv'
    },
    voiceSetting: {
      speed: 1.0,
      vol: 1.0,
      pitch: 0
    },
    audioSetting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1
    }
  }
};

class ResilientTTSClient {
  constructor(options = {}) {
    this.elevenlabsKey = options.elevenlabsKey || process.env.ELEVENLABS_API_KEY;
    this.sarvamKey = options.sarvamKey || process.env.SARVAM_API_KEY;
    this.googleKey = options.googleKey || process.env.GOOGLE_TTS_API_KEY || 'AIzaSyA2kiB_yy5NdceQVCXd9u328dgQBJ_g3wU';
    this.minimaxKey = options.minimaxKey || process.env.MINIMAX_API_KEY;

    this.failureCount = { elevenlabs: 0, sarvam: 0, google: 0, minimax: 0 };
    this.circuitOpen = { elevenlabs: false, sarvam: false, google: false, minimax: false };

    console.log('[ResilientTTS] Initialized with cascade: ElevenLabs → Sarvam → Google → MiniMax');
  }

  async synthesize(text, options = {}) {
    const { voice = 'NARRATOR', language = 'en' } = options;

    const errors = [];

    if (this.elevenlabsKey && !this.circuitOpen.elevenlabs) {
      try {
        const audio = await this._elevenlabsTTS(text, voice);
        console.log('[ResilientTTS] ✅ ElevenLabs succeeded');
        this.failureCount.elevenlabs = 0;
        return audio;
      } catch (error) {
        console.warn(`[ResilientTTS] ⚠️ ElevenLabs failed: ${error.message}`);
        errors.push({ provider: 'elevenlabs', error: error.message });
        this.failureCount.elevenlabs++;
        if (this.failureCount.elevenlabs >= 3) {
          this.circuitOpen.elevenlabs = true;
          console.warn('[ResilientTTS] 🔴 ElevenLabs circuit OPEN (3 failures)');
        }
      }
    } else if (this.circuitOpen.elevenlabs) {
      console.warn('[ResilientTTS] ⚠️ ElevenLabs circuit is open, skipping');
    }

    if (this.sarvamKey && !this.circuitOpen.sarvam) {
      try {
        const audio = await this._sarvamTTS(text, voice);
        console.log('[ResilientTTS] ✅ Sarvam succeeded');
        this.failureCount.sarvam = 0;
        if (this.circuitOpen.elevenlabs) {
          this.circuitOpen.elevenlabs = false;
          console.log('[ResilientTTS] 🟢 ElevenLabs circuit closing (recovery)');
        }
        return audio;
      } catch (error) {
        console.warn(`[ResilientTTS] ⚠️ Sarvam failed: ${error.message}`);
        errors.push({ provider: 'sarvam', error: error.message });
        this.failureCount.sarvam++;
        if (this.failureCount.sarvam >= 3) {
          this.circuitOpen.sarvam = true;
          console.warn('[ResilientTTS] 🔴 Sarvam circuit OPEN (3 failures)');
        }
      }
    } else if (this.circuitOpen.sarvam) {
      console.warn('[ResilientTTS] ⚠️ Sarvam circuit is open, skipping');
    }

    if (this.googleKey && !this.circuitOpen.google) {
      try {
        const audio = await this._googleTTS(text, voice);
        console.log('[ResilientTTS] ✅ Google TTS succeeded');
        this.failureCount.google = 0;
        this.circuitOpen.sarvam = false;
        this.circuitOpen.elevenlabs = false;
        return audio;
      } catch (error) {
        console.warn(`[ResilientTTS] ⚠️ Google TTS failed: ${error.message}`);
        errors.push({ provider: 'google', error: error.message });
        this.failureCount.google++;
        if (this.failureCount.google >= 3) {
          this.circuitOpen.google = true;
          console.warn('[ResilientTTS] 🔴 Google TTS circuit OPEN (3 failures)');
        }
      }
    } else if (this.circuitOpen.google) {
      console.warn('[ResilientTTS] ⚠️ Google TTS circuit is open, skipping');
    }

    if (this.minimaxKey && !this.circuitOpen.minimax) {
      try {
        const audio = await this._minimaxTTS(text, voice);
        console.log('[ResilientTTS] ✅ MiniMax TTS succeeded');
        this.failureCount.minimax = 0;
        this.circuitOpen.google = false;
        this.circuitOpen.sarvam = false;
        this.circuitOpen.elevenlabs = false;
        return audio;
      } catch (error) {
        console.warn(`[ResilientTTS] ⚠️ MiniMax TTS failed: ${error.message}`);
        errors.push({ provider: 'minimax', error: error.message });
        this.failureCount.minimax++;
        if (this.failureCount.minimax >= 3) {
          this.circuitOpen.minimax = true;
          console.warn('[ResilientTTS] 🔴 MiniMax TTS circuit OPEN (3 failures)');
        }
      }
    } else if (this.circuitOpen.minimax) {
      console.warn('[ResilientTTS] ⚠️ MiniMax TTS circuit is open, skipping');
    }

    throw new Error(`All TTS providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`);
  }

  async _elevenlabsTTS(text, voice) {
    return new Promise((resolve, reject) => {
      const voiceId = TTS_CONFIG.elevenlabs.voices[voice] || TTS_CONFIG.elevenlabs.voices.NARRATOR;

      const postData = JSON.stringify({
        text: text,
        model_id: TTS_CONFIG.elevenlabs.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.5,
          use_speaker_boost: true
        }
      });

      const options = {
        hostname: 'api.elevenlabs.io',
        port: 443,
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenlabsKey,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: TTS_CONFIG.elevenlabs.timeout
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 402 || res.statusCode === 403) {
          reject(new Error(`ElevenLabs payment required or forbidden (${res.statusCode})`));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`ElevenLabs HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('ElevenLabs timeout'));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async _sarvamTTS(text, voice) {
    return new Promise((resolve, reject) => {
      const speakerMap = {
        NARRATOR: 'anushka',
        MALE: 'karun',
        FEMALE: 'vidya'
      };
      const speaker = speakerMap[voice] || 'anushka';

      const postData = JSON.stringify({
        text: text,
        language_code: 'hi-IN',
        speaker: speaker
      });

      const options = {
        hostname: 'api.sarvam.ai',
        port: 443,
        path: '/text-to-speech',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.sarvamKey,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: TTS_CONFIG.sarvam.timeout
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(Buffer.concat(chunks).toString());
            if (response.error) {
              reject(new Error(response.error.message || 'Sarvam error'));
              return;
            }
            if (response.audios && response.audios[0]) {
              resolve(Buffer.from(response.audios[0], 'base64'));
            } else {
              reject(new Error('Sarvam no audio returned'));
            }
          } catch (e) {
            reject(new Error(`Sarvam parse error: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Sarvam timeout'));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async _googleTTS(text, voice) {
    return new Promise((resolve, reject) => {
      const voiceConfig = TTS_CONFIG.google.voices[voice] || TTS_CONFIG.google.voices.NARRATOR;

      const postData = JSON.stringify({
        input: { text: text },
        voice: { languageCode: voiceConfig.lang, name: voiceConfig.name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 }
      });

      const options = {
        hostname: 'texttospeech.googleapis.com',
        port: 443,
        path: `/v1/text:synthesize?key=${this.googleKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: TTS_CONFIG.google.timeout
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(Buffer.concat(chunks).toString());
            if (response.error) {
              reject(new Error(response.error.message || 'Google TTS error'));
              return;
            }
            if (response.audioContent) {
              resolve(Buffer.from(response.audioContent, 'base64'));
            } else {
              reject(new Error('Google TTS no audio returned'));
            }
          } catch (e) {
            reject(new Error(`Google TTS parse error: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google TTS timeout'));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async _minimaxTTS(text, voice) {
    return new Promise((resolve, reject) => {
      const voiceId = TTS_CONFIG.minimax.voices[voice] || TTS_CONFIG.minimax.voices.NARRATOR;

      const postData = JSON.stringify({
        model: TTS_CONFIG.minimax.model,
        text: text,
        stream: false,
        output_format: 'hex',
        voice_setting: {
          voice_id: voiceId,
          speed: TTS_CONFIG.minimax.voiceSetting.speed,
          vol: TTS_CONFIG.minimax.voiceSetting.vol,
          pitch: TTS_CONFIG.minimax.voiceSetting.pitch
        },
        audio_setting: {
          sample_rate: TTS_CONFIG.minimax.audioSetting.sample_rate,
          bitrate: TTS_CONFIG.minimax.audioSetting.bitrate,
          format: TTS_CONFIG.minimax.audioSetting.format,
          channel: TTS_CONFIG.minimax.audioSetting.channel
        }
      });

      const options = {
        hostname: 'api.minimax.io',
        port: 443,
        path: '/v1/t2a_v2',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.minimaxKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: TTS_CONFIG.minimax.timeout
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            const responseText = Buffer.concat(chunks).toString();
            const response = JSON.parse(responseText);

            if (res.statusCode !== 200) {
              const errorMessage = response?.base_resp?.status_msg || response?.message || `MiniMax HTTP ${res.statusCode}`;
              reject(new Error(errorMessage));
              return;
            }

            const hexAudio = response?.data?.audio;
            if (!hexAudio) {
              reject(new Error('MiniMax no audio returned'));
              return;
            }

            resolve(Buffer.from(hexAudio, 'hex'));
          } catch (e) {
            reject(new Error(`MiniMax parse error: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('MiniMax timeout'));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  getStatus() {
    return {
      providers: {
        elevenlabs: {
          configured: !!this.elevenlabsKey,
          circuitOpen: this.circuitOpen.elevenlabs,
          failures: this.failureCount.elevenlabs
        },
        sarvam: {
          configured: !!this.sarvamKey,
          circuitOpen: this.circuitOpen.sarvam,
          failures: this.failureCount.sarvam
        },
        google: {
          configured: !!this.googleKey,
          circuitOpen: this.circuitOpen.google,
          failures: this.failureCount.google
        },
        minimax: {
          configured: !!this.minimaxKey,
          circuitOpen: this.circuitOpen.minimax,
          failures: this.failureCount.minimax
        }
      }
    };
  }

  resetCircuits() {
    this.circuitOpen = { elevenlabs: false, sarvam: false, google: false, minimax: false };
    this.failureCount = { elevenlabs: 0, sarvam: 0, google: 0, minimax: 0 };
    console.log('[ResilientTTS] All circuits reset');
  }
}

function createResilientTTSClient(options = {}) {
  return new ResilientTTSClient(options);
}

module.exports = {
  ResilientTTSClient,
  createResilientTTSClient,
  TTS_CONFIG
};
