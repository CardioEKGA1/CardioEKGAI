import React, { useState } from 'react';
interface Props { API: string; onBack: () => void; }
const Login: React.FC<Props> = ({ API, onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/magic-link`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not send sign-in link.');
      setSent(true);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  const s = {width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.3)',fontSize:'14px',color:'#1a2a4a',background:'rgba(240,246,255,0.5)',marginBottom:'16px',outline:'none',boxSizing:'border-box' as any};
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#4a7ad0',fontSize:'13px',cursor:'pointer',marginBottom:'20px',padding:'0'}}>← Back</button>
        {sent ? (
          <>
            <div style={{fontSize:'24px',fontWeight:'800',color:'#1a2a4a',marginBottom:'6px'}}>Check your inbox</div>
            <div style={{fontSize:'13px',color:'#8aa0c0',marginBottom:'28px',lineHeight:'1.6'}}>We sent a sign-in link to <b style={{color:'#1a2a4a'}}>{email}</b>. Click it to continue. The link expires in 15 minutes.</div>
            <button onClick={()=>{setSent(false);setEmail('');setError('');}} style={{width:'100%',background:'rgba(255,255,255,0.8)',border:'1px solid rgba(122,176,240,0.3)',borderRadius:'14px',padding:'14px',fontSize:'14px',fontWeight:'600',color:'#4a7ad0',cursor:'pointer'}}>Use a different email</button>
          </>
        ) : (
          <>
            <div style={{fontSize:'24px',fontWeight:'800',color:'#1a2a4a',marginBottom:'6px'}}>Sign in to EKGScan</div>
            <div style={{fontSize:'13px',color:'#8aa0c0',marginBottom:'28px',lineHeight:'1.6'}}>Enter your email and we'll send you a sign-in link. New users get 1 free scan — no password required.</div>
            {error && <div style={{background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#c04040',marginBottom:'16px'}}>{error}</div>}
            <input type="text" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} style={s}/>
            <button onClick={submit} disabled={loading} style={{width:'100%',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'700',color:'white',cursor:'pointer'}}>
              {loading ? 'Sending...' : 'Send Sign-In Link'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
export default Login;
