# Switching from Exotel to Twilio

This guide explains how to switch the telephony provider from Exotel to Twilio, and how the implementation works.

## Quick Comparison

| Feature | Exotel | Twilio |
|---------|--------|--------|
| **API Endpoint** | `https://api.exotel.com/v1/Accounts/{SID}/Calls/connect` | `https://api.twilio.com/2010-04-01/Accounts/{SID}/Calls.json` |
| **Authentication** | HTTP Basic (API Key : API Token) | HTTP Basic (Account SID : Auth Token) |
| **Call Flow** | XML via URL or Flow ID | TwiML via URL or inline |
| **Webhook Format** | Custom JSON | Form-encoded with CallStatus |
| **Webhook Signature** | HMAC-SHA256 (optional) | HMAC-SHA1 (recommended) |
| **Status Values** | queued, ringing, in-progress, completed, failed, busy, no-answer | queued, ringing, in-progress, completed, busy, failed, no-answer, canceled |
| **Recording** | Via webhook | Via RecordingUrl in webhook |
| **Transcription** | Custom fields | Via Twilio Intelligence or external service |

## How to Switch

### Step 1: Update Environment Variables

Replace Exotel variables with Twilio variables in `.env`:

```bash
# Remove Exotel variables
# EXOTEL_ACCOUNT_SID=
# EXOTEL_API_KEY=
# EXOTEL_API_TOKEN=
# EXOTEL_EXOPHONE_NUMBER=
# EXOTEL_CALL_FLOW_URL=
# EXOTEL_FLOW_ID=
# EXOTEL_WEBHOOK_SECRET=

# Add Twilio variables
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+919876543210
TWILIO_CALL_FLOW_URL=https://your-domain.com/twiml
TWILIO_RECORD_CALLS=false
```

### Step 2: Update Server Code

#### Option A: Simple Switch (Update Imports)

**Update `server/routes/enquire.js`:**
```javascript
// Change this:
const { createCallWithRetry } = require('../lib/exotelClient');

// To this:
const { createCallWithRetry } = require('../lib/twilioClient');
```

**Update `server/routes/webhook.js`:**
```javascript
// Change this:
const { verifyWebhookSignature } = require('../lib/exotelClient');

// To this:
const { verifyWebhookSignature } = require('../lib/twilioClient');
```

**Update `server/index.js`:**
```javascript
// Change this:
const { createCallWithRetry } = require('./lib/exotelClient');

// To this:
const { createCallWithRetry } = require('./lib/twilioClient');

// Add TwiML route:
const twimlRouter = require('./routes/twiml');
app.use('/twiml', twimlRouter);
```

#### Option B: Multi-Provider Support (Recommended)

Create a provider abstraction:

**Create `server/lib/telephonyClient.js`:**
```javascript
const TELEPHONY_PROVIDER = process.env.TELEPHONY_PROVIDER || 'exotel';

let client;
if (TELEPHONY_PROVIDER === 'twilio') {
  client = require('./twilioClient');
} else {
  client = require('./exotelClient');
}

module.exports = client;
```

Then use:
```javascript
const { createCallWithRetry, verifyWebhookSignature } = require('./lib/telephonyClient');
```

### Step 3: Update Webhook Handler for Twilio Format

The webhook handler needs to parse Twilio's form-encoded format:

**Twilio webhook fields:**
- `CallSid` - Unique call identifier
- `CallStatus` - queued, ringing, in-progress, completed, busy, failed, no-answer, canceled
- `From` - Caller phone number
- `To` - Called phone number
- `Duration` - Call duration in seconds
- `RecordingUrl` - Recording URL if recording enabled
- Custom parameters via URL query string

**Update `server/routes/webhook.js`** to handle both formats:

```javascript
// Detect provider by webhook format
const isTwilio = req.headers['x-twilio-signature'] || req.body?.CallSid;
const isExotel = req.headers['x-exotel-signature'] || req.body?.CallStatus?.includes('-');

if (isTwilio) {
  // Use Twilio client for signature verification
  const { verifyWebhookSignature } = require('../lib/twilioClient');
  // Parse Twilio format...
} else if (isExotel) {
  // Use Exotel client for signature verification
  const { verifyWebhookSignature } = require('../lib/exotelClient');
  // Parse Exotel format...
}
```

### Step 4: Set Up Twilio Account

