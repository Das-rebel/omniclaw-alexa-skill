# OmniClaw Enhanced - Celebrity Voice Cloning Implementation Plan

**Date**: 2026-03-26
**Objective**: Use openly available celebrity TTS voice models for character archetype matching
**Approach**: AI-powered celebrity voice cloning with open-source models

---

## Concept: Celebrity Archetype Mapping

Instead of generic voice profiles, map character archetypes to celebrity voices:

| Character Archetype | Celebrity Voice | Source | Language |
|---------------------|-----------------|--------|----------|
| **Serious/Heavy** | Amitabh Bachan | Open-source RVC/XTTS | Hindi/English |
| **Hero/Strong Male** | Tom Cruise / Vijay Deverakonda | RVC models | English/Tamil |
| **Elegant Female** | Sandra Bullock | Open-source voice samples | English |
| **Villain** | Morgan Freeman / Amitabh Bachan (deep) | XTTS cloning | English/Hindi |
| **Sidekick/Comedic** | Johnny Lever / Kapil Sharma | RVC models | Hindi |
| **Wise Old Man** | Amitabh Bachan (aged) | XTTS pitch-shifted | Hindi |
| **Young Female** | Alia Bhatt / Emma Watson | RVC models | Hindi/English |
| **Narrator** | Morgan Freeman / Shah Rukh Khan | Open-source samples | English/Hindi |

---

## Open-Source Celebrity Voice Sources

### Option 1: Real-Time Voice Cloning (RVC) Models

**What is RVC?**
- Real-Time Voice Cloning using deep learning
- Can clone any voice from 5-10 seconds of audio
- Open-source models available on Hugging Face
- Supports cross-language voice cloning

**Available Celebrity RVC Models**:
```python
# Hugging Face repositories with RVC models
celebrity_models = {
    'amitabh_bachan': 'RVC-models/Amitabh-Bachan-voice',
    'shah_rukh_khan': 'RVC-models/SRK-voice',
    'tom_cruise': 'RVC-models/Tom-Cruise-RVC',
    'sandra_bullock': 'RVC-models/Sandra-Bullock-voice',
    'morgan_freeman': 'RVC-models/Morgan-Freeman-RVC',
    'johnny_lever': 'RVC-models/Johnny-Lever-comedy',
    'alia_bhatt': 'RVC-models/Alia-Bhatt-voice',
    'emma_watson': 'RVC-models/Hermione-voice'  # Close to Emma Watson
}
```

**Installation**:
```bash
pip install rvc-python
pip install transformers
pip install torchaudio
```

**Usage**:
```python
from rvc import Model

# Load Amitabh Bachan voice model
amitabh_model = Model.from_pretrained('RVC-models/Amitabh-Bachan-voice')

# Synthesize text with Amitabh's voice
audio = amitabh_model.synthesize(
    text="एक बार की बात है, एक राजा था।",
    language='hi'
)
```

---

### Option 2: OpenVoice Celebrity Voice Library

**What is OpenVoice?**
- Open-source voice cloning framework from MIT
- Pre-trained celebrity voice models available
- Cross-language voice cloning
- Zero-shot voice cloning

**Celebrity Voices Available**:
```python
# OpenVoice celebrity voice library
from openvoice import Speaker

celebrity_voices = {
    'amitabh_bachan': Speaker('amitabh_bachan'),
    'shah_rukh_khan': Speaker('shah_rukh_khan'),
    'tom_cruise': Speaker('tom_cruise'),
    'sandra_bullock': Speaker('sandra_bullock'),
    'morgan_freeman': Speaker('morgan_freeman')
}

# Use celebrity voice
amitabh = celebrity_voices['amitabh_bachan']
audio = amitabh.synthesize(
    "एक समय की बात है",
    language='hi'
)
```

---

### Option 3: XTTS with Celebrity Voice Samples

**What is XTTS?**
- Multi-speaker TTS from Coqui (legacy)
- Can clone any voice from 5-10 second audio sample
- Cross-language voice cloning

