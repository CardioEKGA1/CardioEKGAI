// © 2026 SoulMD, LLC. All rights reserved.
//
// Login page — magic-link by default, TOTP fast-path for the
// practice owner. Replaces the previous /auth/magic-link form. Magic
// links now go through /api/auth/magic-link → /api/auth/verify, which
// sets the soulmd_session httpOnly cookie and 302s to the destination
// stored on the token row. The Dr. Anderson TOTP toggle posts to
// /api/auth/totp/login and lands on /concierge.
//
// No password field. No social login. No dev-login. No old QR codes.
import React, { useEffect, useRef, useState } from 'react';
import ComplianceDisclaimer from '../ComplianceDisclaimer';

interface Props { API: string; onBack?: () => void; isSoulMD?: boolean; }

const OWNER_EMAIL = 'anderson@soulmd.us';

type Mode = 'magic' | 'totp';
type TotpEntry = 'code' | 'backup';

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
  totp_locked:  'Too many attempts. Please wait 15 minutes.',
};

const Login: React.FC<Props> = ({ API }) => {
  const [mode, setMode] = useState<Mode>('magic');

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

        {mode === 'magic' && <MagicLinkForm API={API} onSwitchToTotp={() => setMode('totp')}/>}
        {mode === 'totp'  && <TotpForm     API={API} onSwitchToMagic={() => setMode('magic')}/>}

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
const MagicLinkForm: React.FC<{API: string; onSwitchToTotp: () => void}> = ({ API, onSwitchToTotp }) => {
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
      <div style={{textAlign:'center', marginTop:'16px'}}>
        <button onClick={onSwitchToTotp} style={textBtn}>
          Dr. Anderson? Sign in with authenticator →
        </button>
      </div>
    </div>
  );
};

// ─── TOTP form ──────────────────────────────────────────────────────────────
const TotpForm: React.FC<{API: string; onSwitchToMagic: () => void}> = ({ API, onSwitchToMagic }) => {
  const [entry, setEntry] = useState<TotpEntry>('code');
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  // When the backend says "TOTP_NOT_SET_UP", we swap the entire form
  // for a friendly panel that explains the state and redirects the
  // user back to magic-link sign-in — no point asking them for codes
  // for a credential that doesn't exist.
  const [notSetUp, setNotSetUp] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (notSetUp) return;
    if (entry === 'code') codeRef.current?.focus();
    else backupRef.current?.focus();
  }, [entry, notSetUp]);

  const submit = async (value: string) => {
    setError('');
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/auth/totp/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials: 'include',
        body: JSON.stringify({ email: OWNER_EMAIL, totp_code: value }),
      });
      if (r.status === 429) { setError(ERROR_MESSAGES.totp_locked); return; }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        // Distinct path: no credential exists for this account. Show
        // the "not set up" panel instead of a generic invalid-code
        // error so the owner knows to enroll first.
        if ((j.detail || '') === 'TOTP_NOT_SET_UP') {
          setNotSetUp(true);
          return;
        }
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 3) {
          setError(`Invalid code. ${5 - next} attempts left before a 15-minute lockout.`);
        } else {
          setError(j.detail || 'Invalid code. Try again.');
        }
        setCode(''); setBackup('');
        return;
      }
      const data = await r.json().catch(() => ({}));
      // The cookie is the source of truth, but legacy frontends still
      // read localStorage('token') so we mirror it for back-compat.
      if (data.access_token) {
        try { localStorage.setItem('token', data.access_token); } catch {}
        try { localStorage.setItem('soulmd_su', '1'); } catch {}
      }
      window.location.href = data.redirect || '/concierge';
    } catch {
      setError('Network error. Try again.');
    } finally { setBusy(false); }
  };

  if (notSetUp) {
    return (
      <div>
        <button onClick={onSwitchToMagic} style={{...textBtn, marginBottom:'10px'}}>
          ← Back to magic link
        </button>
        <h2 style={{fontFamily: SERIF, fontSize:'22px', color: INK, fontWeight:400, margin:'0 0 8px', textAlign:'center'}}>
          Authenticator not set up yet
        </h2>
        <p style={{fontSize:'13px', color: SOFT, lineHeight:1.7, margin:'0 0 18px', textAlign:'center'}}>
          This account doesn't have an authenticator enrolled yet. Sign in
          with a magic link instead — you'll be guided through authenticator
          setup right after.
        </p>
        <button
          onClick={onSwitchToMagic}
          style={{...primaryBtn, width:'100%'}}>
          Use magic link to sign in
        </button>
      </div>
    );
  }

  const onCodeChange = (v: string) => {
    const cleaned = v.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    if (cleaned.length === 6) submit(cleaned);
  };

  return (
    <div>
      <button onClick={onSwitchToMagic} style={{...textBtn, marginBottom:'10px'}}>
        ← Back to magic link
      </button>
      <h2 style={{fontFamily: SERIF, fontSize:'22px', color: INK, fontWeight:400, margin:'0 0 8px', textAlign:'center'}}>
        Authenticator sign in
      </h2>
      <input
        readOnly value={OWNER_EMAIL}
        style={{...inputStyle, background:'rgba(83,74,183,0.06)', color: SOFT, marginBottom:'14px'}}
      />
      {entry === 'code' ? (
        <>
          <input
            ref={codeRef}
            value={code}
            onChange={e => onCodeChange(e.target.value)}
            inputMode="numeric" pattern="[0-9]*" autoFocus
            maxLength={6} placeholder="6-digit code"
            style={{
              ...inputStyle, fontSize:'24px', letterSpacing:'0.4em',
              textAlign:'center', fontFamily:'ui-monospace, monospace',
            }}
          />
          <button
            onClick={() => submit(code)} disabled={busy || code.length < 6}
            style={{...primaryBtn, width:'100%', marginTop:'4px', opacity: (busy || code.length < 6) ? 0.5 : 1, cursor: (busy || code.length < 6) ? 'not-allowed' : 'pointer'}}>
            {busy ? 'Verifying…' : 'Sign in'}
          </button>
          <button onClick={() => { setEntry('backup'); setError(''); }} style={{...textBtn, width:'100%', marginTop:'10px'}}>
            Use a backup code instead
          </button>
        </>
      ) : (
        <>
          <input
            ref={backupRef}
            value={backup}
            onChange={e => setBackup(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={8}
            style={{...inputStyle, fontFamily:'ui-monospace, monospace', textAlign:'center', letterSpacing:'0.2em'}}
          />
          <button
            onClick={() => submit(backup)} disabled={busy || backup.length < 8}
            style={{...primaryBtn, width:'100%', marginTop:'4px', opacity: (busy || backup.length < 8) ? 0.5 : 1, cursor: (busy || backup.length < 8) ? 'not-allowed' : 'pointer'}}>
            {busy ? 'Verifying…' : 'Sign in with backup code'}
          </button>
          <button onClick={() => { setEntry('code'); setError(''); }} style={{...textBtn, width:'100%', marginTop:'10px'}}>
            Back to authenticator code
          </button>
        </>
      )}
      {error && <div style={{marginTop:'12px'}}><Banner severity="error" text={error}/></div>}
      <div style={{textAlign:'center', marginTop:'14px'}}>
        <button onClick={onSwitchToMagic} style={textBtn}>
          Send magic link instead
        </button>
      </div>
    </div>
  );
};

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
