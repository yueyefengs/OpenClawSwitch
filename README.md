# OpenclawSwitch

OpenClaw CLI 的配置 Profile 管理工具。通过图形界面自由创建、编辑、切换 OpenClaw 配置，无需手动编辑 JSON 文件。

## 功能

- **Profile 管理** — 创建、重命名、删除多套配置；一键激活，立即生效
- **Providers 编辑器** — 可视化编辑 AI 模型提供商（API Key 掩码显示、Base URL）
- **首次自动导入** — 初次启动时自动将已有的 `~/.openclaw/openclaw.json` 导入为"默认"Profile
- **系统托盘** — 从托盘菜单快速切换 Profile，无需打开主界面
- **原子写入** — 激活 Profile 时通过临时文件 + rename 确保写入安全，不产生损坏的配置

## 截图

> 启动后左侧为 Profile 列表，右侧为编辑器；顶部 MCP / Skills 按钮为 P2 功能，暂未实装。

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
│       ├── ProfileEditor     # 右侧编辑区（标签页 + 保存/激活）
│       └── ProvidersTab      # Providers 配置编辑器
├── hooks/useProfiles         # TanStack Query mutations
├── lib/api/profile           # Tauri IPC 封装
└── types.ts                  # 共享类型定义

src-tauri/src/                # Rust 后端
├── database/                 # SQLite 初始化 + schema
├── services/
│   ├── config_parser         # JSON5 读取 + 原子写入
│   └── profile               # Profile CRUD + 激活逻辑
├── commands/profile          # Tauri 命令层（薄封装）
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
- **系统托盘**：应用启动时构建一次，●标记当前激活的 Profile；托盘菜单直接激活 Profile

## 路线图

### P1（已完成）

- [x] Profile CRUD
- [x] Providers 标签页编辑器
- [x] 激活写入 openclaw.json
- [x] 首次启动自动导入
- [x] 系统托盘快速切换

### P2（计划中）

- [ ] Channels 标签页（Telegram / Discord / WhatsApp / Slack）
- [ ] Gateway 标签页（端口、绑定地址、Tailscale、认证）
- [ ] Agents 标签页（工作目录、模型、心跳）
- [ ] MCP 服务器管理面板
- [ ] Skills 管理面板
- [ ] Profile 导入 / 导出
- [ ] 系统托盘实时刷新（切换后菜单同步更新）

## License

MIT
