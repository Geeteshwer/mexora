import json

from fastapi import APIRouter

from app.database.database import get_connection

router = APIRouter()


@router.get("/feed")
def get_feed(agentId: str):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, created_at, text, rationale, sources
        FROM posts
        WHERE agent_id = ?
        ORDER BY created_at DESC
        """,
        (agentId,)
    )

    rows = cursor.fetchall()

    connection.close()

    posts = []

    for row in rows:
        posts.append({
            "id": row["id"],
            "createdAt": row["created_at"],
            "text": row["text"],
            "rationale": row["rationale"],
            "sources": json.loads(row["sources"])
        })

    return {
        "posts": posts
    }