#!/usr/bin/env python3
# Copyright 2026 SoulMD, LLC. All rights reserved.
"""
Generate the 2,000-meditation SoulMD Concierge library.

20 categories × 100 meditations each, each meditation weaving five
teachers (Martin / Bernstein / Hicks / Dispenza / Cannon). Output is
written to backend/meditations.json, idempotent and resumable — re-run
to pick up where you left off.

USAGE:
  # Full run (2,000 meditations, ~$25-45 on Sonnet)
  ANTHROPIC_API_KEY=sk-ant-... python3 backend/scripts/generate_meditations.py

  # Only fill one category
  python3 backend/scripts/generate_meditations.py --category soul_purpose

  # Smaller batch while testing
  python3 backend/scripts/generate_meditations.py --batch-size 3 --target 10

  # Dry run: shows what would be generated, no API calls
  python3 backend/scripts/generate_meditations.py --dry-run

The companion loader (backend/scripts/load_meditations.py) reads the
finished JSON and inserts rows into concierge_meditations. Run after
generation to populate the DB.

Resumability: after every successful batch the JSON is rewritten
atomically (tempfile + os.replace) so a Ctrl-C never leaves the
library in a bad state. On resume, the script counts existing titles
per category and continues until each category reaches --target
(default 100).
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

try:
    from anthropic import Anthropic
except Exception as e:
    print("ERROR: anthropic SDK missing. pip install anthropic")
    sys.exit(1)

# ─── Config ───────────────────────────────────────────────────────────────

MODEL = os.environ.get("MEDITATION_MODEL", "claude-sonnet-4-6")
OUT_PATH = Path(__file__).resolve().parents[1] / "meditations.json"
BATCH_DEFAULT = 5
PER_CATEGORY_DEFAULT = 100
DURATIONS = [5, 10, 15, 20, 30]
DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]

# Category slug → (display name, focus framework). Framework is passed to
# Claude as context for WHAT the category is really about.
CATEGORIES = {
    "divine_light_healing": (
        "Divine Light Healing",
        "Kingdom of Light teachings (Barbara Martin). Invocation of brilliant white-gold divine light "
        "descending from the cosmos. Reference the spiritual hierarchy — beings of light surrounding "
        "the patient. Guide the light in through the crown chakra to specific body areas or energy "
        "centers. Close with gratitude to the spiritual helpers.",
    ),
    "universe_surrender": (
        "Universe Surrender",
        "Gabby Bernstein style surrender. Releasing control, giving over to the Universe, fear-to-love "
        "shifts, miracle mindset. Include an ask-the-Universe moment. Close with a daily alignment "
        "practice phrase the patient can return to.",
    ),
    "vortex_alignment": (
        "Vortex Alignment",
        "Abraham-Hicks. Body as vibrational instrument. Move the patient up the emotional scale. "
        "Appreciation rampage. Bring them into the vortex — the place where healing flows naturally "
        "because they're in frequency with wellness. Feeling good NOW.",
    ),
    "quantum_healing": (
        "Quantum Healing",
        "Joe Dispenza. Heart-brain coherence breathing. Present-moment quantum field visualization. "
        "Future self who is already healed — let the patient feel that body. Neural rewiring: your "
        "body is the unconscious mind — speak to it directly.",
    ),
    "subconscious_healing": (
        "Subconscious Healing",
        "Dolores Cannon. Deep subconscious induction. Higher self dialogue. The body's innate wisdom "
        "speaks back. Cosmic / soul perspective on the current health journey. Close with a cellular "
        "healing command delivered in the patient's own voice.",
    ),
    "chakra_balancing": (
        "Chakra Balancing",
        "Seven chakra journey from root to crown. At each center: a Martin-flavor light infusion "
        "specific to the chakra, a vibrational frequency note, and a coherence breath before moving "
        "up. Close with the whole body glowing.",
    ),
    "heart_coherence": (
        "Heart Coherence",
        "HeartMath-inspired breathing throughout — hand on heart, 5 in, 5 out. Layer in elevated "
        "emotions one at a time: gratitude, love, joy. Each frequency is medicine. Feel already-"
        "healed in the present moment.",
    ),
    "morning_activation": (
        "Morning Activation",
        "Brief, bright morning practice. Check-in with the Universe. Miracle expectation for the day. "
        "Gratitude vortex with three specific appreciations. Intention from highest self — not a "
        "goal, a quality of being.",
    ),
    "evening_integration": (
        "Evening Integration",
        "Closing the day with gentleness. Review the day's gifts without judgment. Release what is "
        "not yours to carry. Ask spiritual support to tend to you while you sleep. Prepare the "
        "subconscious for overnight integration.",
    ),
    "sleep_healing": (
        "Sleep Healing",
        "Overnight cellular repair. Long, slow induction intended to accompany the patient into "
        "sleep. Divine light infusion of every organ system. Healing intelligence doing its work "
        "while the conscious mind rests. Ends softly — no sharp awakening.",
    ),
    "anxiety_release": (
        "Anxiety Release",
        "Fear-to-love transformation. Meet the anxiety without resistance, name what it is trying "
        "to protect. Vortex alignment: move the vibration up. Heart coherence to ground the "
        "nervous system. Affirm safety at the cellular level.",
    ),
    "grief_and_loss": (
        "Grief and Loss",
        "Soul perspective on transition. Honor the grief without trying to shorten it. Connection "
        "to the loved one through the Kingdom of Light. Higher self reminding the patient that love "
        "does not end with form. Gentle permission to carry both sorrow and hope.",
    ),
    "chronic_pain": (
        "Chronic Pain",
        "Mind-body pain relief. Address the body as the unconscious mind — speak to it. Divine "
        "light infusing the specific area of pain. Quantum field visualization of the healed body. "
        "Reassure the nervous system that it is safe.",
    ),
    "immune_boost": (
        "Immune Boost",
        "Cellular healing activation. The body's innate intelligence is the ultimate healer. "
        "Divine light strengthening the field around each cell. Speak appreciation to the immune "
        "system. Visualize vitality and coherence at every level.",
    ),
    "cardiovascular": (
        "Cardiovascular",
        "Heart healing. Hand on heart throughout. Appreciation for every beat that has ever been. "
        "Heart-brain coherence. Divine light flowing through the coronary arteries. Love as the "
        "literal medicine of the heart.",
    ),
    "kidney_and_detox": (
        "Kidney and Detox",
        "Nephrology-focused healing. Kidneys as filters of what is no longer needed — physically "
        "and energetically. Release on every exhale. Divine light washing through. Water, flow, "
        "cleansing as both metaphor and instruction.",
    ),
    "neurological": (
        "Neurological",
        "Brain healing and clarity. Neural pathways as paths of light. Heart-brain coherence. "
        "Future self with clear thinking speaking back. Quantum field holding a healed nervous "
        "system. Subconscious command for neural repair.",
    ),
    "oncology_support": (
        "Oncology Support",
        "Healing through a cancer journey — companion meditation, not promise. Hold both the "
        "reality of treatment and the truth of the soul. Divine light infusing the area of "
        "concern. Spiritual hierarchy walking alongside. Never bypass the medical team — this "
        "is accompaniment.",
    ),
    "autoimmune": (
        "Autoimmune",
        "Immune system harmony. Teach the body to recognize itself as home, not as enemy. Divine "
        "light reminding every cell of its original blueprint. Gentle soothing of the inflammatory "
        "response. Love in place of self-attack.",
    ),
    "soul_purpose": (
        "Soul Purpose",
        "Life meaning and calling. Access the akashic records. Meet the higher self who knows "
        "why the soul came here. Quantum field: feel the life that is already living you forward. "
        "Not a to-do — a quality of being you are remembering.",
    ),
}

SYSTEM_PROMPT = """You are a physician-healer writing guided meditations for the SoulMD Concierge library.

