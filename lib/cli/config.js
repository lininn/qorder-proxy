'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '~',
  '.qorder-proxy'
);

const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULTS = {
  port: 3000,
  host: '127.0.0.1',
  backend: 'cn',
  token: '',
  timeoutMs: 300000,
  reasoningEffort: '',
  contextWindow: '',
  maxOutputTokens: '',
};

function getDataDir() {
  return DATA_DIR;
}

function getConfigPath() {
  return CONFIG_FILE;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfigFile() {
  try {
    ensureDataDir();
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfigFile(data) {
  ensureDataDir();
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, CONFIG_FILE);
  // Restrict file permissions to owner only (for token security)
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // chmod may fail on some platforms, non-critical
  }
}

/**
 * Resolve final config with priority:
 *   CLI flags > env vars > config file > .env > defaults
 */
function resolveConfig(cliFlags) {
  const fileConfig = loadConfigFile();

  // Build from env vars
  const envConfig = {};
  if (process.env.PORT) envConfig.port = Number(process.env.PORT);
  if (process.env.CLI_BACKEND) envConfig.backend = process.env.CLI_BACKEND;
  if (process.env.QODERCN_PERSONAL_ACCESS_TOKEN) envConfig.token = process.env.QODERCN_PERSONAL_ACCESS_TOKEN;
  if (process.env.QODER_PAT) envConfig.token = process.env.QODER_PAT;
  if (process.env.CLI_COMMAND) envConfig.cliCommand = process.env.CLI_COMMAND;
  if (process.env.QODERCN_TIMEOUT_MS) envConfig.timeoutMs = Number(process.env.QODERCN_TIMEOUT_MS);
  if (process.env.QODERCN_REASONING_EFFORT) envConfig.reasoningEffort = process.env.QODERCN_REASONING_EFFORT;
  if (process.env.QODERCN_CONTEXT_WINDOW) envConfig.contextWindow = process.env.QODERCN_CONTEXT_WINDOW;
  if (process.env.QODERCN_MAX_OUTPUT_TOKENS) envConfig.maxOutputTokens = process.env.QODERCN_MAX_OUTPUT_TOKENS;

  return {
    ...DEFAULTS,
    ...fileConfig,
    ...envConfig,
    ...Object.fromEntries(Object.entries(cliFlags).filter(([, v]) => v !== undefined && v !== null)),
  };
}

/**
 * Apply resolved config to process.env so clean/ modules pick it up.
 */
function applyConfigToEnv(config) {
  if (config.port) process.env.PORT = String(config.port);
  if (config.host) process.env.QORDER_HOST = config.host;
  if (config.backend) process.env.CLI_BACKEND = config.backend;
  if (config.token) {
    const backend = (config.backend || 'cn').toLowerCase();
    if (backend === 'global') {
      process.env.QODER_PAT = config.token;
    } else {
      process.env.QODERCN_PERSONAL_ACCESS_TOKEN = config.token;
    }
  }
  if (config.cliCommand) process.env.CLI_COMMAND = config.cliCommand;
  if (config.timeoutMs) process.env.QODERCN_TIMEOUT_MS = String(config.timeoutMs);
  if (config.reasoningEffort) process.env.QODERCN_REASONING_EFFORT = config.reasoningEffort;
  if (config.contextWindow) process.env.QODERCN_CONTEXT_WINDOW = String(config.contextWindow);
  if (config.maxOutputTokens) process.env.QODERCN_MAX_OUTPUT_TOKENS = String(config.maxOutputTokens);
}

/**
 * Redact token for display
 */
function redactToken(token) {
  if (!token) return '';
  if (token.length <= 8) return '****';
  return token.slice(0, 4) + '****' + token.slice(-4);
}

/**
 * Get config for display (token redacted by default)
 */
function getDisplayConfig(showSecrets) {
  const config = loadConfigFile();
  if (!showSecrets && config.token) {
    config.token = redactToken(config.token);
  }
  return config;
}

module.exports = {
  getDataDir,
  getConfigPath,
  ensureDataDir,
  loadConfigFile,
  saveConfigFile,
  resolveConfig,
  applyConfigToEnv,
  redactToken,
  getDisplayConfig,
  DEFAULTS,
};
