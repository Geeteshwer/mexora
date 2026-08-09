from app.services.news_service import discover_topics
from app.services.editorial_service import select_top_articles
from app.services.memory_service import article_seen, mark_article_seen
from app.services.post_service import create_post
from app.services.gemini_service import evaluate_and_write
from app.services import activity_service as act

import os

MAX_ARTICLES_PER_CYCLE = int(os.getenv("MAX_ARTICLES_PER_CYCLE", "10"))
MAX_GEMINI_ARTICLES    = int(os.getenv("MAX_GEMINI_ARTICLES", "3"))


def run_agent_cycle(agent_id: str, persona: dict):
    """
    Full autonomous cycle for a single agent.

    This function is ISOLATED — any exception is caught and logged.
    It will NEVER crash the APScheduler background thread.

    Returns the created post dict on success, None otherwise.
    """

    try:
        return _run_cycle_inner(agent_id, persona)

    except Exception as e:
        print(f"\n[AutonomousService] Unhandled error in cycle for {agent_id}: {e}")

        act.log_event(
            act.ERROR,
            f"Unexpected cycle error: {e}",
            agent_id=agent_id,
            status=act.DANGER,
        )

        return None


def _run_cycle_inner(agent_id: str, persona: dict):

    print(f"\n=== Running autonomous cycle for agent: {agent_id} ===")

    # --------------------------------------------------
    # LOG CYCLE START
    # --------------------------------------------------

    act.log_event(
        act.CYCLE_START,
        f"Autonomous cycle started for agent '{persona.get('name', agent_id)}'",
        agent_id=agent_id,
        status=act.RUNNING,
    )

    # --------------------------------------------------
    # STEP 1: DISCOVER ARTICLES
    # --------------------------------------------------

    articles = discover_topics()

    if not articles:
        print("No articles discovered.")
        act.log_event(
            act.CYCLE_SKIPPED,
            "No articles discovered from RSS sources. Cycle skipped.",
            agent_id=agent_id,
            status=act.SKIPPED,
        )
        return None

    print(f"Discovered {len(articles)} articles.")
    act.log_event(
        act.ARTICLES_FOUND,
        f"Discovered {len(articles)} articles from RSS sources.",
        agent_id=agent_id,
        status=act.INFO,
    )

    # --------------------------------------------------
    # STEP 2: SELECT RELEVANT ARTICLES
    # --------------------------------------------------

    top_articles = select_top_articles(articles, limit=MAX_ARTICLES_PER_CYCLE)

    if not top_articles:
        print("No suitable articles found.")
        act.log_event(
            act.CYCLE_SKIPPED,
            "No articles matched editorial relevance criteria. Cycle skipped.",
            agent_id=agent_id,
            status=act.SKIPPED,
        )
        return None

    print(f"Selected {len(top_articles)} relevant articles.")
    act.log_event(
        act.ARTICLES_SELECTED,
        f"Selected {len(top_articles)} relevant articles for evaluation.",
        agent_id=agent_id,
        status=act.INFO,
    )

    # --------------------------------------------------
    # STEP 3: REMOVE ALREADY PROCESSED ARTICLES
    # --------------------------------------------------

    new_articles = []
    skipped_count = 0

    for article in top_articles:
        url = article.get("link", "")

        if article_seen(agent_id, url):
            print(f"Already processed: {article['title']}")
            skipped_count += 1
            continue

        # Mark as seen immediately to avoid sending it to Gemini twice
        mark_article_seen(
            agent_id,
            url,
            title=article.get("title", ""),
            source=article.get("source_name", ""),
            published=False,
        )

        new_articles.append(article)

    if skipped_count > 0:
        act.log_event(
            act.DUPLICATE_SKIPPED,
            f"{skipped_count} article(s) skipped — already seen by this agent.",
            agent_id=agent_id,
            status=act.INFO,
        )

    if not new_articles:
        print("All discovered articles have already been considered.")
        act.log_event(
            act.CYCLE_SKIPPED,
            "All candidate articles were already seen. Cycle skipped.",
            agent_id=agent_id,
            status=act.SKIPPED,
        )
        return None

    # --------------------------------------------------
    # STEP 4: LIMIT ARTICLES SENT TO GEMINI
    # --------------------------------------------------

    new_articles = new_articles[:MAX_GEMINI_ARTICLES]

    print(f"Sending {len(new_articles)} new articles to Gemini.")
    # --------------------------------------------------
    # STEP 5: EDITORIAL DECISION (GEMINI OR FALLBACK)
    # --------------------------------------------------

    from app.services.gemini_service import is_gemini_available
    from app.services.editorial_service import run_fallback_editorial_engine

    use_fallback = not is_gemini_available()
    decision = None

    if not use_fallback:
        act.log_event(
            act.GEMINI_START,
            f"Sending {len(new_articles)} article(s) to Gemini for editorial evaluation.",
            agent_id=agent_id,
            status=act.RUNNING,
        )
        decision = evaluate_and_write(persona, new_articles)
        if decision.get("quota_exhausted"):
            use_fallback = True

    if use_fallback:
        print("\nGemini is unavailable. Running fallback editorial engine...")
        act.log_event(
            "fallback_engine",
            "Gemini quota is exhausted. Using fallback editorial engine.",
            agent_id=agent_id,
            status=act.WARNING,
        )
        decision = run_fallback_editorial_engine(agent_id, persona, new_articles)

    print(f"Editorial decision: {decision}")

    # --------------------------------------------------
    # STEP 6: CHECK GEMINI QUOTA (OBSOLETE / HANDLED)
    # --------------------------------------------------

    engine_name = "Fallback engine" if decision.get("fallback") else "Gemini"

    # --------------------------------------------------
    # STEP 7: CHECK PUBLISH DECISION
    # --------------------------------------------------

    if not decision.get("publish"):
        print(f"{engine_name} rejected all candidates.")
        act.log_event(
            act.CYCLE_SKIPPED,
            f"{engine_name} rejected all candidates: {decision.get('reason', 'No reason given')}",
            agent_id=agent_id,
            status=act.SKIPPED,
        )
        return None

    # --------------------------------------------------
    # STEP 8: VALIDATE SELECTED INDEX
    # --------------------------------------------------

    selected_index = decision.get("selected_index")

    if selected_index is None:
        print(f"{engine_name} did not provide a selected_index.")
        act.log_event(
            act.ERROR,
            f"{engine_name} did not provide a selected_index. Post skipped.",
            agent_id=agent_id,
            status=act.WARNING,
        )
        return None

    if selected_index < 0 or selected_index >= len(new_articles):
        print(f"{engine_name} returned an invalid selected_index.")
        act.log_event(
            act.ERROR,
            f"{engine_name} returned invalid selected_index {selected_index}. Post skipped.",
            agent_id=agent_id,
            status=act.WARNING,
        )
        return None

    # --------------------------------------------------
    # STEP 9: GET SELECTED ARTICLE
    # --------------------------------------------------

    article = new_articles[selected_index]

    print(f"{engine_name} selected: {article['title']}")

    # --------------------------------------------------
    # STEP 10: CREATE POST
    # --------------------------------------------------

    post = create_post(agent_id, article, decision)

    print(f"Post saved: {post['id']}")

    act.log_event(
        act.ARTICLE_PUBLISHED,
        f"Published: {article['title'][:100]} (score: {decision.get('score', 0)}/100)",
        agent_id=agent_id,
        status=act.SUCCESS,
    )

    act.log_event(
        act.CYCLE_COMPLETE,
        "Autonomous cycle completed successfully.",
        agent_id=agent_id,
        status=act.SUCCESS,
    )

    return post