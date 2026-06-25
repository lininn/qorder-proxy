'use strict';

const { checkDaemon } = require('../daemon');
const { loadConfigFile, getDataDir } = require('../config');
const http = require('http');

/**
 * Show daemon status.
 */
async function statusCommand(options = {}) {
  const { running, pid } = checkDaemon();
  const config = loadConfigFile();
  const dataDir = getDataDir();

  if (options.json) {
    const result = {
      running,
      pid: running ? pid : null,
      port: config.port || 3000,
      host: config.host || '127.0.0.1',
      backend: config.backend || 'cn',
      dataDir,
    };

    if (running) {
      result.health = await checkHealth(config.port || 3000, config.host || '127.0.0.1');
    }

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable output
  console.log('');
  console.log('  Qorder Proxy Status');
  console.log('  ──────────────────');

  if (running) {
    console.log(`  Status:    ✅ Running`);
    console.log(`  PID:       ${pid}`);
  } else {
    console.log(`  Status:    ⛔ Not running`);
  }

  console.log(`  Port:      ${config.port || 3000}`);
  console.log(`  Host:      ${config.host || '127.0.0.1'}`);
  console.log(`  Backend:   ${config.backend || 'cn'}`);
  console.log(`  Data Dir:  ${dataDir}`);

  if (config.token) {
    const redacted = config.token.length > 8
      ? config.token.slice(0, 4) + '****' + config.token.slice(-4)
      : '****';
    console.log(`  Token:     ${redacted}`);
  } else {
    console.log(`  Token:     (not configured)`);
  }

  if (running) {
    const health = await checkHealth(config.port || 3000, config.host || '127.0.0.1');
    console.log(`  Health:    ${health ? '✅ OK' : '❌ Not responding'}`);
  }

  console.log('');
}

function checkHealth(port, host) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

module.exports = { statusCommand };
