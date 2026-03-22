use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;
use uuid::Uuid;

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
    #[error("Cannot delete the active profile")]
    ActiveProfile,
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

fn sanitize_config(config: Value) -> Value {
    let mut config = config;
    sanitize_discord_accounts(&mut config);
    sanitize_provider_configs(&mut config);
    sanitize_gateway_config(&mut config);
    config
}

fn sanitize_discord_accounts(config: &mut Value) {
    let Some(accounts) = config
        .pointer_mut("/channels/discord/accounts")
        .and_then(|value| value.as_object_mut())
    else {
        return;
    };

    for account in accounts.values_mut() {
        let Some(account_obj) = account.as_object_mut() else {
            continue;
        };

        if !account_obj.contains_key("token") {
            if let Some(bot_token) = account_obj.get("botToken").cloned() {
                account_obj.insert("token".to_string(), bot_token);
            }
        }

        account_obj.remove("botName");
        account_obj.remove("botToken");
    }
}

fn sanitize_provider_configs(config: &mut Value) {
    let Some(providers) = config
        .pointer_mut("/models/providers")
        .and_then(|value| value.as_object_mut())
    else {
        return;
    };

    for (provider_name, provider) in providers.iter_mut() {
        let Some(provider_obj) = provider.as_object_mut() else {
            continue;
        };

        let api = provider_obj
            .get("api")
            .and_then(|value| value.as_str())
            .unwrap_or("openai-responses");

        let base_url = provider_obj.get("baseUrl").and_then(|value| value.as_str());
        let base_url_missing = base_url.map(|value| value.trim().is_empty()).unwrap_or(true);

        if api_supports_implicit_base_url(api) {
            if base_url_missing {
                provider_obj.remove("baseUrl");
            }
            continue;
        }

        if base_url_missing {
            if let Some(default_base_url) = default_provider_base_url(provider_name, api) {
                provider_obj.insert(
                    "baseUrl".to_string(),
                    Value::String(default_base_url.to_string()),
                );
            } else {
                provider_obj.remove("baseUrl");
            }
        }
    }
}

fn api_supports_implicit_base_url(api: &str) -> bool {
    matches!(
        api,
        "anthropic-messages"
            | "google-generative-ai"
            | "bedrock-converse-stream"
            | "github-copilot"
    )
}

fn default_provider_base_url(provider_name: &str, api: &str) -> Option<&'static str> {
    match provider_name {
        "openai" => Some("https://api.openai.com/v1"),
        "deepseek" => Some("https://api.deepseek.com/v1"),
        "moonshot" => Some("https://api.moonshot.ai/v1"),
        "zai" => Some("https://open.bigmodel.cn/api/paas/v4"),
        "shisha" => Some("https://api.shishaapi.com/v1"),
        "openrouter" => Some("https://openrouter.ai/api/v1"),
        "ollama" => Some("http://localhost:11434/v1"),
        "xai" => Some("https://api.x.ai/v1"),
        "mistral" => Some("https://api.mistral.ai/v1"),
        _ => match api {
            "openai-completions" | "openai-responses" | "openai-codex-responses" => {
                Some("https://api.openai.com/v1")
            }
            _ => None,
        },
    }
}

fn sanitize_gateway_config(config: &mut Value) {
    if config.pointer("/gateway").is_none() {
        config["gateway"] = serde_json::json!({});
    }

    let gateway = &mut config["gateway"];

    let mode_missing = gateway
        .get("mode")
        .and_then(|value| value.as_str())
        .map(|value| value.trim().is_empty())
        .unwrap_or(true);
    if mode_missing {
        gateway["mode"] = serde_json::json!("local");
    }

    if gateway.get("auth").is_none() || gateway["auth"].is_null() {
        gateway["auth"] = serde_json::json!({});
    }

    let token_missing = gateway["auth"]
        .get("token")
        .and_then(|value| value.as_str())
        .map(|value| value.trim().is_empty())
        .unwrap_or(true);
    if token_missing {
        gateway["auth"]["token"] = serde_json::json!(Uuid::new_v4().to_string());
    }
}

