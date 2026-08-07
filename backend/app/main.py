from fastapi import FastAPI

app = FastAPI(
    title="Mexora API",
    version="1.0.0"
)

@app.get("/")
def home():
    return {
        "message": "Mexora API is running!"
    }