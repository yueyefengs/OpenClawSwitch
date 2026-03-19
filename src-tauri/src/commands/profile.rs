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

/// Build an augmented PATH string that includes common binary directories.
///
/// GUI apps on macOS/Linux inherit a stripped PATH. We prepend well-known
/// locations so that scripts like openclaw (which internally exec node/python)
/// can find their runtimes without relying on the process environment.
fn augmented_path() -> String {
    let extra = [
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        "/usr/local/sbin",
    ];

    // Append home-relative dirs
    let home_dirs: Vec<String> = dirs::home_dir()
        .map(|h| {
            vec![
                h.join(".local/bin").to_string_lossy().into_owned(),
                h.join(".npm-global/bin").to_string_lossy().into_owned(),
                h.join(".yarn/bin").to_string_lossy().into_owned(),
                h.join("n/bin").to_string_lossy().into_owned(),
            ]
        })
        .unwrap_or_default();

    let current = std::env::var("PATH").unwrap_or_default();

    let mut parts: Vec<&str> = extra.iter().map(|s| *s).collect();
    let home_strs: Vec<&str> = home_dirs.iter().map(|s| s.as_str()).collect();
    parts.extend(home_strs);
    if !current.is_empty() {
        parts.push(&current);
    }

    parts.join(":")
}

/// Run `openclaw gateway restart` in a way that works from GUI apps.
///
/// 1. Search well-known install paths for the openclaw binary.
/// 2. Invoke it with an augmented PATH so any runtimes it calls (node, etc.) are found.
/// 3. Fall back to a login+interactive shell if the binary isn't in a standard location.
fn run_openclaw_gateway_restart() -> std::io::Result<std::process::Output> {
    let path_env = augmented_path();

    if let Some(bin) = find_openclaw() {
        return std::process::Command::new(bin)
            .args(["gateway", "restart"])
            .env("PATH", &path_env)
            .output();
    }

    // Fallback: login+interactive shell — sources .zprofile and .zshrc
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "openclaw gateway restart"])
            .output()
    }
    #[cfg(not(target_os = "windows"))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        std::process::Command::new(&shell)
            .args(["-l", "-i", "-c", "openclaw gateway restart"])
            .env("PATH", &path_env)
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

/// Read the `name:` field from a SKILL.md file, falling back to the slug.
fn read_skill_name(skill_dir: &std::path::Path, slug: &str) -> String {
    let md = skill_dir.join("SKILL.md");
    if let Ok(content) = std::fs::read_to_string(&md) {
        for line in content.lines() {
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("name:") {
                let name = rest.trim().trim_matches('"').trim_matches('\'');
                if !name.is_empty() {
                    return name.to_string();
                }
            }
        }
    }
    slug.to_string()
}

/// Parse ~/.openclaw/skills/.clawhub/lock.json → map of slug → source_url "clawhub:<slug>"
fn clawhub_installed_slugs(skills_base: &std::path::Path) -> std::collections::HashSet<String> {
    let lock = skills_base.join(".clawhub").join("lock.json");
    let mut set = std::collections::HashSet::new();
    if let Ok(content) = std::fs::read_to_string(&lock) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = v.get("skills").and_then(|s| s.as_object()) {
                for key in obj.keys() {
                    set.insert(key.clone());
                }
            }
        }
    }
    set
}

#[tauri::command]
pub fn list_skills(state: State<'_, AppState>) -> Result<Vec<profile::Skill>, CommandError> {
    let db = state.db.lock().unwrap();
    let mut skills = profile::list_skills(&db.conn)?;

    // Also scan ~/.openclaw/skills/ for skills not recorded in DB
    if let Some(home) = dirs::home_dir() {
        let skills_base = home.join(".openclaw").join("skills");
        let clawhub_slugs = clawhub_installed_slugs(&skills_base);

        // Build set of install_paths already in DB
        let known_paths: std::collections::HashSet<String> = skills
            .iter()
            .filter_map(|s| s.install_path.clone())
            .collect();

        if let Ok(entries) = std::fs::read_dir(&skills_base) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }
                let slug = match path.file_name().and_then(|n| n.to_str()) {
                    Some(s) if !s.starts_with('.') => s.to_string(),
                    _ => continue,
                };
                let path_str = path.to_string_lossy().into_owned();
                if known_paths.contains(&path_str) {
                    continue; // already in DB
                }
                let name = read_skill_name(&path, &slug);
                let source_url = if clawhub_slugs.contains(&slug) {
                    Some(format!("clawhub:{}", slug))
                } else {
                    None
                };
                skills.push(profile::Skill {
                    id: format!("fs:{}", slug),
                    name,
                    source_url,
                    install_path: Some(path_str),
                    installed_at: None,
                });
            }
        }
        skills.sort_by(|a, b| a.name.cmp(&b.name));
    }

    Ok(skills)
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

#[derive(serde::Serialize)]
pub struct OpenclawStatus {
    pub installed: bool,
    pub path: Option<String>,
}