pub fn list_profiles(conn: &Connection) -> Result<Vec<Profile>, ProfileError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, is_active, created_at, updated_at FROM profiles ORDER BY created_at"
    )?;
    let profiles = stmt
        .query_map([], |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_active: row.get::<_, i64>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(profiles)
}

pub fn create_profile(
    conn: &Connection,
    name: &str,
    description: Option<&str>,
    config: Value,
) -> Result<Profile, ProfileError> {
    let config = sanitize_config(config);
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let config_json = serde_json::to_string(&config)?;

    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO profiles (id, name, description, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 0, ?4, ?5)",
        params![id, name, description, now, now],
    )?;
    tx.execute(
        "INSERT INTO profile_configs (profile_id, config_json) VALUES (?1, ?2)",
        params![id, config_json],
    )?;
    tx.commit()?;

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
    let config = sanitize_config(config);
    let config_json = serde_json::to_string(&config)?;
    let now = Utc::now().to_rfc3339();

    let tx = conn.unchecked_transaction()?;
    let changed = tx.execute(
        "UPDATE profile_configs SET config_json = ?1 WHERE profile_id = ?2",
        params![config_json, id],
    )?;
    if changed == 0 {
        return Err(ProfileError::NotFound(id.to_string()));
    }
    tx.execute(
        "UPDATE profiles SET updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    tx.commit()?;
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
    let is_active: i64 = conn
        .query_row(
            "SELECT is_active FROM profiles WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ProfileError::NotFound(id.to_string()),
            other => ProfileError::Db(other),
        })?;
    if is_active != 0 {
        return Err(ProfileError::ActiveProfile);
    }
    conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
    Ok(())
}

/// Build the normalized models.json content from openclaw config.
/// Mirrors models.providers, filling in defaults for missing model fields.
fn build_models_json(config: &Value) -> Option<Value> {
    let providers = config.pointer("/models/providers")?.as_object()?;
    let mut normalized_providers = serde_json::Map::new();

    for (provider_name, provider_config) in providers {
        let mut norm = serde_json::Map::new();

        for field in &["baseUrl", "apiKey", "api"] {
            if let Some(v) = provider_config.get(*field) {
                norm.insert(field.to_string(), v.clone());
            }
        }

        let provider_api = provider_config
            .get("api")
            .and_then(|v| v.as_str())
            .unwrap_or("openai-responses")
            .to_string();

        let models = provider_config
            .get("models")
            .and_then(|m| m.as_array())
            .cloned()
            .unwrap_or_default();

        let normalized_models: Vec<Value> = models
            .into_iter()
            .map(|mut model| {
                if model.get("reasoning").is_none() {
                    model["reasoning"] = serde_json::json!(false);
                }
                if model.get("input").is_none() {
                    model["input"] = serde_json::json!(["text"]);
                }
                if model.get("cost").is_none() {
                    model["cost"] = serde_json::json!({
                        "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0
                    });
                }
                if model.get("api").is_none() {
                    model["api"] = serde_json::json!(provider_api);
                }
                model
            })
            .collect();

        norm.insert("models".to_string(), Value::Array(normalized_models));
        normalized_providers.insert(provider_name.clone(), Value::Object(norm));
    }

    Some(serde_json::json!({ "providers": Value::Object(normalized_providers) }))
}

/// Sync agent models.json cache files to match current models.providers config.
/// Covers agents with explicit agentDir and those using the default path layout.
fn sync_agent_models_cache(config: &Value, live_path: &std::path::Path) {
    let models_json = match build_models_json(config) {
        Some(v) => v,
        None => return,
    };
    let content = match serde_json::to_string_pretty(&models_json) {
        Ok(s) => s,
        Err(_) => return,
    };
    let openclaw_dir = match live_path.parent() {
        Some(d) => d.to_path_buf(),
        None => return,
    };

    let agents = config
        .pointer("/agents/list")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for agent in &agents {
        let agent_dir = if let Some(dir) = agent.get("agentDir").and_then(|v| v.as_str()) {
            std::path::PathBuf::from(dir)
        } else if let Some(id) = agent.get("id").and_then(|v| v.as_str()) {
            openclaw_dir.join("agents").join(id).join("agent")
        } else {
            continue;
        };

        let cache_path = agent_dir.join("models.json");
        if cache_path.exists() {
            let _ = std::fs::write(&cache_path, &content);
        }
    }
}

