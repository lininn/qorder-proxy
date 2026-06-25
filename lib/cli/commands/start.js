'use strict';

const { checkDaemon, spawnDaemon } = require('../daemon');
const { resolveConfig } = require('../config');
const http = require('http');

/**
 * Start the proxy as a background daemon.
 */
async function startCommand(cliFlags) {
  const { running, pid } = checkDaemon();

  if (running) {
    console.log(`⚠️  Qorder Proxy is already running (PID: ${pid})`);
    console.log('   Use "qorder-proxy restart" to restart, or "qorder-proxy stop" to stop.');
    process.exit(1);
  }

  const config = resolveConfig(cliFlags);

  if (!config.token) {
    console.log('⚠️  未配置认证 Token！');
    console.log('   请先运行 "qorder-proxy --web" 配置 Token，或使用 --token 参数。');
    console.log('   示例: qorder-proxy start --token YOUR_TOKEN');
    process.exit(1);
  }

  console.log('🚀 Starting Qorder Proxy daemon...');
  console.log(`   Port: ${config.port}`);
  console.log(`   Host: ${config.host || '127.0.0.1'}`);
  console.log(`   Backend: ${config.backend || 'cn'}`);

  const childPid = spawnDaemon(config);
  console.log(`   PID: ${childPid}`);

  // Wait for health check (up to 5 seconds)
  console.log('   Waiting for server to be ready...');
  const ready = await waitForHealth(config.port, config.host || '127.0.0.1', 5000);

  if (ready) {
    console.log(`✅ Qorder Proxy is running at http://${config.host || '127.0.0.1'}:${config.port}`);
    console.log(`   Web Console: http://${config.host || '127.0.0.1'}:${config.port}/ui`);
    console.log(`   Logs: qorder-proxy logs`);
  } else {
    console.log('⚠️  Server started but health check failed. Check logs with "qorder-proxy logs".');
  }
}

function waitForHealth(port, host, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();

    function check() {
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }

      const req = http.get(`http://${host}:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          setTimeout(check, 300);
        }
      });

      req.on('error', () => {
        setTimeout(check, 300);
      });

      req.setTimeout(1000, () => {
        req.destroy();
        setTimeout(check, 300);
      });
    }

    // Give the server a moment to start
    setTimeout(check, 500);
  });
}

module.exports = { startCommand };
