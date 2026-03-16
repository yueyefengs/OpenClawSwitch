use crate::AppState;
use crate::services::profile::Skill;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubSkill {
    pub slug: String,
    pub display_name: String,
    pub summary: String,
    pub version: String,
    pub stars: u32,
    pub downloads: u32,
}

fn parse_skill_item(item: &serde_json::Value) -> Option<ClawhubSkill> {
    let slug = item.get("slug")?.as_str()?.to_string();
    let display_name = item
        .get("displayName")
        .and_then(|v| v.as_str())
        .unwrap_or(&slug)
        .to_string();
    let summary = item
        .get("summary")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let version = item
        .get("version")
        .and_then(|v| v.as_str())
        .or_else(|| item.pointer("/tags/latest").and_then(|v| v.as_str()))
        .unwrap_or("latest")
        .to_string();
    let stars = item
        .pointer("/stats/stars")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let downloads = item
        .pointer("/stats/downloads")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    Some(ClawhubSkill {
        slug,
        display_name,
        summary,
        version,
        stars,
        downloads,
    })
}

#[tauri::command]
pub fn search_clawhub(q: String) -> Result<Vec<ClawhubSkill>, String> {
    if q.is_empty() {
        let url = "https://clawhub.ai/api/v1/skills?limit=50";
        let body: serde_json::Value = ureq::get(url)
            .call()
            .map_err(|e| {
                eprintln!("[clawhub] list popular error: {e}");
                e.to_string()
            })?
            .into_json()
            .map_err(|e| {
                eprintln!("[clawhub] list popular json parse error: {e}");
                e.to_string()
            })?;

        // Handle both `{ skills: [...] }` and bare array
        let items = if let Some(arr) = body.as_array() {
            arr.clone()
        } else if let Some(arr) = body.get("skills").and_then(|v| v.as_array()) {
            arr.clone()
        } else {
            eprintln!("[clawhub] unexpected skills response shape");
            return Ok(vec![]);
        };

        let mut skills: Vec<ClawhubSkill> = items
            .iter()
            .filter_map(parse_skill_item)
            .collect();

        skills.sort_by(|a, b| b.stars.cmp(&a.stars));
        Ok(skills)
    } else {
        // URL-encode the query string manually (only encode special chars that matter)
        let encoded_q: String = q
            .chars()
            .flat_map(|c| match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                    vec![c]
                }
                ' ' => vec!['+'],
                c => {
                    let mut buf = [0u8; 4];
                    let encoded = c.encode_utf8(&mut buf);
                    encoded
                        .bytes()
                        .flat_map(|b| {
                            let hi = b >> 4;
                            let lo = b & 0xf;
                            let hex_char = |n: u8| {
                                if n < 10 {
                                    (b'0' + n) as char
                                } else {
                                    (b'A' + n - 10) as char
                                }
                            };
                            vec!['%', hex_char(hi), hex_char(lo)]
                        })
                        .collect::<Vec<_>>()
                }
            })
            .collect();

        let url = format!(
            "https://clawhub.ai/api/v1/search?q={}&limit=30",
            encoded_q
        );

        let body: serde_json::Value = ureq::get(&url)
            .call()
            .map_err(|e| {
                eprintln!("[clawhub] search error: {e}");
                e.to_string()
            })?
            .into_json()
            .map_err(|e| {
                eprintln!("[clawhub] search json parse error: {e}");
                e.to_string()
            })?;

        let items = match body.get("results").and_then(|v| v.as_array()) {
            Some(arr) => arr.clone(),
            None => {
                eprintln!("[clawhub] unexpected search response shape");
                return Ok(vec![]);
            }
        };

        let skills: Vec<ClawhubSkill> = items
            .iter()
            .filter_map(|item| {
                let slug = item.get("slug")?.as_str()?.to_string();
                let display_name = item
                    .get("displayName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&slug)
                    .to_string();
                let summary = item
                    .get("summary")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let version = item
                    .get("version")
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        item.pointer("/tags/latest").and_then(|v| v.as_str())
                    })
                    .unwrap_or("latest")
                    .to_string();
                let stars = item
                    .pointer("/stats/stars")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0) as u32;
                let downloads = item
                    .pointer("/stats/downloads")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0) as u32;
                Some(ClawhubSkill {
                    slug,
                    display_name,
                    summary,
                    version,
                    stars,
                    downloads,
                })
            })
            .collect();

        Ok(skills)
    }
}

