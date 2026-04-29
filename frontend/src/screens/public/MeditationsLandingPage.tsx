// © 2026 SoulMD, LLC. All rights reserved.
//
// Public landing at soulmd.us/meditations. No auth required, not linked
// from the dashboard for non-superusers — direct URL only. Renders a
// short pitch + the request-access form. Submission persists to
// meditate_access_requests and emails Dr. Anderson.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../../SoulMDLogo';

interface Props { API: string; onHome: () => void; }

const PURPLE     = '#534AB7';
const PURPLE_BG  = '#EEEBFA';
const NAVY       = '#1a2a4a';
const NAVY_DEEP  = '#0f1a30';
const INK_SOFT   = '#6B6889';
const GOLD       = '#C9A84C';
const GOLD_SOFT  = 'rgba(201,168,76,0.16)';
const PEARL      = '#E0F4FA';
const BLUSH      = '#f0c8d8';
const SERIF      = 'Georgia, "Cormorant Garamond", "Playfair Display", "Times New Roman", serif';
const PAGE_BG    = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)';
const CARD_BG    = 'rgba(255,255,255,0.78)';
const CARD_BORDER= '0.5px solid rgba(180,210,230,0.55)';

// Hand-curated subset of the actual library categories so the preview
// pills feel concrete without needing a backend round-trip on a public,
// no-auth page. Order picked for breadth, not popularity.
const PREVIEW_CATEGORIES: string[] = [
  'Self-Healing', 'Heart Coherence', 'Chakra Balancing',
  'Sleep Healing', 'Anxiety Release', 'Inner Peace',
  'Divine Light Healing', 'Soul Purpose',
];

const PHILOSOPHY_LINE = 'Inspired by Barbara Martin · Gabby Bernstein · Abraham Hicks · Joe Dispenza · Dolores Cannon';

