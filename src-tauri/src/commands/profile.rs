use crate::{AppState, logger, services::profile};
use serde_json::Value;
use tauri::State;

#[derive(Debug, serde::Serialize)]
pub struct CommandError(String);

/// Locate the `openclaw` binary by searching well-known install paths.
///
/// GUI apps get a stripped PATH that misses /usr/local/bin, Homebrew, npm globals, etc.
/// We search common locations directly so we never depend on the process PATH.
fn find_openclaw() -> Option<std::path::PathBuf> {
    let home = dirs::home_dir();

    #[cfg(target_os = "windows")]
    let candidates: Vec<std::path::PathBuf> = {
        let mut v = vec![
            std::path::PathBuf::from(r"C:\Program Files\openclaw\openclaw.exe"),
        ];
        if let Some(h) = &home {
            v.push(h.join(r"AppData\Roaming\npm\openclaw.cmd"));
            v.push(h.join(r"AppData\Roaming\npm\openclaw.exe"));
        }
        if let Ok(appdata) = std::env::var("APPDATA") {
            v.push(std::path::PathBuf::from(&appdata).join(r"npm\openclaw.cmd"));
        }
        v
    };

    #[cfg(not(target_os = "windows"))]
    let candidates: Vec<std::path::PathBuf> = {
        let mut v = vec![
            std::path::PathBuf::from("/usr/local/bin/openclaw"),
            std::path::PathBuf::from("/opt/homebrew/bin/openclaw"),
            std::path::PathBuf::from("/usr/bin/openclaw"),
            std::path::PathBuf::from("/usr/local/lib/node_modules/.bin/openclaw"),
        ];
        if let Some(h) = &home {
            v.push(h.join(".local/bin/openclaw"));
            v.push(h.join(".npm-global/bin/openclaw"));
            v.push(h.join(".yarn/bin/openclaw"));
            // nvm default
            v.push(h.join(".nvm/versions/node").join("*").join("bin/openclaw"));
            // n (node version manager)
            v.push(h.join("n/bin/openclaw"));
        }
        v
    };

    candidates.into_iter().find(|p| {
        // Skip glob-style paths (nvm wildcard), only test concrete paths
        !p.to_string_lossy().contains('*') && p.exists()
    })
}

/// Run `openclaw gateway restart` in a way that works from GUI apps.
///
/// 1. Search well-known install paths for the binary and invoke it directly.
/// 2. Fall back to a login shell in case the binary is in an unusual location.
fn run_openclaw_gateway_restart() -> std::io::Result<std::process::Output> {
    if let Some(bin) = find_openclaw() {
        return std::process::Command::new(bin)
            .args(["gateway", "restart"])
            .output();
    }

    // Fallback: login shell — picks up PATH from .zprofile / .bash_profile
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "openclaw gateway restart"])
            .output()
    }
    #[cfg(not(target_os = "windows"))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        // Use both -l (login) and -i (interactive) so .zshrc is also sourced
        std::process::Command::new(&shell)
            .args(["-l", "-i", "-c", "openclaw gateway restart"])
            .output()
    }
}

impl From<profile::ProfileError> for CommandError {
    fn from(e: profile::ProfileError) -> Self {
        CommandError(e.to_string())
    }
}

#[tauri::command]
pub fn list_profiles(state: State<'_, AppState>) -> Result<Vec<profile::Profile>, CommandError> {
    let db = state.db.lock().unwrap();
    profile::list_profiles(&db.conn).map_err(Into::into)
}

#[tauri::command]
pub fn create_profile(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    config: Value,
) -> Result<profile::Profile, CommandError> {
    let db = state.db.lock().unwrap();
    profile::create_profile(&db.conn, &name, description.as_deref(), config).map_err(Into::into)
}

#[tauri::command]
pub fn update_profile_config(
    state: State<'_, AppState>,
    id: String,
    config: Value,
) -> Result<(), CommandError> {
    logger::log_info(&state.log_path, &format!("update_profile_config: id={}", id));
    let db = state.db.lock().unwrap();
    let result = profile::update_profile_config(&db.conn, &id, config).map_err(CommandError::from);
    if let Err(ref e) = result {
        logger::log_error(&state.log_path, &format!("update_profile_config failed: id={} err={}", id, e.0));
    } else {
        logger::log_info(&state.log_path, &format!("update_profile_config succeeded: id={}", id));
    }
    result
}

