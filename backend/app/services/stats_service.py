from app.database.database import get_connection
from app.services.gemini_service import is_gemini_available, GEMINI_QUOTA_EXHAUSTED


def get_stats():
    """
    Compute real dashboard statistics from the database.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # --------------------------------------------------
    # AGENT COUNTS
    # --------------------------------------------------

    cursor.execute("SELECT COUNT(*) FROM agents")
    total_agents = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM agents WHERE status = 'ACTIVE'")
    active_agents = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM agents WHERE status = 'PAUSED'")
    paused_agents = cursor.fetchone()[0]

    # --------------------------------------------------
    # ARTICLE COUNTS
    # --------------------------------------------------

    cursor.execute("SELECT COUNT(*) FROM articles")
    total_articles_discovered = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM articles WHERE published = 1")
    total_articles_published = cursor.fetchone()[0]

    # --------------------------------------------------
    # POST COUNTS
    # --------------------------------------------------

    cursor.execute("SELECT COUNT(*) FROM posts")
    total_publications = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(CAST(score AS REAL)) FROM posts WHERE score > 0")
    avg_score_row = cursor.fetchone()[0]
    average_score = round(avg_score_row, 1) if avg_score_row else 0

    # --------------------------------------------------
    # ACTIVITY EVENT COUNTS
    # --------------------------------------------------

    cursor.execute("SELECT COUNT(*) FROM activity_events WHERE event_type = 'cycle_start'")
    cycles_started = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM activity_events WHERE event_type = 'cycle_skipped'")
    cycles_skipped = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM activity_events WHERE event_type = 'duplicate_skipped'")
    duplicates_skipped = cursor.fetchone()[0]

    # --------------------------------------------------
    # SOURCE COUNTS
    # --------------------------------------------------

    cursor.execute("SELECT COUNT(*) FROM sources WHERE enabled = 1")
    active_sources = cursor.fetchone()[0]

    connection.close()

    # --------------------------------------------------
    # GEMINI STATUS
    # --------------------------------------------------

    if GEMINI_QUOTA_EXHAUSTED:
        gemini_status = "QUOTA_EXHAUSTED"
    elif is_gemini_available():
        gemini_status = "AVAILABLE"
    else:
        gemini_status = "ERROR"

    return {
        "agents": {
            "total":  total_agents,
            "active": active_agents,
            "paused": paused_agents,
        },
        "articles": {
            "discovered": total_articles_discovered,
            "published":  total_articles_published,
            "duplicates_skipped": duplicates_skipped,
        },
        "publications": {
            "total":         total_publications,
            "average_score": average_score,
        },
        "cycles": {
            "started": cycles_started,
            "skipped": cycles_skipped,
        },
        "sources": {
            "active": active_sources,
        },
        "gemini": {
            "status": gemini_status,
        },
    }
