/**
 * Streaming TTS Engine - Low-Latency Audio Generation
 * Implements sentence buffering strategy for optimal performance
 */

const { VoiceProfileManager } = require('../voices/voice-profile-manager');
const EventEmitter = require('events');

/**
 * Buffer configuration for optimal streaming
 */
const BUFFER_CONFIG = {
  optimalTokens: 28, // Optimal token count for TTS
  maxTokens: 40,
  minTokens: 15,
  delimiters: ['.', '!', '?', '\n'],
  speakerChangeDelimiters: ['[NARRATOR]', '[HERO]', '[VILLAIN]', '[SIDEKICK]', '[WISE_OLD_MAN]']
};

/**
 * Streaming TTS Engine Class
 */
class StreamingTTSEngine extends EventEmitter {
  constructor(voiceProfileManager, options = {}) {
    super();

    this.voiceManager = voiceProfileManager;
    this.options = {
      bufferStrategy: options.bufferStrategy || 'sentence',
      enableStreaming: options.enableStreaming !== false,
      prefetchSegments: options.prefetchSegments || 2,
      ...options
    };

    // Buffer management
    this.segmentQueue = [];
    this.audioBuffer = [];
    this.isProcessing = false;

    // Streaming state
    this.currentSpeaker = null;
    this.buffer = '';
    this.tokenCount = 0;
    this.bufferedSegments = [];

    // Performance tracking
    this.streamMetrics = {
      segmentsProcessed: 0,
      totalAudioTime: 0,
      bufferUnderruns: 0,
      averageBufferSize: 0
    };
  }

  /**
   * Stream story segments with optimal buffering
   * @param {Array} segments - Story segments to stream
   * @returns {AsyncIterator} - Async iterator of audio chunks
   */
  async *streamSegments(segments) {
    console.log(`[StreamingTTSEngine] Starting stream of ${segments.length} segments`);

    // Prefetch initial segments
    const prefetchQueue = segments.slice(0, this.options.prefetchSegments);
    const remainingSegments = segments.slice(this.options.prefetchSegments);

    // Start prefetching
    const prefetchPromise = this._prefetchSegments(prefetchQueue);

    for (const segment of segments) {
      // Skip non-dialogue segments (pauses, decisions)
      if (segment.type !== 'dialogue') {
        if (segment.type === 'pause') {
          yield { type: 'pause', duration: segment.duration };
        } else if (segment.type === 'decision') {
          yield { type: 'decision', options: segment.options };
        }
        continue;
      }

      // Synthesize segment
      const startTime = Date.now();
      const audioBuffer = await this.voiceManager.synthesizeSegment(segment);
      const latency = Date.now() - startTime;

      // Emit audio chunk
      yield {
        type: 'audio',
        audio: audioBuffer,
        segment,
        metadata: {
          latency,
          character: segment.character,
          emotion: segment.emotion,
          duration: segment.estimatedDuration
        }
      };

      this.streamMetrics.segmentsProcessed++;
      this.streamMetrics.totalAudioTime += segment.estimatedDuration;

      // Emit progress
      this.emit('progress', {
        segmentIndex: this.streamMetrics.segmentsProcessed,
        totalSegments: segments.filter(s => s.type === 'dialogue').length,
        latency,
        character: segment.character
      });
    }

    console.log('[StreamingTTSEngine] Stream complete');
  }

  /**
   * Process story with sentence buffering
   * @param {Array} segments - Story segments
   * @returns {Promise<Array>} - Processed audio segments
   */
  async processWithBuffering(segments) {
    console.log(`[StreamingTTSEngine] Processing ${segments.length} segments with buffering`);

    const audioSegments = [];
    let currentBuffer = [];
    let currentSpeaker = null;
    let bufferedTokens = 0;

    for (const segment of segments) {
      if (segment.type !== 'dialogue') {
        audioSegments.push(segment);
        continue;
      }

      // Check for speaker change
      if (currentSpeaker && segment.character !== currentSpeaker) {
        // Flush buffer on speaker change
        if (currentBuffer.length > 0) {
          const combinedAudio = await this._synthesizeBufferedSegment(currentBuffer);
          audioSegments.push(combinedAudio);
          currentBuffer = [];
          bufferedTokens = 0;
        }
      }

      currentSpeaker = segment.character;
      const segmentTokens = this._estimateTokens(segment.text);

      // Check if buffer should be flushed
      if (bufferedTokens + segmentTokens > BUFFER_CONFIG.maxTokens ||
          (currentBuffer.length > 0 && bufferedTokens >= BUFFER_CONFIG.optimalTokens)) {
        // Flush buffer
        const combinedAudio = await this._synthesizeBufferedSegment(currentBuffer);
        audioSegments.push(combinedAudio);
        currentBuffer = [];
        bufferedTokens = 0;
      }

      // Add to buffer
      currentBuffer.push(segment);
      bufferedTokens += segmentTokens;
    }

    // Flush remaining buffer
    if (currentBuffer.length > 0) {
      const combinedAudio = await this._synthesizeBufferedSegment(currentBuffer);
      audioSegments.push(combinedAudio);
    }

    return audioSegments;
  }

  /**
   * Synthesize buffered segment (combines multiple segments)
   * @private
   */
  async _synthesizeBufferedSegment(segments) {
    if (segments.length === 1) {
      const audio = await this.voiceManager.synthesizeSegment(segments[0]);
      return {
        type: 'audio',
        audio,
        segment: segments[0],
        combined: false
      };
    }

    // Combine segments
    const combinedText = segments.map(s => s.text).join(' ');
    const combinedSegment = {
      ...segments[0],
      text: combinedText,
      wordCount: combinedText.split(/\s+/).length
    };

    const audio = await this.voiceManager.synthesizeSegment(combinedSegment);

    return {
      type: 'audio',
      audio,
      segment: combinedSegment,
      combined: true,
      originalSegments: segments.length
    };
  }

