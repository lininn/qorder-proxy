'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const { loadConfigFile, getDataDir, ensureDataDir } = require('../config');
const { getCliBackend, hasStoredCredentials } = require('../../../clean/qodercn-cli');

/**
 * Doctor command: run diagnostic checks.
 */
function doctorCommand() {
  console.log('');
  console.log('  Qorder Proxy Doctor');
  console.log('  ───────────────────');
  console.log('');

  let issues = 0;

  // 1. Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 18) {
    console.log(`  ✅ Node.js: ${nodeVersion} (>= 18)`);
  } else {
    console.log(`  ❌ Node.js: ${nodeVersion} (requires >= 18)`);
    issues++;
  }

  // 2. CLI backend check
  const config = loadConfigFile();
  const backend = config.backend || 'cn';
  const cliCommand = backend === 'global' ? 'qodercli' : 'qoderclicn';

  try {
    const which = execSync(`which ${cliCommand} 2>/dev/null || where ${cliCommand} 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();
    console.log(`  ✅ CLI backend: ${cliCommand} (${which})`);
  } catch {
    console.log(`  ⚠️  CLI backend: ${cliCommand} not found on PATH`);
    console.log(`     Install it first, or use a different backend with "qorder-proxy config set backend global"`);
    issues++;
  }

  // 3. Config file
  const dataDir = getDataDir();
  const configPath = `${dataDir}/config.json`;

  if (fs.existsSync(configPath)) {
    try {
      JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log(`  ✅ Config file: ${configPath}`);
    } catch {
      console.log(`  ❌ Config file: ${configPath} (invalid JSON)`);
      issues++;
    }
  } else {
    console.log(`  ⚠️  Config file: not found (run "qorder-proxy --web" to configure)`);
    issues++;
  }

  // 4. Token check
  process.env.CLI_BACKEND = backend;
  const cliBackend = getCliBackend();
  const hasOAuthLogin = hasStoredCredentials(cliBackend);
  if (config.token) {
    console.log(`  ✅ Token: configured`);
  } else if (hasOAuthLogin) {
    console.log(`  ✅ Auth: browser login (${cliBackend.command} login)`);
  } else {
    console.log(`  ⚠️  Token: not configured (run "qorder-proxy --web", "qorder-proxy config set token YOUR_TOKEN", or "${cliBackend.command} login")`);
    issues++;
  }

  // 5. Port availability
  const port = config.port || 3000;
  try {
    const net = require('net');
    const server = net.createServer();
    server.listen(port, '127.0.0.1');
    server.close();
    console.log(`  ✅ Port ${port}: available`);
  } catch {
    console.log(`  ⚠️  Port ${port}: already in use`);
    issues++;
  }

  // 6. Data directory
  try {
    ensureDataDir();
    // Test write
    const testFile = `${dataDir}/.doctor-test`;
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`  ✅ Data directory: ${dataDir} (writable)`);
  } catch {
    console.log(`  ❌ Data directory: ${dataDir} (not writable)`);
    issues++;
  }

  console.log('');
  if (issues === 0) {
    console.log('  🎉 All checks passed! You can start the proxy with "qorder-proxy start".');
  } else {
    console.log(`  ⚠️  Found ${issues} issue(s). Fix them before starting the proxy.`);
  }
  console.log('');
}

module.exports = { doctorCommand };
