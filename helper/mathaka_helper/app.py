"""Mathaka laptop helper: the same JSON contracts as the on-device engines.

Run:  uvicorn mathaka_helper.app:app --host 0.0.0.0 --port 8787
Used when a phone is too weak for Gemma, and by the eval scripts.
Home Wi-Fi only. Set HELPER_TOKEN to require an X-Mathaka-Token header.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from .laya_engine import LayaEngine, laya_available
from .ollama import Generator, OllamaGenerator

PROMPTS: dict[str, Any] = json.loads((Path(__file__).resolve().parents[2] / "packages" / "core" / "prompts.json").read_text(encoding="utf-8"))
LANG_NAME = {"si": "Sinhala", "ta": "Tamil", "en": "English"}
Slot = Literal["morning", "noon", "evening", "night"]


# ---------- output schemas (mirror packages/core/src/ai.ts + prompts.ts) ----------
class PrescriptionRow(BaseModel):
    name: str
    strength: str = ""
    form: str = ""
    dose_count: float = Field(default=1, gt=0, le=10)
    frequency_raw: str = ""
    times: list[Slot] = []
    meal: Literal["before", "after", "any"] = "any"
    notes: str = ""
    confidence: float = Field(ge=0, le=1)


class PrescriptionDraft(BaseModel):
    rows: list[PrescriptionRow]


class Imprint(BaseModel):
    text: str
    confidence: float = Field(ge=0, le=1)


class Description(BaseModel):
    description: str = Field(max_length=200)


class Summary(BaseModel):
    sentences: list[str] = Field(min_length=1, max_length=8)


class DecideOut(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)


class Decision(BaseModel):
    label: str
    probs: dict[str, float]
    confidence: float


# ---------- inputs ----------
class ImageIn(BaseModel):
    image_base64: str


class DescribeIn(BaseModel):
    image_base64: str | None = None
    attributes: str = ""


class SummaryIn(BaseModel):
    language: Literal["si", "ta", "en"]
    name: str
    facts: list[str]


class DecideIn(BaseModel):
    state: str
    question: str
    options: list[str] = Field(min_length=2, max_length=19)  # keep option lists under 20


# ---------- helpers ----------
def fill(text: str, values: dict[str, str]) -> str:
    return re.sub(r"\{(\w+)\}", lambda m: values.get(m.group(1), m.group(0)), text)


def parse_loose(text: str) -> Any:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object")
    return json.loads(text[start : end + 1])


def strip_data_uri(b64: str) -> str:
    return re.sub(r"^data:[^,]*,", "", b64)


async def run_task(gen: Generator, key: str, out: type[BaseModel], values: dict[str, str] | None = None, images: list[str] | None = None, schema: dict[str, Any] | None = None) -> BaseModel:
    """One retry on bad JSON, then a clear 502 (same rule as the app)."""
    p = PROMPTS[key]
    user = fill(p["user"], values or {})
    last = ""
    for _ in range(2):
        last = await gen.generate(p["system"], user, schema or p["schema"], p["max_tokens"], images)
        try:
            return out.model_validate(parse_loose(last))
        except (ValueError, ValidationError):
            continue
    raise HTTPException(status_code=502, detail={"error": "AI output was not valid JSON for this task", "raw": last[:500]})


# ---------- app ----------
_generator: Generator | None = None
_laya: LayaEngine | None = None


def get_generator() -> Generator:
    global _generator
    if _generator is None:
        _generator = OllamaGenerator()
    return _generator


def get_laya() -> LayaEngine:
    global _laya
    if not laya_available():
        raise HTTPException(status_code=503, detail="Laya is not installed on this laptop (pip install laya).")
    if _laya is None:
        _laya = LayaEngine(os.environ.get("LAYA_MODEL", "laya"))
    return _laya


def check_token(x_mathaka_token: str | None = Header(default=None)) -> None:
    want = os.environ.get("HELPER_TOKEN")
    if want and x_mathaka_token != want:
        raise HTTPException(status_code=401, detail="bad token")


app = FastAPI(title="Mathaka laptop helper", dependencies=[Depends(check_token)])
# the web preview (localhost:8081) and phones on the home Wi-Fi call this
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])


@app.exception_handler(httpx.HTTPError)
async def ollama_down(_: Request, exc: httpx.HTTPError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": f"Gemma is not reachable. Is Ollama running? ({type(exc).__name__})"})


@app.get("/health")
async def health(gen: Generator = Depends(get_generator)) -> dict[str, Any]:
    ready = await gen.ready() if hasattr(gen, "ready") else True
    return {"ok": True, "gemma_model": gen.model, "gemma_ready": ready, "laya": laya_available()}


@app.post("/gemma/extract-prescription", response_model=PrescriptionDraft)
async def extract_prescription(body: ImageIn, gen: Generator = Depends(get_generator)) -> BaseModel:
    return await run_task(gen, "extract_prescription", PrescriptionDraft, images=[strip_data_uri(body.image_base64)])


@app.post("/gemma/pill-imprint", response_model=Imprint)
async def pill_imprint(body: ImageIn, gen: Generator = Depends(get_generator)) -> BaseModel:
    return await run_task(gen, "pill_imprint", Imprint, images=[strip_data_uri(body.image_base64)])


@app.post("/gemma/describe-pill", response_model=Description)
async def describe_pill(body: DescribeIn, gen: Generator = Depends(get_generator)) -> BaseModel:
    images = [strip_data_uri(body.image_base64)] if body.image_base64 else None
    return await run_task(gen, "describe_pill", Description, {"attributes": body.attributes}, images)


@app.post("/gemma/weekly-summary", response_model=Summary)
async def weekly_summary(body: SummaryIn, gen: Generator = Depends(get_generator)) -> BaseModel:
    facts = "\n".join(f"- {f}" for f in body.facts)
    return await run_task(gen, "weekly_summary", Summary, {"language": LANG_NAME[body.language], "name": body.name, "facts": facts})


def decision_from_label(out: DecideOut, options: list[str]) -> Decision:
    if out.label not in options:
        raise HTTPException(status_code=502, detail=f"label not in options: {out.label!r}")
    rest = (1 - out.confidence) / max(1, len(options) - 1)
    probs = {o: (out.confidence if o == out.label else rest) for o in options}
    total = sum(probs.values()) or 1
    probs = {k: v / total for k, v in probs.items()}
    return Decision(label=out.label, probs=probs, confidence=probs[out.label])


@app.post("/gemma/decide", response_model=Decision)
async def gemma_decide(body: DecideIn, gen: Generator = Depends(get_generator)) -> Decision:
    schema = {"type": "object", "properties": {"label": {"type": "string", "enum": body.options}, "confidence": {"type": "number"}}, "required": ["label", "confidence"]}
    out = await run_task(gen, "decide", DecideOut, {"state": body.state, "question": body.question, "options": ", ".join(body.options)}, schema=schema)
    assert isinstance(out, DecideOut)
    return decision_from_label(out, body.options)


@app.post("/laya/decide", response_model=Decision)
async def laya_decide(body: DecideIn, laya: LayaEngine = Depends(get_laya)) -> Decision:
    return Decision(**laya.choose(body.state, body.question, body.options))