Every meditation you write weaves five teachers into one voice:
- Barbara Martin (Kingdom of Light): divine white-gold light, spiritual hierarchy, light infusions
- Gabby Bernstein: Universe has your back, surrender, fear-to-love, miracle mindset
- Abraham-Hicks: vibrational alignment, emotional guidance, in the vortex, high frequency
- Joe Dispenza: heart-brain coherence, quantum field, future self already healed, neural rewiring
- Dolores Cannon: subconscious as healer, higher self wisdom, soul blueprint, cosmic perspective

VOICE: Warm, unhurried, feminine, wise — like someone who has seen both sides of existence. Never
clinical. Never religious dogma. No "God" or specific religious figures; use "the Universe,"
"divine light," "higher self," "spiritual support," "healing intelligence," "beings of light."

LANGUAGE: Universal spiritual principles. Always weave in light, love, the Universe, healing
intelligence, the higher self, divine support. Avoid: "broken," "sick," "fix," "fight." Use:
"heal," "restore," "return to wholeness," "remember who you are."

STYLE: Second person ("you"). Present tense — healing is happening NOW, not someday. Natural
breath cues: "breathe in slowly," "a long exhale," "take a moment." Separate sections with blank
lines to invite pauses. No stage directions in brackets, no markdown. Just prose.

