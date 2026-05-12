// © 2026 SoulMD, LLC. All rights reserved.
//
// Login page — magic-link only. POST /api/auth/magic-link issues a
// single-use 15-minute token; GET /api/auth/verify on click-through
// sets the soulmd_session httpOnly cookie and 302s to the destination
// stored on the token row. Allowed senders are gated by the
// magic_link_allowlist table — non-allowlisted emails get the same
// silent "If this email is registered…" response.
//
// No password field. No social login. No TOTP. No dev-login.
import React, { useEffect, useState } from 'react';
import ComplianceDisclaimer from '../ComplianceDisclaimer';

interface Props { API: string; onBack?: () => void; isSoulMD?: boolean; }

const NAVY    = '#1a2a4a';
const PURPLE  = '#534AB7';
const INK     = '#1F1B3A';
const SOFT    = '#6B6889';
const BORDER  = 'rgba(83,74,183,0.18)';
const SERIF   = 'Georgia, "Times New Roman", serif';

const ERROR_MESSAGES: Record<string, string> = {
  expired:      'This link has expired. Request a new one below.',
  used:         'This link has already been used. Request a new one.',
  invalid:      'Invalid link. Please request a new one.',
  unauthorized: "Your account doesn't have access to this page.",
};

const Login: React.FC<Props> = ({ API }) => {
  // ?error=XXX from URL (set by /api/auth/verify on failure)
  const initialError = (() => {
    try {
      const e = new URLSearchParams(window.location.search).get('error');
      return e && ERROR_MESSAGES[e] ? ERROR_MESSAGES[e] : '';
    } catch { return ''; }
  })();

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'40px 20px', fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif',
      background:'linear-gradient(135deg, #F6EEF8 0%, #FDFBF8 60%)',
    }}>
      <div style={{
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)',
        borderRadius:'22px', padding:'36px 32px',
        maxWidth:'420px', width:'100%',
        boxShadow:'0 16px 48px rgba(20,18,40,0.10)',
        border:`1px solid ${BORDER}`,
      }}>
        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <div style={{fontFamily: SERIF, fontSize:'32px', color: NAVY, fontWeight:400, letterSpacing:'0.02em'}}>SoulMD</div>
          <div style={{fontSize:'10px', letterSpacing:'1.8px', textTransform:'uppercase',
                       color: SOFT, fontWeight:700, marginTop:'4px'}}>Secure sign-in</div>
        </div>

        {initialError && <Banner severity="error" text={initialError}/>}

        <MagicLinkForm API={API}/>

        <div style={{marginTop:'28px', paddingTop:'18px', borderTop:`1px solid ${BORDER}`,
                      textAlign:'center', fontSize:'11px', color: SOFT}}>
          Need help? <a href="mailto:support@soulmd.us" style={{color: PURPLE, textDecoration:'none', fontWeight:600}}>support@soulmd.us</a>
        </div>
        <ComplianceDisclaimer style={{marginTop:'10px'}}/>
      </div>
    </div>
  );
};

const Banner: React.FC<{severity:'error'|'info'|'success'; text:string}> = ({ severity, text }) => {
  const palette = {
    error:   { bg:'rgba(196,74,74,0.10)', fg:'#7A1F1F', border:'rgba(196,74,74,0.25)' },
    info:    { bg:'rgba(83,74,183,0.08)', fg: PURPLE,    border:'rgba(83,74,183,0.20)' },
    success: { bg:'rgba(42,122,74,0.10)', fg:'#2A7A4A', border:'rgba(42,122,74,0.25)' },
  }[severity];
  return (
    <div style={{
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.border}`, borderRadius:'12px',
      padding:'10px 14px', marginBottom:'16px', fontSize:'13px', fontWeight:600, lineHeight:1.5,
    }}>{text}</div>
  );
};

// ─── Magic-link form ────────────────────────────────────────────────────────
const MagicLinkForm: React.FC<{API: string}> = ({ API }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string>('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const nextParam = (() => {
    try { return new URLSearchParams(window.location.search).get('next') || undefined; }
    catch { return undefined; }
  })();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (resend = false) => {
    setError('');
    const e = email.trim().toLowerCase();
    if (!e) { setError('Enter your email to receive a sign-in link.'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/auth/magic-link`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: e, destination: nextParam || null }),
      });
      // Always 200 per spec — silent on failures to prevent enumeration.
      await r.json().catch(() => ({}));
      setSentTo(e);
      if (resend) setCooldown(60);
    } catch {
      setError('Could not send the link. Try again in a moment.');
    } finally { setBusy(false); }
  };

  if (sentTo) {
    return (
      <div>
        <div style={{textAlign:'center', fontSize:'42px', marginBottom:'10px'}}>✉️</div>
        <div style={{fontFamily: SERIF, fontSize:'22px', color: INK, textAlign:'center', marginBottom:'8px'}}>Check your inbox</div>
        <p style={{fontSize:'13px', color: SOFT, lineHeight:1.7, textAlign:'center', margin:'0 0 18px'}}>
          We sent a secure link to <strong style={{color: NAVY}}>{sentTo}</strong>.<br/>
          It expires in 15 minutes and works once.
        </p>
        <button
          onClick={() => submit(true)}
          disabled={cooldown > 0 || busy}
          style={{
            ...secondaryBtn, width:'100%', marginBottom:'10px',
            opacity: (cooldown > 0 || busy) ? 0.5 : 1,
            cursor: (cooldown > 0 || busy) ? 'not-allowed' : 'pointer',
          }}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : (busy ? 'Sending…' : 'Resend link')}
        </button>
        <button
          onClick={() => { setSentTo(''); setEmail(''); }}
          style={{...textBtn, width:'100%'}}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{fontFamily: SERIF, fontSize:'22px', color: INK, fontWeight:400, margin:'0 0 8px', textAlign:'center'}}>
        Sign in to SoulMD
      </h2>
      <p style={{fontSize:'13px', color: SOFT, lineHeight:1.6, margin:'0 0 18px', textAlign:'center'}}>
        Enter your email to receive a secure sign-in link.
      </p>
      <input
        type="email" autoFocus value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(false); }}
        placeholder="you@example.com"
        style={inputStyle}
      />
      {error && <Banner severity="error" text={error}/>}
      <button
        onClick={() => submit(false)} disabled={busy}
        style={{...primaryBtn, width:'100%', marginTop:'4px', opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer'}}>
        {busy ? 'Sending…' : 'Send Magic Link'}
      </button>
    </div>
  );
};

// ─── (TOTP form removed) ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px', borderRadius:'12px',
  border:`1px solid ${BORDER}`, fontSize:'14px', color: NAVY,
  background:'rgba(255,255,255,0.85)', outline:'none', boxSizing:'border-box',
  marginBottom:'12px', fontFamily:'inherit',
};
const primaryBtn: React.CSSProperties = {
  background: NAVY, color:'white', border:'none',
  borderRadius:'12px', padding:'13px 18px',
  fontSize:'14px', fontWeight:700, fontFamily:'inherit',
};
const secondaryBtn: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', color: NAVY,
  border:`1px solid ${BORDER}`, borderRadius:'12px',
  padding:'12px 18px', fontSize:'13px', fontWeight:600, fontFamily:'inherit',
};
const textBtn: React.CSSProperties = {
  background:'transparent', color: PURPLE,
  border:'none', fontSize:'12px', fontWeight:600,
  cursor:'pointer', fontFamily:'inherit', padding:'4px',
};

export default Login;