/// Save config + write live file (with backup) + restart gateway.
/// If gateway restart fails, the backup is automatically restored.
#[tauri::command]
pub fn save_and_restart(
    state: State<'_, AppState>,
    id: String,
    config: Value,
) -> Result<String, CommandError> {
    let live_path = state.live_config_path.clone();
    let log_path = state.log_path.clone();

    logger::log_info(&log_path, &format!("save_and_restart: START id={}", id));

    // Phase 1: persist to DB (short lock, released before file I/O)
    let is_active: bool = {
        let db = state.db.lock().unwrap();
        logger::log_info(&log_path, "save_and_restart: Phase1 - updating DB");
        let result = profile::update_profile_config(&db.conn, &id, config).map_err(CommandError::from);
        if let Err(ref e) = result {
            logger::log_error(&log_path, &format!("save_and_restart: Phase1 DB update failed: {}", e.0));
            return result.map(|_| String::new());
        }
        let active = db.conn
            .query_row(
                "SELECT is_active FROM profiles WHERE id = ?1",
                rusqlite::params![&id],
                |row| row.get(0),
            )
            .unwrap_or(false);
        logger::log_info(&log_path, &format!("save_and_restart: Phase1 done, is_active={}", active));
        active
    };

    if !is_active {
        // Inactive profile: DB is updated, no file write needed
        logger::log_info(&log_path, "save_and_restart: profile not active, skipping file write and restart");
        return Ok(String::new());
    }

    // Phase 2: backup existing live config file
    logger::log_info(&log_path, &format!("save_and_restart: Phase2 - backing up live config at {:?}", live_path));
    let backup: Option<String> = if live_path.exists() {
        match std::fs::read_to_string(&live_path) {
            Ok(content) => {
                logger::log_info(&log_path, "save_and_restart: Phase2 backup read successfully");
                Some(content)
            }
            Err(e) => {
                let msg = format!("备份配置文件失败: {}", e);
                logger::log_error(&log_path, &format!("save_and_restart: Phase2 backup failed: {}", e));
                return Err(CommandError(msg));
            }
        }
    } else {
        logger::log_info(&log_path, "save_and_restart: Phase2 no existing live config to backup");
        None
    };

    // Phase 3: write new config to live file
    logger::log_info(&log_path, "save_and_restart: Phase3 - writing new config to live file");
    {
        let db = state.db.lock().unwrap();
        let result = profile::activate_profile(&db.conn, &id, &live_path).map_err(CommandError::from);
        if let Err(ref e) = result {
            logger::log_error(&log_path, &format!("save_and_restart: Phase3 write live config failed: {}", e.0));
            return result.map(|_| String::new());
        }
    }
    logger::log_info(&log_path, "save_and_restart: Phase3 done");

    // Phase 4: restart gateway; restore backup on failure
    logger::log_info(&log_path, "save_and_restart: Phase4 - running `openclaw gateway restart`");
    let output = run_openclaw_gateway_restart()
        .map_err(|e| {
            if let Some(ref content) = backup {
                let _ = std::fs::write(&live_path, content);
                logger::log_info(&log_path, "save_and_restart: backup restored after exec error");
            }
            let msg = format!("无法执行 openclaw: {}", e);
            logger::log_error(&log_path, &format!("save_and_restart: Phase4 exec error: {}", e));
            CommandError(msg)
        })?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        logger::log_info(&log_path, &format!("save_and_restart: Phase4 gateway restart succeeded. stdout={}", stdout.trim()));
        Ok(stdout)
    } else {
        if let Some(ref content) = backup {
            let _ = std::fs::write(&live_path, content);
            logger::log_info(&log_path, "save_and_restart: backup restored after gateway restart failure");
        }
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if !stderr.is_empty() { stderr } else { stdout };
        let err_msg = format!("Gateway 重启失败，已恢复备份: {}", msg.trim());
        logger::log_error(&log_path, &format!("save_and_restart: Phase4 gateway restart failed: {}", msg.trim()));
        Err(CommandError(err_msg))
    }
}

