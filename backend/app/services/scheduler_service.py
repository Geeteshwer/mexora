import os

from apscheduler.schedulers.background import BackgroundScheduler

from app.services.autonomous_service import run_agent_cycle
from app.services import activity_service as act

# --------------------------------------------------
# SCHEDULER INTERVAL (env var with default)
# --------------------------------------------------

SCHEDULER_INTERVAL_MINUTES = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "2"))

# --------------------------------------------------
# SINGLE GLOBAL SCHEDULER
# --------------------------------------------------

scheduler = BackgroundScheduler()


def _get_job_id(agent_id: str) -> str:
    return f"agent_{agent_id}"


# --------------------------------------------------
# START SCHEDULER FOR AGENT
# --------------------------------------------------

def start_scheduler(agent_id: str, persona: dict):
    """
    Start (or resume) the autonomous scheduler for this agent.
    Prevents duplicate jobs — safe to call multiple times.
    """
    job_id = _get_job_id(agent_id)

    print(f"\n=== STARTING SCHEDULER FOR {agent_id} ===")

    if scheduler.get_job(job_id):
        print(f"Scheduler already running for agent: {agent_id}")
        return

    scheduler.add_job(
        run_agent_cycle,
        "interval",
        minutes=SCHEDULER_INTERVAL_MINUTES,
        args=[agent_id, persona],
        id=job_id,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    if not scheduler.running:
        scheduler.start()

    print(f"Scheduler started for agent: {agent_id}")

    act.log_event(
        act.SCHEDULER_START,
        f"Autonomous scheduler started — cycle every {SCHEDULER_INTERVAL_MINUTES} minute(s).",
        agent_id=agent_id,
        status=act.SUCCESS,
    )

    # Update agent status in DB
    try:
        from app.services.agent_service import update_agent_status
        update_agent_status(agent_id, "ACTIVE")
    except Exception:
        pass


# --------------------------------------------------
# STOP SCHEDULER FOR AGENT
# --------------------------------------------------

def stop_scheduler(agent_id: str) -> bool:
    """
    Remove the scheduler job for this agent.
    Returns True if a job was found and removed.
    """
    job_id = _get_job_id(agent_id)

    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

        print(f"Scheduler stopped for agent: {agent_id}")

        act.log_event(
            act.SCHEDULER_STOP,
            "Autonomous scheduler stopped.",
            agent_id=agent_id,
            status=act.WARNING,
        )

        # Update agent status in DB
        try:
            from app.services.agent_service import update_agent_status
            update_agent_status(agent_id, "PAUSED")
        except Exception:
            pass

        return True

    print(f"No scheduler found for agent: {agent_id}")
    return False


# --------------------------------------------------
# RUN ONCE — MANUAL TRIGGER
# --------------------------------------------------

def run_agent_now(agent_id: str, persona: dict):
    """
    Execute one autonomous cycle immediately.
    Does NOT affect the recurring scheduler.
    """
    print(f"\n=== MANUAL AGENT RUN: {agent_id} ===")

    act.log_event(
        act.CYCLE_START,
        "Manual 'Run Now' triggered.",
        agent_id=agent_id,
        status=act.RUNNING,
    )

    return run_agent_cycle(agent_id, persona)


# --------------------------------------------------
# STATUS HELPERS
# --------------------------------------------------

def is_scheduler_running(agent_id: str) -> bool:
    return scheduler.get_job(_get_job_id(agent_id)) is not None


def get_all_running_jobs() -> list:
    return [job.id for job in scheduler.get_jobs()]