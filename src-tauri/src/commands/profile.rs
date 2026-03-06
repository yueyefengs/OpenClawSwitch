use crate::{AppState, services::profile};
use serde_json::Value;
use tauri::State;

#[derive(Debug, serde::Serialize)]
pub struct CommandError(String);

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
    let db = state.db.lock().unwrap();
    profile::update_profile_config(&db.conn, &id, config).map_err(Into::into)
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
    let db = state.db.lock().unwrap();
    profile::activate_profile(&db.conn, &id, &state.live_config_path).map_err(Into::into)
}

#[tauri::command]
pub fn get_profile_config(state: State<'_, AppState>, id: String) -> Result<Value, CommandError> {
    let db = state.db.lock().unwrap();
    profile::get_profile_config(&db.conn, &id).map_err(Into::into)
}
