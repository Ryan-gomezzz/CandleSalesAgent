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
  const leadId = payload?.context?.leadId || payload?.leadId;

  if (!leadId) {
    logCallEvent({ type: 'webhook.unknownLead', payload });
    return res.json({ ok: true });
  }

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

function deriveStatusUpdates(eventType, payload) {
  const updates = { updatedAt: new Date().toISOString() };
  const eventMap = {
    created: 'call_created',
    'call.created': 'call_created',
    answered: 'in_progress',
    'call.answered': 'in_progress',
    completed: 'completed',
    'call.completed': 'completed',
    failed: 'failed',
    'call.failed': 'failed',
    consent_withdrawn: 'dnc',
  };

  if (eventMap[eventType]) {
    updates.status = eventMap[eventType];
  }

  const transcription =
    payload?.transcription?.text ||
    payload?.transcription ||
    payload?.transcript ||
    payload?.summary;

  if (transcription) {
    updates.transcription = String(transcription).slice(0, 2000);
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


