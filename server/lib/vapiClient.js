const axios = require('axios');
const crypto = require('crypto');
const { logCallEvent } = require('./logger');

const API_URL = process.env.VAPI_API_URL;
const API_KEY = process.env.VAPI_API_KEY;
const CALLER_ID = process.env.CALLER_ID;
const MAX_ATTEMPTS = 3;

function buildPayload({ to, from, systemPrompt, context, webhookUrl }) {
  if (!API_URL) {
    throw new Error('VAPI_API_URL is not configured');
  }
  if (!API_KEY) {
    throw new Error('VAPI_API_KEY is not configured');
  }

  const payload = {
    to,
    from: from || CALLER_ID,
    context: context || {},
    webhook_url: webhookUrl,
  };

  if (!payload.from) {
    throw new Error('CALLER_ID is missing. Set CALLER_ID in .env');
  }
  if (!payload.webhook_url) {
    throw new Error('Webhook URL missing');
  }

  const usePromptInline = process.env.USE_PROMPT_INLINE !== 'false';

  if (usePromptInline) {
    if (!systemPrompt) {
      throw new Error('System prompt text was not found');
    }
    payload.messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'assistant',
        content:
          'Hello! I’m Maya from Candle & Co. Do you have a minute to talk about our candles?',
      },
    ];
    // NOTE: If your provider expects `system_prompt` or `instructions`
    // instead of the `messages` array, replace the snippet above with
    // the exact field name from your WAPI docs.
  } else {
    if (!process.env.PROMPT_FLOW_ID) {
      throw new Error(
        'PROMPT_FLOW_ID must be set when USE_PROMPT_INLINE is false'
      );
    }
    payload.flow_id = process.env.PROMPT_FLOW_ID;
    // NOTE: Some providers call this `voice_workflow_id` or `agent_id`.
    // Map `flow_id` to the proper field name per your WAPI vendor.
  }

  if (process.env.VAPI_VOICE_ID) {
    payload.voice_id = process.env.VAPI_VOICE_ID;
    // Replace `voice_id` with the vendor-specific selector if needed.
  }

  if (process.env.VAPI_LANGUAGE_CODE) {
    payload.language_code = process.env.VAPI_LANGUAGE_CODE;
  }

  return payload;
}

async function createCall(options) {
  const payload = buildPayload(options);
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(API_URL, payload, {
      headers,
      timeout: 15000,
    });
    const callId =
      response.data?.id ||
      response.data?.call_id ||
      response.data?.callId ||
      null;

    logCallEvent({
      type: 'call.create',
      leadId: options.context?.leadId,
      request: payload,
      response: response.data,
    });

    return { callId, data: response.data };
  } catch (error) {
    logCallEvent({
      type: 'call.error',
      leadId: options.context?.leadId,
      request: payload,
      error: error.response?.data || error.message,
    });
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    throw new Error(`Failed to create VAPI call: ${message}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createCallWithRetry(options, attempt = 1) {
  try {
    return await createCall(options);
  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) {
      throw error;
    }
    const delay = Math.pow(2, attempt) * 250;
    await wait(delay);
    return createCallWithRetry(options, attempt + 1);
  }
}

function verifyWebhookSignature(req) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const signatureHeader =
    req.headers['x-vapi-signature'] ||
    req.headers['x-wapi-signature'] ||
    req.headers['x-hub-signature-256'];

  if (!signatureHeader) {
    return false;
  }

  const rawBody =
    req.rawBody ||
    Buffer.from(
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    );

  const [, sigValue = signatureHeader] = signatureHeader.split('=');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const actualBuffer = Buffer.from(sigValue, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

module.exports = {
  createCall,
  createCallWithRetry,
  verifyWebhookSignature,
};


