const express = require('express');
const { logCallEvent } = require('../lib/logger');

const router = express.Router();

/**
 * Twilio TwiML Handler
 * This endpoint receives TwiML requests from Twilio
 * TwiML is Twilio's XML-based markup language for call flows
 * 
 * For AI voice integration:
 * - Use <Gather> with speech recognition for voice input
 * - Use <Connect> to connect to external services (e.g., AI voice service)
 * - Use <Stream> for real-time audio streaming
 * - Or use Twilio's Media Streams API with WebSocket
 * 
 * Documentation: https://www.twilio.com/docs/voice/twiml
 */
router.post('/', async (req, res) => {
  const { From, To, CallSid, CallStatus, CallerName, FromCity, FromState, FromZip, FromCountry } = req.body || {};

  logCallEvent({
    type: 'twiml.request',
    callSid: CallSid,
    from: From,
    to: To,
    status: CallStatus,
    callerName: CallerName,
    location: `${FromCity}, ${FromState}`,
  });

  // Parse custom parameters if passed via StatusCallback URL
  const leadId = req.query?.leadId || req.body?.leadId;
  const leadName = req.query?.leadName || req.body?.leadName;

  // TwiML response - Twilio expects XML
  // Basic example for AI voice integration
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Greeting -->
  <Say voice="alice" language="en-IN">
    Hello! This is Maya calling from Candle &amp; Co. Do you have a minute to talk about our handcrafted scented candles?
  </Say>
  
  <!-- Wait for response -->
  <Pause length="2"/>
  
  <!-- Gather speech input for AI conversation -->
  <Gather 
    input="speech" 
    language="en-IN"
    speechTimeout="auto"
    action="${req.protocol}://${req.get('host')}/twiml/gather"
    method="POST">
    <Say voice="alice" language="en-IN">
      Please speak your response.
    </Say>
  </Gather>
  
  <!-- Fallback if no input -->
  <Say voice="alice" language="en-IN">
    I didn't hear your response. Thank you for your time. Goodbye!
  </Say>
  
  <Hangup />
</Response>`;

  // Alternative: Connect to external AI service
  // <Connect>
  //   <Stream url="wss://your-ai-service.com/stream" />
  // </Connect>

  // Alternative: Simple IVR
  // <Gather numDigits="1">
  //   <Say>Press 1 to speak with an agent, Press 2 to hear more information</Say>
  // </Gather>

  res.set('Content-Type', 'application/xml');
  res.send(twimlResponse);
});

/**
 * TwiML Gather handler (for speech input)
 */
router.post('/gather', async (req, res) => {
  const { From, To, CallSid, SpeechResult, Confidence } = req.body || {};

  logCallEvent({
    type: 'twiml.gather',
    callSid: CallSid,
    from: From,
    to: To,
    speechResult: SpeechResult,
    confidence: Confidence,
  });

  // Process speech input here
  // For AI voice integration, you would:
  // 1. Send SpeechResult to your AI service (GPT, etc.)
  // 2. Get AI response
  // 3. Use text-to-speech or return TwiML with <Say>

  // Example: Echo back (replace with AI integration)
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">
    I heard you say: ${SpeechResult || 'nothing'}. Thank you for your response.
  </Say>
  
  <!-- Continue conversation or end -->
  <Gather 
    input="speech" 
    language="en-IN"
    speechTimeout="auto"
    action="${req.protocol}://${req.get('host')}/twiml/gather"
    method="POST">
    <Say voice="alice" language="en-IN">
      Is there anything else I can help you with?
    </Say>
  </Gather>
  
  <Say voice="alice" language="en-IN">
    Thank you for calling Candle &amp; Co. Have a great day!
  </Say>
  
  <Hangup />
</Response>`;

  res.set('Content-Type', 'application/xml');
  res.send(twimlResponse);
});

/**
 * GET endpoint for TwiML (Twilio may use GET for some requests)
 */
router.get('/', async (req, res) => {
  const { From, To, CallSid, CallStatus } = req.query || {};

  logCallEvent({
    type: 'twiml.request.get',
    callSid: CallSid,
    from: From,
    to: To,
    status: CallStatus,
  });

  // Return same TwiML as POST
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">
    Hello! Thank you for calling Candle &amp; Co. We will connect you shortly.
  </Say>
  <!-- Configure your call flow here -->
  <Hangup />
</Response>`;

  res.set('Content-Type', 'application/xml');
  res.send(twimlResponse);
});

module.exports = router;

