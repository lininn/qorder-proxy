# Qorder Proxy

## Disclaimer

**This project is for personal-account local compatibility experiments and protocol adaptation research only. It is not intended for any commercial or production use.**

Users must hold their own lawful Qoder account and Personal Access Token.
This project does not provide, share, resell, rent, or transfer any Qoder account, Token, or quota.
Do not deploy this project as a public service, community endpoint, commercial API, relay service, or multi-user shared service.
Do not use this project to bypass Qoder's official billing, risk controls, rate limits, regional restrictions, or usage restrictions.
Please comply with Qoder's official terms of service. If official rules do not allow your use case, stop using this project immediately.
This project is not affiliated with Qoder.

**If this project infringes upon the legitimate rights and interests of Qoder or any related parties, the author will delete this project and all related code immediately upon notice.**

### Abuse Policy

- No public deployment
- No multi-user sharing
- No API resale
- No bypassing official billing, risk controls, rate limits, regional restrictions, or usage restrictions
- No collecting, storing, or forwarding other people's Tokens
- No providing, sharing, renting, reselling, or transferring accounts, Tokens, or quota

[中文说明](README.md)

## Project Scope

This project adapts the Qoder CLI (`qoderclicn` or `qodercli`) into a local-only OpenAI / Anthropic-compatible HTTP interface for studying protocol differences across local clients, message formats, streaming responses, and tool call schemas.

Two backends are supported:

- **CN backend**: `qoderclicn`, connecting to qoder.com.cn
- **Global backend**: `qodercli`, connecting to qoder.com

It is not an official API, does not imply official authorization, and does not provide account, Token, or quota services. All model calls depend on the user's own Qoder authentication.

## Quick Start

Requires Node.js 18+ and Qoder CLI.

### 1. Install Qoder CLI

**CN backend** (required):

```bash
npm install -g @qodercn-ai/qoderclicn
qoderclicn --version
```

**Global backend** (optional):

```bash
npm install -g @qoder-ai/qodercli
qodercli --version
qodercli login   # must log in once
```

### 2. Install qorder-proxy

**Clone from GitHub and link locally (recommended)**:

```bash
git clone https://github.com/lininn/qorder-proxy.git
cd qorder-proxy/qoder-proxy
npm install
npm link
```

`npm link` registers the `qorder-proxy` command globally, so you can use it from any directory.

Verify installation:

```bash
qorder-proxy --version
# qorder-proxy v2.0.0
```

### 3. Configure

**Web setup UI (recommended)**:

```bash
qorder-proxy --web
```

The browser opens automatically. Fill in:

- **Port**: proxy listen port (default 3000)
- **Backend**: Qoder CN or Qoder Global
- **Auth Token**: your Personal Access Token

After saving, the setup UI closes automatically.

**CLI config (alternative)**:

```bash
qorder-proxy config set token YOUR_TOKEN
qorder-proxy config set backend cn
qorder-proxy config set port 3000
```

CN PAT page: https://qoder.com.cn/account/integrations

Store it securely. Do not share your Token with anyone.

### 4. Start

```bash
qorder-proxy start
```

Output:

```text
🚀 Starting Qorder Proxy daemon...
   Port: 3000
   Host: 127.0.0.1
   Backend: cn
   PID: 12345
   Waiting for server to be ready...
✅ Qorder Proxy is running at http://127.0.0.1:3000
   Web Console: http://127.0.0.1:3000/ui
   Logs: qorder-proxy logs
```

### 5. Verify

```bash
curl http://127.0.0.1:3000/health
# {"ok":true}

curl http://127.0.0.1:3000/v1/models
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `qorder-proxy --web` | Open setup Web UI to configure Token/backend/port |
| `qorder-proxy start` | Start proxy as background daemon |
| `qorder-proxy stop` | Stop background daemon |
| `qorder-proxy restart` | Restart (preserves config) |
| `qorder-proxy status` | Show running status, PID, port, Health |
| `qorder-proxy run` | Run in foreground (dev/debug, Ctrl+C to exit) |
| `qorder-proxy logs [-f]` | View logs (`-f` to follow) |
| `qorder-proxy config list` | Show all config values |
| `qorder-proxy config set <key> <value>` | Set a config value |
| `qorder-proxy config get <key>` | Get a config value |
| `qorder-proxy config delete <key>` | Delete a config key |
| `qorder-proxy config path` | Show config file path |
| `qorder-proxy doctor` | Diagnostic checks (Node version, CLI, Token, port) |

### Common Examples

```bash
# Start
qorder-proxy start

# Check status
qorder-proxy status

# View logs
qorder-proxy logs
qorder-proxy logs -f          # follow

# Start with options
qorder-proxy start --port 3000 --backend cn --token YOUR_TOKEN

# Foreground debug mode
qorder-proxy run

# Change config and restart
qorder-proxy config set backend global
qorder-proxy restart

# Diagnostics
qorder-proxy doctor

