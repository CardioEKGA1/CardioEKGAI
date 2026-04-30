// © 2026 SoulMD, LLC. All rights reserved.
import React, { useState, useEffect, useCallback } from 'react';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Upload from './screens/Upload';
import Results from './screens/Results';
import Chat from './screens/Chat';
import Paywall from './screens/Paywall';
import Terms from './screens/Terms';
import Privacy from './screens/Privacy';
import Admin from './screens/Admin';
import CookieBanner from './CookieBanner';
import SoulMDLanding from './screens/SoulMDLanding';
import SuiteDashboard from './screens/SuiteDashboard';
import MeditationsLibrary from './screens/MeditationsLibrary';
import ConciergeAccess from './screens/ConciergeAccess';
import NephroAITool from './screens/tools/NephroAITool';
import RxCheckTool from './screens/tools/RxCheckTool';
import AntibioticAITool from './screens/tools/AntibioticAITool';
import ClinicalNoteTool from './screens/tools/ClinicalNoteTool';
import XrayReadTool from './screens/tools/XrayReadTool';
import CerebralAITool from './screens/tools/CerebralAITool';
import PalliativeMDTool from './screens/tools/PalliativeMDTool';
import LabReadTool from './screens/tools/LabReadTool';
import CliniScoreTool from './screens/tools/CliniScoreTool';
import Concierge from './screens/concierge/Concierge';
import PatientLogin from './screens/PatientLogin';
import PatientTerms from './screens/PatientTerms';
import PatientIntake from './screens/PatientIntake';
import MarketingAgent from './screens/MarketingAgent';
import MeditateApp from './screens/meditate/MeditateApp';
import MeditationsLandingPage from './screens/public/MeditationsLandingPage';
import ConciergeLandingPage from './screens/public/ConciergeLandingPage';
import TrialSignupModal from './TrialSignupModal';

export interface EkgResult {
  rhythm: string;
  rate: string;
  pr_interval: string;
  qrs_duration: string;
  qt_interval: string;
  qtc: string;
  axis: string;
  impression: string;
  urgent_flags: string[];
  recommendation: string;
}

export interface User {
  email: string;
  scan_count: number;
  is_subscribed: boolean;
  is_superuser?: boolean;
  // Backend-derived. True iff a ConciergePatient row is linked to
  // this user AND they are NOT a superuser. Drives the hard route
  // lock to /patient — these users can never see the clinical suite.
  is_concierge_patient?: boolean;
}

// Screens the patient PWA may legally render. Anything outside this
// set, when the signed-in user has is_concierge_patient=true, triggers
// a hard window.location.replace('/patient') in the global route guard.
// Listed by name (not derived from a regex) so adding a new clinical-
// suite screen never silently slips into the patient-allowed surface.
const PATIENT_ALLOWED_SCREENS: Screen[] = [
  'patient_login', 'patient_pwa', 'patient_terms', 'patient_intake',
  // Privacy / Terms are static legal pages reachable from the patient
  // PWA footer; allowed so links from emails / consent screens don't
  // bounce. They render the same content regardless of signed-in user.
  'privacy', 'terms',
  // 404 is intentionally allowed so a typo'd URL just shows the not-found
  // shell instead of looping the redirect.
  'not_found',
];

type Screen =
  | 'landing' | 'auth' | 'upload' | 'results' | 'chat' | 'paywall'
  | 'terms' | 'privacy' | 'dashboard'
  | 'tool_nephroai' | 'tool_rxcheck' | 'tool_antibioticai' | 'tool_clinicalnote'
  | 'tool_xrayread' | 'tool_cerebralai' | 'tool_palliativemd'
  | 'tool_labread' | 'tool_cliniscore'
  | 'concierge'
  | 'meditations_library' | 'concierge_access'
  | 'patient_login' | 'patient_terms' | 'patient_intake'
  | 'patient_pwa'           // authed patient PWA at /patient
  | 'concierge_medicine'    // public landing at /concierge-medicine
  | 'meditations_public'    // public landing at /meditations
  | 'marketing_admin'
  | 'meditate'
  | 'dev_login'
  | 'not_found';

const API = 'https://ekgscan.com';