/// Sync auth-profiles.json for each agent with direct API keys from models.providers.
/// This bypasses the keyRef/env-var mechanism so credentials are always resolved,
/// regardless of whether the env var is set in the gateway's process environment.
fn sync_agent_auth_profiles(config: &Value, live_path: &std::path::Path) {
    // Collect provider → apiKey pairs
    let providers = match config
        .pointer("/models/providers")
        .and_then(|v| v.as_object())
    {
        Some(p) => p.clone(),
        None => return,
    };
    let mut provider_keys: Vec<(String, String)> = Vec::new();
    for (provider_name, provider_cfg) in &providers {
        if let Some(key) = provider_cfg.get("apiKey").and_then(|v| v.as_str()) {
            if !key.is_empty() {
                provider_keys.push((provider_name.clone(), key.to_string()));
            }
        }
    }
    if provider_keys.is_empty() {
        return;
    }

    let openclaw_dir = match live_path.parent() {
        Some(d) => d.to_path_buf(),
        None => return,
    };

    let agents = config
        .pointer("/agents/list")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for agent in &agents {
        let agent_dir = if let Some(dir) = agent.get("agentDir").and_then(|v| v.as_str()) {
            std::path::PathBuf::from(dir)
        } else if let Some(id) = agent.get("id").and_then(|v| v.as_str()) {
            openclaw_dir.join("agents").join(id).join("agent")
        } else {
            continue;
        };

        let auth_path = agent_dir.join("auth-profiles.json");
        if !auth_path.exists() {
            continue;
        }

        // Read existing store
        let mut store: serde_json::Map<String, Value> = std::fs::read_to_string(&auth_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .and_then(|v: Value| v.as_object().cloned())
            .unwrap_or_default();

        let profiles = store
            .entry("profiles")
            .or_insert_with(|| serde_json::json!({}))
            .as_object_mut()
            .cloned()
            .unwrap_or_default();
        let mut profiles = profiles;

        for (provider_name, api_key) in &provider_keys {
            let profile_id = format!("{}:default", provider_name);
            let existing = profiles
                .get(&profile_id)
                .cloned()
                .unwrap_or(serde_json::json!({}));
            let mut entry = existing.as_object().cloned().unwrap_or_default();

            entry.insert("type".to_string(), serde_json::json!("api_key"));
            entry.insert("provider".to_string(), serde_json::json!(provider_name));
            entry.insert("key".to_string(), serde_json::json!(api_key));
            entry.remove("keyRef"); // remove indirect reference — direct key takes precedence

            profiles.insert(profile_id, Value::Object(entry));
        }

        store.insert("profiles".to_string(), Value::Object(profiles));
        let _ = std::fs::write(
            &auth_path,
            serde_json::to_string_pretty(&Value::Object(store)).unwrap_or_default(),
        );
    }
}

/// Inject provider API credentials into env.vars so OpenClaw's keyRef mechanism can resolve them.
/// For `openai`: writes OPENAI_API_KEY and (if present) OPENAI_API_BASE.
fn inject_provider_env_vars(config: &mut Value) {
    let providers = match config
        .pointer("/models/providers")
        .and_then(|v| v.as_object())
    {
        Some(p) => p.clone(),
        None => return,
    };

    // Collect injections: (env_var_name, value)
    let mut injections: Vec<(String, String)> = Vec::new();

    for (provider_name, provider_cfg) in &providers {
        let api_key = provider_cfg.get("apiKey").and_then(|v| v.as_str());
        let base_url = provider_cfg.get("baseUrl").and_then(|v| v.as_str());

        // Map provider name → standard env var names
        let (key_var, base_var) = match provider_name.as_str() {
            "openai" => ("OPENAI_API_KEY", Some("OPENAI_API_BASE")),
            "anthropic" => ("ANTHROPIC_API_KEY", None),
            _ => continue,
        };

        if let Some(key) = api_key {
            if !key.is_empty() {
                injections.push((key_var.to_string(), key.to_string()));
            }
        }
        if let (Some(url), Some(base_var_name)) = (base_url, base_var) {
            if !url.is_empty() {
                injections.push((base_var_name.to_string(), url.to_string()));
            }
        }
    }

    if injections.is_empty() {
        return;
    }

    // Ensure env.vars path exists
    if config.pointer("/env").is_none() {
        config["env"] = serde_json::json!({});
    }
    if config.pointer("/env/vars").is_none() {
        config["env"]["vars"] = serde_json::json!({});
    }

    for (var_name, value) in injections {
        config["env"]["vars"][var_name] = serde_json::json!(value);
    }
}

/// Activate a profile: write live config file, sync agent caches, set is_active=1
pub fn activate_profile(
    conn: &Connection,
    id: &str,
    live_path: &std::path::Path,
) -> Result<(), ProfileError> {
    let config_json: String = conn
        .query_row(
            "SELECT config_json FROM profile_configs WHERE profile_id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ProfileError::NotFound(id.to_string()),
            other => ProfileError::Db(other),
        })?;

    let mut config = sanitize_config(serde_json::from_str(&config_json)?);

    // Inject provider credentials into env.vars so OpenClaw's keyRef mechanism resolves them
    inject_provider_env_vars(&mut config);

    // Write file first (best-effort; DB is the source of truth for active state)
    super::config_parser::write_config(live_path, &config)?;

    // Sync agent auth-profiles.json with direct keys (bypasses keyRef/env-var indirection)
    sync_agent_auth_profiles(&config, live_path);

    // Sync agent models.json caches to match new providers config
    sync_agent_models_cache(&config, live_path);

    // Atomically update all active flags in a single statement
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "UPDATE profiles SET is_active = CASE WHEN id = ?1 THEN 1 ELSE 0 END",
        params![id],
    )?;
    tx.commit()?;

    Ok(())
}

