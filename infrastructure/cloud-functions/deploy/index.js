/**
 * OmniClaw Alexa Bridge - Full OmniClaw 2.0 Integration
 * Includes: AgentOrchestrator, PersonaGenerator, ServiceMesh, StoryOrchestrator
 */

const { getClient, multiProviderQuery, getHealthStatus } = require('./resilient-clients');
const { StoryOrchestrator } = require('./clients/story-orchestrator-wrapper');
const AgentOrchestrator = require('./core/agent_orchestrator');
const ServiceMesh = require('./core/service_mesh');
const PersonaGenerator = require('./shared/persona/persona_generator');
const { ConversationMemory } = require('./shared/memory/conversation-memory');
const { AttentionWeightedMemory } = require('./shared/memory/attention-weighted-memory');
const { TaskGuidedCompressor } = require('./shared/memory/task-guided-compressor');
const KodiClient = require('./clients/kodi_client');
const AutoBookmarkSync = require('./clients/auto_bookmark_sync');

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// GCS Configuration
const GCS_BUCKET = 'omniclaw-knowledge-graph';
const GCS_KG_PATH = 'unified_knowledge_graph.json';

/**
 * Get GCS access token from metadata service (Cloud Run)
 */
function getGCSToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'metadata.google.internal',
      path: '/computeMetadata/v1/instance/service-accounts/default/identity?audience=https://storage.googleapis.com/',
      method: 'GET',
      headers: { 'Metadata-Flavor': 'Google' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Token request failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Upload knowledge graph to GCS using XML API with service account token
 */
async function uploadToGCS(localPath) {
  try {
    // Get access token from metadata service
    const token = await getGCSToken();
    const content = fs.readFileSync(localPath);
    const objectUri = `https://storage.googleapis.com/upload/storage/v1/b/${GCS_BUCKET}/o?uploadType=media&name=${GCS_KG_PATH}`;

    const response = await fetch(objectUri, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': content.length.toString()
      },
      body: content
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GCS upload failed: ${response.status} - ${errorText}`);
    }

    console.log('✅ Knowledge graph uploaded to GCS');
    return true;
  } catch (error) {
    console.error('❌ GCS upload failed:', error.message);
    return false;
  }
}

/**
 * Save knowledge graph locally and sync to GCS
 */
async function saveAndSyncKnowledgeGraph(nodes, relationships) {
  const kgPath = process.env.KG_PATH || path.join(__dirname, '../../data/unified_knowledge_graph.json');
  const kgData = {
    nodes: nodes || [],
    relationships: relationships || [],
    graph: { nodes: nodes || [], relationships: relationships || [] },
    updatedAt: new Date().toISOString()
  };

  // Ensure directory exists
  const dir = path.dirname(kgPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save locally
  fs.writeFileSync(kgPath, JSON.stringify(kgData, null, 2));
  console.log(`💾 Knowledge graph saved: ${kgData.nodes.length} nodes, ${kgData.relationships.length} relationships`);

  // Upload to GCS
  await uploadToGCS(kgPath);

  return kgData;
}

// Initialize OmniClaw 2.0 components
let agentOrchestrator = null;
let serviceMesh = null;
let personaGenerator = null;
let storyOrchestrator = null;
let conversationMemory = null;
let attentionWeightedMemory = null;
let taskGuidedCompressor = null;

function initializeOmniClaw2() {
  if (!agentOrchestrator) {
    console.log('🚀 Initializing OmniClaw 2.0 components...');
    agentOrchestrator = new AgentOrchestrator();
    serviceMesh = new ServiceMesh();
    personaGenerator = new PersonaGenerator();
    conversationMemory = new ConversationMemory();
    attentionWeightedMemory = new AttentionWeightedMemory();
    taskGuidedCompressor = new TaskGuidedCompressor(attentionWeightedMemory);
    console.log('✅ OmniClaw 2.0 components ready');
  }
  return { agentOrchestrator, serviceMesh, personaGenerator, conversationMemory, attentionWeightedMemory, taskGuidedCompressor };
}

function getStoryOrchestrator() {
  if (!storyOrchestrator) {
    // Use original (unprotected) client for full method access
    const { getOriginalClients } = require('./resilient-clients');
    const originalClients = getOriginalClients();
    const aiClient = originalClients.UnifiedAIClient;
    storyOrchestrator = new StoryOrchestrator(aiClient, { language: 'hinglish' });
  }
  return storyOrchestrator;
}

const RANDOM_EXAMPLES = [
  { query: 'play my road trip playlist on Spotify', desc: 'Spotify' },
  { query: 'search Twitter for AI news', desc: 'Twitter' },
  { query: 'tell me a story about a brave knight', desc: 'Story Mode' },
  { query: 'translate "how are you" to Hindi', desc: 'Translator' },
  { query: 'who is Albert Einstein', desc: 'Wikipedia' },
  { query: 'send a WhatsApp message to Rahul saying running late', desc: 'WhatsApp' },
  { query: 'control Kodi and play the last movie', desc: 'Kodi Control' },
  { query: 'search Reddit for programming jokes', desc: 'Reddit' },
  { query: 'narrate the news for me', desc: 'News Reader' }
];

function getRandomExample() {
  return RANDOM_EXAMPLES[Math.floor(Math.random() * RANDOM_EXAMPLES.length)];
}

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hey';
}

/**
 * Auto-detect accent/language from user input text (story theme + setting)
 * Uses script detection + keyword patterns to determine language and regional accent
 * Priority: explicit session > auto-detected > default
 */
/**
 * Auto-detect accent/language from user input text (story theme + setting)
 * Uses script detection + keyword patterns to determine language and regional accent
 * Priority: explicit session > auto-detected > default
 */
/**
 * Auto-detect accent/language from story theme + setting text
 * Priority: script detection > regional keywords > Bengali-exclusionary rules > Hinglish > English accents
 * Uses IndicLID-researched patterns: Bengali-exclusionary for romanized overlap resolution
 */
function detectAccentFromInput(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();

  // === SCRIPT-BASED (instant, 100% reliable) ===
  // Bengali script: U+0980 to U+09FF
  if (/[ঀ-৿]/.test(text)) {
    return /sylhet|assam|bangladesh|dacca/i.test(text)
      ? { lang: 'bengali', accent: 'sylheti', conf: 'high' }
      : { lang: 'bengali', accent: 'kolkata_bengali', conf: 'high' };
  }
  // Gurmukhi script: U+0A00 to U+0A7F
  if (/[਀-੿]/.test(text)) {
    return { lang: 'punjabi', accent: 'punjabi_hindi', conf: 'high' };
  }
  // Devanagari script: U+0900 to U+097F (checked AFTER Bengali/Gurmukhi to avoid misclassification)
  if (/[ऀ-ॿ]/.test(text)) {
    return { lang: 'hindi', accent: 'hindi_pure', conf: 'high' };
  }

  // === REGIONAL KEYWORDS (check BEFORE vocabulary to ensure Hindi regional variants override) ===
  // Punjabi regions
  if (/punjab|punjabi|amritsar|ludhiana|chandigarh/i.test(lower)) {
    return { lang: 'hindi', accent: 'punjabi_hindi', conf: 'high' };
  }
  // Lucknow / Awadhi regions
  if (/lucknow|nawab|awadh|awadhi|lko/i.test(lower)) {
    return { lang: 'hindi', accent: 'lucknow_hindi', conf: 'high' };
  }
  // Delhi / North India
  if (/delhi|dilli|north india|new delhi/i.test(lower)) {
    return { lang: 'hindi', accent: 'delhi_hindi', conf: 'high' };
  }
  // Mumbai / Bollywood
  if (/mumbai|bombay|filmi|bollywood/i.test(lower)) {
    return { lang: 'hinglish', accent: 'hinglish_mumbai', conf: 'high' };
  }
  // Pune / Marathi
  if (/pune|punes|marathi|puneri|maharashtra/i.test(lower)) {
    return { lang: 'hinglish', accent: 'hinglish_pune', conf: 'high' };
  }
  // Sylhet / Bangladesh / Assam (Bengali regions - checked before generic Bengali)
  if (/sylhet|assam|bangladesh|dacca|chittagong|khulna/i.test(lower)) {
    return { lang: 'bengali', accent: 'sylheti', conf: 'high' };
  }

  // === LATIN SCRIPT: BENGALI-EXCLUSIONARY (research-backed approach) ===
  // Bengali-exclusive romanized words (verified not used in standard Hindi romanization)
  // These are the ONLY reliable signal for romanized Bengali vs Hindi separation
  const BEN_WORDS = [
    'ami ',        // I (Bengali, not Hindi)
    'tumi',        // you (Bengali, Hindi uses 'tum')
    'keno',        // why (Hindi uses 'kyun')
    'keu ',        // someone (Hindi uses 'koi')
    'kichu',      // something (Hindi uses 'kuch')
    'bhalo',       // good (Bengali, Hindi uses 'accha' or 'badiya')
    'bhalobasha',  // love (Bengali word, not Hindi)
    'bondhu',      // friend (distinct Bengali spelling)
    'shob ',       // all (Bengali 'shob', Hindi 'sab')
    'shobai',      // everyone (Bengali exclusive)
    'meye',        // girl (Hindi uses 'ladki')
    'chele',       // boy (Hindi uses 'ladka')
    'golpo',       // story (Bengali word)
    'jibon',       // life (Bengali spelling, Hindi 'jeevan')
    'hridoy',      // heart (Bengali spelling)
    'chokh',       // eye (Bengali, Hindi 'aankh')
    'shundor',     // beautiful (Bengali spelling)
    'kono',        // no one (Bengali, Hindi 'koi nahi')
    'alpo',        // few (Bengali)
    'kemon',       // how (Bengali, Hindi 'kaise')
    'onek',        // very (Bengali, Hindi 'bohot')
    'ekhon',       // now (Bengali word)
    'bolchi',      // I say (Bengali present tense)
    'jacch',       // going (Bengali, not Hindi 'jaa')
    'gele',        // went (Bengali 'gele', Hindi 'gaya')
    'hobe',        // will be (Bengali, Hindi 'hoga')
    'hoche',       // is happening (Bengali)
    'somoy',       // time (Bengali word)
    'bhasha',      // language (Bengali spelling)
    'amra',        // we (Bengali, Hindi 'hum')
    'ke ',         // than (Bengali postposition, Hindi 'se')
    'pore',        // after (Bengali, can overlap)
    'pete',        // by (Bengali)
    'theke',       // from (Bengali, Hindi 'se')
    'diye',        // with (Bengali, Hindi 'saath')
    'niye',        // taking (Bengali)
    'shob',        // all (without space, Bengali 'shob' vs Hindi 'sab')
    'na ',         // Bengali question particle at end
  ];

  let benCount = 0;
  for (const w of BEN_WORDS) {
    if (lower.includes(w)) benCount++;
  }

  // 2+ Bengali markers = Bengali
  if (benCount >= 2) {
    return { lang: 'bengali', accent: 'kolkata_bengali', conf: 'high' };
  }
  // Even 1 strong marker = Bengali (use LOW confidence)
  const BEN_STRONG = ['ami ', 'tumi', 'keno', 'bhalo', 'bondhu', 'bolchi', 'jacch', 'gele', 'hobe', 'ekhon', 'somoy', 'kemon', 'onek', 'shundor', 'amra', 'bhalobasha', 'meye', 'chele', 'golpo', 'jibon', 'hridoy', 'chokh', 'shobai', 'shob ', 'kichu', 'keu '];
  for (const w of BEN_STRONG) {
    if (lower.includes(w)) {
      return { lang: 'bengali', accent: 'kolkata_bengali', conf: 'low' };
    }
  }

  // === LATIN SCRIPT: ENGLISH ACCENT DETECTION (before generic Hindi to catch phrases) ===
  const englishAccents = [
    { re: /top of the morning|grand so it is|would ye not|aye that it is/i, accent: 'irish' },
    { re: /whit a tale|och aye|ken ye|braw story|scottish/i, accent: 'scottish' },
    { re: /g day|mate|heaps|she will be right|no worries|good on ya/i, accent: 'australian' },
    { re: /y all|bless your heart|fixin to|I declare|southern/i, accent: 'southern' },
    { re: /splendid|jolly good|quite so|rather remarkable/i, accent: 'british' },
    { re: /ya mon|irie|everyting|we be jammin/i, accent: 'caribbean' },
  ];
  for (const { re, accent } of englishAccents) {
    if (re.test(lower)) return { lang: 'english', accent, conf: 'high' };
  }

  // === LATIN SCRIPT: HINGLISH (English word density + Hindi presence) ===
  // Count English words and Hindi/Bengali common words
  const englishWords = ['movie', 'film', 'song', 'music', 'dance', 'drama', 'game', 'player', 'win', 'lose', 'feeling', 'heart', 'smile', 'dream', 'story', 'tale', 'life', 'love', 'friend', 'time', 'good', 'very', 'totally', 'one', 'two', 'three', 'four', 'five', 'feeling', 'best', 'great', 'awesome', 'nice', 'cool'];
  const hindiWords = ['hai', 'kya', 'kaun', 'kyun', 'kaise', 'kaha', 'ka', 'ki', 'ke', 'ko', 'se', 'pe', 'aur', 'ya', 'na', 'to', 'bhi', 'hi', 'mat', 'ek', 'do', 'teen', 'char', 'panch', 'hai', 'ho', 'hain', 'tha', 'the', 'hoga', 'hogi', 'ja', 'jao', 'aana', 'jaana', 'dekho', ' bolo', 'sun', 'sunna', 'sunni', 'chalo', 'chal', 'karna', 'karo', 'kehta', 'bolna', 'sab', 'kuch', 'koi', 'har', 'accha', 'theek', 'mast', 'zabardast', 'badiya', 'shandaar'];
  const hindiWordCount = hindiWords.filter(w => lower.includes(w)).length;
  const englishWordCount = englishWords.filter(w => lower.includes(w)).length;
  const totalWords = lower.split(/s+/).length;
  const englishRatio = englishWordCount / Math.max(totalWords, 1);

  // Hinglish: English word density >= 30% AND some Hindi words present
  if (englishRatio >= 0.3 && hindiWordCount >= 2) {
    // Already checked regional markers above, so default to Hinglish
    return { lang: 'hinglish', accent: 'hinglish_pune', conf: 'medium' };
  }

  // === LATIN SCRIPT: GENERIC HINDI (only if strong Hindi signal) ===
  if (hindiWordCount >= 5) {
    return { lang: 'hindi', accent: 'hindi_pure', conf: 'medium' };
  }

  return null; // No match — default accent will be used
}



/**
 * Health check endpoint with detailed component status
 */
exports.healthHandler = async (req, res) => {
  const resilienceHealth = getHealthStatus();
  const { agentOrchestrator, serviceMesh, personaGenerator, attentionWeightedMemory } = initializeOmniClaw2();

  let agentMetrics = {};
  let serviceMetrics = {};
  let clientHealth = {};

  try {
    if (agentOrchestrator && agentOrchestrator.getPerformanceMetrics) {
      agentMetrics = agentOrchestrator.getPerformanceMetrics();
    }
  } catch (e) {
    agentMetrics = { error: e.message };
  }

  try {
    if (serviceMesh && serviceMesh.getServiceMetrics) {
      serviceMetrics = serviceMesh.getServiceMetrics();
    }
  } catch (e) {
    serviceMetrics = { error: e.message };
  }

  // Get detailed client health status
  try {
    const { testClientHealth, originalClients } = require('./resilient-clients');
    const clientNames = Object.keys(originalClients);
    const healthPromises = clientNames.map(async (name) => {
      try {
        const healthy = await testClientHealth(name);
        return { name, status: healthy ? 'available' : 'unavailable' };
      } catch (e) {
        return { name, status: 'error', error: e.message };
      }
    });
    const results = await Promise.all(healthPromises);
    results.forEach(r => {
      clientHealth[r.name] = r.status;
    });
  } catch (e) {
    console.error('Client health check error:', e.message);
  }

  // Get service mesh registered services
  let meshServices = [];
  if (serviceMesh && serviceMesh.serviceRegistry) {
    for (const [serviceType, instances] of serviceMesh.serviceRegistry.entries()) {
      for (const [instanceId, instance] of instances.entries()) {
        meshServices.push({
          type: serviceType,
          id: instanceId,
          health: instance.healthStatus,
          requests: instance.metrics.requestCount,
          circuitBreaker: instance.circuitBreaker.state
        });
      }
    }
  }

  const workingClients = Object.entries(clientHealth).filter(([_, s]) => s === 'available').map(([n, _]) => n);
  const unavailableClients = Object.entries(clientHealth).filter(([_, s]) => s !== 'available').map(([n, _]) => n);

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'OmniClaw 2.0 Personal Assistant is operational',
    components: {
      resilience: 'active',
      circuitBreakers: resilienceHealth.circuitBreakers || [],
      clients: {
        total: Object.keys(clientHealth).length,
        working: workingClients.length,
        unavailable: unavailableClients.length,
        available: workingClients,
        unavailableList: unavailableClients
      },
      agentOrchestrator: agentMetrics.system ? 'active' : 'initializing',
      serviceMesh: serviceMetrics.totalServices ? 'active' : 'initializing',
      serviceMeshDetails: {
        totalServices: meshServices.length,
        services: meshServices,
        metrics: serviceMetrics
      },
      personaGenerator: personaGenerator ? 'available' : 'unavailable',
      attentionWeightedMemory: attentionWeightedMemory ? 'active' : 'inactive',
      taskGuidedCompressor: taskGuidedCompressor ? 'active' : 'inactive',
      storyOrchestrator: 'available',
      region: 'asia-south1'
    },
    performance: agentMetrics.system || {},
    serviceHandler: meshServices.length > 0 ? `Mesh managing ${meshServices.length} services` : 'Standalone mode'
  });
};

/**
 * Bookmark sync endpoint for Cloud Scheduler
 * Triggers daily bookmark sync from Instagram and Twitter
 * Also updates the knowledge graph in GCS for vault-search service
 */
exports.syncHandler = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  console.log('🔄 Bookmark sync triggered via Cloud Scheduler');

  try {
    const sync = new AutoBookmarkSync({
      syncInterval: 86400000, // 24 hours - run once
      analysisInterval: 86400000,
      backupInterval: 86400000
    });

    // Perform sync
    const syncResult = await sync.performSync();
    const analysisResult = await sync.performAnalysis();
    const backupResult = await sync.performBackup();

    console.log('🔄 Bookmark sync completed:', {
      sync: syncResult.status,
      analysis: analysisResult.status,
      backup: backupResult.status
    });

    // Convert bookmarks to knowledge graph nodes and upload to GCS
    let kgUpdateResult = null;
    try {
      const kgNodes = [];
      const kgRelationships = [];

      // Process Twitter bookmarks
      if (syncResult.platforms?.twitter?.count > 0) {
        const TwitterScraperClient = require('./clients/twitter_scraper_client');
        const twitterClient = new TwitterScraperClient();
        const twitterBookmarks = await twitterClient.getBookmarks(100).catch(() => []);

        twitterBookmarks.forEach((bm, i) => {
          const nodeId = `twitter_${bm.id || bm.tweet_id || i}`;
          kgNodes.push({
            id: nodeId,
            name: bm.text?.substring(0, 100) || 'Twitter Bookmark',
            type: 'twitter_tweet',
            content: bm.text || '',
            url: bm.url || bm.permalink || '',
            metadata: {
              username: bm.username || bm.author || '',
              likes: bm.likes || bm.like_count || 0,
              retweets: bm.retweets || bm.retweet_count || 0,
              savedAt: bm.saved_at || bm.timestamp || new Date().toISOString(),
              platform: 'twitter'
            }
          });
        });
        console.log(`📚 Added ${twitterBookmarks.length} Twitter bookmarks to KG`);
      }

      // Process Instagram bookmarks
      if (syncResult.platforms?.instagram?.count > 0) {
        const InstagramScraperClient = require('./clients/instagram_scraper_client');
        const instagramClient = new InstagramScraperClient();
        const instagramSaved = await instagramClient.getSavedContent(50).catch(() => []);

        instagramSaved.forEach((item, i) => {
          const nodeId = `instagram_${item.id || item.pk || i}`;
          kgNodes.push({
            id: nodeId,
            name: item.caption?.substring(0, 100) || 'Instagram Saved',
            type: 'instagram_post',
            content: item.caption || '',
            url: item.permalink || item.url || '',
            metadata: {
              mediaType: item.media_type || item.type || 'image',
              likes: item.like_count || 0,
              comments: item.comments_count || 0,
              savedAt: item.timestamp || new Date().toISOString(),
              platform: 'instagram'
            }
          });
        });
        console.log(`📚 Added ${instagramSaved.length} Instagram posts to KG`);
      }

      // Add entity and topic nodes from existing knowledge graph
      const existingKg = sync.analyzer.knowledgeGraph;
      if (existingKg?.nodes) {
        existingKg.nodes.forEach(node => {
          if (node.type === 'entity' || node.type === 'topic' || node.type === 'category') {
            kgNodes.push(node);
          }
        });
      }
      if (existingKg?.relationships) {
        kgRelationships.push(...existingKg.relationships);
      }

      // Save and sync to GCS
      kgUpdateResult = await saveAndSyncKnowledgeGraph(kgNodes, kgRelationships);
      console.log(`📚 Knowledge graph updated with ${kgNodes.length} nodes`);

    } catch (kgError) {
      console.error('⚠️ Knowledge graph update failed:', kgError.message);
      // Continue - don't fail the whole sync
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        sync: syncResult,
        analysis: analysisResult,
        backup: backupResult,
        knowledgeGraph: kgUpdateResult ? {
          nodes: kgUpdateResult.nodes?.length || 0,
          relationships: kgUpdateResult.relationships?.length || 0,
          gcsUploaded: true
        } : { gcsUploaded: false }
      }
    });
  } catch (error) {
    console.error('❌ Bookmark sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Main Alexa handler with full OmniClaw 2.0 integration
 */
exports.alexaHandler = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const body = req.body || {};

    // Log the request
    console.log('Alexa request received:', {
      version: body.version,
      type: body.request?.type,
      requestId: body.request?.requestId,
      intent: body.request?.intent?.name
    });

    // Handle LaunchRequest
    if (body.request?.type === 'LaunchRequest' || !body.request) {
      const { personaGenerator } = initializeOmniClaw2();
      const example = getRandomExample();
      const timeOfDay = getTimeOfDayGreeting();
      const incomingSessionAttributes = body.session?.attributes || {};

      // Get current persona from session or use default
      const currentPersona = incomingSessionAttributes.currentPersona || 'professional';

      // Get persona-adapted greeting
      let greeting = `${timeOfDay}! I'm OmniClaw 2.0, your personal assistant.`;

      try {
        const persona = await personaGenerator.generatePersona('default_user', {
          timeOfDay,
          context: 'greeting',
          personaType: currentPersona
        });
        if (persona) {
          greeting = await personaGenerator.applyPersonaToResponse(greeting, persona, { context: 'greeting' });
        }
      } catch (e) {
        // Use default greeting
      }

      greeting += ` I can play music on Spotify, control your TV with Kodi, send WhatsApp messages, search Twitter and Reddit, tell you Wikipedia facts, translate languages, and spin epic stories. For example, try saying: "${example.query}" - that's our ${example.desc} feature in action! What can I help you with?`;

      res.json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: greeting
          },
          shouldEndSession: false,
          card: {
            type: 'Simple',
            title: 'OmniClaw 2.0 Personal Assistant',
            content: `Powered by AgentOrchestrator + PersonaGenerator + ServiceMesh | Persona: ${currentPersona}`
          }
        },
        sessionAttributes: {
          lastQuery: '',
          conversationCount: 0,
          lastTopic: '',
          currentPersona: currentPersona,
          version: '2.0'
        }
      });
      return;
    }

    // Handle IntentRequest
    if (body.request?.type === 'IntentRequest') {
      const intentName = body.request.intent?.name;
      const slots = body.request.intent?.slots || {};
      const { agentOrchestrator, personaGenerator, attentionWeightedMemory, taskGuidedCompressor } = initializeOmniClaw2();

      // QueryIntent - Use AgentOrchestrator for intelligent routing
      if (intentName === 'QueryIntent' || intentName === 'AMAZON.HelpIntent') {
        const query = slots.Query?.value || 'general help';
        const sessionId = body.session?.sessionId || 'alexa_session';
        const incomingSessionAttributes = body.session?.attributes || {};

        // Check if this is a translation query - translation detection patterns
        const translatePatterns = [
          /^translate\s+(.+?)\s+to\s+(\w+)$/i,
          /^translate\s+(.+?)\s+in\s+(\w+)$/i,
          /^say\s+(.+?)\s+in\s+(\w+)$/i,
          /^convert\s+(.+?)\s+to\s+(\w+)$/i,
          /^translate\s+to\s+(\w+)\s+(.+)$/i,
          /^say\s+in\s+(\w+)\s+(.+)$/i
        ];

        for (const pattern of translatePatterns) {
          const match = query.match(pattern);
          if (match) {
            const text = match[1] || match[2];
            const targetLang = match[2] || match[1];
            console.log(`[TranslateIntent fallback] Detected translation: "${text}" to "${targetLang}"`);

            try {
              const client = getClient('GoogleTranslateClient', false);
              const translation = await client.translate(text.trim(), targetLang.trim());
              const { personaGenerator } = initializeOmniClaw2();
              const persona = personaGenerator.getCapabilityPersona('TranslateIntent');

              res.json({
                version: '1.0',
                response: {
                  outputSpeech: { type: 'PlainText', text: `${persona.name} (${persona.age}) here. The translation to ${targetLang} is: ${translation}` },
                  shouldEndSession: false
                }
              });
              return;
            } catch (e) {
              console.error('[TranslateIntent fallback] Error:', e.message);
              // Continue to agentOrchestrator if translation fails
            }
          }
        }

        // Get or initialize session attributes
        const conversationCount = (incomingSessionAttributes.conversationCount || 0) + 1;
        const lastTopic = incomingSessionAttributes.lastTopic || query;
        const currentPersona = incomingSessionAttributes.currentPersona || 'professional';

        // Store user message in attention-weighted memory
        attentionWeightedMemory.storeMessage(sessionId, 'user', query, { intent: 'query' });

        // Determine which service handled the request (for logging)
        let serviceHandler = 'agentOrchestrator';
        let compressionStats = null;

        try {
          // Get task-specific compressed context using attention-weighted memory
          const compressedContext = await taskGuidedCompressor.compressForTask(sessionId, query);
          compressionStats = {
            originalMessages: compressedContext.originalCount,
            compressedMessages: compressedContext.compressedCount,
            compressionRatio: compressedContext.compressionRatio,
            tokenCount: compressedContext.tokenCount,
            taskType: taskGuidedCompressor.classifyTask(query)
          };

          // Use agent orchestrator for intelligent processing with compressed context
          const result = await agentOrchestrator.processRequest(query, {
            userId: 'alexa_user',
            sessionId: sessionId,
            intent: 'query',
            usePersona: true,
            conversationHistory: compressedContext.context,
            conversationCount: conversationCount,
            lastTopic: lastTopic,
            personaType: currentPersona
          });

          // Store assistant response in attention-weighted memory
          let responseText = result.response || result.data?.response || result.message || "I'm OmniClaw 2.0";
          attentionWeightedMemory.storeMessage(sessionId, 'assistant', responseText, { serviceUsed: result.serviceUsed });

          // Log which service handled the request
          if (result.serviceUsed) {
            serviceHandler = result.serviceUsed;
            console.log(`Request handled by: ${serviceHandler}`);
          }

          // Apply persona to response using stored persona type
          try {
            const persona = await personaGenerator.generatePersona('alexa_user', {
              query,
              personaType: currentPersona
            });
            responseText = await personaGenerator.applyPersonaToResponse(responseText, persona, { query });
          } catch (e) {
            // Use default response
          }

          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: responseText },
              shouldEndSession: false
            },
            sessionAttributes: {
              lastQuery: query,
              conversationCount: conversationCount,
              lastTopic: lastTopic,
              currentPersona: currentPersona,
              lastServiceHandler: serviceHandler,
              compressionStats: compressionStats,
              version: '2.0'
            }
          });
          return;
        } catch (e) {
          console.error('Agent orchestrator error:', e.message);
          // Fallback to multi-provider query
          try {
            serviceHandler = 'multiProviderQuery';
            const result = await multiProviderQuery(query);
            let responseText = result || "I'm OmniClaw 2.0, ready to help!";

            // Apply persona to fallback response
            try {
              const persona = await personaGenerator.generatePersona('alexa_user', { query, personaType: currentPersona });
              responseText = await personaGenerator.applyPersonaToResponse(responseText, persona, { query });
            } catch (e2) {
              // Use raw response
            }

            // Store fallback response in attention-weighted memory
            attentionWeightedMemory.storeMessage(sessionId, 'assistant', responseText, { fallback: true });

            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: responseText },
                shouldEndSession: false
              },
              sessionAttributes: {
                lastQuery: query,
                conversationCount: conversationCount,
                lastTopic: lastTopic,
                currentPersona: currentPersona,
                lastServiceHandler: serviceHandler,
                version: '2.0'
              }
            });
            return;
          } catch (e2) {
            // Final fallback
          }
        }

        res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: "I'm OmniClaw 2.0, your personal assistant with 19 integrated services. I can help with news, Twitter, Reddit, Wikipedia, translations, stories, and more!"
            },
            shouldEndSession: false
          },
          sessionAttributes: {
            lastQuery: query,
            conversationCount: conversationCount,
            lastTopic: lastTopic,
            currentPersona: currentPersona,
            lastServiceHandler: serviceHandler,
            version: '2.0'
          }
        });
        return;
      }

      // SearchIntent - search news, reddit, twitter
      if (intentName === 'SearchIntent') {
        const searchQuery = slots.SearchQuery?.value || slots.Query?.value;
        const searchSource = slots.Source?.value || 'news';

        if (searchQuery) {
          try {
            let result = '';
            if (searchSource.toLowerCase().includes('twitter')) {
              // Use original (unprotected) client to avoid resilience wrapper issues
              const client = getClient('TwitterClient', false);
              const tweets = await client.searchTweets(searchQuery);
              // Handle both real API response (array) and AI fallback (object with tweets string or array)
              if (tweets.simulated) {
                // AI fallback returns {simulated: true, tweets: "string or array"}
                const tweetText = typeof tweets.tweets === 'string' ? tweets.tweets : (tweets.tweets?.[0] || 'No results');
                result = `Simulated Twitter search for ${searchQuery}: ${tweetText}`;
              } else {
                // Real API response
                const tweetCount = Array.isArray(tweets) ? tweets.length : (tweets?.data?.length || 0);
                result = `Found ${tweetCount} tweets about ${searchQuery}. First one: ${tweets[0]?.text || tweets?.data?.[0]?.text || 'No results'}`;
              }
            } else if (searchSource.toLowerCase().includes('reddit')) {
              // Use original (unprotected) client to avoid resilience wrapper issues
              const client = getClient('RedditClient', false);
              const posts = await client.searchReddit(searchQuery);
              // Handle Reddit response - could be array (real API) or object with simulated string
              if (posts.simulated) {
                // AI fallback returns {simulated: true, posts: "string"}
                result = `Simulated Reddit search for ${searchQuery}: ${posts.posts}`;
              } else {
                // Real API response
                const postArray = posts.posts || posts.data || posts;
                const postCount = Array.isArray(postArray) ? postArray.length : 0;
                result = `Found ${postCount} Reddit posts about ${searchQuery}. First one: ${postArray[0]?.title || 'No results'}`;
              }
            } else {
              // Use original (unprotected) client for News to avoid resilience wrapper issues
              const client = getClient('NewsClient', false);
              const articles = await client.searchNews(searchQuery);
              result = `Found news about ${searchQuery}. ${articles?.news || 'Check the first result for details.'}`;
            }
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: result },
                shouldEndSession: false
              }
            });
            return;
          } catch (e) {
            console.error('Search error:', e.message);
          }
        }
      }

      // TranslateIntent / TranslationIntent (both names)
      if (intentName === 'TranslateIntent' || intentName === 'TranslationIntent') {
        const text = slots.Text?.value || slots.Query?.value;
        const targetLang = slots.Language?.value || 'english';
        const { personaGenerator } = initializeOmniClaw2();
        const persona = personaGenerator.getCapabilityPersona('TranslateIntent');

        if (!text) {
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: `${persona.name} here. Please provide text to translate.` },
              shouldEndSession: false
            }
          });
          return;
        }

        try {
          // Use original (unprotected) client to avoid resilience wrapper transforming errors into objects
          const client = getClient('GoogleTranslateClient', false);
          const translation = await client.translate(text, targetLang);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: `${persona.name} (${persona.age}) here. The translation to ${targetLang} is: ${translation}` },
              shouldEndSession: false
            }
          });
          return;
        } catch (e) {
          console.error('Translation error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: `${persona.name} here. Translation failed: ${e.message}. Please try again.` },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // PersonaIntent - Switch to a different persona/style
      if (intentName === 'PersonaIntent') {
        const personaType = (slots.PersonaType?.value || 'professional').toLowerCase();
        const { personaGenerator } = initializeOmniClaw2();

        // Map common variations to valid template names
        const personaMap = {
          'friendly': 'friendly',
          'warm': 'friendly',
          'casual': 'friendly',
          'professional': 'professional',
          'formal': 'professional',
          'technical': 'technical',
          'expert': 'technical',
          'creative': 'creative',
          'artistic': 'creative',
          'empathetic': 'empathetic',
          'supportive': 'empathetic',
          'fun': 'playful',
          'playful': 'playful',
          'humorous': 'playful'
        };

        const mappedPersona = personaMap[personaType] || 'professional';

        try {
          const persona = await personaGenerator.generatePersona('alexa_user', {
            personaType: mappedPersona
          });

          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: `Switched to ${mappedPersona} persona. I'll be more ${mappedPersona} in my responses from now on.` },
              shouldEndSession: false
            },
            sessionAttributes: {
              currentPersona: mappedPersona
            }
          });
          return;
        } catch (e) {
          console.error('Persona switch error:', e.message);
        }
      }

      // KnowledgeGraphIntent - Search my personal knowledge graph
      if (intentName === 'KnowledgeGraphIntent' || intentName === 'SearchKnowledgeIntent') {
        const query = slots.Query?.value || slots.Topic?.value || slots.SearchQuery?.value;

        if (query) {
          try {
            // Call Vault Cloud Run service via HTTP
            const vaultUrl = process.env.VAULT_SERVICE_URL || 'https://omniclaw-vault-search-338789220059.asia-south1.run.app';

            const response = await fetch(`${vaultUrl}/api/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, options: { maxResults: 5 } })
            });

            const result = await response.json();

            let responseText;
            if (!result.success) {
              responseText = `I had trouble searching your knowledge graph. Please try again.`;
            } else if (result.resultCount === 0) {
              responseText = `I searched your knowledge graph for "${query}" but found no matching results. Try a different search term.`;
            } else {
              const top = result.sources?.[0];
              responseText = `Found ${result.resultCount} results for "${query}" in ${result.responseTime}ms. Top match: ${top?.name || 'result'}.`;
            }

            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: responseText },
                shouldEndSession: false
              },
              sessionAttributes: {
                lastVaultQuery: query,
                vaultResultCount: result.resultCount || 0
              }
            });
            return;
          } catch (e) {
            console.error('Knowledge graph search error:', e.message);
          }
        }
      }

      // WikipediaIntent - Get Wikipedia facts
      if (intentName === 'WikipediaIntent' || intentName === 'WikipediaSearchIntent') {
        const topic = slots.Topic?.value || slots.Query?.value;
        const { personaGenerator } = initializeOmniClaw2();
        const persona = personaGenerator.getCapabilityPersona('WikipediaIntent');
        if (!topic) {
          res.json({
            version: '1.0',
            response: { outputSpeech: { type: 'PlainText', text: `${persona.name} here. What topic would you like me to look up?` }, shouldEndSession: false }
          });
          return;
        }
        try {
          const client = getClient('WikipediaClient', false);
          // Search and get summary directly
          const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'OmniClaw/1.0' },
            signal: AbortSignal.timeout(8000)
          });
          if (response.ok) {
            const data = await response.json();
            res.json({
              version: '1.0',
              response: { outputSpeech: { type: 'PlainText', text: `${persona.name} (${persona.age}) here. ${topic}: ${data.extract || 'No information found.'}` }, shouldEndSession: false }
            });
          } else {
            res.json({
              version: '1.0',
              response: { outputSpeech: { type: 'PlainText', text: `${persona.name} here. I couldn't find information about ${topic}.` }, shouldEndSession: false }
            });
          }
          return;
        } catch (e) {
          console.error('Wikipedia error:', e.message);
          res.json({
            version: '1.0',
            response: { outputSpeech: { type: 'PlainText', text: `${persona.name} here. I couldn't find information about ${topic}.` }, shouldEndSession: false }
          });
          return;
        }
      }

      // NewsIntent
      if (intentName === 'NewsIntent') {
        const { personaGenerator } = initializeOmniClaw2();
        const persona = personaGenerator.getCapabilityPersona('NewsIntent');
        try {
          const client = getClient('NewsClient');
          const newsResult = await client.getHeadlines();
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: `${persona.name} here. Here are the top news headlines: ${newsResult.headlines || newsResult.news || 'Unable to fetch news at this time.'}` },
              shouldEndSession: false
            }
          });
          return;
        } catch (e) {
          console.error('News error:', e.message);
        }
      }

      // StoryIntent - Generate a story with characters
      if (intentName === 'StoryIntent' || intentName === 'TellMeAStoryIntent' || intentName === 'GenerateStoryIntent') {
        const storyTheme = slots.Theme?.value || slots.Topic?.value || 'an adventure in a magical kingdom';
        const storySetting = slots.Setting?.value || 'a mystical land';
        const { personaGenerator } = initializeOmniClaw2();
        const persona = personaGenerator.getCapabilityPersona('GenerateStoryIntent');

        // Override accent from session if user specified a preference (takes priority)
        const incomingSession = body.session?.attributes || {};
        const sessionAccent = incomingSession.preferred_language || incomingSession.accent_style;
        if (sessionAccent) {
          persona.accent_style = incomingSession.accent_style || persona.accent_style;
          persona.preferred_language = incomingSession.preferred_language || persona.preferred_language;
        } else {
          // Auto-detect accent from story theme + setting input text
          const combinedInput = `${storyTheme} ${storySetting}`;
          const detected = detectAccentFromInput(combinedInput);
          if (detected) {
            persona.accent_style = detected.accent;
            persona.preferred_language = detected.language;
            console.log(`[StoryIntent] Auto-detected accent: ${detected.accent} (confidence: ${detected.confidence}) from input: "${combinedInput.substring(0, 60)}..."`);
          }
        }

        try {
          const orchestrator = getStoryOrchestrator();
          // Pass persona as the narrator character for the story (include language/accent fields)
          const story = await orchestrator.autoGenerateStory({
            theme: storyTheme,
            setting: storySetting,
            genre: 'adventure',
            narratorPersona: {
              name: persona.name.split(' ')[0], // e.g., "Willy"
              role: 'storyteller',
              voice: 'willy',
              // Language & accent support
              preferred_language: persona.preferred_language || 'english',
              accent_style: persona.accent_style || 'neutral',
              language_variants: persona.language_variants || null,
              accent_styles: persona.accent_styles || null
            }
          });

          // Build story text from segments
          const storyText = story.segments
            .map(s => s.type === 'narration' ? s.text : `${s.character} says: ${s.text}`)
            .join('. ');

          res.json({
            version: '1.0',
            response: {
              outputSpeech: {
                type: 'PlainText',
                text: `${persona.name} here. Here's your story about ${storyTheme}: ${storyText}. Would you like me to continue the story?`
              },
              shouldEndSession: false,
              card: {
                type: 'Simple',
                title: `Story: ${storyTheme}`,
                content: `Characters: ${story.characters.map(c => c.name).join(', ')}`
              }
            }
          });
          return;
        } catch (e) {
          console.error('Story error:', e.message);
          // Fallback response
          res.json({
            version: '1.0',
            response: {
              outputSpeech: {
                type: 'PlainText',
                text: `Once upon a time, in a magical kingdom, there lived a brave hero. Together with loyal friends, they embarked on an adventure filled with wonder and discovery. The end... or is it just the beginning?`
              },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // SpotifyIntent - Control Spotify playback
      if (intentName === 'SpotifyIntent' || intentName === 'SpotifyPlayIntent' || intentName === 'SpotifySearchIntent' || intentName === 'SpotifyPauseIntent' || intentName === 'SpotifyNextIntent') {
        let action = (slots.Action?.value || slots.Command?.value || '').toLowerCase();
        let query = slots.Query?.value || slots.Track?.value;

        // Handle intent-based actions
        if (intentName === 'SpotifyPauseIntent') action = 'pause';
        if (intentName === 'SpotifyNextIntent') action = 'next';

        // Handle "play <song>" format in query slot
        if (!action && query) {
          const playMatch = query.match(/^(play|search|find)\s+(.+)$/i);
          if (playMatch) {
            action = 'play';
            query = playMatch[2];
          } else if (intentName === 'SpotifyIntent' || intentName === 'SpotifyPlayIntent') {
            // If query exists but no action, default to play
            action = 'play';
          }
        }

        try {
          const client = getClient('SpotifyClient', false);

          // Check if credentials are configured
          if (!client.clientId || !client.clientSecret) {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'Spotify is not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to enable this feature.' },
                shouldEndSession: false
              }
            });
            return;
          }

          if (action === 'play' || action === 'resume') {
            if (query) {
              const tracks = await client.searchTracks(query, 1);
              if (tracks.length > 0) {
                // Get available devices and transfer playback to Echo if needed
                const devicesResult = await client.getAvailableDevices();
                if (!devicesResult.unavailable && devicesResult.devices.length > 0) {
                  const echoDevice = devicesResult.devices.find(d => d.name && d.name.includes('Echo'));
                  if (echoDevice && !echoDevice.is_active) {
                    await client.transferPlayback(echoDevice.id, false);
                    await new Promise(r => setTimeout(r, 500));
                  }
                }
                await client.playTrack(tracks[0].uri);
                res.json({
                  version: '1.0',
                  response: {
                    outputSpeech: { type: 'PlainText', text: `Playing "${tracks[0].name}" by ${tracks[0].artists} on Spotify.` },
                    shouldEndSession: false
                  }
                });
              } else {
                res.json({
                  version: '1.0',
                  response: {
                    outputSpeech: { type: 'PlainText', text: `Could not find "${query}" on Spotify.` },
                    shouldEndSession: false
                  }
                });
              }
            } else {
              await client.resumePlayback();
              res.json({
                version: '1.0',
                response: {
                  outputSpeech: { type: 'PlainText', text: 'Resuming Spotify playback.' },
                  shouldEndSession: false
                }
              });
            }
            return;
          } else if (action === 'pause' || action === 'stop') {
            await client.pausePlayback();
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'Pausing Spotify playback.' },
                shouldEndSession: false
              }
            });
            return;
          } else if (action === 'next' || action === 'skip') {
            await client.nextTrack();
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'Skipping to next track.' },
                shouldEndSession: false
              }
            });
            return;
          }

          // Default - get playback state
          const state = await client.getPlaybackState();
          if (state.track) {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `Currently playing "${state.track.name}" by ${state.track.artists}" on Spotify.` },
                shouldEndSession: false
              }
            });
          } else {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'Nothing is currently playing on Spotify.' },
                shouldEndSession: false
              }
            });
          }
          return;
        } catch (e) {
          console.error('Spotify error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Failed to control Spotify. Please try again.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // YouTubeIntent - Search and get video information
      if (intentName === 'YouTubeIntent') {
        const query = slots.Query?.value;
        const action = (slots.Action?.value || 'search').toLowerCase();

        if (!query) {
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'What would you like me to search on YouTube?' },
              shouldEndSession: false
            }
          });
          return;
        }

        try {
          const client = getClient('YouTubeClient', false);
          const result = await client.searchVideos(query, 5);

          if (result.success && result.videos.length > 0) {
            const firstVideo = result.videos[0];
            const responseText = `Found "${firstVideo.title}" by ${firstVideo.channel}. ${firstVideo.summary}`;

            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: responseText },
                shouldEndSession: false
              }
            });
          } else {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `No YouTube videos found for "${query}".` },
                shouldEndSession: false
              }
            });
          }
          return;
        } catch (e) {
          console.error('YouTube error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Failed to search YouTube. Please try again.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // ArxivIntent - Search academic papers
      if (intentName === 'ArxivIntent' || intentName === 'AcademicIntent') {
        const topic = slots.Topic?.value;
        const { personaGenerator } = initializeOmniClaw2();
        const persona = personaGenerator.getCapabilityPersona('ArxivIntent');

        if (!topic) {
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: `${persona.name} here. What topic would you like me to search for in academic papers?` },
              shouldEndSession: false
            }
          });
          return;
        }

        try {
          const client = getClient('ArxivClient', false);
          const result = await client.searchArxiv(topic, 5);

          if (result.success && result.papers.length > 0) {
            const firstPaper = result.papers[0];
            const responseText = `${persona.name} (${persona.age}) here. Found paper: "${firstPaper.title}" by ${firstPaper.authors}. ${firstPaper.summary}`;

            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: responseText },
                shouldEndSession: false
              }
            });
          } else {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `No academic papers found for "${topic}".` },
                shouldEndSession: false
              }
            });
          }
          return;
        } catch (e) {
          console.error('Arxiv error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Failed to search academic papers. Please try again.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // KodiIntent - Control Kodi/XBMC media center
      if (intentName === 'KodiIntent' || intentName === 'KodiPlayIntent' || intentName === 'KodiControlIntent' || intentName === 'KodiNavigateIntent') {
        let action = (slots.Action?.value || slots.Command?.value || '').toLowerCase();
        const kodiHost = process.env.KODI_HOST;
        const kodiRelayUrl = process.env.KODI_RELAY_URL;

        // Use relay if configured (for local network access)
        if (kodiRelayUrl) {
          try {
            const relayEndpoint = kodiRelayUrl.replace(/\/$/, '');

            // Check for "play X on seren/fen" pattern - use Trakt for direct playback
            const playMatch = action.match(/^play\s+(.+?)\s+on\s+(seren|fen)/i);
            if (playMatch) {
              const query = playMatch[1];
              const addon = playMatch[2];

              // First do Trakt search to get the trakt ID (Seren needs trakt ID, not TMDB)
              let traktId = null;
              try {
                const traktResponse = await fetch(`https://api.trakt.tv/search/movie?query=${encodeURIComponent(query)}&fields=title,ids`, {
                  headers: {
                    'Content-Type': 'application/json',
                    'trakt-api-key': '0362f0bc45385818ae33a18df9c9902923a6dcbecca34693c5c84dd44927846f',
                    'trakt-api-version': '2'
                  },
                  signal: AbortSignal.timeout(10000)
                });
                if (traktResponse.ok) {
                  const traktData = await traktResponse.json();
                  if (traktData && traktData.length > 0) {
                    traktId = traktData[0].ids.trakt;
                  }
                }
              } catch (e) {
                console.error('Trakt lookup failed:', e.message);
              }

              // Use play-movie endpoint with trakt ID for proper Seren playback
              const relayRes = await fetch(`${relayEndpoint}/kodi/play-movie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, addon: `plugin.video.${addon}`, traktId: traktId }),
                signal: AbortSignal.timeout(15000)
              });
              const relayData = await relayRes.json();
              if (relayData.success) {
                res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: `Opening ${relayData.movie} in ${addon}. Press play on your TV to start streaming.` }, shouldEndSession: false } });
              } else {
                res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: `Failed: ${relayData.error}` }, shouldEndSession: false } });
              }
              return;
            } else if (action === 'play' || action.startsWith('play ')) {
              // Simple play or "play X" without addon
              const query = action === 'play' ? null : action.replace(/^play\s+/i, '').trim();
              const relayRes = await fetch(`${relayEndpoint}/kodi/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query }),
                signal: AbortSignal.timeout(10000)
              });
              const relayData = await relayRes.json();
              res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: relayData.success ? 'Playing on Kodi.' : `Kodi: ${relayData.error}` }, shouldEndSession: false } });
              return;
            } else if (action === 'pause') {
              const relayRes = await fetch(`${relayEndpoint}/kodi/pause`, { method: 'POST', signal: AbortSignal.timeout(10000) });
              const relayData = await relayRes.json();
              res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: relayData.success ? 'Pausing Kodi.' : `Kodi: ${relayData.error}` }, shouldEndSession: false } });
              return;
            } else if (action.includes('seren')) {
              const relayRes = await fetch(`${relayEndpoint}/kodi/open-addon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addonid: 'plugin.video.seren' }), signal: AbortSignal.timeout(10000) });
              const relayData = await relayRes.json();
              res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: relayData.success ? 'Opening Seren on Kodi.' : `Seren: ${relayData.error}` }, shouldEndSession: false } });
              return;
            } else if (action.includes('fen')) {
              const relayRes = await fetch(`${relayEndpoint}/kodi/open-addon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addonid: 'plugin.video.fen' }), signal: AbortSignal.timeout(10000) });
              const relayData = await relayRes.json();
              res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: relayData.success ? 'Opening Fen on Kodi.' : `Fen: ${relayData.error}` }, shouldEndSession: false } });
              return;
            } else {
              // Default - get status via relay
              const relayRes = await fetch(`${relayEndpoint}/kodi/status`, { signal: AbortSignal.timeout(10000) });
              const relayData = await relayRes.json();
              if (relayData.isPlaying) {
                res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: `Kodi is playing: ${relayData.item?.title || 'unknown'}` }, shouldEndSession: false } });
              } else {
                res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: 'Kodi is not playing anything.' }, shouldEndSession: false } });
              }
              return;
            }
          } catch (e) {
            console.error('Kodi relay error:', e.message);
            res.json({ version: '1.0', response: { outputSpeech: { type: 'PlainText', text: 'Failed to control Kodi.' }, shouldEndSession: false } });
            return;
          }
        }

        if (!kodiHost) {
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Kodi is not configured. Please set KODI_HOST or KODI_RELAY_URL environment variable.' },
              shouldEndSession: false
            }
          });
          return;
        }

        try {
          const kodiClient = new KodiClient({ host: kodiHost });

          if (action === 'play') {
            const result = await kodiClient.play();
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: result.success ? 'Playing on Kodi.' : `Kodi error: ${result.error}` },
                shouldEndSession: false
              }
            });
            return;
          } else if (action === 'pause') {
            const result = await kodiClient.pause();
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: result.success ? 'Pausing Kodi.' : `Kodi error: ${result.error}` },
                shouldEndSession: false
              }
            });
            return;
          } else if (action === 'stop') {
            const result = await kodiClient.stop();
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: result.success ? 'Stopping Kodi.' : `Kodi error: ${result.error}` },
                shouldEndSession: false
              }
            });
            return;
          } else if (action.includes('movie')) {
            const result = await kodiClient.showMovies(5);
            if (result.success && result.movies.length > 0) {
              const movieList = result.movies.map(m => `${m.title} (${m.year})`).join(', ');
              res.json({
                version: '1.0',
                response: {
                  outputSpeech: { type: 'PlainText', text: `Movies on Kodi: ${movieList}` },
                  shouldEndSession: false
                }
              });
            } else {
              res.json({
                version: '1.0',
                response: {
                  outputSpeech: { type: 'PlainText', text: 'No movies found on Kodi.' },
                  shouldEndSession: false
                }
              });
            }
            return;
          } else if (action.includes('seren')) {
            const result = await kodiClient.openAddon('plugin.video.seren');
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: result.success ? 'Opening Seren on Kodi.' : `Seren error: ${result.error}` },
                shouldEndSession: false
              }
            });
            return;
          } else if (action.includes('fen')) {
            const result = await kodiClient.openAddon('plugin.video.fen');
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: result.success ? 'Opening Fen on Kodi.' : `Fen error: ${result.error}` },
                shouldEndSession: false
              }
            });
            return;
          }

          // Default - get playback state
          const state = await kodiClient.getPlaybackState();
          if (state.success && state.item) {
            const itemName = state.item.title || state.item.name || 'Unknown';
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `Kodi is ${state.playing ? 'playing' : 'paused'}: ${itemName}` },
                shouldEndSession: false
              }
            });
          } else {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'Kodi is not playing anything.' },
                shouldEndSession: false
              }
            });
          }
          return;
        } catch (e) {
          console.error('Kodi error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Failed to control Kodi. Please try again.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // WhatsAppIntent - Send a WhatsApp message
      // Slots: Recipient (phone number or name), Message (text to send)
      if (intentName === 'WhatsAppIntent') {
        const recipient = slots.Recipient?.value || slots.To?.value || slots.Phone?.value;
        const message = slots.Message?.value || slots.Text?.value || slots.Content?.value;

        if (!recipient || !message) {
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'To send a WhatsApp message, please specify both the recipient and the message. For example: send a WhatsApp message to Subho saying hello.' },
              shouldEndSession: false
            }
          });
          return;
        }

        // Resolve recipient name to phone number if needed
        let resolvedPhone = recipient;
        try {
          const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:9377';
          const statusRes = await fetch(`${whatsappServiceUrl}/whatsapp/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            // Try to find contact by name
            if (statusData.connected) {
              const contactsRes = await fetch(`${whatsappServiceUrl}/whatsapp/contacts`);
              if (contactsRes.ok) {
                const contactsData = await contactsRes.json();
                const matchedContact = contactsData.contacts?.find(
                  c => c.name?.toLowerCase().includes(recipient.toLowerCase())
                );
                if (matchedContact) {
                  resolvedPhone = matchedContact.id.split('@')[0];
                }
              }
            }
          }
        } catch (e) {
          // Service not reachable — continue with raw recipient
        }

        try {
          const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:9377';
          const sendRes = await fetch(`${whatsappServiceUrl}/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: resolvedPhone, message })
          });

          if (sendRes.ok) {
            const result = await sendRes.json();
            if (result.success) {
              res.json({
                version: '1.0',
                response: {
                  outputSpeech: { type: 'PlainText', text: `WhatsApp message sent to ${recipient}: ${message}` },
                  shouldEndSession: false
                }
              });
            } else {
              res.json({
                version: '1.0',
                response: {
                  outputSpeech: { type: 'PlainText', text: `Failed to send WhatsApp message: ${result.error}` },
                  shouldEndSession: false
                }
              });
            }
          } else {
            const errorText = await sendRes.text();
            console.error('WhatsApp send error:', errorText);
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: 'WhatsApp is not connected. Please scan the QR code first at the WhatsApp dashboard.' },
                shouldEndSession: false
              }
            });
          }
          return;
        } catch (e) {
          console.error('WhatsApp error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'WhatsApp service is unavailable. Please ensure the WhatsApp QR service is running.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // RedditIntent - Search Reddit for posts
      if (intentName === 'RedditIntent') {
        const query = slots.Query?.value || 'all';
        try {
          const RedditClient = require('./clients/reddit_client');
          const reddit = new RedditClient({});
          const result = await reddit.searchReddit(query, 'all', 5, { locale: 'en-US' });
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: result.success ? `Found Reddit posts: ${result.posts}` : `Reddit search failed: ${result.error || 'Please try again.'}` },
              shouldEndSession: false
            }
          });
          return;
        } catch (e) {
          console.error('Reddit error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Failed to search Reddit. Please try again.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }

      // TwitterIntent - Search Twitter for tweets
      if (intentName === 'TwitterIntent') {
        const query = slots.Query?.value || '';
        try {
          const TwitterClient = require('./clients/twitter_client');
          const twitter = new TwitterClient(process.env.TWITTER_BEARER_TOKEN || '', {});
          const result = await twitter.searchTweets(query, { maxResults: 5 });
          if (result.simulated) {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `Found tweets about ${query}: ${result.tweets}` },
                shouldEndSession: false
              }
            });
          } else if (result.length > 0) {
            const tweets = result.map(t => t.text || t.full_text || '').join('. ');
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `Found ${result.length} tweets about ${query}: ${tweets}` },
                shouldEndSession: false
              }
            });
          } else {
            res.json({
              version: '1.0',
              response: {
                outputSpeech: { type: 'PlainText', text: `No tweets found about ${query}.` },
                shouldEndSession: false
              }
            });
          }
          return;
        } catch (e) {
          console.error('Twitter error:', e.message);
          res.json({
            version: '1.0',
            response: {
              outputSpeech: { type: 'PlainText', text: 'Failed to search Twitter. Please try again.' },
              shouldEndSession: false
            }
          });
          return;
        }
      }
    }

    // Handle SessionEndedRequest
    if (body.request?.type === 'SessionEndedRequest') {
      res.json({ version: '1.0' });
      return;
    }

    // Default response
    res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: "I didn't understand that request. I can help you with questions, news, searches, translations, stories, and more. Just ask!"
        },
        shouldEndSession: false
      }
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'I encountered an error. Please try again.'
        },
        shouldEndSession: true
      }
    });
  }
};

/**
 * Instagram sync handler - fetches bookmarks from Instagram
 */
exports.instagramSyncHandler = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const InstagramScraperClient = require('./clients/instagram_scraper_client');
    const client = new InstagramScraperClient();

    console.log('📸 Syncing Instagram bookmarks...');
    const bookmarks = await client.getSavedContent(50);

    res.json({
      success: true,
      count: bookmarks.length,
      bookmarks: bookmarks
    });
  } catch (error) {
    console.error('Instagram sync error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Instagram bookmarks handler - retrieves cached bookmarks
 */
exports.instagramBookmarksHandler = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const InstagramScraperClient = require('./clients/instagram_scraper_client');
    const client = new InstagramScraperClient();

    const bookmarks = await client.getSavedContent(50);

    res.json({
      success: true,
      count: bookmarks.length,
      bookmarks: bookmarks
    });
  } catch (error) {
    console.error('Instagram bookmarks error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
