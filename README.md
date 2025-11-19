# CandleSalesAgent

Full-stack reference implementation for the Candle & Co outbound sales workflow. Visitors submit an enquiry form, the backend saves the lead (DynamoDB or local JSON fallback) and triggers an outbound voice call through Exotel using the Candle & Co “Maya” system prompt. An admin UI lists leads for manual review.

## Highlights

- React + Vite + Tailwind landing/enquiry/admin pages with responsive layout and warm, serif-led branding.
- Express API with `/enquire`, `/webhook`, `/admin/leads`, and `/admin/retry/:leadId`, rate limited and CORS protected.
- AWS DynamoDB (DocumentClient) persistence with transparent fallback to `data/leads.json` when `USE_DYNAMODB=false`.
- Exotel telephony integration with exponential retries, webhook signature verification, call event logging, and call flow handler for AI integration.
- System prompt stored at `server/prompts/candle_maya_system_prompt.txt` and reused everywhere.
- Jest test stub for `/enquire`, ESLint + Prettier configs, and utility scripts for table creation and prompt uploads.

## Repo structure

```
CandleSalesAgent/
├─ README.md
├─ .env.example
├─ package.json
├─ frontend/… (React + Vite app)
├─ server/… (Express API)
├─ scripts/
│  ├─ create-dynamodb-table.js
│  └─ seed_sample_prompt.js
├─ data/leads.json            # local fallback store
└─ logs/calls.log             # webhook + call tracing
```

## Environment variables

Copy `.env.example` to `.env` at the repo root. Keys:

| Key | Purpose |
| --- | --- |
| `PORT` | Express port (default 3000). |
| `FRONTEND_URL` | Comma-separated origins allowed via CORS (e.g., `http://localhost:5173`). |
| `WEBHOOK_PUBLIC_BASE` | Public base URL for webhook callbacks (use ngrok URL in dev). |
| `ADMIN_TOKEN` | Shared secret required for admin API/UI (set a strong random string). |
| `DEFAULT_COUNTRY_CODE` | Defaults to `+91` for phone normalization. |
| `EXOTEL_ACCOUNT_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN` | Exotel account credentials from dashboard. |
| `EXOTEL_EXOPHONE_NUMBER` | Your Exotel phone number (ExoPhone) for outbound calls (e.g., `+91XXXXXXXXXX`). |
| `EXOTEL_CALL_FLOW_URL` | URL to call flow handler for AI integration (e.g., `https://your-domain.com/callflow`). |
| `EXOTEL_FLOW_ID` | Optional: Exotel Flow ID if configured in dashboard (alternative to URL). |
| `EXOTEL_WEBHOOK_SECRET` | Optional: Webhook signature secret from Exotel dashboard. |
| `USE_DYNAMODB`, `DYNAMODB_TABLE`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | DynamoDB configuration. Set `USE_DYNAMODB=false` for local JSON fallback. |
| `LOG_FILE_PATH` | Optional override for call event logging (defaults to `logs/calls.log`). |

> Frontend uses `VITE_API_BASE_URL` (set in `frontend/.env` if needed) to point to the server.

## Getting started

1. **Install dependencies**
   ```bash
   cd CandleSalesAgent/server && npm install
   cd ../frontend && npm install
   ```
2. **Environment**
   - Copy `.env.example` → `.env`.
   - For local development, set `USE_DYNAMODB=false` and keep `LOG_FILE_PATH=logs/calls.log`.
   - Optionally create `frontend/.env` with `VITE_API_BASE_URL=http://localhost:3000`.
3. **Start servers**
   ```bash
   # Terminal 1
   cd CandleSalesAgent/server
   npm run dev

   # Terminal 2
   cd CandleSalesAgent/frontend
   npm run dev
   ```
   The landing page is at `http://localhost:5173`; backend at `http://localhost:3000`.
