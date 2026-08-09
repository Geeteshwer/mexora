from fastapi import APIRouter, Query

from app.services.activity_service import get_events

router = APIRouter()


@router.get("")
def list_activity(
    agentId: str = Query(None, description="Filter by agent ID"),
    limit:   int = Query(100,  description="Maximum number of events to return"),
):
    """
    Return recent activity events.

    Optional: filter by ?agentId=<id>
    Optional: limit with ?limit=<n>
    """
    events = get_events(agent_id=agentId, limit=limit)

    return {"events": events}
