import React, { useState } from 'react';

interface Props { API: string; onAuth: (data: any) => void; onBack: () => void; isSignup: boolean; }

const Login: React.FC<Props> = ({ API, onAuth, onBack, isSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true); setError('');
    const endpoint = isSignup ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      data.email = email;
      onAuth(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',c
cat > ~/Desktop/CardioEKGAI/frontend/src/screens/Login.tsx << 'ENDOFFILE'
import React, { useState } from 'react';

interface Props { API: string; onAuth: (data: any) => void; onBack: () => void; isSignup: boolean; }

const Login: React.FC<Props> = ({ API, onAuth, onBack, isSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true); setError('');
    const endpoint = isSignup ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      data.email = email;
      onAuth(data);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#4a7ad0',fontSize:'13px',cursor:'pointer',marginBottom:'20px',padding:'0'}}>← Back</button>
        <div style={{fontSize:'24px',fontWeight:'800',color:'#1a2a4a',marginBottom:'6px'}}>{isSignup ? 'Create Account' : 'Welcome Back'}</div>
        <div style={{fontSize:'13px',color:'#8aa0c0',marginBottom:'28px'}}>{isSignup ? 'Sign up for 1 free EKG scan' : 'Sign in to your account'}</div>
        {error && <div style={{background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#c04040',marginBottom:'16px'}}>{error}</div>}
        <input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}
          style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'14px',color:'#1a2a4a',background:'rgba(240,246,255,0.5)',marginBottom:'12px',outline:'none',boxSizing:'border-box'}}/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()}
          style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'14px',color:'#1a2a4a',background:'rgba(240,246,255,0.5)',marginBottom:'20px',outline:'none',boxSizing:'border-box'}}/>
        <button onClick={submit} disabled={loading} style={{width:'100%',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'700',color:'white',cursor:'pointer',marginBottom:'16px'}}>
          {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
        </button>
        <div style={{textAlign:'center',fontSize:'13px',color:'#8aa0c0'}}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={()=>window.location.reload()} style={{color:'#4a7ad0',cursor:'pointer',fontWeight:'600'}}>
            {isSignup ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  );
};
export default Login;