LENGTH: Match the duration — a meditation read aloud at a slow pace is roughly 120 words/minute,
so:
  5 min  → 500-650 words
  10 min → 1,000-1,300 words
  15 min → 1,500-1,900 words
  20 min → 2,000-2,400 words
  30 min → 2,800-3,400 words
Favor spaciousness over density. Better to say less with more silence than to overfill.

OUTPUT SHAPE: Return ONLY a JSON array of meditation objects — no prose, no preamble, no code
fences. Each object MUST match this exact schema:

[{
  "title":            "4-6 word evocative title, unique, never cliché",
  "duration_minutes": <integer: one of 5, 10, 15, 20, 30>,
  "difficulty":       "Beginner" | "Intermediate" | "Advanced",
  "script":           "<full meditation script as a single string with \\n\\n section breaks>",
  "affirmations":     ["5 to 7 second-person present-tense affirmations, each 8-20 words"],
  "tags":             ["5 to 10 lowercase tags — conditions, emotions, chakras, techniques"],
  "physician_notes":  "<1-2 sentences: when should a physician prescribe this meditation?>"
}]

Uniqueness rules:
- Titles within a category MUST all be different.
- Openings across the batch should not all begin the same way — vary the entry point (a question,
  an observation, an invitation, a reassurance, a sensation).
- Affirmations should be unique per meditation, not recycled across the batch.
"""


# ─── Library state ────────────────────────────────────────────────────────

def load_library() -> dict:
    if OUT_PATH.exists():
        with open(OUT_PATH) as f:
            data = json.load(f)
        data.setdefault("meditations", [])
        data.setdefault("meta", {})
        return data
    return {
        "version": 1,
        "generated_model": MODEL,
        "schema": {
            "categories": {slug: name for slug, (name, _) in CATEGORIES.items()},
            "durations": DURATIONS,
            "difficulties": DIFFICULTIES,
        },
        "meditations": [],
        "meta": {},
    }


def save_library(lib: dict):
    """Atomic write so an interrupt never leaves a half-file."""
    tmp = OUT_PATH.parent / (OUT_PATH.name + ".tmp")
    with open(tmp, "w") as f:
        json.dump(lib, f, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT_PATH)


# ─── Generation ───────────────────────────────────────────────────────────

def build_user_message(category_slug: str, count: int, existing_titles: list[str]) -> str:
    name, framework = CATEGORIES[category_slug]
    shown_titles = existing_titles[-40:]  # last 40 as dedupe anchors
    titles_block = "\n".join(f"- {t}" for t in shown_titles) if shown_titles else "(none yet)"
    # Ask for a spread of durations + difficulties so the category doesn't
    # skew toward one flavor. Claude uses its own distribution within the
    # hint.
    duration_hint = ", ".join(str(DURATIONS[i % len(DURATIONS)]) for i in range(count))
    return f"""Generate {count} unique meditations for the "{name}" category.

