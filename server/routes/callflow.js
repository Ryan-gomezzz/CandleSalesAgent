const express = require('express');
const { logCallEvent } = require('../lib/logger');

const router = express.Router();

/**
 * Exotel Call Flow Handler
 * This endpoint receives call flow requests from Exotel
 * Exotel supports XML-based call flows (Twiml-like) or HTTP callbacks
 * 
 * For AI voice integration:
 * - Use Exotel Passthru applet to send audio to AI service
 * - Or configure Exotel voice bot service
 * - Or use Exotel's webhook + external AI provider
 * 
 * Documentation: https://developer.exotel.com/docs/flow
 */
router.post('/', async (req, res) => {
  const { From, To, CallSid, CallStatus, CustomField } = req.body || {};

  logCallEvent({
    type: 'callflow.request',
    callSid: CallSid,
    from: From,
    to: To,
    status: CallStatus,
    customField: CustomField,
  });

  // Parse custom field for lead context
  let leadId = null;
  let leadName = null;
  if (CustomField) {
    try {
      const context = typeof CustomField === 'string' 
        ? JSON.parse(CustomField) 
        : CustomField;
      leadId = context?.leadId;
      leadName = context?.name;
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Exotel expects XML response for call flow
  // This is a basic example - customize based on your AI integration needs
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Example: Play a greeting -->
  <Play>https://example.com/greeting.mp3</Play>
  
  <!-- Example: Passthru to AI service (configure in Exotel dashboard) -->
  <!-- <Passthru>
    <Url>${req.protocol}://${req.get('host')}/ai/voice</Url>
  </Passthru> -->
  
  <!-- Example: Connect to agent or AI -->
  <!-- <Dial>agent-extension</Dial> -->
  
  <!-- Example: Record call -->
  <!-- <Record maxLength="300" /> -->
  
  <!-- Example: Simple IVR -->
  <!-- <Gather numDigits="1">
    <Say>Press 1 to speak with an agent, Press 2 to hear more information</Say>
  </Gather> -->
  
  <!-- For AI voice integration, use Passthru applet pointing to your AI service -->
  <!-- Or configure Exotel voice bot in dashboard -->
  <Hangup />
</Response>`;

  res.set('Content-Type', 'application/xml');
  res.send(xmlResponse);
});

/**
 * GET endpoint for Exotel call flow (some configurations may use GET)
 */
router.get('/', async (req, res) => {
  const { From, To, CallSid, CallStatus, CustomField } = req.query || {};

  logCallEvent({
    type: 'callflow.request.get',
    callSid: CallSid,
    from: From,
    to: To,
    status: CallStatus,
    customField: CustomField,
  });

  // Return same XML response as POST
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello, thank you for calling Candle &amp; Co. We will connect you shortly.</Say>
  <!-- Configure your call flow here -->
  <Hangup />
</Response>`;

  res.set('Content-Type', 'application/xml');
  res.send(xmlResponse);
});

module.exports = router;

