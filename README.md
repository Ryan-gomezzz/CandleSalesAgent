# CandleSalesAgent

Full-stack reference implementation for the Candle & Co outbound sales workflow. Visitors submit an enquiry form, the backend saves the lead (DynamoDB or local JSON fallback) and triggers an outbound voice call through the WAPI/VAPI provider using the Candle & Co “Maya” system prompt. An admin UI lists leads for manual review.

## Highlights

- React + Vite + Tailwind landing/enquiry/admin pages with responsive layout and warm, serif-led branding.
- Express API with `/enquire`, `/webhook`, `/admin/leads`, and `/admin/retry/:leadId`, rate limited and CORS protected.
- AWS DynamoDB (DocumentClient) persistence with transparent fallback to `data/leads.json` when `USE_DYNAMODB=false`.
- WAPI/VAPI abstraction with exponential retries, webhook signature verification, call event logging, and seed script for uploading prompts/flows.
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
| `CALLER_ID` | Outbound caller number supplied to WAPI/VAPI. |
| `ADMIN_TOKEN` | Shared secret required for admin API/UI (set a strong random string). |
| `DEFAULT_COUNTRY_CODE` | Defaults to `+91` for phone normalization. |
| `VAPI_API_URL`, `VAPI_API_KEY`, `VAPI_WEBHOOK_SECRET` | Provider credentials. |
| `USE_PROMPT_INLINE`, `PROMPT_FLOW_ID`, `VAPI_PROMPT_UPLOAD_URL` | Controls inline prompt vs. uploaded flow usage. |
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

## WAPI / VAPI integration

- Configure `VAPI_API_URL`, `VAPI_API_KEY`, `CALLER_ID`, and `WEBHOOK_PUBLIC_BASE`.
- `server/lib/vapiClient.js` documents where to plug provider-specific fields (`messages`, `system_prompt`, `flow_id`, `voice_id`, etc.).
- Signature validation uses `VAPI_WEBHOOK_SECRET`; leave blank to skip verification.
- Upload the Candle & Co prompt if your provider requires a flow/template:
  ```bash
  node scripts/seed_sample_prompt.js
  ```
  Store the returned ID in `PROMPT_FLOW_ID` and set `USE_PROMPT_INLINE=false`.

## API endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST /enquire` | Validates consent + phone, saves lead, triggers outbound call (rate-limited to 3/min per IP). |
| `POST /webhook` | Accepts provider events, verifies signature (if configured), updates lead status/transcriptions. |
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
   - Server: `PORT`, `FRONTEND_URL`, `WEBHOOK_PUBLIC_BASE`, `CALLER_ID`, `ADMIN_TOKEN`.
   - WAPI: `VAPI_API_URL`, `VAPI_API_KEY`, `VAPI_WEBHOOK_SECRET`, `USE_PROMPT_INLINE` + `PROMPT_FLOW_ID` (if applicable).
   - Database: `USE_DYNAMODB=true`, `DYNAMODB_TABLE`, `AWS_REGION`, plus AWS credentials or attach an IAM role.
3. **Provision data layer**
   - Run `node scripts/create-dynamodb-table.js` locally with prod credentials or create `CandleSalesLeads` via AWS console.
4. **Deploy**
   - Render: point service to `server/index.js`, enable build command `npm install && npm run build` (if bundling) and start command `npm run start`.
   - Cloud Run: build Docker image (e.g., `gcloud builds submit`) and deploy; expose port 3000.
5. **Hook up webhooks**
   - Update provider dashboard with `https://your-domain.com/webhook`.
   - Ensure `WEBHOOK_PUBLIC_BASE` matches the final public URL.
6. **Smoke test**
   - Submit an enquiry with a reachable phone number.
   - Confirm call, webhook updates, and admin UI lead display.
7. **Monitoring**
   - Tail `logs/calls.log` or platform logs; wire alerts for failed events.

## Manual steps after deployment (must-do checklist)

1. Populate `.env` with real `VAPI_API_URL`, `VAPI_API_KEY`, and `CALLER_ID`.
2. Provision the DynamoDB table (via AWS console or `node scripts/create-dynamodb-table.js`) and provide valid AWS credentials or IAM role access.
3. Obtain a public HTTPS URL (ngrok for dev, domain for prod) and set `WEBHOOK_PUBLIC_BASE`. Mirror the webhook URL inside your WAPI dashboard.
4. Review `server/prompts/candle_maya_system_prompt.txt` and adjust wording if you’d like to tweak the brand voice.
5. If your provider needs uploaded flows/templates, run `node scripts/seed_sample_prompt.js` and follow the printed instructions to capture the returned ID in `PROMPT_FLOW_ID`.
6. Place at least one real test call and confirm webhook events plus call recordings are logged.
7. Store the `ADMIN_TOKEN` securely, rotate it before go-live, and share it only with trusted operators.

## Troubleshooting

- **Call creation fails immediately:** Check `CALLER_ID`, provider credentials, and `logs/calls.log`. The server also records the last provider error on each lead.
- **Webhook signature errors:** Ensure `VAPI_WEBHOOK_SECRET` matches provider settings; set it to empty during local testing if signatures aren’t supported.
- **Admin page blank:** Confirm the token is stored in `localStorage` and matches the backend’s `ADMIN_TOKEN`.
- **Ngrok not receiving events:** Double-check `WEBHOOK_PUBLIC_BASE` and the provider’s webhook URL; restart the server after changing it.

Happy selling! Maya is ready to light up your leads.


