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
    let is_active: i64 = conn.query_row(
        "SELECT is_active FROM profiles WHERE id = ?1", params![id], |r| r.get(0)
    ).map_err(|_| ProfileError::NotFound(id.to_string()))?;
    if is_active != 0 {
        return Err(ProfileError::ActiveProfile);
    }
    conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
    Ok(())
}

/// Activate a profile: write live config file, set is_active=1, clear others
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
}