#[tauri::command]
pub fn check_openclaw() -> OpenclawStatus {
    match find_openclaw() {
        Some(p) => OpenclawStatus {
            installed: true,
            path: Some(p.to_string_lossy().into_owned()),
        },
        None => OpenclawStatus {
            installed: false,
            path: None,
        },
    }
}

/// Stream a command's stdout+stderr line-by-line via window events.
/// Emits `event_name` with each line as payload.
/// Sends sentinel `"\x00EXIT:0"` on success, `"\x00EXIT:1"` on failure.
fn stream_command(
    mut cmd: std::process::Command,
    window: tauri::WebviewWindow,
    event_name: &'static str,
) {
    use std::io::{BufRead, BufReader};
    use tauri::Emitter;

    cmd.stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    std::thread::spawn(move || {
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = window.emit(event_name, format!("[错误] 启动失败: {}", e));
                let _ = window.emit(event_name, "\x00EXIT:1");
                return;
            }
        };

        let stdout = child.stdout.take().map(BufReader::new);
        let stderr = child.stderr.take().map(BufReader::new);

        // Both streams consumed in independent threads to prevent pipe buffer deadlock
        let win_out = window.clone();
        let stdout_thread = stdout.map(|r| {
            std::thread::spawn(move || {
                for line in r.lines().flatten() {
                    let _ = win_out.emit(event_name, line);
                }
            })
        });

        let win_err = window.clone();
        let stderr_thread = stderr.map(|r| {
            std::thread::spawn(move || {
                for line in r.lines().flatten() {
                    let _ = win_err.emit(event_name, line);
                }
            })
        });

        if let Some(t) = stdout_thread { let _ = t.join(); }
        if let Some(t) = stderr_thread { let _ = t.join(); }

        let ok = child.wait().map(|s| s.success()).unwrap_or(false);
        let _ = window.emit(event_name, if ok { "\x00EXIT:0" } else { "\x00EXIT:1" });
    });
}

#[tauri::command]
pub fn install_openclaw(window: tauri::WebviewWindow) -> Result<(), CommandError> {
    let path_env = augmented_path();

    #[cfg(target_os = "windows")]
    let cmd = {
        let mut c = std::process::Command::new("powershell");
        c.args([
            "-NoProfile", "-NonInteractive", "-Command",
            "& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard",
        ]);
        c.env("PATH", &path_env);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let cmd = {
        let mut c = std::process::Command::new("bash");
        c.args(["-c", "curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard"]);
        c.env("PATH", &path_env);
        c
    };

    stream_command(cmd, window, "openclaw-output");
    Ok(())
}

/// Read the live openclaw.json and return its parsed content.
/// Used by the frontend to import agents (or other config) into a profile.
#[tauri::command]
pub fn read_live_config(state: State<'_, AppState>) -> Result<serde_json::Value, CommandError> {
    use crate::services::config_parser;
    let path = &state.live_config_path;
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    config_parser::read_config(path)
        .map_err(|e| CommandError(format!("读取配置失败: {}", e)))
}

/// Create an agent via `openclaw agents add <id> --workspace <path>`.
///
/// Always creates the agentDir and workspace directories on disk first.
/// If openclaw is not installed, still succeeds (directories-only creation).
/// The side-effect of openclaw modifying the live openclaw.json is intentionally
/// ignored — OpenclawSwitch manages profiles independently.
#[tauri::command]
pub fn create_agent_via_cli(
    agent_id: String,
    workspace: String,
    agent_dir: String,
) -> Result<String, CommandError> {
    let workspace_path = expand_tilde(&workspace);
    let agent_dir_path = expand_tilde(&agent_dir);

    std::fs::create_dir_all(&agent_dir_path)
        .map_err(|e| CommandError(format!("创建 agent 目录失败: {}", e)))?;
    std::fs::create_dir_all(&workspace_path)
        .map_err(|e| CommandError(format!("创建 workspace 目录失败: {}", e)))?;

    let Some(bin) = find_openclaw() else {
        return Ok("目录已创建（openclaw 未安装，跳过 CLI 初始化）".to_string());
    };

    let output = std::process::Command::new(bin)
        .args(["agents", "add", &agent_id, "--workspace", &workspace_path.to_string_lossy()])
        .env("PATH", augmented_path())
        .output()
        .map_err(|e| CommandError(format!("执行 openclaw 失败: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if !stderr.is_empty() { stderr } else { stdout };
        Err(CommandError(format!("openclaw agents add 失败: {}", msg.trim())))
    }
}

#[tauri::command]
pub fn uninstall_openclaw(window: tauri::WebviewWindow) -> Result<(), CommandError> {
    let bin = match find_openclaw() {
        Some(p) => p,
        None => return Err(CommandError("openclaw 未安装".into())),
    };

    let path_env = augmented_path();
    let mut cmd = std::process::Command::new(bin);
    cmd.args(["uninstall", "--all", "--yes"]);
    cmd.env("PATH", &path_env);

    stream_command(cmd, window, "openclaw-output");
    Ok(())
}
