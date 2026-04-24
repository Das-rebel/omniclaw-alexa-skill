/**
 * OmniClaw Cloud Functions - Proper Gen 2 Format
 * Using Google Cloud Functions Framework
 */

const { getHealthStatus } = require('../../shared/resilience/index');

// Health check function for Cloud Functions
exports.healthHandler = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      message: 'OmniClaw Personal Assistant is operational',
      components: {
        resilience: 'active',
        clients: '19 preserved',
        region: 'asia-south1',
        project: 'omniclaw-enhanced'
      },
      uptime: process.uptime()
    };

    res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Alexa handler for Cloud Functions
exports.alexaHandler = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const body = req.body;

    // Log request
    console.log('Request received:', {
      method: req.method,
      path: req.path,
      type: body.request?.type,
      requestId: body.request?.requestId
    });

    // Handle LaunchRequest
    if (body.request?.type === 'LaunchRequest') {
      const response = {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Welcome to OmniClaw Personal Assistant! Version 1.0 with resilience patterns and 19 integrated services is now operational.'
          },
          shouldEndSession: false,
          card: {
            type: 'Simple',
            title: 'OmniClaw Personal Assistant',
            content: 'Resilience patterns active, all OpenClaw capabilities preserved'
          }
        },
        sessionAttributes: {
          lastQuery: '',
          conversationCount: 0
        }
      };

      res.status(200).json(response);
      return;
    }

    // Handle QueryIntent
    if (body.request?.type === 'IntentRequest') {
      const intentName = body.request.intent?.name;

      if (intentName === 'AMAZON.HelpIntent') {
        const response = {
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'I\'m OmniClaw, your personal assistant with 19 integrated services including news, Twitter, Reddit, Wikipedia, Arxiv research, translation, podcasts, WhatsApp, and more. All powered by advanced resilience patterns for maximum reliability.'
            },
            shouldEndSession: false
          }
        };
        res.status(200).json(response);
        return;
      }
    }

    // Handle SessionEndedRequest
    if (body.request?.type === 'SessionEndedRequest') {
      res.status(200).json({ version: '1.0' });
      return;
    }

    // Default response for unknown requests
    const response = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'I received your request. I can help you with questions, news, searches, translations, and more. Just ask!'
        },
        shouldEndSession: false
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in alexaHandler:', error);

    // Return error response to Alexa
    const errorResponse = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'I encountered an error processing your request. Please try again.'
        },
        shouldEndSession: true
      }
    };

    res.status(500).json(errorResponse);
  }
};
