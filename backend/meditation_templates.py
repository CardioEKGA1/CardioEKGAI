# Copyright 2026 SoulMD, LLC. All rights reserved.
"""
SoulMD Concierge meditation templates.

Ten categories, each blending five teachers:
  Barbara Martin — Kingdom of Light / divine white-gold light, spiritual hierarchy
  Gabby Bernstein — Universe has your back, surrender to love, miracle mindset
  Abraham-Hicks — vibrational alignment, emotional guidance, in the vortex
  Joe Dispenza — heart-brain coherence, quantum field, future-self healing
  Dolores Cannon — subconscious as healer, higher self dialogue, soul blueprint

A prescription posts {template_slug, patient, context} to Claude together with
SHARED_SYSTEM_PROMPT + the template's script guidance. Claude returns a
full, personalized meditation script.
"""

SHARED_SYSTEM_PROMPT = """You are a physician-healer writing a meditation
script for a specific patient. The script will be read aloud (or silently)
by the patient during a guided practice.

Voice:
  Warm, unhurried, feminine, wise — like someone who has seen both sides of
  existence. Never clinical. Never religious dogma. No "God" or specific
  religious figures; use "the Universe," "divine light," "higher self,"
  "spiritual support," "healing intelligence."

Language:
  Universal spiritual principles. Always weave in — naturally, not as a
  checklist — the language of light, love, the Universe, healing
  intelligence, the higher self, divine support. Avoid: "broken,"
  "sick," "fix," "fight." Use: "heal," "restore," "return to wholeness,"
  "remember who you are."

Structure:
  Follow the category's script framework (provided in the user message).
  Include natural breath cues — long pauses, deep breath in, slow exhale.
  Use second person ("you"). Never clinical prescriptions, never specific
  medical advice. This is spiritual accompaniment to medical care, not a
  replacement for it.

Personalization:
  Weave in the patient's first name near the opening, gently. Reference
  their condition or health journey ONCE, in spiritual/metaphorical terms —
  never in clinical language. If an oracle card was pulled today, softly
  weave its theme in once during the meditation. If the physician shared
  notes, let them inform the tone but never quote them back.

Length:
  Aim for the target duration at a slow read pace (~120 spoken words per
  minute). Favor spaciousness over density. It is better to include fewer
  ideas with more silence than to overfill.

Format:
  Return ONLY a JSON object with these keys:
  {
    "title":    "4-6 word title",
    "duration_min": <integer minutes, between 8 and 35>,
    "script":   "full meditation script as a single string. Use double
                 newlines (\\n\\n) to separate sections and invite pauses.
                 No stage directions in brackets — just prose. No markdown."
  }"""


