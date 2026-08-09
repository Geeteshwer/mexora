from pydantic import BaseModel


class PersonaRequest(BaseModel):
    name: str
    domain: str


class AgentInitRequest(BaseModel):
    persona: PersonaRequest