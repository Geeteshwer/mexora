import uuid
from datetime import datetime, timezone

from app.services.memory_service import save_post


def create_test_post(agent_id, article, decision):

    post = {
        "id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "text": decision["post"],
        "rationale": decision["reason"],
        "sources": [
            article["link"]
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    save_post(post)

    return post