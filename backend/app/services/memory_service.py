import json
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse

from app.database.database import get_connection


# --------------------------------------------------
# URL NORMALIZATION
# --------------------------------------------------

def normalize_url(url: str) -> str:
    """
    Strip trailing slashes, query strings, and fragments
    so that slightly different versions of the same URL
    are treated as duplicates.
    """
    if not url:
        return ""

    url = url.strip()

    try:
        parsed = urlparse(url)
        # Keep scheme + netloc + path, drop query + fragment
        normalized = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path.rstrip("/"),
            "",   # params
            "",   # query
            "",   # fragment
        ))
        return normalized
    except Exception:
        return url.strip().rstrip("/").lower()


# --------------------------------------------------
# ARTICLE MEMORY (new articles table)
# --------------------------------------------------

def article_seen(agent_id: str, url: str) -> bool:
    """
    Check if this article URL has already been seen by the agent.
    Uses the dedicated articles table with URL normalization.
    """
    normalized = normalize_url(url)

    if not normalized:
        return False

    connection = get_connection()
    cursor = connection.cursor()

    # Check articles table first (fast)
    cursor.execute(
        "SELECT 1 FROM articles WHERE agent_id = ? AND url = ?",
        (agent_id, normalized),
    )
    found = cursor.fetchone() is not None

    connection.close()
    return found


def mark_article_seen(
    agent_id: str,
    url: str,
    title: str = "",
    source: str = "",
    published: bool = False,
    score: int = 0,
):
    """
    Record that the agent has seen this article.
    """
    normalized = normalize_url(url)

    if not normalized:
        return

    connection = get_connection()
    cursor = connection.cursor()

    now = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        """
        INSERT OR IGNORE INTO articles
            (id, agent_id, url, title, source, discovered_at, processed_at, published, score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4()),
            agent_id,
            normalized,
            title or "",
            source or "",
            now,
            now,
            1 if published else 0,
            score,
        ),
    )

    connection.commit()
    connection.close()


def mark_article_published(agent_id: str, url: str, score: int = 0):
    """
    Update the articles table to indicate the article was published.
    """
    normalized = normalize_url(url)

    if not normalized:
        return

    connection = get_connection()
    cursor = connection.cursor()

    now = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        """
        UPDATE articles
        SET published = 1, score = ?, processed_at = ?
        WHERE agent_id = ? AND url = ?
        """,
        (score, now, agent_id, normalized),
    )

    connection.commit()
    connection.close()


# --------------------------------------------------
# LEGACY article_exists (kept for backward compat)
# Delegates to new articles table first, then falls
# back to scanning post sources JSON.
# --------------------------------------------------

def article_exists(agent_id: str, link: str) -> bool:
    # Try the new fast lookup first
    if article_seen(agent_id, link):
        return True

    # Legacy fallback: scan post sources JSON
    normalized = normalize_url(link)

    if not normalized:
        return False

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "SELECT sources FROM posts WHERE agent_id = ?",
        (agent_id,),
    )

    posts = cursor.fetchall()
    connection.close()

    for post in posts:
        sources_raw = post[0]

        if not sources_raw:
            continue

        try:
            source_list = json.loads(sources_raw)
        except json.JSONDecodeError:
            continue

        if not isinstance(source_list, list):
            continue

        for source in source_list:
            if normalize_url(source) == normalized:
                return True

    return False


# --------------------------------------------------
# SAVE POST (expanded fields)
# --------------------------------------------------

def save_post(post: dict):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO posts
            (id, agent_id, title, text, rationale, score, sources, source_url, source_name, article_title, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            post["id"],
            post["agent_id"],
            post.get("title", ""),
            post["text"],
            post["rationale"],
            post.get("score", 0),
            json.dumps(post.get("sources", [])),
            post.get("source_url", ""),
            post.get("source_name", ""),
            post.get("article_title", ""),
            post["created_at"],
        ),
    )

    connection.commit()
    connection.close()