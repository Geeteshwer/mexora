import json
import re

from fastapi import APIRouter, Query

from app.database.database import get_connection

router = APIRouter()


@router.get("/feed")
def get_feed(agentId: str = Query(None)):
    """
    Return published posts.
    If agentId is specified, attempts to find posts for that agent.
    If no posts exist for that specific agent or agentId is omitted,
    returns all published posts across all agents.
    """
    print(f"\n=== FEED REQUEST for agent: {agentId} ===")

    connection = get_connection()
    cursor = connection.cursor()

    rows = []

    if agentId and agentId.strip():
        cursor.execute(
            """
            SELECT
                id,
                agent_id,
                title,
                text,
                rationale,
                score,
                sources,
                source_url,
                source_name,
                article_title,
                created_at
            FROM posts
            WHERE agent_id = ?
            ORDER BY created_at DESC
            """,
            (agentId.strip(),),
        )
        rows = cursor.fetchall()

    # If no agentId provided, OR if specific agent has no posts yet, fallback to all posts
    if not rows:
        cursor.execute(
            """
            SELECT
                id,
                agent_id,
                title,
                text,
                rationale,
                score,
                sources,
                source_url,
                source_name,
                article_title,
                created_at
            FROM posts
            ORDER BY created_at DESC
            """
        )
        rows = cursor.fetchall()

    connection.close()

    print(f"Posts found: {len(rows)}")

    posts = []

    for row in rows:
        try:
            sources = json.loads(row["sources"])
        except (json.JSONDecodeError, TypeError):
            sources = []

        # Try to parse score from rationale if column is 0
        score = row["score"] or 0
        if score == 0 and row["rationale"]:
            m = re.search(r"(\d+)/100", row["rationale"])
            if m:
                score = int(m.group(1))

        posts.append({
            "id":           row["id"],
            "agentId":      row["agent_id"],
            "title":        row["title"] or row["article_title"] or "",
            "text":         row["text"],
            "rationale":    row["rationale"],
            "score":        score,
            "sources":      sources,
            "sourceUrl":    row["source_url"] or (sources[0] if sources else ""),
            "sourceName":   row["source_name"] or "",
            "articleTitle": row["article_title"] or "",
            "createdAt":    row["created_at"],
        })

    print(f"=== END FEED ({len(posts)} posts) ===\n")

    return {"posts": posts}