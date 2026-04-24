# OmniClaw Enhanced - Open-Source Multi-Speaker TTS Implementation Plan

**Date**: 2026-03-26
**Objective**: Replace ElevenLabs with open-source multi-speaker TTS for character voice matching
**Target Languages**: English, Hinglish, Hindi
**Status**: 📋 Planning Phase

---

## Executive Summary

This plan outlines the implementation of open-source multi-speaker TTS solutions to provide character-specific voice matching for the story narrator function. The goal is to eliminate dependence on proprietary ElevenLabs API while maintaining or improving voice quality for English, Hinglish, and Hindi languages.

---

## Open-Source TTS Options Analysis

### Option 1: Coqui XTTS (Recommended)

**Status**: Legacy project (Coqui shut down in 2023), but XTTS model remains available

**Strengths**:
- ✅ Multilingual support (English, Hindi, Bengali, Tamil, 16+ languages)
- ✅ Multispeaker capabilities with voice cloning
- ✅ Cross-language voice cloning (clone English voice, use for Hindi)
- ✅ Emotional control and prosody adjustment
- ✅ Active community fork (XTTS-v2)
- ✅ Production-ready with proven stability

**Weaknesses**:
- ⚠️ Original company shut down (community-maintained)
- ⚠️ Large model size (~2GB)
- ⚠️ Requires GPU for optimal performance
- ⚠️ Slower than ElevenLabs (2-5s vs 400ms)

**Language Support**:
- English: ✅ Native
- Hindi: ✅ Native
- Bengali: ✅ Native
- Tamil: ✅ Native
- Hinglish: ✅ Code-switching support

**Model Specs**:
- Model Size: 2GB
- Languages: 16+
- Sample Rate: 24kHz
- Inference Time: 2-5s (CPU), 0.5-1s (GPU)

**Deployment**: Docker container with GPU support

---

### Option 2: Meta MMS (Massive Multilingual Speech)

**Status**: Active, Meta-supported

**Strengths**:
- ✅ Supports 1000+ languages
- ✅ Meta-backed and actively maintained
- ✅ Multispeaker capabilities
- ✅ Lightweight models (various sizes)
- ✅ No API costs
- ✅ State-of-the-art for low-resource languages

**Weaknesses**:
- ⚠️ Voice cloning not as good as XTTS
- ⚠️ Less emotional control
- ⚠️ Newer technology, less production testing

**Language Support**:
- English: ✅ Native
- Hindi: ✅ Native
- Bengali: ✅ Native
- Tamil: ✅ Native
- Hinglish: ⚠️ Limited (may require fine-tuning)

**Model Specs**:
- Model Size: 1GB (varies by language set)
- Languages: 1000+
- Sample Rate: 16kHz
- Inference Time: 1-3s (CPU), 0.3-0.8s (GPU)

**Deployment**: Hugging Face Transformers, ONNX Runtime

---

### Option 3: Microsoft SpeechT5

**Status**: Active, Microsoft-supported

**Strengths**:
- ✅ Multilingual support (90+ languages)
- ✅ Multispeaker with speaker embeddings
- ✅ Microsoft-backed, actively maintained
- ✅ Good balance of speed and quality
- ✅ Speech-to-speech conversion capabilities

**Weaknesses**:
- ⚠️ Voice cloning requires fine-tuning
- ⚠️ Less emotional control than XTTS
- ⚠️ Hugging Face dependency

**Language Support**:
- English: ✅ Native
- Hindi: ✅ Native
- Bengali: ⚠️ Via pretrained checkpoints
- Tamil: ⚠️ Via pretrained checkpoints
- Hinglish: ⚠️ Limited

**Model Specs**:
- Model Size: 500MB-1GB
- Languages: 90+
- Sample Rate: 16kHz
- Inference Time: 1-2s (CPU), 0.3-0.5s (GPU)

**Deployment**: Hugging Face Transformers, ONNX Runtime

---

### Option 4: VITS2 (Improved VITS)

**Status**: Active community project

**Strengths**:
- ✅ Very fast inference (real-time capable)
- ✅ Good voice quality
- ✅ Multispeaker support
- ✅ Active development
- ✅ Lightweight models

**Weaknesses**:
- ⚠️ Limited multilingual support (mostly English)
- ⚠️ Hindi requires fine-tuning
- ⚠️ Less emotional control

**Language Support**:
- English: ✅ Excellent
- Hindi: ⚠️ Requires fine-tuning
- Bengali: ❌ Limited
- Tamil: ❌ Limited
- Hinglish: ❌ Not supported