// URL ⇄ Screen mapping. Every screen now has a stable path so navigate()
// pushes a unique history entry — browser back button walks the stack
// naturally. Ephemeral sub-states (modal overlays, tabs inside a screen)
// stay as component-local React state.
const pathToScreen = (path: string): Screen | null => {
  if (path === '/' || path === '')   return 'landing';
  if (path === '/auth')              return 'auth';
  if (path === '/dashboard')         return 'dashboard';
  if (path === '/scan' || path === '/app') return 'upload';
  if (path === '/results')           return 'results';
  if (path === '/chat')              return 'chat';
  if (path === '/paywall')           return 'paywall';
  if (path === '/privacy')           return 'privacy';
  if (path === '/terms')             return 'terms';
  if (path === '/concierge')         return 'concierge';
  // Standalone post-meditation journal deep-link. Routed to the concierge
  // PWA which checks window.location on mount and opens the overlay; the
  // URL is then rewritten to /concierge?view=patient so back-nav doesn't
  // re-fire the modal.
  if (path === '/concierge/journal/new') return 'concierge';
  // /meditations is now the PUBLIC landing (no auth). The superuser
  // library lives at /meditations/library.
  if (path === '/meditations')         return 'meditations_public';
  if (path === '/meditations/library') return 'meditations_library';
  if (path === '/concierge-access')  return 'concierge_access';
  if (path === '/patient') {
    // /patient is the canonical patient PWA URL. Unauthed visitors
    // land on PatientLogin; authed visitors render the PWA directly
    // (the onboarding gate further refines that to terms / intake /
    // pwa). Reading localStorage avoids the brief PatientLogin flash
    // when a returning patient reloads /patient with a valid token.
    let hasToken = false;
    try { hasToken = !!localStorage.getItem('token'); } catch {}
    return hasToken ? 'patient_pwa' : 'patient_login';
  }
  if (path === '/patient/terms')     return 'patient_terms';
  if (path === '/patient/intake')    return 'patient_intake';
  if (path === '/concierge-medicine') return 'concierge_medicine';
  // Marketing Agent — superuser-only campaign generator. Lives at
  // /admin/marketing but uses the regular JWT bearer (NOT the x-admin-token
  // gate Admin.tsx uses). Carved out of isAdminRoute below so the App
  // shell renders MarketingAgent instead of the admin console.
  if (path === '/admin/marketing')   return 'marketing_admin';
  if (path === '/meditate')          return 'meditate';
  if (path === '/dev-login')         return 'dev_login';
  if (path.startsWith('/tool/')) {
    const slug = path.slice('/tool/'.length).replace(/\/$/, '');
    const candidate = `tool_${slug}` as Screen;
    const valid: Screen[] = [
      'tool_nephroai','tool_rxcheck','tool_antibioticai','tool_clinicalnote',
      'tool_xrayread','tool_cerebralai','tool_palliativemd',
      'tool_labread','tool_cliniscore',
    ];
    if (valid.includes(candidate)) return candidate;
    // Unknown tool slug — drop to 404 instead of silently re-routing
    // to the landing screen (which used to leave the URL stranded
    // pointing at a tool page that didn't exist).
    return 'not_found';
  }
  return null;
};
const screenToPath = (s: Screen): string => {
  if (s === 'landing')   return '/';
  if (s === 'auth')      return '/auth';
  if (s === 'dashboard') return '/dashboard';
  if (s === 'upload')    return '/scan';
  if (s === 'results')   return '/results';
  if (s === 'chat')      return '/chat';
  if (s === 'paywall')   return '/paywall';
  if (s === 'privacy')   return '/privacy';
  if (s === 'terms')     return '/terms';
  if (s === 'concierge') return '/concierge';
  if (s === 'meditations_library') return '/meditations/library';
  if (s === 'meditations_public')  return '/meditations';
  if (s === 'concierge_access')    return '/concierge-access';
  if (s === 'patient_login')       return '/patient';
  if (s === 'patient_pwa')         return '/patient';
  if (s === 'patient_terms')       return '/patient/terms';
  if (s === 'patient_intake')      return '/patient/intake';
  if (s === 'concierge_medicine')  return '/concierge-medicine';
  if (s === 'marketing_admin')     return '/admin/marketing';
  if (s === 'meditate')            return '/meditate';
  if (s === 'dev_login')           return '/dev-login';
  if (s === 'not_found')           return window.location.pathname || '/';
  if (s.startsWith('tool_')) return `/tool/${s.slice(5)}`;
  return '/';
};

// All screens are now URL-addressable. This narrower predicate is just the
// "don't auto-navigate away from this" set: if the user visited
// /privacy or /terms with a magic-link token in the URL, we respect that
// landing. For any other page, a successful magic-link verify redirects
// them to the domain's default destination (dashboard/upload).
const STICKY_DEEPLINKS: Screen[] = ['privacy', 'terms'];
const isStickyDeepLink = (s: Screen) => STICKY_DEEPLINKS.includes(s);

