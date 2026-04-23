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
  | { role: 'patient';   email: string; patient: any; is_superuser?: boolean }
  | { role: 'none';      email: string };

const HIPAA_ACK_KEY = 'concierge_hipaa_ack_v2';

const Concierge: React.FC<Props> = ({ API, token, onBack }) => {
  const [me, setMe] = useState<MePayload | null>(null);
  const [err, setErr] = useState<string>('');
  const [hipaaAcked, setHipaaAcked] = useState<boolean>(() => {
    try { return localStorage.getItem(HIPAA_ACK_KEY) === '1'; } catch { return false; }
  });

  // Superuser override: when the URL carries ?view=patient, ask the backend
  // to hand back patient-role for the Concierge owner/superuser so the
  // practice owner can exercise the patient PWA on their own account.
  // Backend auto-provisions a test-flagged ConciergePatient row on first hit.
  const viewOverride = React.useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('view'); }
    catch { return null; }
  }, []);

  useEffect(() => {
    const url = viewOverride === 'patient'
      ? `${API}/concierge/me?view=patient`
      : `${API}/concierge/me`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.status === 401) { onBack(); return null; }
        if (!r.ok) throw new Error('load_failed');
        return r.json();
      })
      .then(d => { if (d) setMe(d); })
      .catch(() => setErr('Could not load your Concierge account.'));
  }, [API, token, onBack, viewOverride]);

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
  if (me.role === 'patient')   return <PatientApp API={API} token={token} onBack={onBack} isSuperuser={!!me.is_superuser}/>;
  return <NotEnrolled email={me.email} onBack={onBack}/>;
};

