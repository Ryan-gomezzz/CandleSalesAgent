#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
if (!module.paths.includes(serverNodeModules)) {
  module.paths.push(serverNodeModules);
}
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const promptPath = path.resolve(
    __dirname,
    '../server/prompts/candle_maya_system_prompt.txt'
  );
  const prompt = fs.readFileSync(promptPath, 'utf8');

  if (!process.env.VAPI_PROMPT_UPLOAD_URL) {
    console.log('Set VAPI_PROMPT_UPLOAD_URL to your provider endpoint and rerun this script.');
    return;
  }
  if (!process.env.VAPI_API_KEY) {
    console.log('Set VAPI_API_KEY before running this script.');
    return;
  }

  try {
    const response = await axios.post(
      process.env.VAPI_PROMPT_UPLOAD_URL,
      {
        name: 'Candle & Co – Maya',
        description: 'Primary outbound voice agent prompt for Candle Sales Agent',
        prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Prompt uploaded successfully:', response.data);
    console.log('Store the returned flow/template ID in PROMPT_FLOW_ID if your provider uses references.');
  } catch (error) {
    console.error('Prompt upload failed:', error.response?.data || error.message);
    console.log('Check your provider docs for the correct payload shape and adjust this script accordingly.');
  }
}

run();


