// © 2026 SoulMD, LLC. All rights reserved.
//
// ShiftMD — hospital shift scheduler. Three columns (IMED / AV / LDS),
// per-date assignments, swap & unavailable tracking, AI insights via
// Claude, PDF export via window.print(). Owner-gated at the route
// level (App.tsx checks user.is_superuser before rendering this).
//
// Layout: dark-navy left sidebar (brand + back), white content area
// with a horizontal top bar (date nav + gaps badge + export), the
// 3-column hospital grid, and a bottom summary strip with the AI
// Insight trigger. The assign/edit modal renders as an overlay above
// everything; the AI Insight panel slides in from the right edge so
// the schedule stays visible behind it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SuperuserTabNav from './SuperuserTabNav';

interface Props {
  API: string;
  token: string;
  onBack: () => void;
  onNavigateDashboard?: () => void;
  onNavigateMeditations?: () => void;
  onNavigateConciergeAccess?: () => void;
  onNavigateMarketing?: () => void;
}

interface Shift {
  id: number;
  hospital_id: number;
  name: string;
  shift_type: 'day' | 'swing' | 'night' | 'app' | 'backup' | 'admin';
  start_time: string;
  end_time: string;
  sort_order: number;
}
interface Assignment {
  id: number;
  shift_id: number;
  schedule_date: string;
  provider_name: string | null;
  is_swapped: boolean;
  swap_note: string | null;
  is_unavailable: boolean;
  updated_at?: string | null;
}
interface ShiftWithAssignments extends Shift {
  assignments: Assignment[];
}
interface Hospital {
  id: number;
  name: string;
  color: string;
  shifts: ShiftWithAssignments[];
}
interface Provider {
  id: number;
  name: string;
  role: 'MD' | 'DO' | 'APP' | 'NP' | 'PA';
  hospitals: string[];
}

const NAVY     = '#1a2a4a';
const NAVY_DK  = '#0f1a36';
const PURPLE   = '#534AB7';
const INK      = '#1F1B3A';
const INK_SOFT = '#6B6889';
const BORDER   = 'rgba(83,74,183,0.14)';
const PAGE_BG  = '#F7F7FB';
const CARD_BG  = '#FFFFFF';
const SERIF    = 'Georgia, "Times New Roman", serif';
const SANS     = '-apple-system,BlinkMacSystemFont,Inter,sans-serif';

// "YYYY-MM-DD" helpers — keep dates as local-zone strings; the backend
// is timezone-naive on this surface (string column).
const fmtISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const fmtPretty = (d: Date): string => d.toLocaleDateString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});

const SHIFT_TYPE_BADGE: Record<Shift['shift_type'], { label: string; bg: string; fg: string }> = {
  day:    { label: 'DAY',    bg: '#E8F1FF', fg: '#2855A8' },
  swing:  { label: 'SWING',  bg: '#FFF1DC', fg: '#A86A1F' },
  night:  { label: 'NIGHT',  bg: '#1F1B3A', fg: '#E8E4FF' },
  app:    { label: 'APP',    bg: '#E8F8EE', fg: '#2A7A4A' },
  backup: { label: 'BACKUP', bg: '#F1ECFF', fg: '#5A4AA8' },
  admin:  { label: 'ADMIN',  bg: '#FCE9E9', fg: '#9A2A2A' },
};