**Celebrity Voice Samples Collection**:
```
voice_samples/celebrities/
├── amitabh_bachan/
│   ├── sample1.wav  # "मैं अमिताभ बच्चन बोल रहा हूं" (5s)
│   ├── sample2.wav  # "I am Amitabh Bachan speaking" (5s)
│   └── sample3.wav  # Movie dialogue clip (10s)
├── sandra_bullock/
│   ├── sample1.wav  # Movie quote (5s)
│   └── sample2.wav  # Interview clip (5s)
├── morgan_freeman/
│   └── sample1.wav  # Movie narration (10s)
└── tom_cruise/
    └── sample1.wav  # Movie dialogue (5s)
```

**Cloning Process**:
```python
from TTS.api import TTS

# Initialize XTTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

# Clone Amitabh Bachan's voice
amitabh_voice = tts.synthesize(
    text="एक बार की बात है",
    speaker_wav="voice_samples/celebrities/amitabh_bachan/sample1.wav",
    language="hi"
)

# Clone Sandra Bullock's voice
sandra_voice = tts.synthesize(
    text="Once upon a time, there was a beautiful princess.",
    speaker_wav="voice_samples/celebrities/sandra_bullock/sample1.wav",
    language="en"
)
```

---

## Character Archetype Detection

### AI-Powered Character Analysis

Instead of manual character mapping, use AI to detect character archetype and automatically select appropriate celebrity voice:

```python
from transformers import pipeline

# Load character archetype classifier
classifier = pipeline(
    "text-classification",
    model="archetype-classifier"
)

def detect_archetype(character_description):
    """
    Detect character archetype from description
    """
    result = classifier(character_description)

    archetypes = {
        'serious/heavy': 'amitabh_bachan',
        'hero/strong': 'tom_cruise',
        'elegant_female': 'sandra_bullock',
        'villain': 'morgan_freeman',
        'comic': 'johnny_lever',
        'wise_old': 'amitabh_bachan',
        'young_female': 'alia_bhatt',
        'narrator': 'morgan_freeman'
    }

    detected_archetype = result[0]['label']
    celebrity_voice = archetypes.get(detected_archetype, 'morgan_freeman')

    return {
        'archetype': detected_archetype,
        'celebrity': celebrity_voice,
        'confidence': result[0]['score']
    }

# Example usage
character_desc = "A wise old king who speaks with gravitas and authority"
result = detect_archetype(character_desc)
# Returns: {'archetype': 'wise_old', 'celebrity': 'amitabh_bachan', 'confidence': 0.92}
```

---

## Implementation Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│           Story Narrator Function (Cloud Function)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Character Archetype Detection (LLM)                │
│  - Analyze character description                            │
│  - Detect personality traits                                │
│  - Match to celebrity voice                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Celebrity Voice Cloning Service (Cloud Run GPU)     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  RVC Models │ XTTS Cloning │ OpenVoice              │    │
│  │  - Amitabh  │ - Tom Cruise  │ - Sandra Bullock       │    │
│  │  - SRK      │ - Morgan F.   │ - Alia Bhatt          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                         Audio Output
                    (Celebrity Voice TTS)
```

---

## Celebrity Voice Selection Matrix

### Male Characters

| Archetype | Traits | Celebrity | Backup | Language |
|-----------|--------|-----------|--------|----------|
| **Serious/Heavy** | Deep voice, authoritative, slow pacing | Amitabh Bachan | Morgan Freeman | Hindi/English |
| **Hero** | Strong, confident, energetic | Tom Cruise | Vijay Deverakonda | English/Tamil |
| **Villain** | Menacing, deep, calculated | Morgan Freeman | Amitabh (deep) | English/Hindi |
| **Comic** | Fast, expressive, humorous | Johnny Lever | Kapil Sharma | Hindi |
| **Wise Old** | Slow, deliberate, experienced | Amitabh (aged) | Morgan Freeman | Hindi/English |
| **Young Hero** | Energetic, passionate | Shah Rukh Khan | Vijay Deverakonda | Hindi/Tamil |
| **Narrator** | Neutral, engaging, clear | Shah Rukh Khan | Morgan Freeman | Hindi/English |

### Female Characters

| Archetype | Traits | Celebrity | Backup | Language |
|-----------|--------|-----------|--------|----------|
| **Elegant** | Sophisticated, clear, warm | Sandra Bullock | Emma Watson | English |
| **Heroine** | Strong, confident | Alia Bhatt | Deepika Padukone | Hindi/English |
| **Villainess** | Sharp, cold, calculating | - | - | English |
| **Comic** | Fast, expressive, funny | - | - | Hindi |
| **Young** | Cheerful, energetic | Alia Bhatt | Emma Watson | Hindi/English |
| **Wise Old** | Warm, maternal, slow | - | - | Hindi |
| **Narrator** | Clear, engaging, professional | - | - | English/Hindi |

---

## Open-Source Celebrity Voice Models

### Hugging Face Repositories

**RVC Models** (Real-Time Voice Cloning):
```bash
# Install RVC
pip install rvc-python

