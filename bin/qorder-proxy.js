#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// qorder-proxy — CLI entry point
// ═══════════════════════════════════════════════════════════════════════════════

const path = require('path');

// ── Daemon mode detection ─────────────────────────────────────────────────────
// When spawned as a daemon, NODE_QORDER_DAEMON=1 is set.
// In that case, skip CLI parsing and go directly to server mode.
if (process.env.NODE_QORDER_DAEMON === '1') {
  const { runCommand } = require('../lib/cli/commands/run');
  // Parse minimal args for daemon mode
  const args = parseDaemonArgs();
  runCommand(args);
  return;
}

// ── Argument parsing ──────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.length === 0) {
  showHelp();
  process.exit(0);
}

// Parse global flags and command
const parsed = parseArgs(argv);

// ── Command dispatch ──────────────────────────────────────────────────────────

dispatchCommand(parsed);

// ── Implementation ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = {
    command: null,
    subcommand: null,
    flags: {},
    positional: [],
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      const pkg = require('../package.json');
      console.log(`qorder-proxy v${pkg.version}`);
      process.exit(0);
    } else if (arg === '--web') {
      result.command = 'web';
    } else if (arg === '--port' || arg === '-p') {
      result.flags.port = Number(argv[++i]);
    } else if (arg === '--host') {
      result.flags.host = argv[++i];
    } else if (arg === '--backend' || arg === '-b') {
      result.flags.backend = argv[++i];
    } else if (arg === '--token' || arg === '-t') {
      result.flags.token = argv[++i];
    } else if (arg === '--timeout') {
      result.flags.timeoutMs = Number(argv[++i]);
    } else if (arg === '--effort') {
      result.flags.reasoningEffort = argv[++i];
    } else if (arg === '--context-window') {
      result.flags.contextWindow = Number(argv[++i]);
    } else if (arg === '--max-output-tokens') {
      result.flags.maxOutputTokens = Number(argv[++i]);
    } else if (arg === '--setup-port') {
      result.flags.setupPort = Number(argv[++i]);
    } else if (arg === '--json') {
      result.flags.json = true;
    } else if (arg === '--show-secrets') {
      result.flags.showSecrets = true;
    } else if (arg === '--lines' || arg === '-n') {
      result.flags.lines = Number(argv[++i]);
    } else if (arg === '--follow' || arg === '-f') {
      result.flags.follow = true;
    } else if (!arg.startsWith('-')) {
      if (!result.command) {
        result.command = arg;
      } else if (!result.subcommand && result.command === 'config') {
        result.subcommand = arg;
      } else {
        result.positional.push(arg);
      }
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }

    i++;
  }

  return result;
}

function parseDaemonArgs() {
  // Minimal parsing for daemon mode
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port' || argv[i] === '-p') args.port = Number(argv[++i]);
    else if (argv[i] === '--host') args.host = argv[++i];
    else if (argv[i] === '--backend' || argv[i] === '-b') args.backend = argv[++i];
    else if (argv[i] === '--token' || argv[i] === '-t') args.token = argv[++i];
    else if (argv[i] === '--timeout') args.timeoutMs = Number(argv[++i]);
    else if (argv[i] === '--effort') args.reasoningEffort = argv[++i];
    else if (argv[i] === '--context-window') args.contextWindow = Number(argv[++i]);
    else if (argv[i] === '--max-output-tokens') args.maxOutputTokens = Number(argv[++i]);
  }
  return args;
}

async function dispatchCommand(parsed) {
  const command = parsed.command;

  try {
    switch (command) {
      case 'start': {
        const { startCommand } = require('../lib/cli/commands/start');
        await startCommand(parsed.flags);
        break;
      }
      case 'stop': {
        const { stopCommand } = require('../lib/cli/commands/stop');
        await stopCommand();
        break;
      }
      case 'restart': {
        const { restartCommand } = require('../lib/cli/commands/restart');
        await restartCommand(parsed.flags);
        break;
      }
      case 'status': {
        const { statusCommand } = require('../lib/cli/commands/status');
        await statusCommand(parsed.flags);
        break;
      }
      case 'run': {
        const { runCommand } = require('../lib/cli/commands/run');
        runCommand(parsed.flags);
        break;
      }
      case 'config': {
        const { configCommand } = require('../lib/cli/commands/config');
        configCommand(parsed.subcommand, parsed.positional[0], parsed.positional[1], parsed.flags);
        break;
      }
      case 'web': {
        const { webCommand } = require('../lib/cli/commands/web');
        await webCommand(parsed.flags);
        break;
      }
      case 'logs': {
        const { logsCommand } = require('../lib/cli/commands/logs');
        logsCommand(parsed.flags);
        break;
      }
      case 'doctor': {
        const { doctorCommand } = require('../lib/cli/commands/doctor');
        doctorCommand();
        break;
      }
      default:
        console.error(`Unknown command: ${command || '(none)'}`);
        showHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

function showHelp() {
  const pkg = require('../package.json');

  console.log('');
  console.log(`  qorder-proxy v${pkg.version}`);
  console.log('  Local OpenAI / Anthropic compatible proxy for Qoder CLI');
  console.log('');
  console.log('  Usage:');
  console.log('    qorder-proxy --web              Open configuration UI');
  console.log('    qorder-proxy start               Start proxy as daemon');
  console.log('    qorder-proxy stop                Stop daemon');
  console.log('    qorder-proxy restart             Restart daemon');
  console.log('    qorder-proxy status              Show running status');
  console.log('    qorder-proxy run                 Run in foreground');
  console.log('    qorder-proxy logs [-f]           View logs');
  console.log('    qorder-proxy config <subcommand> Manage configuration');
  console.log('    qorder-proxy doctor              Run diagnostic checks');
  console.log('');
  console.log('  Options:');
  console.log('    --port, -p <port>       Proxy port (default: 3000)');
  console.log('    --host <host>           Bind host (default: 127.0.0.1)');
  console.log('    --backend, -b <cn|global>  CLI backend (default: cn)');
  console.log('    --token, -t <token>     Authentication token');
  console.log('    --setup-port <port>     Setup UI port (default: 3001)');
  console.log('    --version, -v           Show version');
  console.log('    --help, -h              Show this help');
  console.log('');
  console.log('  Config subcommands:');
  console.log('    list                    Show all config values');
  console.log('    get <key>               Get a config value');
  console.log('    set <key> <value>       Set a config value');
  console.log('    delete <key>            Delete a config key');
  console.log('    path                    Show config file path');
  console.log('');
}
