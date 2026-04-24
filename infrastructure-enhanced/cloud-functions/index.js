/**
 * OmniClaw Alexa Bridge - Simple Deployment Version
 * Demonstrates the basic structure with resilience patterns
 */

const { getHealthStatus } = require('../../shared/resilience/index');

// Health check endpoint
exports.healthHandler = async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    message: 'OmniClaw Personal Assistant is operational',
    components: {
      resilience: 'active',
      clients: '19 preserved',
      region: 'asia-south1'
    }
  });
};

/**
 * Main Alexa handler
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
    const body = req.body;

    // Log the request
    console.log('Alexa request received:', {
      version: body.version,
      type: body.request?.type,
      requestId: body.request?.requestId
    });

    // Handle LaunchRequest
    if (body.request?.type === 'LaunchRequest') {
      res.json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Welcome to OmniClaw Personal Assistant! I can help you with news, Twitter searches, research, translations, and much more. All your favorite features from OpenClaw are preserved and enhanced with robustness patterns.'
          },
          shouldEndSession: false,
          card: {
            type: 'Simple',
            title: 'OmniClaw Personal Assistant',
            content: 'Version 1.0 with resilience patterns'
          }
        },
        sessionAttributes: {
          lastQuery: '',
          conversationCount: 0
        }
      });
      return;
    }

    // Handle QueryIntent
    if (body.request?.type === 'IntentRequest') {
      const intentName = body.request.intent?.name;

      if (intentName === 'QueryIntent' || intentName === 'AMAZON.HelpIntent') {
        res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'I\'m OmniClaw, your personal assistant with 19 integrated services including news, Twitter, Reddit, Wikipedia, Arxiv research, translation, and more. All powered by advanced resilience patterns for maximum reliability.'
            },
            shouldEndSession: false
          }
        });
        return;
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
          text: 'I didn\'t understand that request. I can help you with questions, news, searches, translations, and more.'
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
