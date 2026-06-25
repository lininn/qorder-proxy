'use strict';

const fs = require('fs');
const path = require('path');
const { getDataDir } = require('../config');
const { checkDaemon } = require('../daemon');

/**
 * Logs command: view/tail daemon log file.
 */
function logsCommand(options = {}) {
  const dataDir = getDataDir();
  const logFile = path.join(dataDir, 'proxy.log');
  const lines = options.lines || 50;
  const follow = options.follow || false;

  if (!fs.existsSync(logFile)) {
    console.log('ℹ️  No log file found. The proxy may not have been started yet.');
    return;
  }

  if (follow) {
    // Tail -f mode
    const { spawn } = require('child_process');
    const tail = spawn('tail', ['-f', '-n', String(lines), logFile], {
      stdio: 'inherit',
    });

    tail.on('error', (err) => {
      // Fallback: read and print
      console.error(`tail failed: ${err.message}`);
      printLastLines(logFile, lines);
    });

    process.on('SIGINT', () => {
      tail.kill();
      process.exit(0);
    });
  } else {
    printLastLines(logFile, lines);
  }
}

function printLastLines(logFile, lines) {
  try {
    const content = require('fs').readFileSync(logFile, 'utf-8');
    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines).filter(Boolean);

    if (lastLines.length === 0) {
      console.log('ℹ️  Log file is empty.');
      return;
    }

    for (const line of lastLines) {
      console.log(line);
    }
  } catch (err) {
    console.error(`❌ Failed to read log file: ${err.message}`);
  }
}

module.exports = { logsCommand };
