#!/usr/bin/env python3
# Copyright 2026 SoulMD, LLC. All rights reserved.
"""
Merge shard meditation files into backend/meditations.json. Deduplicates
by (category, title.lower()) — last writer wins when titles collide.

USAGE:
  python3 backend/scripts/merge_meditations.py shard1.json shard2.json ...
"""
import json
import os
import sys
from pathlib import Path

MASTER = Path(__file__).resolve().parents[1] / "meditations.json"


def load(path: Path) -> dict:
    if not path.exists():
        return {"meditations": [], "meta": {}}
    with open(path) as f:
        return json.load(f)


def main():
    if len(sys.argv) < 2:
        print("usage: merge_meditations.py <shard.json> [<shard.json> ...]")
        sys.exit(1)

    master = load(MASTER)
    master.setdefault("meditations", [])
    # Index existing master by (category, title.lower())
    index = {(m.get("category"), (m.get("title") or "").strip().lower()): i
             for i, m in enumerate(master["meditations"])}

    added = 0
    updated = 0
    for shard_path_str in sys.argv[1:]:
        shard_path = Path(shard_path_str).resolve()
        shard = load(shard_path)
        for m in shard.get("meditations", []):
            cat = m.get("category")
            title = (m.get("title") or "").strip().lower()
            if not cat or not title:
                continue
            key = (cat, title)
            if key in index:
                # Overwrite with shard's version — shards are authoritative for
                # their categories once generated, in case master has a stale
                # partial entry from a prior run.
                master["meditations"][index[key]] = m
                updated += 1
            else:
                master["meditations"].append(m)
                index[key] = len(master["meditations"]) - 1
                added += 1

    # Atomic write.
    tmp = MASTER.parent / (MASTER.name + ".tmp")
    with open(tmp, "w") as f:
        json.dump(master, f, ensure_ascii=False, indent=2)
    os.replace(tmp, MASTER)

    total = len(master["meditations"])
    from collections import Counter
    cats = Counter(m.get("category") for m in master["meditations"])
    print(f"Merged {len(sys.argv)-1} shards → {MASTER}")
    print(f"  {added} new, {updated} overwritten, {total} total")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c:<24} {n}")


if __name__ == "__main__":
    main()
