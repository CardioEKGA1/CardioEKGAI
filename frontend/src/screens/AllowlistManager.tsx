// © 2026 SoulMD, LLC. All rights reserved.
//
// AllowlistManager — owner-only admin UI for the magic-link
// allowlist. Backs the three endpoints added with the TOTP-removal
// patch:
//   GET    /api/admin/allowlist
//   POST   /api/admin/allowlist            { email, label }
//   DELETE /api/admin/allowlist/{email}
//
// Only allowlisted emails can request a sign-in magic link;
// everyone else gets the same silent enumeration-resistant 200
// from /api/auth/magic-link. This screen is the only place to
// add / remove emails without going to the DB directly.
import React, { useCallback, useEffect, useState } from 'react';
import SuperuserTabNav from './SuperuserTabNav';

interface Props {
  API: string;
  token: string;
  onBack: () => void;
  onNavigateDashboard?: () => void;
  onNavigateMeditations?: () => void;
  onNavigateConciergeAccess?: () => void;
  onNavigateMarketing?: () => void;
  onNavigateScheduleMD?: () => void;
}

interface Entry {
  id: number;
  email: string;
  label: string | null;
  added_at: string | null;
}

const NAVY     = '#1a2a4a';
const PURPLE   = '#534AB7';
const INK      = '#1F1B3A';
const INK_SOFT = '#6B6889';
const BORDER   = 'rgba(83,74,183,0.16)';
const PAGE_BG  = '#F7F7FB';
const CARD_BG  = '#FFFFFF';
const SERIF    = 'Georgia, "Times New Roman", serif';
const SANS     = '-apple-system,BlinkMacSystemFont,Inter,sans-serif';