1. **Sign up** at [twilio.com](https://www.twilio.com/)
2. **Get credentials:**
   - Account SID (found in dashboard)
   - Auth Token (found in dashboard)
3. **Buy a phone number:**
   - Go to Phone Numbers → Buy a Number
   - Select India (+91) and choose a number
   - Set as `TWILIO_PHONE_NUMBER`
4. **Configure webhooks:**
   - In Twilio Console → Voice → Settings
   - Set Status Callback URL: `https://your-domain.com/webhook`
   - Enable events: initiated, ringing, answered, completed, busy, failed, no-answer, canceled

### Step 5: Configure Call Flow (TwiML)

1. **Create TwiML endpoint:**
   - The endpoint at `/twiml` returns TwiML XML
   - TwiML defines call flow (greetings, menu, speech recognition, etc.)

2. **For AI voice integration:**
   - Option 1: Use `<Gather>` with speech recognition
   - Option 2: Use `<Connect>` with Media Streams (WebSocket)
   - Option 3: Use Twilio Intelligence for conversational AI
   - Option 4: Integrate with external AI service via API

3. **Update `TWILIO_CALL_FLOW_URL`:**
   ```bash
   TWILIO_CALL_FLOW_URL=https://your-domain.com/twiml
   ```

## How It Works

### Current Flow (Exotel)

```
1. User submits enquiry form
   ↓
2. Backend calls Exotel API: POST /v1/Accounts/{SID}/Calls/connect
   ↓
3. Exotel makes call to customer
   ↓
4. Exotel sends webhook events: queued → ringing → in-progress → completed
   ↓
5. Backend updates lead status in DynamoDB
```

### New Flow (Twilio)

```
1. User submits enquiry form
   ↓
2. Backend calls Twilio API: POST /2010-04-01/Accounts/{SID}/Calls.json
   ↓
3. Twilio makes call to customer
   ↓
4. Twilio requests TwiML from /twiml endpoint (defines call flow)
   ↓
5. Twilio executes TwiML (plays greeting, gathers input, etc.)
   ↓
6. Twilio sends webhook events: queued → ringing → in-progress → completed
   ↓
7. Backend updates lead status in DynamoDB
```

## Key Differences

### 1. Call Flow Definition

**Exotel:**
- Uses XML call flow via URL parameter
- Or uses Flow ID configured in dashboard
- Example: `<Response><Play>greeting.mp3</Play></Response>`

**Twilio:**
- Uses TwiML (Twilio Markup Language) via URL parameter
- Must return XML from your server endpoint
- Example: `<Response><Say>Hello</Say><Gather></Gather></Response>`

### 2. Webhook Format

**Exotel:**
```json
{
  "CallStatus": "completed",
  "CallSid": "abc123",
  "CustomField": "{\"leadId\":\"xyz\"}"
}
```

**Twilio:**
```
Form-encoded POST data:
CallStatus=completed
CallSid=abc123
leadId=xyz (via URL query parameter)
```

### 3. Signature Verification

**Exotel:**
- Uses HMAC-SHA256 with webhook secret
- Header: `X-Exotel-Signature`

**Twilio:**
- Uses HMAC-SHA1 with Auth Token
- Header: `X-Twilio-Signature`
- Must include full URL + sorted parameters

### 4. AI Voice Integration

**Exotel:**
- Use Passthru applet to external AI service
- Or configure Exotel voice bot

**Twilio:**
- Use `<Gather>` with speech recognition
- Use `<Connect>` with Media Streams (WebSocket)
- Use Twilio Intelligence (conversational AI)
- Or integrate external AI via API

## Files Added

1. **`server/lib/twilioClient.js`** - Twilio API client
2. **`server/routes/twiml.js`** - TwiML handler for call flows

## Testing

1. **Test call creation:**
   ```bash
   curl -X POST http://localhost:3000/enquire \
     -H "Content-Type: application/json" \
     -d '{"phone":"+919876543210","consent":true}'
   ```

2. **Test TwiML endpoint:**
   ```bash
   curl http://localhost:3000/twiml
   ```

3. **Test webhook:**
   - Use ngrok to expose local server
   - Configure webhook URL in Twilio dashboard
   - Make a test call and verify webhook events

## Advantages of Twilio

✅ **Global reach** - Works in 180+ countries  
✅ **Better AI integration** - Twilio Intelligence for conversational AI  
✅ **Media Streams** - Real-time audio streaming via WebSocket  
✅ **Better documentation** - Extensive docs and examples  
✅ **Flexible TwiML** - Powerful call flow definition  

## Advantages of Exotel

✅ **India-focused** - Optimized for Indian market  
✅ **Local support** - Indian customer support  
✅ **Better rates** - Competitive pricing for India  
✅ **Local numbers** - Easy to get Indian phone numbers  

## Recommendation

- **Use Exotel** if targeting primarily Indian customers
- **Use Twilio** if you need:
  - Global reach
  - Advanced AI features
  - Media Streams for real-time audio
  - Better developer ecosystem

You can also support both providers by detecting the provider in environment variables and using the appropriate client.

