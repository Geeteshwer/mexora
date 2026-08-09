from app.database.database import get_connection


def initialize_memory():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents(
            agent_id TEXT PRIMARY KEY,
            name TEXT,
            domain TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts(
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    text TEXT NOT NULL,
    rationale TEXT NOT NULL,
    sources TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
)
    """)

    connection.commit()
    connection.close()