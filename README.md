# OpenclawSwitch

OpenClaw CLI 的配置 Profile 管理工具。通过图形界面自由创建、编辑、切换 OpenClaw 配置，无需手动编辑 JSON 文件。

## 功能

- **Profile 管理** — 创建、重命名、克隆、删除多套配置；一键激活，立即生效
- **Providers 编辑器** — 可视化编辑 AI 模型提供商（API Key 掩码显示、Base URL）
- **Channels 配置** — 支持 Telegram、Feishu、Discord、DingDing、WeCom 五个渠道的完整配置
- **Gateway 配置** — 配置网关模式（本地/远程）、认证 Token
- **Agents 管理** — 创建 Agent（自动生成目录并调用 CLI）、编辑模型/工作目录、配置渠道绑定；支持从当前配置文件一键导入
- **首次自动导入** — 初次启动时自动将已有的 `~/.openclaw/openclaw.json` 导入为"默认"Profile
- **系统托盘** — 从托盘菜单快速切换 Profile，无需打开主界面
- **原子写入** — 激活 Profile 时通过临时文件 + rename 确保写入安全，不产生损坏的配置

## 截图

> 启动后左侧为 Profile 列表，右侧为编辑器，包含 Providers / Channels / Gateway / Agents 四个标签页。

## 快速开始

### 环境要求

- [Rust](https://rustup.rs/) 1.70+
- Node.js 18+
- pnpm（`npm i -g pnpm`）
- Tauri 系统依赖（[安装说明](https://tauri.app/start/prerequisites/)）

### 开发运行

```bash
pnpm install
pnpm tauri dev
```

### 构建

```bash
pnpm tauri build
```

产物位于 `src-tauri/target/release/bundle/`。

## 数据存储

| 路径 | 内容 |
|------|------|
| `~/.openclaw-switch/switch.db` | OpenclawSwitch 的 SQLite 数据库（Profile 列表、配置快照） |
| `~/.openclaw/openclaw.json` | OpenClaw 的实际配置文件（激活 Profile 时写入） |

激活操作只写入 `~/.openclaw/openclaw.json`，数据库始终是唯一数据来源。

## 架构

```
src/                          # React 前端 (TypeScript)
├── components/
│   ├── profiles/ProfileList  # 左侧 Profile 侧边栏
│   └── editor/
│       ├── ProfileEditor     # 右侧编辑区（标签页 + 保存/激活/校验）
│       ├── ProvidersTab      # AI 模型提供商配置
│       ├── ChannelsTab       # 渠道配置入口 + 渠道详情页导航
│       ├── FeishuDetailPage  # Feishu 详细配置
│       ├── TelegramDetailPage# Telegram 详细配置
│       ├── DiscordDetailPage # Discord 详细配置
│       ├── DingdingDetailPage# 钉钉详细配置
│       ├── WecomDetailPage   # 企业微信详细配置
│       ├── GatewayTab        # Gateway 配置
│       └── AgentsTab         # Agent 管理（创建/编辑/绑定）
├── hooks/useProfiles         # TanStack Query mutations
├── lib/api/profile           # Tauri IPC 封装
└── types.ts                  # 共享类型定义

src-tauri/src/                # Rust 后端
├── database/                 # SQLite 初始化 + schema
├── services/
│   ├── config_parser         # JSON5 读取 + 原子写入
│   └── profile               # Profile CRUD + 激活逻辑
├── commands/
│   ├── profile               # Tauri 命令层（Profile/MCP/Skills/Agent/文件 IO）
│   └── clawhub               # ClawhubSkill 搜索与安装
└── lib.rs                    # AppState + 应用入口 + 系统托盘
```

**技术栈**：Tauri 2 · React 18 · TypeScript · SQLite (rusqlite) · TanStack Query · shadcn/ui · Tailwind CSS

## 开发

### 运行测试

```bash
# Rust 单元测试
cargo test --manifest-path src-tauri/Cargo.toml

# 前端单元测试
pnpm test:unit

# TypeScript 类型检查
pnpm tsc --noEmit
```

### 项目结构说明

- **数据库**：4 张表 — `profiles`、`profile_configs`（1:1，存储完整 JSON 快照）、`mcp_servers`、`skills`
- **Profile 切换**：`activate_profile` 先保存最新配置到 DB，再从 DB 读出并原子写入 live 文件
- **系统托盘**：应用启动时构建一次，● 标记当前激活的 Profile；托盘菜单直接激活 Profile
- **渠道绑定**：支持全部五个渠道（Telegram / Feishu / Discord / DingDing / WeCom），绑定键为 `channel:accountId`
- **Agent 创建**：先调用 `openclaw agents add <id>` CLI 初始化目录（失败仅告警），再更新本地配置

## 路线图

### P1（已完成）

- [x] Profile CRUD（创建、重命名、克隆、删除）
- [x] Providers 标签页编辑器
- [x] Channels 标签页（Telegram / Feishu / Discord / DingDing / WeCom）
- [x] Gateway 标签页
- [x] Agents 标签页（创建、编辑、删除、渠道绑定）
- [x] Agent 创建时调用 CLI 初始化目录
- [x] 从当前配置文件导入 Agents
- [x] 激活写入 openclaw.json
- [x] 首次启动自动导入
- [x] 系统托盘快速切换

### P2（计划中）

- [ ] MCP 服务器管理面板（DB 表 `mcp_servers` 已就绪）
- [ ] Skills 管理面板（DB 表 `skills` 已就绪）
- [ ] Profile 导入 / 导出
- [ ] 系统托盘实时刷新（切换后菜单同步更新）

## License

MIT
