"""Turn eval/sets/intents_si/train.jsonl into the row format of Laya's official Kaggle
fine-tune notebook (same columns as LocalLLaMA/typed-decisions: id, workflow, state,
questions, gold). The FROZEN test file is never exported.

  python -m eval.finetune.export_laya_dataset            # -> eval/finetune/out/mathaka_intents_train.jsonl
  python -m eval.finetune.export_laya_dataset --include-dev   # also the synthetic dev lines (NOT for the gate)
"""

from __future__ import annotations

import argparse
import json

from ..common import EVAL, PROMPTS, SETS, read_jsonl, write_jsonl

# soft targets: a little mass on the other options keeps the model honest about doubt
GOLD_P = 0.9


def to_row(r: dict) -> dict:
    d = PROMPTS["decisions"][r["task"]]
    options: dict[str, str] = d["options"]
    if r["label"] not in options:
        raise ValueError(f"{r['id']}: label {r['label']!r} not in {list(options)}")
    state = d["state"].replace("{text}", r["text"].replace('"', "'"))
    rest = (1 - GOLD_P) / (len(options) - 1)
    probs = {k: (GOLD_P if k == r["label"] else rest) for k in options}
    questions = {"decision": {"type": "choice", "instructions": d["question"], "criteria": options}}
    gold = {"decision": {"choice": r["label"], "probabilities": probs}}
    return {
        "id": r["id"],
        "workflow": f"mathaka-{r['task']}-{r['lang_form']}",
        "state": json.dumps(state, ensure_ascii=False),
        "questions": json.dumps(questions, ensure_ascii=False),
        "gold": json.dumps(gold, ensure_ascii=False),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--include-dev", action="store_true")
    a = ap.parse_args()
    rows = read_jsonl(SETS / "intents_si" / "train.jsonl")
    if a.include_dev:
        rows += read_jsonl(SETS / "intents_si" / "dev_claude.jsonl")
    test_ids = {r["id"] for r in read_jsonl(SETS / "intents_si" / "test.jsonl")}
    test_texts = {r["text"].strip().lower() for r in read_jsonl(SETS / "intents_si" / "test.jsonl")}
    leaked = [r["id"] for r in rows if r["id"] in test_ids or r["text"].strip().lower() in test_texts]
    if leaked:
        raise SystemExit(f"test lines found in train (leak): {leaked[:10]}")
    if not rows:
        raise SystemExit("no training rows: write eval/sets/intents_si/train.jsonl first (see its README)")
    out = EVAL / "finetune" / "out" / "mathaka_intents_train.jsonl"
    write_jsonl(out, [to_row(r) for r in rows])
    print(f"{len(rows)} rows -> {out}")


if __name__ == "__main__":
    main()
