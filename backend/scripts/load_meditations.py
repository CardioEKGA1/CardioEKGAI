#!/usr/bin/env python3
# Copyright 2026 SoulMD, LLC. All rights reserved.
"""
Imports the generated meditation library (backend/meditations.json) into
the concierge_meditations table. Idempotent — matches on (source='library',
title, category) so re-running upserts instead of duplicating.

USAGE:
  DATABASE_URL=postgresql://... python3 backend/scripts/load_meditations.py

  # Dry run: parse + validate, no DB writes
  python3 backend/scripts/load_meditations.py --dry-run

  # Only load one category
  python3 backend/scripts/load_meditations.py --category soul_purpose

Safe to run on prod — existing 'manual' meditations (created via the
physician UI) are untouched.
"""
import argparse
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Ensure backend/ is importable so we can reuse the SQLAlchemy session.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal, ConciergeMeditation  # noqa: E402

JSON_PATH = Path(__file__).resolve().parents[1] / "meditations.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--category", type=str, default=None)
    args = ap.parse_args()

    if not JSON_PATH.exists():
        print(f"ERROR: {JSON_PATH} not found. Run generate_meditations.py first.")
        sys.exit(1)
    with open(JSON_PATH) as f:
        data = json.load(f)
    meds = data.get("meditations") or []
    if args.category:
        meds = [m for m in meds if m.get("category") == args.category]

    if not meds:
        print("No meditations to load.")
        return

    print(f"Loading {len(meds)} meditations from {JSON_PATH}…")
    if args.dry_run:
        by_cat: dict = {}
        for m in meds:
            by_cat.setdefault(m.get("category"), 0)
            by_cat[m["category"]] = by_cat[m["category"]] + 1
        for c, n in sorted(by_cat.items()):
            print(f"  {c:<26} {n}")
        print("\n(Dry run — no DB writes.)")
        return

    db = SessionLocal()
    inserted = updated = 0
    try:
        # Pre-index existing library rows for O(1) upsert lookup.
        existing = db.query(ConciergeMeditation).filter(ConciergeMeditation.source == "library").all()
        idx = {(m.category or "", (m.title or "").lower()): m for m in existing}

        for m in meds:
            cat   = m.get("category") or ""
            title = m.get("title") or ""
            if not cat or not title:
                continue
            key = (cat, title.lower())
            row = idx.get(key)
            if row is None:
                row = ConciergeMeditation(
                    title=title, category=cat,
                    description=m.get("category_label") or "",
                    duration_min=int(m.get("duration_minutes") or 10),
                    script=m.get("script") or "",
                    difficulty=m.get("difficulty"),
                    affirmations=m.get("affirmations") or [],
                    tags=m.get("tags") or [],
                    physician_notes=m.get("physician_notes") or "",
                    source="library",
                )
                db.add(row)
                inserted += 1
            else:
                row.description     = m.get("category_label") or row.description
                row.duration_min    = int(m.get("duration_minutes") or row.duration_min or 10)
                row.script          = m.get("script") or row.script
                row.difficulty      = m.get("difficulty") or row.difficulty
                row.affirmations    = m.get("affirmations") or row.affirmations
                row.tags            = m.get("tags") or row.tags
                row.physician_notes = m.get("physician_notes") or row.physician_notes
                updated += 1

            # Commit in chunks of 100 to keep the transaction small.
            if (inserted + updated) % 100 == 0:
                db.commit()
                print(f"  committed {inserted + updated}…")

        db.commit()
    finally:
        db.close()

    print(f"\nDone. Inserted {inserted}, updated {updated}.")


if __name__ == "__main__":
    main()