4. **Ngrok testing**
   ```bash
   ngrok http 3000
   ```
   - Copy the HTTPS URL into `WEBHOOK_PUBLIC_BASE`.
   - Redeploy/restart the server so outbound call payloads include the new webhook URL.

## Database options

- **Primary (DynamoDB)**  
  - Ensure AWS credentials or IAM role have DynamoDB permissions.  
  - Run `node scripts/create-dynamodb-table.js` once (idempotent) to provision `CandleSalesLeads`.
- **Fallback (local JSON)**  
  - Set `USE_DYNAMODB=false` to use `data/leads.json`.  
  - This is ideal for quick local testing without AWS.

## Exotel integration

- **Setup Exotel account:**
  1. Sign up at [exotel.com](https://exotel.com/) and get your Account SID, API Key, and API Token from the dashboard.
  2. Configure an ExoPhone number (your Exotel phone number) for outbound calls.
  3. Set `EXOTEL_ACCOUNT_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, and `EXOTEL_EXOPHONE_NUMBER` in `.env`.

- **Call flow for AI voice integration:**
  - Option 1: Use Exotel Passthru applet to connect to your AI service (recommended for AI voice conversations).
  - Option 2: Configure call flow in Exotel dashboard pointing to `https://your-domain.com/callflow` endpoint.
  - Option 3: Use Exotel's voice bot service if available.
  - See `server/routes/callflow.js` for example XML call flow structure.

- **Webhook configuration:**
  - Set `WEBHOOK_PUBLIC_BASE` to your production domain or ngrok URL.
  - Configure webhook URL in Exotel dashboard: `https://your-domain.com/webhook`
  - Enable webhook events: Call Status (ringing, in-progress, completed, failed, etc.)
  - Set `EXOTEL_WEBHOOK_SECRET` if signature verification is enabled in Exotel dashboard.

- **Documentation:** See `server/lib/exotelClient.js` for implementation details and Exotel API reference at [developer.exotel.com](https://developer.exotel.com/api).

## API endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST /enquire` | Validates consent + phone, saves lead, triggers outbound call via Exotel (rate-limited to 3/min per IP). |
| `POST /webhook` | Accepts Exotel webhook events, verifies signature (if configured), updates lead status/transcriptions. |
| `POST /callflow` | Exotel call flow handler endpoint (returns XML). Use for AI voice integration with Passthru applet. |
| `GET /admin/leads` | Requires `Authorization: Bearer <ADMIN_TOKEN>`. Returns sorted leads for admin UI. |
| `POST /admin/retry/:leadId` | Admin-only manual requeue for failed leads. |
| `GET /health` | Simple readiness probe. |

## Admin UI

- Accessible at `http://localhost:5173/admin`.
- Before refreshing data, run following in browser devtools to persist your admin token:
  ```js
  localStorage.setItem('candle_admin_token', 'YOUR_ADMIN_TOKEN');
  ```
- Click **Sync token** → **Refresh leads**. Table shows core fields plus a transcription snippet, and a detail view dumps the full record.

## Testing & linting

- **Backend tests:** `cd server && npm run test`
- **Lint (repo-wide):** `npm run lint`
- **Format:** `npm run format`

## Deployment (Render or Cloud Run)

1. **Prepare assets**
   - Build frontend: `cd frontend && npm run build`. Deploy `dist/` to static hosting or serve via CDN.
   - Deploy server from `server/` directory (Render Node service or Cloud Run container).
2. **Configure environment variables on the host**
   - Server: `PORT`, `FRONTEND_URL`, `WEBHOOK_PUBLIC_BASE`, `ADMIN_TOKEN`.
   - Exotel: `EXOTEL_ACCOUNT_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_EXOPHONE_NUMBER`, `EXOTEL_CALL_FLOW_URL`, `EXOTEL_WEBHOOK_SECRET` (optional).
   - Database: `USE_DYNAMODB=true`, `DYNAMODB_TABLE`, `AWS_REGION`, plus AWS credentials or attach an IAM role.
3. **Provision data layer**
   - Run `node scripts/create-dynamodb-table.js` locally with prod credentials or create `CandleSalesLeads` via AWS console.
4. **Deploy**
   - Render: point service to `server/index.js`, enable build command `npm install && npm run build` (if bundling) and start command `npm run start`.
   - Cloud Run: build Docker image (e.g., `gcloud builds submit`) and deploy; expose port 3000.
5. **Hook up Exotel webhooks**
   - Configure webhook URL in Exotel dashboard: `https://your-domain.com/webhook`
   - Enable webhook events: Call Status updates (queued, ringing, in-progress, completed, failed, busy, no-answer, canceled)
   - Set `EXOTEL_WEBHOOK_SECRET` if signature verification is enabled in Exotel dashboard.
   - Ensure `WEBHOOK_PUBLIC_BASE` matches the final public URL.
6. **Smoke test**
   - Submit an enquiry with a reachable phone number.
   - Confirm call, webhook updates, and admin UI lead display.
7. **Monitoring**
   - Tail `logs/calls.log` or platform logs; wire alerts for failed events.

## Manual steps after deployment (must-do checklist)

1. **Exotel account setup:**
   - Sign up at [exotel.com](https://exotel.com/) and get your Account SID, API Key, API Token from the dashboard.
   - Configure an ExoPhone number (your Exotel phone number) for outbound calls.
   - Populate `.env` with `EXOTEL_ACCOUNT_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, and `EXOTEL_EXOPHONE_NUMBER`.

2. **Provision DynamoDB table:**
   - Create via AWS console or run `node scripts/create-dynamodb-table.js` with production credentials.
   - Ensure AWS credentials or IAM role have DynamoDB permissions.

3. **Configure webhooks and call flow:**
   - Obtain a public HTTPS URL (ngrok for dev, domain for prod) and set `WEBHOOK_PUBLIC_BASE`.
   - Configure webhook URL in Exotel dashboard: `https://your-domain.com/webhook`
   - Set up call flow URL: `EXOTEL_CALL_FLOW_URL=https://your-domain.com/callflow` (for AI integration) or use Exotel dashboard Flow ID.

4. **Review system prompt:**
   - Check `server/prompts/candle_maya_system_prompt.txt` and adjust wording if needed for brand voice.

5. **AI voice integration (optional):**
   - For AI voice conversations, configure Exotel Passthru applet to connect to your AI service.
   - Or use Exotel's voice bot service if available.
   - See `server/routes/callflow.js` for call flow XML examples.

6. **Test end-to-end:**
   - Place at least one real test call and confirm webhook events are received.
   - Verify lead appears in admin UI with correct status and call details.

7. **Security:**
   - Store `ADMIN_TOKEN` securely, rotate it before go-live, and share only with trusted operators.
   - Set `EXOTEL_WEBHOOK_SECRET` if signature verification is enabled in Exotel dashboard.

## Troubleshooting

- **Call creation fails immediately:** Check `EXOTEL_EXOPHONE_NUMBER`, Exotel credentials (`EXOTEL_ACCOUNT_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`), and `logs/calls.log`. The server also records the last provider error on each lead.
- **Webhook signature errors:** Ensure `EXOTEL_WEBHOOK_SECRET` matches Exotel dashboard settings; set it to empty during local testing if signatures aren't supported.
- **Admin page blank:** Confirm the token is stored in `localStorage` and matches the backend's `ADMIN_TOKEN`.
- **Ngrok not receiving events:** Double-check `WEBHOOK_PUBLIC_BASE` and the Exotel dashboard webhook URL; restart the server after changing it.
- **AI voice integration:** For AI conversations, configure Exotel Passthru applet to connect to your AI service, or use Exotel's voice bot service. See `server/routes/callflow.js` for call flow examples.

Happy selling! Maya is ready to light up your leads.


