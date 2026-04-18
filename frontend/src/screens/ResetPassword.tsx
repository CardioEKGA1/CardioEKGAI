import React, { useState, useEffect } from 'react';

interface Props { API: string; onBack: () => void; onDone: () => void; }

const ResetPassword: React.FC<Props> = ({ API, onBack, onDone }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'request'|'reset'>('request');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) { setToken(t); setMode('reset'); }
  }, []);

  const requestReset = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      setMessage(data.message);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const doReset = async () => {
    if (!password) { setError('Please enter a new password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMessage('Password reset! Redirecting to sign in...');
      setTimeout(() => onDone(), 2000);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#4a7ad0',fontSize:'13px',cursor:'pointer',marginBottom:'20px',padding:'0'}}>← Back</button>
        <div style={{fontSize:'24px',fontWeight:'800',color:'#1a2a4a',marginBottom:'6px'}}>{mode==='reset' ? 'Set New Password' : 'Reset Password'}</div>
        <div style={{fontSize:'13px',color:'#8aa0c0',marginBottom:'28px'}}>{mode==='reset' ? 'Enter your new password below' : 'Enter your email and we will send a reset link'}</div>
        {message && <div style={{background:'#e8f5e8',border:'1px solid #b0d0b0',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#2a6a2a',marginBottom:'16px'}}>{message}</div>}
        {error && <div style={{background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#c04040',marginBottom:'16px'}}>{error}</div>}
        {mode === 'request' ? (
          <>
            <input type="text" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}
              style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'14px',color:'#1a2a4a',background:'rgba(240,246,255,0.5)',marginBottom:'20px',outline:'none',boxSizing:'border-box'}}/>
            <button onClick={requestReset} disabled={loading} style={{width:'100%',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'700',color:'white',cursor:'pointer'}}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        ) : (
          <>
            <input type="password" placeholder="New password (min 8 characters)" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&doReset()}
              style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'14px',color:'#1a2a4a',background:'rgba(240,246,255,0.5)',marginBottom:'20px',outline:'none',boxSizing:'border-box'}}/>
            <button onClick={doReset} disabled={loading} style={{width:'100%',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'700',color:'white',cursor:'pointer'}}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
export default ResetPassword;
