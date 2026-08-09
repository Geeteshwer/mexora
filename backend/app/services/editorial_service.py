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