// src-tauri/src/database/mod.rs
use rusqlite::{Connection, Result};
use std::path::Path;

pub mod schema;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        Ok(Database { conn })
    }

    pub fn init(&self) -> Result<()> {
        self.conn.execute_batch(schema::MIGRATIONS)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_initializes() {
        let db = Database::open(Path::new(":memory:")).unwrap();
        assert!(db.init().is_ok());
    }

    #[test]
    fn test_profiles_table_exists() {
        let db = Database::open(Path::new(":memory:")).unwrap();
        db.init().unwrap();
        let count: i64 = db
            .conn
            .query_row("SELECT count(*) FROM profiles", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let db = Database::open(Path::new(":memory:")).unwrap();
        db.init().unwrap();
        let fk: i64 = db
            .conn
            .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fk, 1);
    }
}
