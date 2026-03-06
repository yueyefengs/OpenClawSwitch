# OpenclawSwitch 设计文档

**日期**：2026-03-06
**状态**：已批准，待实施

---

## 目标

为 OpenClaw CLI 工具构建一个轻量级桌面 GUI，实现多配置预设（Profile）的可视化管理与一键切换，对标 CC Switch 的交互范式，但只针对 OpenClaw，功能范围精简。

---

## 背景

OpenClaw 的配置文件位于 `~/.openclaw/openclaw.json`（JSON5 格式），包含：
- AI 模型提供商（API Key、Base URL、模型 ID）
- 消息通道（Telegram / Discord / WhatsApp / Slack）
- 网关设置（端口、认证、Tailscale）
- Agent 设置（工作区、心跳、默认模型）

用户需要在不同使用场景（如"工作""测试""省钱模式"）间切换整套配置，但手动编辑 JSON 摩擦太大。

CC Switch 已支持 OpenClaw，但功能过重（同时管理 5 个 CLI 工具、含云同步/用量统计等）。本项目目标是只做 OpenClaw，保持轻量。

---

## 技术选型

**Tauri 2 + React + TypeScript**

| 指标 | 数值 |
|---|---|
| 安装包大小 | ~5–15 MB |
| 内存占用 | ~30–80 MB |
| 后端语言 | Rust |
| 前端语言 | TypeScript / React 18 |

选择理由：CC Switch 已用此栈验证可行；二进制最小；跨平台原生支持。

---

## 架构设计

### 整体分层

```
┌─────────────────────────────────────────────┐
│         前端 (React + TypeScript)            │
│  Profile 列表  │  可视化编辑器  │  系统托盘   │
└───────────────────┬─────────────────────────┘
                    │  Tauri IPC
┌───────────────────▼─────────────────────────┐
│         后端 (Rust / Tauri 2)               │
│  ProfileService  │  ConfigParser  │  Tray   │
└───────────────────┬─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │  SQLite               │  ~/.openclaw/
        │  ~/.openclaw-switch/  │  openclaw.json  (live)
        │  switch.db            │
        └───────────────────────┘
```

### 数据存储策略

- **SQLite**（`~/.openclaw-switch/switch.db`）：所有 Profile 数据的唯一事实源
- **live 文件**（`~/.openclaw/openclaw.json`）：仅在激活 Profile 时写入，不作为数据读取来源
- **写入策略**：临时文件 + rename 原子写入，防止崩溃损坏配置
- **MCP / Skills**：全局存储，不随 Profile 切换

---

## 数据模型

```sql
-- Profile 元信息
CREATE TABLE profiles (
  id          TEXT PRIMARY KEY,   -- uuid v4
  name        TEXT NOT NULL,
  description TEXT,
  is_active   INTEGER DEFAULT 0,  -- 同一时刻只有一个为 1
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Profile 完整配置（存储完整 JSON，不拆字段）
CREATE TABLE profile_configs (
  profile_id  TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL
);

-- MCP 服务器（全局）
CREATE TABLE mcp_servers (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  config  TEXT NOT NULL   -- JSON
);

-- Skills（全局）
CREATE TABLE skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  source_url    TEXT,
  install_path  TEXT,
  installed_at  TEXT
);
```

**设计要点**：`profile_configs` 存整个 JSON blob 而非拆字段，好处是：OpenClaw 字段变化时无需迁移表结构，且激活时可直接写入 live 文件无需重组装。

---

## UI 设计

### 主界面布局

```
┌──────────────────────────────────────────────────────┐
│  OpenclawSwitch              [MCP] [Skills] [设置]    │
├───────────────┬──────────────────────────────────────┤
│  Profiles     │  编辑 Profile: "工作配置"  [激活] ▶   │
│  ─────────    ├──────────────────────────────────────┤
│  ● 工作配置   │  [Providers] [Channels] [Gateway]    │
│    测试配置   │  [Agents]                            │
│    省钱模式   │                                      │
│               │  （当前 Tab 的表单编辑器）             │
│  [+ 新建]     │                                      │
│  [导入]       │                                      │
└───────────────┴──────────────────────────────────────┘
```

