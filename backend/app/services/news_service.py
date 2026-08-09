import feedparser


RSS_FEEDS = [
    "https://openai.com/news/rss.xml",
    "https://huggingface.co/blog/feed.xml",
    "https://www.anthropic.com/rss.xml",
    "https://deepmind.google/blog/rss.xml",
    "https://www.microsoft.com/en-us/research/feed/",
    "https://blogs.nvidia.com/feed/",
]


def discover_topics():

    topics = []

    for url in RSS_FEEDS:

        try:
            feed = feedparser.parse(url)

            for entry in feed.entries[:10]:

                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                summary = entry.get("summary", "").strip()

                if not title or not link:
                    continue

                topics.append({
                    "title": title,
                    "link": link,
                    "summary": summary
                })

        except Exception as e:
            print(f"Failed to read feed {url}: {e}")

    return topics