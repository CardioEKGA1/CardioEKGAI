#!/usr/bin/env python3
# Copyright 2026 SoulMD, LLC. All rights reserved.
"""
Expand SoulMD Concierge oracle library from 50 seeds → ~2,000 high-quality
messages via the Claude API. Keeps the existing seed messages verbatim and
appends new ones per category, maintaining tone and style.

USAGE:
  ANTHROPIC_API_KEY=sk-ant-... python3 backend/scripts/expand_oracle.py

Cost estimate: 10 API calls × ~12K output tokens at Opus pricing ≈ $8-10
one-time. Output tokens dominate. The script is idempotent-ish: it reads
the current oracle_messages.json, keeps every existing entry, and only
adds new ones until the per-category target is reached. Re-run to top up.

Safety: the script writes to a tempfile first, then swaps atomically so
a mid-run failure can never leave oracle_messages.json in a bad state.
"""
import json
import os
import sys
import time
from pathlib import Path
from anthropic import Anthropic

TARGET_PER_CATEGORY = 200  # 10 cats × 200 = 2,000 total
MODEL = "claude-opus-4-6"
ORACLE_PATH = Path(__file__).resolve().parents[1] / "oracle_messages.json"

SYSTEM_PROMPT = """You are writing for the SoulMD Concierge Daily Oracle Card —
a feature that surfaces one short message per day to a concierge-medicine
patient. The voice must match this profile exactly:

- 2-5 short sentences. Maximum ~3 sentences when possible.
- Direct, second-person, warm but not saccharine.
- Integrative medicine + gentle Reiki aesthetic: references to breath,
  body, energy, chakras, healing, release are welcome but never preachy.
- No clinical prescriptions, no specific medical advice, no religious
  dogma, no astrology predictions, no fortune-telling.
- Titles are 2-4 words. Evocative, not cryptic. Proper title case.
- Messages must stand on their own — no "part 2 of" references, no
  numbered sequels, no assumed context from a previous pull.
- No repetition of openings across messages within a category ("Today..."
  or "Remember..." over and over is not acceptable).

The user will give you 5 anchor examples from one category and a target
count. Produce ONLY valid JSON matching the schema they specify."""

USER_TEMPLATE = """Category: {category_label}
Category guidance: {category_desc}

Here are 5 anchor messages for this category — match their tone, length,
sentence rhythm, and the balance between grounded/clinical and gentle/
spiritual language:

{anchors}

Now write {count} NEW messages in this same category. Every message must
be UNIQUE — no title may repeat, no opening sentence may repeat, and no
message may paraphrase another. Vary the entry point (sometimes a
question, sometimes an observation, sometimes an invitation, sometimes
a reassurance) but keep the total length modest (2-5 sentences).

Respond with ONLY a JSON object of the form:

{{ "messages": [
    {{ "title": "Title Here", "body": "Body here." }},
    ...
   ]
}}

No preamble, no explanation, just JSON."""

CATEGORY_GUIDANCE = {
    "self_healing":       "The body's own repair systems. Permission to rest. Healing as the absence of interference, not a thing you produce.",
    "energy_balance":     "Chakras, prana, charge/discharge cycles, somatic regulation, returning to center.",
    "gratitude":          "Small wonder. Overlooked miracles. Gratitude at the cellular level. Not performative.",
    "inner_peace":        "Stillness, non-doing, letting the day arrive. Mood as weather. Nothing to fix.",
    "wellness":           "Water, light, movement, sleep, nature contact. Simple medicines. Boundaries.",
    "integrative_health": "Both/and — science and spirit, protocol and intuition. Labs as one voice, not the final word.",
    "self_love":          "The mirror is not honest. The younger self listens. Receiving without earning.",
    "release":            "Letting go. Unclenching. What you are outgrowing. Forgiving yourself first.",
    "growth":             "The stretch. Smaller-than-expected next steps. The plateau as integration.",
    "divine_guidance":    "Intuition as signal, not noise. Being held. Detours as curriculum.",
}


def main():
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("ERROR: set ANTHROPIC_API_KEY in env")
        sys.exit(1)

    with open(ORACLE_PATH) as f:
        bank = json.load(f)

    client = Anthropic()
    messages = list(bank["messages"])
    categories = bank["categories"]

    # Per-category seeds.
    seeds_by_cat = {cat: [m for m in messages if m["category"] == cat] for cat in categories}
    next_id = max((m["id"] for m in messages), default=0) + 1

    # Build a set of existing titles (lowercased) to dedupe against.
    seen_titles = {m["title"].strip().lower() for m in messages}

    for cat_slug, cat_meta in categories.items():
        have = len(seeds_by_cat.get(cat_slug, []))
        need = max(0, TARGET_PER_CATEGORY - have)
        if need == 0:
            print(f"[=] {cat_slug}: already at {have}, skipping")
            continue
        print(f"[+] {cat_slug}: have {have}, generating {need}…")

        # Build anchor block from existing seeds (take up to 5).
        anchor_seeds = seeds_by_cat.get(cat_slug, [])[:5]
        anchors_text = "\n".join(
            f"Title: {m['title']}\nBody: {m['body']}" for m in anchor_seeds
        )
        user_msg = USER_TEMPLATE.format(
            category_label=cat_meta["label"],
            category_desc=CATEGORY_GUIDANCE.get(cat_slug, cat_meta["label"]),
            anchors=anchors_text or "(no seed messages — invent from the category guidance)",
            count=need,
        )

        # Retry loop with exponential backoff.
        for attempt in range(3):
            try:
                resp = client.messages.create(
                    model=MODEL,
                    max_tokens=16000,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_msg}],
                )
                text = resp.content[0].text
                # Strip optional fences.
                text = text.strip()
                if text.startswith("```"):
                    text = text.split("```", 2)[1]
                    if text.startswith("json"):
                        text = text[4:].strip()
                    text = text.rstrip("`").strip()
                parsed = json.loads(text)
                raw = parsed.get("messages", [])
                added = 0
                for m in raw:
                    title = (m.get("title") or "").strip()
                    body  = (m.get("body")  or "").strip()
                    if not title or not body:
                        continue
                    key = title.lower()
                    if key in seen_titles:
                        continue
                    seen_titles.add(key)
                    messages.append({
                        "id": next_id,
                        "category": cat_slug,
                        "title": title,
                        "body": body,
                    })
                    next_id += 1
                    added += 1
                print(f"    kept {added}/{len(raw)} new messages")
                break
            except Exception as e:
                wait = 2 ** attempt
                print(f"    attempt {attempt+1} failed: {type(e).__name__}: {str(e)[:160]} — retrying in {wait}s")
                time.sleep(wait)
        else:
            print(f"[!] {cat_slug}: gave up after 3 attempts")

    # Sort messages by id for readability, then write atomically.
    messages.sort(key=lambda m: m["id"])
    bank["messages"] = messages
    tmp = ORACLE_PATH.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(bank, f, indent=2, ensure_ascii=False)
    os.replace(tmp, ORACLE_PATH)
    print(f"\nWrote {ORACLE_PATH} — {len(messages)} total messages across {len(categories)} categories.")


if __name__ == "__main__":
    main()
