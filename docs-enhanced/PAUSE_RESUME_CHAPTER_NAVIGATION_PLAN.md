# OmniClaw Enhanced - Pause/Resume & Chapter Navigation Implementation Plan

**Date**: 2026-03-26
**Feature**: Story Playback Control with Chapter Navigation
**Status**: 📋 Planning Phase

---

## User Requirements

1. **Pause Capability**: Pause story playback at any point
2. **Resume Capability**: Resume from where playback was paused
3. **Chapter Navigation**: Jump to any chapter or section
4. **Progress Tracking**: Remember playback position across sessions
5. **Bookmarking**: Save favorite positions in stories

---

## Current Architecture

```
Story Generation → TTS Synthesis → Audio Playback (Linear)
                    ↓
                No pause/resume
                No chapter navigation
                No progress tracking
```

---

## Enhanced Architecture

```
Story Generation → TTS Synthesis → Audio Segmentation → Playback Control
                                      ↓
                                 Segment Metadata
                                 - Chapter markers
                                 - Playback position
                                 - Duration
                                 - Character voice
                                 ↓
                            Firestore Storage
```

---

## Implementation Plan

### Phase 1: Story Segmentation (Week 1)

**Objective**: Break stories into logical segments

**Approach**:
1. **Automatic Segmentation**: Split stories by sentences/paragraphs
2. **Chapter Detection**: Identify chapter boundaries
3. **Metadata Storage**: Store segment information in Firestore

**Data Model**:
```javascript
{
  storyId: "story123",
  userId: "user@example.com",
  theme: "adventure",
  mood: "exciting",
  language: "english",
  createdAt: "2026-03-26T...",
  status: "ready",

  // New fields for segmentation
  chapters: [
    {
      chapterId: "ch1",
      title: "The Beginning",
      startSegment: 1,
      endSegment: 10,
      duration: 45.2,
      summary: "Introduction to the hero's journey"
    },
    {
      chapterId: "ch2",
      title: "The Challenge",
      startSegment: 11,
      endSegment: 25,
      duration: 78.5,
      summary: "Hero faces first obstacle"
    }
  ],

  segments: [
    {
      segmentId: "seg1",
      chapterId: "ch1",
      sequence: 1,
      text: "Once upon a time...",
      character: "narrator",
      duration: 3.2,
      audioUrl: "gs://stories/story123/seg1.mp3",
      metadata: {
        emotion: "neutral",
        speaker: "narrator",
        timestamp: "00:00"
      }
    }
  ],

  // Playback state
  playbackState: {
    currentSegment: 5,
    currentPosition: 12.3, // seconds into segment
    lastPlayed: "2026-03-26T...",
    status: "paused" // playing, paused, completed
  }
}
```

**Segmentation Algorithm**:
```javascript
function segmentStory(storyText) {
  // Split into paragraphs
  const paragraphs = storyText.split(/\n\n+/);

  const segments = [];
  let sequence = 1;

  paragraphs.forEach((paragraph, index) => {
    // Split long paragraphs into sentences
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

    sentences.forEach(sentence => {
      // Create segment for each sentence
      segments.push({
        segmentId: `seg${sequence}`,
        chapterId: `ch${Math.floor(index / 5) + 1}`, // Approximate chapters
        sequence: sequence++,
        text: sentence.trim(),
        estimatedDuration: sentence.length * 0.08 // 80ms per character
      });
    });
  });

  return segments;
}
```

---

### Phase 2: Playback State Management (Week 1)

**Objective**: Track and persist playback position

**Firestore Collection**:
```
playback_state/{userId}/{storyId}
{
  currentSegment: 5,
  currentPosition: 12.3,
  totalDuration: 245.7,
  status: "paused",
  lastUpdated: "2026-03-26T...",
  bookmarks: [
    {
      name: "Favorite scene",
      segment: 12,
      position: 5.2,
      createdAt: "2026-03-26T..."
    }
  ]
}
```

**API Endpoints**:
1. **GET /getState** - Get current playback state
2. **POST /pause** - Pause playback, save position
3. **POST /resume** - Resume from saved position
4. **POST /seek** - Seek to specific position
5. **POST /bookmark** - Save bookmark
6. **GET /bookmarks** - List all bookmarks

---

### Phase 3: Chapter Navigation (Week 2)

**Objective**: Enable jumping to any chapter

