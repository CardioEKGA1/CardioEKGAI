// © 2026 SoulMD, LLC. All rights reserved.
// Free-trial helpers — client-side state + event bus.
// Server is source of truth; this is for snappy UI without a round-trip.

const TRIAL_LS_KEY = 'soulmd_trials_v1';

export const readTrialsLocal = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(TRIAL_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch { return {}; }
};

export const writeTrialsLocal = (next: Record<string, boolean>) => {
  try { localStorage.setItem(TRIAL_LS_KEY, JSON.stringify(next)); } catch {}
};

// Call this after a successful /tools/.../analyze response that returned
// `_trial_mode: true`. Marks the tool as tried locally and fires a window
// event so the global TrialSignupModal can take over.
export const notifyTrialUsed = (slug: string) => {
  const next = { ...readTrialsLocal(), [slug]: true };
  writeTrialsLocal(next);
  try {
    window.dispatchEvent(new CustomEvent('soulmd:trial-used', { detail: { slug } }));
  } catch {}
};
