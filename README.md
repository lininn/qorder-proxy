# Qorder Proxy

## 免责声明

**本项目仅用于个人账号的本地兼容性实验与协议适配研究，不用于任何商业或生产用途。**

使用者必须自行持有合法的 Qoder 账号和 Personal Access Token。
本项目不提供、共享、转售、出租任何 Qoder 账号、Token 或额度。
不得将本项目部署为公网服务、公益站、商业 API、中转站或多人共享服务。
不得用于规避 Qoder 官方的计费、风控、速率限制、地域限制或使用限制。
请遵守 Qoder 官方服务条款；如官方不允许，请立即停止使用。
本项目与 Qoder 官方无关。

**如果本项目存在任何侵犯 Qoder 或相关方合法权益的情形，作者将在收到通知后立即删除本项目及所有相关代码。**

### 禁止用途 / Abuse Policy

- 禁止公网部署
- 禁止多人共享
- 禁止转售 API
- 禁止绕过官方计费、风控、速率、地域或使用限制
- 禁止收集、保存或转发他人的 Token
- 禁止提供、共享、出租、转售任何账号、Token 或额度

[English](README.en.md)

## 项目定位

本项目把 Qoder CLI（`qoderclicn` 或 `qodercli`）适配为仅供本机访问的 OpenAI / Anthropic 兼容 HTTP 接口，用于研究不同客户端协议、消息格式、流式响应和工具调用格式之间的差异。

支持两个后端：

- **CN 后端**：`qoderclicn`，对接 qoder.com.cn
- **Global 后端**：`qodercli`，对接 qoder.com

它不是官方 API，不代表 Qoder 官方授权，也不提供任何账号、Token 或额度服务。所有请求都依赖使用者自行配置的个人 Qoder 认证。

## 快速开始

需要 Node.js 18+ 和 Qoder CLI。

### 1. 安装 Qoder CLI

**CN 后端**（必须）：

```bash
npm install -g @qodercn-ai/qoderclicn
qoderclicn --version
```

**Global 后端**（可选）：

```bash
npm install -g @qoder-ai/qodercli
qodercli --version
qodercli login   # 必须登录一次
```

### 2. 安装 qorder-proxy

**从 GitHub 下载并本地链接（推荐）**：

```bash
git clone https://github.com/lininn/qorder-proxy.git
cd qorder-proxy/qoder-proxy
npm install
npm link
```

`npm link` 会将 `qorder-proxy` 命令注册到全局，之后在任何目录都可以直接使用。

验证安装：

```bash
qorder-proxy --version
# qorder-proxy v2.0.0
```

### 3. 配置

**Web 配置界面（推荐）**：

```bash
qorder-proxy --web
```

浏览器自动打开配置页面，填写：

- **端口**：代理监听端口（默认 3000）
- **后端**：Qoder CN 或 Qoder Global
- **认证 Token**：你的 Personal Access Token

保存后配置界面自动关闭。

**CLI 配置（备选）**：

```bash
qorder-proxy config set token YOUR_TOKEN
qorder-proxy config set backend cn
qorder-proxy config set port 3000
```

CN 版 PAT 创建入口：https://qoder.com.cn/account/integrations

创建后请妥善保存。不要把 Token 填入第三方客户端或分享给他人。

### 4. 启动

```bash
qorder-proxy start
```

输出：

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

### 5. 验证

```bash
curl http://127.0.0.1:3000/health
# {"ok":true}

curl http://127.0.0.1:3000/v1/models
```

## CLI 命令全览

| 命令 | 说明 |
|------|------|
| `qorder-proxy --web` | 打开配置 Web 界面，填写 Token/后端/端口 |
| `qorder-proxy start` | 后台启动代理服务（daemon 模式） |
| `qorder-proxy stop` | 停止后台代理服务 |
| `qorder-proxy restart` | 重启（保留原配置） |
| `qorder-proxy status` | 查看运行状态、PID、端口、Health |
| `qorder-proxy run` | 前台运行（开发调试，Ctrl+C 退出） |
| `qorder-proxy logs [-f]` | 查看日志（`-f` 实时跟踪） |
| `qorder-proxy config list` | 查看所有配置 |
| `qorder-proxy config set <key> <value>` | 设置配置值 |
| `qorder-proxy config get <key>` | 查看单个配置 |
| `qorder-proxy config delete <key>` | 删除配置项 |
| `qorder-proxy config path` | 查看配置文件路径 |
| `qorder-proxy doctor` | 诊断检查（Node 版本、CLI、Token、端口） |

### 常用命令示例

```bash
# 启动
qorder-proxy start

# 查看状态
qorder-proxy status

# 查看日志
qorder-proxy logs
qorder-proxy logs -f          # 实时跟踪

# 带参数启动
qorder-proxy start --port 3000 --backend cn --token YOUR_TOKEN

# 前台调试模式
qorder-proxy run

# 修改配置后重启
qorder-proxy config set backend global
qorder-proxy restart

# 诊断
qorder-proxy doctor

# 停止
qorder-proxy stop
```

## 配置说明

配置存储在 `~/.qorder-proxy/config.json`，优先级为：CLI 参数 > 环境变量 > config.json > .env > 默认值。

