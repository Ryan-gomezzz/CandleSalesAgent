const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const {
  DynamoDBClient,
  ResourceNotFoundException,
} = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const USE_DYNAMO = process.env.USE_DYNAMODB === 'true' && !!TABLE_NAME;
const FALLBACK_PATH = path.resolve(__dirname, '../../data/leads.json');

let docClient;

async function initDb() {
  if (USE_DYNAMO) {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    });
    docClient = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    return;
  }

  await ensureFallbackFile();
}

async function ensureFallbackFile() {
  const dir = path.dirname(FALLBACK_PATH);
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
  if (!fsSync.existsSync(FALLBACK_PATH)) {
    await fs.writeFile(FALLBACK_PATH, '[]', 'utf8');
  }
}

function isDynamo() {
  return USE_DYNAMO && docClient;
}

async function saveLead(lead) {
  if (isDynamo()) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: lead,
        ConditionExpression: 'attribute_not_exists(leadId)',
      })
    );
    return lead;
  }

  const leads = await readFallback();
  leads.push(lead);
  await writeFallback(leads);
  return lead;
}

async function updateLead(leadId, updates) {
  if (isDynamo()) {
    const expression = buildUpdateExpression(updates);
    if (!expression) return null;
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { leadId },
        ...expression,
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes;
  }

  const leads = await readFallback();
  const index = leads.findIndex((lead) => lead.leadId === leadId);
  if (index === -1) return null;
  leads[index] = { ...leads[index], ...updates };
  await writeFallback(leads);
  return leads[index];
}

async function appendLeadEvent(leadId, eventPayload) {
  const receivedAt = new Date().toISOString();
  const event = { receivedAt, ...eventPayload };

  if (isDynamo()) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { leadId },
        UpdateExpression:
          'SET #events = list_append(if_not_exists(#events, :emptyList), :eventVal), #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#events': 'events',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':eventVal': [event],
          ':emptyList': [],
          ':updatedAt': receivedAt,
        },
      })
    );
    return event;
  }

  const leads = await readFallback();
  const index = leads.findIndex((lead) => lead.leadId === leadId);
  if (index === -1) {
    throw new ResourceNotFoundException({
      message: `Lead ${leadId} not found`,
    });
  }
  const existing = leads[index].events || [];
  leads[index].events = [...existing, event];
  leads[index].updatedAt = receivedAt;
  await writeFallback(leads);
  return event;
}

async function getLeads() {
  if (isDynamo()) {
    const results = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );
    return sortLeads(results.Items || []);
  }

  return sortLeads(await readFallback());
}

async function getLeadById(leadId) {
  if (isDynamo()) {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { leadId },
      })
    );
    return result.Item || null;
  }

  const leads = await readFallback();
  return leads.find((lead) => lead.leadId === leadId) || null;
}

function sortLeads(leads) {
  return [...leads].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

async function readFallback() {
  const raw = await fs.readFile(FALLBACK_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeFallback(data) {
  await fs.writeFile(FALLBACK_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function buildUpdateExpression(updates) {
  const entries = Object.entries(updates || {}).filter(
    ([, value]) => typeof value !== 'undefined'
  );
  if (!entries.length) return null;

  const expressionParts = [];
  const attributeNames = {};
  const attributeValues = {};

  entries.forEach(([key, value]) => {
    const name = `#${key}`;
    const val = `:${key}`;
    expressionParts.push(`${name} = ${val}`);
    attributeNames[name] = key;
    attributeValues[val] = value;
  });

  return {
    UpdateExpression: `SET ${expressionParts.join(', ')}`,
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
  };
}

module.exports = {
  initDb,
  saveLead,
  updateLead,
  appendLeadEvent,
  getLeads,
  getLeadById,
};