const App: React.FC = () => {
  // Admin-token-gated console catches every /admin/* path EXCEPT
  // /admin/marketing, which uses the regular JWT bearer (superuser-only)
  // and is rendered through the normal Screen pipeline.
  const [isAdminRoute] = useState(() => {
    const p = window.location.pathname;
    return p.startsWith('/admin') && p !== '/admin/marketing';
  });
  const [isSoulMD] = useState(() => {
    const h = window.location.host.toLowerCase();
    return h === 'soulmd.us' || h === 'www.soulmd.us' || h.endsWith('.soulmd.us');
  });

  // Single source of truth for what's rendered.
  // Initialized from the URL so /privacy and /terms are refresh-safe and deep-linkable.
  // Unknown paths render the NotFound screen instead of silently falling
  // back to landing (which used to leave users stranded on a confusing
  // page whose URL didn't match the content).
  const [screen, setScreen] = useState<Screen>(() => {
    const fromUrl = pathToScreen(window.location.pathname);
    if (fromUrl) return fromUrl;
    // Treat root-equivalents as landing; everything else is a 404.
    const p = window.location.pathname;
    if (p === '' || p === '/' || p === '/index.html') return 'landing';
    return 'not_found';
  });

  const [result, setResult] = useState<EkgResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [initialMagicToken] = useState<string | null>(() => new URLSearchParams(window.location.search).get('token'));
  const [initialCheckoutResult] = useState<string | null>(() => new URLSearchParams(window.location.search).get('checkout'));

  // navigate: push a new screen. Only changes the URL for deep-linkable screens.
  // For ephemeral in-app screens we keep URL at '/' (no meaningful deep link).
  const navigate = useCallback((s: Screen) => {
    const targetPath = screenToPath(s);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ screen: s }, '', targetPath);
    }
    setScreen(s);
  }, []);

  // Back-aware nav: mirrors the browser back stack so "Back" always does the right thing
  // regardless of how the user arrived (direct link, in-app nav, or external referral).
  const goBack = useCallback(() => {
    // If we have history to go back to, let the browser handle it — popstate will sync.
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('landing');
    }
  }, [navigate]);

  // popstate: user hit browser Back/Forward — sync screen state from the URL.
  // This is the ONLY path that can change `screen` for content pages externally.
  useEffect(() => {
    if (isAdminRoute) return;
    const handlePop = () => {
      const fromUrl = pathToScreen(window.location.pathname);
      // Concierge-patient back-button fence. If the URL the browser
      // just navigated to is outside the patient-allowed surface,
      // synchronously rewrite both the URL and the React screen back
      // to /patient. Done BEFORE setScreen so the clinical-suite shell
      // never gets a chance to mount, and BEFORE the global guard
      // useEffect runs (which would redirect a tick later — too late
      // to prevent the flash).
      if (user && user.is_concierge_patient && !user.is_superuser) {
        const target = fromUrl || 'not_found';
        if (!PATIENT_ALLOWED_SCREENS.includes(target)) {
          try { window.history.replaceState({}, '', '/patient'); } catch {}
          setScreen('patient_pwa');
          return;
        }
      }
      if (fromUrl) {
        setScreen(fromUrl);
        return;
      }
      const p = window.location.pathname;
      if (p === '' || p === '/' || p === '/index.html') {
        setScreen('landing');
        return;
      }
      // Unknown URL via back/forward — surface the NotFound screen
      // rather than dropping the user onto landing with a stale URL.
      setScreen('not_found');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [isAdminRoute, isSoulMD, user]);

  const handleAuth = useCallback((data: any) => {
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser({
      email: data.email || '',
      scan_count: data.scan_count,
      is_subscribed: data.is_subscribed,
      is_superuser: !!data.is_superuser,
      is_concierge_patient: !!data.is_concierge_patient,
    });

    // Concierge patients ALWAYS land on /patient and nowhere else.
    // Wins over every other redirect mechanism so a hand-crafted ?rt=
    // or stored sessionStorage intent can't divert them onto a clinical
    // suite URL. window.history.replaceState scrubs the magic-link query
    // string from the address bar AND prevents the back button from
    // returning to the URL that contained the token. window.location
    // .replace then drops the `landing` history entry from this very
    // load so the back button can't reach it either.
    if (data && data.is_concierge_patient && !data.is_superuser) {
      try { window.history.replaceState({}, '', '/patient'); } catch {}
      window.location.replace('/patient');
      return;
    }

    // Post-auth redirect precedence:
    //   1. sessionStorage['soulmd_post_auth_redirect'] — explicit intent set
    //      before the magic-link request was made (e.g. the user clicked
    //      "Sign in" from the concierge patient portal). Highest priority.
    //   2. ?rt=… query param on the magic-link landing URL (cross-device
    //      case — the magic-link itself carries the intent).
    //   3. Default: SoulMD → dashboard, EKGScan → upload.
    let redirected = false;
    try {
      const stored =
        sessionStorage.getItem('soulmd_post_auth_redirect') ||
        localStorage.getItem('post_auth_redirect');
      if (stored && stored.startsWith('/')) {
        try { sessionStorage.removeItem('soulmd_post_auth_redirect'); } catch {}
        try { localStorage.removeItem('post_auth_redirect'); } catch {}
        // Using window.location so we preserve the full path + query exactly,
        // which the in-app navigate() can't do for ephemeral state like
        // ?view=patient.
        window.location.href = stored;
        redirected = true;
      }
      if (!redirected) {
        const rt = new URLSearchParams(window.location.search).get('rt');
        if (rt && rt.startsWith('/')) {
          window.location.href = rt;
          redirected = true;
        }
      }
    } catch {}
    if (!redirected) {
      navigate(isSoulMD ? 'dashboard' : 'upload');
    }
  }, [isSoulMD, navigate]);

  // Initial auth bootstrap — runs once, at mount.
  useEffect(() => {
    if (isAdminRoute) return;
    // If we initialized onto a sticky deep-link (/privacy, /terms), DO NOT
    // auto-navigate away when the auth check resolves — the user asked for
    // that URL. Every other page gets the usual post-auth redirect.
    const landedOnDeepLink = isStickyDeepLink(screen);
    if (initialMagicToken) {
      fetch(`${API}/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: initialMagicToken })
      })
        .then(r => r.json())
        .then(data => { if (data.access_token && !landedOnDeepLink) handleAuth(data); })
        .catch(() => {});
      return;
    }
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          // Only invalid/expired tokens (401) or deleted accounts (404) should
          // clear the session. Transient failures (5xx, network) leave it alone
          // so a brief outage doesn't log everyone out.
          if (r.status === 401 || r.status === 404) {
            localStorage.removeItem('token');
            setToken('');
            return null;
          }
          if (!r.ok) return null;
          return r.json();
        })
        .then(data => {
          if (data && data.email) {
            setUser(data);
            // soulmd.us / now leads with concierge medicine for everyone.
            // Clinicians (signed-in or not) reach the dashboard via the
            // "For Clinicians →" footer link. EKGScan keeps signed-in
            // users on its landing so the Suite pitch stays visible.
          }
        })
        .catch(() => { /* network error — keep token, user retries naturally */ });
    }
  }, []); // eslint-disable-line

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    navigate('landing');
  }, [navigate]);

  // Per-screen document.title updates so the browser tab reflects where the
  // user is. Crawlers see the static <title> in index.html; this is for UX.
  useEffect(() => {
    const brand = isSoulMD ? 'SoulMD' : 'EKGScan';
    const PER_SCREEN: Record<Screen, string> = {
      landing:           isSoulMD ? 'SoulMD — Concierge Medicine by Dr. Neysi Anderson' : 'EKGScan — 12-lead EKG interpretation',
      auth:              `Sign in · ${brand}`,
      upload:            `Analyze an EKG · ${brand}`,
      results:           `EKG Results · ${brand}`,
      chat:              `Dr. SoulMD · ${brand}`,
      paywall:           `Upgrade · ${brand}`,
      terms:             `Terms of Service · ${brand}`,
      privacy:           `Privacy Policy · ${brand}`,
      dashboard:         `Dashboard · ${brand}`,
      tool_nephroai:     `NephroAI · ${brand}`,
      tool_rxcheck:      `RxCheck · ${brand}`,
      tool_antibioticai: `AntibioticAI · ${brand}`,
      tool_clinicalnote: `ClinicalNote AI · ${brand}`,
      tool_xrayread:     `XrayRead · ${brand}`,
      tool_cerebralai:   `CerebralAI · ${brand}`,
      tool_palliativemd: `PalliativeMD · ${brand}`,
      tool_labread:      `LabRead · ${brand}`,
      tool_cliniscore:   `CliniScore · ${brand}`,
      concierge:         'Concierge Medicine',
      meditations_library: `Meditations Library · ${brand}`,
      concierge_access:    `Concierge Portal · ${brand}`,
      patient_login:       'SoulMD Concierge · Sign in',
      patient_pwa:         'SoulMD Concierge',
      patient_terms:       'Before We Begin · SoulMD Concierge',
      patient_intake:      'Tell Us About You · SoulMD Concierge',
      concierge_medicine:  'Concierge Medicine · Dr. Anderson · SoulMD',
      meditations_public:  'Guided Meditations · SoulMD',
      marketing_admin:     `Marketing Agent · ${brand}`,
      meditate:            'SoulMD Meditate',
      dev_login:           `Dev Login · ${brand}`,
      not_found:           `Page not found · ${brand}`,
    };
    document.title = PER_SCREEN[screen] || brand;
  }, [screen, isSoulMD]);

  // Helper passed to child components for SPA navigation to public pages.
  const goPrivacy = useCallback(() => navigate('privacy'), [navigate]);
  const goTerms = useCallback(() => navigate('terms'), [navigate]);

  // /dashboard render guard requires `user` to be truthy. Unauthed
  // visitors landing here would otherwise get a permanent blank page.
  // Pre-pivot, this case was masked because soulmd.us / auto-redirected
  // signed-in users to /dashboard; post-pivot the / → concierge change
  // means more users may arrive at /dashboard without a session. Stash
  // the intent so handleAuth lands them back on the dashboard after the
  // magic-link round-trip. Guarded on `!token` too so a still-loading
  // auth bootstrap (token in localStorage but /auth/me pending) doesn't
  // bounce a returning clinician away.
  useEffect(() => {
    if (screen === 'dashboard' && !user && !token) {
      try { sessionStorage.setItem('soulmd_post_auth_redirect', '/dashboard'); } catch {}
      navigate('auth');
    }
  }, [screen, user, token, navigate]);

  // If someone lands directly on /concierge without being signed in, redirect
  // to the sign-in screen. Without this, the concierge render guard leaves
  // the page blank forever (waiting for a user that will never exist).
  // Also stash the intended URL (including ?view=patient) so handleAuth
  // can restore it after the magic-link round-trip — keeps superusers from
  // bouncing to the tool dashboard when they meant to reach the patient PWA.
  useEffect(() => {
    if (screen === 'concierge' && !user && !token) {
      try {
        const target = window.location.pathname + window.location.search;
        sessionStorage.setItem('soulmd_post_auth_redirect', target);
      } catch {}
      navigate('auth');
    }
  }, [screen, user, token, navigate]);

  // /patient — post-login routing gate. Concierge is invitation-only, so
  // only users who already have a concierge_patients row (or are
  // superusers) can enter the patient PWA. Everyone else is a regular
  // SoulMD user who happened to sign in here → send them to the clinical
  // dashboard instead.
  //
  //   not enrolled                   → /dashboard
  //   superuser                      → /patient (PWA renders directly)
  //   enrolled, not approved         → stay on /patient (banner shown)
  //   enrolled+approved, no terms    → /patient/terms
  //   enrolled+approved, no intake   → /patient/intake
  //   enrolled+approved, fully done  → /patient (PWA renders directly)
  useEffect(() => {
    if ((screen !== 'patient_login' && screen !== 'patient_pwa') || !user || !token) return;
    let cancelled = false;
    fetch(`${API}/concierge/patient/onboarding-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        if (!data.enrolled)              { navigate('dashboard'); return; }
        if (data.is_superuser)           { if (screen !== 'patient_pwa') navigate('patient_pwa'); return; }
        // Approval gate: a concierge_patients row exists but Dr. Anderson
        // hasn't approved (or has revoked) this patient. Surface the
        // "access restricted" banner via the existing PatientLogin
        // sessionStorage channel so they understand why they're stuck
        // here.
        if (!data.is_approved) {
          try { sessionStorage.setItem('soulmd_patient_login_message', 'Access restricted to approved members.'); } catch {}
          // Drop the user back to the login form so the banner shows.
          // pathToScreen optimistically promoted them to patient_pwa
          // because their token is valid; we walk that back here.
          if (screen === 'patient_pwa') navigate('patient_login');
          return;
        }
        if (!data.terms_accepted)        navigate('patient_terms');
        else if (!data.intake_completed) navigate('patient_intake');
        else if (screen !== 'patient_pwa') navigate('patient_pwa');
      })
      .catch(() => { /* network blip — leave them on the page; they can retry */ });
    return () => { cancelled = true; };
  }, [screen, user, token, navigate]);

  // Backward compat: legacy /concierge?view=patient links land here. Bounce
  // them to the new canonical /patient URL on mount so deep-links from
  // emails, dev login, and any cached history survive the migration.
  useEffect(() => {
    try {
      const p = window.location.pathname;
      const view = new URLSearchParams(window.location.search).get('view');
      if (p === '/concierge' && view === 'patient') {
        window.history.replaceState({}, '', '/patient');
        const fromUrl = pathToScreen('/patient');
        if (fromUrl) setScreen(fromUrl);
      }
    } catch {}
  }, []);

  // Patient PWA route guard. /concierge with view=patient (or any
  // non-owner accessing /concierge) must verify the user is still
  // physician-approved before rendering. Owner bypasses entirely.
  // Revoked patients get bounced back to /patient with a one-shot
  // "Access restricted" banner.
  useEffect(() => {
    if (screen !== 'concierge' || !user || !token) return;
    if (user.is_superuser) return;
    let cancelled = false;
    fetch(`${API}/concierge/patient/onboarding-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        if (!data.is_approved) {
          try { sessionStorage.setItem('soulmd_patient_login_message', 'Access restricted to approved members.'); } catch {}
          navigate('patient_login');
        }
      })
      .catch(() => { /* leave them be on transient failure */ });
    return () => { cancelled = true; };
  }, [screen, user, token, navigate]);

  // ─── Concierge patient → clinical-suite hard lock ─────────────────
  // If the signed-in user has is_concierge_patient=true (and isn't a
  // superuser), they may ONLY visit the screens listed in
  // PATIENT_ALLOWED_SCREENS. Any other screen — landing, dashboard,
  // /scan, any /tool/*, /chat, /concierge admin, /meditate, etc. — gets
  // a synchronous redirect to /patient via window.location.replace so:
  //   • the offending URL never enters their browser history (replace
  //     overwrites the current entry instead of pushing a new one)
  //   • the back button can't take them back to it
  //   • clicking a stale link to /dashboard from anywhere just bounces
  // window.history.replaceState on the same tick scrubs the URL bar
  // even before React's state machine runs.
  // Defense-in-depth: the backend gate_tool_with_trial / chat / etc.
  // also 403 these users, so even a hand-crafted fetch doesn't leak.
  useEffect(() => {
    if (!user || !user.is_concierge_patient || user.is_superuser) return;
    if (PATIENT_ALLOWED_SCREENS.includes(screen)) return;
    try { window.history.replaceState({}, '', '/patient'); } catch {}
    window.location.replace('/patient');
  }, [screen, user]);

  // /patient/terms and /patient/intake both require an authed session. If
  // someone lands on them without a token, kick back to the sign-in page.
  useEffect(() => {
    if ((screen === 'patient_terms' || screen === 'patient_intake') && !token) {
      navigate('patient_login');
    }
  }, [screen, token, navigate]);

  // /concierge-medicine — public landing (no auth gate). The previous
  // superuser-only ConciergeMedicineLanding has been replaced by a
  // ConciergeLandingPage that anyone can reach via direct URL.

  // /admin/marketing — Marketing Agent (Claude-powered campaign generator).
  // Superuser-only; shares the gating shape with /concierge-medicine.
  useEffect(() => {
    if (screen !== 'marketing_admin') return;
    if (!token) { navigate('auth'); return; }
    if (!user) return;
    if (!user.is_superuser) navigate('dashboard');
  }, [screen, user, token, navigate]);

  // /meditate — standalone Yogananda oracle + meditation library + diary.
  // Superuser-only while we iterate.
  useEffect(() => {
    if (screen !== 'meditate') return;
    if (!token) { navigate('auth'); return; }
    if (!user) return;
    if (!user.is_superuser) navigate('dashboard');
  }, [screen, user, token, navigate]);

  if (isAdminRoute) {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
        <Admin API={API}/>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      {screen==='landing' && (isSoulMD
        ? <ConciergeLandingPage API={API} onHome={() => navigate('landing')}/>
        : <Landing
            onAnalyze={()=>navigate(user ? 'upload' : 'auth')}
            onSignIn={()=>navigate('auth')}
            onSignUp={()=>navigate('auth')}
            onTerms={goTerms}
            onPrivacy={goPrivacy}
          />)}
      {screen==='privacy' && <Privacy onBack={goBack}/>}
      {screen==='terms' && <Terms onBack={goBack}/>}
      {screen==='dashboard' && user && <SuiteDashboard API={API} token={token} user={user} onLogout={handleLogout} onOpenEkgscan={()=>window.location.href='https://ekgscan.com'} onOpenTool={(slug)=>{
        // Non-clinical "discovery" tiles route to their own screens.
        if (slug === 'concierge')   { navigate('concierge'); return; }
        if (slug === 'meditations') { navigate('meditations_library'); return; }
        const map: Record<string, Screen> = {nephroai:'tool_nephroai', rxcheck:'tool_rxcheck', antibioticai:'tool_antibioticai', clinicalnote:'tool_clinicalnote', xrayread:'tool_xrayread', cerebralai:'tool_cerebralai', palliativemd:'tool_palliativemd', labread:'tool_labread', cliniscore:'tool_cliniscore'};
        if (map[slug]) navigate(map[slug]);
      }} onPrivacy={goPrivacy} onTerms={goTerms} checkoutResult={initialCheckoutResult}
        onNavigateMeditations={()=>navigate('meditations_library')}
        onNavigateConciergeAccess={()=>navigate('concierge_access')}
        onNavigateConciergeMedicine={()=>navigate('concierge_medicine')}
        onNavigateMarketing={()=>navigate('marketing_admin')}/>}
      {/* Tool screens are accessible WITHOUT auth — the 8 trial tools run
          one free call per browser via the server-side trial gate. labread
          and cliniscore still allow 5/day for everyone. Tools themselves
          handle the 402 from a used-trial server-side. */}
      {screen==='tool_nephroai'     && <NephroAITool     API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_rxcheck'      && <RxCheckTool      API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_antibioticai' && <AntibioticAITool API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_clinicalnote' && <ClinicalNoteTool API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_xrayread'     && <XrayReadTool     API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_cerebralai'   && <CerebralAITool   API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_palliativemd' && <PalliativeMDTool API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_labread'      && <LabReadTool      API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='tool_cliniscore'   && <CliniScoreTool   API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
      {screen==='concierge' && user && <Concierge API={API} token={token} onBack={()=>navigate('dashboard')}/>}
      {/* Superuser-only tabs. We still render the screens if non-superuser
          hits the URL directly (minor defense-in-depth), but the UI nav
          only exposes them to is_superuser=true. Backend endpoints they
          call are owner/superuser-gated on the server side. */}
      {screen==='meditations_library' && user && user.is_superuser && (
        <MeditationsLibrary
          API={API} token={token}
          onBack={()=>navigate('dashboard')}
          onNavigateDashboard={()=>navigate('dashboard')}
          onNavigateConciergeAccess={()=>navigate('concierge_access')}
          onNavigateMarketing={()=>navigate('marketing_admin')}
        />
      )}
      {screen==='concierge_access' && user && user.is_superuser && (
        <ConciergeAccess
          API={API} token={token}
          onBack={()=>navigate('dashboard')}
          onNavigateDashboard={()=>navigate('dashboard')}
          onNavigateMeditations={()=>navigate('meditations_library')}
          onNavigateMarketing={()=>navigate('marketing_admin')}
          onOpenConcierge={()=>navigate('concierge')}
        />
      )}
      {(screen==='meditations_library' || screen==='concierge_access') && user && !user.is_superuser && (
        <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', textAlign:'center', fontFamily:'-apple-system,sans-serif'}}>
          <div>
            <div style={{fontSize:'48px', marginBottom:'8px', opacity:0.4}}>🔒</div>
            <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a', marginBottom:'6px'}}>Not available</div>
            <button onClick={()=>navigate('dashboard')} style={{marginTop:'12px', background:'#534AB7', color:'white', border:'none', borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:700, cursor:'pointer'}}>Back to dashboard</button>
          </div>
        </div>
      )}
      {screen==='concierge' && !user && token && (
        <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#8a6e50', fontSize:'14px'}}>Loading…</div>
      )}
      {screen==='auth' && <Login API={API} onBack={goBack} isSoulMD={isSoulMD}/>}
      {screen==='patient_login' && !user && <PatientLogin API={API} onRequestMembership={() => navigate('landing')}/>}
      {/* Authed patient PWA at /patient. Uses the existing Concierge
          router with a forced patient role so the practice owner can
          also exercise the PWA from /patient (no more ?view=patient
          query string). */}
      {screen==='patient_pwa' && user && token && (
        <Concierge
          API={API}
          token={token}
          patientOnly
          onBack={() => {
            // Concierge patients can never reach /dashboard — the only
            // valid "back" from the patient PWA is to end the session
            // and return to the public sign-in screen. Superusers (the
            // practice owner testing as a patient) keep the legacy
            // shortcut to the clinical dashboard.
            if (user.is_concierge_patient && !user.is_superuser) {
              handleLogout();
            } else {
              navigate('dashboard');
            }
          }}
        />
      )}
      {screen==='patient_pwa' && !token && <PatientLogin API={API} onRequestMembership={() => navigate('landing')}/>}
      {screen==='patient_terms' && token && (
        <PatientTerms
          API={API}
          token={token}
          onComplete={() => navigate('patient_intake')}
          onSignInRequired={() => navigate('patient_login')}
        />
      )}
      {screen==='patient_intake' && token && (
        <PatientIntake
          API={API}
          token={token}
          onComplete={() => navigate('patient_pwa')}
          onSignInRequired={() => navigate('patient_login')}
        />
      )}
      {screen==='concierge_medicine' && (
        <ConciergeLandingPage API={API} onHome={() => navigate('landing')}/>
      )}
      {screen==='meditations_public' && (
        <MeditationsLandingPage API={API} onHome={() => navigate('landing')}/>
      )}
      {screen==='marketing_admin' && user && user.is_superuser && (
        <MarketingAgent
          API={API}
          token={token}
          onBack={() => navigate('dashboard')}
          onNavigateDashboard={() => navigate('dashboard')}
          onNavigateMeditations={() => navigate('meditations_library')}
          onNavigateConciergeAccess={() => navigate('concierge_access')}
        />
      )}
      {screen==='meditate' && user && user.is_superuser && (
        <MeditateApp
          API={API}
          token={token}
          onBack={() => navigate(isSoulMD ? 'dashboard' : 'landing')}
        />
      )}
      {screen==='dev_login' && <DevLogin API={API} onAuth={handleAuth}/>}
      {screen==='upload' && <Upload API={API} token={token} user={user} onResult={(r,url)=>{setResult(r);setImageUrl(url);navigate('results');}} onPaywall={()=>navigate('paywall')} onLogout={handleLogout} onSignUp={()=>navigate('auth')}/>}
      {screen==='results' && result && <Results result={result} imageUrl={imageUrl} onChat={()=>navigate('chat')} onBack={goBack}/>}
      {screen==='chat' && result && <Chat result={result} API={API} token={token} onBack={goBack}/>}
      {screen==='paywall' && <Paywall API={API} token={token} onBack={goBack}/>}
      {screen==='not_found' && <NotFound onHome={() => navigate(isSoulMD ? 'landing' : 'landing')} onBack={goBack} brand={isSoulMD ? 'SoulMD' : 'EKGScan'}/>}
      <TrialSignupModal
        userAuthenticated={!!user}
        onSignUp={() => navigate('auth')}
        onSeePricing={() => navigate(user ? 'dashboard' : 'landing')}
      />
      <CookieBanner onPrivacy={goPrivacy}/>
    </div>
  );
};
// ─── NotFound (404) ────────────────────────────────────────────────────────
// Rendered for any URL pathToScreen can't resolve. Keeps the visited URL
// in the address bar so the user (and any error reporter) can see what
// they tried, plus two clear escape hatches: home and browser back.
const NotFound: React.FC<{onHome: () => void; onBack: () => void; brand: string}> = ({ onHome, onBack, brand }) => (
  <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)', fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif'}}>
    <div style={{maxWidth:'440px', width:'100%', textAlign:'center', background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)', borderRadius:'22px', padding:'40px 28px', boxShadow:'0 20px 40px rgba(20,18,40,0.10)', border:'0.5px solid rgba(83,74,183,0.15)'}}>
      <div style={{fontFamily:'Georgia, "Times New Roman", serif', fontSize:'56px', fontWeight:400, color:'#1a2a4a', letterSpacing:'0.02em', lineHeight:1, marginBottom:'12px'}}>404</div>
      <div style={{fontFamily:'Georgia, "Times New Roman", serif', fontSize:'22px', fontWeight:400, color:'#1a2a4a', letterSpacing:'0.02em', marginBottom:'10px'}}>Page not found</div>
      <p style={{fontSize:'13.5px', color:'#6B7280', lineHeight:1.7, margin:'0 0 24px', wordBreak:'break-all'}}>
        We couldn't find <code style={{background:'rgba(83,74,183,0.08)', padding:'2px 6px', borderRadius:'4px', color:'#534AB7'}}>{(typeof window !== 'undefined' ? window.location.pathname : '') || '/'}</code> in {brand}.
      </p>
      <div style={{display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap'}}>
        <button onClick={onHome} style={{background:'#1a2a4a', color:'white', border:'none', borderRadius:'2px', padding:'14px 28px', fontFamily:'Georgia, serif', fontSize:'13px', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer'}}>
          Go home
        </button>
        <button onClick={onBack} style={{background:'transparent', color:'#534AB7', border:'1px solid rgba(83,74,183,0.3)', borderRadius:'2px', padding:'14px 24px', fontFamily:'Georgia, serif', fontSize:'13px', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer'}}>
          ← Back
        </button>
      </div>
    </div>
  </div>
);

// ─── Dev Login ─────────────────────────────────────────────────────────────
// Hidden superuser fast-login page at /dev-login. Not linked anywhere;
// reach it by typing the URL. Two buttons, no email input. Calls a
// backend endpoint that's gated by DEV_LOGIN_ENABLED env + SUPERUSER_EMAILS
// allowlist, so this page is cosmetically available on any deploy but
// the endpoint returns 404 unless the env flag is set (or the caller is
// localhost). Test Patient button additionally stashes the post-auth
// redirect so handleAuth lands at /concierge?view=patient.
const DevLogin: React.FC<{API: string; onAuth: (d: any) => void}> = ({ API, onAuth }) => {
  const [loading, setLoading] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const signIn = async (email: string, redirect?: string) => {
    setErr(''); setLoading(email);
    try {
      if (redirect) {
        try { sessionStorage.setItem('soulmd_post_auth_redirect', redirect); } catch {}
      }
      const res = await fetch(`${API}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `dev-login unavailable (${res.status})`);
      }
      const data = await res.json();
      onAuth(data);
    } catch (e: any) {
      setErr(e.message || 'Sign-in failed');
    } finally {
      setLoading('');
    }
  };
  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', padding:'24px'}}>
      <div style={{background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)', borderRadius:'22px', padding:'36px 28px', maxWidth:'420px', width:'100%', boxShadow:'0 20px 40px rgba(20,18,40,0.1)', border:'0.5px solid rgba(83,74,183,0.15)'}}>
        <div style={{fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'#534AB7', fontWeight:800, marginBottom:'10px'}}>Dev Login · Superuser Only</div>
        <div style={{fontSize:'22px', fontWeight:800, color:'#1F1B3A', marginBottom:'6px', letterSpacing:'-0.3px'}}>Instant test sign-in</div>
        <div style={{fontSize:'13px', color:'#6B6889', marginBottom:'24px', lineHeight:1.6}}>
          Skips the magic-link email round-trip. Only works when the backend has
          <code style={{background:'rgba(83,74,183,0.08)', padding:'2px 6px', borderRadius:'4px', margin:'0 4px'}}>DEV_LOGIN_ENABLED=true</code>
          set in Railway, or when running against <code style={{background:'rgba(83,74,183,0.08)', padding:'2px 6px', borderRadius:'4px'}}>localhost</code>.
        </div>
        <button
          disabled={!!loading}
          onClick={() => signIn('anderson@soulmd.us')}
          style={{
            width:'100%', padding:'14px 18px', marginBottom:'10px',
            background:'linear-gradient(135deg,#7ab0f0,#9b8fe8,#534AB7)',
            color:'white', border:'none', borderRadius:'14px',
            fontSize:'14px', fontWeight:800, cursor: loading ? 'default' : 'pointer',
            opacity: loading === 'anderson@soulmd.us' ? 0.7 : 1,
            fontFamily:'inherit', boxShadow:'0 8px 20px rgba(83,74,183,0.25)',
          }}>
          {loading === 'anderson@soulmd.us' ? 'Signing in…' : 'Sign in as Dr. Anderson'}
        </button>
        <button
          disabled={!!loading}
          onClick={() => signIn('spicymolecule@gmail.com', '/patient')}
          style={{
            width:'100%', padding:'14px 18px',
            background:'rgba(255,255,255,0.9)',
            color:'#534AB7', border:'0.5px solid rgba(83,74,183,0.3)', borderRadius:'14px',
            fontSize:'14px', fontWeight:800, cursor: loading ? 'default' : 'pointer',
            opacity: loading === 'spicymolecule@gmail.com' ? 0.7 : 1,
            fontFamily:'inherit',
          }}>
          {loading === 'spicymolecule@gmail.com' ? 'Signing in…' : 'Sign in as Test Patient'}
        </button>
        {err && <div style={{marginTop:'14px', fontSize:'12px', color:'#a02020', textAlign:'center'}}>{err}</div>}
        <div style={{marginTop:'22px', fontSize:'11px', color:'#8aa0c0', textAlign:'center', fontStyle:'italic', lineHeight:1.6}}>
          If you see "Not found", the dev endpoint is gated on prod.<br/>
          Set <code style={{background:'rgba(83,74,183,0.08)', padding:'1px 5px', borderRadius:'3px'}}>DEV_LOGIN_ENABLED=true</code> in Railway or run locally.
        </div>
      </div>
    </div>
  );
};

export default App;
