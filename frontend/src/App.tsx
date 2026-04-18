// © 2026 SoulMD. All rights reserved.
import React, { useState, useEffect } from 'react';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Upload from './screens/Upload';
import Results from './screens/Results';
import Chat from './screens/Chat';
import Paywall from './screens/Paywall';
import Terms from './screens/Terms';
import Admin from './screens/Admin';
import SoulMDLanding from './screens/SoulMDLanding';
import SuiteDashboard from './screens/SuiteDashboard';
import NephroAITool from './screens/tools/NephroAITool';
import RxCheckTool from './screens/tools/RxCheckTool';
import InfectIDTool from './screens/tools/InfectIDTool';
import ClinicalNoteTool from './screens/tools/ClinicalNoteTool';

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

type Screen = 'landing' | 'auth' | 'upload' | 'results' | 'chat' | 'paywall' | 'terms' | 'dashboard' | 'tool_nephroai' | 'tool_rxcheck' | 'tool_infectid' | 'tool_clinicalnote';

const API = 'https://ekgscan.com';

const App: React.FC = () => {
  const [isAdminRoute] = useState(() => window.location.pathname.startsWith('/admin'));
  const [isSoulMD] = useState(() => {
    const h = window.location.host.toLowerCase();
    return h === 'soulmd.us' || h === 'www.soulmd.us' || h.endsWith('.soulmd.us');
  });
  const [screen, setScreen] = useState<Screen>('landing');
  const [history, setHistory] = useState<Screen[]>(['landing']);
  const [result, setResult] = useState<EkgResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [initialMagicToken] = useState<string | null>(() => new URLSearchParams(window.location.search).get('token'));
  const [initialCheckoutResult] = useState<string | null>(() => new URLSearchParams(window.location.search).get('checkout'));

  const navigate = (s: Screen) => {
    setHistory(h => [...h, s]);
    setScreen(s);
    window.history.pushState({}, '', '/');
  };

  const goBack = () => {
    setHistory(h => {
      const newH = h.slice(0, -1);
      setScreen(newH[newH.length - 1] || 'landing');
      return newH;
    });
  };

  useEffect(() => {
    if (isAdminRoute) return;
    const handlePop = (e: PopStateEvent) => {
      e.preventDefault();
      goBack();
      window.history.pushState({}, '', '/');
    };
    window.history.pushState({}, '', '/');
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [history, isAdminRoute]);

  const handleAuth = (data: any) => {
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser({ email: data.email || '', scan_count: data.scan_count, is_subscribed: data.is_subscribed });
    navigate(isSoulMD ? 'dashboard' : 'upload');
  };

  useEffect(() => {
    if (isAdminRoute) return;
    if (initialMagicToken) {
      fetch(`${API}/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: initialMagicToken })
      })
        .then(r => r.json())
        .then(data => { if (data.access_token) handleAuth(data); })
        .catch(() => {});
      return;
    }
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.email) { setUser(data); navigate(isSoulMD ? 'dashboard' : 'upload'); } })
        .catch(() => { localStorage.removeItem('token'); setToken(''); });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    navigate('landing');
  };

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
        ? <SoulMDLanding onSignIn={()=>navigate('auth')} onSignUp={()=>navigate('auth')}/>
        : <Landing onSignIn={()=>navigate('auth')} onSignUp={()=>navigate('auth')} onTerms={()=>navigate('terms')}/>)}
      {screen==='dashboard' && user && <SuiteDashboard API={API} token={token} user={user} onLogout={handleLogout} onOpenEkgscan={()=>window.location.href='https://ekgscan.com'} onOpenTool={(slug)=>{
        const map: Record<string, Screen> = {nephroai:'tool_nephroai', rxcheck:'tool_rxcheck', infectid:'tool_infectid', clinicalnote:'tool_clinicalnote'};
        if (map[slug]) navigate(map[slug]);
      }} checkoutResult={initialCheckoutResult}/>}
      {screen==='tool_nephroai' && user && <NephroAITool API={API} token={token} onBack={()=>navigate('dashboard')}/>}
      {screen==='tool_rxcheck' && user && <RxCheckTool API={API} token={token} onBack={()=>navigate('dashboard')}/>}
      {screen==='tool_infectid' && user && <InfectIDTool API={API} token={token} onBack={()=>navigate('dashboard')}/>}
      {screen==='tool_clinicalnote' && user && <ClinicalNoteTool API={API} token={token} onBack={()=>navigate('dashboard')}/>}
      {screen==='auth' && <Login API={API} onBack={goBack} isSoulMD={isSoulMD}/>}
      {screen==='upload' && <Upload API={API} token={token} user={user} onResult={(r,url)=>{setResult(r);setImageUrl(url);navigate('results');}} onPaywall={()=>navigate('paywall')} onLogout={handleLogout} onSignUp={()=>navigate('auth')}/>}
      {screen==='results' && result && <Results result={result} imageUrl={imageUrl} onChat={()=>navigate('chat')} onBack={goBack}/>}
      {screen==='chat' && result && <Chat result={result} API={API} token={token} onBack={goBack}/>}
      {screen==='paywall' && <Paywall onBack={goBack}/>}
      {screen==='terms' && <Terms onBack={goBack}/>}
    </div>
  );
};
export default App;
