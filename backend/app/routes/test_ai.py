from fastapi import APIRouter

from app.services.news_service import discover_topics
from app.services.editorial_service import select_top_articles
from app.services.gemini_service import evaluate_and_write


router = APIRouter()


@router.get("/test-ai")
def test_ai():

    articles = discover_topics()

    top_articles = select_top_articles(
        articles,
        limit=3
    )

    persona = {
        "name": "Ada",
        "domain": "AI Security"
    }

    result = evaluate_and_write(
        persona,
        top_articles
    )

    return result