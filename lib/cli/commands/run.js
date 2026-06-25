'use strict';

const { startServer } = require('../../server');
const { resolveConfig } = require('../config');

/**
 * Run the proxy in foreground mode (for development/debug).
 */
function runCommand(cliFlags) {
  const config = resolveConfig(cliFlags);

  console.log('🚀 Starting Qorder Proxy in foreground mode...');
  console.log(`   Port: ${config.port}`);
  console.log(`   Host: ${config.host || '127.0.0.1'}`);
  console.log(`   Backend: ${config.backend || 'cn'}`);

  const server = startServer(config);

  // Handle graceful shutdown
  function shutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down...`);
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      console.log('⚠️  Force exiting after timeout.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // If running as daemon, also handle SIGHUP
  if (process.env.NODE_QORDER_DAEMON === '1') {
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Write PID file for daemon mode
    const { writePid } = require('../pid');
    writePid(process.pid);
  }
}

module.exports = { runCommand };
