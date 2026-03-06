// src-tauri/src/database/schema.rs
pub const MIGRATIONS: &str = "
PRAGMA foreign_keys = ON;

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
";
