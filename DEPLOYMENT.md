# Deployment Guide - CandleSalesAgent

This guide provides deployment-ready configuration for CandleSalesAgent using VAPI (Voice AI Platform) with Twilio telephony integration.

## GitHub Secrets & Variables Configuration

### GitHub Secrets (Settings → Secrets and variables → Actions → Secrets)

Add these sensitive credentials as **Secrets**:

1. **VAPI_API_KEY** - Your VAPI API key (starts with `sk-`)
2. **VAPI_WEBHOOK_SECRET** - Optional: Webhook signature secret from VAPI dashboard
3. **AWS_ACCESS_KEY_ID** - AWS access key for DynamoDB
4. **AWS_SECRET_ACCESS_KEY** - AWS secret key for DynamoDB
5. **ADMIN_TOKEN** - Strong random token for admin API/UI access

### GitHub Variables (Settings → Secrets and variables → Actions → Variables)

Add these non-sensitive configuration values as **Variables**:

1. **PORT** = `3000`
2. **FRONTEND_URL** = `https://your-production-domain.com` (update after deployment)
3. **WEBHOOK_PUBLIC_BASE** = `https://your-production-domain.com` (update after deployment)
4. **DEFAULT_COUNTRY_CODE** = `+91`
5. **VAPI_API_URL** = `https://api.vapi.ai/phone-call`
6. **CALLER_ID** = `+919876543210` (your VAPI phone number)
7. **USE_PROMPT_INLINE** = `true`
8. **PROMPT_FLOW_ID** = (leave empty if using inline prompt)
9. **VAPI_VOICE_ID** = (optional: voice ID from VAPI dashboard)
10. **VAPI_LANGUAGE_CODE** = `en-IN` (optional)
11. **USE_DYNAMODB** = `true`
12. **DYNAMODB_TABLE** = `CandleSalesLeads`
13. **AWS_REGION** = `ap-south-1`
14. **LOG_FILE_PATH** = `logs/calls.log`

## VAPI Setup (Required Before Deployment)

1. **Sign up at [vapi.ai](https://vapi.ai/)**
2. **Get your API key** from the VAPI dashboard
3. **Configure a phone number** in VAPI dashboard (VAPI handles Twilio integration automatically)
4. **Set webhook URL** in VAPI dashboard: `https://your-domain.com/webhook`
5. **Enable webhook events:**
   - `call.created`
   - `call.answered`
   - `call.completed`
   - `call.failed`
   - `transcription`
6. **Copy your API key** and add it as `VAPI_API_KEY` secret in GitHub

## Deployment Platforms

### Option 1: Render

1. **Connect GitHub repository** to Render
2. **Create new Web Service**
3. **Build settings:**
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
4. **Environment variables:** Add all secrets and variables from above
5. **Deploy**

### Option 2: AWS Cloud Run

1. **Build Docker image** (if using Docker) or deploy directly
2. **Create Cloud Run service**
3. **Set environment variables** in Cloud Run console
4. **Assign IAM role** with DynamoDB permissions (recommended over access keys)
5. **Deploy**

### Option 3: Railway

1. **Connect GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically**

## Post-Deployment Checklist

1. ✅ **Update URLs** in GitHub Variables:
   - `FRONTEND_URL` = your actual frontend URL
   - `WEBHOOK_PUBLIC_BASE` = your actual backend URL

2. ✅ **Configure VAPI webhook:**
   - Webhook URL: `https://your-domain.com/webhook`
   - Enable all required events

3. ✅ **Test end-to-end:**
   - Submit enquiry form
   - Verify call is placed
   - Check webhook events are received
   - Verify lead appears in admin UI

4. ✅ **Monitor logs:**
   - Check application logs for errors
   - Verify webhook events are being received
   - Monitor DynamoDB for lead storage

## Important Notes

- **VAPI handles Twilio integration automatically** - no need to configure Twilio credentials separately
- **System prompt** is automatically included with each call (stored in `server/prompts/candle_maya_system_prompt.txt`)
- **DynamoDB table** must be created before deployment (run `node scripts/create-dynamodb-table.js` or create via AWS console)
- **Admin token** should be rotated before going live
- **Webhook signature** verification is optional but recommended for production

## Quick Start Commands

```bash
# Local development
cd server && npm install && npm run dev
cd frontend && npm install && npm run dev

# Test webhook locally with ngrok
ngrok http 3000
# Update WEBHOOK_PUBLIC_BASE with ngrok URL

# Deploy to production
# Set all environment variables in deployment platform
# Deploy and verify endpoints are working
```

## Support

- **VAPI Documentation:** https://docs.vapi.ai/
- **DynamoDB Setup:** See `infra/aws-setup.md`
- **API Endpoints:** See `README.md`

