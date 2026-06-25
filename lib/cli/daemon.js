'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDataDir, ensureDataDir } = require('./config');
const { writePid, removePid, writeArgs } = require('./pid');

/**
 * Spawn the proxy as a detached daemon process.
 * @param {object} options - { port, host, backend, token, ... }
 * @returns {number} - child PID
 */
function spawnDaemon(options) {
  const dataDir = getDataDir();
  ensureDataDir();

  const logFile = options.logFile || path.join(dataDir, 'proxy.log');

  // Build args to pass to the daemon process
  const daemonArgs = [path.resolve(__dirname, '..', '..', 'bin', 'qorder-proxy.js'), 'run'];

  if (options.port) daemonArgs.push('--port', String(options.port));
  if (options.host) daemonArgs.push('--host', options.host);
  if (options.backend) daemonArgs.push('--backend', options.backend);
  if (options.token) daemonArgs.push('--token', options.token);
  if (options.timeoutMs) daemonArgs.push('--timeout', String(options.timeoutMs));
  if (options.reasoningEffort) daemonArgs.push('--effort', options.reasoningEffort);
  if (options.contextWindow) daemonArgs.push('--context-window', String(options.contextWindow));
  if (options.maxOutputTokens) daemonArgs.push('--max-output-tokens', String(options.maxOutputTokens));

  const logFd = fs.openSync(logFile, 'a');

  const child = spawn(process.execPath, daemonArgs, {
    env: {
      ...process.env,
      NODE_QORDER_DAEMON: '1',
    },
    detached: true,
    stdio: ['ignore', logFd, logFd],
    windowsHide: true,
  });

  child.unref();

  // Close the log file descriptors in the parent
  try { fs.closeSync(logFd); } catch { /* ignore */ }

  // Write PID and args
  writePid(child.pid);
  writeArgs(options);

  return child.pid;
}

/**
 * Stop the daemon by PID.
 * @param {number} pid
 * @returns {Promise<boolean>} - true if stopped successfully
 */
function stopDaemon(pid) {
  return new Promise((resolve) => {
    if (!pid) {
      resolve(false);
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch (err) {
      if (err.code === 'ESRCH') {
        // Process already dead
        removePid();
        resolve(true);
        return;
      }
      resolve(false);
      return;
    }

    // Wait for process to exit (poll every 200ms, up to 10s)
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 200;
      try {
        process.kill(pid, 0);
        // Still alive
        if (elapsed >= 10000) {
          // Force kill
          clearInterval(interval);
          try { process.kill(pid, 'SIGKILL'); } catch { /* ignore */ }
          removePid();
          resolve(true);
        }
      } catch {
        // Process exited
        clearInterval(interval);
        removePid();
        resolve(true);
      }
    }, 200);
  });
}

/**
 * Check if the daemon is running.
 * @returns {{ running: boolean, pid: number|null }}
 */
function checkDaemon() {
  const { readPid, isProcessRunning } = require('./pid');
  const pid = readPid();
  const running = pid ? isProcessRunning(pid) : false;

  if (pid && !running) {
    // Stale PID, clean up
    removePid();
    return { running: false, pid: null };
  }

  return { running, pid };
}

module.exports = { spawnDaemon, stopDaemon, checkDaemon };
