# OpenclawSwitch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight desktop GUI for managing OpenClaw config profiles, with one-click switching between presets.

**Architecture:** Tauri 2 (Rust backend) + React 18 (TypeScript frontend). Backend manages SQLite database at `~/.openclaw-switch/switch.db` as single source of truth; activating a profile atomically writes to `~/.openclaw/openclaw.json`. Frontend uses TanStack Query for state and shadcn/ui for components.

**Tech Stack:** Rust, Tauri 2, React 18, TypeScript, rusqlite (SQLite), json5 crate, TanStack Query v5, react-hook-form + zod, shadcn/ui, Tailwind CSS

---

## Prerequisites

Before starting, ensure:
- Rust toolchain: `rustup --version` (install from https://rustup.rs if missing)
- Node.js 18+: `node --version`
- pnpm: `pnpm --version` (install with `npm i -g pnpm` if missing)
- Tauri system deps for your OS: https://tauri.app/start/prerequisites/

---

## Task 1: Scaffold Tauri 2 + React Project

**Files:**
- Create: entire project via CLI

**Step 1: Create the project**

```bash
cd /Users/yueqingli/code/OpenclawSwitch
pnpm create tauri-app@latest . -- --template react-ts --manager pnpm --identifier com.openclaw.switch
```

When prompted:
- Project name: `openclaw-switch`
- Frontend language: TypeScript
- Package manager: pnpm
- UI template: React

**Step 2: Verify it builds**

```bash
pnpm install
pnpm tauri dev
```

Expected: App window opens with Tauri default screen. Close it after confirming.

**Step 3: Clean up default placeholder files**

Delete `src/assets/react.svg`, `src/App.css`, and clear `src/App.tsx` to a minimal skeleton:

```tsx
// src/App.tsx
export default function App() {
  return <div>OpenclawSwitch</div>
}
```

**Step 4: Move design docs, commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri 2 + React project"
```

---

## Task 2: Add Frontend Dependencies

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `src/index.css`
- Create: `components.json` (shadcn config)

**Step 1: Install runtime dependencies**

```bash
pnpm add @tanstack/react-query react-hook-form @hookform/resolvers zod lucide-react clsx tailwind-merge class-variance-authority sonner
```

**Step 2: Install dev dependencies**

```bash
pnpm add -D tailwindcss postcss autoprefixer @types/node vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Initialize Tailwind CSS**

```bash
pnpm dlx tailwindcss init -p
```

Replace `tailwind.config.js` content:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted: style=default, base color=slate, CSS variables=yes.

**Step 5: Add shadcn components needed for MVP**

```bash
pnpm dlx shadcn@latest add button input label tabs dialog scroll-area badge separator tooltip
```

**Step 6: Configure vitest**

Add to `vite.config.ts`:

```ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
})
```

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom"
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add frontend dependencies and shadcn/ui"
```

---

## Task 3: Add Rust Backend Dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add crate dependencies**

In `src-tauri/Cargo.toml`, under `[dependencies]`, add:

```toml
rusqlite = { version = "0.32", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
json5 = "0.4"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
thiserror = "2"
```

**Step 2: Verify compilation**

```bash
cd src-tauri && cargo check
```

Expected: Compiles without errors (may take a minute to fetch crates).

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "feat: add Rust backend dependencies"
```

---

## Task 4: Database Layer (Rust)

**Files:**
- Create: `src-tauri/src/database/mod.rs`
- Create: `src-tauri/src/database/schema.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write failing test for DB initialization**

Create `src-tauri/src/database/mod.rs`:

```rust
use rusqlite::{Connection, Result};
use std::path::Path;

pub mod schema;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        Ok(Database { conn })
    }

    pub fn init(&self) -> Result<()> {
        self.conn.execute_batch(schema::MIGRATIONS)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_initializes() {
        let db = Database::open(Path::new(":memory:")).unwrap();
        assert!(db.init().is_ok());
    }

    #[test]
    fn test_profiles_table_exists() {
        let db = Database::open(Path::new(":memory:")).unwrap();
        db.init().unwrap();
        let count: i64 = db.conn
            .query_row("SELECT count(*) FROM profiles", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
```

**Step 2: Create schema**

Create `src-tauri/src/database/schema.rs`:

```rust
pub const MIGRATIONS: &str = "
CREATE TABLE IF NOT EXISTS profiles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_configs (
    profile_id  TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_servers (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    config  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    source_url    TEXT,
    install_path  TEXT,
    installed_at  TEXT
);

PRAGMA foreign_keys = ON;
";
```

**Step 3: Run tests**

```bash
cd src-tauri && cargo test database
```

Expected: 2 tests pass.

**Step 4: Commit**

```bash
git add src-tauri/src/database/
git commit -m "feat: add database layer with SQLite schema"
```

---

## Task 5: Config Parser (Rust)

**Files:**
- Create: `src-tauri/src/services/config_parser.rs`

**Step 1: Write failing tests**

Create `src-tauri/src/services/config_parser.rs`:

```rust
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::fs;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON5 parse error: {0}")]
    Parse(String),
    #[error("JSON serialize error: {0}")]
    Serialize(#[from] serde_json::Error),
}

/// Read openclaw.json (JSON5 format) from given path
pub fn read_config(path: &Path) -> Result<Value, ConfigError> {
    let content = fs::read_to_string(path)?;
    json5::from_str(&content).map_err(|e| ConfigError::Parse(e.to_string()))
}

/// Write JSON value to path atomically (tmp file + rename)
pub fn write_config(path: &Path, value: &Value) -> Result<(), ConfigError> {
    let json = serde_json::to_string_pretty(value)?;
    let tmp_path = path.with_extension("tmp");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&tmp_path, json)?;
    fs::rename(&tmp_path, path)?;
    Ok(())
}

/// Get the default openclaw config path: ~/.openclaw/openclaw.json
pub fn default_openclaw_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    home.join(".openclaw").join("openclaw.json")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_read_standard_json() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("openclaw.json");
        fs::write(&path, r#"{"models": {"providers": {}}}"#).unwrap();
        let val = read_config(&path).unwrap();
        assert!(val["models"]["providers"].is_object());
    }

    #[test]
    fn test_read_json5_with_comments() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("openclaw.json");
        fs::write(&path, r#"{ // comment
            "models": { "providers": {} },
        }"#).unwrap();
        let val = read_config(&path).unwrap();
        assert!(val["models"].is_object());
    }

    #[test]
    fn test_write_config_atomic() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("openclaw.json");
        let val = serde_json::json!({"test": "value"});
        write_config(&path, &val).unwrap();
        let readback = read_config(&path).unwrap();
        assert_eq!(readback["test"], "value");
    }

    #[test]
    fn test_write_creates_parent_dir() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("nested").join("openclaw.json");
        let val = serde_json::json!({});
        write_config(&path, &val).unwrap();
        assert!(path.exists());
    }
}
```

**Step 2: Add `dirs` and `tempfile` to Cargo.toml**

```toml
dirs = "5"
tempfile = { version = "3", optional = true }

