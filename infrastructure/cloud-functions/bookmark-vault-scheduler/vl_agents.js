/**
 * VL Agent - Parallel Bookmark Processor
 *
 * Parallel agents that process bookmarks in chunks using AI
 * and add vlTags, vlSubject, vlStyle, vlMood for vault search
 *
 * Usage: node vl_agents.js [agent_id] [start_index] [end_index]
 * Example: node vl_agents.js 1 0 500
 */

const fs = require('fs');
const path = require('path');

const AGENT_ID = process.argv[2] || '1';
const START_INDEX = parseInt(process.argv[3]) || 0;
const END_INDEX = parseInt(process.argv[4]) || 500;

const AGENT_NAME = `vl_agent_${AGENT_ID}`;

// Configuration
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507';
const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const USE_GROQ = process.env.AI_PROVIDER === 'groq';
const DATA_PATH = process.env.VAULT_PATH || path.join(__dirname, '..', '..', 'data', 'twitter_bookmarks_automated.json');
const LOCK_PATH = DATA_PATH + '.lock';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasVlTags(post) {
  if (!post) return false;
  if (Array.isArray(post.vlTags)) return post.vlTags.length > 0;
  return Boolean(post.vlTags);
}

function sanitizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function sanitizeArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean)));
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(candidate);
  } catch (_) {}
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function normalizeAnalysis(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    tags: sanitizeArray(payload.tags),
    subject: sanitizeString(payload.subject),
    style: sanitizeString(payload.style),
    mood: sanitizeString(payload.mood),
    search_terms: sanitizeArray(payload.search_terms)
  };
}

async function callAI(post, index) {
  const text = sanitizeString(post.text || post.caption || '', '');
  const author = sanitizeString(post.author || '', '');
  const url = sanitizeString(post.url || post.permalink || '', '');

  const prompt = [
    'Analyze this social media post and return STRICT JSON only.',
    'Extract fields:',
    '- tags: 5-10 relevant keywords',
    '- subject: main topic',
    '- style: content style (e.g., tutorial, news, opinion, humor)',
    '- mood: tone/feeling (e.g., informative, inspirational, humorous)',
    '- search_terms: 5 likely search queries',
    '',
    'Post details:',
    'text: ' + (text.slice(0, 500) || 'none'),
    'author: ' + (author || 'none'),
    'url: ' + (url || 'none'),
    '',
    'Return JSON: {"tags":[],"subject":"","style":"","mood":"","search_terms":[]}'
  ].join('\n');

  const apiKey = USE_GROQ ? GROQ_KEY : CEREBRAS_KEY;
  const model = USE_GROQ ? GROQ_MODEL : CEREBRAS_MODEL;
  const apiUrl = USE_GROQ ? GROQ_URL : CEREBRAS_URL;

  if (!apiKey) {
    console.error('[' + AGENT_NAME + '] No API key configured');
    return fallbackAnalysis(post);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a strict JSON generator for content tagging. Output JSON only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.2
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error('HTTP ' + response.status);
        await sleep(700 * attempt);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const parsed = extractJson(content);
      const normalized = normalizeAnalysis(parsed);

      if (!normalized) {
        lastError = new Error('Unable to parse JSON');
        await sleep(400 * attempt);
        continue;
      }

      if (normalized.search_terms.length === 0 && normalized.tags.length > 0) {
        normalized.search_terms = normalized.tags.slice(0, 5);
      }

      return normalized;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      await sleep(700 * attempt);
    }
  }

  console.error('[' + AGENT_NAME + '] AI failed for index ' + index + ': ' + (lastError?.message || 'unknown'));
  return null;
}

