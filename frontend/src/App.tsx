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
import AnticoagAI from './screens/tools/AnticoagAI';
import LabReadTool from './screens/tools/LabReadTool';
import CliniScoreTool from './screens/tools/CliniScoreTool';
import Concierge from './screens/concierge/Concierge';
import PatientLogin from './screens/PatientLogin';
import PatientTerms from './screens/PatientTerms';
import PatientIntake from './screens/PatientIntake';
import MarketingAgent from './screens/MarketingAgent';
import ScheduleMD from './screens/ScheduleMD';
import ScheduleMDPortal from './screens/ScheduleMDPortal';
import AuthVerify from './screens/AuthVerify';
import AllowlistManager from './screens/AllowlistManager';
import SoulMDLogo from './SoulMDLogo';
import ChoKuRei from './screens/concierge/ChoKuRei';
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
  // soulmd.us "by invitation only" lockdown placeholder. Concierge
  // patients can land here during the lockdown (every public path
  // resolves to public_splash); allowed so the global hard-lock
  // useEffect doesn't infinite-reload them to /patient (which is
  // itself locked → public_splash → loop).
  'public_splash',
];

type Screen =
  | 'landing' | 'auth' | 'upload' | 'results' | 'chat' | 'paywall'
  | 'terms' | 'privacy' | 'dashboard'
  | 'tool_nephroai' | 'tool_rxcheck' | 'tool_antibioticai' | 'tool_clinicalnote'
  | 'tool_xrayread' | 'tool_cerebralai' | 'tool_palliativemd' | 'tool_anticoag'
  | 'tool_labread' | 'tool_cliniscore'
  | 'concierge'
  | 'meditations_library' | 'concierge_access'
  | 'patient_login' | 'patient_terms' | 'patient_intake'
  | 'patient_pwa'           // authed patient PWA at /patient
  | 'concierge_medicine'    // rich landing at /concierge-medicine (superuser-only during lockdown)
  | 'meditations_public'    // public landing at /meditations
  | 'marketing_admin'
  | 'meditate'
  | 'auth_verify'           // /auth/verify — magic-link landing → backend hand-off
  | 'allowlist'             // /settings/allowlist — superuser-only allowlist manager
  | 'schedulemd'            // hospital scheduling admin at /schedulemd (superuser-only)
  | 'schedulemd_portal'     // physician portal at /schedulemd/portal?token=XXX (token-gated)
  | 'welcome'               // /welcome — public shareable rich landing (ConciergeLandingPage)
  | 'public_splash'         // soulmd.us "coming soon" placeholder rendered at /
  | 'not_found';

const API = 'https://ekgscan.com';