# Stop
qorder-proxy stop
```

## Configuration

Config is stored in `~/.qorder-proxy/config.json`. Priority: CLI flags > env vars > config.json > .env > defaults.

| Key | Description | Default |
|-----|-------------|---------|
| `port` | Proxy port | 3000 |
| `host` | Bind address | 127.0.0.1 |
| `backend` | CLI backend (cn/global) | cn |
| `token` | Auth Token | (empty) |
| `timeoutMs` | Timeout (ms) | 300000 |
| `reasoningEffort` | Reasoning effort | (default) |
| `contextWindow` | Context window | (default) |
| `maxOutputTokens` | Max output tokens | (default) |

Show config file path:

```bash
qorder-proxy config path
# ~/.qorder-proxy/config.json
```

## Supported Models

`qoder-cn`, `auto`, `qwen3.7-max`, `glm-5.1`, `glm-5.2`, `kimi-k2.6`, `qwen3.6-plus`, `qwen3.6-flash`, `deepseek-v4-pro`, `deepseek-v4-flash`

Qwen3.7-Max reasoning effort aliases: `qwen3.7-max-effort-low`, `qwen3.7-max-effort-medium`, `qwen3.7-max-effort-high`, `qwen3.7-max-effort-max`

## Dual Backend Switching

```bash
qorder-proxy config set backend cn       # Qoder CN (qoderclicn)
qorder-proxy config set backend global   # Qoder Global (qodercli)
qorder-proxy restart
```

| Setting | CN Backend | Global Backend |
|---------|------------|---------------|
| CLI command | `qoderclicn` | `qodercli` |
| Auth method | Personal Access Token | `qodercli login` (OAuth) |
| Auth directory | `~/.qoderworkcn` | `~/.qoder` |
| Environment variable | `QODERCN_PERSONAL_ACCESS_TOKEN` | Not required (auto-auth after login) |

Restart the proxy after switching backends.

## Local Client Adaptation

### OpenAI-Compatible Interface

- Base URL: `http://127.0.0.1:3000/v1`
- API Key: use a local placeholder value, for example `not-used`
- Model: select from `/v1/models` or enter a model ID manually

Do not enter your Qoder Token into the client. Keep the Token only in `~/.qorder-proxy/config.json`.

### Anthropic-Compatible Interface

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3000"
export ANTHROPIC_AUTH_TOKEN="not-used"
```

Do not append `/v1` to `ANTHROPIC_BASE_URL`; clients usually add API paths automatically.

### OpenCode Example

The repository includes `opencode.json` for local compatibility verification:

```bash
opencode run --model qoder-cn-local/qwen3.7-max --variant high "reply OK"
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/models` | Model list |
| POST | `/v1/chat/completions` | OpenAI-compatible chat with tools |
| POST | `/v1/messages` | Anthropic-compatible chat with tool_use |
| POST | `/v1/messages/count_tokens` | Token estimation |

## Reasoning Options

Set global defaults via config or environment variables:

```bash
qorder-proxy config set reasoningEffort high
qorder-proxy config set contextWindow 200000
qorder-proxy config set maxOutputTokens 4096
```

Or specify per request via `reasoning_effort`, `context_window`, and `max_tokens`.

## Streaming

When a client requests `stream: true` without tools, this project uses the CLI's `--output-format stream-json` for incremental streaming and forwards text as local SSE events.

When a request includes tool parameters, streaming is downgraded to a non-streaming response because tool-call parsing requires complete JSON output.

## Current Limitations

- Tool calls are implemented through prompt format instructions and text parsing, not native model capability
- Tool-call responses are always non-streaming complete JSON responses
- Each request spawns a new CLI subprocess
- If the model emits invalid JSON or refuses the tool format, the response falls back to plain text

## Security Boundaries

- Default host is `127.0.0.1`
- Not intended or supported for public services, shared services, or commercial APIs
- Logs redact tokens, cookies, Authorization headers, and other sensitive data
- Config file permissions set to 0600 (owner read/write only)

### Authentication

| Backend | Auth Method | Environment Variable |
|---------|------------|--------------------|
| CN (`qoderclicn`) | Personal Access Token | `QODERCN_PERSONAL_ACCESS_TOKEN` |
| Global (`qodercli`) | OAuth login (`qodercli login`) | Not required |

## Safety Recommendations

- Use only on your own machine
- Bind only to `127.0.0.1`
- Do not bind to `0.0.0.0` and do not expose the service to the public internet
- Do not send your Token to anyone
- Do not commit `.env` to Git
- If you suspect a Token leak, revoke the PAT immediately from the official Qoder account page and create a new one

## Web Console

After starting the proxy, visit:

```text
http://127.0.0.1:3000/ui
```

| Tab | Description |
|-----|-------------|
| Dashboard | Show /health status, Base URL, model count |
| Models | List models from /v1/models |
| Chat Test | Simple non-streaming test via /v1/chat/completions |
| Config | Generate OpenAI / Anthropic / OpenCode config examples |
| Usage / Credits | Local usage statistics |

### Usage Statistics Note

- Usage page shows **local estimated data**, not official Qoder billing or quota
- Token counts are character-based estimates, marked as `estimated`
- UI does not read, save, or display Qoder PAT

### Usage API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/usage/local` | Return local usage statistics |
| POST | `/usage/reset-local` | Reset local usage statistics |

## Testing

```bash
npm test
```

## License

MIT. See [LICENSE](LICENSE).
