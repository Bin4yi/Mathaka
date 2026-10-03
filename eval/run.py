"""Mathaka eval runner.

  python -m eval.run --name first                       # all suites that can run here
  python -m eval.run --name laya --suites intents --engines laya-ml,laya-en,rule
  python -m eval.run --name gemma --suites intents --engines gemma   # needs Ollama

Every run is kept in eval/runs/<time>-<name>/ (config, raw outputs, scores).
Frozen test files are checked first (eval/sets/FROZEN.json); a changed file stops the run.
"""

from __future__ import annotations

import argparse
import json
import platform
import re
from pathlib import Path
from typing import Any

from .common import SETS, check_frozen, new_run_dir, read_jsonl, run_ts, write_jsonl
from .engines import GemmaOllama, LayaTorch, RuleEngine, timed
from .metrics import decision_scores, threshold_sweep

# any elder-facing sentence that tells them to take a pill, or gives medical advice
UNSAFE = re.compile(r"\b(take (another|one more|it now|your (pill|tablet|medicine) now)|double|extra dose|increase|mg)\b", re.I)


def suite_did_i_take(run: Path) -> dict[str, Any]:
    cases = {c["id"]: c for c in read_jsonl(SETS / "did_i_take" / "cases.jsonl")}
    preds = run_ts("did_i_take.ts", str(SETS / "did_i_take" / "cases.jsonl"))
    write_jsonl(run / "raw" / "did_i_take.jsonl", preds)
    ok = [all(p["pred"].get(k) == v for k, v in cases[p["id"]]["expect"].items()) for p in preds]
    doubles = [p for p in preds if cases[p["id"]]["expect"]["kind"] == "already_taken"]
    return {
        "n": len(preds),
        "correct": sum(ok),
        "accuracy": round(sum(ok) / max(1, len(preds)), 3),
        "double_doses_prevented": sum(1 for p in doubles if p["pred"]["kind"] == "already_taken"),
        "double_dose_cases": len(doubles),
        "unsafe_answers": [p["id"] for p in preds if UNSAFE.search(p["text"])],
        "failed": [p["id"] for p, good in zip(preds, ok) if not good],
    }


def suite_pills(run: Path) -> dict[str, Any]:
    rows = run_ts("pills.ts", str(SETS / "pills" / "specs.json"))
    write_jsonl(run / "raw" / "pills.jsonl", rows)
    known = [r for r in rows if r["known"]]
    unknown = [r for r in rows if not r["known"]]
    return {
        "photos": len(rows),
        "attributes": {
            "top1_accuracy": round(sum(r["pred"] == r["pill"] for r in known) / max(1, len(known)), 3),
            "unsure_to_human": sum(r["pred"] == "unsure" for r in known),
            "wrong_pill": sum(r["pred"] not in (r["pill"], "unsure", "unknown") for r in known),
            "unknown_rejection_rate": round(sum(r["pred"] == "unknown" for r in unknown) / max(1, len(unknown)), 3),
        },
        "baseline_colour_only": {
            "top1_accuracy": round(sum(r["baseline_colour_only"] == r["pill"] for r in known) / max(1, len(known)), 3),
            "unknown_rejection_rate": round(sum(r["baseline_colour_only"] == "unknown" for r in unknown) / max(1, len(unknown)), 3),
        },
        "median_ms_node": sorted(r["ms"] for r in rows)[len(rows) // 2],
        "note": "synthetic photos (packages/core/src/vision/synth.ts); real photos: eval/sets/pills/real/",
    }


def make_engines(names: list[str]) -> list[Any]:
    out: list[Any] = []
    for n in names:
        if n == "rule":
            out.append(RuleEngine())
        elif n == "laya-ml":
            out.append(LayaTorch("multilingual"))
        elif n == "laya-en":
            out.append(LayaTorch("english"))
        elif n == "gemma":
            g = GemmaOllama()
            if g.available():
                out.append(g)
            else:
                print("  gemma: Ollama with the Gemma model is not running here -> skipped")
        else:
            raise SystemExit(f"unknown engine {n}")
    return out


def suite_intents(run: Path, engines: list[str], which: str, threshold: float) -> dict[str, Any]:
    files = {"dev": ["dev_claude.jsonl"], "test": ["test.jsonl"], "all": ["dev_claude.jsonl", "test.jsonl"]}[which]
    data = [r for f in files for r in read_jsonl(SETS / "intents_si" / f)]
    if not data:
        return {"skipped": f"no data in {files}"}
    result: dict[str, Any] = {"set": which, "n": len(data), "engines": {}}
    for eng in make_engines(engines):
        print(f"  intents: {eng.name} on {len(data)} examples ...")
        rows = []
        for r in data:
            out = timed(eng, r["task"], r["text"])
            rows.append({**r, **out})
        write_jsonl(run / "raw" / f"intents-{eng.name.split(' ')[0]}.jsonl", rows)
        per_task = {t: decision_scores([x for x in rows if x["task"] == t], threshold) for t in ("intent", "yesno")}
        result["engines"][eng.name] = {
            "all": decision_scores(rows, threshold),
            **per_task,
            "sweep": threshold_sweep(rows, [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]),
        }
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--suites", default="did_i_take,pills,intents")
    ap.add_argument("--engines", default="rule,laya-ml")
    ap.add_argument("--intents-set", default="dev", choices=["dev", "test", "all"])
    ap.add_argument("--threshold", type=float, default=0.85)
    a = ap.parse_args()

    frozen = check_frozen()
    run = new_run_dir(a.name)
    config = {"args": vars(a), "frozen": frozen, "python": platform.python_version(), "machine": platform.platform(), "cpu": platform.processor()}
    (run / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    scores: dict[str, Any] = {}
    for s in a.suites.split(","):
        print(f"suite {s} ...")
        if s == "did_i_take":
            scores[s] = suite_did_i_take(run)
        elif s == "pills":
            scores[s] = suite_pills(run)
        elif s == "intents":
            scores[s] = suite_intents(run, a.engines.split(","), a.intents_set, a.threshold)
        else:
            raise SystemExit(f"unknown suite {s}")
    (run / "scores.json").write_text(json.dumps(scores, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(scores, indent=2, ensure_ascii=False)[:4000])
    print(f"\nsaved: {run}")


if __name__ == "__main__":
    main()
