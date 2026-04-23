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
}

type Screen =
  | 'landing' | 'auth' | 'upload' | 'results' | 'chat' | 'paywall'
  | 'terms' | 'privacy' | 'dashboard'
  | 'tool_nephroai' | 'tool_rxcheck' | 'tool_antibioticai' | 'tool_clinicalnote'
  | 'tool_xrayread' | 'tool_cerebralai' | 'tool_palliativemd'
  | 'tool_labread' | 'tool_cliniscore'
  | 'concierge'
  | 'meditations_library' | 'concierge_access'
  | 'dev_login';

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
  if (path === '/meditations')       return 'meditations_library';
  if (path === '/concierge-access')  return 'concierge_access';
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
  if (s === 'meditations_library') return '/meditations';
  if (s === 'concierge_access')    return '/concierge-access';
  if (s === 'dev_login')           return '/dev-login';
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
  const [isAdminRoute] = useState(() => window.location.pathname.startsWith('/admin'));
  const [isSoulMD] = useState(() => {
    const h = window.location.host.toLowerCase();
    return h === 'soulmd.us' || h === 'www.soulmd.us' || h.endsWith('.soulmd.us');
  });

  // Single source of truth for what's rendered.
  // Initialized from the URL so /privacy and /terms are refresh-safe and deep-linkable.
  const [screen, setScreen] = useState<Screen>(() => {
    const fromUrl = pathToScreen(window.location.pathname);
    return fromUrl ?? 'landing';
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
      if (fromUrl) {
        setScreen(fromUrl);
        return;
      }
      // Fallback for unrecognized URLs (shouldn't happen — pathToScreen
      // now recognizes every defined Screen).
      setScreen(isSoulMD && user ? 'dashboard' : 'landing');
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
    });

    // Post-auth redirect precedence:
    //   1. sessionStorage['soulmd_post_auth_redirect'] — explicit intent set
    //      before the magic-link request was made (e.g. the user clicked
    //      "Sign in" from the concierge patient portal). Highest priority.
    //   2. ?rt=… query param on the magic-link landing URL (cross-device
    //      case — the magic-link itself carries the intent).
    //   3. Default: SoulMD → dashboard, EKGScan → upload.
    let redirected = false;
    try {
      const stored = sessionStorage.getItem('soulmd_post_auth_redirect');
      if (stored && stored.startsWith('/')) {
        sessionStorage.removeItem('soulmd_post_auth_redirect');
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
            // SoulMD: signed-in users skip the marketing landing and go to
            // the dashboard. EKGScan: we intentionally keep signed-in users
            // on the landing so the Suite pitch and pricing stay visible;
            // they click "Analyze an EKG →" to enter the tool.
            if (!landedOnDeepLink && screen === 'landing' && isSoulMD) {
              navigate('dashboard');
            }
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
      landing:           isSoulMD ? 'SoulMD — Clinical AI Suite' : 'EKGScan — 12-lead EKG interpretation',
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
      dev_login:           `Dev Login · ${brand}`,
    };
    document.title = PER_SCREEN[screen] || brand;
  }, [screen, isSoulMD]);

  // Helper passed to child components for SPA navigation to public pages.
  const goPrivacy = useCallback(() => navigate('privacy'), [navigate]);
  const goTerms = useCallback(() => navigate('terms'), [navigate]);

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
        ? <SoulMDLanding onSignIn={()=>navigate('auth')} onSignUp={()=>navigate('auth')} onPrivacy={goPrivacy} onTerms={goTerms}/>
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
        const map: Record<string, Screen> = {nephroai:'tool_nephroai', rxcheck:'tool_rxcheck', antibioticai:'tool_antibioticai', clinicalnote:'tool_clinicalnote', xrayread:'tool_xrayread', cerebralai:'tool_cerebralai', palliativemd:'tool_palliativemd', labread:'tool_labread', cliniscore:'tool_cliniscore'};
        if (map[slug]) navigate(map[slug]);
      }} onPrivacy={goPrivacy} onTerms={goTerms} checkoutResult={initialCheckoutResult}
        onNavigateMeditations={()=>navigate('meditations_library')}
        onNavigateConciergeAccess={()=>navigate('concierge_access')}/>}
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
        />
      )}
      {screen==='concierge_access' && user && user.is_superuser && (
        <ConciergeAccess
          API={API} token={token}
          onBack={()=>navigate('dashboard')}
          onNavigateDashboard={()=>navigate('dashboard')}
          onNavigateMeditations={()=>navigate('meditations_library')}
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
      {screen==='dev_login' && <DevLogin API={API} onAuth={handleAuth}/>}
      {screen==='upload' && <Upload API={API} token={token} user={user} onResult={(r,url)=>{setResult(r);setImageUrl(url);navigate('results');}} onPaywall={()=>navigate('paywall')} onLogout={handleLogout} onSignUp={()=>navigate('auth')}/>}
      {screen==='results' && result && <Results result={result} imageUrl={imageUrl} onChat={()=>navigate('chat')} onBack={goBack}/>}
      {screen==='chat' && result && <Chat result={result} API={API} token={token} onBack={goBack}/>}
      {screen==='paywall' && <Paywall API={API} token={token} onBack={goBack}/>}
      <TrialSignupModal
        userAuthenticated={!!user}
        onSignUp={() => navigate('auth')}
        onSeePricing={() => navigate(user ? 'dashboard' : 'landing')}
      />
      <CookieBanner onPrivacy={goPrivacy}/>
    </div>
  );
};
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
          onClick={() => signIn('spicymolecule@gmail.com', '/concierge?view=patient')}
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
