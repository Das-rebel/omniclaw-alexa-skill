/**
 * Story Narrator - Restored Version
 * Multi-character voice synthesis storytelling
 */
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Load demo stories
const demoStories = [
  { id: 1, title: 'The Adventure Begins', genre: 'fantasy', content: 'Once upon a time in a land far away...' },
  { id: 2, title: 'The Mystery', genre: 'mystery', content: 'The detective arrived at the old mansion...' },
  { id: 3, title: 'The Journey', genre: 'sci-fi', content: 'Humanity set forth to explore the stars...' }
];

// Character voices
const voices = {
  narrator: { name: 'Narrator', voice: 'neutral' },
  hero: { name: 'Hero', voice: 'brave' },
  villain: { name: 'Villain', voice: 'dark' },
  wise: { name: 'Wise Elder', voice: 'calm' }
};

// Load stories from stories/ directory if available
function loadStories() {
  const storiesDir = path.join(__dirname, 'stories');
  if (fs.existsSync(storiesDir)) {
    try {
      const files = fs.readdirSync(storiesDir);
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const story = require(path.join(storiesDir, file));
          if (story && story.id) demoStories.push(story);
        }
      });
    } catch (e) {
      console.log('Could not load stories:', e.message);
    }
  }
  return demoStories;
}

// Router
const router = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (pathname === '/health') {
    res.end(JSON.stringify({ status: 'healthy', service: 'story-narrator' }));
  } 
  else if (pathname === '/stories' || pathname === '/') {
    const stories = loadStories();
    res.end(JSON.stringify({ stories, count: stories.length }));
  }
  else if (pathname === '/voices') {
    res.end(JSON.stringify({ voices }));
  }
  else if (pathname.match(/^\/stories\/(\d+)$/)) {
    const id = parseInt(pathname.match(/^\/stories\/(\d+)$/)[1]);
    const story = loadStories().find(s => s.id === id);
    if (story) {
      res.end(JSON.stringify(story));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Story not found' }));
    }
  }
  else if (pathname === '/narrate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { storyId, voice } = JSON.parse(body);
        const story = loadStories().find(s => s.id === storyId);
        if (story) {
          res.end(JSON.stringify({
            success: true,
            narration: story.content,
            voice: voice || 'narrator',
            title: story.title
          }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Story not found' }));
        }
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }
  else {
    res.statusCode = 404;
    res.end(JSON.stringify({ 
      error: 'Not found',
      endpoints: ['/health', '/stories', '/stories/:id', '/voices', '/narrate']
    }));
  }
};

// Load stories and start
loadStories();
console.log(`Story Narrator loaded ${demoStories.length} stories`);

const server = http.createServer(router);
server.listen(PORT, HOST, () => {
  console.log(`Story Narrator running on ${HOST}:${PORT}`);
});