#[tauri::command]
pub fn rename_profile(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::rename_profile(&db.conn, &id, &name).map_err(Into::into)
}

#[tauri::command]
pub fn delete_profile(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::delete_profile(&db.conn, &id).map_err(Into::into)
}

#[tauri::command]
pub fn activate_profile(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    logger::log_info(&state.log_path, &format!("activate_profile: id={}", id));
    let db = state.db.lock().unwrap();
    let result = profile::activate_profile(&db.conn, &id, &state.live_config_path).map_err(Into::into);
    if let Err(ref e) = result {
        logger::log_error(&state.log_path, &format!("activate_profile failed: id={} err={:?}", id, e));
    }
    result
}

#[tauri::command]
pub fn get_profile_config(state: State<'_, AppState>, id: String) -> Result<Value, CommandError> {
    let db = state.db.lock().unwrap();
    profile::get_profile_config(&db.conn, &id).map_err(Into::into)
}

/// Return the path to the app log file so the user can open it.
#[tauri::command]
pub fn get_log_path(state: State<'_, AppState>) -> String {
    state.log_path.to_string_lossy().into_owned()
}

#[tauri::command]
pub fn clone_profile(state: State<'_, AppState>, id: String) -> Result<profile::Profile, CommandError> {
    logger::log_info(&state.log_path, &format!("clone_profile: id={}", id));
    let db = state.db.lock().unwrap();
    profile::clone_profile(&db.conn, &id).map_err(Into::into)
}

// ─── MCP Servers ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_mcp_servers(state: State<'_, AppState>) -> Result<Vec<profile::McpServer>, CommandError> {
    let db = state.db.lock().unwrap();
    profile::list_mcp_servers(&db.conn).map_err(Into::into)
}

#[tauri::command]
pub fn upsert_mcp_server(
    state: State<'_, AppState>,
    id: String,
    name: String,
    config: serde_json::Value,
) -> Result<profile::McpServer, CommandError> {
    let db = state.db.lock().unwrap();
    profile::upsert_mcp_server(&db.conn, &id, &name, config).map_err(Into::into)
}

#[tauri::command]
pub fn delete_mcp_server(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::delete_mcp_server(&db.conn, &id).map_err(Into::into)
}

// ─── Skills ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_skills(state: State<'_, AppState>) -> Result<Vec<profile::Skill>, CommandError> {
    let db = state.db.lock().unwrap();
    profile::list_skills(&db.conn).map_err(Into::into)
}

#[tauri::command]
pub fn upsert_skill(
    state: State<'_, AppState>,
    id: String,
    name: String,
    source_url: Option<String>,
    install_path: Option<String>,
) -> Result<profile::Skill, CommandError> {
    let db = state.db.lock().unwrap();
    profile::upsert_skill(&db.conn, &id, &name, source_url.as_deref(), install_path.as_deref())
        .map_err(Into::into)
}

#[tauri::command]
pub fn delete_skill(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.lock().unwrap();
    profile::delete_skill(&db.conn, &id).map_err(Into::into)
}

// ─── File utilities ────────────────────────────────────────────────────────────

fn expand_tilde(path: &str) -> std::path::PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    } else if path == "~" {
        if let Some(home) = dirs::home_dir() {
            return home;
        }
    }
    std::path::PathBuf::from(path)
}

/// Write content to a file, creating parent directories as needed.
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), CommandError> {
    let p = expand_tilde(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| CommandError(format!("创建目录失败: {}", e)))?;
    }
    std::fs::write(&p, content)
        .map_err(|e| CommandError(format!("写入文件失败: {}", e)))
}

/// Read content of a file.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, CommandError> {
    let p = expand_tilde(&path);
    std::fs::read_to_string(&p)
        .map_err(|e| CommandError(format!("读取文件失败: {}", e)))
}
