from apscheduler.schedulers.background import BackgroundScheduler

from app.services.autonomous_service import run_agent_cycle


scheduler = BackgroundScheduler()


def start_scheduler(agent_id, persona):

    print(f"=== STARTING SCHEDULER FOR {agent_id} ===")

    if not scheduler.running:
        scheduler.start()

    scheduler.add_job(
        run_agent_cycle,
        "interval",
        minutes=2,
        args=[agent_id, persona],
        id=f"agent_{agent_id}",
        replace_existing=True
    )

    print(f"Scheduler started for agent: {agent_id}")