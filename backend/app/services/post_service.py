import uuid
from datetime import datetime, timezone

from app.services.memory_service import save_post, mark_article_published


def create_post(agent_id: str, article: dict, decision: dict) -> dict:
    """
    Build and persist a post from a Gemini decision.

    article keys: title, link, summary, (source_name optional)
    decision keys: post, score, reason, publish, selected_index
    """
    score   = int(decision.get("score") or 0)
    reason  = decision.get("reason", "")
    post_text = decision.get("post", "")

    # Build structured rationale
    rationale = f"Editorial score: {score}/100 — {reason}"

    article_url   = article.get("link", "")
    article_title = article.get("title", "")
    source_name   = article.get("source_name", "")

    post = {
        "id":            str(uuid.uuid4()),
        "agent_id":      agent_id,
        "title":         article_title,
        "text":          post_text,
        "rationale":     rationale,
        "score":         score,
        "sources":       [article_url] if article_url else [],
        "source_url":    article_url,
        "source_name":   source_name,
        "article_title": article_title,
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }

    save_post(post)

    # Mark the article as published in the articles memory table
    mark_article_published(agent_id, article_url, score=score)

    return post


# Keep old name as alias for backward compatibility
def create_test_post(agent_id, article, decision):
    return create_post(agent_id, article, decision)