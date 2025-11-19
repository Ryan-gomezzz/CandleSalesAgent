const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const enquireRouter = require('./routes/enquire');
const webhookRouter = require('./routes/webhook');
const callflowRouter = require('./routes/callflow');
const { initDb, getLeads, getLeadById, updateLead } = require('./lib/db');
const { createCallWithRetry } = require('./lib/exotelClient');

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const FRONTEND_URLS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || FRONTEND_URLS.length === 0 || FRONTEND_URLS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const promptPath = path.resolve(
  __dirname,
  'prompts',
  'candle_maya_system_prompt.txt'
);
const systemPrompt = fs.readFileSync(promptPath, 'utf8');

app.locals.systemPrompt = systemPrompt;
app.locals.webhookBase =
  (process.env.WEBHOOK_PUBLIC_BASE || `http://localhost:${PORT}`).replace(
    /\/$/,
    ''
  );
app.locals.defaultCountryCode =
  process.env.DEFAULT_COUNTRY_CODE || '+91';

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(helmet());
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf || '');
    },
  })
);

const enquiryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 3),
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.use('/enquire', enquiryLimiter, enquireRouter);
app.use('/webhook', webhookRouter);
app.use('/callflow', callflowRouter);

app.get('/admin/leads', requireAdmin, async (req, res) => {
  const leads = await getLeads();
  res.json({ ok: true, leads });
});

app.post('/admin/retry/:leadId', requireAdmin, async (req, res) => {
  const { leadId } = req.params;
  const lead = await getLeadById(leadId);
  if (!lead) {
    return res.status(404).json({ ok: false, error: 'Lead not found' });
  }

  try {
    const result = await createCallWithRetry({
      to: lead.phone,
      systemPrompt: app.locals.systemPrompt,
      context: { leadId, name: lead.name },
      webhookUrl: `${app.locals.webhookBase}/webhook`,
    });

    await updateLead(leadId, {
      status: 'call_queued',
      vapiCallId: result.callId,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true, leadId, message: 'Call retried successfully' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to retry call', error);
    await updateLead(leadId, {
      status: 'call_failed',
      errorMessage: error.message,
      updatedAt: new Date().toISOString(),
    });
    return res.status(502).json({ ok: false, error: error.message });
  }
});

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(500).json({ ok: false, error: 'ADMIN_TOKEN not set' });
  }

  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return next();
}

const ready = initDb();

if (require.main === module) {
  ready
    .then(() => {
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on port ${PORT}`);
      });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize database', error);
      process.exit(1);
    });
}

module.exports = { app, ready };


