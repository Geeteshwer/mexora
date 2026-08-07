from fastapi import APIRouter
from app.services.agent_service import initialize_persona

router = APIRouter()


@router.post("/init")
def initialize_agent():

    persona = initialize_persona()

    return {
        "status": "success",
        "message": "Mexora AI initialized successfully",
        "persona": persona.model_dump()
    }