use std::io::Write;
use std::path::Path;

pub fn log_entry(log_path: &Path, level: &str, message: &str) {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f UTC");
    let line = format!("[{}] [{}] {}\n", now, level, message);
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let _ = file.write_all(line.as_bytes());
    }
}

pub fn log_info(log_path: &Path, message: &str) {
    log_entry(log_path, "INFO", message);
}

pub fn log_error(log_path: &Path, message: &str) {
    log_entry(log_path, "ERROR", message);
}