**Chapter Detection Logic**:
```javascript
function detectChapters(storyText) {
  const chapters = [];
  const chapterMarkers = [
    /Chapter \d+/gi,
    /Part \d+/gi,
    /^\d+\.\s+/gm,  // "1. Introduction"
    /\*\*.*?\*\*/g,  // **Chapter Title**
    /---+[^-]+---+/g  // --- Chapter Name ---
  ];

  let currentChapter = { segments: [], title: "Introduction" };
  let chapterNumber = 1;

  // Split story into segments
  const segments = segmentStory(storyText);

  segments.forEach((segment, index) => {
    // Check if segment starts a new chapter
    const isNewChapter = chapterMarkers.some(marker =>
      segment.text.match(marker)
    );

    if (isNewChapter && currentChapter.segments.length > 0) {
      chapters.push({
        ...currentChapter,
        chapterId: `ch${chapterNumber++}`,
        startSegment: currentChapter.segments[0].sequence,
        endSegment: currentChapter.segments[currentChapter.segments.length - 1].sequence
      });
      currentChapter = { segments: [], title: extractTitle(segment.text) };
    }

    currentChapter.segments.push(segment);
  });

  // Add last chapter
  if (currentChapter.segments.length > 0) {
    chapters.push({
      ...currentChapter,
      chapterId: `ch${chapterNumber}`,
      startSegment: currentChapter.segments[0].sequence,
      endSegment: currentChapter.segments[currentChapter.segments.length - 1].sequence
    });
  }

  return chapters;
}
```

---

### Phase 4: Audio Storage & Streaming (Week 2)

**Objective**: Store segmented audio for efficient playback

**Cloud Storage Structure**:
```
gs://stories/
  {storyId}/
    metadata.json           # Story metadata and chapters
    segments/
      seg1.mp3             # Segment 1 audio
      seg2.mp3             # Segment 2 audio
      ...
    chapters/
      ch1.mp3              # Chapter 1 (concatenated segments)
      ch2.mp3              # Chapter 2 (concatenated segments)
```

**Streaming Endpoint**:
```javascript
// GET /streamSegment?storyId=xxx&segment=5
app.get('/streamSegment', async (req, res) => {
  const { storyId, segment } = req.query;

  // Get segment metadata
  const segmentData = await getSegment(storyId, segment);

  // Stream audio from Cloud Storage
  const audioStream = storage.bucket('stories')
    .file(`${storyId}/segments/seg${segment}.mp3`)
    .createReadStream();

  // Set headers for streaming
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', segmentData.size);

  // Pipe audio to response
  audioStream.pipe(res);

  // Update playback state in background
  await updatePlaybackState(storyId, {
    currentSegment: segment,
    status: 'playing'
  });
});
```

---

### Phase 5: Alexa Integration (Week 2)

**Objective**: Add voice commands for pause/resume/navigation

**Alexa Voice Commands**:
1. "Alexa, pause" → Pause story playback
2. "Alexa, resume" → Resume playback
3. "Alexa, next chapter" → Jump to next chapter
4. "Alexa, previous chapter" → Jump to previous chapter
5. "Alexa, go to chapter 2" → Jump to specific chapter
6. "Alexa, bookmark this" → Save current position
7. "Alexa, resume from bookmark" → Load bookmark

**Intent Handlers**:
```javascript
const PlayNarratorIntent = {
  canHandle(handlerInput) {
    return handlerInput.request.intent.name === 'PlayNarratorIntent';
  },

  handle(handlerInput) {
    const { storyId, chapter, position } = handlerInput.request.intent.slots;

    // Resume playback
    return playStory(storyId, { chapter, position });
  }
};

const PauseNarratorIntent = {
  canHandle(handlerInput) {
    return handlerInput.request.intent.name === 'AMAZON.PauseIntent';
  },

  handle(handlerInput) {
    const { storyId } = handlerInput.request.intent.slots;

    // Pause playback, save position
    return pauseStory(storyId);
  }
};

const NextChapterIntent = {
  canHandle(handlerInput) {
    return handlerInput.request.intent.name === 'NextChapterIntent';
  },

  handle(handlerInput) {
    const { storyId } = handlerInput.request.intent.slots;

    // Get current chapter, go to next
    return nextChapter(storyId);
  }
};

const GoToChapterIntent = {
  canHandle(handlerInput) {
    return handlerInput.request.intent.name === 'GoToChapterIntent';
  },

  handle(handlerInput) {
    const { storyId, chapterNumber } = handlerInput.request.intent.slots;

    // Jump to specific chapter
    return goToChapter(storyId, chapterNumber);
  }
};
```

---

## API Specification

### 1. Get Playback State

```http
GET /getState?storyId={storyId}&userId={userId}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "storyId": "story123",
    "currentSegment": 5,
    "currentPosition": 12.3,
    "totalSegments": 25,
    "totalDuration": 245.7,
    "status": "paused",
    "currentChapter": {
      "chapterId": "ch1",
      "title": "The Beginning",
      "progress": "45%"
    }
  }
}
```

### 2. Pause Playback

```http
POST /pause
Content-Type: application/json

{
  "storyId": "story123",
  "userId": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "savedPosition": {
      "segment": 5,
      "position": 12.3,
      "timestamp": "2026-03-26T07:45:00Z"
    },
    "message": "Playback paused. Position saved."
  }
}
```

