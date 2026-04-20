// © 2026 SoulMD. All rights reserved.
import React, { useState } from 'react';

interface Props { API: string; token: string; onBack: () => void; }

const Paywall: React.FC<Props> = ({ API, token, onBack }) => {
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState('');

  const subscribe = async (tier: 'monthly' | 'yearly') => {
    setLoading(tier); setError('');
    try {
      const res = await fetch(`${API}/billing/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ tool_slug: 'ekgscan', tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.detail || 'Could not start checkout');
      window.location.href = data.url;
    } catch (e: any) { setError(e.message); setLoading(''); }
  };

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{background:'rgba(255,255,255,0.85)', borderRadius:'24px', padding:'40px', maxWidth:'480px', width:'100%', boxShadow:'0 8px 32px rgba(100,130,200,0.12)', textAlign:'center'}}>
        <div style={{fontSize:'40px', marginBottom:'16px'}}>🫀</div>
        <div style={{fontSize:'22px', fontWeight:'800', color:'#1a2a4a', marginBottom:'8px'}}>Upgrade to Continue</div>
        <div style={{fontSize:'14px', color:'#8aa0c0', marginBottom:'28px', lineHeight:'1.6'}}>You have used your 1 free EKG scan. Upgrade for unlimited AI-powered cardiac analysis.</div>
        {['Unlimited EKG analyses','AI cardiology chat with Dr. SoulMD','Structured clinical reports','Urgent finding alerts','Cancel anytime'].map(f => (
          <div key={f} style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', textAlign:'left'}}>
            <div style={{width:'18px', height:'18px', borderRadius:'50%', background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'white', flexShrink:0}}>✓</div>
            <span style={{fontSize:'13px', color:'#1a2a4a'}}>{f}</span>
          </div>
        ))}
        <div style={{height:'1px', background:'rgba(122,176,240,0.2)', margin:'24px 0'}}/>
        {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'10px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px'}}>
          <button onClick={()=>subscribe('monthly')} disabled={!!loading} style={{display:'block', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'16px', padding:'20px 12px', cursor:'pointer', textAlign:'center', opacity: loading && loading !== 'monthly' ? 0.6 : 1}}>
            <div style={{fontSize:'11px', color:'#8aa0c0', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px'}}>Monthly</div>
            <div style={{fontSize:'28px', fontWeight:'900', color:'#1a2a4a'}}>$9.99</div>
            <div style={{fontSize:'11px', color:'#8aa0c0'}}>{loading === 'monthly' ? 'Loading…' : 'per month'}</div>
          </button>
          <button onClick={()=>subscribe('yearly')} disabled={!!loading} style={{display:'block', background:'linear-gradient(135deg,rgba(122,176,240,0.15),rgba(155,143,232,0.15))', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'16px', padding:'20px 12px', cursor:'pointer', textAlign:'center', opacity: loading && loading !== 'yearly' ? 0.6 : 1}}>
            <div style={{fontSize:'11px', color:'#4a7ad0', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px'}}>Yearly · save</div>
            <div style={{fontSize:'28px', fontWeight:'900', color:'#1a2a4a'}}>$89.99</div>
            <div style={{fontSize:'11px', color:'#8aa0c0'}}>{loading === 'yearly' ? 'Loading…' : 'per year'}</div>
          </button>
        </div>
        <div style={{fontSize:'11px', color:'#a0b0c8', marginBottom:'20px'}}>Secure payment via Stripe · Cancel anytime</div>
        <button onClick={onBack} style={{background:'none', border:'none', color:'#8aa0c0', fontSize:'13px', cursor:'pointer'}}>Maybe later</button>
      </div>
    </div>
  );
};
export default Paywall;
