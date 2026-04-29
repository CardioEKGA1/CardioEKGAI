#!/usr/bin/env python3
# Copyright 2026 SoulMD, LLC. All Rights Reserved.
"""
Seed the meditate_oracle_messages table with 500 unique Yogananda-inspired
short messages (2-4 sentences each). Idempotent: only inserts when the
table is empty, so it's safe to wire into application boot. Also runnable
as a standalone Railway one-off command:

    python -m backend.scripts.seed_yogananda_messages

The phrase pool below is hand-written. Messages are composed by
deterministically walking a finite combination of opening/middle/closing
phrases with multiple sentence templates — no API calls, no randomness,
no external data. The same boot will always produce the same 500 rows.
"""

from __future__ import annotations
import os
import sys
from datetime import datetime
from typing import Iterable


# ──────────────────────────────────────────────────────────────────────────
# Phrase pools — Yogananda-flavored: Self-realization, divine love, inner
# stillness, God-union, cosmic consciousness. Hand-curated; not generated.
# ──────────────────────────────────────────────────────────────────────────

OPENINGS: list[str] = [
    "You are not the body, nor the restless mind.",
    "Beloved, beneath the noise of the world a quiet altar waits.",
    "The Self that you are has never been born, and shall never die.",
    "Within you, vast as the night sky, dwells the One who dreams the worlds.",
    "Today the breath itself is a doorway — step through gently.",
    "The river of life flows from a single Source, and you are its very current.",
    "What you seek with such longing is already seated in the cave of your heart.",
    "The mind is a small lamp; the soul is the sun that lit it.",
    "Beneath the layers of fear and forgetting, the Divine is watching with love.",
    "You came from silence and you return to silence — meditate, and remember.",
    "In every heartbeat, the Infinite is whispering its only word: come home.",
    "Stillness is not absence; it is the fullness of presence.",
    "The eye of the soul opens only when the eye of the world rests.",
    "Beloved seeker, your true country is the kingdom of the Spirit.",
    "Each indrawn breath is the tide of God within you.",
    "Hold this truth gently: you are loved beyond all measure or condition.",
    "When the storm of desire quiets, the lake of consciousness mirrors the moon.",
    "All the saints and sages knelt at the same hidden door — the door inside.",
    "Your soul is older than the stars and as new as the morning.",
    "The Infinite has chosen this body, this hour, this breath — for joy.",
    "What you call your life is a single thought of the Eternal.",
    "Listen — the silence between two thoughts is the whisper of the Beloved.",
    "Every grain of dust dances to the music of God; how much more the soul of you.",
    "There is a place in you that pain has never touched.",
    "The light you long for is the very light by which you long.",
    "When you sit in stillness, the universe sits with you.",
    "You are a wave; the ocean has not forgotten.",
    "Beneath every breath, the Beloved breathes with you.",
    "Joy is your native tongue — meditation is the remembering.",
    "The Infinite has sent the Self as a quiet messenger to your own heart.",
]

FIRST_MIDDLES: list[str] = [
    "Every cell of your body hums with the rhythm of the Eternal.",
    "Divine love is not earned — it is recognized.",
    "The Self is the witness: unchanging, unborn, untouched.",
    "All that is mortal will fall away; only the Soul remains.",
    "The breath is the cord that ties the body to the Spirit.",
    "Concentration is the lamp that reveals the inner sky.",
    "What you give in stillness is multiplied a thousandfold in the world.",
    "The path is straight, but the doorway is narrow as a single thought.",
    "Bliss is not produced — it is uncovered.",
    "The wandering mind is the mind that has forgotten its source.",
    "God-realization is the only success that does not turn to dust.",
    "Devotion is the wing on which intuition flies.",
    "Practice is the kindling, grace is the flame.",
    "The river does not return to the mountain; the soul does not return to the body.",
    "You cannot grasp the Infinite, but you can let it grasp you.",
    "Every act offered to the Divine becomes a prayer.",
    "The peace of meditation is the same peace that holds the galaxies.",
    "What appears as coincidence is the soft footstep of grace.",
    "Each soul is a unique window through which the One Light shines.",
    "Inwardness is not retreat — it is the deeper engagement.",
    "Truth is not learned, only remembered.",
    "Silence is the original language of God.",
    "The soul does not seek pleasure; it seeks its own freedom.",
    "Love is the nature of the Self; everything else is borrowed.",
    "The breath is shorter than a sigh, the soul vaster than the sky.",
    "What you offer in love multiplies in the unseen.",
    "Concentration is the magnetism of the soul.",
    "In stillness, the small self loosens its hold on the great Self.",
    "Compassion is the natural fragrance of the awakened heart.",
    "Karma is the long arc that bends always toward freedom.",
    "Wherever the breath flows, awareness can follow.",
    "The disciplined mind is the freed mind.",
    "Faith is the rope by which the soul climbs out of the well of the world.",
    "Desire scatters the soul; surrender gathers it home.",
    "Joy is the soul's unmistakable signature.",
]