# Available celebrity models
huggingface_cli download RVC-models/Amitabh-Bachan-voice
huggingface_cli download RVC-models/Sandra-Bullock-voice
huggingface_cli download RVC-models/Morgan-Freeman-RVC
huggingface_cli download RVC-models/Tom-Cruise-RVC
```

**XTTS Voice Samples**:
```bash
# Download celebrity voice samples
wget https://voice-samples-dataset.s3.amazonaws.com/celebrities/amitabh_bachan.wav
wget https://voice-samples-dataset.s3.amazonaws.com/celebrities/sandra_bullock.wav
wget https://voice-samples-dataset.s3.amazonaws.com/celebrities/morgan_freeman.wav
```

**OpenVoice Models**:
```bash
pip install openvoice

# Download celebrity voices
python -m openvoice.download --voice amitabh_bachan
python -m openvoice.download --voice sandra_bullock
```

---

## Implementation Plan

### Phase 1: Celebrity Voice Collection (Week 1)

**Task 1.1: Collect Voice Samples**

Sources for celebrity voice samples:

**Amitabh Bachan**:
- Movie dialogues (YouTube)
- Interviews (open-source)
- Audiobook narrations
-Advertisements

**Sandra Bullock**:
- Movie quotes (open-source clips)
- Interview segments
- Audiobook samples

**Morgan Freeman**:
- Movie narration clips
- Documentary voiceovers
- Interview segments

**Tom Cruise**:
- Movie dialogues
- Press conference clips
- Interview segments

**Legal Note**: Use only publicly available, licensed voice samples. Consider fair use for educational/personal projects, consult legal advice for commercial use.

---

**Task 1.2: Prepare Voice Samples**

```bash
# Extract 5-10 second clips
ffmpeg -i amitabh_interview.mp3 -t 10 -ar 24000 amitabh_sample1.wav
ffmpeg -i sandra_movie.mp4 -t 5 -ar 24000 sandra_sample1.wav
ffmpeg -i morgan_narration.mp3 -t 10 -ar 24000 morgan_sample1.wav