pub fn get_profile_config(conn: &Connection, id: &str) -> Result<Value, ProfileError> {
    let config_json: String = conn
        .query_row(
            "SELECT config_json FROM profile_configs WHERE profile_id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ProfileError::NotFound(id.to_string()),
            other => ProfileError::Db(other),
        })?;
    Ok(sanitize_config(serde_json::from_str(&config_json)?))
}

// ─── MCP Servers ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub config: Value,
}

pub fn list_mcp_servers(conn: &Connection) -> Result<Vec<McpServer>, ProfileError> {
    let mut stmt = conn.prepare("SELECT id, name, config FROM mcp_servers ORDER BY name")?;
    let servers = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    servers
        .into_iter()
        .map(|(id, name, cfg)| {
            Ok(McpServer {
                id,
                name,
                config: serde_json::from_str(&cfg)?,
            })
        })
        .collect()
}

pub fn upsert_mcp_server(
    conn: &Connection,
    id: &str,
    name: &str,
    config: Value,
) -> Result<McpServer, ProfileError> {
    let config_json = serde_json::to_string(&config)?;
    conn.execute(
        "INSERT INTO mcp_servers (id, name, config) VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, config = excluded.config",
        params![id, name, config_json],
    )?;
    Ok(McpServer {
        id: id.to_string(),
        name: name.to_string(),
        config,
    })
}

pub fn delete_mcp_server(conn: &Connection, id: &str) -> Result<(), ProfileError> {
    let changed = conn.execute("DELETE FROM mcp_servers WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(ProfileError::NotFound(id.to_string()));
    }
    Ok(())
}

// ─── Skills ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub source_url: Option<String>,
    pub install_path: Option<String>,
    pub installed_at: Option<String>,
}

pub fn list_skills(conn: &Connection) -> Result<Vec<Skill>, ProfileError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, source_url, install_path, installed_at FROM skills ORDER BY name",
    )?;
    let skills = stmt
        .query_map([], |row| {
            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                source_url: row.get(2)?,
                install_path: row.get(3)?,
                installed_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(skills)
}

pub fn upsert_skill(
    conn: &Connection,
    id: &str,
    name: &str,
    source_url: Option<&str>,
    install_path: Option<&str>,
) -> Result<Skill, ProfileError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO skills (id, name, source_url, install_path, installed_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, source_url = excluded.source_url, install_path = excluded.install_path",
        params![id, name, source_url, install_path, now],
    )?;
    Ok(Skill {
        id: id.to_string(),
        name: name.to_string(),
        source_url: source_url.map(str::to_string),
        install_path: install_path.map(str::to_string),
        installed_at: Some(now),
    })
}

