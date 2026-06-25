'use strict';

const { stopDaemon, checkDaemon } = require('../daemon');
const { spawnDaemon } = require('../daemon');
const { readArgs } = require('../pid');
const { resolveConfig } = require('../config');

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

  // Use saved args if no CLI flags provided, otherwise use CLI flags
  let effectiveFlags = cliFlags;
  if (!cliFlags.port && !cliFlags.backend && !cliFlags.token) {
    const savedArgs = readArgs();
    if (savedArgs) {
      console.log('   Using saved configuration...');
      effectiveFlags = savedArgs;
    }
  }

  // Re-use start command
  const { startCommand } = require('./start');
  await startCommand(effectiveFlags);
}

module.exports = { restartCommand };