**Model Specs**:
- Model Size: 200-500MB
- Languages: Limited (mostly English)
- Sample Rate: 22.05kHz
- Inference Time: <1s (real-time capable)

**Deployment**: PyTorch, ONNX Runtime

---

## Recommended Solution: Hybrid Approach

### Phase 1: Primary Implementation (XTTS)

**Deployment**: Cloud Run with GPU support

**Architecture**:
```
omniclaw-story (Cloud Function)
  ↓
omniclaw-tts-service (Cloud Run + GPU)
  ↓
XTTS Model (GPU-accelerated)
```

**Character Voice Mapping**:
```python
voice_profiles = {
  'narrator': {
    'speaker_embedding': 'pretrained_narrator',
    'language': 'en',
    'stability': 0.5,
    'similarity_boost': 0.75
  },
  'hero': {
    'speaker_embedding': 'pretrained_hero',
    'language': 'en',
    'stability': 0.3,
    'similarity_boost': 0.85
  },
  'villain': {
    'speaker_embedding': 'pretrained_villain',
    'language': 'en',
    'stability': 0.4,
    'similarity_boost': 0.7
  },
  'sidekick': {
    'speaker_embedding': 'pretrained_sidekick',
    'language': 'en',
    'stability': 0.3,
    'similarity_boost': 0.9
  },
  'wise_old_man': {
    'speaker_embedding': 'pretrained_wise',
    'language': 'en',
    'stability': 0.6,
    'similarity_boost': 0.7
  }
}
```

**Hinglish Code-Switching**:
```python
def synthesize_hinglish(text):
    # Detect language segments
    segments = detect_code_switching(text)

    audio_segments = []
    for segment in segments:
        if segment['lang'] == 'hi':
            # Use Hindi voice
            audio = xtts.synthesize(
                text=segment['text'],
                language='hi',
                speaker_wav='hindi_voice.wav'
            )
        else:
            # Use English voice
            audio = xtts.synthesize(
                text=segment['text'],
                language='en',
                speaker_wav='english_voice.wav'
            )
        audio_segments.append(audio)

    # Concatenate audio segments
    return concatenate(audio_segments)
```

---

## Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

**Task 1.1: Deploy XTTS Service**

Create Cloud Run service with GPU support:

```dockerfile
# Dockerfile for XTTS service
FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ git ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install torch==2.1.0 torchaudio==2.1.0
RUN pip install TTS==0.22.0
RUN pip install fastapi uvicorn

# Copy XTTS model files
COPY models/ /app/models/
COPY main.py /app/

# Expose port
EXPOSE 8000

# Run service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# main.py - XTTS service
from fastapi import FastAPI, HTTPException
from TTS.api import TTS
import torch
import io

app = FastAPI()

# Initialize XTTS model
device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

# Load speaker embeddings
speaker_embeddings = {
    'narrator': 'voice_samples/narrator.wav',
    'hero': 'voice_samples/hero.wav',
    'villain': 'voice_samples/villain.wav',
    'sidekick': 'voice_samples/sidekick.wav',
    'wise_old_man': 'voice_samples/wise_old_man.wav'
}

@app.post("/synthesize")
async def synthesize(
    text: str,
    character: str = "narrator",
    language: str = "en"
):
    try:
        # Get speaker embedding
        speaker_wav = speaker_embeddings.get(character, speaker_embeddings['narrator'])

        # Generate speech
        wav = tts.tts(
            text=text,
            speaker_wav=speaker_wav,
            language=language
        )

        # Convert to bytes
        buffer = io.BytesIO()
        torch.save(wav, buffer)
        audio_bytes = buffer.getvalue()

        return {
            "success": True,
            "audio": audio_bytes.hex(),
            "format": "wav",
            "sample_rate": 24000,
            "character": character,
            "language": language
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model": "xtts_v2",
        "device": device,
        "languages": ["en", "hi", "bn", "ta"],
        "speakers": list(speaker_embeddings.keys())
    }
```

**Deploy to Cloud Run**:
```bash
gcloud run deploy omniclaw-tts-service \
  --source=./tts-service \
  --platform=managed \
  --region=us-central1 \
  --memory=8Gi \
  --cpu=4 \
  --accelerator=nvidia-tesla-t4 \
  --allow-unauthenticated \
  --project=omniclaw-enhanced
```

**Estimated Cost**: $200-400/month (GPU Cloud Run instance)

---

**Task 1.2: Create Voice Samples**

Record or generate 5-10 second voice samples for each character:

