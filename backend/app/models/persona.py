from pydantic import BaseModel


class Persona(BaseModel):
    name: str
    role: str
    tone: str
    focus: str