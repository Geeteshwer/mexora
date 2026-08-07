from fastapi import FastAPI

from app.routes.agent import router as agent_router

app = FastAPI(
    title="Mexora API",
    version="1.0.0"
)

app.include_router(
    agent_router,
    prefix="/api/agent",
    tags=["Agent"]
)

@app.get("/")
def home():
    return {
        "message": "Mexora API is running!"
    }