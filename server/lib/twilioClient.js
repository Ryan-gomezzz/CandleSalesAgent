const axios = require('axios');
const crypto = require('crypto');
const { logCallEvent } = require('./logger');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number
const CALL_FLOW_URL = process.env.TWILIO_CALL_FLOW_URL; // URL to your TwiML call flow handler
const MAX_ATTEMPTS = 3;

/**
 * Build Twilio API payload for outbound call
 * Twilio API Documentation: https://www.twilio.com/docs/voice/api/call-resource
 */
function buildPayload({ to, from, context, webhookUrl }) {
  if (!ACCOUNT_SID) {
    throw new Error('TWILIO_ACCOUNT_SID is not configured');
  }
  if (!AUTH_TOKEN) {
    throw new Error('TWILIO_AUTH_TOKEN is not configured');
  }
  if (!TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is missing. Set TWILIO_PHONE_NUMBER in .env');
  }

  // Twilio uses From (Twilio number), To (customer number)
  const payload = {
    From: from || TWILIO_PHONE_NUMBER,
    To: to,
  };

  if (!to) {
    throw new Error('Destination phone number (to) is required');
  }

  // Twilio requires TwiML URL or TwiML string to define call flow
  // Option 1: Use TwiML URL (recommended)
  if (CALL_FLOW_URL) {
    payload.Url = CALL_FLOW_URL;
    // For AI voice integration, Twilio can make HTTP requests to your TwiML URL
    // which can then use <Gather> for speech recognition or <Connect> to external service
  } else {
    // Option 2: Inline TwiML (simpler but less flexible)
    // You can provide TwiML string directly if needed
    payload.TwiML = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hello</Say><Hangup /></Response>';
  }

  // Twilio StatusCallback for webhook notifications
  // Twilio sends call status updates to this URL
  if (webhookUrl) {
    payload.StatusCallback = webhookUrl;
    // Twilio sends: Initiated, Ringing, In-Progress, Completed, Busy, Failed, No-Answer, Canceled
    payload.StatusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed', 'busy', 'failed', 'no-answer', 'canceled'];
    payload.StatusCallbackMethod = 'POST';
  }

  // Twilio supports custom parameters via URL parameters in webhook callbacks
  // Store context as URL parameters that will be passed back in webhooks
  if (context && context.leadId) {
    // Twilio passes these as query parameters in webhook requests
    payload.StatusCallbackEvent = payload.StatusCallbackEvent || [];
    // Context will be passed via webhook URL or stored in your backend
    // Alternative: Use Twilio's 'Status' parameter or custom headers
  }

  // Twilio supports recording
  if (process.env.TWILIO_RECORD_CALLS === 'true') {
    payload.Record = true;
    payload.RecordingStatusCallback = webhookUrl ? `${webhookUrl}?event=recording` : undefined;
  }

  return payload;
}

/**
 * Create outbound call via Twilio API
 * Endpoint: https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Calls.json
 */
async function createCall(options) {
  const payload = buildPayload(options);
  
  // Twilio uses HTTP Basic Authentication
  // Username: Account SID, Password: Auth Token
  const auth = {
    username: ACCOUNT_SID,
    password: AUTH_TOKEN,
  };

  // Twilio API endpoint format
  const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Calls.json`;

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  try {
    // Twilio expects form-encoded data, not JSON
    const formData = new URLSearchParams();
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (Array.isArray(value)) {
        // Twilio StatusCallbackEvent can be an array
        value.forEach((item) => formData.append(key, item));
      } else {
        formData.append(key, value);
      }
    });

    const response = await axios.post(apiUrl, formData.toString(), {
      headers,
      auth,
      timeout: 15000,
    });

    // Twilio response format
    const callId =
      response.data?.sid ||
      response.data?.CallSid ||
      null;

    logCallEvent({
      type: 'call.create',
      leadId: options.context?.leadId,
      request: payload,
      response: response.data,
      provider: 'twilio',
    });

    return { callId, data: response.data };
  } catch (error) {
    logCallEvent({
      type: 'call.error',
      leadId: options.context?.leadId,
      request: payload,
      error: error.response?.data || error.message,
      provider: 'twilio',
    });

    const message =
      error.response?.data?.message ||
      error.response?.data?.RestException?.Message ||
      error.response?.data?.error ||
      error.message;
    throw new Error(`Failed to create Twilio call: ${message}`);
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
 * Verify Twilio webhook signature
 * Twilio signs webhooks with HMAC-SHA1 using your Auth Token
 * Documentation: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function verifyWebhookSignature(req) {
  const authToken = AUTH_TOKEN;
  if (!authToken) {
    // If no auth token configured, accept webhook (not recommended for production)
    return true;
  }

  // Twilio sends signature in X-Twilio-Signature header
  const signatureHeader = req.headers['x-twilio-signature'];

  if (!signatureHeader) {
    // Twilio always includes signature, so reject if missing
    return false;
  }

  // Get the full URL that Twilio requested
  const protocol = req.protocol || 'https';
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

  // Get form data (Twilio sends as form-encoded)
  const params = { ...req.body, ...req.query };
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

  // Build signature string
  const signatureString = fullUrl + new URLSearchParams(sortedParams).toString();

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(signatureString, 'utf-8'))
    .digest('base64');

  // Compare signatures (constant-time comparison)
  const actualBuffer = Buffer.from(signatureHeader, 'base64');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64');

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

