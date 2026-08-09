from app.database.database import get_connection


def initialize_memory():
    connection = get_connection()
    cursor = connection.cursor()

    # --------------------------------------------------
    # AGENTS TABLE
    # --------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents(
            agent_id   TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            domain     TEXT NOT NULL,
            status     TEXT NOT NULL DEFAULT 'ACTIVE',
            persona    TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migrate: add missing columns if they don't exist yet
    _add_column_if_missing(cursor, "agents", "status",     "TEXT NOT NULL DEFAULT 'ACTIVE'")
    _add_column_if_missing(cursor, "agents", "persona",    "TEXT")
    _add_column_if_missing(cursor, "agents", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    # --------------------------------------------------
    # POSTS TABLE
    # --------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts(
            id             TEXT PRIMARY KEY,
            agent_id       TEXT NOT NULL,
            title          TEXT,
            text           TEXT NOT NULL,
            rationale      TEXT NOT NULL,
            score          INTEGER DEFAULT 0,
            sources        TEXT NOT NULL,
            source_url     TEXT,
            source_name    TEXT,
            article_title  TEXT,
            created_at     TEXT NOT NULL,
            FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
        )
    """)

    # Migrate existing posts table
    _add_column_if_missing(cursor, "posts", "title",         "TEXT")
    _add_column_if_missing(cursor, "posts", "score",         "INTEGER DEFAULT 0")
    _add_column_if_missing(cursor, "posts", "source_url",    "TEXT")
    _add_column_if_missing(cursor, "posts", "source_name",   "TEXT")
    _add_column_if_missing(cursor, "posts", "article_title", "TEXT")

    # --------------------------------------------------
    # ARTICLES TABLE  (processed article memory)
    # --------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles(
            id            TEXT PRIMARY KEY,
            agent_id      TEXT NOT NULL,
            url           TEXT NOT NULL,
            title         TEXT,
            source        TEXT,
            discovered_at TEXT,
            processed_at  TEXT,
            published     INTEGER DEFAULT 0,
            score         INTEGER DEFAULT 0,
            FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
        )
    """)

    # --------------------------------------------------
    # ACTIVITY EVENTS TABLE
    # --------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_events(
            id         TEXT PRIMARY KEY,
            agent_id   TEXT,
            event_type TEXT NOT NULL,
            message    TEXT NOT NULL,
            status     TEXT NOT NULL DEFAULT 'INFO',
            created_at TEXT NOT NULL
        )
    """)

    # --------------------------------------------------
    # SOURCES TABLE
    # --------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sources(
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            url          TEXT NOT NULL UNIQUE,
            category     TEXT DEFAULT 'general',
            enabled      INTEGER DEFAULT 1,
            last_checked TEXT
        )
    """)

    # Seed default sources if table is empty
    cursor.execute("SELECT COUNT(*) FROM sources")
    count = cursor.fetchone()[0]

    if count == 0:
        import uuid
        default_sources = [
            ("OpenAI Blog",             "https://openai.com/news/rss.xml",                "AI"),
            ("Hugging Face Blog",       "https://huggingface.co/blog/feed.xml",            "AI"),
            ("Anthropic Blog",          "https://www.anthropic.com/rss.xml",               "AI"),
            ("DeepMind Blog",           "https://deepmind.google/blog/rss.xml",            "AI"),
            ("Microsoft Research",      "https://www.microsoft.com/en-us/research/feed/",  "AI"),
            ("NVIDIA Blog",             "https://blogs.nvidia.com/feed/",                  "AI"),
        ]
        for name, url, category in default_sources:
            cursor.execute(
                "INSERT OR IGNORE INTO sources (id, name, url, category) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), name, url, category),
            )

    connection.commit()
    connection.close()


# --------------------------------------------------
# INTERNAL HELPER — Safe column migration
# --------------------------------------------------

def _add_column_if_missing(cursor, table, column, col_def):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    if column not in cols:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        except Exception:
            pass