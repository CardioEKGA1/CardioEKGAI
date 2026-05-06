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

interface Diagnostics {
  pyotp_installed: boolean;
  qrcode_installed: boolean;
  cryptography_installed: boolean;
  totp_key_present: boolean;
  totp_key_length: number;
  fernet_init_ok: boolean;
  fernet_error: string | null;
  existing_credential: boolean;
  existing_credential_enabled_at: string | null;
  ready_for_setup: boolean;
}

const TOTPSetup: React.FC<Props> = ({ API, token, onDone }) => {
  const [step, setStep] = useState<Step>(1);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [verified, setVerified] = useState(false);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);
  const codeRef = useRef<HTMLInputElement>(null);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  // Preflight: surface any 503/409 conditions on mount so the user
  // sees exactly what's wrong before clicking Next, instead of getting
  // an opaque error from inside the wizard. Failure modes are
  // separated so "Load failed" (CORS / network) gets a meaningful
  // diagnosis rather than the bare TypeError text the browser emits.
  useEffect(() => {
    let alive = true;
    (async () => {
      const url = `${API}/api/auth/totp/diagnostics`;
      // eslint-disable-next-line no-console
      console.log('[TOTPSetup] preflight →', url);
      let response: Response | null = null;
      try {
        response = await fetch(url, {
          credentials: 'include', headers: authHeaders(),
        });
      } catch (netErr: any) {
        // eslint-disable-next-line no-console
        console.error('[TOTPSetup] network error', netErr);
        if (alive) setErr(
          `Network error reaching ${url}. ` +
          `This is usually a CORS / origin mismatch — the API at ` +
          `${new URL(url).origin} must allow credentialed requests ` +
          `from ${window.location.origin}. ` +
          `Browser said: ${netErr?.message || String(netErr)}`
        );
        if (alive) setDiagLoading(false);
        return;
      }
      // Got an HTTP response — treat status codes explicitly.
      const statusText = `${response.status} ${response.statusText}`;
      let bodyText = '';
      try { bodyText = await response.clone().text(); } catch {}
      // eslint-disable-next-line no-console
      console.log('[TOTPSetup] preflight ←', statusText, bodyText);
      if (!response.ok) {
        let detail = '';
        try { detail = (JSON.parse(bodyText) as any)?.detail || ''; } catch {}
        if (alive) setErr(
          response.status === 401 ? 'Your session expired. Sign in again.' :
          response.status === 404 ? 'This deploy does not expose the TOTP setup endpoint. Confirm the latest backend has shipped on Railway.' :
          `Diagnostics call failed (${statusText}). ${detail || bodyText.slice(0, 200)}`
        );
        if (alive) setDiagLoading(false);
        return;
      }
      try {
        const d = JSON.parse(bodyText);
        if (alive) setDiag(d);
      } catch (parseErr: any) {
        // eslint-disable-next-line no-console
        console.error('[TOTPSetup] parse error', parseErr, bodyText);
        if (alive) setErr(`Diagnostics returned non-JSON: ${bodyText.slice(0, 200)}`);
      } finally {
        if (alive) setDiagLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  // Shared call wrapper — handles the network-vs-HTTP distinction
  // identically to the preflight, so any /api/auth/totp/* call that
  // breaks at the CORS / origin layer surfaces a useful message
  // instead of a raw "Load failed" TypeError.
  const callApi = async (path: string, init: RequestInit): Promise<{ data?: any; error?: string }> => {
    const url = `${API}${path}`;
    // eslint-disable-next-line no-console
    console.log('[TOTPSetup]', init.method || 'GET', '→', url);
    let response: Response;
    try {
      response = await fetch(url, { credentials: 'include', headers: authHeaders(), ...init });
    } catch (netErr: any) {
      // eslint-disable-next-line no-console
      console.error('[TOTPSetup] network error', netErr);
      return {
        error:
          `Network error reaching ${url}. ` +
          `Likely CORS / origin mismatch (frontend ${window.location.origin} → API ${new URL(url).origin}). ` +
          `Browser said: ${netErr?.message || String(netErr)}`,
      };
    }
    let bodyText = '';
    try { bodyText = await response.clone().text(); } catch {}
    // eslint-disable-next-line no-console
    console.log('[TOTPSetup] ←', response.status, bodyText);
    if (!response.ok) {
      let detail = '';
      try { detail = (JSON.parse(bodyText) as any)?.detail || ''; } catch {}
      return { error: detail || `${response.status} ${response.statusText} ${bodyText.slice(0, 200)}` };
    }
    try { return { data: JSON.parse(bodyText) }; }
    catch { return { data: null }; }
  };

  // Reset existing TOTP credential — used when the diagnostics surface
  // shows an existing credential blocking the setup endpoint with 409.
  // Calls DELETE /api/auth/totp/disable then refreshes diagnostics.
  const resetExisting = async () => {
    if (!window.confirm('Disable the current TOTP credential and start a fresh enrollment? Existing backup codes will stop working.')) return;
    setBusy(true); setErr('');
    const del = await callApi('/api/auth/totp/disable', { method: 'DELETE' });
    if (del.error) { setErr(`Reset failed: ${del.error}`); setBusy(false); return; }
    const d = await callApi('/api/auth/totp/diagnostics', { method: 'GET' });
    if (d.error) { setErr(`Diagnostics refresh failed: ${d.error}`); setBusy(false); return; }
    setDiag(d.data);
    setBusy(false);
  };

  // Kick off the setup call. Only fires when diagnostics show the
  // server is ready (no missing libs, valid Fernet key, no existing
  // credential row).
  const beginSetup = async () => {
    setErr(''); setBusy(true);
    const result = await callApi('/api/auth/totp/setup', { method: 'POST' });
    if (result.error) {
      setErr(result.error);
      setBusy(false);
      return;
    }
    setSetup(result.data);
    setStep(2);
    setBusy(false);
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
            <DiagnosticsPanel diag={diag} loading={diagLoading} onReset={resetExisting} busy={busy}/>
            {err && <Banner severity="error" text={err}/>}
            <div style={btnRow}>
              <button onClick={onDone} style={secondaryBtn}>Cancel</button>
              <button
                onClick={beginSetup}
                disabled={busy || !diag || !diag.ready_for_setup}
                style={{...primaryBtn, opacity: (busy || !diag || !diag.ready_for_setup) ? 0.5 : 1, cursor: (busy || !diag || !diag.ready_for_setup) ? 'not-allowed' : 'pointer'}}>
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

// Renders the GET /api/auth/totp/diagnostics output as a small grid of
// preconditions. Each row shows a green ✓ when the precondition is met
// or a red ✗ + remediation hint when it isn't. The "existing
// credential" case includes a one-click Reset button so the user
// doesn't have to leave the wizard to clear a stale row.
const DiagnosticsPanel: React.FC<{
  diag: Diagnostics | null;
  loading: boolean;
  onReset: () => void;
  busy: boolean;
}> = ({ diag, loading, onReset, busy }) => {
  if (loading) {
    return (
      <div style={{
        margin:'12px 0', padding:'12px 14px',
        background:'rgba(83,74,183,0.04)', border:`1px solid ${BORDER}`,
        borderRadius:'12px', fontSize:'12px', color: SOFT,
      }}>
        Checking server preconditions…
      </div>
    );
  }
  if (!diag) return null;

  type Row = { ok: boolean; label: string; hint?: string; action?: React.ReactNode };
  const rows: Row[] = [
    {
      ok: diag.pyotp_installed,
      label: 'pyotp library',
      hint: diag.pyotp_installed ? undefined : 'Not installed on this Railway build. Confirm requirements.txt was applied to the latest deploy.',
    },
    {
      ok: diag.qrcode_installed,
      label: 'qrcode + Pillow',
      hint: diag.qrcode_installed ? undefined : 'Not installed. requirements.txt should include qrcode[pil].',
    },
    {
      ok: diag.cryptography_installed,
      label: 'cryptography (Fernet)',
      hint: diag.cryptography_installed ? undefined : 'Package missing — required for at-rest secret encryption.',
    },
    {
      ok: diag.totp_key_present,
      label: `TOTP_ENCRYPTION_KEY env var${diag.totp_key_present ? ` (${diag.totp_key_length} chars)` : ''}`,
      hint: diag.totp_key_present ? undefined : 'Add TOTP_ENCRYPTION_KEY to Railway and redeploy.',
    },
    {
      ok: diag.fernet_init_ok,
      label: 'TOTP_ENCRYPTION_KEY format',
      hint: diag.fernet_init_ok ? undefined : (diag.fernet_error || 'Key did not initialize — must be a 44-char base64 Fernet key. Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'),
    },
    {
      ok: !diag.existing_credential,
      label: diag.existing_credential
        ? `No prior TOTP credential ${diag.existing_credential_enabled_at ? `(found one from ${diag.existing_credential_enabled_at.slice(0,10)})` : ''}`
        : 'No prior TOTP credential',
      hint: diag.existing_credential ? 'A previous setup exists. Reset it to enroll a new authenticator.' : undefined,
      action: diag.existing_credential ? (
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          style={{
            marginTop:'6px',
            padding:'6px 12px', borderRadius:'8px',
            border:'1px solid rgba(196,74,74,0.3)',
            background:'rgba(196,74,74,0.06)', color:'#7A1F1F',
            fontSize:'11px', fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily:'inherit',
          }}>
          {busy ? 'Resetting…' : 'Reset existing credential'}
        </button>
      ) : null,
    },
  ];

  const allOk = rows.every(r => r.ok);

  return (
    <div style={{
      margin:'14px 0', padding:'14px 16px',
      background: allOk ? 'rgba(42,122,74,0.06)' : 'rgba(83,74,183,0.04)',
      border:`1px solid ${allOk ? 'rgba(42,122,74,0.20)' : BORDER}`,
      borderRadius:'12px',
    }}>
      <div style={{
        fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase',
        fontWeight:800, color: allOk ? '#2A7A4A' : PURPLE, marginBottom:'8px',
      }}>
        {allOk ? 'Ready for setup' : 'Server preconditions'}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
        {rows.map((r, i) => (
          <div key={i} style={{display:'flex', gap:'8px', alignItems:'flex-start', fontSize:'12px'}}>
            <span style={{
              flex:'0 0 auto', width:'16px', textAlign:'center',
              color: r.ok ? '#2A7A4A' : '#9A2A2A', fontWeight:800,
            }}>{r.ok ? '✓' : '✗'}</span>
            <div style={{flex:1}}>
              <div style={{color: r.ok ? INK : '#7A1F1F', fontWeight: r.ok ? 500 : 600}}>
                {r.label}
              </div>
              {!r.ok && r.hint && (
                <div style={{color: SOFT, marginTop:'2px', lineHeight:1.5}}>{r.hint}</div>
              )}
              {r.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
