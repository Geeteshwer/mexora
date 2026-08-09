from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.memory import initialize_memory

from app.routes.agent    import router as agent_router
from app.routes.feed     import router as feed_router
from app.routes.activity import router as activity_router
from app.routes.stats    import router as stats_router
from app.routes.test_ai  import router as test_ai_router


# ==================================================
# INITIALIZE DATABASE ON STARTUP
# ==================================================

initialize_memory()


# ==================================================
# APPLICATION
# ==================================================

app = FastAPI(
    title="Mexora API",
    version="2.0.0",
    description="Mexora — Autonomous AI Intelligence Platform"
)


# ==================================================
# CORS
# ==================================================

import os

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_raw.strip():
    allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "*",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# ROUTES
# ==================================================

# Feed router MUST be mounted before legacy agent router so /api/agent/feed is handled correctly
app.include_router(
    feed_router,
    prefix="/api/agent",
    tags=["Feed"],
)

# Primary agents CRUD + control endpoints (/api/agents)
app.include_router(
    agent_router,
    prefix="/api/agents",
    tags=["Agents"],
)

# Legacy agent routes (/api/agent/init, /api/agent/status, /api/agent/stop)
app.include_router(
    agent_router,
    prefix="/api/agent",
    tags=["Agent (Legacy)"],
)

# Activity log
app.include_router(
    activity_router,
    prefix="/api/activity",
    tags=["Activity"],
)

# Dashboard stats
app.include_router(
    stats_router,
    prefix="/api/stats",
    tags=["Stats"],
)

# AI test endpoint
app.include_router(
    test_ai_router,
    prefix="/api",
    tags=["Testing"],
)


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/")
def home():
    return {
        "message": "Mexora API v2 is running!",
        "docs":    "/docs",
    }


@app.get("/health")
def health():
    from app.services.gemini_service import is_gemini_available, GEMINI_QUOTA_EXHAUSTED
    from app.services.scheduler_service import get_all_running_jobs

    return {
        "status":          "ok",
        "gemini":          "QUOTA_EXHAUSTED" if GEMINI_QUOTA_EXHAUSTED else "AVAILABLE",
        "active_jobs":     get_all_running_jobs(),
    }