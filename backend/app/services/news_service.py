import feedparser

from app.database.database import get_connection


# --------------------------------------------------
# DEFAULT FEEDS (used if sources table is empty)
# --------------------------------------------------

DEFAULT_FEEDS = [
    ("OpenAI Blog",        "https://openai.com/news/rss.xml"),
    ("Hugging Face Blog",  "https://huggingface.co/blog/feed.xml"),
    ("Anthropic Blog",     "https://www.anthropic.com/rss.xml"),
    ("DeepMind Blog",      "https://deepmind.google/blog/rss.xml"),
    ("Microsoft Research", "https://www.microsoft.com/en-us/research/feed/"),
    ("NVIDIA Blog",        "https://blogs.nvidia.com/feed/"),
]


def _load_feeds_from_db():
    """
    Return list of (name, url) tuples from the sources table.
    Only returns enabled sources.
    """
    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT name, url FROM sources WHERE enabled = 1"
        )

        rows = cursor.fetchall()
        connection.close()

        if rows:
            return [(row["name"], row["url"]) for row in rows]

    except Exception as e:
        print(f"[NewsService] Could not load feeds from DB: {e}")

    return DEFAULT_FEEDS


def discover_topics():
    """
    Fetch articles from all enabled RSS sources.
    Returns a list of article dicts with: title, link, summary, source_name
    """
    feeds = _load_feeds_from_db()
    topics = []

    for source_name, url in feeds:
        try:
            feed = feedparser.parse(url)

            for entry in feed.entries[:10]:
                title   = entry.get("title",   "").strip()
                link    = entry.get("link",    "").strip()
                summary = entry.get("summary", "").strip()

                if not title or not link:
                    continue

                # Parse publication date for freshness scoring
                import time
                from datetime import datetime, timezone
                pub_date = None
                if "published_parsed" in entry and entry.published_parsed:
                    try:
                        pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                    except Exception:
                        pass
                if not pub_date and "updated_parsed" in entry and entry.updated_parsed:
                    try:
                        pub_date = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()
                    except Exception:
                        pass
                if not pub_date:
                    pub_date = datetime.now(timezone.utc).isoformat()

                topics.append({
                    "title":       title,
                    "link":        link,
                    "summary":     summary,
                    "source_name": source_name,
                    "published":   pub_date,
                })

        except Exception as e:
            print(f"[NewsService] Failed to read feed {url}: {e}")

    return topics