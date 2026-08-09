from app.services.news_service import discover_topics
from app.services.editorial_service import select_top_articles
from app.services.memory_service import article_exists
from app.services.post_service import create_test_post
from app.services.gemini_service import evaluate_and_write


def run_agent_cycle(agent_id, persona):

    print(f"Running autonomous cycle for agent: {agent_id}")

    articles = discover_topics()

    if not articles:
        print("No articles discovered.")
        return None

    top_articles = select_top_articles(
        articles,
        limit=3
    )

    if not top_articles:
        print("No suitable articles found.")
        return None

    new_articles = []

    for article in top_articles:

        if article_exists(agent_id, article["link"]):
            continue

        new_articles.append(article)

    if not new_articles:
        print("All discovered articles have already been considered.")
        return None

    decision = evaluate_and_write(
        persona,
        new_articles
    )

    print(f"Gemini decision: {decision}")

    if not decision.get("publish"):
        print("Gemini rejected all candidates.")
        return None

    selected_index = decision.get("selected_index")

    if selected_index is None:
        return None

    if selected_index < 0 or selected_index >= len(new_articles):
        print("Gemini returned an invalid selected_index.")
        return None

    article = new_articles[selected_index]

    post = create_test_post(
        agent_id,
        article,
        decision
    )

    print(f"Post saved: {post['id']}")

    return post