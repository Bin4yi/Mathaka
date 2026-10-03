"""Decision engines compared in the eval. Same wording for all (packages/core/prompts.json)."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Protocol

from .common import PROMPTS

DECISIONS = PROMPTS["decisions"]
OPTIONS = {"intent": list(DECISIONS["intent"]["options"]), "yesno": list(DECISIONS["yesno"]["options"])}


def wording(task: str, text: str) -> tuple[str, str, dict[str, str]]:
    d = DECISIONS[task]
    return d["state"].replace("{text}", text.replace('"', "'")), d["question"], d["options"]


class Engine(Protocol):
    name: str

    def decide(self, task: str, text: str) -> tuple[str, dict[str, float], float]: ...


class RuleEngine:
    """The elder-phone fallback: no voice understanding, buttons only -> always escalate."""

    name = "rule (buttons only)"

    def decide(self, task: str, text: str) -> tuple[str, dict[str, float], float]:
        opts = OPTIONS[task]
        safe = "other" if task == "intent" else "unsure"
        return safe, {o: (1.0 if o == safe else 0.0) for o in opts}, 1.0


class LayaTorch:
    """Laya through the official Python package (PyTorch)."""

    def __init__(self, model: str) -> None:
        from laya import Router

        self.model = model  # "multilingual" or "english"
        self.name = f"laya-{model} (pytorch)"
        self.router = Router()

    def decide(self, task: str, text: str) -> tuple[str, dict[str, float], float]:
        state, question, options = wording(task, text)
        q = {"decision": {"type": "choice", "instructions": question, "criteria": options}}
        res = self.router.predict(state, q, model=self.model)
        ans = res["answers"]["decision"]
        raw = ans.get("probabilities") or {}
        probs = {o: float(raw.get(o, 0.0)) for o in options} if isinstance(raw, dict) else dict(zip(options, map(float, raw)))
        total = sum(probs.values()) or 1.0
        probs = {k: v / total for k, v in probs.items()}
        label = max(probs, key=probs.__getitem__)
        return label, probs, probs[label]


class GemmaOllama:
    """Gemma through Ollama on the laptop (same decide prompt as the app)."""

    def __init__(self, model: str | None = None, url: str | None = None) -> None:
        self.model = model or os.environ.get("GEMMA_MODEL", "gemma3:4b")
        self.url = (url or os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")).rstrip("/")
        self.name = f"gemma ({self.model}, ollama)"

    def available(self) -> bool:
        try:
            with urllib.request.urlopen(f"{self.url}/api/tags", timeout=3) as r:
                tags = json.load(r)
            return any(m["name"].startswith(self.model.split(":")[0]) for m in tags.get("models", []))
        except (urllib.error.URLError, OSError, ValueError):
            return False

    def decide(self, task: str, text: str) -> tuple[str, dict[str, float], float]:
        state, question, options = wording(task, text)
        p = PROMPTS["decide"]
        labels = list(options)
        user = p["user"].replace("{state}", state).replace("{question}", question).replace("{options}", ", ".join(f"{k} ({v})" for k, v in options.items()))
        schema = {"type": "object", "properties": {"label": {"type": "string", "enum": labels}, "confidence": {"type": "number"}}, "required": ["label", "confidence"]}
        body = {"model": self.model, "messages": [{"role": "system", "content": p["system"]}, {"role": "user", "content": user}], "format": schema, "stream": False, "options": {"temperature": 0.1, "num_predict": 30}}
        req = urllib.request.Request(f"{self.url}/api/chat", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=300) as r:
            out = json.loads(json.load(r)["message"]["content"])
        label = out["label"] if out.get("label") in labels else labels[-1]
        conf = max(0.0, min(1.0, float(out.get("confidence", 0.5))))
        rest = (1 - conf) / max(1, len(labels) - 1)
        return label, {o: (conf if o == label else rest) for o in labels}, conf


def timed(engine: Engine, task: str, text: str) -> dict[str, Any]:
    t0 = time.perf_counter()
    label, probs, conf = engine.decide(task, text)
    return {"pred": label, "probs": probs, "confidence": conf, "ms": round((time.perf_counter() - t0) * 1000, 1)}