### 3. Resume Playback

```http
POST /resume
Content-Type: application/json

{
  "storyId": "story123",
  "userId": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "resumingFrom": {
      "segment": 5,
      "position": 12.3,
      "chapter": "ch1"
    },
    "audioUrl": "https://omniclaw-enhanced.storage.googleapis.com/stories/story123/segments/seg5.mp3",
    "message": "Resuming from Chapter 1 (12.3s)"
  }
}
```

### 4. Seek to Position

```http
POST /seek
Content-Type: application/json

{
  "storyId": "story123",
  "chapter": 2,
  "segment": 12,
  "position": 0
}
```

### 5. List Chapters

```http
GET /chapters?storyId={storyId}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "chapterId": "ch1",
        "title": "The Beginning",
        "startSegment": 1,
        "endSegment": 10,
        "duration": 45.2,
        "progress": "0%"
      },
      {
        "chapterId": "ch2",
        "title": "The Challenge",
        "startSegment": 11,
        "endSegment": 25,
        "duration": 78.5,
        "progress": "18%"
      }
    ],
    "totalChapters": 8,
    "totalDuration": 245.7
  }
}
```

### 6. Create Bookmark

```http
POST /bookmark
Content-Type: application/json

{
  "storyId": "story123",
  "userId": "user@example.com",
  "name": "Favorite scene",
  "segment": 12,
  "position": 5.2
}
```

---

## Implementation Tasks

### Task 1: Story Segmentation System
- [ ] Implement `segmentStory()` function
- [ ] Implement `detectChapters()` function
- [ ] Update story generation to create segments
- [ ] Store segment metadata in Firestore

### Task 2: Playback State Management
- [ ] Create Firestore collection for playback state
- [ ] Implement `pausePlayback()` function
- [ ] Implement `resumePlayback()` function
- [ ] Implement `seekToPosition()` function

### Task 3: Chapter Navigation
- [ ] Implement `listChapters()` endpoint
- [ ] Implement `goToChapter()` function
- [ ] Implement `nextChapter()` function
- [ ] Implement `previousChapter()` function

### Task 4: Audio Storage
- [ ] Create Cloud Storage bucket structure
- [ ] Implement segmented audio storage
- [ ] Implement `streamSegment()` endpoint
- [ ] Add audio concatenation for chapters

### Task 5: Alexa Voice Commands
- [ ] Add pause intent handler
- [ ] Add resume intent handler
- [ ] Add chapter navigation intents
- [ ] Add bookmark intents
- [ ] Update interaction model

### Task 6: Testing
- [ ] Unit tests for segmentation
- [ ] Integration tests for playback control
- [ ] E2E tests with Alexa device
- [ ] Performance testing for streaming

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Segmentation | 3-4 days | None |
| Phase 2: State Management | 2-3 days | Phase 1 |
| Phase 3: Chapter Navigation | 2-3 days | Phase 1 |
| Phase 4: Audio Storage | 3-4 days | Phase 1 |
| Phase 5: Alexa Integration | 2-3 days | Phase 2, 3 |
| Phase 6: Testing | 2-3 days | All above |

**Total Timeline**: 14-20 days (3-4 weeks)

---

## Technical Considerations

### Performance
- **Audio Segmentation**: <1s for typical story
- **State Persistence**: <100ms (Firestore)
- **Chapter Detection**: <500ms
- **Streaming Latency**: <200ms

### Storage Costs
- **Firestore**: $0.18/GB per month
- **Cloud Storage**: $0.026/GB per month
- **Estimated**: $1-5/month for 100 stories

### Scalability
- **Concurrent Users**: 100+ with Cloud Functions Gen 2
- **Story Length**: Up to 1 hour (2000+ segments)
- **Audio Quality**: 24kHz, mono, MP3 (128kbps)

---

## Success Metrics

- ✅ Pause works correctly (position saved)
- ✅ Resume restores exact position
- ✅ Chapter navigation works (next/prev/jump)
- ✅ Bookmarks can be created and retrieved
- ✅ Alexa voice commands work
- ✅ Streaming audio has no buffering issues
- ✅ State persists across sessions

---

## Next Steps

1. **Review Plan**: Approve implementation approach
2. **Start Phase 1**: Implement story segmentation
3. **Progressive Enhancement**: Add features incrementally
4. **Continuous Testing**: Validate after each phase
5. **User Feedback**: Test pause/resume UX

---

*Plan Created: 2026-03-26*
*Feature: Pause/Resume & Chapter Navigation*
*Estimated Timeline: 3-4 weeks*
*Priority: High (User Request)*
*Dependencies: Celebrity Voice Integration (Complete)*