Category focus:
{framework}

Duration spread across this batch (one of each when possible): {duration_hint} minutes.
Vary difficulty too — mix Beginner / Intermediate / Advanced based on depth of practice required.

Recently generated titles in this category (do NOT repeat or closely paraphrase):
{titles_block}

Respond ONLY with the JSON array. Exactly {count} entries."""


def parse_batch(text: str) -> list[dict]:
    """Extract the JSON array. Tolerates a code fence if Claude adds one."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```", 2)[1]
        if t.startswith("json"):
            t = t[4:].strip()
        t = t.rstrip("`").strip()
    # Claude sometimes starts with explanatory prose despite the system prompt.
    # Find the first '[' and last ']' that wraps a valid JSON array.
    first = t.find("[")
    last  = t.rfind("]")
    if first == -1 or last == -1 or last < first:
        raise ValueError("no JSON array in response")
    return json.loads(t[first:last + 1])


def validate_meditation(m: dict, category_slug: str) -> str | None:
    """Return an error message if invalid, else None."""
    required = ("title", "duration_minutes", "difficulty", "script", "affirmations", "tags", "physician_notes")
    for k in required:
        if k not in m:
            return f"missing key '{k}'"
    if not isinstance(m["title"], str) or not m["title"].strip():
        return "empty title"
    if m["duration_minutes"] not in DURATIONS:
        return f"duration_minutes {m['duration_minutes']} not in {DURATIONS}"
    if m["difficulty"] not in DIFFICULTIES:
        return f"difficulty '{m['difficulty']}' invalid"
    if not isinstance(m["script"], str) or len(m["script"].strip()) < 200:
        return "script too short (<200 chars)"
    if not isinstance(m["affirmations"], list) or not (3 <= len(m["affirmations"]) <= 10):
        return "affirmations must be list of 3-10 items"
    if not isinstance(m["tags"], list) or not (3 <= len(m["tags"]) <= 15):
        return "tags must be list of 3-15 items"
    if not isinstance(m["physician_notes"], str):
        return "physician_notes must be string"
    return None


def generate_batch(client: Anthropic, category_slug: str, count: int, existing_titles: list[str], dry_run: bool = False) -> list[dict]:
    if dry_run:
        # Deterministic filler so the rest of the pipeline can be tested offline.
        # Meets the validator's minimums: script >= 200 chars, 3-10 affirmations,
        # 3-15 tags.
        out = []
        base_idx = len(existing_titles)
        for i in range(count):
            out.append({
                "title": f"[Dry] {CATEGORIES[category_slug][0]} {base_idx + i + 1}",
                "duration_minutes": DURATIONS[i % len(DURATIONS)],
                "difficulty": DIFFICULTIES[i % len(DIFFICULTIES)],
                "script": ("This is a dry-run placeholder meditation. " * 20).strip(),
                "affirmations": [
                    f"You are held in light — affirmation {base_idx + i}.",
                    "You return to wholeness now.",
                    "Your body remembers its blueprint.",
                    "The Universe conspires in your favor.",
                    "You are safe, you are loved, you are home.",
                ],
                "tags": ["dry_run", category_slug, "placeholder", "test"],
                "physician_notes": "Dry run; not for prescription.",
            })
        return out

    user = build_user_message(category_slug, count, existing_titles)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user}],
    )
    text = resp.content[0].text if resp.content else ""
    return parse_batch(text)


