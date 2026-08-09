from fastapi import APIRouter

from app.services.stats_service import get_stats

router = APIRouter()


@router.get("")
def dashboard_stats():
    """
    Return real dashboard statistics calculated from the database.
    Includes agent counts, article counts, publication stats,
    cycle history, source counts, and Gemini availability state.
    """
    stats = get_stats()

    return stats
