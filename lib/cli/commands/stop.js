'use strict';

const { checkDaemon, stopDaemon } = require('../daemon');

/**
 * Stop the running daemon.
 */
async function stopCommand() {
  const { running, pid } = checkDaemon();

  if (!running) {
    console.log('ℹ️  Qorder Proxy is not running.');
    return;
  }

  console.log(`🛑 Stopping Qorder Proxy (PID: ${pid})...`);

  const stopped = await stopDaemon(pid);

  if (stopped) {
    console.log('✅ Qorder Proxy stopped.');
  } else {
    console.log('❌ Failed to stop Qorder Proxy. Try "qorder-proxy stop" again or kill the process manually.');
  }
}

module.exports = { stopCommand };
