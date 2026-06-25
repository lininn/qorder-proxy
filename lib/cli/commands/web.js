'use strict';

const { startSetupServer } = require('../../setup-app');

/**
 * --web command: open the setup configuration web UI.
 */
async function webCommand(options = {}) {
  try {
    await startSetupServer({
      port: options.setupPort || 3001,
      host: '127.0.0.1',
    });
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

module.exports = { webCommand };
