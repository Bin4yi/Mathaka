"""Freeze a test file: record its SHA-256 so it can never change silently.

  python -m eval.freeze intents_si/test.jsonl

After this, eval.run refuses to run if the file changes. Add new data to a NEW file.
"""

from __future__ import annotations

import json
import sys

from .common import FROZEN, SETS, read_jsonl, sha256_file


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    rel = sys.argv[1].replace("\\", "/")
    path = SETS / rel
    if not path.exists():
        raise SystemExit(f"no such file: {path}")
    frozen = json.loads(FROZEN.read_text(encoding="utf-8")) if FROZEN.exists() else {}
    if rel in frozen:
        raise SystemExit(f"{rel} is already frozen. Never change a frozen test.")
    if rel.endswith(".jsonl"):
        rows = read_jsonl(path)
        ids = [r["id"] for r in rows]
        if len(ids) != len(set(ids)):
            raise SystemExit("duplicate ids")
        if rel.startswith("intents_si/"):
            bad = [r["id"] for r in rows if r.get("writer", "").startswith("claude")]
            if bad:
                raise SystemExit(f"the frozen intents test must be written by real people, not Claude: {bad[:5]}")
    frozen[rel] = sha256_file(path)
    FROZEN.write_text(json.dumps(frozen, indent=2) + "\n", encoding="utf-8")
    print(f"frozen {rel}: {frozen[rel]}")


if __name__ == "__main__":
    main()
