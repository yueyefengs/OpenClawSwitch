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
        fs::write(&path, "{ // comment\n    \"models\": { \"providers\": {} },\n}").unwrap();
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