#[tauri::command]
pub fn install_skill_from_clawhub(
    state: State<AppState>,
    slug: String,
    display_name: String,
    version: String,
) -> Result<Skill, String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot determine home directory".to_string())?;
    let target_dir = home.join(".openclaw").join("skills").join(&slug);

    // Download ZIP (retry up to 3 times on 429 rate-limit)
    let url = format!(
        "https://clawhub.ai/api/v1/download?slug={}&version={}",
        slug, version
    );

    let mut bytes: Vec<u8> = Vec::new();
    use std::io::Read;

    let mut last_err = String::new();
    let mut downloaded = false;
    for attempt in 0..3u32 {
        if attempt > 0 {
            std::thread::sleep(std::time::Duration::from_secs(2u64.pow(attempt)));
        }
        match ureq::get(&url).call() {
            Ok(response) => {
                response
                    .into_reader()
                    .read_to_end(&mut bytes)
                    .map_err(|e| format!("Failed to read download response: {e}"))?;
                downloaded = true;
                break;
            }
            Err(ureq::Error::Status(429, _)) => {
                last_err = "下载被限速 (429)，请稍后重试".to_string();
                eprintln!("[clawhub] rate limited on attempt {}, retrying...", attempt + 1);
            }
            Err(e) => {
                return Err(format!("Download failed: {e}"));
            }
        }
    }
    if !downloaded {
        return Err(last_err);
    }

    // Extract ZIP to target directory
    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Invalid ZIP archive: {e}"))?;

    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create skill directory: {e}"))?;

    let target_dir_canonical = target_dir
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize target dir: {e}"))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("ZIP read error: {e}"))?;

        let out_path = match file.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => {
                eprintln!("[clawhub] skipping unsafe ZIP entry");
                continue;
            }
        };

        // Path traversal guard
        let out_canonical = out_path
            .parent()
            .and_then(|p| {
                std::fs::create_dir_all(p).ok()?;
                p.canonicalize().ok()
            })
            .unwrap_or_else(|| out_path.clone());

        if !out_canonical.starts_with(&target_dir_canonical) {
            eprintln!(
                "[clawhub] blocked path traversal attempt: {}",
                out_path.display()
            );
            continue;
        }

        if file.is_dir() {
            std::fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create directory: {e}"))?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {e}"))?;
            }
            let mut outfile = std::fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create file: {e}"))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to write file: {e}"))?;
        }
    }

    let install_path_str = target_dir.to_string_lossy().into_owned();
    let id = Uuid::new_v4().to_string();
    let source_url = format!("clawhub:{}", slug);

    let db = state.db.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let skill = crate::services::profile::upsert_skill(
        &db.conn,
        &id,
        &display_name,
        Some(&source_url),
        Some(&install_path_str),
    )
    .map_err(|e| format!("DB error: {e}"))?;

    Ok(skill)
}

#[tauri::command]
pub fn uninstall_skill(state: State<AppState>, id: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot determine home directory".to_string())?;
    let skills_base = home.join(".openclaw").join("skills");

    // Skills discovered from the filesystem (not in DB) use "fs:<slug>" as ID.
    // Derive the install_path directly from the slug without touching the DB.
    let install_path_str: Option<String> = if let Some(slug) = id.strip_prefix("fs:") {
        let path = skills_base.join(slug);
        Some(path.to_string_lossy().into_owned())
    } else {
        // Regular DB-tracked skill: look up install_path
        let db = state.db.lock().map_err(|e| format!("DB lock error: {e}"))?;
        let result = db.conn.query_row(
            "SELECT install_path FROM skills WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        );
        match result {
            Ok(p) => p,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err(format!("Skill not found: {}", id));
            }
            Err(e) => return Err(format!("DB error: {e}")),
        }
    };

    // Remove the directory if it's inside ~/.openclaw/skills/
    if let Some(path_str) = install_path_str {
        let install_path = std::path::PathBuf::from(&path_str);
        if install_path.starts_with(&skills_base) {
            if install_path.exists() {
                std::fs::remove_dir_all(&install_path)
                    .map_err(|e| format!("Failed to remove skill directory: {e}"))?;
            }
        } else {
            eprintln!(
                "[clawhub] uninstall: install_path '{}' is outside skills dir, skipping fs removal",
                path_str
            );
        }
    }

    // Remove from DB if it's a DB-tracked skill (fs: entries have no DB row)
    if !id.starts_with("fs:") {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {e}"))?;
        db.conn
            .execute("DELETE FROM skills WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| format!("DB error: {e}"))?;
    }

    Ok(())
}
