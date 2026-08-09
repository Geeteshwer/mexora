from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.agent import router as agent_router
from app.routes.feed import router as feed_router
from app.routes.test_ai import router as test_ai_router


app = FastAPI(
    title="Mexora API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    agent_router,
    prefix="/api/agent",
    tags=["Agent"]
)

app.include_router(
    feed_router,
    prefix="/api/agent",
    tags=["Feed"]
)

app.include_router(
    test_ai_router,
    prefix="/api",
    tags=["Testing"]
)


@app.get("/")
def home():
    return {
        "message": "Mexora API is running!"
    }