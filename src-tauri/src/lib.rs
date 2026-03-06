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

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::Manager;
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
    use tauri::tray::TrayIconBuilder;

    let state = app.state::<AppState>();
    let profiles = {
        let db = state.db.lock().unwrap();
        services::profile::list_profiles(&db.conn).unwrap_or_default()
    };

    let mut builder = MenuBuilder::new(app);

    for p in &profiles {
        let label = if p.is_active {
            format!("● {}", p.name)
        } else {
            format!("  {}", p.name)
        };
        let item = MenuItemBuilder::with_id(&p.id, label).build(app)?;
        builder = builder.item(&item);
    }

    let sep = PredefinedMenuItem::separator(app)?;
    let show_item = MenuItemBuilder::with_id("show", "打开主界面").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
    builder = builder.item(&sep).item(&show_item).item(&quit_item);

    let menu = builder.build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(move |app, event| {
            let id = event.id.as_ref();
            match id {
                "show" => {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
                "quit" => app.exit(0),
                profile_id => {
                    let state = app.state::<AppState>();
                    let db = state.db.lock().unwrap();
                    let _ = services::profile::activate_profile(
                        &db.conn,
                        profile_id,
                        &state.live_config_path,
                    );
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let home = dirs::home_dir().expect("Could not determine home directory");
    let db_path = home.join(".openclaw-switch").join("switch.db");
    let live_path = services::config_parser::default_openclaw_path()
        .unwrap_or_else(|| home.join(".openclaw").join("openclaw.json"));

    std::fs::create_dir_all(db_path.parent().unwrap())
        .expect("Failed to create .openclaw-switch directory");

    let db = Database::open(&db_path).expect("Failed to open database");
    db.init().expect("Failed to initialize database");

    maybe_import_existing_config(&db, &live_path);

    let state = AppState {
        db: Mutex::new(db),
        live_config_path: live_path,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(|app| {
            build_tray(app)?;
            Ok(())
        })
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
        .expect("error while running tauri application");
}

fn maybe_import_existing_config(db: &Database, live_path: &std::path::Path) {
    use services::{config_parser, profile};

    let count: i64 = db.conn
        .query_row("SELECT count(*) FROM profiles", [], |r| r.get(0))
        .unwrap_or(0);
    if count > 0 {
        return;
    }

    let config = if live_path.exists() {
        config_parser::read_config(live_path).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let p = profile::create_profile(&db.conn, "默认", None, config)
        .expect("Failed to create default profile");
    // Only activate (write live file) if the live config already exists
    // Don't overwrite a non-existent file with empty JSON
    if live_path.exists() {
        let _ = profile::activate_profile(&db.conn, &p.id, live_path);
    } else {
        // Just mark it active in DB without writing a file
        db.conn.execute(
            "UPDATE profiles SET is_active = 1 WHERE id = ?1",
            rusqlite::params![p.id],
        ).expect("Failed to mark default profile as active");
    }
}
