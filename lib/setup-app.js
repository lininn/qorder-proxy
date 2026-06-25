'use strict';

const express = require('express');
const path = require('path');
const { loadConfigFile, saveConfigFile, redactToken, ensureDataDir, getDataDir } = require('./cli/config');

function createSetupApp(closeCallback) {
  const app = express();
  app.use(express.json());

  // Serve setup static files
  const setupDir = path.join(__dirname, '..', 'public-setup');
  app.use(express.static(setupDir));

  // API: Get current config (token redacted)
  app.get('/api/setup/config', (_req, res) => {
    const config = loadConfigFile();
    if (config.token) {
      config.token = redactToken(config.token);
    }
    res.json({ ok: true, config });
  });

  // API: Save config
  app.post('/api/setup/save', (req, res) => {
    try {
      const incoming = req.body;
      const existing = loadConfigFile();

      // Merge: if token looks redacted (contains ****), keep existing
      const merged = { ...existing };
      for (const [key, value] of Object.entries(incoming)) {
        if (key === 'token' && value && value.includes('****')) {
          // Keep existing token, user didn't change it
          continue;
        }
        merged[key] = value;
      }

      saveConfigFile(merged);
      res.json({ ok: true, config: { ...merged, token: redactToken(merged.token) } });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // API: Close setup server
  app.post('/api/setup/close', (_req, res) => {
    res.json({ ok: true });
    // Delay close so response can be sent
    setTimeout(() => {
      if (closeCallback) closeCallback();
    }, 300);
  });

  return app;
}

/**
 * Start the setup web server and open browser.
 * @param {object} options - { port, host }
 * @returns {Promise<object>} - { url, close }
 */
function startSetupServer(options = {}) {
  return new Promise((resolve, reject) => {
    const port = options.port || 3001;
    const host = options.host || '127.0.0.1';
    let server = null;

    const app = createSetupApp(() => {
      if (server) {
        server.close();
        console.log('\n✅ 配置界面已关闭。使用 qorder-proxy start 启动代理服务。');
        process.exit(0);
      }
    });

    server = app.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      console.log(`⚙️  配置界面已启动: ${url}`);
      console.log('   保存配置后将自动关闭此服务器\n');

      // Try to open browser
      try {
        const opener =
          process.platform === 'darwin' ? 'open' :
          process.platform === 'win32' ? 'start' : 'xdg-open';
        const { execSync } = require('child_process');
        execSync(`${opener} ${url}`, { stdio: 'ignore' });
        console.log(`🌐 浏览器已打开`);
      } catch {
        console.log(`⚠️  无法自动打开浏览器，请手动访问: ${url}`);
      }

      resolve({ url, server });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${port} 已被占用，请使用 --setup-port 指定其他端口`));
      } else {
        reject(err);
      }
    });

    // Handle Ctrl+C in setup mode
    process.on('SIGINT', () => {
      console.log('\n👋 配置界面已关闭');
      server.close();
      process.exit(0);
    });
  });
}

module.exports = { createSetupApp, startSetupServer };
