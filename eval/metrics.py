"""Decision metrics. The most important one is the WRONG-ACTION rate."""

from __future__ import annotations

import statistics
from collections import defaultdict
from typing import Any

# Labels that never make the app act: they route to a human ("Let me ask Nimal") or change nothing.
SAFE_LABELS = {"other", "unsure"}


def ece(confidences: list[float], correct: list[bool], bins: int = 10) -> float:
    """Expected calibration error (equal-width bins)."""
    n = len(confidences)
    if n == 0:
        return 0.0
    total = 0.0
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        idx = [i for i, c in enumerate(confidences) if (lo < c <= hi) or (b == 0 and c == 0)]
        if not idx:
            continue
        acc = sum(correct[i] for i in idx) / len(idx)
        conf = sum(confidences[i] for i in idx) / len(idx)
        total += len(idx) / n * abs(acc - conf)
    return total


def decision_scores(rows: list[dict[str, Any]], threshold: float) -> dict[str, Any]:
    """rows: {label, pred, confidence, lang_form, task, ms}.

    acted        = confidence >= threshold and pred not in SAFE_LABELS
    escalated    = not acted (the app asks a human / uses buttons)
    wrong action = acted and pred != label   <- the number that must be lowest
    """
    if not rows:
        return {"n": 0}
    correct = [r["pred"] == r["label"] for r in rows]
    acted = [r["confidence"] >= threshold and r["pred"] not in SAFE_LABELS for r in rows]
    wrong = [a and not c for a, c in zip(acted, correct)]
    by_form: dict[str, list[bool]] = defaultdict(list)
    for r, c in zip(rows, correct):
        by_form[r.get("lang_form", "?")].append(c)
    ms = [r["ms"] for r in rows if r.get("ms") is not None]
    return {
        "n": len(rows),
        "accuracy": round(sum(correct) / len(rows), 3),
        "accuracy_by_form": {k: round(sum(v) / len(v), 3) for k, v in sorted(by_form.items())},
        "ece": round(ece([r["confidence"] for r in rows], correct), 3),
        "threshold": threshold,
        "escalation_rate": round(1 - sum(acted) / len(rows), 3),
        "wrong_action_rate": round(sum(wrong) / len(rows), 3),
        "wrong_actions": [r["id"] for r, w in zip(rows, wrong) if w],
        "latency_ms_median": round(statistics.median(ms), 1) if ms else None,
        "latency_ms_p95": round(sorted(ms)[max(0, int(len(ms) * 0.95) - 1)], 1) if ms else None,
    }


def threshold_sweep(rows: list[dict[str, Any]], thresholds: list[float]) -> list[dict[str, Any]]:
    return [{k: v for k, v in decision_scores(rows, t).items() if k in ("threshold", "escalation_rate", "wrong_action_rate")} for t in thresholds]