SECOND_MIDDLES: list[str] = [
    "Sit, breathe, and let the petals of awareness open one by one.",
    "Hold this thought like a small flame against a vast wind.",
    "Watch the breath as a mother watches her sleeping child.",
    "Let the heart rest as a flower rests on a still pond.",
    "Allow the body to soften, the breath to lengthen, the mind to listen.",
    "Drink the silence as a thirsty soul drinks the rain.",
    "Let go of effort as a tree releases its leaves in autumn.",
    "Welcome each thought with the patience of an old friend.",
    "Carry this truth into the day as you carry a candle through wind.",
    "Meet the world with eyes washed clean by stillness.",
    "Walk lightly, as though every step were a sacred offering.",
    "Inhabit the body as a kind guest — gently, fully, with reverence.",
    "Let the breath be a thread that draws you home.",
    "Receive each moment as a fresh bowl filled with grace.",
    "Look upon all beings as wandering forms of your own Self.",
    "Open the hands; what is yours by right will return.",
    "Offer the day to the Beloved, and the day will sanctify itself.",
    "Wear silence like a soft robe; let it touch every encounter.",
    "Sit until the noise inside grows tired of itself.",
    "Bow within, even as you walk among others.",
    "Soften the gaze, and the world also softens.",
    "Speak only what the silence has approved.",
    "Bring even the smallest task to the altar of attention.",
    "Be the still pool in which your own life can finally see itself.",
    "Hold nothing — and find that everything is held by you.",
]

CLOSINGS: list[str] = [
    "Turn within, beloved — the light you seek has always been your own.",
    "Let go, and be carried by the current of grace.",
    "Be still, and the answer will arrive without your asking.",
    "Rest, beloved one; the Infinite is keeping watch.",
    "Remember: you are forever held in the arms of the Beloved.",
    "Trust the silence — it is the language of the Eternal speaking your name.",
    "Walk gently into your day; the kingdom is closer than your breath.",
    "Smile inwardly, and the soul will smile back.",
    "Live as the Beloved lives — fully, freely, fearlessly.",
    "Meditate, and become what you were before time began.",
    "Lay down the heavy bundle of self; the road is lighter without it.",
    "Open the heart, and Heaven will pour through.",
    "Love widely — even the stranger is the Beloved in passing form.",
    "Begin again; every moment is the dawn of a new life.",
    "Remember your true country, and homesickness will become joy.",
    "When in doubt, return to the breath — it remembers what the mind forgets.",
    "Let the practice be its own reward; the reward is already arriving.",
    "Tend the inner flame; the world will warm itself by your light.",
    "Let nothing be wasted — turn even pain into prayer.",
    "Walk into the day as a friend of Eternity.",
    "Meet each soul as the Beloved meeting itself.",
    "Today, let love be your only profession.",
    "Surrender; what you call yours has always been His.",
    "Be patient — the lotus opens in its own season.",
    "Pause often, beloved, and remember the One who breathes you.",
    "Step gently; you walk on the threshold of the eternal.",
    "Listen for the music beneath the music — it is calling you home.",
    "Bow to every breath as to a small messenger of God.",
    "Let stillness do the seeking; you have only to be willing.",
    "Wherever you are, the Beloved has already arrived.",
]


def _generate_messages(count: int = 500) -> list[str]:
    """Deterministically combine phrase pools into `count` unique messages.
    Cycles through four sentence templates with prime-offset indices so
    the same combo doesn't repeat before we hit the target."""
    out: list[str] = []
    seen: set[str] = set()
    i = 0
    safety = count * 20  # generous; we'll bail out long before this trips
    while len(out) < count and i < safety:
        t = i % 4
        if t == 0:
            o = OPENINGS[i % len(OPENINGS)]
            m = FIRST_MIDDLES[(i // 3) % len(FIRST_MIDDLES)]
            c = CLOSINGS[(i // 5) % len(CLOSINGS)]
            msg = f"{o} {m} {c}"
        elif t == 1:
            o = OPENINGS[(i + 7) % len(OPENINGS)]
            m1 = FIRST_MIDDLES[(i + 11) % len(FIRST_MIDDLES)]
            m2 = SECOND_MIDDLES[(i + 13) % len(SECOND_MIDDLES)]
            c = CLOSINGS[(i + 17) % len(CLOSINGS)]
            msg = f"{o} {m1} {m2} {c}"
        elif t == 2:
            o = OPENINGS[(i + 3) % len(OPENINGS)]
            c = CLOSINGS[(i + 19) % len(CLOSINGS)]
            msg = f"{o} {c}"
        else:
            o = OPENINGS[(i + 23) % len(OPENINGS)]
            m = SECOND_MIDDLES[(i + 5) % len(SECOND_MIDDLES)]
            c = CLOSINGS[(i + 29) % len(CLOSINGS)]
            msg = f"{o} {m} {c}"
        if msg not in seen:
            seen.add(msg)
            out.append(msg)
        i += 1
    return out


def seed_into_session(session, force: bool = False) -> int:
    """Insert messages if the table is empty (or always, when force=True).
    Returns the number of rows inserted (0 if nothing to do).
    Caller owns commit/rollback; we add objects and flush."""
    # Late import so this module can be imported inside database.py without
    # a circular reference.
    from database import MeditateOracleMessage  # noqa: WPS433
    existing = session.query(MeditateOracleMessage).count()
    if existing > 0 and not force:
        return 0
    msgs = _generate_messages(500)
    now = datetime.utcnow()
    rows = [
        MeditateOracleMessage(message_text=text, source_tag="yogananda", created_at=now)
        for text in msgs
    ]
    session.add_all(rows)
    session.flush()
    return len(rows)


def seed(force: bool = False) -> int:
    """Standalone runner — opens its own session, commits, prints summary."""
    # Make `backend/` importable when invoked as `python -m backend.scripts...`
    here = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(here)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from database import SessionLocal
    s = SessionLocal()
    try:
        n = seed_into_session(s, force=force)
        s.commit()
        return n
    finally:
        s.close()


if __name__ == "__main__":
    force = ("--force" in sys.argv)
    n = seed(force=force)
    if n == 0:
        print("meditate_oracle_messages already seeded — no rows inserted.")
    else:
        print(f"Seeded {n} Yogananda messages into meditate_oracle_messages.")
