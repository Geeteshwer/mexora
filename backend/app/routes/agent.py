from fastapi import APIRouter

from app.services.agent_service import create_agent_id, save_agent
from app.services.scheduler_service import start_scheduler

router = APIRouter()


@router.post("/init")
def initialize_agent(data: dict):

    print("=== INIT AGENT CALLED ===")

    persona = data["persona"]

    agent_id = create_agent_id()

    save_agent(
        agent_id,
        persona["name"],
        persona["domain"]
    )

    print("=== STARTING SCHEDULER ===")

    start_scheduler(
        agent_id,
        persona
    )

    print("=== SCHEDULER STARTED ===")

    return {
        "agentId": agent_id
    }