# ─── Main loop ────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch-size", type=int, default=BATCH_DEFAULT, help="Meditations per API call.")
    ap.add_argument("--target", type=int, default=PER_CATEGORY_DEFAULT, help="Meditations per category (default 100).")
    ap.add_argument("--category", type=str, default=None, help="Only fill this one category slug.")
    ap.add_argument("--dry-run", action="store_true", help="Don't call the API; emit placeholders.")
    ap.add_argument("--sleep", type=float, default=0.6, help="Seconds between API calls.")
    args = ap.parse_args()

    if not args.dry_run and not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: set ANTHROPIC_API_KEY in env (or backend/.env)")
        sys.exit(1)

    client = Anthropic() if not args.dry_run else None  # type: ignore

    lib = load_library()
    existing = lib["meditations"]
    # Index by category + dedupe key.
    by_category: dict[str, list[dict]] = {slug: [] for slug in CATEGORIES}
    for m in existing:
        c = m.get("category")
        if c in by_category:
            by_category[c].append(m)

    categories_to_run = [args.category] if args.category else list(CATEGORIES.keys())
    for c in categories_to_run:
        if c not in CATEGORIES:
            print(f"[!] unknown category: {c}")
            continue

    print(f"\nSoulMD Concierge · meditation library generator")
    print(f"  model:      {MODEL}{' (dry-run)' if args.dry_run else ''}")
    print(f"  output:     {OUT_PATH}")
    print(f"  target/cat: {args.target}")
    print(f"  batch:      {args.batch_size}")
    print()

    total_added = 0
    for slug in categories_to_run:
        name, _ = CATEGORIES[slug]
        have = len(by_category[slug])
        if have >= args.target:
            print(f"[=] {name} · already at {have}/{args.target}, skipping")
            continue

        need = args.target - have
        print(f"[+] {name} · have {have}/{args.target}, generating {need}…")

        empty_batches = 0
        MAX_EMPTY = 3  # bail on a category that's not producing kept meditations
        while have < args.target:
            want = min(args.batch_size, args.target - have)
            titles = [m["title"] for m in by_category[slug]]
            # Three attempts before giving up on this batch.
            success = False
            added_this_batch = 0
            for attempt in range(3):
                try:
                    batch = generate_batch(client, slug, want, titles, dry_run=args.dry_run)
                except Exception as e:
                    wait = 2 ** attempt
                    print(f"    attempt {attempt+1} failed: {type(e).__name__}: {str(e)[:160]} — retrying in {wait}s")
                    time.sleep(wait)
                    continue

                seen_titles_lower = {t.lower() for t in titles}
                for m in batch:
                    err = validate_meditation(m, slug)
                    if err:
                        print(f"    skip (invalid): {err}")
                        continue
                    tl = m["title"].strip().lower()
                    if tl in seen_titles_lower:
                        continue
                    seen_titles_lower.add(tl)
                    m["category"] = slug
                    m["category_label"] = name
                    by_category[slug].append(m)
                    existing.append(m)
                    added_this_batch += 1
                have += added_this_batch
                total_added += added_this_batch
                print(f"    batch kept {added_this_batch}/{len(batch)} · category {have}/{args.target}")
                # Save after every batch.
                lib["meditations"] = existing
                lib["meta"]["last_run_at"] = int(time.time())
                save_library(lib)
                success = True
                break
            if not success:
                print(f"[!] {name} · gave up after 3 attempts, current total {have}")
                break
            # Guard against infinite loops: if three consecutive batches
            # land zero kept meditations, stop (something is wrong with the
            # prompt or validator for this category).
            if added_this_batch == 0:
                empty_batches += 1
                if empty_batches >= MAX_EMPTY:
                    print(f"[!] {name} · {MAX_EMPTY} empty batches in a row — stopping category")
                    break
            else:
                empty_batches = 0
            if args.sleep and not args.dry_run:
                time.sleep(args.sleep)

    print(f"\nDone. Added {total_added} meditations this run.")
    print(f"Total in library: {len(existing)}")
    counts = {slug: len(v) for slug, v in by_category.items()}
    for slug, n in counts.items():
        bar = "█" * (n * 30 // max(args.target, 1))
        print(f"  {CATEGORIES[slug][0]:<22} {n:>4}/{args.target}  {bar}")
    print(f"\nLoader next: python3 backend/scripts/load_meditations.py")


if __name__ == "__main__":
    main()