function fallbackAnalysis(post) {
  const text = (post.text || post.caption || '').toLowerCase();
  const tags = [];

  // Simple keyword extraction
  if (/ai|ml|machine.?learning/.test(text)) tags.push('AI/ML');
  if (/code|programming|developer|software/.test(text)) tags.push('Programming');
  if (/startup|entrepreneur|business/.test(text)) tags.push('Business');
  if (/news|breaking|update|announcement/.test(text)) tags.push('News');
  if (/tutorial|how|guide|learn/.test(text)) tags.push('Tutorial');
  if (/opinion|thoughts|perspective/.test(text)) tags.push('Opinion');

  return {
    tags: tags.slice(0, 8),
    subject: '',
    style: /tutorial|how|guide/.test(text) ? 'tutorial' : /news|announcement/.test(text) ? 'news' : 'general',
    mood: 'informative',
    search_terms: tags.slice(0, 5)
  };
}

async function acquireLock() {
  while (true) {
    try {
      fs.mkdirSync(LOCK_PATH);
      fs.writeFileSync(path.join(LOCK_PATH, 'owner.txt'), AGENT_NAME + ' pid=' + process.pid + ' ts=' + Date.now());
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const stat = fs.statSync(LOCK_PATH);
        if (Date.now() - stat.mtimeMs > 15 * 60 * 1000) {
          fs.rmSync(LOCK_PATH, { recursive: true, force: true });
          continue;
        }
      } catch (_) {}
      await sleep(120 + Math.floor(Math.random() * 180));
    }
  }
}

function releaseLock() {
  try {
    fs.rmSync(LOCK_PATH, { recursive: true, force: true });
  } catch (_) {}
}

async function saveRange(localData, changedIndices, reason) {
  if (changedIndices.size === 0) return;
  await acquireLock();
  try {
    const diskData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    for (const idx of changedIndices) {
      if (idx >= 0 && idx < diskData.length) {
        diskData[idx] = localData[idx];
      }
    }
    const tmpPath = DATA_PATH + '.' + AGENT_NAME + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(diskData, null, 2));
    fs.renameSync(tmpPath, DATA_PATH);
    console.log('[' + AGENT_NAME + '] Saved ' + changedIndices.size + ' changes (' + reason + ')');
  } finally {
    releaseLock();
  }
}

async function main() {
  console.log('[' + AGENT_NAME + '] Starting range ' + START_INDEX + '-' + END_INDEX);

  if (!fs.existsSync(DATA_PATH)) {
    console.error('[' + AGENT_NAME + '] Data file not found: ' + DATA_PATH);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const upperBound = Math.min(END_INDEX, data.length);

  const candidates = [];
  for (let i = START_INDEX; i < upperBound; i++) {
    const post = data[i];
    if (post && !hasVlTags(post)) {
      candidates.push(i);
    }
  }

  console.log('[' + AGENT_NAME + '] Candidates without vlTags: ' + candidates.length);

  let processed = 0;
  let success = 0;
  let failed = 0;
  const pendingChanges = new Set();

  for (const idx of candidates) {
    const post = data[idx];
    processed++;

    const analysis = await callAI(post, idx);
    if (analysis) {
      post.vlTags = analysis.tags;
      post.vlSubject = analysis.subject;
      post.vlStyle = analysis.style;
      post.vlMood = analysis.mood;
      post.searchTerms = analysis.search_terms;
      post.search_terms = analysis.search_terms;
      pendingChanges.add(idx);
      success++;
      console.log('[' + AGENT_NAME + '] [' + processed + '/' + candidates.length + '] idx=' + idx + ' tags=' + post.vlTags.slice(0, 4).join(', '));
    } else {
      failed++;
      console.log('[' + AGENT_NAME + '] [' + processed + '/' + candidates.length + '] idx=' + idx + ' FAILED');
    }

    if (processed % 50 === 0) {
      await saveRange(data, pendingChanges, 'batch-save');
      pendingChanges.clear();
    }

    await sleep(300);
  }

  await saveRange(data, pendingChanges, 'final');
  console.log('[' + AGENT_NAME + '] Done. processed=' + processed + ' success=' + success + ' failed=' + failed);
}

main().catch((error) => {
  console.error('[' + AGENT_NAME + '] Fatal:', error);
  process.exit(1);
});
