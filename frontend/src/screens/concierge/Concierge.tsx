// © 2026 SoulMD, LLC. All rights reserved.
// Concierge router. Calls /concierge/me to resolve role, then hands off to
// the physician dashboard, the patient PWA, or a landing/ineligible screen.
import React, { useEffect, useState } from 'react';
import PhysicianDashboard from './PhysicianDashboard';
import PatientApp from './PatientApp';
import ChoKuRei from './ChoKuRei';

interface Props { API: string; token: string; onBack: () => void; }

type MePayload =
  | { role: 'physician'; email: string; owner_email?: string }
  | { role: 'patient';   email: string; patient: any }
  | { role: 'none';      email: string };

const HIPAA_ACK_KEY = 'concierge_hipaa_ack_v2';

const Concierge: React.FC<Props> = ({ API, token, onBack }) => {
  const [me, setMe] = useState<MePayload | null>(null);
  const [err, setErr] = useState<string>('');
  const [hipaaAcked, setHipaaAcked] = useState<boolean>(() => {
    try { return localStorage.getItem(HIPAA_ACK_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    fetch(`${API}/concierge/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.status === 401) { onBack(); return null; }
        if (!r.ok) throw new Error('load_failed');
        return r.json();
      })
      .then(d => { if (d) setMe(d); })
      .catch(() => setErr('Could not load your Concierge account.'));
  }, [API, token, onBack]);

  const ackHipaa = () => {
    try { localStorage.setItem(HIPAA_ACK_KEY, '1'); } catch {}
    setHipaaAcked(true);
  };

  if (err) {
    return (
      <div style={shellStyle}>
        <div style={{color:'#6b4e7c', fontSize:'13px', textAlign:'center'}}>
          {err} <button onClick={onBack} style={smallBtn}>Back</button>
        </div>
      </div>
    );
  }
  if (!me) {
    return (
      <div style={shellStyle}>
        <div style={{textAlign:'center', color:'#6b4e7c'}}>
          <div style={{fontSize:'32px', marginBottom:'8px'}}>✨</div>
          <div style={{fontSize:'12px', opacity:0.75}}>Opening your Concierge…</div>
        </div>
      </div>
    );
  }

  // HIPAA acknowledgment — shown once across both roles. Kept here so it
  // gates everything behind it in a single place.
  if (!hipaaAcked) {
    return <HipaaAckGate onAck={ackHipaa} onBack={onBack}/>;
  }

  if (me.role === 'physician') return <PhysicianDashboard API={API} token={token} onBack={onBack}/>;
  if (me.role === 'patient')   return <PatientApp API={API} token={token} onBack={onBack}/>;
  return <NotEnrolled email={me.email} onBack={onBack}/>;
};

const NotEnrolled: React.FC<{email: string; onBack: () => void}> = ({ email, onBack }) => (
  <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#E0F4FA,#F6BFD3)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif'}}>
    <div style={{position:'relative', maxWidth:'420px', width:'100%', background:'rgba(255,255,255,0.78)', borderRadius:'24px', padding:'32px', boxShadow:'0 20px 60px rgba(107,78,124,0.18)', textAlign:'center', overflow:'hidden'}}>
      <div style={{position:'absolute', top:'-20px', right:'-20px', opacity:0.08}}><ChoKuRei size={160} color="#6b4e7c" opacity={1}/></div>
      <div style={{fontSize:'11px', letterSpacing:'3px', textTransform:'uppercase', color:'#6b4e7c', opacity:0.7, fontWeight:700}}>SoulMD Concierge</div>
      <div style={{fontSize:'22px', fontWeight:800, color:'#4a2d6b', marginTop:'6px', lineHeight:1.2}}>Where science meets the soul</div>
      <div style={{fontSize:'13px', color:'#6b4e7c', marginTop:'12px', lineHeight:1.6}}>
        Your email {email} isn't linked to a Concierge membership yet. Concierge enrollment is direct-pay and by invitation during beta.
      </div>
      <div style={{fontSize:'11px', color:'#6b4e7c', opacity:0.7, marginTop:'14px', lineHeight:1.6}}>
        Interested in membership? Reply to your intake email from Dr. Anderson or email <a href="mailto:anderson@soulmd.us" style={{color:'#2ABFBF', textDecoration:'none', fontWeight:700}}>anderson@soulmd.us</a>.
      </div>
      <button onClick={onBack} style={{marginTop:'22px', background:'linear-gradient(135deg,#F6BFD3,#E890B0)', border:'none', color:'white', borderRadius:'14px', padding:'12px 24px', fontSize:'13px', fontWeight:800, cursor:'pointer'}}>Back to SoulMD</button>
    </div>
  </div>
);

const HipaaAckGate: React.FC<{onAck: () => void; onBack: () => void}> = ({ onAck, onBack }) => (
  <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#E0F4FA,#F6BFD3)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif'}}>
    <div style={{background:'white', borderRadius:'22px', padding:'28px', maxWidth:'480px', width:'100%', boxShadow:'0 24px 60px rgba(107,78,124,0.2)'}}>
      <div style={{fontSize:'24px', marginBottom:'8px'}}>⚠️</div>
      <div style={{fontSize:'18px', fontWeight:800, color:'#4a2d6b', marginBottom:'10px'}}>Before you continue</div>
      <p style={{fontSize:'13px', color:'#6b4e7c', lineHeight:1.7, margin:'0 0 14px 0'}}>
        <strong>SoulMD Concierge is a direct-pay medical practice. Not insurance. Not HIPAA compliant yet</strong> — do not enter identifying patient information during beta. For emergencies call 911.
      </p>
      <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', flexWrap:'wrap'}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(107,78,124,0.2)', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'#6b4e7c', cursor:'pointer'}}>Back to SoulMD</button>
        <button onClick={onAck} style={{background:'linear-gradient(135deg,#2ABFBF,#6b4e7c)', border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:800, color:'white', cursor:'pointer'}}>I understand — continue</button>
      </div>
    </div>
  </div>
);

const shellStyle: React.CSSProperties = {
  minHeight:'100vh', background:'linear-gradient(135deg,#E0F4FA,#F6BFD3)',
  display:'flex', alignItems:'center', justifyContent:'center',
  fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
};
const smallBtn: React.CSSProperties = {
  marginLeft:'10px', background:'rgba(255,255,255,0.85)', border:'1px solid rgba(107,78,124,0.2)',
  borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:700, color:'#6b4e7c', cursor:'pointer',
};

export default Concierge;
