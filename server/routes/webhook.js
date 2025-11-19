const express = require('express');
const { appendLeadEvent, updateLead } = require('../lib/db');
const { verifyWebhookSignature } = require('../lib/vapiClient');
const { logCallEvent } = require('../lib/logger');

const router = express.Router();

router.post('/', async (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ ok: false, error: 'Invalid webhook signature.' });
  }

  const payload = req.body || {};
  
  // VAPI webhook format: payload.event (call.created, call.answered, call.completed, etc.)
  // payload.context contains our leadId and name
  let leadId = payload?.context?.leadId || payload?.leadId;
  
  if (!leadId) {
    logCallEvent({ type: 'webhook.unknownLead', payload });
    return res.json({ ok: true });
  }

  // VAPI event types: call.created, call.answered, call.completed, call.failed, transcription, etc.
  const eventType = payload?.event || payload?.type || payload?.status || 'unknown';

  try {
    await appendLeadEvent(leadId, { eventType, payload });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to append event for ${leadId}`, error);
    return res.status(500).json({ ok: false });
  }

  const updates = deriveStatusUpdates(eventType, payload);

  if (Object.keys(updates).length) {
    try {
      await updateLead(leadId, updates);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to update lead ${leadId}`, error);
    }
  }

  logCallEvent({ type: 'webhook.event', leadId, eventType });
  return res.json({ ok: true });
});

/**
 * Derive status updates from VAPI webhook events
 * VAPI event types: call.created, call.answered, call.completed, call.failed, transcription, etc.
 */
function deriveStatusUpdates(eventType, payload) {
  const updates = { updatedAt: new Date().toISOString() };
  const eventMap = {
    created: 'call_created',
    'call.created': 'call_created',
    'call.ringing': 'ringing',
    answered: 'in_progress',
    'call.answered': 'in_progress',
    'in-progress': 'in_progress',
    completed: 'completed',
    'call.completed': 'completed',
    failed: 'failed',
    'call.failed': 'failed',
    'call.busy': 'busy',
    'call.no_answer': 'no_answer',
    'call.canceled': 'canceled',
    'call.ended': 'completed',
    consent_withdrawn: 'dnc',
  };

  if (eventMap[eventType]) {
    updates.status = eventMap[eventType];
  }

  // VAPI transcription format: payload.transcription or payload.transcript
  const transcription =
    payload?.transcription?.text ||
    payload?.transcription ||
    payload?.transcript ||
    payload?.message?.transcription ||
    payload?.summary;

  if (transcription) {
    updates.transcription = String(transcription).slice(0, 2000);
  }

  // Store VAPI call ID
  if (payload?.call?.id || payload?.callId || payload?.id) {
    updates.vapiCallId = payload.call?.id || payload.callId || payload.id;
  }

  // Store recording URL if available (VAPI may provide this)
  if (payload?.recording?.url || payload?.recordingUrl || payload?.recording) {
    updates.recordingUrl = payload.recording?.url || payload.recordingUrl || payload.recording;
  }

  // Store call duration if available
  if (payload?.duration || payload?.call?.duration) {
    updates.callDuration = payload.duration || payload.call?.duration;
  }

  // Store interested contact details if available
  const interestedContact =
    payload?.metadata?.interested_contact ||
    payload?.context?.interested_contact ||
    payload?.notes?.contact_details ||
    payload?.message?.metadata?.interested_contact;

  if (interestedContact) {
    updates.interestedContact = interestedContact;
  }

  if (eventType === 'consent_withdrawn') {
    updates.consent = false;
  }

  return updates;
}

module.exports = router;