# Each template provides (slug, name, category, duration_min, framework).
# category maps to the existing MEDITATION_CATEGORIES in main.py so these
# flow through the same library + assignment plumbing.
MEDITATION_TEMPLATES = {
    "divine_light_healing": {
        "name":         "Divine Light Healing",
        "category":     "energy_healing",
        "duration_min": 20,
        "teacher":      "Barbara Martin · Kingdom of Light",
        "summary":      "White-gold divine light flowing through the crown, infusing specific body areas. Angelic support witness.",
        "framework": (
            "Open with an invocation of brilliant white-gold divine light "
            "descending from the cosmos. Name the spiritual hierarchy — "
            "the beings of light who surround the patient and support "
            "their healing. Guide the light in through the crown chakra, "
            "down the spine, into the area of the body most calling for "
            "healing. Dwell there. Offer the light to specific organs or "
            "systems. Close with gratitude to the spiritual helpers."
        ),
    },
    "universe_has_your_back": {
        "name":         "Universe Has Your Back",
        "category":     "visualization",
        "duration_min": 15,
        "teacher":      "Gabby Bernstein",
        "summary":      "Surrender practice. Releasing control to the Universe. Love as the healing force.",
        "framework": (
            "Begin with the art of surrender — not giving up, but giving "
            "over. Walk the patient through releasing control of the "
            "healing to something larger than fear or diagnosis. "
            "Include a miracle-expectation moment: ask the Universe "
            "directly for guidance, then listen. Love is the healing "
            "force. Close with a daily alignment practice — a single "
            "phrase they can return to."
        ),
    },
    "vortex_alignment": {
        "name":         "Vortex Alignment",
        "category":     "visualization",
        "duration_min": 20,
        "teacher":      "Abraham-Hicks",
        "summary":      "Vibrational alignment before healing. Move up the emotional scale. In the vortex.",
        "framework": (
            "Frame the body as a vibrational instrument. Before speaking "
            "of healing, guide the patient up the emotional scale — from "
            "where they are now toward appreciation, then love. Include "
            "an 'appreciation rampage' moment where they list small "
            "things that already feel good. Bring them into the vortex — "
            "the place where healing flows naturally because they're "
            "already in frequency with wellness. Feeling good NOW is the "
            "path."
        ),
    },
    "becoming_supernatural": {
        "name":         "Becoming Supernatural",
        "category":     "breathwork",
        "duration_min": 25,
        "teacher":      "Joe Dispenza",
        "summary":      "Heart-brain coherence. Quantum field. Meet your healed future self.",
        "framework": (
            "Open with heart coherence breathing — hand on heart, 5 "
            "counts in, 5 counts out, for at least 2 minutes. Bring the "
            "patient into the present moment where the quantum field "
            "lives. Introduce their future self who is already healed; "
            "let them feel what that body feels like — how it moves, "
            "how it rests. Rewire neural pathways: 'your body is the "
            "unconscious mind — speak to it directly.' Close with a "
            "return to heart-brain coherence."
        ),
    },
    "quantum_healing": {
        "name":         "Quantum Healing",
        "category":     "body_scan",
        "duration_min": 30,
        "teacher":      "Dolores Cannon",
        "summary":      "Deep subconscious. Higher self dialogue. The body's innate healing intelligence.",
        "framework": (
            "Long, slow induction into the subconscious — the part that "
            "keeps the heart beating, heals a wound without instruction. "
            "Invite the patient to speak to their higher self; let the "
            "higher self speak back. Dialogue with the body's innate "
            "wisdom about what it needs. If relevant, a soft reference "
            "to the soul having chosen this experience for growth — "
            "never forced, never prescriptive. Close with a cellular "
            "healing command the patient delivers to their own body."
        ),
    },
    "chakra_light_infusion": {
        "name":         "Chakra Light Infusion",
        "category":     "energy_healing",
        "duration_min": 20,
        "teacher":      "Martin + Hicks + Dispenza",
        "summary":      "Seven chakra journey with divine light, vibrational frequency, and coherence breath between centers.",
        "framework": (
            "Journey through the seven chakras from root to crown. At "
            "each center: (1) Barbara Martin's light infusion specific "
            "to that chakra's spiritual function, (2) an Abraham-flavor "
            "vibrational frequency note ('the feeling of being rooted' "
            "at root, 'the feeling of being held' at sacral, etc.), "
            "(3) one or two coherence breaths before moving up. Close "
            "with quantum field integration — the whole body glowing."
        ),
    },
    "heart_coherence_healing": {
        "name":         "Heart Coherence Healing",
        "category":     "breathwork",
        "duration_min": 15,
        "teacher":      "Dispenza + Abraham",
        "summary":      "HeartMath-inspired breathing, elevated emotions (gratitude, love, joy), feeling healed now.",
        "framework": (
            "Focused heart-coherence breathing throughout — 5 in, 5 out, "
            "with hand on heart. Layer in the elevated emotions one at "
            "a time: first gratitude, then love, then joy. Each emotion "
            "generates a frequency the body recognizes as medicine. "
            "Guide them to feel already-healed in the present moment."
        ),
    },
    "soul_blueprint_healing": {
        "name":         "Soul Blueprint Healing",
        "category":     "visualization",
        "duration_min": 25,
        "teacher":      "Cannon + Martin",
        "summary":      "Akashic records. Reading the soul's healing blueprint. Cellular memory integration.",
        "framework": (
            "Induct into a library of divine light — a visualization of "
            "the akashic records, where the soul's blueprint is held. "
            "Guide the patient to witness their own healing blueprint "
            "without interpreting it — just seeing. Invite higher-self "
            "guidance on the current health situation, speaking in "
            "symbolic or felt-sense language rather than instructions. "
            "Close with divine light integrating into cellular memory."
        ),
    },
    "daily_miracle_practice": {
        "name":         "Daily Miracle Practice",
        "category":     "visualization",
        "duration_min": 10,
        "teacher":      "Gabby + Abraham",
        "summary":      "Short morning alignment. Miracle expectation. Gratitude vortex. Day intention from highest self.",
        "framework": (
            "A brief, bright morning practice meant to be repeated daily. "
            "Open with a check-in with the Universe. Set a miracle "
            "expectation for the day. Enter the gratitude vortex with "
            "three specific appreciations. Close with a single intention "
            "the patient's highest self speaks forward into the day — "
            "not a goal, a quality of being."
        ),
    },
    "physician_assigned_healing": {
        "name":         "Physician-Assigned Healing",
        "category":     "energy_healing",
        "duration_min": 30,
        "teacher":      "All five — most comprehensive",
        "summary":      "The most powerful meditation. Weaves all five traditions for a specific patient's specific moment.",
        "framework": (
            "The fullest form. Open with the patient's name and a single "
            "gentle acknowledgment of their health journey in spiritual "
            "terms. Invoke the Kingdom of Light for their specific "
            "condition. Move into vortex alignment — bringing them into "
            "the frequency of healing. Visualize the quantum field "
            "holding their already-healed body. Deliver a subconscious "
            "healing command in their own voice. Integrate divine light "
            "throughout the body. Close with their future self — who is "
            "already healed — speaking a single sentence of love back to "
            "them across time."
        ),
    },
}
