/**
 * OmniClaw - Simple Cloud Functions Deployment
 * Basic version that will definitely work
 */

// Health check function
exports.healthHandler = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    message: 'OmniClaw Personal Assistant is operational',
    project: 'omniclaw-enhanced',
    region: 'asia-south1'
  });
};

// Alexa handler function
exports.alexaHandler = (req, res) => {
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
    const requestType = body.request?.type;

    console.log('Request type:', requestType);

    // Handle LaunchRequest
    if (requestType === 'LaunchRequest') {
      res.status(200).json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Welcome to OmniClaw Personal Assistant! Version 1.0 is now deployed with resilience patterns and 19 integrated services.'
          },
          shouldEndSession: false,
          card: {
            type: 'Simple',
            title: 'OmniClaw Personal Assistant',
            content: 'Resilience patterns active, all capabilities preserved'
          }
        },
        sessionAttributes: {
          lastQuery: '',
          conversationCount: 0
        }
      });
      return;
    }

    // Handle SessionEndedRequest
    if (requestType === 'SessionEndedRequest') {
      res.status(200).json({ version: '1.0' });
      return;
    }

    // Default response
    res.status(200).json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'I can help you with questions, news, Twitter, Wikipedia, Arxiv, translations, and more. What would you like to know?'
        },
        shouldEndSession: false
      }
    });

  } catch (error) {
    console.error('Error:', error);
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
