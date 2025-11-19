const express = require('express');
const { v4: uuid } = require('uuid');
const { saveLead, updateLead } = require('../lib/db');
const { createCallWithRetry } = require('../lib/exotelClient');

const router = express.Router();

router.post('/', async (req, res) => {
  const { name = '', phone, consent } = req.body || {};

  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Phone number is required.' });
  }

  if (consent !== true) {
    return res
      .status(400)
      .json({ ok: false, error: 'Consent must be provided to receive a call.' });
  }

  const normalizedPhone = normalizePhone(phone, req.app.locals.defaultCountryCode);
  if (!normalizedPhone) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid phone number.' });
  }

  const leadId = uuid();
  const timestamp = new Date().toISOString();

  const lead = {
    leadId,
    name: name?.trim() || 'Guest',
    phone: normalizedPhone,
    consent: true,
    consentTimestamp: timestamp,
    status: 'queued',
    createdAt: timestamp,
    updatedAt: timestamp,
    events: [],
  };

  try {
    await saveLead(lead);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist lead', error);
    return res.status(500).json({ ok: false, error: 'Unable to save lead at this time.' });
  }

  const webhookUrl = `${req.app.locals.webhookBase}/webhook`;
  const systemPrompt = req.app.locals.systemPrompt;

  try {
    const result = await createCallWithRetry({
      to: normalizedPhone,
      systemPrompt,
      context: { leadId, name: lead.name },
      webhookUrl,
    });

    await updateLead(leadId, {
      status: 'call_queued',
      vapiCallId: result.callId,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      leadId,
      message: 'Call queued — we will try to reach you in a few minutes.',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to trigger call', error);
    await updateLead(leadId, {
      status: 'call_failed',
      errorMessage: error.message,
      updatedAt: new Date().toISOString(),
    });
    return res.status(502).json({
      ok: false,
      error: 'We could not start the call. Please try again shortly.',
    });
  }
});

function normalizePhone(raw, defaultCountryCode = '+91') {
  if (!raw) return null;
  const digitsOnly = raw.replace(/\D/g, '');
  if (!digitsOnly) return null;

  let normalized;
  if (raw.trim().startsWith('+')) {
    normalized = `+${digitsOnly}`;
  } else if (digitsOnly.length === 10 && defaultCountryCode) {
    normalized = `${defaultCountryCode}${digitsOnly}`;
  } else {
    normalized = `+${digitsOnly}`;
  }

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

module.exports = router;