const ShiftMD: React.FC<Props> = ({
  API, token, onBack,
  onNavigateDashboard, onNavigateMeditations, onNavigateConciergeAccess, onNavigateMarketing,
}) => {
  const [date, setDate] = useState<Date>(() => new Date());
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [assignTarget, setAssignTarget] = useState<{shift: Shift; existing: Assignment | null} | null>(null);
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightText, setInsightText] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);

  const dateISO = fmtISO(date);
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadSchedule = useCallback(async (iso: string) => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API}/api/shiftmd/schedule?date=${encodeURIComponent(iso)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`schedule fetch failed (${res.status})`);
      const data = await res.json();
      setHospitals(data.hospitals || []);
    } catch (e: any) {
      setErr(e.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/shiftmd/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProviders(data.providers || []);
    } catch { /* non-fatal */ }
  }, [API, token]);

  useEffect(() => { loadSchedule(dateISO); }, [dateISO, loadSchedule]);
  useEffect(() => { loadProviders(); }, [loadProviders]);

  const shiftDays = useCallback((delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
  }, [date]);

  // Active assignment = is_swapped=false. Used in render for the "current"
  // provider; the swap-original (is_swapped=true) renders strikethrough above.
  const activeOf = (s: ShiftWithAssignments): Assignment | null =>
    s.assignments.find(a => !a.is_swapped) || null;
  const swappedOf = (s: ShiftWithAssignments): Assignment[] =>
    s.assignments.filter(a => a.is_swapped);

  const totals = useMemo(() => hospitals.map(h => {
    const total = h.shifts.length;
    const filled = h.shifts.filter(s => {
      const a = activeOf(s);
      return a && a.provider_name && !a.is_unavailable;
    }).length;
    return { name: h.name, color: h.color, filled, total };
  }), [hospitals]);
  const totalGaps = useMemo(
    () => totals.reduce((acc, t) => acc + (t.total - t.filled), 0),
    [totals],
  );

  const onSaveAssignment = useCallback(async (
    shiftId: number,
    providerName: string,
    markUnavailable: boolean,
    asSwap: boolean,
    existingId: number | null,
  ) => {
    try {
      if (asSwap && existingId) {
        const res = await fetch(`${API}/api/shiftmd/assignment/${existingId}/swap`, {
          method: 'PATCH', headers: authHeaders,
          body: JSON.stringify({ new_provider_name: providerName, swap_note: '' }),
        });
        if (!res.ok) throw new Error(`swap failed (${res.status})`);
      } else {
        const res = await fetch(`${API}/api/shiftmd/assignment`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({
            shift_id: shiftId,
            schedule_date: dateISO,
            provider_name: markUnavailable ? null : providerName,
            is_unavailable: markUnavailable,
          }),
        });
        if (!res.ok) throw new Error(`save failed (${res.status})`);
      }
      setAssignTarget(null);
      await loadSchedule(dateISO);
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    }
  }, [API, authHeaders, dateISO, loadSchedule]);

  const onDeleteAssignment = useCallback(async (assignmentId: number) => {
    try {
      const res = await fetch(`${API}/api/shiftmd/assignment/${assignmentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      setAssignTarget(null);
      await loadSchedule(dateISO);
    } catch (e: any) {
      setErr(e.message || 'Delete failed');
    }
  }, [API, token, dateISO, loadSchedule]);

  const onAIInsight = useCallback(async () => {
    setInsightOpen(true); setInsightLoading(true); setInsightText('');
    try {
      const res = await fetch(`${API}/api/shiftmd/ai-insight`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ date: dateISO }),
      });
      if (!res.ok) throw new Error(`insight failed (${res.status})`);
      const data = await res.json();
      setInsightText(data.insight || '(no insight returned)');
    } catch (e: any) {
      setInsightText(`Error: ${e.message || 'unknown'}`);
    } finally {
      setInsightLoading(false);
    }
  }, [API, authHeaders, dateISO]);

  // Print → "Save as PDF" in the browser dialog. Print stylesheet at the
  // bottom of this file hides chrome (sidebar, top bar, modal) so the
  // exported PDF is just the schedule grid.
  const onExport = useCallback(() => { window.print(); }, []);

  return (
    <div style={{
      minHeight:'100vh', background: PAGE_BG, color: INK,
      fontFamily: SANS, display:'flex', flexDirection:'column',
    }}>
      <style>{`
        @media print {
          .shiftmd-no-print { display: none !important; }
          .shiftmd-page     { background: white !important; }
          .shiftmd-grid     { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .shiftmd-shiftcard:hover .shiftmd-assign-hint { opacity: 1 !important; }
      `}</style>

      <div className="shiftmd-no-print">
        <SuperuserTabNav
          active="shiftmd"
          onDashboard={onNavigateDashboard || (() => { window.location.href = '/dashboard'; })}
          onMeditations={onNavigateMeditations || (() => { window.location.href = '/meditations/library'; })}
          onConcierge={onNavigateConciergeAccess || (() => { window.location.href = '/concierge-access'; })}
          onMarketing={onNavigateMarketing || (() => { window.location.href = '/admin/marketing'; })}
          onShiftMD={() => { /* already here */ }}
        />
      </div>

      <div className="shiftmd-page" style={{display:'flex', flex:1, minHeight:0}}>
        {/* ─── Sidebar (dark navy) ──────────────────────────────────── */}
        <aside className="shiftmd-no-print" style={{
          width:'88px', flexShrink:0,
          background:`linear-gradient(180deg, ${NAVY_DK} 0%, ${NAVY} 100%)`,
          color:'white',
          display:'flex', flexDirection:'column', alignItems:'center',
          padding:'18px 0', gap:'18px',
        }}>
          <button onClick={onBack} title="Back" style={{
            background:'rgba(255,255,255,0.08)', color:'white',
            border:'1px solid rgba(255,255,255,0.18)',
            borderRadius:'10px', width:'46px', height:'40px',
            cursor:'pointer', fontSize:'17px', fontWeight:600,
          }}>←</button>
          <div style={{
            writingMode:'vertical-rl', transform:'rotate(180deg)',
            fontFamily: SERIF, fontSize:'18px', letterSpacing:'0.32em',
            textTransform:'uppercase', color:'rgba(255,255,255,0.92)',
            marginTop:'12px',
          }}>
            ShiftMD
          </div>
          <div style={{flex:1}}/>
          <div style={{
            fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase',
            color:'rgba(255,255,255,0.4)', writingMode:'vertical-rl',
            transform:'rotate(180deg)',
          }}>
            SoulMD
          </div>
        </aside>

        {/* ─── Content ──────────────────────────────────────────────── */}
        <main style={{flex:1, minWidth:0, display:'flex', flexDirection:'column'}}>
          {/* Top bar */}
          <div className="shiftmd-no-print" style={{
            background: CARD_BG, borderBottom:`1px solid ${BORDER}`,
            padding:'14px clamp(16px,3vw,28px)',
            display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
          }}>
            <h1 style={{
              margin:0, fontFamily: SERIF, fontWeight:400,
              fontSize:'clamp(22px,2.6vw,28px)', color: NAVY, letterSpacing:'0.01em',
            }}>
              ShiftMD
            </h1>

            <div style={{display:'flex', alignItems:'center', gap:'6px', marginLeft:'12px'}}>
              <button onClick={() => shiftDays(-1)} aria-label="Previous day" style={navBtn}>‹</button>
              <DatePicker value={dateISO} onChange={iso => setDate(parseISO(iso))} pretty={fmtPretty(date)}/>
              <button onClick={() => shiftDays(1)} aria-label="Next day" style={navBtn}>›</button>
              <button onClick={() => setDate(new Date())} style={{
                ...navBtn, padding:'8px 14px', fontSize:'12px', fontWeight:600,
              }}>Today</button>
            </div>

            <div style={{flex:1, minWidth:'12px'}}/>

            <div title="Unfilled shifts" style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'8px 14px', borderRadius:'999px',
              background: totalGaps > 0 ? 'rgba(154,42,42,0.08)' : 'rgba(42,122,74,0.08)',
              color: totalGaps > 0 ? '#9A2A2A' : '#2A7A4A',
              fontSize:'13px', fontWeight:700,
              border: `1px solid ${totalGaps > 0 ? 'rgba(154,42,42,0.25)' : 'rgba(42,122,74,0.25)'}`,
            }}>
              <span style={{
                width:'8px', height:'8px', borderRadius:'50%',
                background:'currentColor',
              }}/>
              {totalGaps > 0 ? `${totalGaps} coverage gap${totalGaps === 1 ? '' : 's'}` : 'Fully covered'}
            </div>

            <button onClick={() => setProviderOpen(true)} style={secondaryBtn}>+ Provider</button>
            <button onClick={onExport} style={secondaryBtn}>Export PDF</button>
          </div>

          {/* Grid */}
          <div style={{flex:1, overflow:'auto', padding:'18px clamp(12px,2.5vw,24px)'}}>
            {err && (
              <div className="shiftmd-no-print" style={{
                background:'rgba(154,42,42,0.06)', color:'#9A2A2A',
                padding:'10px 14px', borderRadius:'8px', marginBottom:'14px',
                fontSize:'13px', border:'1px solid rgba(154,42,42,0.18)',
              }}>
                {err}
              </div>
            )}
            {loading && hospitals.length === 0 ? (
              <div style={{padding:'40px 0', textAlign:'center', color: INK_SOFT, fontSize:'14px'}}>Loading schedule…</div>
            ) : (
              <div className="shiftmd-grid" style={{
                display:'grid', gap:'18px',
                gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',
              }}>
                {hospitals.map(h => (
                  <HospitalColumn
                    key={h.id}
                    hospital={h}
                    onAssign={(shift, existing) => setAssignTarget({ shift, existing })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="shiftmd-no-print" style={{
            background: CARD_BG, borderTop:`1px solid ${BORDER}`,
            padding:'12px clamp(16px,3vw,28px)',
            display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap',
          }}>
            <div style={{display:'flex', gap:'18px', flexWrap:'wrap', fontSize:'13px', fontWeight:600, color: INK}}>
              {totals.map(t => (
                <span key={t.name} style={{display:'inline-flex', alignItems:'center', gap:'7px'}}>
                  <span style={{width:'9px', height:'9px', borderRadius:'2px', background: t.color}}/>
                  <span style={{color: t.color, fontWeight:800}}>{t.name}</span>
                  <span style={{color: INK_SOFT}}>{t.filled}/{t.total} filled</span>
                </span>
              ))}
            </div>
            <div style={{flex:1}}/>
            <button onClick={onAIInsight} style={{
              background:`linear-gradient(135deg, ${PURPLE}, #9b8fe8)`, color:'white',
              border:'none', borderRadius:'10px', padding:'10px 18px',
              fontSize:'13px', fontWeight:700, cursor:'pointer',
              boxShadow:'0 4px 12px rgba(83,74,183,0.25)',
            }}>
              ✨ AI Insight
            </button>
          </div>
        </main>
      </div>

      {assignTarget && (
        <AssignModal
          shift={assignTarget.shift}
          existing={assignTarget.existing}
          providers={providers}
          onClose={() => setAssignTarget(null)}
          onSave={onSaveAssignment}
          onDelete={onDeleteAssignment}
        />
      )}

      {insightOpen && (
        <InsightPanel
          loading={insightLoading}
          text={insightText}
          dateLabel={fmtPretty(date)}
          onClose={() => setInsightOpen(false)}
        />
      )}

      {providerOpen && (
        <ProviderModal
          API={API}
          token={token}
          existingNames={providers.map(p => p.name)}
          onClose={() => setProviderOpen(false)}
          onSaved={async () => { await loadProviders(); setProviderOpen(false); }}
        />
      )}
    </div>
  );
};

// ─── Hospital column ─────────────────────────────────────────────────
const HospitalColumn: React.FC<{
  hospital: Hospital;
  onAssign: (shift: Shift, existing: Assignment | null) => void;
}> = ({ hospital, onAssign }) => {
  const filled = hospital.shifts.filter(s => {
    const a = s.assignments.find(x => !x.is_swapped);
    return a && a.provider_name && !a.is_unavailable;
  }).length;
  return (
    <div style={{
      background: CARD_BG, borderRadius:'14px',
      border:`1px solid ${BORDER}`, overflow:'hidden',
      display:'flex', flexDirection:'column',
      boxShadow:'0 1px 3px rgba(20,18,40,0.04)',
    }}>
      <div style={{
        background: hospital.color, color:'white',
        padding:'14px 18px',
        display:'flex', alignItems:'baseline', gap:'10px',
      }}>
        <h2 style={{
          margin:0, fontFamily: SERIF, fontWeight:400, fontSize:'22px',
          letterSpacing:'0.04em',
        }}>{hospital.name}</h2>
        <span style={{
          marginLeft:'auto', fontSize:'12px', fontWeight:700,
          opacity:0.92, letterSpacing:'0.04em',
        }}>{filled}/{hospital.shifts.length}</span>
      </div>
      <div style={{display:'flex', flexDirection:'column'}}>
        {hospital.shifts.map(s => {
          const active = s.assignments.find(a => !a.is_swapped) || null;
          const swapped = s.assignments.filter(a => a.is_swapped);
          return (
            <ShiftRow
              key={s.id}
              shift={s}
              active={active}
              swapped={swapped}
              onClick={() => onAssign(s, active)}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Single shift row ────────────────────────────────────────────────
const ShiftRow: React.FC<{
  shift: Shift;
  active: Assignment | null;
  swapped: Assignment[];
  onClick: () => void;
}> = ({ shift, active, swapped, onClick }) => {
  const badge = SHIFT_TYPE_BADGE[shift.shift_type];
  const isFilled = !!active && !!active.provider_name && !active.is_unavailable;
  const isUnavailable = !!active && active.is_unavailable;
  return (
    <button
      type="button"
      onClick={onClick}
      className="shiftmd-shiftcard"
      style={{
        display:'flex', alignItems:'center', gap:'12px',
        padding:'10px 16px',
        background:'transparent',
        border:'none', borderTop:`1px solid ${BORDER}`,
        textAlign:'left', cursor:'pointer',
        fontFamily:'inherit',
      }}>
      <div style={{flex:'0 0 auto', minWidth:'120px'}}>
        <div style={{fontSize:'13px', fontWeight:700, color: INK, lineHeight:1.3}}>{shift.name}</div>
        <div style={{display:'flex', alignItems:'center', gap:'6px', marginTop:'3px'}}>
          <span style={{
            fontSize:'9px', letterSpacing:'0.08em', fontWeight:700,
            padding:'2px 6px', borderRadius:'3px',
            background: badge.bg, color: badge.fg,
          }}>{badge.label}</span>
          <span style={{fontSize:'11px', color: INK_SOFT, fontVariantNumeric:'tabular-nums'}}>
            {shift.start_time}–{shift.end_time}
          </span>
        </div>
      </div>
      <div style={{flex:1, minWidth:0, paddingLeft:'10px', borderLeft:`1px dashed ${BORDER}`}}>
        {swapped.map(s => (
          <div key={s.id} style={{
            fontSize:'12px', textDecoration:'line-through',
            color: INK_SOFT, opacity:0.7,
          }}>
            {s.provider_name || '—'}
            {s.swap_note && <span style={{marginLeft:'6px', fontStyle:'italic'}}>· {s.swap_note}</span>}
          </div>
        ))}
        {isFilled && (
          <div style={{fontSize:'14px', fontWeight:600, color: INK}}>{active!.provider_name}</div>
        )}
        {isUnavailable && (
          <div style={{fontSize:'13px', color:'#9A2A2A', fontWeight:600}}>🚫 Unavailable</div>
        )}
        {!active && (
          <div style={{
            display:'inline-block',
            border:`1.5px dashed ${BORDER}`, borderRadius:'6px',
            padding:'3px 10px', fontSize:'12px', color: PURPLE, fontWeight:600,
          }}>
            + Assign
          </div>
        )}
      </div>
      <span className="shiftmd-assign-hint" style={{
        opacity:0, transition:'opacity 120ms ease',
        fontSize:'11px', color: INK_SOFT,
      }}>edit</span>
    </button>
  );
};

// ─── Assign / edit modal ─────────────────────────────────────────────
const AssignModal: React.FC<{
  shift: Shift;
  existing: Assignment | null;
  providers: Provider[];
  onClose: () => void;
  onSave: (shiftId: number, providerName: string, markUnavailable: boolean, asSwap: boolean, existingId: number | null) => void;
  onDelete: (assignmentId: number) => void;
}> = ({ shift, existing, providers, onClose, onSave, onDelete }) => {
  const [providerName, setProviderName] = useState<string>(existing?.provider_name || '');
  const [markUnavailable, setMarkUnavailable] = useState<boolean>(!!existing?.is_unavailable);
  const [asSwap, setAsSwap] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = providerName.trim().toLowerCase();
    if (!q) return providers.slice(0, 8);
    return providers.filter(p =>
      p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [providerName, providers]);

  const canSave = (markUnavailable || providerName.trim().length > 0)
    && (!asSwap || !!existing);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: CARD_BG, borderRadius:'14px',
        padding:'22px 24px', maxWidth:'420px', width:'100%',
        boxShadow:'0 20px 60px rgba(20,18,40,0.25)',
      }}>
        <div style={{fontSize:'11px', letterSpacing:'1.4px', textTransform:'uppercase',
                     color: PURPLE, fontWeight:800, marginBottom:'4px'}}>
          {existing ? 'Edit assignment' : 'Assign shift'}
        </div>
        <div style={{fontFamily: SERIF, fontSize:'20px', color: INK, marginBottom:'2px'}}>{shift.name}</div>
        <div style={{fontSize:'12px', color: INK_SOFT, marginBottom:'18px'}}>
          {shift.start_time}–{shift.end_time} · {SHIFT_TYPE_BADGE[shift.shift_type].label}
        </div>

        <label style={labelStyle}>Provider</label>
        <input
          ref={inputRef}
          value={providerName}
          onChange={e => setProviderName(e.target.value)}
          placeholder="Type a name or pick from roster"
          disabled={markUnavailable}
          style={{
            ...inputStyle,
            opacity: markUnavailable ? 0.5 : 1,
          }}
        />
        {!markUnavailable && filtered.length > 0 && (
          <div style={{
            border:`1px solid ${BORDER}`, borderRadius:'8px', marginTop:'6px',
            maxHeight:'180px', overflow:'auto',
          }}>
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProviderName(p.name)}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  width:'100%', padding:'8px 12px', background:'transparent',
                  border:'none', borderBottom:`1px solid ${BORDER}`,
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                <span style={{fontSize:'13px', fontWeight:600, color: INK}}>{p.name}</span>
                <span style={{fontSize:'11px', color: INK_SOFT}}>{p.role}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{display:'flex', gap:'14px', marginTop:'14px', flexWrap:'wrap'}}>
          <label style={checkboxRow}>
            <input type="checkbox" checked={markUnavailable}
              onChange={e => { setMarkUnavailable(e.target.checked); if (e.target.checked) setAsSwap(false); }}/>
            <span>Mark unavailable 🚫</span>
          </label>
          <label style={{...checkboxRow, opacity: existing ? 1 : 0.4}}>
            <input
              type="checkbox"
              checked={asSwap}
              disabled={!existing || markUnavailable}
              onChange={e => setAsSwap(e.target.checked)}
            />
            <span>Mark as swap (keeps original strikethrough)</span>
          </label>
        </div>

        <div style={{display:'flex', gap:'8px', marginTop:'22px', justifyContent:'flex-end'}}>
          {existing && (
            <button
              type="button"
              onClick={() => onDelete(existing.id)}
              style={{...secondaryBtn, color:'#9A2A2A', borderColor:'rgba(154,42,42,0.25)'}}>
              Remove
            </button>
          )}
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(
              shift.id,
              providerName.trim(),
              markUnavailable,
              asSwap,
              existing ? existing.id : null,
            )}
            style={{
              ...primaryBtn,
              opacity: canSave ? 1 : 0.5,
              cursor: canSave ? 'pointer' : 'default',
            }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Provider creation modal ─────────────────────────────────────────
const ProviderModal: React.FC<{
  API: string;
  token: string;
  existingNames: string[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ API, token, existingNames, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'MD'|'DO'|'APP'|'NP'|'PA'>('MD');
  const [hospitals, setHospitals] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    const trimmed = name.trim();
    if (!trimmed) { setErr('Name required (LastnameInitials, e.g. MillerJE)'); return; }
    if (existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setErr('A provider with that name already exists.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/shiftmd/providers`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed, role, hospitals: Array.from(hospitals) }),
      });
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      onSaved();
    } catch (e: any) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleHospital = (h: string) => {
    setHospitals(prev => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h); else next.add(h);
      return next;
    });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: CARD_BG, borderRadius:'14px',
        padding:'22px 24px', maxWidth:'420px', width:'100%',
        boxShadow:'0 20px 60px rgba(20,18,40,0.25)',
      }}>
        <div style={{fontSize:'11px', letterSpacing:'1.4px', textTransform:'uppercase',
                     color: PURPLE, fontWeight:800, marginBottom:'10px'}}>
          New provider
        </div>
        <label style={labelStyle}>Name (LastnameInitials)</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="MillerJE" style={inputStyle}/>
        <label style={{...labelStyle, marginTop:'12px'}}>Role</label>
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {(['MD','DO','APP','NP','PA'] as const).map(r => (
            <button key={r} type="button" onClick={() => setRole(r)} style={{
              ...secondaryBtn,
              background: role === r ? PURPLE : CARD_BG,
              color: role === r ? 'white' : INK,
              borderColor: role === r ? PURPLE : BORDER,
            }}>{r}</button>
          ))}
        </div>
        <label style={{...labelStyle, marginTop:'12px'}}>Hospitals</label>
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {['IMED','AV','LDS'].map(h => (
            <button key={h} type="button" onClick={() => toggleHospital(h)} style={{
              ...secondaryBtn,
              background: hospitals.has(h) ? PURPLE : CARD_BG,
              color: hospitals.has(h) ? 'white' : INK,
              borderColor: hospitals.has(h) ? PURPLE : BORDER,
            }}>{h}</button>
          ))}
        </div>
        {err && <div style={{marginTop:'12px', fontSize:'12px', color:'#9A2A2A'}}>{err}</div>}
        <div style={{display:'flex', gap:'8px', marginTop:'18px', justifyContent:'flex-end'}}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button type="button" disabled={saving} onClick={submit} style={{
            ...primaryBtn,
            opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── AI Insight panel ────────────────────────────────────────────────
const InsightPanel: React.FC<{
  loading: boolean;
  text: string;
  dateLabel: string;
  onClose: () => void;
}> = ({ loading, text, dateLabel, onClose }) => (
  <div className="shiftmd-no-print" style={{
    position:'fixed', inset:0, background:'rgba(20,18,40,0.32)',
    display:'flex', justifyContent:'flex-end', zIndex:1000,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: CARD_BG, width:'min(420px, 92vw)', height:'100%',
      display:'flex', flexDirection:'column',
      boxShadow:'-12px 0 40px rgba(20,18,40,0.18)',
    }}>
      <div style={{
        padding:'18px 22px', borderBottom:`1px solid ${BORDER}`,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase',
                       color: PURPLE, fontWeight:800}}>AI Insight</div>
          <div style={{fontFamily: SERIF, fontSize:'18px', color: INK}}>{dateLabel}</div>
        </div>
        <button onClick={onClose} style={{...secondaryBtn, padding:'6px 12px'}}>Close</button>
      </div>
      <div style={{flex:1, overflow:'auto', padding:'18px 22px', fontSize:'14px',
                   lineHeight:1.65, color: INK, whiteSpace:'pre-wrap'}}>
        {loading ? <span style={{color: INK_SOFT, fontStyle:'italic'}}>Analyzing…</span> : text}
      </div>
    </div>
  </div>
);

// ─── Date picker (native input, styled trigger) ──────────────────────
const DatePicker: React.FC<{value: string; onChange: (iso: string) => void; pretty: string}> = ({ value, onChange, pretty }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{position:'relative'}}>
      <button type="button" onClick={() => {
        const el = ref.current;
        if (!el) return;
        // showPicker is supported in modern browsers; fall back to focus.
        if (typeof (el as any).showPicker === 'function') (el as any).showPicker();
        else el.focus();
      }} style={{
        ...navBtn, padding:'8px 14px', minWidth:'180px',
        fontSize:'13px', fontWeight:600, color: INK,
      }}>
        {pretty}
      </button>
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{
          position:'absolute', inset:0, opacity:0, pointerEvents:'none',
        }}
      />
    </div>
  );
};

const navBtn: React.CSSProperties = {
  background: CARD_BG, color: INK,
  border:`1px solid ${BORDER}`, borderRadius:'8px',
  padding:'7px 12px', cursor:'pointer',
  fontSize:'15px', fontWeight:600, fontFamily:'inherit',
  minWidth:'36px', lineHeight:1,
};
const secondaryBtn: React.CSSProperties = {
  background: CARD_BG, color: INK,
  border:`1px solid ${BORDER}`, borderRadius:'8px',
  padding:'8px 14px', cursor:'pointer',
  fontSize:'13px', fontWeight:600, fontFamily:'inherit',
};
const primaryBtn: React.CSSProperties = {
  background: PURPLE, color:'white',
  border:'none', borderRadius:'8px',
  padding:'9px 18px', cursor:'pointer',
  fontSize:'13px', fontWeight:700, fontFamily:'inherit',
};
const overlayStyle: React.CSSProperties = {
  position:'fixed', inset:0, background:'rgba(20,18,40,0.42)',
  display:'flex', alignItems:'center', justifyContent:'center',
  zIndex:1000, padding:'20px',
};
const labelStyle: React.CSSProperties = {
  display:'block', fontSize:'11px', letterSpacing:'0.06em',
  textTransform:'uppercase', color: INK_SOFT, fontWeight:700,
  marginBottom:'6px',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'8px',
  border:`1px solid ${BORDER}`, fontSize:'14px',
  fontFamily:'inherit', boxSizing:'border-box', color: INK,
};
const checkboxRow: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:'7px',
  fontSize:'13px', color: INK, cursor:'pointer',
};

export default ShiftMD;
