# Vercel Deployment Guide

This guide explains how to deploy CandleSalesAgent to Vercel.

## Quick Setup

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com/)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository: `Ryan-gomezzz/CandleSalesAgent`
5. Configure project settings (see below)

### 2. Project Configuration in Vercel Dashboard

**Build Settings:**
- **Framework Preset:** Other
- **Root Directory:** Leave empty (or `./`)
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install`

### 3. Environment Variables in Vercel

Go to **Settings → Environment Variables** and add:

#### Required Secrets:

```bash
# VAPI Configuration
VAPI_API_KEY=sk-your-api-key-here
VAPI_API_URL=https://api.vapi.ai/phone-call
CALLER_ID=+919876543210

# AWS DynamoDB
USE_DYNAMODB=true
DYNAMODB_TABLE=CandleSalesLeads
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Security
ADMIN_TOKEN=your-strong-random-token

# Server Configuration
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
WEBHOOK_PUBLIC_BASE=https://your-app.vercel.app
DEFAULT_COUNTRY_CODE=+91

# Optional VAPI Settings
USE_PROMPT_INLINE=true
VAPI_VOICE_ID=
VAPI_LANGUAGE_CODE=en-IN
VAPI_WEBHOOK_SECRET=
LOG_FILE_PATH=logs/calls.log
```

**Important:** 
- Replace `https://your-app.vercel.app` with your **actual Vercel deployment URL**
- You'll get the URL after the first deployment
- Update `FRONTEND_URL` and `WEBHOOK_PUBLIC_BASE` after deployment

### 4. Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Copy your deployment URL (e.g., `https://candlesalesagent.vercel.app`)

### 5. Update Environment Variables with Production URL

1. Go to **Settings → Environment Variables**
2. Update `FRONTEND_URL` to your Vercel URL
3. Update `WEBHOOK_PUBLIC_BASE` to your Vercel URL
4. Redeploy (Vercel will auto-redeploy on env var changes)

### 6. Configure VAPI Webhook

1. Go to [vapi.ai dashboard](https://vapi.ai/)
2. Navigate to **Settings → Webhooks**
3. Set webhook URL: `https://your-app.vercel.app/webhook`
4. Enable events:
   - `call.created`
   - `call.answered`
   - `call.completed`
   - `call.failed`
   - `transcription`
5. Save settings

## How It Works on Vercel

### Architecture:

```
User Browser
    ↓
Vercel CDN (Frontend) → https://your-app.vercel.app
    ↓
Vercel Serverless Function → /api/index.js
    ↓
Express App (server/index.js)
    ↓
Routes:
  - POST /enquire
  - POST /webhook
  - GET /admin/leads
  - POST /admin/retry/:leadId
  - GET /health
```

### File Structure:

```
CandleSalesAgent/
├── api/
│   └── index.js          # Vercel serverless function entry point
├── frontend/
│   ├── dist/             # Built frontend (output)
│   └── src/              # React app source
├── server/
│   └── index.js          # Express app
└── vercel.json           # Vercel configuration
```

### Routing:

Vercel routes work as follows:
- **Frontend routes** (`/`, `/enquiry`, `/admin`) → Served from `frontend/dist`
- **API routes** (`/enquire`, `/webhook`, `/admin/*`, `/health`) → Routed to Express app via `api/index.js`

## Troubleshooting

### Frontend Can't Reach Backend

**Problem:** "Failed to fetch" error when submitting form

**Solution:**
1. Check that `VITE_API_BASE_URL` is not set in frontend `.env` (let it default to relative paths)
2. Or set `VITE_API_BASE_URL` to your Vercel URL: `https://your-app.vercel.app`
3. Verify Express app is accessible: `https://your-app.vercel.app/health`

### Environment Variables Not Working

**Problem:** Server shows undefined for environment variables

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Make sure variables are added for **Production** environment
3. Redeploy after adding/updating variables
4. Check Vercel logs to see if variables are loaded

### Webhook Not Receiving Events

**Problem:** VAPI webhooks not reaching your server

**Solution:**
1. Verify webhook URL in VAPI dashboard matches: `https://your-app.vercel.app/webhook`
2. Check Vercel function logs: **Deployments → Your Deployment → Functions → api/index.js**
3. Test webhook endpoint: `curl -X POST https://your-app.vercel.app/webhook -d '{"test":true}'`
4. Verify `WEBHOOK_PUBLIC_BASE` matches your Vercel URL

### DynamoDB Connection Issues

**Problem:** "Failed to initialize database" error

**Solution:**
1. For testing, set `USE_DYNAMODB=false` in environment variables
2. For production, ensure AWS credentials are correct
3. Verify DynamoDB table `CandleSalesLeads` exists in `ap-south-1` region
4. Check AWS IAM permissions for DynamoDB access

### Build Failures

**Problem:** Build fails on Vercel

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure `package.json` has correct scripts
3. Verify all dependencies are in `package.json`
4. Check that `frontend/dist` is generated during build

## Testing Your Deployment

### 1. Test Health Endpoint

```bash
curl https://your-app.vercel.app/health
```

Expected: `{"ok":true,"status":"healthy"}`

### 2. Test Enquiry Form

1. Visit: `https://your-app.vercel.app/enquiry`
2. Fill out form with test phone number
3. Submit
4. Check Vercel function logs for success

### 3. Test Admin Panel

1. Open browser console
2. Run: `localStorage.setItem('candle_admin_token', 'YOUR_ADMIN_TOKEN')`
3. Visit: `https://your-app.vercel.app/admin`
4. Click "Sync token" → "Refresh leads"
5. Verify leads appear

### 4. Test Webhook

```bash
curl -X POST https://your-app.vercel.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"call.created","context":{"leadId":"test-123"}}'
```

Expected: `{"ok":true}`

## Environment Variables Checklist

Make sure all these are set in Vercel:

✅ **VAPI_API_KEY** - Your VAPI API key  
✅ **VAPI_API_URL** - `https://api.vapi.ai/phone-call`  
✅ **CALLER_ID** - Your VAPI phone number  
✅ **USE_DYNAMODB** - `true` for production  
✅ **DYNAMODB_TABLE** - `CandleSalesLeads`  
✅ **AWS_REGION** - `ap-south-1`  
✅ **AWS_ACCESS_KEY_ID** - Your AWS key  
✅ **AWS_SECRET_ACCESS_KEY** - Your AWS secret  
✅ **ADMIN_TOKEN** - Strong random token  
✅ **FRONTEND_URL** - Your Vercel URL (after deployment)  
✅ **WEBHOOK_PUBLIC_BASE** - Your Vercel URL (after deployment)  
✅ **DEFAULT_COUNTRY_CODE** - `+91`  

## Important Notes

- **Cold Starts:** Vercel serverless functions may have cold starts (~1-2 seconds). This is normal.
- **Function Timeout:** Set to 30 seconds in `vercel.json`. For longer operations, consider upgrading Vercel plan.
- **File System:** Vercel serverless functions are read-only. Use DynamoDB or external storage, not local files.
- **Logging:** Check Vercel function logs in dashboard under **Deployments → Your Deployment → Functions**
- **CORS:** Already configured in Express app to allow Vercel domain

## Next Steps After Deployment

1. ✅ **Update VAPI webhook URL** with your Vercel URL
2. ✅ **Test end-to-end** with a real phone number
3. ✅ **Monitor logs** in Vercel dashboard
4. ✅ **Set up custom domain** (optional) in Vercel settings
5. ✅ **Enable analytics** in Vercel dashboard (optional)

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **VAPI Docs:** https://docs.vapi.ai/

