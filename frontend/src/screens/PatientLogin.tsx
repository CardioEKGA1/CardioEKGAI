// © 2026 SoulMD, LLC. All rights reserved.
// /patient — patient-branded sign-in. Submits the magic-link request
// with is_patient_login=true so the backend can gate the send on
// physician approval (and silently notify Dr. Anderson when an
// unapproved email tries). Whether or not a link is actually sent,
// we always show the same neutral "Request Received" holding card —
// the page never reveals account state. A separate banner is shown
// when App.tsx redirects an authed-but-revoked patient back here.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { PATIENT_BG, NAVY, PURPLE, PURPLE_SOFT, SERIF, SparkleLayer, SparkleDivider } from './patient/shared';

interface Props { API: string; onRequestMembership?: () => void; }

// The onboarding gate lives at /patient (see App.tsx) — it reads the
// onboarding status and routes to /patient/terms, /patient/intake, or
// /concierge?view=patient as appropriate.
const POST_AUTH_REDIRECT = '/patient';
// App.tsx writes this when it boots an authed-but-unapproved patient
// off the PWA. PatientLogin reads + clears it on mount.
const RESTRICTED_KEY = 'soulmd_patient_login_message';

const GOLD = '#C9A84C';
const GOLD_DEEP = '#A88830';
const NAVY_DARK = '#1a2a4a';
const MUTED = '#6B7280';

const PatientLogin: React.FC<Props> = ({ API, onRequestMembership }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [restrictedMessage, setRestrictedMessage] = useState('');

  // Stash the post-auth destination as soon as this screen mounts so the
  // redirect survives the magic-link round-trip.
  useEffect(() => {
    try { sessionStorage.setItem('soulmd_post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
    try { localStorage.setItem('post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
    try {
      const msg = sessionStorage.getItem(RESTRICTED_KEY);
      if (msg) {
        setRestrictedMessage(msg);
        sessionStorage.removeItem(RESTRICTED_KEY);
      }
    } catch {}
  }, []);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      try { sessionStorage.setItem('soulmd_post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
      try { localStorage.setItem('post_auth_redirect', POST_AUTH_REDIRECT); } catch {}
      // is_patient_login=true tells the backend to apply the
      // physician-approval gate. Unapproved emails get a silent 200
      // (we still flip to the holding card) and Dr. Anderson is
      // notified out-of-band so she can approve the request.
      await fetch(`${API}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, is_patient_login: true }),
      });
      // Always flip to the holding card — never reveal whether the
      // email was approved, rate-limited, or unknown.
      setSent(true);
    } catch (e: any) {
      // Network/CORS errors only — backend errors are intentionally
      // squashed into 200s so we never leak account state.
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goRequestMembership = () => {
    if (onRequestMembership) onRequestMembership();
    else window.location.href = '/';
  };

  const canSubmit = !!email.trim();

  return (
    <div style={{minHeight:'100vh', background: PATIENT_BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <SparkleLayer/>

      <main style={{position:'relative', zIndex:1, flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px'}}>
        <div style={{width:'100%', maxWidth:'440px', display:'flex', flexDirection:'column', alignItems:'center'}}>
          <div style={{marginBottom:'24px'}}>
            <SoulMDLogo size={56} showText={false}/>
          </div>

          <div style={{fontFamily: SERIF, fontSize:'clamp(30px,6vw,38px)', fontWeight:600, color: NAVY, letterSpacing:'-0.3px', textAlign:'center', lineHeight:1.15}}>
            SoulMD Concierge
          </div>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(15px,3.5vw,17px)', color: PURPLE, marginTop:'8px', textAlign:'center', letterSpacing:'0.2px'}}>
            Where Science Meets the Soul
          </div>

          <SparkleDivider/>

          {restrictedMessage && !sent && (
            <div style={{
              width:'100%', marginBottom:'16px',
              background:'rgba(201,168,76,0.08)',
              border:`1px solid ${GOLD}`,
              borderRadius:'14px',
              padding:'14px 16px',
              textAlign:'center',
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'13.5px', color: NAVY_DARK, lineHeight:1.6,
            }}>
              {restrictedMessage}
            </div>
          )}

          <div style={{width:'100%', background:'rgba(255,255,255,0.78)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:'22px', padding:'28px 24px', boxShadow:'0 20px 40px rgba(83,74,183,0.12)', border:'0.5px solid rgba(255,255,255,0.9)'}}>
            {sent ? (
              <div style={{textAlign:'center', padding:'8px 0 4px'}}>
                <div style={{
                  fontFamily: SERIF, fontSize:'28px', color: GOLD,
                  marginBottom:'10px', letterSpacing:'0.04em',
                }}>✦</div>
                <div style={{
                  fontFamily: SERIF, fontSize:'22px', fontWeight:600,
                  color: NAVY_DARK, marginBottom:'14px', letterSpacing:'0.02em',
                }}>
                  Request Received
                </div>
                <div style={{
                  fontFamily: SERIF, fontSize:'14px',
                  color: NAVY_DARK, lineHeight:1.85, opacity:0.85,
                  maxWidth:'320px', margin:'0 auto',
                }}>
                  If your email is associated with an active SoulMD membership, you'll receive a sign-in link within minutes.
                </div>
                <div style={{
                  margin:'24px auto 4px', height:'1px', width:'40px',
                  background: GOLD,
                }}/>
                <div style={{
                  marginTop:'18px',
                  fontFamily: SERIF, fontSize:'13px',
                  color: MUTED, lineHeight:1.7,
                }}>
                  New to SoulMD? →
                </div>
                <button
                  onClick={goRequestMembership}
                  style={{
                    marginTop:'12px',
                    background:'transparent',
                    border:`1px solid ${GOLD}`,
                    color: GOLD_DEEP,
                    fontFamily: SERIF,
                    fontSize:'13px', letterSpacing:'0.08em',
                    textTransform:'uppercase', fontWeight:600,
                    padding:'12px 24px', borderRadius:'2px',
                    cursor:'pointer',
                  }}>
                  Request Membership
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
            Need help? <a href="mailto:support@soulmd.us" style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>support@soulmd.us</a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientLogin;
