"""Laya (open, non-generative decision model) behind the same /decide contract.

Laya cannot write text: it only picks one of the given options and gives calibrated
probabilities. That is exactly what we want for decisions about a vulnerable person.
Optional: `pip install laya` (needs torch). The app works without it.
"""

from __future__ import annotations

import importlib.util
from typing import Any


def laya_available() -> bool:
    return importlib.util.find_spec("laya") is not None


def _probs_from_answer(answer: dict[str, Any], options: list[str]) -> dict[str, float]:
    raw = answer.get("probabilities")
    if isinstance(raw, dict):
        probs = {o: float(raw.get(o, 0.0)) for o in options}
    elif isinstance(raw, (list, tuple)) and len(raw) == len(options):
        probs = {o: float(p) for o, p in zip(options, raw)}
    else:  # fall back to the chosen label + its confidence
        label = answer["choice"]
        conf = float(answer.get("answer_confidence", answer.get("confidence", 1.0)))
        rest = (1 - conf) / max(1, len(options) - 1)
        probs = {o: (conf if o == label else rest) for o in options}
    total = sum(probs.values()) or 1.0
    return {k: v / total for k, v in probs.items()}


class LayaEngine:
    """`model`: 'laya' (English), 'laya-multilingual', or a local fine-tuned path."""

    def __init__(self, model: str = "laya") -> None:
        from laya import Router  # imported lazily: torch is big

        self.model = model
        self.router = Router()

    def choose(self, state: str, question: str, options: list[str]) -> dict[str, Any]:
        q = {"decision": {"type": "choice", "instructions": question, "criteria": {o: o for o in options}}}
        kwargs: dict[str, Any] = {}
        if self.model in ("english", "multilingual"):
            kwargs["model"] = self.model
        elif self.model == "laya-multilingual":
            kwargs["model"] = "multilingual"
        result = self.router.predict(state, q, **kwargs)
        answer = result["answers"]["decision"]
        probs = _probs_from_answer(answer, options)
        label = max(probs, key=probs.__getitem__)
        return {"label": label, "probs": probs, "confidence": probs[label]}