const AllowlistManager: React.FC<Props> = ({
  API, token, onBack,
  onNavigateDashboard, onNavigateMeditations, onNavigateConciergeAccess,
  onNavigateMarketing, onNavigateScheduleMD,
}) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string>('');  // email currently being removed
  const [toast, setToast] = useState<string>('');

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${API}/api/admin/allowlist`, {
        credentials: 'include', headers: authHeaders(),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `load failed (${r.status})`);
      }
      const d = await r.json();
      setEntries(d.entries || []);
    } catch (e: any) {
      setErr(e.message || 'Could not load allowlist.');
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => { load(); }, [load]);

  // Auto-clear toast after 3s — the success path doesn't deserve a
  // permanent banner, but a quick confirmation reassures the user
  // the write landed.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const add = async () => {
    setErr('');
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) { setErr('Enter a valid email.'); return; }
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/admin/allowlist`, {
        method: 'POST', credentials: 'include', headers: authHeaders(),
        body: JSON.stringify({ email: e, label: label.trim() || null }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `add failed (${r.status})`);
      }
      const d = await r.json();
      // POST is idempotent on email — entries may grow or just update.
      setEntries(prev => {
        const i = prev.findIndex(x => x.email === d.email);
        if (i >= 0) { const copy = prev.slice(); copy[i] = d; return copy; }
        return [...prev, d];
      });
      setToast(`Added ${d.email}`);
      setEmail(''); setLabel('');
    } catch (e: any) {
      setErr(e.message || 'Add failed.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (entry: Entry) => {
    if (!window.confirm(`Remove ${entry.email} from the magic-link allowlist?`)) return;
    setErr(''); setRemoving(entry.email);
    try {
      const r = await fetch(`${API}/api/admin/allowlist/${encodeURIComponent(entry.email)}`, {
        method: 'DELETE', credentials: 'include', headers: authHeaders(),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `remove failed (${r.status})`);
      }
      setEntries(prev => prev.filter(x => x.email !== entry.email));
      setToast(`Removed ${entry.email}`);
    } catch (e: any) {
      setErr(e.message || 'Remove failed.');
    } finally {
      setRemoving('');
    }
  };

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: INK, fontFamily: SANS}}>
      <SuperuserTabNav
        active="allowlist"
        onDashboard={onNavigateDashboard || (() => { window.location.href = '/dashboard'; })}
        onMeditations={onNavigateMeditations || (() => { window.location.href = '/meditations/library'; })}
        onConcierge={onNavigateConciergeAccess || (() => { window.location.href = '/concierge-access'; })}
        onMarketing={onNavigateMarketing || (() => { window.location.href = '/admin/marketing'; })}
        onScheduleMD={onNavigateScheduleMD || (() => { window.location.href = '/schedulemd'; })}
        onAllowlist={() => { /* already here */ }}
      />

      <main style={{
        maxWidth:'780px', margin:'0 auto',
        padding:'clamp(20px,4vw,36px) clamp(16px,3vw,28px)',
      }}>
        <div style={{display:'flex', alignItems:'baseline', gap:'12px', marginBottom:'4px'}}>
          <button onClick={onBack} style={{
            background:'transparent', border:'none', color: PURPLE,
            fontSize:'13px', fontWeight:600, cursor:'pointer', padding:'4px',
            fontFamily:'inherit',
          }}>← Back</button>
          <div style={{flex:1}}/>
        </div>
        <h1 style={{
          fontFamily: SERIF, fontWeight:400, fontSize:'28px',
          color: NAVY, margin:'4px 0 8px', letterSpacing:'0.01em',
        }}>
          Magic-link allowlist
        </h1>
        <p style={{fontSize:'13px', color: INK_SOFT, lineHeight:1.7, margin:'0 0 24px'}}>
          Only emails listed here can request a sign-in link at <code>/login</code>.
          Anyone else gets a silent generic response (we never reveal that the
          email is blocked). Add or remove emails as your invitee list changes.
        </p>

        {/* ─── Add form ─────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={labelStyle}>Add an email</div>
          <div style={{
            display:'grid',
            gridTemplateColumns:'minmax(220px, 2fr) minmax(140px, 1fr) auto',
            gap:'8px',
            alignItems:'end',
          }}>
            <div>
              <div style={fieldLabelStyle}>Email</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); }}
                placeholder="patient@example.com"
                style={inputStyle}
                autoComplete="off"
              />
            </div>
            <div>
              <div style={fieldLabelStyle}>Label (optional)</div>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); }}
                placeholder="e.g. Dr. Smith, Patient — referrals"
                style={inputStyle}
                autoComplete="off"
              />
            </div>
            <button
              onClick={add}
              disabled={adding || !email.trim()}
              style={{
                ...primaryBtn,
                opacity: (adding || !email.trim()) ? 0.5 : 1,
                cursor: (adding || !email.trim()) ? 'not-allowed' : 'pointer',
                whiteSpace:'nowrap',
              }}>
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {err && (
            <div style={{
              marginTop:'10px', padding:'8px 12px', borderRadius:'8px',
              background:'rgba(196,74,74,0.10)', color:'#7A1F1F',
              border:'1px solid rgba(196,74,74,0.20)',
              fontSize:'12px', fontWeight:600,
            }}>{err}</div>
          )}
          {toast && (
            <div style={{
              marginTop:'10px', padding:'8px 12px', borderRadius:'8px',
              background:'rgba(42,122,74,0.10)', color:'#2A7A4A',
              border:'1px solid rgba(42,122,74,0.20)',
              fontSize:'12px', fontWeight:600,
            }}>{toast}</div>
          )}
        </div>

        {/* ─── Entry list ──────────────────────────────────────── */}
        <div style={{...cardStyle, padding:0}}>
          <div style={{
            padding:'14px 18px', borderBottom:`1px solid ${BORDER}`,
            display:'flex', alignItems:'baseline', gap:'10px',
          }}>
            <div style={labelStyle}>Allowlisted emails</div>
            <div style={{flex:1}}/>
            <div style={{fontSize:'12px', color: INK_SOFT, fontWeight:600}}>
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
          {loading ? (
            <div style={mutedRow}>Loading…</div>
          ) : entries.length === 0 ? (
            <div style={mutedRow}>No entries yet. Add the first one above.</div>
          ) : (
            <div>
              {entries.map(entry => (
                <div key={entry.id} style={{
                  display:'flex', alignItems:'center', gap:'12px',
                  padding:'12px 18px', borderTop:`1px solid ${BORDER}`,
                  fontSize:'13px',
                }}>
                  <div style={{flex:'1 1 240px', minWidth:0}}>
                    <div style={{
                      fontWeight:700, color: INK, fontFamily:'ui-monospace, monospace',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>{entry.email}</div>
                    <div style={{fontSize:'11px', color: INK_SOFT, marginTop:'2px'}}>
                      {entry.label || <em style={{opacity:0.6}}>no label</em>}
                      {entry.added_at && (
                        <span style={{marginLeft:'8px', opacity:0.7}}>
                          · added {entry.added_at.slice(0,10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(entry)}
                    disabled={removing === entry.email}
                    style={{
                      background:'transparent', color:'#9A2A2A',
                      border:'1px solid rgba(154,42,42,0.25)',
                      borderRadius:'8px', padding:'6px 12px',
                      fontSize:'12px', fontWeight:700, cursor:'pointer',
                      fontFamily:'inherit',
                      opacity: removing === entry.email ? 0.5 : 1,
                    }}>
                    {removing === entry.email ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: CARD_BG, borderRadius:'14px',
  border:`1px solid ${BORDER}`, padding:'18px',
  marginBottom:'16px',
  boxShadow:'0 1px 3px rgba(20,18,40,0.04)',
};
const labelStyle: React.CSSProperties = {
  fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase',
  color: PURPLE, fontWeight:800,
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize:'10px', letterSpacing:'0.06em', textTransform:'uppercase',
  color: INK_SOFT, fontWeight:700, marginBottom:'4px',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:`1px solid ${BORDER}`, fontSize:'13px',
  color: INK, background:'rgba(255,255,255,0.85)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};
const primaryBtn: React.CSSProperties = {
  background: NAVY, color:'white', border:'none',
  borderRadius:'10px', padding:'10px 18px',
  fontSize:'13px', fontWeight:700, fontFamily:'inherit',
  cursor:'pointer',
};
const mutedRow: React.CSSProperties = {
  padding:'24px 18px', textAlign:'center',
  color: INK_SOFT, fontSize:'13px',
};

export default AllowlistManager;
