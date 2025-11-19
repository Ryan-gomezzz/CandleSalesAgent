#!/usr/bin/env node
const path = require('path');
const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
if (!module.paths.includes(serverNodeModules)) {
  module.paths.push(serverNodeModules);
}

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} = require('@aws-sdk/client-dynamodb');

async function run() {
  const tableName = process.env.DYNAMODB_TABLE;
  if (!tableName) {
    throw new Error('DYNAMODB_TABLE is not set');
  }

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  });

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`Table ${tableName} already exists. Nothing to do.`);
    return;
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
  }

  const command = new CreateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [{ AttributeName: 'leadId', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'leadId', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  });

  await client.send(command);
  console.log(`Requested creation of ${tableName}. It can take a few minutes to become ACTIVE.`);
}

run().catch((error) => {
  console.error('Failed to ensure DynamoDB table', error);
  process.exitCode = 1;
});