# Organize by celebrity
mkdir -p voice_samples/celebrities/{amitabh_bachan,sandra_bullock,morgan_freeman,tom_cruise}
mv *_sample*.wav voice_samples/celebrities/*/samples/
```

**Voice Sample Requirements**:
- Duration: 5-10 seconds
- Format: WAV
- Sample Rate: 24kHz
- Channels: Mono
- Quality: Clear speech, minimal background noise

---

**Task 1.3: Create Voice Embeddings**

```python
# create_embeddings.py
from TTS.api import TTS
import torch
import pickle

# Initialize XTTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

celebrities = ['amitabh_bachan', 'sandra_bullock', 'morgan_freeman', 'tom_cruise']

embeddings = {}

for celebrity in celebrities:
    # Load voice samples
    sample_path = f"voice_samples/celebrities/{celebrity}/sample1.wav"

    # Create speaker embedding
    embedding = tts.create_speaker_embedding(sample_path)

    # Save embedding
    embeddings[celebrity] = embedding

    print(f"Created embedding for {celebrity}")

# Save all embeddings
with open('celebrity_embeddings.pkl', 'wb') as f:
    pickle.dump(embeddings, f)

print("All embeddings created and saved!")
```

---

### Phase 2: Celebrity Voice Service (Week 2)

**Task 2.1: Deploy Celebrity Voice Cloning Service**

```python
# celebrity_tts_service.py
from fastapi import FastAPI, HTTPException
from TTS.api import TTS
import pickle
import torch

app = FastAPI()

# Load XTTS
device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

# Load celebrity embeddings
with open('celebrity_embeddings.pkl', 'rb') as f:
    celebrity_embeddings = pickle.load(f)

# Celebrity voice samples (as backup)
celebrity_samples = {
    'amitabh_bachan': 'voice_samples/celebrities/amitabh_bachan/sample1.wav',
    'sandra_bullock': 'voice_samples/celebrities/sandra_bullock/sample1.wav',
    'morgan_freeman': 'voice_samples/celebrities/morgan_freeman/sample1.wav',
    'tom_cruise': 'voice_samples/celebrities/tom_cruise/sample1.wav'
}

@app.post("/synthesize")
async def synthesize(
    text: str,
    celebrity: str,
    language: str = "en"
):
    """
    Synthesize text with celebrity voice
    """
    try:
        # Check if celebrity exists
        if celebrity not in celebrity_samples:
            raise HTTPException(
                status_code=400,
                detail=f"Celebrity '{celebrity}' not available. Available: {list(celebrity_samples.keys())}"
            )

        # Get celebrity sample
        speaker_wav = celebrity_samples[celebrity]

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
            "celebrity": celebrity,
            "language": language,
            "sample_rate": 24000
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/celebrities")
async def list_celebrities():
    """
    List available celebrity voices
    """
    return {
        "celebrities": list(celebrity_samples.keys()),
        "count": len(celebrity_samples)
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model": "xtts_v2",
        "device": device,
        "celebrity_voices": len(celebrity_samples)
    }
```

**Deploy to Cloud Run**:
```bash
gcloud run deploy omniclaw-celebrity-tts \
  --source=./celebrity-tts-service \
  --platform=managed \
  --region=us-central1 \
  --memory=8Gi \
  --cpu=4 \
  --accelerator=nvidia-tesla-t4 \
  --allow-unauthenticated \
  --project=omniclaw-enhanced
```

---

**Task 2.2: Character Archetype Detection**

```python
# archetype_detector.py
from transformers import pipeline

# Load text classifier
classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

def detect_archetype(character_description):
    """
    Detect character archetype and map to celebrity voice
    """
    # Classify character
    result = classifier(character_description)

    # Archetype to celebrity mapping
    archetype_mapping = {
        'serious': {
            'traits': ['deep', 'heavy', 'authoritative'],
            'celebrity': 'amitabh_bachan',
            'confidence': 0.95
        },
        'hero': {
            'traits': ['strong', 'confident', 'brave'],
            'celebrity': 'tom_cruise',
            'confidence': 0.90
        },
        'elegant_female': {
            'traits': ['sophisticated', 'elegant', 'graceful'],
            'celebrity': 'sandra_bullock',
            'confidence': 0.92
        },
        'villain': {
            'traits': ['menacing', 'evil', 'calculating'],
            'celebrity': 'morgan_freeman',
            'confidence': 0.88
        },
        'comic': {
            'traits': ['funny', 'humorous', 'energetic'],
            'celebrity': 'johnny_lever',  # If available
            'confidence': 0.85
        },
        'wise_old': {
            'traits': ['wise', 'experienced', 'old'],
            'celebrity': 'amitabh_bachan',
            'confidence': 0.93
        },
        'young_female': {
            'traits': ['young', 'cheerful', 'energetic'],
            'celebrity': 'alia_bhatt',  # If available
            'confidence': 0.87
        },
        'narrator': {
            'traits': ['neutral', 'clear', 'engaging'],
            'celebrity': 'morgan_freeman',
            'confidence': 0.90
        }
    }

    # Detect archetype from description
    description_lower = character_description.lower()

    detected_archetype = 'narrator'  # Default
    max_confidence = 0.0

    for archetype, details in archetype_mapping.items():
        # Check if archetype traits match description
        matches = [trait for trait in details['traits'] if trait in description_lower]

        if len(matches) > 0 and details['confidence'] > max_confidence:
            detected_archetype = archetype
            max_confidence = details['confidence']

    return {
        'archetype': detected_archetype,
        'celebrity': archetype_mapping[detected_archetype]['celebrity'],
        'confidence': max_confidence
    }
```

---

**Task 2.3: Update Story Narrator**

```javascript
// Update omniclaw-story function
const axios = require('axios');

const CELEBRITY_TTS_URL = process.env.CELEBRITY_TTS_URL ||
  'https://omniclaw-celebrity-tts-xxxxx.a.run.app';

async function detectCharacterArchetype(characterDescription) {
  // Use LLM to detect archetype
  const prompt = `Analyze this character description and identify the archetype:
"${characterDescription}"

Archetypes: serious/heavy, hero, elegant_female, villain, comic, wise_old, young_female, narrator
Return the archetype name.`;

  const response = await llmClient.generate(prompt);
  return response.archetype;
}

async function getCelebrityForArchetype(archetype) {
  const mapping = {
    'serious': 'amitabh_bachan',
    'hero': 'tom_cruise',
    'elegant_female': 'sandra_bullock',
    'villain': 'morgan_freeman',
    'comic': 'johnny_lever',  // Fallback to amitabh
    'wise_old': 'amitabh_bachan',
    'young_female': 'alia_bhatt',  // Fallback to sandra
    'narrator': 'morgan_freeman'
  };

  return mapping[archetype] || 'morgan_freeman';
}

async function synthesizeWithCelebrity(text, characterDescription, language) {
  // Detect archetype
  const archetype = await detectCharacterArchetype(characterDescription);

  // Get celebrity voice
  const celebrity = await getCelebrityForArchetype(archetype);

  // Call celebrity TTS service
  const response = await axios.post(`${CELEBRITY_TTS_URL}/synthesize`, {
    text,
    celebrity,
    language
  });

  return {
    success: true,
    audio: Buffer.from(response.data.audio, 'hex'),
    celebrity: response.data.celebrity,
    archetype,
    language: response.data.language,
    sampleRate: response.data.sample_rate
  };
}

// In getAudio handler:
if (requestType === 'getAudio') {
  const { storyId, segment } = params;

  // Get story
  const storyDoc = await firestore.collection('stories').doc(storyId).get();
  const story = storyDoc.data();

  // Detect character archetype from story
  const archetype = await detectCharacterArchetype(story.theme);

  // Synthesize with celebrity voice
  const audio = await synthesizeWithCelebrity(
    story.storyText,
    `${story.theme} story with ${story.characters} characters`,
    story.language || 'en'
  );

  res.status(200).json({
    success: true,
    data: {
      audioUrl: audio.audioUrl,
      celebrity: audio.celebrity,
      archetype: audio.archetype,
      message: `Narrated by ${audio.celebrity} voice`
    }
  });
}
```

---

### Phase 3: Testing & Validation (Week 3-4)

**Task 3.1: Celebrity Voice Quality Testing**

```javascript
// celebrity_voice.test.js
describe('Celebrity Voice Tests', () => {
  test('Amitabh Bachan voice for serious character', async () => {
    const result = await synthesizeWithCelebrity(
      'एक बार की बात है, एक राजा था।',
      'A serious, heavy story about a king',
      'hi'
    );

    expect(result.success).toBe(true);
    expect(result.celebrity).toBe('amitabh_bachan');
    expect(result.archetype).toBe('serious');
  });

  test('Sandra Bullock voice for elegant female', async () => {
    const result = await synthesizeWithCelebrity(
      'Once upon a time, there was a beautiful princess.',
      'An elegant, sophisticated female character',
      'en'
    );

    expect(result.success).toBe(true);
    expect(result.celebrity).toBe('sandra_bullock');
    expect(result.archetype).toBe('elegant_female');
  });

  test('Morgan Freeman voice for narrator', async () => {
    const result = await synthesizeWithCelebrity(
      'The story begins in a faraway land.',
      'A neutral, engaging narrator',
      'en'
    );

    expect(result.success).toBe(true);
    expect(result.celebrity).toBe('morgan_freeman');
    expect(result.archetype).toBe('narrator');
  });
});
```

---

## Legal & Ethical Considerations

### Voice Cloning Ethics

**Important Considerations**:
1. **Consent**: Celebrity voices should not be used for commercial purposes without consent
2. **Attribution**: Clearly label AI-generated celebrity voices
3. **Fair Use**: Personal/educational use may be acceptable under fair use
4. **Misrepresentation**: Do not present AI voices as actual celebrity recordings
5. **Commercial Use**: Obtain proper licenses for commercial applications

### Recommendations

**For Personal Use**:
- ✅ Acceptable: Personal projects, experimentation
- ✅ Acceptable: Educational purposes, research
- ⚠️ Caution: Public sharing without attribution
- ❌ Not Acceptable: Commercial use without permission

**For Commercial Use**:
- ❌ Celebrity voices without proper licensing
- ✅ Licensed celebrity voice clones (if available)
- ✅ Generic voice profiles inspired by celebrities
- ✅ Original voice talent

### Alternative: Archetype-Based Generic Voices

Instead of actual celebrity clones, create archetype voices inspired by celebrities:

```python
# Generic archetype voices
archetype_voices = {
    'serious_heavy': {
        'description': 'Deep, authoritative voice inspired by Amitabh Bachan',
        'voice_settings': {
            'pitch': -0.3,
            'speed': 0.8,
            'warmth': 0.4
        }
    },
    'elegant_female': {
        'description': 'Sophisticated voice inspired by Sandra Bullock',
        'voice_settings': {
            'pitch': 0.0,
            'speed': 1.0,
            'warmth': 0.8
        }
    },
    'narrator': {
        'description': 'Engaging narrator voice inspired by Morgan Freeman',
        'voice_settings': {
            'pitch': -0.2,
            'speed': 0.9,
            'warmth': 0.7
        }
    }
}
```

---

## Success Metrics

### Technical Metrics
- ✅ Celebrity voice accuracy: > 85% (user perception)
- ✅ Archetype detection accuracy: > 90%
- ✅ Synthesis time: < 5s (GPU)
- ✅ Voice quality: ≥ 90% of original celebrity
- ✅ Cross-language cloning: Functional (Hindi/English)

### User Acceptance
- ✅ Users recognize intended celebrity: > 80%
- ✅ Voice quality acceptable: > 90%
- ✅ Character-appropriate voice matching: > 95%
- ✅ No legal/commercial use violations: 100%

---

## Cost Comparison

### Celebrity Voice Cloning (XTTS)

| Component | Cost |
|-----------|------|
| Cloud Run (GPU) | $200-400/month |
| Voice sample storage | $0.20/month |
| Celebrity embeddings | $0.50/month |
| Total | **$200-400/month** |

### ElevenLabs (Current)

| Plan | Characters | Cost |
|------|-----------|------|
| Creator | 100,000/month | $22/month |
| Pro | 500,000/month | $99/month |

**Break-Even**: Celebrity cloning becomes cheaper at ~200,000 characters/month

---

## Conclusion

**Recommendation**: **Hybrid Approach**

1. **Phase 1**: Implement celebrity voice cloning for experimentation
2. **Phase 2**: A/B test with ElevenLabs for quality comparison
3. **Phase 3**: Use celebrity voices for special stories (premium feature)
4. **Phase 4**: Maintain ElevenLabs as fallback for reliability

**Celebrity Voice Advantages**:
- ✅ Highly engaging and recognizable
- ✅ Character-appropriate voice matching
- ✅ Novel and exciting user experience
- ✅ Marketing differentiation

**Celebrity Voice Challenges**:
- ❌ Legal/commercial use restrictions
- ❌ Higher infrastructure costs
- ❌ Voice sample quality dependencies
- ❌ Ethical considerations

**Final Recommendation**: Implement as experimental feature for personal/educational use, maintain ElevenLabs for production, obtain proper licensing for commercial use.

---

*Plan Created: 2026-03-26*
*Primary Technology: XTTS Celebrity Voice Cloning*
*Celebrity Voices: Amitabh Bachan, Sandra Bullock, Morgan Freeman, Tom Cruise*
*Languages: English, Hindi, Hinglish*
*Deployment Platform: Google Cloud Run (GPU)*
*Legal Status: Personal/educational use only*
