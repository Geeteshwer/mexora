import uuid
from datetime import datetime, timezone

from app.database.database import get_connection


# --------------------------------------------------
# EVENT TYPES
# --------------------------------------------------

AGENT_INIT        = "agent_init"
SCHEDULER_START   = "scheduler_start"
SCHEDULER_STOP    = "scheduler_stop"
CYCLE_START       = "cycle_start"
CYCLE_SKIPPED     = "cycle_skipped"
ARTICLES_FOUND    = "articles_discovered"
ARTICLES_SELECTED = "articles_selected"
DUPLICATE_SKIPPED = "duplicate_skipped"
GEMINI_START      = "gemini_start"
GEMINI_QUOTA      = "gemini_quota_exhausted"
ARTICLE_PUBLISHED = "article_published"
CYCLE_COMPLETE    = "cycle_complete"
ERROR             = "error"


# --------------------------------------------------
# STATUS VALUES
# --------------------------------------------------

INFO     = "INFO"
SUCCESS  = "SUCCESS"
WARNING  = "WARNING"
DANGER   = "DANGER"
RUNNING  = "RUNNING"
SKIPPED  = "SKIPPED"


# --------------------------------------------------
# LOG EVENT
# --------------------------------------------------

def log_event(event_type: str, message: str, agent_id: str = None, status: str = INFO):
    """
    Persist an activity event to the database.

    Never raises — logging must not break autonomous cycles.
    """
    try:
        connection = get_connection()
        cursor = connection.cursor()

        event_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            INSERT INTO activity_events (id, agent_id, event_type, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (event_id, agent_id, event_type, message, status, created_at),
        )

        connection.commit()
        connection.close()

    except Exception as e:
        # Do not crash autonomous cycles because of a logging failure
        print(f"[ActivityService] Failed to log event: {e}")


# --------------------------------------------------
# GET EVENTS
# --------------------------------------------------

def get_events(agent_id: str = None, limit: int = 100):
    """
    Return recent activity events, optionally filtered by agent.
    """
    connection = get_connection()
    cursor = connection.cursor()

    if agent_id:
        cursor.execute(
            """
            SELECT id, agent_id, event_type, message, status, created_at
            FROM activity_events
            WHERE agent_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (agent_id, limit),
        )
    else:
        cursor.execute(
            """
            SELECT id, agent_id, event_type, message, status, created_at
            FROM activity_events
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        )

    rows = cursor.fetchall()
    connection.close()

    return [
        {
            "id":         row["id"],
            "agent_id":   row["agent_id"],
            "event_type": row["event_type"],
            "message":    row["message"],
            "status":     row["status"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
