def select_top_articles(articles, limit=10):

    security_keywords = [
        "security",
        "cyber",
        "cybersecurity",
        "vulnerability",
        "attack",
        "intrusion",
        "safety",
        "threat",
        "privacy",
        "agent",
        "cryptography",
        "model",
        "frontier",
        "risk"
    ]

    candidates = []

    for article in articles:

        text = (
            article.get("title", "") + " " +
            article.get("summary", "")
        ).lower()

        score = 0

        for keyword in security_keywords:
            if keyword in text:
                score += 10

        if score > 0:
            article["relevance_score"] = score
            candidates.append(article)

    candidates.sort(
        key=lambda x: x["relevance_score"],
        reverse=True
    )

    return candidates[:limit]


# --------------------------------------------------
# DETERMINISTIC FALLBACK EDITORIAL ENGINE
# --------------------------------------------------

import re
from datetime import datetime, timezone
from app.database.database import get_connection
from app.services.memory_service import normalize_url

def is_article_published(agent_id: str, url: str) -> bool:
    """
    Check if this URL has already been published by this agent in the database.
    """
    normalized = normalize_url(url)
    if not normalized:
        return False
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT 1 FROM articles WHERE agent_id = ? AND url = ? AND published = 1",
            (agent_id, normalized),
        )
        row = cursor.fetchone()
        connection.close()
        return row is not None
    except Exception as e:
        print(f"[EditorialService] Error checking article published status: {e}")
        return False


def run_fallback_editorial_engine(agent_id: str, persona: dict, articles: list) -> dict:
    """
    Evaluates candidate articles using deterministic rules and selects the best one.
    Returns the same decision structure as evaluate_and_write.
    """
    domain = persona.get("domain", "").lower()
    domain_words = [w for w in re.findall(r'[a-z0-9]+', domain) if len(w) >= 3]

    technical_keywords = [
        "security", "cyber", "cybersecurity", "vulnerability", "attack", "intrusion",
        "safety", "threat", "privacy", "cryptography", "model", "frontier", "risk",
        "cve", "exploit", "patch", "api", "framework", "library", "git", "github",
        "open-source", "weights", "gpu", "inference", "training", "dataset", "agent",
        "compiler", "runtime", "protocol", "architecture", "benchmark", "llm", "neural", "transformer"
    ]

    promotional_keywords = [
        "hiring", "careers", "join us", "pricing", "discount", "buy", "sponsor",
        "promotion", "webinar", "partnership", "sale", "customer story", "case study", "offer"
    ]

    scored_candidates = []

    for idx, article in enumerate(articles):
        url = article.get("link", "")

        # 1. Avoid already processed (published) URLs
        if is_article_published(agent_id, url):
            continue

        title = article.get("title", "")
        summary = article.get("summary", "")
        source_name = article.get("source_name", "")

        # Base Score
        score = 50

        # 2. Relevance to the agent domain
        title_lower = title.lower()
        summary_lower = summary.lower()

        relevance_matches = 0
        for word in domain_words:
            if word in title_lower:
                score += 15
                relevance_matches += 1
            if word in summary_lower:
                score += 5
                relevance_matches += 1

        # 3. Presence of meaningful technical information
        tech_matches = 0
        for keyword in technical_keywords:
            if keyword in title_lower:
                score += 5
                tech_matches += 1
            if keyword in summary_lower:
                score += 3
                tech_matches += 1

        # 4. Avoid promotional/marketing stories
        promo_matches = 0
        for keyword in promotional_keywords:
            word_pattern = rf"\b{keyword}\b"
            if re.search(word_pattern, title_lower) or re.search(word_pattern, summary_lower):
                score -= 30
                promo_matches += 1

        # 5. Freshness bonus
        pub_str = article.get("published")
        freshness_bonus = 20  # Default bonus if timestamp is missing/unparseable
        if pub_str:
            try:
                # Parse ISO format string
                pub_dt = datetime.fromisoformat(pub_str)
                now = datetime.now(timezone.utc)
                diff_seconds = (now - pub_dt).total_seconds()
                if diff_seconds <= 86400:     # within 24 hours
                    freshness_bonus = 20
                elif diff_seconds <= 172800:   # within 48 hours
                    freshness_bonus = 10
                else:
                    freshness_bonus = 0
            except Exception:
                pass
        score += freshness_bonus

        scored_candidates.append({
            "index": idx,
            "article": article,
            "score": max(0, score),
            "relevance_matches": relevance_matches
        })

    if not scored_candidates:
        return {
            "publish": False,
            "selected_index": None,
            "score": 0,
            "reason": "No unpublished candidates found for fallback engine.",
            "post": "",
            "fallback": True
        }

    # Sort candidates by score descending
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    best_candidate = scored_candidates[0]

    # If the strongest candidate score is below the threshold, reject it.
    if best_candidate["score"] < 60:
        return {
            "publish": False,
            "selected_index": None,
            "score": best_candidate["score"],
            "reason": f"Highest candidate score ({best_candidate['score']}) is below the threshold of 60.",
            "post": "",
            "fallback": True
        }

    # Generate a concise editorial post from available details without inventing facts
    article = best_candidate["article"]
    title = article.get("title", "")
    summary = article.get("summary", "")
    source_name = article.get("source_name", "RSS Feed")

    # Clean HTML tags and parse first couple of sentences from the summary
    clean_summary = re.sub('<[^<]+?>', '', summary).strip()
    sentences = re.split(r'(?<=[.!?])\s+', clean_summary)
    short_summary = " ".join(sentences[:2])
    if len(short_summary) > 280:
        short_summary = short_summary[:277] + "..."

    domain_display = persona.get("domain", "technology")
    post_text = (
        f"Analyzing a new update from {source_name}: \"{title}\".\n\n"
        f"{short_summary}\n\n"
        f"From an editorial perspective, this aligns closely with our focus on {domain_display}. "
        f"Tracking these shifts provides valuable insights into the technical developments in this space."
    )

    reason = (
        f"Selected deterministically (score: {best_candidate['score']}/100) based on relevance "
        f"to {persona.get('domain')} and technical content."
    )

    return {
        "publish": True,
        "selected_index": best_candidate["index"],
        "score": min(100, best_candidate["score"]),
        "reason": reason,
        "post": post_text,
        "fallback": True
    }