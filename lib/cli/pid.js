'use strict';

const fs = require('fs');
const path = require('path');
const { getDataDir, ensureDataDir } = require('./config');

const PID_FILE = () => path.join(getDataDir(), 'proxy.pid');
const ARGS_FILE = () => path.join(getDataDir(), 'proxy.args.json');

function readPid() {
  try {
    const pidPath = PID_FILE();
    if (!fs.existsSync(pidPath)) return null;
    const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);
    if (isNaN(pid)) return null;
    return pid;
  } catch {
    return null;
  }
}

function writePid(pid) {
  ensureDataDir();
  fs.writeFileSync(PID_FILE(), String(pid), 'utf-8');
}

function removePid() {
  try {
    const pidPath = PID_FILE();
    if (fs.existsSync(pidPath)) fs.unlinkSync(pidPath);
  } catch {
    // ignore
  }
}

function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err.code === 'ESRCH') return false; // process does not exist
    if (err.code === 'EPERM') return true;  // process exists but no permission
    return false;
  }
}

function readArgs() {
  try {
    const argsPath = ARGS_FILE();
    if (!fs.existsSync(argsPath)) return null;
    return JSON.parse(fs.readFileSync(argsPath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeArgs(args) {
  ensureDataDir();
  fs.writeFileSync(ARGS_FILE(), JSON.stringify(args, null, 2), 'utf-8');
}

function removeArgs() {
  try {
    const argsPath = ARGS_FILE();
    if (fs.existsSync(argsPath)) fs.unlinkSync(argsPath);
  } catch {
    // ignore
  }
}

module.exports = {
  readPid,
  writePid,
  removePid,
  isProcessRunning,
  readArgs,
  writeArgs,
  removeArgs,
};