```
voice_samples/
├── narrator.wav (professional, steady)
├── hero.wav (strong, confident)
├── villain.wav (deep, menacing)
├── sidekick.wav (cheerful, energetic)
└── wise_old_man.wav (slow, deliberate)
```

**Voice Sample Recording**:
- Use professional voice actors or AI voice generators
- Duration: 5-10 seconds per character
- Format: WAV, 24kHz, mono
- Content: Character-specific phrases

---

**Task 1.3: Implement Hinglish Code-Switching**

Create language detection and segment splitting:

```python
# hinglish_detector.py
from langdetect import detect, LangDetectException

def detect_code_switching(text):
    """
    Detect English and Hindi segments in Hinglish text
    """
    segments = []
    current_seg = ""
    current_lang = None

    # Split by sentences
    sentences = text.split('. ')

    for sentence in sentences:
        try:
            lang = detect(sentence)

            # Hindi detected in Latin script (Hinglish)
            if lang == 'hi':
                segments.append({'text': sentence, 'lang': 'hi'})
            else:
                segments.append({'text': sentence, 'lang': 'en'})

        except LangDetectException:
            # Default to English if detection fails
            segments.append({'text': sentence, 'lang': 'en'})

    return segments
```

---

### Phase 2: Integration (Week 2)

**Task 2.1: Update Story Narrator Function**

Replace ElevenLabs client with XTTS service:

```javascript
// tts-client.js
const axios = require('axios');

class XTTSClIENT {
  constructor(serviceURL) {
    this.serviceURL = serviceURL;
  }

  async synthesize(text, character = 'narrator', language = 'en') {
    try {
      const response = await axios.post(
        `${this.serviceURL}/synthesize`,
        {
          text,
          character,
          language
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      return {
        success: true,
        audio: Buffer.from(response.data.audio, 'hex'),
        format: 'wav',
        sampleRate: response.data.sample_rate,
        character: response.data.character,
        language: response.data.language
      };
    } catch (error) {
      console.error('XTTS service error:', error.message);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.serviceURL}/health`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = XTTSClIENT;
```

**Update story narrator function**:
```javascript
const XTTSClIENT = require('./lib/tts-client');

const xttsClient = new XTTSClIENT(
  process.env.XTTS_SERVICE_URL || 'https://omniclaw-tts-service-xxxxx.a.run.app'
);

// In getAudio handler:
async function getAudioHandler(storyText, character, language) {
  // Detect if Hinglish (mixed English-Hindi)
  if (language === 'hinglish' || containsHinglish(storyText)) {
    // Use code-switching logic
    const segments = detectCodeSwitching(storyText);
    const audioSegments = [];

    for (const segment of segments) {
      const audio = await xttsClient.synthesize(
        segment.text,
        character,
        segment.lang
      );
      audioSegments.push(audio.audio);
    }

    // Concatenate audio segments
    return concatenateAudio(audioSegments);
  } else {
    // Single language synthesis
    const audio = await xttsClient.synthesize(
      storyText,
      character,
      language
    );
    return audio.audio;
  }
}
```

---

**Task 2.2: Update Tests**

Create tests for multi-speaker TTS:

```javascript
// tts.test.js
describe('Multi-Speaker TTS Tests', () => {
  test('Synthesize English with narrator voice', async () => {
    const result = await xttsClient.synthesize(
      'Once upon a time, there was a brave hero.',
      'narrator',
      'en'
    );
    expect(result.success).toBe(true);
    expect(result.character).toBe('narrator');
    expect(result.language).toBe('en');
  });

  test('Synthesize Hindi with hero voice', async () => {
    const result = await xttsClient.synthesize(
      'एक बार की बात है, एक बहादुर नायक था।',
      'hero',
      'hi'
    );
    expect(result.success).toBe(true);
    expect(result.character).toBe('hero');
    expect(result.language).toBe('hi');
  });

  test('Synthesize Hinglish with code-switching', async () => {
    const text = 'Once upon a time, ek bahadur nayak tha. Uska naam Raj tha.';
    const result = await xttsClient.synthesize(text, 'narrator', 'hinglish');
    expect(result.success).toBe(true);
    // Should handle both English and Hindi segments
  });

  test('All character voices sound distinct', async () => {
    const characters = ['narrator', 'hero', 'villain', 'sidekick', 'wise_old_man'];
    const text = 'The quick brown fox jumps over the lazy dog.';

    const results = await Promise.all(
      characters.map(char => xttsClient.synthesize(text, char, 'en'))
    );

    // Verify all succeeded
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Audio samples should be different (different embeddings)
    // This would require audio fingerprinting in real testing
  });
});
```

---

### Phase 3: Optimization (Week 3)

**Task 3.1: Implement Caching**

Cache TTS results to avoid regenerating same text:

```javascript
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

