// © 2026 SoulMD, LLC. All rights reserved.
//
// TOTPSetup — 3-step wizard at /settings/authenticator. Owner-only:
// the route guard in App.tsx already requires user.is_superuser before
// rendering this screen.
//
// Step 1: instructions for opening any TOTP app (PingID, Google
//         Authenticator, Authy).
// Step 2: POST /api/auth/totp/setup → display QR + manual secret.
// Step 3: confirm by entering a 6-digit code (POST /api/auth/totp/login),
//         then surface the 8 plaintext backup codes once with a
//         download-as-text fallback.
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  API: string;
  token: string;
  onDone: () => void;
}

const NAVY    = '#1a2a4a';
const PURPLE  = '#534AB7';
const INK     = '#1F1B3A';
const SOFT    = '#6B6889';
const BORDER  = 'rgba(83,74,183,0.18)';
const SERIF   = 'Georgia, "Times New Roman", serif';
const OWNER   = 'anderson@soulmd.us';

type Step = 1 | 2 | 3 | 4;

interface SetupResponse {
  qr_code_base64: string;
  backup_codes: string[];
  secret: string;
}

const TOTPSetup: React.FC<Props> = ({ API, token, onDone }) => {
  const [step, setStep] = useState<Step>(1);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [verified, setVerified] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  // Kick off the setup call when the user lands on step 2 — we want the
  // QR + backup codes to render immediately so they can scan and confirm
  // in one continuous flow.
  const beginSetup = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await fetch(`${API}/api/auth/totp/setup`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        credentials:'include',
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `setup failed (${r.status})`);
      }
      const d = await r.json();
      setSetup(d);
      setStep(2);
    } catch (e: any) {
      setErr(e.message || 'Could not start setup. Try again.');
    } finally { setBusy(false); }
  };

  const verifyCode = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await fetch(`${API}/api/auth/totp/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({ email: OWNER, totp_code: code }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || 'Invalid code. Try again.');
      }
      setVerified(true);
      setStep(3);
    } catch (e: any) {
      setErr(e.message || 'Invalid code.');
      setCode('');
      codeRef.current?.focus();
    } finally { setBusy(false); }
  };

  useEffect(() => { if (step === 2 && codeRef.current) codeRef.current.focus(); }, [step]);

  const downloadBackupCodes = () => {
    if (!setup) return;
    const lines = [
      'SoulMD — TOTP Backup Codes',
      `Account: ${OWNER}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Each code works once if you lose access to your authenticator app.',
      'Keep these somewhere safe. We will never show them again.',
      '',
      ...setup.backup_codes,
    ];
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'soulmd-backup-codes.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      minHeight:'100vh', padding:'40px 20px',
      background:'linear-gradient(135deg, #F6EEF8 0%, #FDFBF8 60%)',
      fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif',
    }}>
      <div style={{
        maxWidth:'560px', margin:'0 auto',
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)',
        borderRadius:'22px', padding:'32px 28px',
        boxShadow:'0 16px 48px rgba(20,18,40,0.10)',
        border:`1px solid ${BORDER}`,
      }}>
        <div style={{textAlign:'center', marginBottom:'18px'}}>
          <div style={{fontSize:'10px', letterSpacing:'1.8px', textTransform:'uppercase',
                       color: PURPLE, fontWeight:800}}>Two-factor authentication</div>
          <div style={{fontFamily: SERIF, fontSize:'26px', color: NAVY, marginTop:'4px'}}>
            Authenticator setup
          </div>
        </div>

        <Stepper step={step}/>

        {step === 1 && (
          <div>
            <h2 style={h2Style}>Step 1 — Open your authenticator app</h2>
            <p style={pStyle}>
              Open your authenticator app (PingID, Google Authenticator, Authy, or any
              TOTP-compatible app) on your phone. If you don't have one yet, install
              one before continuing — the next step shows a QR code that has to be
              scanned from inside the app.
            </p>
            {err && <Banner severity="error" text={err}/>}
            <div style={btnRow}>
              <button onClick={onDone} style={secondaryBtn}>Cancel</button>
              <button onClick={beginSetup} disabled={busy} style={{...primaryBtn, opacity: busy ? 0.6 : 1}}>
                {busy ? 'Starting…' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && setup && (
          <div>
            <h2 style={h2Style}>Step 2 — Scan QR code</h2>
            <p style={pStyle}>
              In PingID: tap the <strong>+</strong> or <strong>Add Account</strong>{' '}
              button, choose <strong>Other account</strong>, then scan this QR code.
            </p>
            <div style={{
              display:'flex', justifyContent:'center', padding:'14px',
              background:'white', border:`1px solid ${BORDER}`, borderRadius:'14px',
              margin:'14px 0',
            }}>
              <img
                src={`data:image/png;base64,${setup.qr_code_base64}`}
                alt="TOTP QR code"
                style={{width:'220px', height:'220px'}}
              />
            </div>
            <div style={{
              fontSize:'12px', color: SOFT, textAlign:'center', marginBottom:'14px',
            }}>
              Can't scan? Enter this secret manually:<br/>
              <code style={{
                display:'inline-block', marginTop:'6px',
                padding:'6px 12px', borderRadius:'8px',
                background:'rgba(83,74,183,0.08)', color: PURPLE,
                fontFamily:'ui-monospace, monospace', fontSize:'13px',
                wordBreak:'break-all',
              }}>{setup.secret}</code>
            </div>
            <h3 style={{...h2Style, fontSize:'16px', marginTop:'20px'}}>
              Enter the 6-digit code to confirm
            </h3>
            <input
              ref={codeRef}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) verifyCode(); }}
              inputMode="numeric" pattern="[0-9]*"
              maxLength={6} placeholder="000000"
              style={{
                ...inputStyle, fontSize:'28px', letterSpacing:'0.4em',
                textAlign:'center', fontFamily:'ui-monospace, monospace',
              }}
            />
            {err && <Banner severity="error" text={err}/>}
            <div style={btnRow}>
              <button onClick={() => setStep(1)} style={secondaryBtn}>Back</button>
              <button
                onClick={verifyCode}
                disabled={busy || code.length < 6}
                style={{...primaryBtn, opacity: (busy || code.length < 6) ? 0.5 : 1}}>
                {busy ? 'Verifying…' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && setup && (
          <div>
            <h2 style={h2Style}>Step 3 — Save your backup codes</h2>
            <p style={pStyle}>
              <strong>Save these somewhere safe.</strong> Each code works once if you
              lose access to your authenticator app. We will never show them again —
              if you don't save them now, you'll need to disable and re-enroll TOTP
              to generate new ones.
            </p>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px',
              padding:'16px', borderRadius:'14px', margin:'14px 0',
              background:'rgba(83,74,183,0.05)', border:`1px solid ${BORDER}`,
              fontFamily:'ui-monospace, monospace', fontSize:'14px', color: NAVY,
            }}>
              {setup.backup_codes.map(c => (
                <div key={c} style={{
                  padding:'8px 12px', textAlign:'center',
                  background:'white', borderRadius:'8px',
                  border:`1px solid ${BORDER}`,
                  letterSpacing:'0.05em',
                }}>{c}</div>
              ))}
            </div>
            <div style={btnRow}>
              <button onClick={downloadBackupCodes} style={secondaryBtn}>
                Download as .txt
              </button>
              <button onClick={onDone} style={primaryBtn}>
                I've saved my codes — Continue
              </button>
            </div>
            <p style={{...pStyle, fontSize:'11px', textAlign:'center', marginTop:'18px'}}>
              {verified ? 'Authenticator confirmed.' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Stepper: React.FC<{step: Step}> = ({ step }) => (
  <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', margin:'14px 0 22px'}}>
    {[1, 2, 3].map(i => {
      const active = i === step;
      const done = i < step;
      return (
        <React.Fragment key={i}>
          <div style={{
            width:'28px', height:'28px', borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'12px', fontWeight:700,
            background: done ? PURPLE : (active ? 'rgba(83,74,183,0.15)' : 'rgba(83,74,183,0.05)'),
            color: done ? 'white' : (active ? PURPLE : SOFT),
            border: `1px solid ${done ? PURPLE : BORDER}`,
          }}>
            {done ? '✓' : i}
          </div>
          {i < 3 && (
            <div style={{
              width:'34px', height:'2px',
              background: i < step ? PURPLE : BORDER,
              borderRadius:'1px',
            }}/>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const Banner: React.FC<{severity:'error'|'info'; text:string}> = ({ severity, text }) => {
  const palette = severity === 'error'
    ? { bg:'rgba(196,74,74,0.10)', fg:'#7A1F1F', border:'rgba(196,74,74,0.25)' }
    : { bg:'rgba(83,74,183,0.08)', fg: PURPLE,    border:'rgba(83,74,183,0.20)' };
  return (
    <div style={{
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.border}`, borderRadius:'10px',
      padding:'10px 14px', marginTop:'10px',
      fontSize:'12px', fontWeight:600, lineHeight:1.5,
    }}>{text}</div>
  );
};

const h2Style: React.CSSProperties = {
  fontFamily: SERIF, fontSize:'18px', fontWeight:400,
  color: INK, margin:'0 0 8px', letterSpacing:'0.01em',
};
const pStyle: React.CSSProperties = {
  fontSize:'13px', color: SOFT, lineHeight:1.7, margin:'0 0 12px',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px', borderRadius:'12px',
  border:`1px solid ${BORDER}`, color: NAVY,
  background:'rgba(255,255,255,0.85)', outline:'none', boxSizing:'border-box',
  marginBottom:'12px', fontFamily:'inherit',
};
const primaryBtn: React.CSSProperties = {
  background: NAVY, color:'white', border:'none',
  borderRadius:'12px', padding:'12px 22px',
  fontSize:'13px', fontWeight:700, fontFamily:'inherit',
  cursor:'pointer',
};
const secondaryBtn: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', color: NAVY,
  border:`1px solid ${BORDER}`, borderRadius:'12px',
  padding:'11px 22px', fontSize:'13px', fontWeight:600, fontFamily:'inherit',
  cursor:'pointer',
};
const btnRow: React.CSSProperties = {
  display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px',
};

export default TOTPSetup;