| 配置键 | 说明 | 默认值 |
|--------|------|--------|
| `port` | 代理端口 | 3000 |
| `host` | 绑定地址 | 127.0.0.1 |
| `backend` | CLI 后端 (cn/global) | cn |
| `token` | 认证 Token | (空) |
| `timeoutMs` | 超时时间 (ms) | 300000 |
| `reasoningEffort` | 推理强度 | (默认) |
| `contextWindow` | 上下文窗口 | (默认) |
| `maxOutputTokens` | 最大输出 tokens | (默认) |

查看配置文件路径：

```bash
qorder-proxy config path
# ~/.qorder-proxy/config.json
```

## 支持的模型

`qoder-cn`、`auto`、`qwen3.7-max`、`glm-5.1`、`glm-5.2`、`kimi-k2.6`、`qwen3.6-plus`、`qwen3.6-flash`、`deepseek-v4-pro`、`deepseek-v4-flash`

Qwen3.7-Max 推理强度别名：`qwen3.7-max-effort-low`、`qwen3.7-max-effort-medium`、`qwen3.7-max-effort-high`、`qwen3.7-max-effort-max`

## 双后端切换

```bash
qorder-proxy config set backend cn       # Qoder CN (qoderclicn)
qorder-proxy config set backend global   # Qoder Global (qodercli)
qorder-proxy restart
```

| 配置项 | CN 后端 | Global 后端 |
|---------|--------|----------|
| CLI 命令 | `qoderclicn` | `qodercli` |
| 认证方式 | Personal Access Token | `qodercli login`（OAuth） |
| 认证目录 | `~/.qoderworkcn` | `~/.qoder` |
| 环境变量 | `QODERCN_PERSONAL_ACCESS_TOKEN` | 不需要（登录后自动认证） |

切换后端后需重启代理服务生效。

## 本地客户端适配

### OpenAI 兼容接口

- Base URL：`http://127.0.0.1:3000/v1`
- API Key：填写本地占位值即可，例如 `not-used`
- Model：从 `/v1/models` 返回列表选择，或手动输入模型 ID

注意：不要将 Qoder Token 填入客户端。Token 只应保存在 `~/.qorder-proxy/config.json` 中。

### Anthropic 兼容接口

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3000"
export ANTHROPIC_AUTH_TOKEN="not-used"
```

`ANTHROPIC_BASE_URL` 不要追加 `/v1`，客户端通常会自动拼接 API 路径。

### OpenCode 示例

仓库自带 `opencode.json` 配置文件：

```bash
opencode run --model qoder-cn-local/qwen3.7-max --variant high "reply OK"
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/v1/models` | 模型列表 |
| POST | `/v1/chat/completions` | OpenAI 兼容格式对话，支持 tools |
| POST | `/v1/messages` | Anthropic 兼容格式对话，支持 tool_use |
| POST | `/v1/messages/count_tokens` | Token 估算 |

## 推理参数

通过配置或环境变量设置全局默认值：

```bash
qorder-proxy config set reasoningEffort high
qorder-proxy config set contextWindow 200000
qorder-proxy config set maxOutputTokens 4096
```

也可在每次请求中通过 `reasoning_effort`、`context_window`、`max_tokens` 参数单独指定。

## 流式输出

当客户端请求 `stream: true` 且不包含工具参数时，使用 CLI 的 `--output-format stream-json` 进行增量流式输出，以 SSE 事件转发。

当请求包含工具参数时，流式请求自动降级为非流式响应（工具调用解析需要完整 JSON）。

## 当前限制

- 工具调用通过 Prompt 格式指令 + 文本解析实现，非模型原生能力
- 工具调用响应不走流式，始终为完整 JSON 返回
- 每次请求启动一个新的 CLI 子进程
- 如果模型输出非法 JSON 或拒绝使用工具格式，响应会降级为纯文本

## 安全边界

- 默认仅监听 `127.0.0.1`
- 不建议也不支持作为公网服务、共享服务或商业 API 使用
- 日志自动脱敏 token、cookie、Authorization 头等敏感信息
- 配置文件权限 0600，仅本机用户可读写

### 认证方式

| 后端 | 认证方式 | 环境变量 |
|------|--------|--------|
| CN (`qoderclicn`) | Personal Access Token | `QODERCN_PERSONAL_ACCESS_TOKEN` |
| Global (`qodercli`) | OAuth 登录（`qodercli login`） | 无需配置 |

## 安全建议

- 只在本机使用
- 只监听 `127.0.0.1`
- 不要绑定 `0.0.0.0`，不要暴露到公网
- 不要把 Token 发给别人
- 不要把 `.env` 提交到 Git
- 如果怀疑 Token 泄露，立即到 Qoder 官方账号页面吊销 PAT 并重新创建

## 本地 Web 控制台

代理启动后访问：

```text
http://127.0.0.1:3000/ui
```

| Tab | 说明 |
|-----|------|
| Dashboard | 显示 /health 状态、Base URL、模型数量 |
| Models | 调用 /v1/models 显示模型列表 |
| Chat Test | 用 /v1/chat/completions 做简单非流式测试 |
| Config | 生成 OpenAI / Anthropic / OpenCode 配置示例 |
| Usage / Credits | 本地用量统计 |

### 本地用量统计说明

- Usage 页面显示的是**本地估算数据**，不代表 Qoder 官方账单或剩余额度
- token 数量基于简单字符数估算，标记为 `estimated`
- UI 不会读取、保存、显示 Qoder PAT

### Usage API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/usage/local` | 返回本地用量统计 |
| POST | `/usage/reset-local` | 重置本地用量统计 |

## 测试

```bash
npm test
```

## 许可证

MIT。详见 [LICENSE](LICENSE)。
