const axios = require('axios');
const crypto = require('crypto');
const { logCallEvent } = require('./logger');

const ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID;
const API_KEY = process.env.EXOTEL_API_KEY;
const API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOPHONE_NUMBER = process.env.EXOTEL_EXOPHONE_NUMBER; // Your Exotel phone number
const CALL_FLOW_URL = process.env.EXOTEL_CALL_FLOW_URL; // URL to your call flow XML/handler
const MAX_ATTEMPTS = 3;

/**
 * Build Exotel API payload for outbound call
 * Exotel API Documentation: https://developer.exotel.com/api/calls
 */
function buildPayload({ to, from, context, webhookUrl }) {
  if (!ACCOUNT_SID) {
    throw new Error('EXOTEL_ACCOUNT_SID is not configured');
  }
  if (!API_KEY) {
    throw new Error('EXOTEL_API_KEY is not configured');
  }
  if (!API_TOKEN) {
    throw new Error('EXOTEL_API_TOKEN is not configured');
  }
  if (!EXOPHONE_NUMBER) {
    throw new Error('EXOTEL_EXOPHONE_NUMBER is missing. Set EXOTEL_EXOPHONE_NUMBER in .env');
  }

  // Exotel uses From (ExoPhone number), To (customer number), CallerId (display number)
  const payload = {
    From: from || EXOPHONE_NUMBER,
    To: to,
    CallerId: from || EXOPHONE_NUMBER,
  };

  if (!to) {
    throw new Error('Destination phone number (to) is required');
  }

  // Exotel supports call flow via URL parameter
  // If you have a call flow configured in Exotel dashboard, use FlowId instead
  if (CALL_FLOW_URL) {
    payload.Url = CALL_FLOW_URL;
  } else if (process.env.EXOTEL_FLOW_ID) {
    // Alternative: Use Flow ID if configured in Exotel dashboard
    payload.FlowId = process.env.EXOTEL_FLOW_ID;
  }

  // Exotel supports StatusCallback for webhook notifications
  if (webhookUrl) {
    payload.StatusCallback = webhookUrl;
  }

  // Store context as custom parameters (Exotel supports custom params)
  // These will be available in webhooks and call flow
  if (context && context.leadId) {
    payload.CustomField = JSON.stringify({
      leadId: context.leadId,
      name: context.name || '',
    });
  }

  return payload;
}

/**
 * Create outbound call via Exotel API
 * Endpoint: https://api.exotel.com/v1/Accounts/{AccountSID}/Calls/connect
 */
async function createCall(options) {
  const payload = buildPayload(options);
  
  // Exotel uses HTTP Basic Authentication
  // Username: API Key, Password: API Token
  const auth = {
    username: API_KEY,
    password: API_TOKEN,
  };

  // Exotel API endpoint format
  const apiUrl = `https://api.exotel.com/v1/Accounts/${ACCOUNT_SID}/Calls/connect`;

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  try {
    // Exotel expects form-encoded data, not JSON
    const formData = new URLSearchParams();
    Object.keys(payload).forEach((key) => {
      formData.append(key, payload[key]);
    });

    const response = await axios.post(apiUrl, formData.toString(), {
      headers,
      auth,
      timeout: 15000,
    });

    // Exotel response format
    const callId =
      response.data?.Call?.Sid ||
      response.data?.Call?.CallSid ||
      response.data?.Sid ||
      response.data?.CallSid ||
      null;

    logCallEvent({
      type: 'call.create',
      leadId: options.context?.leadId,
      request: payload,
      response: response.data,
      provider: 'exotel',
    });

    return { callId, data: response.data };
  } catch (error) {
    logCallEvent({
      type: 'call.error',
      leadId: options.context?.leadId,
      request: payload,
      error: error.response?.data || error.message,
      provider: 'exotel',
    });

    const message =
      error.response?.data?.message ||
      error.response?.data?.RestException?.Message ||
      error.response?.data?.error ||
      error.message;
    throw new Error(`Failed to create Exotel call: ${message}`);
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

/**
 * Verify Exotel webhook signature
 * Exotel may send signatures in different headers depending on configuration
 * Check Exotel dashboard webhook settings for signature configuration
 */
function verifyWebhookSignature(req) {
  const secret = process.env.EXOTEL_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret configured, accept webhook (not recommended for production)
    return true;
  }

  // Exotel typically sends signature in X-Exotel-Signature header
  // Format may vary - check Exotel documentation
  const signatureHeader =
    req.headers['x-exotel-signature'] ||
    req.headers['x-exotel-webhook-signature'] ||
    req.headers['x-hub-signature-256'];

  if (!signatureHeader) {
    // Some Exotel webhooks may not include signature - check your dashboard settings
    return true; // Accept if no signature for backward compatibility
  }

  const rawBody =
    req.rawBody ||
    Buffer.from(
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    );

  // Exotel signature format may be "sha256=..." or just hex string
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