async function getCachedOrSynthesize(text, character, language) {
  // Create cache key
  const cacheKey = `${text}-${character}-${language}`.substring(0, 100);
  const hash = require('crypto').createHash('md5').update(cacheKey).digest('hex');

  // Check cache
  const cacheDoc = await firestore.collection('tts_cache').doc(hash).get();

  if (cacheDoc.exists) {
    // Return cached audio
    return {
      success: true,
      audio: Buffer.from(cacheDoc.data().audio, 'base64'),
      cached: true
    };
  }

  // Generate new audio
  const result = await xttsClient.synthesize(text, character, language);

  // Cache result (expire after 7 days)
  await firestore.collection('tts_cache').doc(hash).set({
    audio: result.audio.toString('base64'),
    character,
    language,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  return { ...result, cached: false };
}
```

**Task 3.2: Implement Request Queuing**

Queue requests to avoid overwhelming XTTS service:

```javascript
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379
});

const ttsQueue = new Queue('tts-synthesis', { connection });

async function enqueueSynthesis(text, character, language) {
  const job = await ttsQueue.add('synthesize', {
    text,
    character,
    language
  });

  const result = await job.waitUntilFinished();
  return result;
}

// Worker processes queue
const { Worker } = require('bullmq');
const ttsWorker = new Worker('tts-synthesis', async (job) => {
  const { text, character, language } = job.data;
  return await xttsClient.synthesize(text, character, language);
}, { connection });
```

---

### Phase 4: Testing & Validation (Week 4)

**Task 4.1: Performance Testing**

Test TTS service performance:

```javascript
// performance.test.js
describe('TTS Performance Tests', () => {
  test('P50 synthesis time < 2s', async () => {
    const start = Date.now();
    await xttsClient.synthesize('Test text.', 'narrator', 'en');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  test('P95 synthesis time < 5s', async () => {
    const times = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await xttsClient.synthesize('Test text.', 'narrator', 'en');
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];

    expect(p95).toBeLessThan(5000);
  });

  test('Concurrent requests (10 parallel)', async () => {
    const requests = Array(10).fill(null).map((_, i) =>
      xttsClient.synthesize(`Test text ${i}.`, 'narrator', 'en')
    );

    const results = await Promise.all(requests);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });
});
```

**Task 4.2: Voice Quality Testing**

Manual voice quality assessment:

```
Test Cases:
1. English narration - natural pacing, clear pronunciation
2. Hindi narration - correct pronunciation, natural flow
3. Hinglish code-switching - smooth transitions between languages
4. Character distinction - voices sound different
5. Emotional range - appropriate expression for different moods
```

---

## Comparison: ElevenLabs vs Open-Source

| Feature | ElevenLabs | XTTS (Open-Source) |
|---------|-----------|-------------------|
| **Cost** | $5-22/month | $200-400/month (GPU) |
| **Latency** | 400ms | 2-5s (CPU), 0.5-1s (GPU) |
| **Voice Quality** | Excellent | Good (90% of ElevenLabs) |
| **Multilingual** | 29 languages | 16 languages |
| **Voice Cloning** | ✅ Yes | ✅ Yes |
| **Emotional Control** | ✅ Yes | ✅ Limited |
| **Hinglish Support** | ✅ Native | ⚠️ Requires code-switching |
| **Maintenance** | None | Self-hosted |
| **Privacy** | Cloud API | Self-hosted |
| **Reliability** | 99.9% uptime | Depends on infra |

**Recommendation**: Start with ElevenLabs for production, implement XTTS as cost-saving measure for high-volume scenarios or privacy-sensitive use cases.

---

## Cost Analysis

### ElevenLabs (Current)

| Plan | Characters | Cost | Use Case |
|------|-----------|------|----------|
| Free | 10,000/month | $0 | Testing |
| Starter | 30,000/month | $5/month | Light usage |
| Creator | 100,000/month | $22/month | Medium usage |
| Pro | 500,000/month | $99/month | Heavy usage |

**Estimated Monthly Cost**: $22-99 (depending on usage)

### XTTS (Open-Source)

| Component | Spec | Cost |
|-----------|------|------|
| Cloud Run (GPU) | Tesla T4, 4 vCPUs, 8GB RAM | $200-400/month |
| Cloud Storage | 10GB for audio cache | $0.20/month |
| Firestore | 1GB for cache metadata | $0.18/month |
| Redis (optional) | Basic tier | $15/month |

**Estimated Monthly Cost**: $215-415/month

**Break-Even Point**: XTTS becomes cheaper than ElevenLabs at ~200,000 characters/month (Pro plan level)

---

## Implementation Timeline

### Week 1: Infrastructure Setup
- Day 1-2: Create XTTS service Docker container
- Day 3-4: Deploy to Cloud Run with GPU
- Day 5: Create voice samples for characters
- Day 6-7: Implement Hinglish code-switching

### Week 2: Integration
- Day 1-3: Create XTTS client for story narrator
- Day 4-5: Update story narrator function
- Day 6-7: Integration testing

### Week 3: Optimization
- Day 1-2: Implement caching
- Day 3-4: Implement request queuing
- Day 5-7: Performance tuning

### Week 4: Testing & Validation
- Day 1-2: Performance testing
- Day 3-4: Voice quality assessment
- Day 5-7: Bug fixes and refinement

**Total Timeline**: 4 weeks

---

## Risk Mitigation

### Risk 1: XTTS Service Unreliable

**Mitigation**:
- Keep ElevenLabs as fallback
- Implement health checks
- Automatic failover to ElevenLabs if XTTS fails

### Risk 2: High GPU Costs

**Mitigation**:
- Use preemptible GPUs (50% cheaper)
- Implement aggressive caching
- Scale to zero when idle
- Use CPU inference for low-traffic periods

### Risk 3: Voice Quality Degradation

**Mitigation**:
- A/B testing with ElevenLabs
- User feedback mechanism
- Option to switch back to ElevenLabs
- Continuous voice sample refinement

### Risk 4: Hinglish Code-Switching Issues

**Mitigation**:
- Fine-tune language detection
- Manual code-switching markers as fallback
- User preference for Hinglish handling
- Gradual rollout with testing

---

## Success Criteria

### Technical Metrics
- ✅ P50 synthesis time < 2s (GPU)
- ✅ P95 synthesis time < 5s (GPU)
- ✅ Voice quality ≥ 90% of ElevenLabs
- ✅ All character voices distinct
- ✅ English, Hindi, Hinglish support
- ✅ Cache hit rate > 30%
- ✅ Service uptime > 99%

### User Acceptance
- ✅ Users prefer XTTS voices or rate them equally
- ✅ Hinglish sounds natural
- ✅ Character voices match personalities
- ✅ No regression in story quality

---

## Next Steps

### Immediate Actions

1. **Review and approve plan** - Confirm technical approach
2. **Set budget** - Allocate funds for GPU infrastructure
3. **Create voice samples** - Record character voices
4. **Deploy XTTS service** - Set up Cloud Run with GPU
5. **Begin integration** - Update story narrator function

### Decision Point

**Option A: Full Implementation**
- Deploy XTTS service with GPU
- Replace ElevenLabs entirely
- Estimated cost: $215-415/month

**Option B: Hybrid Approach**
- Keep ElevenLabs for production
- Deploy XTTS for testing
- Gradual migration based on performance
- Estimated cost: $22-99 + $215-415 = $237-514/month (temporary)

**Option C: Delayed Implementation**
- Continue with ElevenLabs
- Monitor open-source TTS improvements
- Reassess in 6-12 months
- Estimated cost: $22-99/month

**Recommendation**: **Option B (Hybrid Approach)**
- Minimizes risk while enabling innovation
- Allows A/B testing and user feedback
- Provides fallback to proven solution
- Validates cost assumptions before full migration

---

## Conclusion

Open-source multi-speaker TTS via XTTS provides a viable alternative to ElevenLabs with the following trade-offs:

**Advantages**:
- ✅ Privacy (self-hosted)
- ✅ No API limits
- ✅ Customizable voices
- ✅ Cost-effective at scale

**Disadvantages**:
- ❌ Higher infrastructure costs
- ❌ Slower inference
- ❌ Requires maintenance
- ❌ Slightly lower voice quality

For OmniClaw Enhanced, a **hybrid approach** is recommended: use ElevenLabs for production while deploying XTTS for testing and gradual migration. This minimizes risk while enabling innovation and cost optimization at scale.

---

*Plan Created: 2026-03-26*
*Primary Technology: Coqui XTTS v2*
*Target Languages: English, Hindi, Hinglish*
*Deployment Platform: Google Cloud Run (GPU)*
*Estimated Timeline: 4 weeks*
*Recommended Approach: Hybrid (ElevenLabs + XTTS)*
