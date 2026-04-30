// © 2026 SoulMD, LLC. All rights reserved.
//
// reCAPTCHA v3 client helper.
// - Loads the script tag once per page lifetime.
// - Reads the site key from /config (NOT a build-time env var) so key
//   rotation in Railway doesn't require a rebuild.
// - Exposes executeRecaptcha(action) → Promise<token | null>. Callers
//   POST the returned token alongside form data; the backend verifies
//   against Google siteverify and silently fake-succeeds on a
//   sub-0.5 score.
// - Returns null when reCAPTCHA isn't enabled (env var unset, script
//   blocked by extension, or transient load failure). The backend's
//   _verify_recaptcha treats a missing token + unset secret as a
//   no-op pass, so the form still works during rollout — but if the
//   secret IS set, a missing token is treated as a low-score reject.

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let _siteKey: string | null = null;
let _scriptPromise: Promise<void> | null = null;

const ensureScript = async (apiBase: string): Promise<string | null> => {
  // Already loaded.
  if (_siteKey && window.grecaptcha) return _siteKey;

  // First load — fetch /config to discover the site key.
  if (_siteKey === null) {
    try {
      const cfg = await fetch(`${apiBase}/config`).then(r => r.json());
      const key = cfg?.recaptcha?.site_key;
      const enabled = !!cfg?.recaptcha?.enabled;
      _siteKey = enabled && typeof key === 'string' && key ? key : '';
    } catch {
      _siteKey = '';
    }
  }
  if (!_siteKey) return null;

  if (!_scriptPromise) {
    _scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src*="recaptcha/api.js"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(_siteKey!)}`;
      s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('recaptcha-load-failed'));
      document.head.appendChild(s);
    });
  }
  try {
    await _scriptPromise;
  } catch {
    return null;
  }
  return _siteKey;
};

export const executeRecaptcha = async (apiBase: string, action: string): Promise<string | null> => {
  const key = await ensureScript(apiBase);
  if (!key || !window.grecaptcha) return null;
  return new Promise<string | null>((resolve) => {
    try {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(key, { action })
          .then(token => resolve(token || null))
          .catch(() => resolve(null));
      });
    } catch {
      resolve(null);
    }
  });
};
