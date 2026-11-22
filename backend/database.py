# database.py - CartGuard SQLite Database & Schema
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cartguard.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Table for individual anonymous violation reports
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        url TEXT,
        pattern_type TEXT NOT NULL,
        official_name TEXT NOT NULL,
        ccpa_section TEXT NOT NULL,
        severity TEXT NOT NULL,
        evidence_text TEXT,
        reporter_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_domain ON reports(domain);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_pattern ON reports(pattern_type);")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized at:", DB_PATH)
