const express = require('express');
const { appendLeadEvent, updateLead } = require('../lib/db');
const { verifyWebhookSignature } = require('../lib/exotelClient');
const { logCallEvent } = require('../lib/logger');

const router = express.Router();

router.post('/', async (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ ok: false, error: 'Invalid webhook signature.' });
  }

  const payload = req.body || {};
  
  // Exotel webhook format: payload.CallStatus, payload.CallSid, payload.CustomField
  // CustomField contains our JSON context with leadId
  let leadId = payload?.context?.leadId || payload?.leadId;
  if (!leadId && payload?.CustomField) {
    try {
      const customField = typeof payload.CustomField === 'string' 
        ? JSON.parse(payload.CustomField) 
        : payload.CustomField;
      leadId = customField?.leadId;
    } catch (e) {
      // Ignore parsing errors
    }
  }

  if (!leadId) {
    logCallEvent({ type: 'webhook.unknownLead', payload });
    return res.json({ ok: true });
  }

  // Exotel CallStatus values: queued, ringing, in-progress, completed, failed, busy, no-answer, canceled
  const callStatus = payload?.CallStatus || payload?.Status || payload?.event || payload?.type || 'unknown';
  const eventType = normalizeExotelEvent(callStatus);

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
 * Normalize Exotel call status to internal event types
 * Exotel statuses: queued, ringing, in-progress, completed, failed, busy, no-answer, canceled
 */
function normalizeExotelEvent(status) {
  const statusMap = {
    queued: 'call.created',
    ringing: 'call.ringing',
    'in-progress': 'call.answered',
    completed: 'call.completed',
    failed: 'call.failed',
    busy: 'call.busy',
    'no-answer': 'call.no_answer',
    canceled: 'call.canceled',
  };
  return statusMap[status?.toLowerCase()] || status || 'unknown';
}

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
    consent_withdrawn: 'dnc',
  };

  if (eventMap[eventType]) {
    updates.status = eventMap[eventType];
  }

  // Exotel may send transcription/recording URL in different fields
  const transcription =
    payload?.Transcription ||
    payload?.transcription?.text ||
    payload?.transcription ||
    payload?.transcript ||
    payload?.CallTranscript ||
    payload?.summary;

  if (transcription) {
    updates.transcription = String(transcription).slice(0, 2000);
  }

  // Store Exotel CallSid
  if (payload?.CallSid || payload?.Sid) {
    updates.exotelCallSid = payload.CallSid || payload.Sid;
  }

  // Store recording URL if available
  if (payload?.RecordingUrl || payload?.Recording) {
    updates.recordingUrl = payload.RecordingUrl || payload.Recording;
  }

  // Store call duration if available
  if (payload?.Duration) {
    updates.callDuration = payload.Duration;
  }

  const interestedContact =
    payload?.metadata?.interested_contact ||
    payload?.context?.interested_contact ||
    payload?.notes?.contact_details;

  if (interestedContact) {
    updates.interestedContact = interestedContact;
  }

  if (eventType === 'consent_withdrawn') {
    updates.consent = false;
  }

  return updates;
}

module.exports = router;


