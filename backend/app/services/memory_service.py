import json

from app.database.database import get_connection


def article_exists(agent_id: str, link: str):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id
        FROM posts
        WHERE agent_id = ?
        AND sources LIKE ?
        """,
        (agent_id, f"%{link}%")
    )

    result = cursor.fetchone()

    connection.close()

    return result is not None

def save_post(post):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO posts
        (id, agent_id, text, rationale, sources, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            post["id"],
            post["agent_id"],
            post["text"],
            post["rationale"],
            json.dumps(post["sources"]),
            post["created_at"]
        )
    )

    connection.commit()
    connection.close()