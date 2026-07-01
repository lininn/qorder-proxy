'use strict';

const { stopDaemon, checkDaemon } = require('../daemon');
const { spawnDaemon } = require('../daemon');
const { readArgs } = require('../pid');
const { loadConfigFile } = require('../config');

/**
 * Restart the daemon (stop + start with saved args).
 */
async function restartCommand(cliFlags) {
  const { running, pid } = checkDaemon();

  // Stop if running
  if (running) {
    console.log(`🛑 Stopping Qorder Proxy (PID: ${pid})...`);
    await stopDaemon(pid);
    console.log('✅ Stopped.');
  }

  // config.json is the source of truth (edited via --web or `config set`).
  // Only fall back to the last start's saved args when no config file exists
  // (ad-hoc `start --flags` without saving). Replaying saved args
  // unconditionally went stale and overrode newer config — e.g. switching
  // backend to global in the Web UI then restarting still resurrected cn.
  let effectiveFlags = cliFlags;
  if (!cliFlags.port && !cliFlags.backend && !cliFlags.token) {
    if (Object.keys(loadConfigFile()).length === 0) {
      const savedArgs = readArgs();
      if (savedArgs) {
        console.log('   Using saved configuration...');
        effectiveFlags = savedArgs;
      }
    }
  }

  // Re-use start command
  const { startCommand } = require('./start');
  await startCommand(effectiveFlags);
}

module.exports = { restartCommand };