[dev-dependencies]
tempfile = "3"
```

**Step 3: Add module declarations to lib.rs**

In `src-tauri/src/lib.rs`, add:

```rust
mod database;
mod services;
```

Create `src-tauri/src/services/mod.rs`:

```rust
pub mod config_parser;
pub mod profile;
```

**Step 4: Run tests**

```bash
cd src-tauri && cargo test config_parser
```

Expected: 4 tests pass.

**Step 5: Commit**

```bash
git add src-tauri/src/services/
git commit -m "feat: add config parser for openclaw.json (JSON5 read, atomic write)"
```

---

## Task 6: Profile Service (Rust)

**Files:**
- Create: `src-tauri/src/services/profile.rs`

**Step 1: Define types**

Create `src-tauri/src/services/profile.rs`:

```rust
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;
use chrono::Utc;

#[derive(Error, Debug)]
pub enum ProfileError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("Config error: {0}")]
    Config(#[from] super::config_parser::ConfigError),
    #[error("Profile not found: {0}")]
    NotFound(String),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileWithConfig {
    #[serde(flatten)]
    pub profile: Profile,
    pub config: Value,
}

pub fn list_profiles(conn: &Connection) -> Result<Vec<Profile>, ProfileError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, is_active, created_at, updated_at FROM profiles ORDER BY created_at"
    )?;
    let profiles = stmt.query_map([], |row| {
        Ok(Profile {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            is_active: row.get::<_, i64>(3)? != 0,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    Ok(profiles)
}

pub fn create_profile(
    conn: &Connection,
    name: &str,
    description: Option<&str>,
    config: Value,
) -> Result<Profile, ProfileError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO profiles (id, name, description, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 0, ?4, ?5)",
        params![id, name, description, now, now],
    )?;
    let config_json = serde_json::to_string(&config)?;
    conn.execute(
        "INSERT INTO profile_configs (profile_id, config_json) VALUES (?1, ?2)",
        params![id, config_json],
    )?;
    Ok(Profile {
        id,
        name: name.to_string(),
        description: description.map(str::to_string),
        is_active: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn update_profile_config(
    conn: &Connection,
    id: &str,
    config: Value,
) -> Result<(), ProfileError> {
    let config_json = serde_json::to_string(&config)?;
    let now = Utc::now().to_rfc3339();
    let changed = conn.execute(
        "UPDATE profile_configs SET config_json = ?1 WHERE profile_id = ?2",
        params![config_json, id],
    )?;
    if changed == 0 {
        return Err(ProfileError::NotFound(id.to_string()));
    }
    conn.execute("UPDATE profiles SET updated_at = ?1 WHERE id = ?2", params![now, id])?;
    Ok(())
}

pub fn rename_profile(conn: &Connection, id: &str, name: &str) -> Result<(), ProfileError> {
    let now = Utc::now().to_rfc3339();
    let changed = conn.execute(
        "UPDATE profiles SET name = ?1, updated_at = ?2 WHERE id = ?3",
        params![name, now, id],
    )?;
    if changed == 0 {
        return Err(ProfileError::NotFound(id.to_string()));
    }
    Ok(())
}

pub fn delete_profile(conn: &Connection, id: &str) -> Result<(), ProfileError> {
    // Refuse to delete the active profile
    let is_active: i64 = conn.query_row(
        "SELECT is_active FROM profiles WHERE id = ?1", params![id], |r| r.get(0)
    ).map_err(|_| ProfileError::NotFound(id.to_string()))?;
    if is_active != 0 {
        return Err(ProfileError::Db(rusqlite::Error::InvalidParameterName(
            "Cannot delete the active profile".to_string()
        )));
    }
    conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
    Ok(())
}

/// Activate a profile: set is_active=1, clear others, write live file
pub fn activate_profile(
    conn: &Connection,
    id: &str,
    live_path: &std::path::Path,
) -> Result<(), ProfileError> {
    let config_json: String = conn.query_row(
        "SELECT config_json FROM profile_configs WHERE profile_id = ?1",
        params![id],
        |r| r.get(0),
    ).map_err(|_| ProfileError::NotFound(id.to_string()))?;

    let config: Value = serde_json::from_str(&config_json)?;
    super::config_parser::write_config(live_path, &config)?;

    conn.execute("UPDATE profiles SET is_active = 0", [])?;
    conn.execute("UPDATE profiles SET is_active = 1 WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_profile_config(conn: &Connection, id: &str) -> Result<Value, ProfileError> {
    let config_json: String = conn.query_row(
        "SELECT config_json FROM profile_configs WHERE profile_id = ?1",
        params![id],
        |r| r.get(0),
    ).map_err(|_| ProfileError::NotFound(id.to_string()))?;
    Ok(serde_json::from_str(&config_json)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{Database, schema};
    use std::path::Path;
    use tempfile::TempDir;

    fn setup_db() -> Database {
        let db = Database::open(Path::new(":memory:")).unwrap();
        db.init().unwrap();
        db
    }

    #[test]
    fn test_create_and_list_profiles() {
        let db = setup_db();
        create_profile(&db.conn, "工作", None, serde_json::json!({})).unwrap();
        create_profile(&db.conn, "测试", None, serde_json::json!({})).unwrap();
        let profiles = list_profiles(&db.conn).unwrap();
        assert_eq!(profiles.len(), 2);
        assert_eq!(profiles[0].name, "工作");
    }

    #[test]
    fn test_rename_profile() {
        let db = setup_db();
        let p = create_profile(&db.conn, "old", None, serde_json::json!({})).unwrap();
        rename_profile(&db.conn, &p.id, "new").unwrap();
        let profiles = list_profiles(&db.conn).unwrap();
        assert_eq!(profiles[0].name, "new");
    }

    #[test]
    fn test_delete_inactive_profile() {
        let db = setup_db();
        let p = create_profile(&db.conn, "temp", None, serde_json::json!({})).unwrap();
        delete_profile(&db.conn, &p.id).unwrap();
        assert_eq!(list_profiles(&db.conn).unwrap().len(), 0);
    }

    #[test]
    fn test_cannot_delete_active_profile() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let p = create_profile(&db.conn, "active", None, serde_json::json!({})).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();
        assert!(delete_profile(&db.conn, &p.id).is_err());
    }

    #[test]
    fn test_activate_writes_live_file() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({"models": {"providers": {}}});
        let p = create_profile(&db.conn, "work", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();
        assert!(live.exists());
        let profiles = list_profiles(&db.conn).unwrap();
        assert!(profiles[0].is_active);
    }
}
```

**Step 2: Run tests**

```bash
cd src-tauri && cargo test profile
```

Expected: 5 tests pass.

**Step 3: Commit**

```bash
git add src-tauri/src/services/profile.rs
git commit -m "feat: add profile service (CRUD + activate with atomic write)"
```

---

## Task 7: Tauri Commands + App State

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/profile.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Create app state**

In `src-tauri/src/lib.rs`:

```rust
mod database;
mod services;
mod commands;

use database::Database;
use std::sync::Mutex;
use std::path::PathBuf;

pub struct AppState {
    pub db: Mutex<Database>,
    pub live_config_path: PathBuf,
}
```

**Step 2: Create profile commands**

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod profile;
```

Create `src-tauri/src/commands/profile.rs`:

```rust
use crate::{AppState, services::profile};
use serde_json::Value;
use tauri::State;

#[derive(Debug, serde::Serialize)]
pub struct CommandError(String);
impl From<profile::ProfileError> for CommandError {
    fn from(e: profile::ProfileError) -> Self { CommandError(e.to_string()) }
}

#[tauri::command]
pub fn list_profiles(state: State<AppState>) -> Result<Vec<profile::Profile>, CommandError> {
    let db = state.db.lock().unwrap();
    profile::list_profiles(&db.conn).map_err(Into::into)
}

#[tauri::command]
pub fn create_profile(
    state: State<AppState>,
    name: String,
    description: Option<String>,
    config: Value,
) -> Result<profile::Profile, CommandError> {
    let db = state.db.lock().unwrap();
    profile::create_profile(&db.conn, &name, description.as_deref(), config).map_err(Into::into)
}

#[tauri::command]
pub fn update_profile_config(
    state: State<AppState>,
    id: String,
    config: Value,
) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::update_profile_config(&db.conn, &id, config).map_err(Into::into)
}

#[tauri::command]
pub fn rename_profile(
    state: State<AppState>,
    id: String,
    name: String,
) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::rename_profile(&db.conn, &id, &name).map_err(Into::into)
}

#[tauri::command]
pub fn delete_profile(state: State<AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::delete_profile(&db.conn, &id).map_err(Into::into)
}

#[tauri::command]
pub fn activate_profile(state: State<AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::activate_profile(&db.conn, &id, &state.live_config_path).map_err(Into::into)
}

#[tauri::command]
pub fn get_profile_config(state: State<AppState>, id: String) -> Result<Value, CommandError> {
    let db = state.db.lock().unwrap();
    profile::get_profile_config(&db.conn, &id).map_err(Into::into)
}
```

**Step 3: Wire commands into Tauri app in lib.rs**

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let home = dirs::home_dir().unwrap_or_default();
    let db_path = home.join(".openclaw-switch").join("switch.db");
    let live_path = home.join(".openclaw").join("openclaw.json");

    std::fs::create_dir_all(db_path.parent().unwrap()).unwrap();

    let db = Database::open(&db_path).expect("Failed to open database");
    db.init().expect("Failed to initialize database");

    // First launch: import existing openclaw.json
    maybe_import_existing_config(&db, &live_path);

    let state = AppState {
        db: Mutex::new(db),
        live_config_path: live_path,
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::profile::list_profiles,
            commands::profile::create_profile,
            commands::profile::update_profile_config,
            commands::profile::rename_profile,
            commands::profile::delete_profile,
            commands::profile::activate_profile,
            commands::profile::get_profile_config,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}

fn maybe_import_existing_config(db: &Database, live_path: &std::path::Path) {
    use services::{config_parser, profile};
    // Only auto-import if no profiles exist yet
    let count: i64 = db.conn
        .query_row("SELECT count(*) FROM profiles", [], |r| r.get(0))
        .unwrap_or(0);
    if count > 0 { return; }

    let config = if live_path.exists() {
        config_parser::read_config(live_path).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let p = profile::create_profile(&db.conn, "默认", None, config)
        .expect("Failed to create default profile");
    profile::activate_profile(&db.conn, &p.id, live_path)
        .expect("Failed to activate default profile");
}
```

**Step 4: Build check**

```bash
cd src-tauri && cargo check
```

Expected: No errors.

**Step 5: Commit**

```bash
git add src-tauri/src/commands/ src-tauri/src/lib.rs
git commit -m "feat: add Tauri commands and app state wiring"
```

---

## Task 8: TypeScript API Layer

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/api/profile.ts`
- Create: `src/lib/query/index.ts`

**Step 1: Define TypeScript types**

Create `src/types.ts`:

```ts
export interface Profile {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Mirrors the openclaw.json structure (partial - only what the editor touches)
export interface OpenclawConfig {
  models?: {
    providers?: Record<string, ProviderConfig>
  }
  agents?: {
    defaults?: {
      model?: { primary?: string; fallbacks?: string[] }
      workspace?: string
      heartbeat?: { every?: string; target?: string }
    }
  }
  gateway?: {
    bind?: string
    port?: number
    tailscale?: { mode?: string }
    auth?: { mode?: string }
  }
  channels?: {
    telegram?: ChannelConfig
    discord?: ChannelConfig
    whatsapp?: ChannelConfig
    slack?: ChannelConfig & { appToken?: string }
  }
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
}

export interface ChannelConfig {
  enabled?: boolean
  botToken?: string
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[]
}
```

**Step 2: Create Tauri IPC wrapper**

Create `src/lib/api/profile.ts`:

```ts
import { invoke } from "@tauri-apps/api/core"
import type { Profile, OpenclawConfig } from "../../types"

export const profileApi = {
  list: () => invoke<Profile[]>("list_profiles"),
  create: (name: string, description: string | null, config: OpenclawConfig) =>
    invoke<Profile>("create_profile", { name, description, config }),
  updateConfig: (id: string, config: OpenclawConfig) =>
    invoke<void>("update_profile_config", { id, config }),
  rename: (id: string, name: string) =>
    invoke<void>("rename_profile", { id, name }),
  delete: (id: string) => invoke<void>("delete_profile", { id }),
  activate: (id: string) => invoke<void>("activate_profile", { id }),
  getConfig: (id: string) => invoke<OpenclawConfig>("get_profile_config", { id }),
}
```

**Step 3: Configure TanStack Query**

Create `src/lib/query/index.ts`:

```ts
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30, retry: 1 },
  },
})

export const queryKeys = {
  profiles: ["profiles"] as const,
  profileConfig: (id: string) => ["profileConfig", id] as const,
}
```

**Step 4: Wrap app in QueryClientProvider**

Update `src/main.tsx`:

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { queryClient } from "./lib/query"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
```

**Step 5: Write a unit test for the types**

Create `src/lib/api/__tests__/profile.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest"

// Verify our API wrapper calls invoke with correct command names
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}))

import { invoke } from "@tauri-apps/api/core"
import { profileApi } from "../profile"

describe("profileApi", () => {
  it("list calls list_profiles command", async () => {
    await profileApi.list()
    expect(invoke).toHaveBeenCalledWith("list_profiles")
  })

  it("activate calls activate_profile with id", async () => {
    await profileApi.activate("test-id")
    expect(invoke).toHaveBeenCalledWith("activate_profile", { id: "test-id" })
  })
})
```

**Step 6: Run frontend tests**

```bash
pnpm test:unit
```

Expected: 2 tests pass.

**Step 7: Commit**

```bash
git add src/types.ts src/lib/
git commit -m "feat: add TypeScript API layer and TanStack Query setup"
```

---

## Task 9: Profile List Sidebar

**Files:**
- Create: `src/components/profiles/ProfileList.tsx`
- Create: `src/components/profiles/ProfileList.test.tsx`
- Create: `src/hooks/useProfiles.ts`

**Step 1: Create useProfiles hook**

Create `src/hooks/useProfiles.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { profileApi } from "../lib/api/profile"
import { queryKeys } from "../lib/query"

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: profileApi.list,
  })
}

