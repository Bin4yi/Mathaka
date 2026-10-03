"""Shared paths, frozen-set checks and small IO helpers for the eval."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "eval"
SETS = EVAL / "sets"
RUNS = EVAL / "runs"
FROZEN = SETS / "FROZEN.json"
PROMPTS = json.loads((ROOT / "packages" / "core" / "prompts.json").read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_frozen() -> dict[str, str]:
    """Refuse to run if any frozen test file changed. Never change a frozen test."""
    if not FROZEN.exists():
        return {}
    frozen: dict[str, str] = json.loads(FROZEN.read_text(encoding="utf-8"))
    for rel, want in frozen.items():
        p = SETS / rel
        if not p.exists():
            raise SystemExit(f"Frozen test file is missing: {rel}")
        got = sha256_file(p)
        if got != want:
            raise SystemExit(f"Frozen test file changed: {rel}\n  expected {want}\n  got      {got}\nRestore it from git. Add new data to a NEW file instead.")
    return frozen


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def new_run_dir(name: str) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    d = RUNS / f"{stamp}-{name}"
    (d / "raw").mkdir(parents=True, exist_ok=True)
    return d


def run_ts(script: str, *args: str) -> list[dict[str, Any]]:
    """Run a TypeScript eval script (shares code with the app) and parse its JSON lines."""
    npx = "npx.cmd" if sys.platform == "win32" else "npx"
    out = subprocess.run([npx, "tsx", str(EVAL / "ts" / script), *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0:
        raise RuntimeError(f"{script} failed:\n{out.stderr[-2000:]}")
    return [json.loads(line) for line in out.stdout.splitlines() if line.startswith("{")]
