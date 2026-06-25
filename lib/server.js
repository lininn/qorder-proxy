'use strict';

const path = require('path');
const fs = require('fs');
const { applyConfigToEnv, getDataDir, ensureDataDir } = require('./cli/config');

function startServer(config) {
  // Set env vars from config so clean/ modules pick them up
  applyConfigToEnv(config);

  // Redirect usage data to data directory
  const dataDir = getDataDir();
  ensureDataDir();
  process.env.QORDER_USAGE_DIR = dataDir;

  // Load dotenv if present (for any env vars not already set)
  try {
    require('dotenv').config();
  } catch {
    // dotenv not available, skip
  }

  const { createApp } = require('../clean/app');
  const { log } = require('../clean/logger');
  const { getCliBackend } = require('../clean/qodercn-cli');

  const host = config.host || '127.0.0.1';
  const port = Number(config.port || process.env.PORT || 3000);

  const app = createApp();

  const server = app.listen(port, host, () => {
    const backend = getCliBackend();
    log(`Qorder Proxy listening on http://${host}:${port}`);
    log('CLI backend', {
      name: backend.name,
      command: backend.command,
      home: backend.homeDir,
      token_configured: Boolean(process.env[backend.tokenEnvVar]),
    });
  });

  return server;
}

module.exports = { startServer, getDataDir };
