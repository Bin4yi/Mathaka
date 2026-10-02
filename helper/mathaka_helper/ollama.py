"""Tiny Ollama client (local only). Gemma runs on the laptop; nothing goes to the internet."""

from __future__ import annotations

import os
from typing import Any, Protocol

import httpx


class Generator(Protocol):
    """Anything that turns (system, user, images, schema) into model text."""

    model: str

    async def generate(self, system: str, user: str, schema: dict[str, Any], max_tokens: int, images: list[str] | None = None) -> str: ...


class OllamaGenerator:
    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: float = 300.0) -> None:
        self.base_url = (base_url or os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")).rstrip("/")
        self.model = model or os.environ.get("GEMMA_MODEL", "gemma3:4b")
        self._client = httpx.AsyncClient(timeout=timeout)

    async def generate(self, system: str, user: str, schema: dict[str, Any], max_tokens: int, images: list[str] | None = None) -> str:
        message: dict[str, Any] = {"role": "user", "content": user}
        if images:
            message["images"] = images  # base64, no data: prefix
        body = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, message],
            "format": schema,  # Ollama structured outputs: JSON schema
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": max_tokens},
        }
        res = await self._client.post(f"{self.base_url}/api/chat", json=body)
        res.raise_for_status()
        return str(res.json()["message"]["content"])

    async def ready(self) -> bool:
        try:
            res = await self._client.get(f"{self.base_url}/api/tags", timeout=3)
            return res.status_code == 200 and any(m.get("name", "").startswith(self.model.split(":")[0]) for m in res.json().get("models", []))
        except httpx.HTTPError:
            return False
