// © 2026 SoulMD, LLC. All rights reserved.
// /patient — patient-branded sign-in page. Sends a magic link and stashes
// a post-auth redirect so the user lands on /concierge?view=patient after
// clicking the link.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';

interface Props { API: string; }

const BG = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 50%, #DFEAFC 100%)';
const NAVY = '#1F1B3A';
const PURPLE = '#534AB7';
const PURPLE_SOFT = '#6B6889';
const GOLD = '#C9A84C';
const SERIF = '"Cormorant Garamond","Playfair Display",Georgia,serif';

const POST_AUTH_REDIRECT = '/concierge?view=patient';

// Inject floating-sparkle keyframes once. The sparkles are absolutely
// positioned spans with random left/duration/delay that drift from below
// the viewport up and out the top, fading near the end.
if (typeof document !== 'undefined' && !document.getElementById('__soulmd_patient_sparkles')) {
  const s = document.createElement('style');
  s.id = '__soulmd_patient_sparkles';
  s.textContent = `
    @keyframes soulmdSparkleDrift {
      0%   { transform: translate3d(0, 8vh, 0)  scale(0.6); opacity: 0; }
      10%  { opacity: 0.9; }
      60%  { opacity: 0.85; }
      100% { transform: translate3d(6px, -110vh, 0) scale(1.05); opacity: 0; }
    }
    @keyframes soulmdSparkleTwinkle {
      0%,100% { filter: brightness(1); }
      50%     { filter: brightness(1.6); }
    }
  `;
  document.head.appendChild(s);
}

interface Sparkle { id: number; left: number; size: number; duration: number; delay: number; opacity: number; }

const makeSparkles = (n: number): Sparkle[] => {
  const out: Sparkle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: i,
      left: Math.random() * 100,
      size: 4 + Math.random() * 7,
      duration: 14 + Math.random() * 14,
      delay: -Math.random() * 20,
      opacity: 0.4 + Math.random() * 0.5,
    });
  }
  return out;
};

const SparkleLayer: React.FC = () => {
  const [sparkles] = useState(() => makeSparkles(22));
  return (
    <div aria-hidden="true" style={{position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden'}}>
      {sparkles.map(sp => (
        <span
          key={sp.id}
          style={{
            position:'absolute',
            left: `${sp.left}vw`,
            bottom: '-6vh',
            width: `${sp.size}px`,
            height: `${sp.size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${GOLD} 0%, rgba(201,168,76,0.6) 45%, transparent 72%)`,
            boxShadow: `0 0 ${Math.round(sp.size * 1.2)}px rgba(201,168,76,0.35)`,
            opacity: sp.opacity,
            animation: `soulmdSparkleDrift ${sp.duration}s linear ${sp.delay}s infinite, soulmdSparkleTwinkle ${sp.duration * 0.37}s ease-in-out ${sp.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

const PatientLogin: React.FC<Props> = ({ API }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // Stash the post-auth destination as soon as this screen mounts. Doing it
  // here (rather than on submit) covers the case where the user clicks the
  // link from the same browser but never actually hits "Send" — e.g. they
  // typed /patient, realised they're logged in elsewhere, and went to the
  // patient PWA via a different tab. handleAuth reads sessionStorage
  // first; localStorage acts as a cross-tab/longer-lived fallback.
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
    <div style={{minHeight:'100vh', background: BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <SparkleLayer/>

      <main style={{position:'relative', zIndex:1, flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px'}}>
        <div style={{width:'100%', maxWidth:'440px', display:'flex', flexDirection:'column', alignItems:'center'}}>
          {/* Logo */}
          <div style={{marginBottom:'24px'}}>
            <SoulMDLogo size={80}/>
          </div>

          {/* Heading */}
          <div style={{fontFamily: SERIF, fontSize:'clamp(30px,6vw,38px)', fontWeight:600, color: NAVY, letterSpacing:'-0.3px', textAlign:'center', lineHeight:1.15}}>
            SoulMD Concierge
          </div>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(15px,3.5vw,17px)', color: PURPLE, marginTop:'8px', textAlign:'center', letterSpacing:'0.2px'}}>
            Where Science Meets the Soul
          </div>

          {/* Divider with sparkle */}
          <div style={{display:'flex', alignItems:'center', gap:'12px', width:'60%', margin:'22px 0 26px', opacity:0.75}}>
            <div style={{flex:1, height:'0.5px', background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)`}}/>
            <span style={{color: GOLD, fontSize:'12px', letterSpacing:'1px'}}>✦</span>
            <div style={{flex:1, height:'0.5px', background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)`}}/>
          </div>

          {/* Card */}
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

          {/* Footer */}
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