  /**
   * Prefetch segments for faster streaming
   * @private
   */
  async _prefetchSegments(segments) {
    const dialogueSegments = segments.filter(s => s.type === 'dialogue');

    for (const segment of dialogueSegments) {
      try {
        const audio = await this.voiceManager.synthesizeSegment(segment);
        this.bufferedSegments.push({
          segment,
          audio,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('[StreamingTTSEngine] Prefetch failed for segment:', error);
      }
    }

    console.log(`[StreamingTTSEngine] Prefetched ${this.bufferedSegments.length} segments`);
  }

  /**
   * Get buffered segment if available
   */
  getBufferedSegment(segmentId) {
    const buffered = this.bufferedSegments.find(b =>
      b.segment.id === segmentId || b.segment.text.includes(segmentId)
    );

    if (buffered) {
      // Remove from buffer
      this.bufferedSegments = this.bufferedSegments.filter(b => b !== buffered);
      return buffered.audio;
    }

    return null;
  }

  /**
   * Estimate token count for text
   * @private
   */
  _estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Split text into optimal chunks for TTS
   * @param {string} text - Text to split
   * @param {string} speaker - Current speaker
   * @returns {Array} - Array of text chunks
   */
  splitIntoChunks(text, speaker) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this._estimateTokens(sentence);

      // Check if sentence would exceed max tokens
      if (sentenceTokens > BUFFER_CONFIG.maxTokens) {
        // Split long sentence
        const words = sentence.split(/\s+/);
        let tempChunk = '';

        for (const word of words) {
          const testChunk = tempChunk ? `${tempChunk} ${word}` : word;
          const testTokens = this._estimateTokens(testChunk);

          if (testTokens > BUFFER_CONFIG.optimalTokens && tempChunk) {
            chunks.push(tempChunk.trim());
            tempChunk = word;
          } else {
            tempChunk = testChunk;
          }
        }

        if (tempChunk) {
          chunks.push(tempChunk.trim());
        }

        continue;
      }

      // Check if adding sentence would exceed buffer
      const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      const testTokens = this._estimateTokens(testChunk);

      if (testTokens > BUFFER_CONFIG.maxTokens && currentChunk) {
        // Flush current chunk
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      } else if (testTokens >= BUFFER_CONFIG.optimalTokens) {
        // Optimal chunk size reached
        chunks.push(testChunk.trim());
        currentChunk = '';
        currentTokens = 0;
      } else {
        // Add to current chunk
        currentChunk = testChunk;
        currentTokens = testTokens;
      }
    }

    // Flush remaining
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get stream metrics
   */
  getMetrics() {
    return {
      ...this.streamMetrics,
      averageBufferSize: this.bufferedSegments.length,
      bufferUtilization: this.bufferedSegments.length / this.options.prefetchSegments
    };
  }

  /**
   * Clear buffer
   */
  clearBuffer() {
    this.bufferedSegments = [];
    this.audioBuffer = [];
    this.segmentQueue = [];
  }

  /**
   * Reset engine state
   */
  reset() {
    this.clearBuffer();
    this.isProcessing = false;
    this.currentSpeaker = null;
    this.buffer = '';
    this.tokenCount = 0;

    this.streamMetrics = {
      segmentsProcessed: 0,
      totalAudioTime: 0,
      bufferUnderruns: 0,
      averageBufferSize: 0
    };
  }
}

/**
 * Real-time streaming player for audio playback
 */
class AudioStreamPlayer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      autoPlay: options.autoPlay !== false,
      volume: options.volume || 1.0,
      crossFadeDuration: options.crossFadeDuration || 0.1, // seconds
      ...options
    };

    this.isPlaying = false;
    this.currentSegment = null;
    this.playbackQueue = [];
  }

  /**
   * Play audio stream
   * @param {AsyncIterator} stream - Audio stream iterator
   */
  async playStream(stream) {
    console.log('[AudioStreamPlayer] Starting playback');
    this.isPlaying = true;

    try {
      for await (const chunk of stream) {
        if (!this.isPlaying) break;

        if (chunk.type === 'audio') {
          await this._playAudioChunk(chunk);
        } else if (chunk.type === 'pause') {
          await this._handlePause(chunk.duration);
        } else if (chunk.type === 'decision') {
          this.emit('decision', chunk.options);
          break; // Stop playback for user decision
        }
      }

      console.log('[AudioStreamPlayer] Playback complete');
    } catch (error) {
      console.error('[AudioStreamPlayer] Playback error:', error);
      this.emit('error', error);
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Play individual audio chunk
   * @private
   */
  async _playAudioChunk(chunk) {
    this.currentSegment = chunk;

    this.emit('segmentStart', {
      character: chunk.segment.character,
      emotion: chunk.segment.emotion,
      latency: chunk.metadata.latency
    });

    // Simulate playback (in real implementation, use actual audio player)
    const playbackDuration = chunk.metadata.duration * 1000;
    await this._delay(playbackDuration);

    this.emit('segmentEnd', {
      character: chunk.segment.character,
      duration: playbackDuration
    });
  }

  /**
   * Handle pause between segments
   * @private
   */
  async _handlePause(duration) {
    this.emit('pause', { duration });
    await this._delay(duration * 1000);
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop playback
   */
  stop() {
    this.isPlaying = false;
    console.log('[AudioStreamPlayer] Playback stopped');
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
  }

  /**
   * Resume playback
   */
  resume() {
    this.isPlaying = true;
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    this.options.volume = Math.max(0, Math.min(1, volume));
  }
}

module.exports = {
  StreamingTTSEngine,
  AudioStreamPlayer,
  BUFFER_CONFIG
};
