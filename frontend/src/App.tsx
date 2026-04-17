import React, { useState, useEffect } from 'react';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Upload from './screens/Upload';
import Results from './screens/Results';
import Chat from './screens/Chat';
import Paywall from './screens/Paywall';
import Terms from './screens/Terms';

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

type Screen = 'landing' | 'login' | 'signup' | 'upload' | 'results' | 'chat' | 'paywall' | 'terms';

const API = 'https://ekgscan.com';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [result, setResult] = useState<EkgResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.email) { setUser(data); setScreen('upload'); } })
        .catch(() => { localStorage.removeItem('token'); setToken(''); });
    }
  }, []);

  const handleAuth = (data: any) => {
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser({ email: data.email || '', scan_count: data.scan_count, is_subscribed: data.is_subscribed });
    setScreen('upload');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setScreen('landing');
  };

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      {screen==='landing' && <Landing onSignIn={()=>setScreen('login')} onSignUp={()=>setScreen('signup')} onTerms={()=>setScreen('terms')}/>}
      {screen==='login' && <Login API={API} onAuth={handleAuth} onBack={()=>setScreen('landing')} isSignup={false}/>}
      {screen==='signup' && <Login API={API} onAuth={handleAuth} onBack={()=>setScreen('landing')} isSignup={true}/>}
      {screen==='upload' && <Upload API={API} token={token} user={user} onResult={(r,url)=>{setResult(r);setImageUrl(url);setScreen('results');}} onPaywall={()=>setScreen('paywall')} onLogout={handleLogout} onSignUp={()=>setScreen('signup')}/>}
      {screen==='results' && result && <Results result={result} imageUrl={imageUrl} onChat={()=>setScreen('chat')} onBack={()=>setScreen('upload')}/>}
      {screen==='chat' && result && <Chat result={result} API={API} token={token} onBack={()=>setScreen('results')}/>}
      {screen==='paywall' && <Paywall onBack={()=>setScreen('upload')}/>}
      {screen==='terms' && <Terms onBack={()=>setScreen('landing')}/>}
    </div>
  );
};
export default App;
