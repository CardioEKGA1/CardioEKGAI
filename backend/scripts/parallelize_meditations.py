#!/usr/bin/env python3
# Copyright 2026 SoulMD, LLC. All rights reserved.
"""
Orchestrator: spawn N parallel generator processes, each filling a disjoint
set of categories, each writing to its own shard file seeded from the
master meditations.json. At the end, merge all shards back into master.

USAGE:
  python3 backend/scripts/parallelize_meditations.py --shards 5 --categories tail
  python3 backend/scripts/parallelize_meditations.py --categories soul_purpose,autoimmune,oncology_support

  # Pass-through generator args:
  python3 backend/scripts/parallelize_meditations.py --shards 6 --target 100

Safe to run while another sequential generator process is also running
against meditations.json — the shards write to their own files and only
merge at the end. Overlap on a category is handled by the merge
deduplicator (keyed on category + title.lower()).
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "meditations.json"
SHARDS_DIR = ROOT / "meditations_shards"
GEN = Path(__file__).parent / "generate_meditations.py"
MERGE = Path(__file__).parent / "merge_meditations.py"

# Categories in generator order. Tail = last 8 (farthest from sequential
# runner's starting point — minimal overlap with a concurrent front-to-back
# generator).
ALL_CATEGORIES = [
    "divine_light_healing", "universe_surrender", "vortex_alignment",
    "quantum_healing", "subconscious_healing", "chakra_balancing",
    "heart_coherence", "morning_activation", "evening_integration",
    "sleep_healing", "anxiety_release", "grief_and_loss", "chronic_pain",
    "immune_boost", "cardiovascular", "kidney_and_detox", "neurological",
    "oncology_support", "autoimmune", "soul_purpose",
]


def remaining_categories(target: int) -> list[str]:
    """Return categories that aren't yet at target, ordered tail-first."""
    if not MASTER.exists():
        return list(reversed(ALL_CATEGORIES))
    with open(MASTER) as f:
        data = json.load(f)
    counts: dict[str, int] = {c: 0 for c in ALL_CATEGORIES}
    for m in data.get("meditations", []):
        c = m.get("category")
        if c in counts:
            counts[c] += 1
    return [c for c in reversed(ALL_CATEGORIES) if counts.get(c, 0) < target]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shards", type=int, default=5, help="Max parallel processes.")
    ap.add_argument("--categories", type=str, default="tail",
                    help="'tail' for not-yet-complete tail, or comma-separated slugs.")
    ap.add_argument("--target", type=int, default=100)
    ap.add_argument("--batch-size", type=int, default=5)
    ap.add_argument("--sleep", type=float, default=0.6)
    ap.add_argument("--merge-interval", type=int, default=0,
                    help="If >0, merge shards into master every N seconds (lightweight snapshot).")
    args = ap.parse_args()

    if args.categories == "tail":
        cats = remaining_categories(args.target)
    else:
        cats = [c.strip() for c in args.categories.split(",") if c.strip()]
    if not cats:
        print("No categories to run — master appears complete.")
        return

    # Limit to --shards parallelism; cats beyond that tail off in later waves.
    SHARDS_DIR.mkdir(exist_ok=True)
    print(f"Planning {len(cats)} categories across {args.shards} parallel slots:")
    for c in cats:
        print(f"  - {c}")

    # Launch: one process per category, up to --shards at a time.
    # Each category is independent work, so we don't batch — we just cap
    # concurrent subprocesses.
    active: list[tuple[subprocess.Popen, str, Path]] = []
    queued = list(cats)
    shard_files: list[Path] = []
    t0 = time.time()

    def drain_completed():
        """Remove finished processes from active list."""
        still = []
        for proc, cat, path in active:
            if proc.poll() is None:
                still.append((proc, cat, path))
            else:
                elapsed = int(time.time() - t0)
                print(f"[{elapsed:>5}s] {cat} DONE (rc={proc.returncode})")
        active[:] = still

    last_merge = time.time()
    while queued or active:
        # Fill up to --shards concurrent.
        while queued and len(active) < args.shards:
            cat = queued.pop(0)
            shard_path = SHARDS_DIR / f"shard.{cat}.json"
            shard_files.append(shard_path)
            log_path = SHARDS_DIR / f"shard.{cat}.log"
            cmd = [
                sys.executable, str(GEN),
                "--category", cat,
                "--output", str(shard_path),
                "--input",  str(MASTER),
                "--target", str(args.target),
                "--batch-size", str(args.batch_size),
                "--sleep", str(args.sleep),
            ]
            elapsed = int(time.time() - t0)
            print(f"[{elapsed:>5}s] {cat} START → {shard_path.name}")
            log_fh = open(log_path, "w")
            proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT, cwd=str(ROOT.parent))
            active.append((proc, cat, shard_path))

        time.sleep(5)
        drain_completed()
        # Optional periodic lightweight merge so master reflects shard progress.
        if args.merge_interval > 0 and (time.time() - last_merge) > args.merge_interval:
            try:
                run_merge(shard_files)
                last_merge = time.time()
            except Exception as e:
                print(f"[warn] periodic merge failed: {type(e).__name__}: {e}")

    print("\nAll shards complete. Running final merge…")
    run_merge(shard_files)
    print("Done.")


def run_merge(shard_files: list[Path]) -> None:
    existing = [p for p in shard_files if p.exists()]
    if not existing:
        return
    subprocess.run(
        [sys.executable, str(MERGE), *[str(p) for p in existing]],
        check=True,
        cwd=str(ROOT.parent),
    )


if __name__ == "__main__":
    main()
