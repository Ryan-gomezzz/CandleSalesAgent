process.env.WEBHOOK_PUBLIC_BASE = 'http://localhost:3000';
process.env.CALLER_ID = '+918888888888';
process.env.ADMIN_TOKEN = 'test-token';
process.env.FRONTEND_URL = 'http://localhost:5173';

const request = require('supertest');

const mockSaveLead = jest.fn().mockResolvedValue({});
const mockUpdateLead = jest.fn().mockResolvedValue({});
const mockGetLeads = jest.fn().mockResolvedValue([]);
const mockGetLeadById = jest.fn();

jest.mock('../lib/db', () => ({
  saveLead: (...args) => mockSaveLead(...args),
  updateLead: (...args) => mockUpdateLead(...args),
  appendLeadEvent: jest.fn(),
  getLeads: (...args) => mockGetLeads(...args),
  getLeadById: (...args) => mockGetLeadById(...args),
  initDb: jest.fn().mockResolvedValue(),
}));

const mockCreateCallWithRetry = jest
  .fn()
  .mockResolvedValue({ callId: 'call-123' });

jest.mock('../lib/vapiClient', () => ({
  createCallWithRetry: (...args) => mockCreateCallWithRetry(...args),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
}));

const { app } = require('../index');

describe('POST /enquire', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without consent', async () => {
    const res = await request(app).post('/enquire').send({
      phone: '+911234567890',
      consent: false,
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(mockSaveLead).not.toHaveBeenCalled();
  });

  it('queues a call for valid requests', async () => {
    const res = await request(app).post('/enquire').send({
      name: 'Priya',
      phone: '9876543210',
      consent: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockCreateCallWithRetry).toHaveBeenCalledTimes(1);
    expect(mockUpdateLead).toHaveBeenCalled();
  });
});


