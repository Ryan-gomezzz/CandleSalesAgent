const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH =
  process.env.LOG_FILE_PATH ||
  path.resolve(__dirname, '../../logs/calls.log');

function ensureLogDir() {
  const dir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function logCallEvent(payload) {
  try {
    ensureLogDir();
    const record = {
      timestamp: new Date().toISOString(),
      ...payload,
    };
    fs.appendFileSync(LOG_FILE_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to write call log', error);
  }
}

module.exports = { logCallEvent };


