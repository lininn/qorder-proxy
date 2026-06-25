'use strict';

const { loadConfigFile, saveConfigFile, getDisplayConfig, redactToken, DEFAULTS } = require('../config');

/**
 * Config management command.
 * Subcommands: list, get, set, delete, path
 */
function configCommand(subcommand, key, value, options = {}) {
  switch (subcommand) {
    case 'list':
      configList(options);
      break;
    case 'get':
      configGet(key, options);
      break;
    case 'set':
      configSet(key, value);
      break;
    case 'delete':
      configDelete(key);
      break;
    case 'path':
      configPath();
      break;
    default:
      console.log('Usage: qorder-proxy config <list|get|set|delete|path>');
      console.log('');
      console.log('  list              Show all config values');
      console.log('  get <key>         Get a specific config value');
      console.log('  set <key> <value> Set a config value');
      console.log('  delete <key>      Delete a config key');
      console.log('  path              Show config file path');
  }
}

function configList(options) {
  const config = getDisplayConfig(options.showSecrets);

  console.log('');
  console.log('  Qorder Proxy Configuration');
  console.log('  ─────────────────────────');

  for (const [key, val] of Object.entries(DEFAULTS)) {
    const displayVal = config[key] !== undefined ? config[key] : val;
    console.log(`  ${key}: ${displayVal}`);
  }

  // Show any extra keys not in defaults
  for (const [key, val] of Object.entries(config)) {
    if (!(key in DEFAULTS)) {
      console.log(`  ${key}: ${val}`);
    }
  }

  console.log('');
}

function configGet(key, options) {
  if (!key) {
    console.log('Usage: qorder-proxy config get <key>');
    process.exit(1);
  }

  const config = options.showSecrets ? loadConfigFile() : getDisplayConfig(false);
  const val = config[key];

  if (val === undefined) {
    console.log(`  Key "${key}" is not set.`);
  } else {
    console.log(`  ${key}: ${val}`);
  }
}

function configSet(key, value) {
  if (!key || value === undefined) {
    console.log('Usage: qorder-proxy config set <key> <value>');
    process.exit(1);
  }

  const config = loadConfigFile();

  // Type coercion for known keys
  if (key === 'port' || key === 'timeoutMs' || key === 'contextWindow' || key === 'maxOutputTokens') {
    value = Number(value);
    if (isNaN(value)) {
      console.log(`  ❌ "${key}" must be a number.`);
      process.exit(1);
    }
  }

  if (key === 'backend' && !['cn', 'global'].includes(value)) {
    console.log(`  ❌ "backend" must be "cn" or "global".`);
    process.exit(1);
  }

  config[key] = value;
  saveConfigFile(config);
  console.log(`  ✅ ${key} = ${key === 'token' ? redactToken(value) : value}`);
}

function configDelete(key) {
  if (!key) {
    console.log('Usage: qorder-proxy config delete <key>');
    process.exit(1);
  }

  const config = loadConfigFile();
  if (!(key in config)) {
    console.log(`  Key "${key}" is not set.`);
    return;
  }

  delete config[key];
  saveConfigFile(config);
  console.log(`  ✅ Deleted "${key}"`);
}

function configPath() {
  const { getConfigPath } = require('../config');
  console.log(`  ${getConfigPath()}`);
}

module.exports = { configCommand };
