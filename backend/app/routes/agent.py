import uuid
import threading

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.agent_service import (
    save_agent,
    get_all_agents,
    get_agent,
    update_agent_status,
    delete_agent,
)
from app.services.scheduler_service import (
    start_scheduler,
    stop_scheduler,
    run_agent_now,
    is_scheduler_running,
)
from app.services import activity_service as act
from app.database.memory import initialize_memory


router = APIRouter()


# --------------------------------------------------
# REQUEST / RESPONSE MODELS
# --------------------------------------------------

class PersonaCreate(BaseModel):
    name:   str
    domain: str


class AgentCreate(BaseModel):
    persona: PersonaCreate


# Backward-compatible alias used by older frontend
AgentInitRequest = AgentCreate


# --------------------------------------------------
# HELPER: enrich agent with scheduler status
# --------------------------------------------------

def _enrich_agent(agent: dict) -> dict:
    running = is_scheduler_running(agent["agent_id"])
    agent["scheduler_running"] = running
    return agent


# --------------------------------------------------
# CREATE AGENT  POST /api/agents
# (Also handles legacy POST /api/agent/init)
# --------------------------------------------------

@router.post("")
@router.post("/init")          # backward compat
def create_agent(request: AgentCreate):
    agent_id = str(uuid.uuid4())

    persona = {
        "name":   request.persona.name,
        "domain": request.persona.domain,
    }

    print(f"\n=== CREATE AGENT: {agent_id} ===")

    # Persist to DB
    save_agent(agent_id, request.persona.name, request.persona.domain, persona)

    # Log init
    act.log_event(
        act.AGENT_INIT,
        f"Agent '{request.persona.name}' initialized (domain: {request.persona.domain})",
        agent_id=agent_id,
        status=act.SUCCESS,
    )

    # Start recurring scheduler
    start_scheduler(agent_id, persona)

    # Kick off one immediate cycle so the first post appears without waiting
    # for the full scheduler interval (2 min). Runs in a daemon thread.
    def _first_run():
        import time
        time.sleep(3)            # give the DB write a moment to settle
        from app.services.autonomous_service import run_agent_cycle
        run_agent_cycle(agent_id, persona)

    thread = threading.Thread(target=_first_run, daemon=True)
    thread.start()

    agent = get_agent(agent_id) or {}
    agent["scheduler_running"] = True

    return {
        "agentId": agent_id,
        "agent":   agent,
        "persona": persona,
        "status":  "ACTIVE",
    }


# --------------------------------------------------
# LIST AGENTS  GET /api/agents
# --------------------------------------------------

@router.get("")
def list_agents():
    agents = get_all_agents()

    for a in agents:
        _enrich_agent(a)

    return {"agents": agents}


# --------------------------------------------------
# GET AGENT  GET /api/agents/{agent_id}
# --------------------------------------------------

@router.get("/{agent_id}")
def get_single_agent(agent_id: str):
    agent = get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return _enrich_agent(agent)


# --------------------------------------------------
# DELETE AGENT  DELETE /api/agents/{agent_id}
# --------------------------------------------------

@router.delete("/{agent_id}")
def remove_agent(agent_id: str):
    agent = get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    stop_scheduler(agent_id)
    update_agent_status(agent_id, "PAUSED")

    return {
        "agent_id": agent_id,
        "status":   "PAUSED",
        "message":  "Agent stopped",
    }


# --------------------------------------------------
# START AGENT  POST /api/agents/{agent_id}/start
# --------------------------------------------------

@router.post("/{agent_id}/start")
def start_agent(agent_id: str):
    agent = get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if is_scheduler_running(agent_id):
        return {
            "agent_id": agent_id,
            "status":   "ACTIVE",
            "message":  "Scheduler already running",
        }

    persona = agent.get("persona") or {"name": agent["name"], "domain": agent["domain"]}

    start_scheduler(agent_id, persona)

    return {
        "agent_id": agent_id,
        "status":   "ACTIVE",
        "message":  "Scheduler started",
    }


# --------------------------------------------------
# STOP AGENT  POST /api/agents/{agent_id}/stop
# --------------------------------------------------

@router.post("/{agent_id}/stop")
def stop_agent(agent_id: str):
    agent = get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    stopped = stop_scheduler(agent_id)

    return {
        "agent_id": agent_id,
        "status":   "PAUSED",
        "success":  stopped,
    }


# --------------------------------------------------
# RUN NOW  POST /api/agents/{agent_id}/run
# --------------------------------------------------

@router.post("/{agent_id}/run")
def run_now(agent_id: str):
    """
    Trigger one autonomous cycle immediately.
    Runs in a background thread so the HTTP response
    returns immediately (non-blocking).
    """
    agent = get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    persona = agent.get("persona") or {"name": agent["name"], "domain": agent["domain"]}

    def _run():
        run_agent_now(agent_id, persona)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return {
        "agent_id": agent_id,
        "status":   "running",
        "message":  "Manual cycle triggered",
    }


# --------------------------------------------------
# AGENT STATUS  GET /api/agents/{agent_id}/status
# (Backward compat also on /api/agent/status)
# --------------------------------------------------

@router.get("/{agent_id}/status")
def agent_status(agent_id: str):
    agent = get_agent(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    running = is_scheduler_running(agent_id)

    return {
        "agent_id":          agent_id,
        "status":            agent["status"],
        "scheduler_running": running,
    }


# --------------------------------------------------
# LEGACY: GET /api/agent/status?agentId=...
# --------------------------------------------------

@router.get("/status")
def agent_status_legacy(agentId: str = Query(...)):
    running = is_scheduler_running(agentId)

    return {
        "agentId": agentId,
        "running": running,
        "status": "RUNNING" if running else "STOPPED",
    }


# --------------------------------------------------
# LEGACY: POST /api/agent/stop?agentId=...
# --------------------------------------------------

@router.post("/stop")
def stop_agent_legacy(agentId: str = Query(...)):
    stopped = stop_scheduler(agentId)

    return {
        "agentId": agentId,
        "status":  "STOPPED",
        "success": stopped,
    }