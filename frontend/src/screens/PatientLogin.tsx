// © 2026 SoulMD, LLC. All rights reserved.
// /patient — patient-branded sign-in. Sends a magic link and stashes a
// post-auth redirect to /patient so the onboarding gate in App.tsx can
// route through Terms → Intake → Patient PWA after the round-trip.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { PATIENT_BG, NAVY, PURPLE, PURPLE_SOFT, SERIF, SparkleLayer, SparkleDivider } from './patient/shared';

interface Props { API: string; }

// The onboarding gate lives at /patient (see App.tsx) — it reads the
// onboarding status and routes to /patient/terms, /patient/intake, or
// /concierge?view=patient as appropriate.
const POST_AUTH_REDIRECT = '/patient';

const PatientLogin: React.FC<Props> = ({ API }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // Stash the post-auth destination as soon as this screen mounts so the
  // redirect survives the magic-link round-trip. handleAuth reads
  // sessionStorage first; localStorage is the longer-lived fallback.
  useEffect(() => {
    try { sessionStorage.setItem('soulmd_post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
    try { localStorage.setItem('post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
  }, []);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      try { sessionStorage.setItem('soulmd_post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
      try { localStorage.setItem('post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
      const res = await fetch(`${API}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not send sign-in link.');
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Could not send sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!email.trim();

  return (
    <div style={{minHeight:'100vh', background: PATIENT_BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <SparkleLayer/>

      <main style={{position:'relative', zIndex:1, flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px'}}>
        <div style={{width:'100%', maxWidth:'440px', display:'flex', flexDirection:'column', alignItems:'center'}}>
          <div style={{marginBottom:'24px'}}>
            <SoulMDLogo size={80}/>
          </div>

          <div style={{fontFamily: SERIF, fontSize:'clamp(30px,6vw,38px)', fontWeight:600, color: NAVY, letterSpacing:'-0.3px', textAlign:'center', lineHeight:1.15}}>
            SoulMD Concierge
          </div>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(15px,3.5vw,17px)', color: PURPLE, marginTop:'8px', textAlign:'center', letterSpacing:'0.2px'}}>
            Where Science Meets the Soul
          </div>

          <SparkleDivider/>

          <div style={{width:'100%', background:'rgba(255,255,255,0.78)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:'22px', padding:'28px 24px', boxShadow:'0 20px 40px rgba(83,74,183,0.12)', border:'0.5px solid rgba(255,255,255,0.9)'}}>
            {sent ? (
              <div style={{textAlign:'center', padding:'8px 0 4px'}}>
                <div style={{fontSize:'34px', marginBottom:'6px'}}>✨</div>
                <div style={{fontFamily: SERIF, fontSize:'22px', fontWeight:600, color: NAVY, marginBottom:'10px'}}>Check your email for your sign-in link</div>
                <div style={{fontSize:'13px', color: PURPLE_SOFT, lineHeight:1.6}}>
                  We sent a sign-in link to <b style={{color: NAVY}}>{email.trim()}</b>. The link expires in 15 minutes.
                </div>
                <button
                  onClick={() => { setSent(false); setEmail(''); setError(''); }}
                  style={{marginTop:'22px', background:'transparent', border:`0.5px solid ${PURPLE}40`, color: PURPLE, borderRadius:'12px', padding:'10px 18px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.25)', borderRadius:'10px', padding:'10px 12px', fontSize:'12.5px', color:'#a02020', marginBottom:'14px', textAlign:'center'}}>
                    {error}
                  </div>
                )}
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSubmit && submit()}
                  style={{
                    width:'100%', padding:'14px 16px', borderRadius:'14px',
                    border:'1px solid rgba(83,74,183,0.18)',
                    background:'rgba(255,255,255,0.9)',
                    fontSize:'15px', color: NAVY, outline:'none', boxSizing:'border-box',
                    marginBottom:'14px', fontFamily:'inherit',
                  }}
                />
                <button
                  onClick={submit}
                  disabled={loading || !canSubmit}
                  style={{
                    width:'100%', padding:'14px 18px', borderRadius:'14px',
                    background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)',
                    color:'white', border:'none',
                    fontSize:'15px', fontWeight:800, letterSpacing:'0.2px',
                    cursor: (loading || !canSubmit) ? 'default' : 'pointer',
                    opacity: (loading || !canSubmit) ? 0.65 : 1,
                    boxShadow:'0 10px 26px rgba(83,74,183,0.28)',
                    fontFamily:'inherit',
                  }}
                >
                  {loading ? 'Sending…' : 'Send My Sign-In Link'}
                </button>
              </>
            )}
          </div>

          <div style={{marginTop:'28px', fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: PURPLE_SOFT, textAlign:'center', letterSpacing:'0.3px', opacity:0.85}}>
            Your journey. Your healing. Your space.
          </div>
          <div style={{marginTop:'10px', fontSize:'11px', color: PURPLE_SOFT, textAlign:'center', opacity:0.7}}>
            Need help? <a href="mailto:anderson@soulmd.us" style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>anderson@soulmd.us</a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientLogin;