export function useActivateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => profileApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}

export function useCreateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, config }: { name: string; config: object }) =>
      profileApi.create(name, null, config),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => profileApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}

export function useRenameProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      profileApi.rename(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profiles }),
  })
}
```

**Step 2: Write failing component test**

Create `src/components/profiles/ProfileList.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { QueryClientProvider } from "@tanstack/react-query"
import { QueryClient } from "@tanstack/react-query"
import ProfileList from "./ProfileList"

vi.mock("../../hooks/useProfiles", () => ({
  useProfiles: () => ({
    data: [
      { id: "1", name: "工作", is_active: true, created_at: "", updated_at: "" },
      { id: "2", name: "测试", is_active: false, created_at: "", updated_at: "" },
    ],
    isLoading: false,
  }),
  useActivateProfile: () => ({ mutate: vi.fn() }),
  useDeleteProfile: () => ({ mutate: vi.fn() }),
  useCreateProfile: () => ({ mutate: vi.fn() }),
  useRenameProfile: () => ({ mutate: vi.fn() }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("ProfileList", () => {
  it("renders profile names", () => {
    renderWithQuery(<ProfileList selectedId={null} onSelect={() => {}} />)
    expect(screen.getByText("工作")).toBeInTheDocument()
    expect(screen.getByText("测试")).toBeInTheDocument()
  })

  it("shows active indicator on active profile", () => {
    renderWithQuery(<ProfileList selectedId={null} onSelect={() => {}} />)
    expect(screen.getByTestId("active-dot-1")).toBeInTheDocument()
    expect(screen.queryByTestId("active-dot-2")).not.toBeInTheDocument()
  })

  it("calls onSelect when profile clicked", () => {
    const onSelect = vi.fn()
    renderWithQuery(<ProfileList selectedId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText("测试"))
    expect(onSelect).toHaveBeenCalledWith("2")
  })
})
```

**Step 3: Implement ProfileList component**

Create `src/components/profiles/ProfileList.tsx`:

```tsx
import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import {
  useProfiles, useActivateProfile, useDeleteProfile,
  useCreateProfile, useRenameProfile
} from "../../hooks/useProfiles"
import { cn } from "../../lib/utils"

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function ProfileList({ selectedId, onSelect }: Props) {
  const { data: profiles = [], isLoading } = useProfiles()
  const activate = useActivateProfile()
  const deleteProfile = useDeleteProfile()
  const createProfile = useCreateProfile()
  const renameProfile = useRenameProfile()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">加载中...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 font-semibold text-sm border-b">Profiles</div>
      <div className="flex-1 overflow-auto">
        {profiles.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent text-sm",
              selectedId === p.id && "bg-accent"
            )}
          >
            {p.is_active
              ? <span data-testid={`active-dot-${p.id}`} className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              : <span className="w-2 h-2 shrink-0" />
            }
            {editingId === p.id ? (
              <input
                autoFocus
                className="flex-1 bg-transparent border-b outline-none text-sm"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName.trim()) renameProfile.mutate({ id: p.id, name: editName.trim() })
                  setEditingId(null)
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                  if (e.key === "Escape") setEditingId(null)
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{p.name}</span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                className="p-0.5 hover:text-foreground text-muted-foreground"
                onClick={e => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name) }}
              >
                <Pencil size={12} />
              </button>
              {!p.is_active && (
                <button
                  className="p-0.5 hover:text-destructive text-muted-foreground"
                  onClick={e => { e.stopPropagation(); deleteProfile.mutate(p.id) }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => createProfile.mutate({ name: "新配置", config: {} })}
        >
          <Plus size={14} /> 新建
        </Button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

```bash
pnpm test:unit
```

Expected: All tests pass including 3 new ProfileList tests.

**Step 5: Commit**

```bash
git add src/components/profiles/ src/hooks/useProfiles.ts
git commit -m "feat: add profile list sidebar with CRUD UI"
```

---

## Task 10: Providers Tab Editor

**Files:**
- Create: `src/components/editor/ProvidersTab.tsx`
- Create: `src/components/editor/ProvidersTab.test.tsx`

**Step 1: Write failing test**

Create `src/components/editor/ProvidersTab.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import ProvidersTab from "./ProvidersTab"

const mockConfig = {
  models: {
    providers: {
      anthropic: { apiKey: "sk-ant-test", baseUrl: "https://api.anthropic.com/v1" },
    },
  },
}

describe("ProvidersTab", () => {
  it("renders existing providers", () => {
    render(<ProvidersTab config={mockConfig} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue("anthropic")).toBeInTheDocument()
  })

  it("masks API key by default", () => {
    render(<ProvidersTab config={mockConfig} onChange={vi.fn()} />)
    const keyInput = screen.getByTestId("apikey-anthropic")
    expect(keyInput).toHaveAttribute("type", "password")
  })

  it("calls onChange when API key edited", () => {
    const onChange = vi.fn()
    render(<ProvidersTab config={mockConfig} onChange={onChange} />)
    const keyInput = screen.getByTestId("apikey-anthropic")
    fireEvent.change(keyInput, { target: { value: "new-key" } })
    expect(onChange).toHaveBeenCalled()
  })

  it("add provider button appears", () => {
    render(<ProvidersTab config={{}} onChange={vi.fn()} />)
    expect(screen.getByText("添加提供商")).toBeInTheDocument()
  })
})
```

**Step 2: Implement ProvidersTab**

Create `src/components/editor/ProvidersTab.tsx`:

```tsx
import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import type { OpenclawConfig, ProviderConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}

export default function ProvidersTab({ config, onChange }: Props) {
  const providers = config.models?.providers ?? {}
  const [visible, setVisible] = useState<Record<string, boolean>>({})

  function updateProvider(name: string, patch: Partial<ProviderConfig>) {
    onChange({
      ...config,
      models: {
        ...config.models,
        providers: {
          ...providers,
          [name]: { ...providers[name], ...patch },
        },
      },
    })
  }

  function addProvider() {
    const name = `provider_${Date.now()}`
    onChange({
      ...config,
      models: {
        ...config.models,
        providers: { ...providers, [name]: {} },
      },
    })
  }

  function removeProvider(name: string) {
    const next = { ...providers }
    delete next[name]
    onChange({ ...config, models: { ...config.models, providers: next } })
  }

  function renameProvider(oldName: string, newName: string) {
    if (oldName === newName || !newName.trim()) return
    const next: Record<string, ProviderConfig> = {}
    for (const [k, v] of Object.entries(providers)) {
      next[k === oldName ? newName : k] = v
    }
    onChange({ ...config, models: { ...config.models, providers: next } })
  }

  return (
    <div className="space-y-4 p-4">
      {Object.entries(providers).map(([name, prov]) => (
        <div key={name} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              defaultValue={name}
              className="font-medium"
              onBlur={e => renameProvider(name, e.target.value)}
            />
            <Button variant="ghost" size="icon" onClick={() => removeProvider(name)}>
              <Trash2 size={14} />
            </Button>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                data-testid={`apikey-${name}`}
                type={visible[name] ? "text" : "password"}
                value={prov.apiKey ?? ""}
                onChange={e => updateProvider(name, { apiKey: e.target.value })}
                placeholder="sk-..."
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVisible(v => ({ ...v, [name]: !v[name] }))}
              >
                {visible[name] ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value={prov.baseUrl ?? ""}
              onChange={e => updateProvider(name, { baseUrl: e.target.value })}
              placeholder="https://api.anthropic.com/v1"
            />
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addProvider} className="w-full gap-2">
        <Plus size={14} /> 添加提供商
      </Button>
    </div>
  )
}
```

**Step 3: Run tests**

```bash
pnpm test:unit
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/components/editor/ProvidersTab.tsx src/components/editor/ProvidersTab.test.tsx
git commit -m "feat: add Providers tab editor with API key masking"
```

---

## Task 11: Main App Layout + Profile Editor Shell

**Files:**
- Create: `src/components/editor/ProfileEditor.tsx`
- Modify: `src/App.tsx`

**Step 1: Create ProfileEditor shell (tabs)**

Create `src/components/editor/ProfileEditor.tsx`:

```tsx
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Button } from "../ui/button"
import { profileApi } from "../../lib/api/profile"
import { queryKeys } from "../../lib/query"
import ProvidersTab from "./ProvidersTab"
import type { OpenclawConfig } from "../../types"
import { toast } from "sonner"

interface Props {
  profileId: string
}

export default function ProfileEditor({ profileId }: Props) {
  const qc = useQueryClient()
  const { data: config, isLoading } = useQuery({
    queryKey: queryKeys.profileConfig(profileId),
    queryFn: () => profileApi.getConfig(profileId),
  })

  const [draft, setDraft] = useState<Partial<OpenclawConfig>>({})
  useEffect(() => { if (config) setDraft(config) }, [config])

  const { data: profiles = [] } = useQuery({
    queryKey: queryKeys.profiles,
    queryFn: profileApi.list,
  })
  const currentProfile = profiles.find(p => p.id === profileId)

  const save = useMutation({
    mutationFn: () => profileApi.updateConfig(profileId, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profileConfig(profileId) })
      toast.success("配置已保存")
    },
    onError: (e) => toast.error(`保存失败: ${e}`),
  })

  const activate = useMutation({
    mutationFn: () => profileApi.activate(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles })
      toast.success(`已激活 "${currentProfile?.name}"`)
    },
  })

  if (isLoading) return <div className="p-6 text-muted-foreground">加载中...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <span className="font-medium">{currentProfile?.name ?? "—"}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => save.mutate()}>保存</Button>
          {!currentProfile?.is_active && (
            <Button size="sm" onClick={() => { save.mutate(); activate.mutate() }}>
              激活 ▶
            </Button>
          )}
          {currentProfile?.is_active && (
            <span className="text-xs text-green-600 flex items-center gap-1">● 当前激活</span>
          )}
        </div>
      </div>
      <Tabs defaultValue="providers" className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="channels" disabled>Channels</TabsTrigger>
          <TabsTrigger value="gateway" disabled>Gateway</TabsTrigger>
          <TabsTrigger value="agents" disabled>Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="flex-1 overflow-auto">
          <ProvidersTab config={draft} onChange={setDraft} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Update App.tsx with full layout**

```tsx
import { useState } from "react"
import { Toaster } from "sonner"
import ProfileList from "./components/profiles/ProfileList"
import ProfileEditor from "./components/editor/ProfileEditor"
import { Button } from "./components/ui/button"

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-semibold text-sm">OpenclawSwitch</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled>MCP</Button>
          <Button variant="ghost" size="sm" disabled>Skills</Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r shrink-0 overflow-hidden">
          <ProfileList selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {selectedId
            ? <ProfileEditor profileId={selectedId} />
            : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                选择左侧 Profile 开始编辑
              </div>
          }
        </div>
      </div>

      <Toaster />
    </div>
  )
}
```

**Step 3: Run dev to verify UI**

```bash
pnpm tauri dev
```

Expected: App opens, shows sidebar with "默认" profile, clicking it shows Providers editor.

**Step 4: Commit**

```bash
git add src/App.tsx src/components/editor/ProfileEditor.tsx
git commit -m "feat: wire up main layout with profile sidebar and editor"
```

---

## Task 12: System Tray

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Enable tray permission in tauri.conf.json**

In `src-tauri/tauri.conf.json`, add to capabilities:

```json
{
  "identifier": "tray",
  "windows": ["main"],
  "permissions": ["tray:default"]
}
```

Or add `"tray:default"` to the existing capability file in `src-tauri/capabilities/`.

**Step 2: Add tray setup to lib.rs**

Add this function to `src-tauri/src/lib.rs`:

```rust
fn build_tray(app: &tauri::App, state: &AppState) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem},
        tray::TrayIconBuilder,
    };

    let db = state.db.lock().unwrap();
    let profiles = services::profile::list_profiles(&db.conn).unwrap_or_default();
    drop(db);

    let mut items: Vec<Box<dyn tauri::menu::IsMenuItem<_>>> = vec![];
    for p in &profiles {
        let label = if p.is_active {
            format!("● {}", p.name)
        } else {
            format!("  {}", p.name)
        };
        let item = MenuItem::with_id(app, &p.id, label, true, None::<&str>)?;
        items.push(Box::new(item));
    }
    items.push(Box::new(PredefinedMenuItem::separator(app)?));
    items.push(Box::new(MenuItem::with_id(app, "show", "打开主界面", true, None::<&str>)?));
    items.push(Box::new(MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?));

    let menu = Menu::with_items(app, &items.iter().map(|i| i.as_ref()).collect::<Vec<_>>())?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
                "quit" => app.exit(0),
                id => {
                    // Assume it's a profile ID
                    let state = app.state::<AppState>();
                    let db = state.db.lock().unwrap();
                    let _ = services::profile::activate_profile(&db.conn, id, &state.live_config_path);
                }
            }
        })
        .build(app)?;

    Ok(())
}
```

Call `build_tray(app_handle, &state)` in the `setup` closure of `tauri::Builder`.

**Step 3: Add command to refresh tray after profile switch**

Add a `#[tauri::command] fn refresh_tray(app: tauri::AppHandle, state: State<AppState>)` command that rebuilds the tray menu, and call it from the frontend after `activate_profile`.