### 编辑器 Tab 内容

| Tab | 可编辑内容 |
|---|---|
| **Providers** | 提供商名、API Key（可隐藏）、Base URL、主模型、备选模型列表 |
| **Channels** | Telegram / Discord / WhatsApp / Slack 的 Token、启用开关、DM 策略 |
| **Gateway** | 端口、绑定地址（loopback/0.0.0.0）、认证模式、Tailscale 模式 |
| **Agents** | 工作区路径、默认主模型、心跳间隔与目标 |

### 系统托盘

```
OpenclawSwitch
─────────────
● 工作配置        ← 当前激活（带圆点标记）
  测试配置
  省钱模式
─────────────
  打开主界面
  退出
```

点击 Profile 名称直接激活，无需打开主界面。

---

## 首次启动行为

检测 `~/.openclaw/openclaw.json` 是否存在：
- **存在**：自动导入为名为"默认"的 Profile 并激活，无需用户操作
- **不存在**：创建一个空的"默认" Profile，引导用户填写

---

## 功能范围

### P1（核心，MVP）

- [ ] Profile CRUD（创建、重命名、删除、复制）
- [ ] Profile 激活（原子写入 live 文件）
- [ ] Providers Tab 可视化编辑器
- [ ] 系统托盘快速切换
- [ ] 首次启动自动导入现有配置

### P2（完善）

- [ ] Channels Tab 编辑器
- [ ] Gateway Tab 编辑器
- [ ] Agents Tab 编辑器
- [ ] MCP 管理面板（右上角入口）
- [ ] Skills 管理面板（右上角入口）
- [ ] Profile 导入 / 导出（JSON 文件）

### 刻意不做（区别于 CC Switch）

- 云同步
- 用量统计 / 成本追踪
- 代理 / 故障转移
- Deep Link 导入
- 多 CLI 工具支持

---

## 目录结构

```
OpenclawSwitch/
├── src/                          # 前端 React + TypeScript
│   ├── components/
│   │   ├── profiles/             # Profile 列表、新建、删除
│   │   ├── editor/               # 四个 Tab 的表单编辑器
│   │   │   ├── ProvidersTab.tsx
│   │   │   ├── ChannelsTab.tsx
│   │   │   ├── GatewayTab.tsx
│   │   │   └── AgentsTab.tsx
│   │   ├── mcp/                  # MCP 管理面板
│   │   ├── skills/               # Skills 管理面板
│   │   └── ui/                   # shadcn/ui 基础组件
│   ├── hooks/                    # 业务逻辑 hooks
│   ├── lib/api/                  # Tauri IPC 类型安全封装
│   └── types.ts
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── commands/             # Tauri command 入口层
│       ├── services/
│       │   ├── profile.rs        # Profile CRUD + 激活逻辑
│       │   ├── config_parser.rs  # openclaw.json 读写（JSON5）
│       │   ├── mcp.rs
│       │   └── skills.rs
│       └── database/             # SQLite DAO 层
└── docs/plans/
    └── 2026-03-06-openclaw-switch-design.md
```

---

## 关键依赖

| 层 | 库 | 版本 | 用途 |
|---|---|---|---|
| 前端 UI | shadcn/ui + Tailwind CSS | latest | 组件库 |
| 前端状态 | TanStack Query | v5 | 服务端状态缓存 |
| 前端表单 | react-hook-form + zod | latest | 表单 + 验证 |
| 后端数据库 | rusqlite | latest | SQLite |
| 后端 JSON5 | json5 (crate) | latest | 解析 openclaw.json |
| 系统托盘 | tauri-plugin-tray | 2.x | 托盘菜单 |
| 桌面框架 | Tauri | 2.x | 跨平台桌面 |