const MeditationsLandingPage: React.FC<Props> = ({ API, onHome }) => {
  // Update the document title on mount; <title> in index.html stays as
  // the brand-default fallback for crawlers.
  useEffect(() => { document.title = 'Guided Meditations · SoulMD'; }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr('');
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setErr('Please enter your name and a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/meditations/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), reason: reason.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Could not submit request.');
      setDone(true);
    } catch (e: any) {
      setErr(e.message || 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: NAVY, fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif'}}>
      <div style={{maxWidth:'620px', margin:'0 auto', padding:'clamp(24px,5vw,48px) clamp(20px,5vw,28px) 80px'}}>

        {/* Brand header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px'}}>
          <button onClick={onHome}
            style={{background:'transparent', border:'none', padding:0, cursor:'pointer'}}
            title="SoulMD home">
            <SoulMDLogo size={32}/>
          </button>
          <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }}
            style={{fontSize:'11px', color: INK_SOFT, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', textDecoration:'none'}}>
            soulmd.us
          </a>
        </div>

        {/* Hero */}
        <div style={{textAlign:'center', marginBottom:'28px'}}>
          <div style={{display:'inline-flex', padding:'4px 12px', borderRadius:'999px', background: GOLD_SOFT, color: GOLD, fontSize:'10px', fontWeight:800, letterSpacing:'1.8px', textTransform:'uppercase', marginBottom:'14px'}}>
            ✦ By Invitation Only
          </div>
          <h1 style={{fontFamily: SERIF, fontSize:'clamp(28px,7vw,40px)', fontWeight:600, color: NAVY, lineHeight:1.15, letterSpacing:'-0.5px', margin:'0 0 14px'}}>
            Guided Meditations<br/>by Dr. Anderson
          </h1>
          <p style={{fontSize:'15px', color: INK_SOFT, lineHeight:1.65, maxWidth:'480px', margin:'0 auto'}}>
            2,000+ guided meditation scripts across 20 categories — curated by a board-certified physician with a soul-centered approach.
          </p>
        </div>

        {/* Category preview pills */}
        <div style={{display:'flex', flexWrap:'wrap', gap:'8px', justifyContent:'center', marginBottom:'24px'}}>
          {PREVIEW_CATEGORIES.map(c => (
            <span key={c} style={{
              padding:'7px 14px', borderRadius:'999px',
              background: CARD_BG, border: CARD_BORDER,
              fontSize:'11.5px', fontWeight:700, color: PURPLE,
              letterSpacing:'0.3px',
            }}>{c}</span>
          ))}
        </div>

        <div style={{textAlign:'center', fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: INK_SOFT, lineHeight:1.7, marginBottom:'24px', padding:'0 8px'}}>
          {PHILOSOPHY_LINE}
        </div>

        {/* Invitation card */}
        <div style={{
          background: `linear-gradient(135deg, ${PEARL}80 0%, ${BLUSH}66 100%)`,
          border:`0.5px solid ${GOLD}55`,
          borderRadius:'18px',
          padding:'18px 20px',
          marginBottom:'22px',
          textAlign:'center',
          boxShadow:'0 8px 22px rgba(83,74,183,0.10)',
        }}>
          <div style={{fontSize:'13px', color: NAVY, fontFamily: SERIF, fontStyle:'italic', lineHeight:1.65}}>
            This library is currently available <span style={{color: GOLD, fontWeight:700, fontStyle:'normal'}}>by invitation only</span>.
          </div>
        </div>

        {/* Request form */}
        <div style={{
          background:'#FFFFFF',
          border:'0.5px solid rgba(83,74,183,0.14)',
          borderRadius:'20px',
          padding:'22px',
          boxShadow:'0 12px 28px rgba(83,74,183,0.10)',
        }}>
          {done ? (
            <div style={{padding:'20px 8px', textAlign:'center'}}>
              <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:'64px', height:'64px', borderRadius:'50%', background:`linear-gradient(135deg, ${GOLD}, #a8842c)`, color:'white', fontSize:'30px', fontWeight:800, marginBottom:'14px', boxShadow:'0 10px 24px rgba(201,168,76,0.28)'}}>✓</div>
              <div style={{fontFamily: SERIF, fontSize:'22px', fontWeight:600, color: NAVY, lineHeight:1.2, marginBottom:'8px'}}>
                Thank you, {name.trim().split(' ')[0] || 'friend'}.
              </div>
              <div style={{fontSize:'14px', color: INK_SOFT, lineHeight:1.65, maxWidth:'380px', margin:'0 auto'}}>
                Dr. Anderson will review your request and reach out via email.
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 style={{fontFamily: SERIF, fontSize:'19px', fontWeight:600, color: NAVY, margin:'0 0 16px'}}>Request Access</h2>

              <Field label="Full name">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  style={inputStyle}/>
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  style={inputStyle}/>
              </Field>
              <Field label="Why are you interested in guided meditations?">
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="A few sentences is plenty."
                  style={{...inputStyle, minHeight:'110px', resize:'vertical', lineHeight:1.6}}/>
              </Field>

              {err && (
                <div style={{padding:'10px 14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>
                  {err}
                </div>
              )}

              <button type="submit" disabled={submitting}
                style={{
                  width:'100%', padding:'14px 18px',
                  background:`linear-gradient(135deg, ${PURPLE} 0%, ${NAVY} 100%)`,
                  color:'white', border:'none', borderRadius:'14px',
                  fontSize:'14px', fontWeight:800, cursor: submitting ? 'wait' : 'pointer',
                  fontFamily:'inherit', letterSpacing:'0.5px',
                  boxShadow:'0 12px 28px rgba(83,74,183,0.22)',
                  opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? 'Sending…' : 'Request Access →'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign:'center', marginTop:'32px', fontSize:'12px', color: INK_SOFT, lineHeight:1.7}}>
          <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }} style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>
            ← Back to soulmd.us
          </a>
        </div>
      </div>
      {/* Suppress unused-imports warnings for tokens kept for future tuning */}
      <span style={{display:'none'}} aria-hidden>{PURPLE_BG}{NAVY_DEEP}</span>
    </div>
  );
};

const Field: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div style={{marginBottom:'14px'}}>
    <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'6px'}}>
      {label}
    </div>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px',
  borderRadius:'12px', border:'0.5px solid rgba(83,74,183,0.20)',
  background:'#FAFAFE', color: NAVY, fontSize:'14px',
  fontFamily:'inherit', outline:'none', boxSizing:'border-box',
};

export default MeditationsLandingPage;
