"""FastAPI entrypoint for CBSS-AI."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app import __version__
from app.assistant import Assistant

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="CBSS-AI", version=__version__)
assistant = Assistant()


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to send to the assistant.")


class ChatResponse(BaseModel):
    reply: str
    intent: str
    meta: dict = {}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": __version__}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    result = assistant.respond(request.message)
    return ChatResponse(reply=result.reply, intent=result.intent, meta=result.meta)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