pub fn delete_skill(conn: &Connection, id: &str) -> Result<(), ProfileError> {
    let changed = conn.execute("DELETE FROM skills WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(ProfileError::NotFound(id.to_string()));
    }
    Ok(())
}

// ─── Clone ───────────────────────────────────────────────────────────────────

pub fn clone_profile(conn: &Connection, id: &str) -> Result<Profile, ProfileError> {
    let (name, config_json): (String, String) = conn
        .query_row(
            "SELECT p.name, pc.config_json FROM profiles p
         JOIN profile_configs pc ON pc.profile_id = p.id
         WHERE p.id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => ProfileError::NotFound(id.to_string()),
            other => ProfileError::Db(other),
        })?;

    let new_name = format!("{} (副本)", name);
    let config: Value = serde_json::from_str(&config_json)?;
    create_profile(conn, &new_name, None, config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
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

    #[test]
    fn test_create_profile_adds_default_local_gateway_and_token() {
        let db = setup_db();
        let profile = create_profile(&db.conn, "default", None, serde_json::json!({})).unwrap();
        let stored = get_profile_config(&db.conn, &profile.id).unwrap();

        assert_eq!(
            stored.pointer("/gateway/mode"),
            Some(&serde_json::json!("local"))
        );
        assert!(
            stored
                .pointer("/gateway/auth/token")
                .and_then(|value| value.as_str())
                .is_some_and(|value| !value.is_empty()),
            "default gateway auth token should be generated"
        );
    }

    #[test]
    fn test_activate_preserves_existing_gateway_mode_and_token() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({
            "gateway": {
                "mode": "remote",
                "auth": { "token": "existing-token" },
                "remote": { "token": "remote-token" }
            }
        });
        let profile = create_profile(&db.conn, "default", None, config).unwrap();
        activate_profile(&db.conn, &profile.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        assert_eq!(
            written_config.pointer("/gateway/mode"),
            Some(&serde_json::json!("remote"))
        );
        assert_eq!(
            written_config.pointer("/gateway/auth/token"),
            Some(&serde_json::json!("existing-token"))
        );
        assert_eq!(
            written_config.pointer("/gateway/remote/token"),
            Some(&serde_json::json!("remote-token"))
        );
    }

    #[test]
    fn test_activate_injects_openai_api_key_into_env_vars() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({
            "models": {
                "providers": {
                    "openai": {
                        "apiKey": "sk-test-key-123",
                        "baseUrl": "https://api.example.com/v1"
                    }
                }
            }
        });
        let p = create_profile(&db.conn, "work", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        assert_eq!(
            written_config.pointer("/env/vars/OPENAI_API_KEY"),
            Some(&serde_json::json!("sk-test-key-123")),
            "OPENAI_API_KEY should be injected into env.vars"
        );
        assert_eq!(
            written_config.pointer("/env/vars/OPENAI_API_BASE"),
            Some(&serde_json::json!("https://api.example.com/v1")),
            "OPENAI_API_BASE should be injected into env.vars"
        );
    }

    #[test]
    fn test_activate_injects_openai_key_without_base_url() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({
            "models": {
                "providers": {
                    "openai": { "apiKey": "sk-only-key" }
                }
            }
        });
        let p = create_profile(&db.conn, "work", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        assert_eq!(
            written_config.pointer("/env/vars/OPENAI_API_KEY"),
            Some(&serde_json::json!("sk-only-key")),
        );
        // 没有 baseUrl 时不应写入 OPENAI_API_BASE
        assert_eq!(written_config.pointer("/env/vars/OPENAI_API_BASE"), None);
    }

    #[test]
    fn test_activate_normalizes_missing_openai_like_provider_base_url() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({
            "models": {
                "providers": {
                    "provider_1774147628813": {
                        "api": "openai-completions",
                        "apiKey": "sk-test",
                        "models": [{ "id": "gpt-4o" }]
                    }
                }
            }
        });
        let p = create_profile(&db.conn, "work", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        assert_eq!(
            written_config.pointer("/models/providers/provider_1774147628813/baseUrl"),
            Some(&serde_json::json!("https://api.openai.com/v1")),
        );
    }

    #[test]
    fn test_activate_removes_empty_google_base_url() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({
            "models": {
                "providers": {
                    "google": {
                        "api": "google-generative-ai",
                        "apiKey": "google-key",
                        "baseUrl": "",
                        "models": [{ "id": "gemini-2.5-pro" }]
                    }
                }
            }
        });
        let profile = create_profile(&db.conn, "google", None, config).unwrap();
        activate_profile(&db.conn, &profile.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        assert_eq!(
            written_config.pointer("/models/providers/google/baseUrl"),
            None
        );
    }

    #[test]
    fn test_activate_preserves_existing_env_vars() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({
            "models": {
                "providers": {
                    "openai": { "apiKey": "sk-new-key" }
                }
            },
            "env": {
                "vars": {
                    "HTTP_PROXY": "http://127.0.0.1:7897",
                    "OPENAI_API_KEY": "sk-old-key"
                }
            }
        });
        let p = create_profile(&db.conn, "work", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        // 已有 env var 应保留
        assert_eq!(
            written_config.pointer("/env/vars/HTTP_PROXY"),
            Some(&serde_json::json!("http://127.0.0.1:7897")),
        );
        // 旧的 OPENAI_API_KEY 应被新值覆盖
        assert_eq!(
            written_config.pointer("/env/vars/OPENAI_API_KEY"),
            Some(&serde_json::json!("sk-new-key")),
        );
    }

    #[test]
    fn test_activate_no_provider_no_env_injection() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let config = serde_json::json!({"models": {"providers": {}}});
        let p = create_profile(&db.conn, "work", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let written = std::fs::read_to_string(&live).unwrap();
        let written_config: serde_json::Value = serde_json::from_str(&written).unwrap();
        // 无 provider 时不创建 env.vars
        assert_eq!(written_config.pointer("/env/vars/OPENAI_API_KEY"), None);
    }

    #[test]
    fn test_sync_auth_profiles_writes_direct_key() {
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");

        // 建立 agent 目录和已存在的 auth-profiles.json（含 keyRef）
        let agent_dir = dir.path().join("agents").join("social").join("agent");
        std::fs::create_dir_all(&agent_dir).unwrap();
        let auth_path = agent_dir.join("auth-profiles.json");
        std::fs::write(
            &auth_path,
            serde_json::json!({
                "version": 1,
                "profiles": {
                    "openai:default": {
                        "type": "api_key",
                        "provider": "openai",
                        "keyRef": { "source": "env", "provider": "default", "id": "OPENAI_API_KEY" }
                    }
                },
                "lastGood": { "openai": "openai:default" },
                "usageStats": { "openai:default": { "errorCount": 0 } }
            })
            .to_string(),
        )
        .unwrap();

        let config = serde_json::json!({
            "models": {
                "providers": {
                    "openai": {
                        "apiKey": "sk-direct-key-xyz",
                        "baseUrl": "https://api.ezai88.com/v1"
                    }
                }
            },
            "agents": {
                "list": [{ "id": "social", "agentDir": agent_dir.to_str().unwrap() }]
            }
        });

        let db = setup_db();
        let p = create_profile(&db.conn, "test", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let auth_written: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&auth_path).unwrap()).unwrap();

        // 直接写入 key，不再有 keyRef
        assert_eq!(
            auth_written.pointer("/profiles/openai:default/key"),
            Some(&serde_json::json!("sk-direct-key-xyz")),
            "direct key should be written to auth-profiles.json"
        );
        assert_eq!(
            auth_written.pointer("/profiles/openai:default/keyRef"),
            None,
            "keyRef should be removed when direct key is written"
        );
        // lastGood 和 usageStats 保留
        assert_eq!(
            auth_written.pointer("/lastGood/openai"),
            Some(&serde_json::json!("openai:default"))
        );
    }

    #[test]
    fn test_sync_auth_profiles_preserves_other_providers() {
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");

        let agent_dir = dir.path().join("agents").join("main").join("agent");
        std::fs::create_dir_all(&agent_dir).unwrap();
        let auth_path = agent_dir.join("auth-profiles.json");
        std::fs::write(
            &auth_path,
            serde_json::json!({
                "version": 1,
                "profiles": {
                    "zai:default": { "type": "api_key", "provider": "zai", "key": "zai-old-key" },
                    "openai:default": { "type": "api_key", "provider": "openai", "key": "sk-old" }
                }
            })
            .to_string(),
        )
        .unwrap();

        let config = serde_json::json!({
            "models": {
                "providers": {
                    "openai": { "apiKey": "sk-new-key" }
                }
            },
            "agents": {
                "list": [{ "id": "main", "agentDir": agent_dir.to_str().unwrap() }]
            }
        });

        let db = setup_db();
        let p = create_profile(&db.conn, "test", None, config).unwrap();
        activate_profile(&db.conn, &p.id, &live).unwrap();

        let auth_written: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&auth_path).unwrap()).unwrap();

        // openai key 已更新
        assert_eq!(
            auth_written.pointer("/profiles/openai:default/key"),
            Some(&serde_json::json!("sk-new-key"))
        );
        // zai 条目保留不动
        assert_eq!(
            auth_written.pointer("/profiles/zai:default/key"),
            Some(&serde_json::json!("zai-old-key"))
        );
    }

    #[test]
    fn test_sync_auth_profiles_skips_missing_file() {
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");

        // agent 目录不存在（未初始化的 agent）
        let agent_dir = dir.path().join("agents").join("ghost").join("agent");

        let config = serde_json::json!({
            "models": { "providers": { "openai": { "apiKey": "sk-key" } } },
            "agents": {
                "list": [{ "id": "ghost", "agentDir": agent_dir.to_str().unwrap() }]
            }
        });

        let db = setup_db();
        let p = create_profile(&db.conn, "test", None, config).unwrap();
        // 不应 panic 或报错
        activate_profile(&db.conn, &p.id, &live).unwrap();
        assert!(!agent_dir.join("auth-profiles.json").exists());
    }

    #[test]
    fn test_update_profile_config_migrates_legacy_discord_fields() {
        let db = setup_db();
        let profile = create_profile(&db.conn, "discord", None, serde_json::json!({})).unwrap();

        update_profile_config(
            &db.conn,
            &profile.id,
            serde_json::json!({
                "channels": {
                    "discord": {
                        "accounts": {
                            "main": {
                                "botName": "My Bot",
                                "botToken": "discord-token",
                                "enabled": true
                            }
                        }
                    }
                }
            }),
        )
        .unwrap();

        let stored = get_profile_config(&db.conn, &profile.id).unwrap();
        assert_eq!(
            stored.pointer("/channels/discord/accounts/main/token"),
            Some(&serde_json::json!("discord-token"))
        );
        assert_eq!(
            stored.pointer("/channels/discord/accounts/main/enabled"),
            Some(&serde_json::json!(true))
        );
        assert_eq!(
            stored.pointer("/channels/discord/accounts/main/botName"),
            None
        );
        assert_eq!(
            stored.pointer("/channels/discord/accounts/main/botToken"),
            None
        );
    }

    #[test]
    fn test_activate_profile_sanitizes_legacy_discord_fields_from_existing_db_rows() {
        let db = setup_db();
        let dir = TempDir::new().unwrap();
        let live = dir.path().join("openclaw.json");
        let profile = create_profile(&db.conn, "discord", None, serde_json::json!({})).unwrap();

        db.conn
            .execute(
                "UPDATE profile_configs SET config_json = ?1 WHERE profile_id = ?2",
                params![
                    serde_json::json!({
                        "channels": {
                            "discord": {
                                "accounts": {
                                    "legacy": {
                                        "botName": "Legacy Bot",
                                        "botToken": "legacy-token"
                                    }
                                }
                            }
                        }
                    })
                    .to_string(),
                    profile.id
                ],
            )
            .unwrap();

        activate_profile(&db.conn, &profile.id, &live).unwrap();

        let written: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&live).unwrap()).unwrap();

        assert_eq!(
            written.pointer("/channels/discord/accounts/legacy/token"),
            Some(&serde_json::json!("legacy-token"))
        );
        assert_eq!(
            written.pointer("/channels/discord/accounts/legacy/botName"),
            None
        );
        assert_eq!(
            written.pointer("/channels/discord/accounts/legacy/botToken"),
            None
        );
    }
}