// URL ⇄ Screen mapping. Every screen now has a stable path so navigate()
// pushes a unique history entry — browser back button walks the stack
// naturally. Ephemeral sub-states (modal overlays, tabs inside a screen)
// stay as component-local React state.
const pathToScreen = (path: string): Screen | null => {
  // ─── soulmd.us public lockdown ──────────────────────────────────
  // soulmd.us is invitation-only for *unauthenticated visitors*. Every
  // public-facing route renders the minimal "by invitation only"
  // splash (public_splash). Carve-outs:
  //   /admin*              admin token console
  //   /login               magic-link + TOTP sign-in surface
  //   /auth/verify         GET token-consumer that 302s on success
  //   /concierge           superuser dashboard (incl. ?view=patient,
  //                        and /concierge/* subpaths)
  //   /concierge-medicine  superuser-gated rich landing
  //   /schedulemd          scheduler admin (superuser-only)
  //   /schedulemd/portal   physician portal (magic-link token-gated)
  //   /api/*               backend (doesn't reach React anyway)
  //
  // Once a superuser is signed in, the lockdown is bypassed for that
  // session — the localStorage('soulmd_su') flag is set on successful
  // /auth/me and on dev-login. Without this bypass, browser back / UI
  // back buttons would route every locked URL through pathToScreen and
  // collapse the entire in-session history stack down to public_splash.
  // Concierge patients (is_superuser=false) never get the flag, so the
  // "no patient access" stance still holds — they continue to splash
  // on every locked URL exactly like a public visitor.
  // EKGScan and other hosts are unaffected.
  if (typeof window !== 'undefined') {
    const h = window.location.host.toLowerCase();
    const isSoulMD = h === 'soulmd.us' || h === 'www.soulmd.us' || h.endsWith('.soulmd.us');
    if (isSoulMD) {
      let isSuperuserSession = false;
      try { isSuperuserSession = !!localStorage.getItem('soulmd_su'); } catch {}
      if (!isSuperuserSession) {
        const allowed =
          path.startsWith('/admin') ||
          path === '/login' ||
          path === '/auth/verify' ||
          path === '/settings/allowlist' ||
          path === '/concierge' || path.startsWith('/concierge/') ||
          path === '/concierge-medicine' ||
          path === '/welcome' ||
          path === '/schedulemd' ||
          path === '/schedulemd/portal' ||
          path.startsWith('/api/');
        if (!allowed) return 'public_splash';
      }
    }
  }
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
  if (path === '/schedulemd')        return 'schedulemd';
  if (path === '/schedulemd/portal') return 'schedulemd_portal';
  if (path === '/welcome')           return 'welcome';
  if (path === '/login')             return 'auth';
  if (path === '/auth/verify')       return 'auth_verify';
  if (path === '/settings/allowlist') return 'allowlist';
  if (path.startsWith('/tool/')) {
    const slug = path.slice('/tool/'.length).replace(/\/$/, '');
    const candidate = `tool_${slug}` as Screen;
    const valid: Screen[] = [
      'tool_nephroai','tool_rxcheck','tool_antibioticai','tool_clinicalnote',
      'tool_xrayread','tool_cerebralai','tool_palliativemd','tool_anticoag',
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
  if (s === 'auth')      return '/login';
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
  if (s === 'schedulemd')          return '/schedulemd';
  if (s === 'schedulemd_portal')   return '/schedulemd/portal';
  if (s === 'welcome')             return '/welcome';
  if (s === 'auth_verify')         return '/auth/verify';
  if (s === 'allowlist')           return '/settings/allowlist';
  // public_splash has no canonical path — it's the lockdown destination
  // for any URL not in the allowlist. Preserve whatever the user typed
  // so the address bar still reflects their intent.
  if (s === 'public_splash')       return window.location.pathname || '/';
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
  // Tracks whether the initial /auth/me bootstrap has finished. The
  // route guard waits on this so a cookie-only session (set by the
  // magic-link verify) isn't bounced to /login before the bootstrap
  // can populate `user`. Without this gate the guard fires on every
  // mount and the magic-link landing flashes the login form before
  // the session resolves — looks like an auth loop to the user.
  const [bootstrapped, setBootstrapped] = useState<boolean>(false);
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
    // soulmd.us lockdown bypass: a superuser session marker so the
    // pathToScreen lockdown skips this user's URLs (browser back / UI
    // back / refresh of locked paths all need to resolve to the real
    // screen, not the public splash). Cleared in handleLogout.
    try {
      if (data && data.is_superuser) localStorage.setItem('soulmd_su', '1');
      else localStorage.removeItem('soulmd_su');
    } catch {}

    // Concierge patients ALWAYS land on /patient and nowhere else.
    // window.history.replaceState scrubs the magic-link query string
    // from the address bar AND prevents the back button from returning
    // to the URL that contained the token. window.location.replace
    // then drops the `landing` history entry from this very load so
    // the back button can't reach it either.
    if (data && data.is_concierge_patient && !data.is_superuser) {
      try { window.history.replaceState({}, '', '/patient'); } catch {}
      window.location.replace('/patient');
      return;
    }

    // Site lockdown: post-auth ALWAYS lands on /concierge. The previous
    // sessionStorage('soulmd_post_auth_redirect') / localStorage
    // ('post_auth_redirect') / ?rt= precedence chain was removed so
    // there's no path for an explicit intent (e.g. dev-login →
    // /patient, magic-link rt=/dashboard) to divert away from the
    // single allowed destination. Drain any leftover stored hints from
    // prior sessions on the way through so a stale value doesn't haunt
    // the next sign-in if the lockdown is later lifted.
    try { sessionStorage.removeItem('soulmd_post_auth_redirect'); } catch {}
    try { localStorage.removeItem('post_auth_redirect'); } catch {}
    navigate('concierge');
  }, [navigate]);

  // Initial auth bootstrap — runs once, at mount.
  useEffect(() => {
    if (isAdminRoute) { setBootstrapped(true); return; }
    const landedOnDeepLink = isStickyDeepLink(screen);
    if (initialMagicToken) {
      fetch(`${API}/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: initialMagicToken })
      })
        .then(r => r.json())
        .then(data => { if (data.access_token && !landedOnDeepLink) handleAuth(data); })
        .catch(() => {})
        .finally(() => setBootstrapped(true));
      return;
    }
    // Always run /auth/me — credentials:'include' so the magic-link
    // session cookie rides along, Bearer header for legacy
    // localStorage-token sessions. Backend get_current_user resolves
    // either source. Skipping this when localStorage was empty (the
    // previous behavior) was the bug that made the magic-link
    // landing flash /login before the cookie session resolved.
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${API}/auth/me`, { headers, credentials: 'include' })
      .then(async r => {
        if (r.status === 401 || r.status === 404) {
          // Hard auth failure: clear the legacy localStorage token.
          // Cookies are httpOnly; we can't clear them from JS, but
          // the next request will fail identically and the route
          // guard then bounces correctly.
          localStorage.removeItem('token');
          try { localStorage.removeItem('soulmd_su'); } catch {}
          setToken('');
          return null;
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then(data => {
        if (data && data.email) {
          setUser(data);
          try {
            if (data.is_superuser) {
              const hadFlag = !!localStorage.getItem('soulmd_su');
              localStorage.setItem('soulmd_su', '1');
              if (!hadFlag) {
                const fresh = pathToScreen(window.location.pathname);
                if (fresh && fresh !== 'public_splash') setScreen(fresh);
              }
            } else {
              localStorage.removeItem('soulmd_su');
            }
          } catch {}
        }
      })
      .catch(() => { /* network error — keep token, user retries naturally */ })
      .finally(() => setBootstrapped(true));
  }, []); // eslint-disable-line

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    try { localStorage.removeItem('soulmd_su'); } catch {}
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
      tool_anticoag:     `AnticoagAI · ${brand}`,
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
      schedulemd:          `ScheduleMD · ${brand}`,
      schedulemd_portal:   'ScheduleMD Portal · SoulMD',
      auth_verify:         'Verifying… · SoulMD',
      allowlist:           'Sign-in allowlist · SoulMD',
      welcome:             'SoulMD — Concierge Medicine by Dr. Neysi Anderson',
      public_splash:       'SoulMD — Where Science Meets the Soul',
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
  // ─── Auth guard: protected routes ────────────────────────────────
  // Per the security overhaul, every screen below requires a signed-in
  // session. Hitting any of them without auth bounces to /login with
  // ?next=CURRENT_PATH so the post-verify redirect lands the user back
  // where they started.
  useEffect(() => {
    const PROTECTED: Screen[] = [
      'dashboard', 'concierge', 'patient_pwa', 'patient_terms', 'patient_intake',
      'meditations_library', 'concierge_access', 'marketing_admin', 'meditate',
      'schedulemd', 'allowlist',
      'tool_nephroai', 'tool_rxcheck', 'tool_antibioticai', 'tool_clinicalnote',
      'tool_xrayread', 'tool_cerebralai', 'tool_palliativemd', 'tool_anticoag',
      'tool_labread', 'tool_cliniscore',
      'upload', 'results', 'chat', 'paywall',
    ];
    if (!PROTECTED.includes(screen)) return;
    // Wait for /auth/me to resolve before deciding "no session" —
    // a magic-link cookie session is invisible to JS until the
    // bootstrap fetch echoes it back as a user object. Without this
    // gate the guard fires on mount and bounces every cookie-only
    // session to /login before the bootstrap can complete.
    if (!bootstrapped) return;
    if (user || token) return;  // valid (or in-flight) session — let the screen render
    try {
      const next = window.location.pathname + window.location.search;
      const url = next && next !== '/login'
        ? `/login?next=${encodeURIComponent(next)}`
        : '/login';
      window.history.replaceState({}, '', url);
    } catch {}
    setScreen('auth');
  }, [screen, user, token, bootstrapped]);

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

  // Backward compat: legacy /concierge?view=patient links land here.
  // Pre-lockdown this bouncer rewrote the URL to the canonical /patient.
  // Disabled during the soulmd.us "by invitation only" lockdown — /patient
  // is locked (resolves to public_splash), so bouncing the practice owner
  // there from /concierge?view=patient stranded them on the splash. Letting
  // the request stay on /concierge means the Concierge component handles
  // ?view=patient internally (its existing pre-pivot behavior). Re-enable
  // when the lockdown is lifted and /patient is reachable again.
  // useEffect(() => {
  //   try {
  //     const p = window.location.pathname;
  //     const view = new URLSearchParams(window.location.search).get('view');
  //     if (p === '/concierge' && view === 'patient') {
  //       window.history.replaceState({}, '', '/patient');
  //       const fromUrl = pathToScreen('/patient');
  //       if (fromUrl) setScreen(fromUrl);
  //     }
  //   } catch {}
  // }, []);

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

  // /concierge-medicine — superuser-gated during the soulmd.us "by
  // invitation only" lockdown. Pre-pivot this was a public landing;
  // post-pivot it briefly was the public placeholder; now (lockdown
  // mode) it's the practice owner's pre-launch demo URL for the rich
  // ConciergeLandingPage. Anyone unauthed or non-superuser is sent
  // back to the public splash. setScreen + replaceState rather than
  // navigate() so we don't leave /concierge-medicine in the back stack.
  useEffect(() => {
    if (screen !== 'concierge_medicine') return;
    if (!token) {
      try { window.history.replaceState({}, '', '/'); } catch {}
      setScreen('public_splash');
      return;
    }
    if (!user) return; // wait for /auth/me to resolve
    if (!user.is_superuser) {
      try { window.history.replaceState({}, '', '/'); } catch {}
      setScreen('public_splash');
    }
  }, [screen, user, token]);

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

  // /schedulemd — admin scheduling dashboard. Superuser-only. Same
  // shape as /meditate. The /schedulemd/portal route is intentionally
  // NOT gated here — physician portal users authenticate via the
  // magic-link token in the query string, so they don't have a SoulMD
  // session at all.
  useEffect(() => {
    if (screen !== 'schedulemd') return;
    if (!token) { navigate('auth'); return; }
    if (!user) return;
    if (!user.is_superuser) {
      try { window.history.replaceState({}, '', '/'); } catch {}
      setScreen('public_splash');
    }
  }, [screen, user, token, navigate]);

  // /settings/allowlist — owner-only allowlist manager. Same superuser
  // gate shape as /schedulemd above.
  useEffect(() => {
    if (screen !== 'allowlist') return;
    if (!token) { navigate('auth'); return; }
    if (!user) return;
    if (!user.is_superuser) {
      try { window.history.replaceState({}, '', '/'); } catch {}
      setScreen('public_splash');
    }
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
        const map: Record<string, Screen> = {nephroai:'tool_nephroai', rxcheck:'tool_rxcheck', antibioticai:'tool_antibioticai', clinicalnote:'tool_clinicalnote', xrayread:'tool_xrayread', cerebralai:'tool_cerebralai', palliativemd:'tool_palliativemd', anticoag:'tool_anticoag', labread:'tool_labread', cliniscore:'tool_cliniscore'};
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
      {screen==='tool_anticoag'     && <AnticoagAI       API={API} token={token} onBack={()=>navigate(user ? 'dashboard' : 'landing')}/>}
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
      {/* Rich ConciergeLandingPage at /concierge-medicine is gated on
          superuser during the lockdown. The useEffect above bounces
          everyone else to public_splash, so this guard is belt-and-
          suspenders — but it also prevents a flash of marketing copy
          to a non-superuser visitor between mount and useEffect. */}
      {screen==='concierge_medicine' && user && user.is_superuser && (
        <ConciergeLandingPage API={API} onHome={() => navigate('landing')}/>
      )}
      {screen==='public_splash' && <PublicSplash API={API}/>}
      {screen==='welcome' && (
        <ConciergeLandingPage API={API} onHome={() => navigate('public_splash')}/>
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
      {screen==='schedulemd' && user && user.is_superuser && (
        <ScheduleMD
          API={API}
          token={token}
          onBack={() => navigate('concierge')}
          onNavigateDashboard={() => navigate('dashboard')}
          onNavigateMeditations={() => navigate('meditations_library')}
          onNavigateConciergeAccess={() => navigate('concierge_access')}
          onNavigateMarketing={() => navigate('marketing_admin')}
        />
      )}
      {screen==='schedulemd_portal' && (
        <ScheduleMDPortal
          API={API}
          token={(() => {
            try { return new URLSearchParams(window.location.search).get('token') || ''; }
            catch { return ''; }
          })()}
        />
      )}
      {screen==='auth_verify' && <AuthVerify API={API}/>}
      {screen==='allowlist' && user && user.is_superuser && (
        <AllowlistManager
          API={API}
          token={token}
          onBack={() => navigate('concierge')}
          onNavigateDashboard={() => navigate('dashboard')}
          onNavigateMeditations={() => navigate('meditations_library')}
          onNavigateConciergeAccess={() => navigate('concierge_access')}
          onNavigateMarketing={() => navigate('marketing_admin')}
          onNavigateScheduleMD={() => navigate('schedulemd')}
        />
      )}
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
// ─── PublicSplash ──────────────────────────────────────────────────────────
// soulmd.us coming-soon landing rendered at "/" and at every public path
// outside the lockdown allowlist. Single centered chakra-DNA logo, the
// "Where Science Meets the Soul" tagline, and a minimal email-capture
// form. Cho Ku Rei watermark sits behind everything at low opacity.
//
// The previous full marketing page (ConciergeLandingPage) is preserved
// — reachable at /welcome (public, shareable with new clients) and at
// /concierge-medicine (superuser-only, original lockdown carve-out).
//
// The form opens the user's email client with support@soulmd.us
// pre-addressed and the entered email pre-filled in the body. This
// keeps the public surface free of backend dependencies (no
// reCAPTCHA, no honeypot, no 18+ gate, no rate-limit table) and
// guarantees deliverability — Anderson's support inbox is the
// authoritative lead-capture surface.
const PublicSplash: React.FC<{API: string}> = ({ API: _API }) => {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = () => {
    setErr('');
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) { setErr('Please enter a valid email.'); return; }
    try {
      const subject = encodeURIComponent('Information request — SoulMD');
      const body = encodeURIComponent(
        `Hi,\n\nI'd like to learn more about SoulMD.\n\nPlease reach me at: ${e}\n\nThank you.\n`
      );
      window.location.href = `mailto:support@soulmd.us?subject=${subject}&body=${body}`;
      setSent(true);
    } catch {
      setErr('Could not open your email client. Please email support@soulmd.us directly.');
    }
  };

  // Palette: opal blue + blush pink as specified.
  const OPAL  = '#C5E8F4';
  const BLUSH = '#F6BFD3';
  const NAVY  = '#1a2a4a';
  const SOFT  = '#6B6889';
  const SERIF = 'Georgia, "Times New Roman", serif';

  return (
    <div style={{
      position:'relative',
      minHeight:'100vh',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'48px 24px',
      // Soft diagonal blend opal → blush, with a creamy core to keep
      // text legible at any width.
      background: `linear-gradient(135deg, ${OPAL} 0%, #FDFBF8 50%, ${BLUSH} 100%)`,
      fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif',
      color: NAVY,
      overflow:'hidden',
    }}>
      {/* Cho Ku Rei watermark — non-interactive, sits behind content. */}
      <div aria-hidden style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%, -50%)',
        opacity: 1, pointerEvents:'none', zIndex:0,
      }}>
        <ChoKuRei size={520} color={NAVY} opacity={0.05}/>
      </div>

      <div style={{
        position:'relative', zIndex:1,
        maxWidth:'480px', width:'100%', textAlign:'center',
      }}>
        <div style={{display:'flex', justifyContent:'center', marginBottom:'22px'}}>
          <SoulMDLogo size={88} showText={false}/>
        </div>
        <h1 style={{
          fontFamily: SERIF, fontWeight:400,
          fontSize:'clamp(28px, 5.2vw, 44px)',
          letterSpacing:'0.02em', lineHeight:1.2,
          margin:'0 0 12px', color: NAVY,
        }}>
          SoulMD<sup aria-label="trademark" style={{
            fontFamily: SERIF, fontSize:'0.38em', fontWeight:600,
            letterSpacing:'0.05em', color: NAVY, opacity: 0.7,
            verticalAlign:'super', marginLeft:'2px', userSelect:'none',
          }}>™</sup>
        </h1>
        <div style={{
          fontFamily: SERIF, fontStyle:'italic',
          fontSize:'clamp(15px, 2.4vw, 19px)',
          color: SOFT, letterSpacing:'0.04em',
          margin:'0 0 32px', lineHeight:1.5,
        }}>
          Where Science Meets the Soul
        </div>

        {sent ? (
          <div style={{
            background:'rgba(255,255,255,0.7)',
            border:'1px solid rgba(83,74,183,0.15)',
            borderRadius:'14px', padding:'18px 22px',
            backdropFilter:'blur(6px)',
            fontSize:'14px', color: NAVY, lineHeight:1.6,
          }}>
            ✦ Your email client should be opening. We'll be in touch.
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); submit(); }}
            style={{
              display:'flex', gap:'8px', flexWrap:'wrap',
              maxWidth:'420px', margin:'0 auto',
            }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email"
              autoComplete="email"
              required
              style={{
                flex:'1 1 200px', minWidth:0,
                padding:'13px 16px', borderRadius:'12px',
                border:'1px solid rgba(83,74,183,0.18)',
                background:'rgba(255,255,255,0.85)',
                fontSize:'14px', color: NAVY,
                fontFamily:'inherit', outline:'none',
                boxSizing:'border-box',
              }}
            />
            <button
              type="submit"
              style={{
                padding:'13px 22px', borderRadius:'12px',
                border:'none', background: NAVY, color:'white',
                fontSize:'13px', fontWeight:700, letterSpacing:'0.04em',
                cursor:'pointer', fontFamily:'inherit',
              }}>
              Request information
            </button>
            {err && (
              <div style={{
                width:'100%', marginTop:'8px',
                fontSize:'12px', color:'#7A1F1F',
              }}>{err}</div>
            )}
          </form>
        )}

        <div style={{
          marginTop:'22px', fontSize:'11px', color: SOFT,
          letterSpacing:'0.06em',
        }}>
          <a href="mailto:support@soulmd.us" style={{
            color: SOFT, textDecoration:'none',
          }}>support@soulmd.us</a>
        </div>
      </div>
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

// (Dev-Login surface removed by the magic-link + TOTP security overhaul.)

export default App;