**Step 4: Verify tray appears**

```bash
pnpm tauri dev
```

Expected: App icon in system tray. Click → menu shows profiles. Selecting a profile activates it.

**Step 5: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add system tray with quick profile switching"
```

---

## P2 Tasks (After P1 is working)

These tasks follow the same TDD pattern as above. Each produces a failing test → implementation → passing test → commit cycle.

### Task 13: Channels Tab

Add Telegram/Discord/WhatsApp/Slack token + enabled toggle + dmPolicy selector. Mirror the ProvidersTab pattern: typed form in React, stored in the `channels` key of the config JSON blob.

### Task 14: Gateway Tab

Add port number input, bind address dropdown (127.0.0.1 / 0.0.0.0), auth mode selector, Tailscale mode selector.

### Task 15: Agents Tab

Add workspace path input (with folder browser via `tauri-plugin-dialog`), primary model dropdown (populated from the Providers config), heartbeat interval + target.

### Task 16: MCP Panel

Right-top button opens a sheet/dialog. MCP servers are stored in the `mcp_servers` SQLite table (global). CRUD: name + JSON config textarea. Refer to CC Switch's MCP panel for the OpenClaw MCP format.

### Task 17: Skills Panel

Right-top button opens a sheet. Skills stored in `skills` table. Support: install from local path (copy or symlink into `~/.openclaw/skills/`), uninstall (remove symlink/dir), list installed.

### Task 18: Profile Import / Export

Export: serialize profile + config to JSON file via `tauri-plugin-dialog` save dialog.
Import: open JSON file, parse, create new profile from it.

---

## Running All Tests

```bash
# Rust tests
cd src-tauri && cargo test

# Frontend tests
pnpm test:unit

# Full build check
pnpm tauri build --debug
```
