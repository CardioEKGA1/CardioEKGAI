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
}

type Screen =
  | 'landing' | 'auth' | 'upload' | 'results' | 'chat' | 'paywall'
  | 'terms' | 'privacy' | 'dashboard'
  | 'tool_nephroai' | 'tool_rxcheck' | 'tool_antibioticai' | 'tool_clinicalnote'
  | 'tool_xrayread' | 'tool_cerebralai' | 'tool_palliativemd'
  | 'tool_labread' | 'tool_cliniscore'
  | 'concierge';

const API = 'https://ekgscan.com';

// URL ⇄ Screen mapping. Only public, deep-linkable content pages get stable URLs.
// All other screens live at '/' (ephemeral in-app state).
const pathToScreen = (path: string): Screen | null => {
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/scan' || path === '/app') return 'upload';
  if (path === '/concierge') return 'concierge';
  return null;
};
const screenToPath = (s: Screen): string => {
  if (s === 'privacy') return '/privacy';
  if (s === 'terms') return '/terms';
  if (s === 'upload') return '/scan';
  if (s === 'concierge') return '/concierge';
  return '/';
};

// Screens with deep-linkable URLs — these survive refresh and browser back.
const DEEPLINK_SCREENS: Screen[] = ['privacy', 'terms', 'upload', 'concierge'];
const isDeepLink = (s: Screen) => DEEPLINK_SCREENS.includes(s);

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
      // URL is '/' — default behavior depends on domain:
      // - SoulMD: signed-in → dashboard, else landing
      // - EKGScan: always landing (tool lives at /scan; '/' is the marketing page)
      setScreen(prev => {
        if (!isDeepLink(prev)) return prev;
        if (isSoulMD) return user ? 'dashboard' : 'landing';
        return 'landing';
      });
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [isAdminRoute, isSoulMD, user]);

  const handleAuth = useCallback((data: any) => {
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser({ email: data.email || '', scan_count: data.scan_count, is_subscribed: data.is_subscribed });
    navigate(isSoulMD ? 'dashboard' : 'upload');
  }, [isSoulMD, navigate]);

  // Initial auth bootstrap — runs once, at mount.
  useEffect(() => {
    if (isAdminRoute) return;
    // If we initialized onto a deep-link page (/privacy, /terms), DO NOT auto-navigate away
    // when the auth check resolves. The user asked for that URL — respect it.
    const landedOnDeepLink = isDeepLink(screen);
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
    };
    document.title = PER_SCREEN[screen] || brand;
  }, [screen, isSoulMD]);

  // Helper passed to child components for SPA navigation to public pages.
  const goPrivacy = useCallback(() => navigate('privacy'), [navigate]);
  const goTerms = useCallback(() => navigate('terms'), [navigate]);

  // If someone lands directly on /concierge without being signed in, redirect
  // to the sign-in screen. Without this, the concierge render guard leaves
  // the page blank forever (waiting for a user that will never exist).
  useEffect(() => {
    if (screen === 'concierge' && !user && !token) {
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
      }} onPrivacy={goPrivacy} onTerms={goTerms} checkoutResult={initialCheckoutResult}/>}
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
      {screen==='concierge' && !user && token && (
        <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#8a6e50', fontSize:'14px'}}>Loading…</div>
      )}
      {screen==='auth' && <Login API={API} onBack={goBack} isSoulMD={isSoulMD}/>}
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
export default App;