const NotEnrolled: React.FC<{email: string; onBack: () => void}> = ({ email, onBack }) => {
  const DEEPP = '#6b4e7c';
  const INK   = '#4a2d6b';
  const TEAL  = '#2ABFBF';
  const ROSE  = '#E890B0';

  const tiers = [
    {
      id: 'awaken', label: 'Awaken', monthly: 444, yearly: 5000,
      tagline: 'Begin the practice',
      bullets: ['2 medical visits / month (max 30 min)', '1 guided meditation / month', 'Secure direct messaging with Dr. Anderson'],
      accent: '#7ab0f0',
    },
    {
      id: 'align',  label: 'Align',  monthly: 888, yearly: 10000,
      tagline: 'Deepen the work',
      bullets: ['3 medical visits / month (max 30 min)', '2 guided meditations / month', 'Lab-review turnaround within 48h'],
      accent: TEAL, featured: true,
    },
    {
      id: 'ascend', label: 'Ascend', monthly: 1111, yearly: 13000,
      tagline: 'Fully integrated care',
      bullets: ['5 medical visits / month (max 30 min)', '4 guided meditations / month', 'Same-day scheduling', 'Monthly integrative review'],
      accent: '#1a2a4a',
    },
  ];

  const alaCarte = [
    ['Medical consultation (max 30 min)', '$300'],
    ['Extended visit (per additional 15 min)', '$150'],
    ['Guided meditation (30 min)', '$44'],
    ['Urgent same-day consult', '$444'],
    ['Lab result review + async message', '$75'],
  ];

  const requestMembership = () => {
    const subject = encodeURIComponent('Interested in SoulMD Concierge membership');
    const body = encodeURIComponent(
      `Hi Dr. Anderson,\n\n` +
      `I'm interested in joining SoulMD Concierge. A bit about me:\n\n` +
      `Name: \n` +
      `Age: \n` +
      `What drew me to this practice: \n` +
      `What I'd most like support around: \n` +
      `Preferred tier (Awaken / Align / Ascend): \n\n` +
      `My email on file: ${email}\n\n` +
      `Thank you — I look forward to hearing from you.`
    );
    window.location.href = `mailto:anderson@soulmd.us?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#E0F4FA 0%,#F6BFD3 100%)', fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,sans-serif', paddingBottom:'40px', position:'relative'}}>
      {/* Cho Ku Rei watermark layer */}
      <div aria-hidden="true" style={{position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden'}}>
        <div style={{position:'absolute', top:'8%',  left:'-30px'}}><ChoKuRei size={220} color={DEEPP} opacity={0.05}/></div>
        <div style={{position:'absolute', top:'38%', right:'-30px'}}><ChoKuRei size={180} color={TEAL}  opacity={0.04}/></div>
        <div style={{position:'absolute', bottom:'12%', left:'8%'}}><ChoKuRei size={160} color={ROSE}  opacity={0.04}/></div>
      </div>

      <div style={{position:'relative', zIndex:1, maxWidth:'720px', margin:'0 auto', padding:'24px 20px'}}>
        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px'}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(107,78,124,0.15)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:DEEPP, cursor:'pointer', fontFamily:'inherit'}}>← SoulMD</button>
          <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color:DEEPP, opacity:0.7, fontWeight:800}}>Concierge · Beta</div>
        </div>

        {/* Hero */}
        <div style={{textAlign:'center', marginBottom:'28px', padding:'20px 4px'}}>
          <div style={{fontFamily:'"Cormorant Garamond",Georgia,serif', fontSize:'clamp(30px,7vw,40px)', fontWeight:600, color:INK, lineHeight:1.15, letterSpacing:'-0.3px'}}>
            Where science meets the soul
          </div>
          <div style={{fontFamily:'"Cormorant Garamond",Georgia,serif', fontStyle:'italic', fontSize:'clamp(15px,3.8vw,17px)', color:DEEPP, marginTop:'14px', lineHeight:1.6, maxWidth:'520px', margin:'14px auto 0'}}>
            A direct-pay, physician-led integrative medicine practice. No insurance. No rush. No 12-minute visits. Monthly support paired with daily rituals of meaning.
          </div>
        </div>

        {/* Tier cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'12px', marginBottom:'28px'}}>
          {tiers.map(t => (
            <div key={t.id} style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter:'blur(10px)',
              borderRadius:'20px',
              padding:'22px 18px',
              border: t.featured ? `2px solid ${t.accent}` : '1px solid rgba(255,255,255,0.9)',
              boxShadow: t.featured ? `0 16px 32px ${t.accent}22` : '0 8px 24px rgba(107,78,124,0.1)',
              position:'relative',
            }}>
              {t.featured && (
                <div style={{position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)', background:t.accent, color:'white', fontSize:'9px', fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', padding:'4px 14px', borderRadius:'999px', whiteSpace:'nowrap'}}>Most chosen</div>
              )}
              <div style={{fontSize:'10px', fontWeight:800, letterSpacing:'2px', textTransform:'uppercase', color:t.accent}}>{t.label}</div>
              <div style={{fontFamily:'"Cormorant Garamond",Georgia,serif', fontStyle:'italic', fontSize:'14px', color:DEEPP, marginTop:'4px'}}>{t.tagline}</div>
              <div style={{fontSize:'32px', fontWeight:800, color:INK, marginTop:'12px', lineHeight:1}}>${t.monthly.toLocaleString()}<span style={{fontSize:'14px', fontWeight:600, color:DEEPP, opacity:0.7}}>/mo</span></div>
              <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'4px'}}>or ${t.yearly.toLocaleString()}/yr</div>
              <ul style={{listStyle:'none', padding:0, margin:'16px 0 0 0', display:'flex', flexDirection:'column', gap:'6px'}}>
                {t.bullets.map(b => (
                  <li key={b} style={{fontSize:'12px', color:INK, display:'flex', alignItems:'flex-start', gap:'7px', lineHeight:1.45}}>
                    <span style={{color: t.accent, fontWeight:800, flexShrink:0}}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* À la carte */}
        <div style={{background:'rgba(255,255,255,0.82)', borderRadius:'20px', padding:'22px', marginBottom:'28px', border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 8px 24px rgba(107,78,124,0.08)'}}>
          <div style={{fontSize:'10px', fontWeight:800, letterSpacing:'2px', textTransform:'uppercase', color:DEEPP, opacity:0.75, marginBottom:'12px'}}>À la carte — available to non-members</div>
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            {alaCarte.map(([label, price]) => (
              <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'6px 0', borderBottom:'1px dashed rgba(107,78,124,0.12)', fontSize:'13px', color:INK}}>
                <span>{label}</span>
                <span style={{fontWeight:800, color:INK, letterSpacing:'0.2px'}}>{price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA block */}
        <div style={{background:'linear-gradient(135deg, rgba(42,191,191,0.12), rgba(232,144,176,0.12))', border:'1px solid rgba(42,191,191,0.25)', borderRadius:'20px', padding:'22px 20px', textAlign:'center', marginBottom:'14px'}}>
          <div style={{fontFamily:'"Cormorant Garamond",Georgia,serif', fontSize:'20px', fontWeight:600, color:INK, marginBottom:'6px'}}>
            Requests are reviewed personally by Dr. Anderson.
          </div>
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.85, marginBottom:'16px', lineHeight:1.6}}>
            Tap below to send your intake. We're taking a small cohort during beta; you'll hear back within 2 business days with next steps and tier guidance.
          </div>
          <button onClick={requestMembership}
            style={{background:'linear-gradient(135deg,#2ABFBF,#6b4e7c)', color:'white', border:'none', borderRadius:'14px', padding:'14px 32px', fontSize:'14px', fontWeight:800, cursor:'pointer', boxShadow:'0 10px 24px rgba(42,191,191,0.35)', fontFamily:'inherit'}}>
            Request membership →
          </button>
          <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'14px'}}>
            Signed in as <b style={{color:INK}}>{email}</b> · <a href="mailto:anderson@soulmd.us?subject=Concierge%20question" style={{color:TEAL, textDecoration:'none', fontWeight:700}}>Ask a question</a>
          </div>
        </div>

        {/* Beta disclaimer */}
        <div style={{background:'rgba(255,255,255,0.6)', border:'1px solid rgba(232,168,64,0.35)', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'10px'}}>
          <span style={{fontSize:'14px', flexShrink:0}}>⚠️</span>
          <div style={{fontSize:'10px', color:'#8a5a10', lineHeight:1.5}}>
            <b style={{color:'#6e4208'}}>Direct-pay · Not insurance · Not HIPAA compliant yet (beta).</b> Do not enter identifying patient information in intake messages. For emergencies call 911.
          </div>
        </div>

        <div style={{textAlign:'center', fontSize:'11px', color:DEEPP, opacity:0.6, padding:'16px 0'}}>
          Already a member but don't see your account? <a href="mailto:anderson@soulmd.us?subject=Concierge%20access%20issue" style={{color:TEAL, textDecoration:'none', fontWeight:700}}>anderson@soulmd.us</a>
        </div>
      </div>
    </div>
  );
};

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
