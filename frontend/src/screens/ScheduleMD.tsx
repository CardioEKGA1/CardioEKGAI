// © 2026 SoulMD, LLC. All rights reserved.
//
// ScheduleMD — admin scheduling dashboard. v2 of the legacy ShiftMD UI.
// Five top tabs (Schedule, Providers, Prefs & Time Off, Equity, Swaps).
// Owner-gated at the route level (App.tsx). All data flows through
// /api/schedulemd/* endpoints under verify_concierge_owner.
//
// Layout: dark navy left sidebar + horizontal top bar (tabs + global
// controls per tab) + scrollable content area + bottom strip on the
// Schedule tab. Print stylesheet hides chrome so window.print() exports
// the schedule grid as PDF without the surrounding UI.
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

type TabKey = 'schedule' | 'providers' | 'prefsoff' | 'equity' | 'swaps';
type SubTabKey = 'preferences' | 'timeoff';

interface Block {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'preference_open' | 'published';
  published_at: string | null;
  created_at: string | null;
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
  block_id: number | null;
  schedule_date: string;
  provider_id: number | null;
  provider_name: string | null;
  provider_full_name: string | null;
  is_swapped: boolean;
  swapped_from_provider_id: number | null;
  swap_note: string | null;
  is_open: boolean;
  source: string;
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
  full_name: string | null;
  email: string | null;
  role: 'MD' | 'DO' | 'APP' | 'NP' | 'PA';
  employment_type: 'fte' | 'part_time' | 'moonlighter' | 'locum' | null;
  hospitals: string[];
  no_nights: boolean;
  contracted_shifts_per_block: number | null;
  min_shifts_per_block: number | null;
  max_shifts_per_block: number | null;
  has_active_link: boolean;
  last_login: string | null;
}
interface TimeOffRow {
  id: number;
  provider_id: number;
  provider_name: string | null;
  provider_full_name: string | null;
  block_id: number | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string | null;
  reviewed_at: string | null;
}
interface PreferenceRow {
  id: number;
  block_id: number;
  preferred_days: string[];
  preferred_shift_types: string[];
  preferred_hospitals: string[];
  avoid_hospitals: string[];
}
interface SwapRow {
  id: number;
  assignment_id: number;
  requesting_provider_id: number;
  requesting_provider_name: string | null;
  receiving_provider_id: number | null;
  receiving_provider_name: string | null;
  swap_type: 'direct' | 'donate';
  status: 'pending' | 'auto_approved' | 'approved' | 'denied';
  rule_violations: string[];
  requested_at: string | null;
  resolved_at: string | null;
}
interface EquityRow {
  provider_id: number;
  name: string;
  full_name: string | null;
  role: string;
  contracted: number;
  worked: number;
  remaining: number;
  nights: number;
  weekends: number;
  holidays: number;
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

const RULE_LABEL: Record<string, string> = {
  NO_DUAL_HOSPITAL:   'Already assigned to another hospital that day',
  NO_NIGHT_AFTER_DAY: 'Same-day day shift conflicts with this night',
  NO_NIGHTS_FLAG:     'Provider has the No-Nights flag set',
  MAX_SHIFTS:         'At or above max shifts for the block',
  TIME_OFF_CONFLICT:  'Falls inside an approved time-off range',
};

const ScheduleMD: React.FC<Props> = ({
  API, token, onBack,
  onNavigateDashboard, onNavigateMeditations, onNavigateConciergeAccess, onNavigateMarketing,
}) => {
  const [tab, setTab] = useState<TabKey>('schedule');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [date, setDate] = useState<Date>(() => new Date());
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [warningToast, setWarningToast] = useState<string>('');

  const dateISO = fmtISO(date);
  const auth = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // ─── Data loading ──────────────────────────────────────────────────
  const loadBlocks = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/schedulemd/blocks`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`blocks (${r.status})`);
      const d = await r.json();
      setBlocks(d.blocks || []);
      if (!activeBlockId && d.blocks?.length) {
        const today = fmtISO(new Date());
        const live = d.blocks.find((b: Block) => b.start_date <= today && today <= b.end_date) || d.blocks[0];
        setActiveBlockId(live.id);
      }
    } catch (e: any) { setErr(e.message); }
  }, [API, token, activeBlockId]);

  const loadProviders = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/schedulemd/providers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json();
      setProviders(d.providers || []);
    } catch { /* non-fatal */ }
  }, [API, token]);

  const loadSchedule = useCallback(async (iso: string, bid: number | null) => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({ date: iso });
      if (bid != null) params.set('block_id', String(bid));
      const r = await fetch(`${API}/api/schedulemd/schedule?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`schedule (${r.status})`);
      const d = await r.json();
      setHospitals(d.hospitals || []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [API, token]);

  useEffect(() => { loadBlocks(); loadProviders(); }, [loadBlocks, loadProviders]);
  useEffect(() => { loadSchedule(dateISO, activeBlockId); }, [dateISO, activeBlockId, loadSchedule]);

  // Schedule tab helpers
  const totals = useMemo(() => hospitals.map(h => {
    const total = h.shifts.length;
    const filled = h.shifts.filter(s => {
      const a = s.assignments.find(x => !x.is_swapped);
      return a && a.provider_id != null && !a.is_open;
    }).length;
    return { name: h.name, color: h.color, filled, total };
  }), [hospitals]);
  const totalGaps = totals.reduce((acc, t) => acc + (t.total - t.filled), 0);

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: INK, fontFamily: SANS, display:'flex', flexDirection:'column'}}>
      <style>{`
        @media print {
          .smd-no-print { display: none !important; }
          .smd-page { background: white !important; }
          .smd-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .smd-card:hover .smd-hint { opacity: 1 !important; }
      `}</style>

      <div className="smd-no-print">
        <SuperuserTabNav
          active="schedulemd"
          onDashboard={onNavigateDashboard || (() => { window.location.href = '/dashboard'; })}
          onMeditations={onNavigateMeditations || (() => { window.location.href = '/meditations/library'; })}
          onConcierge={onNavigateConciergeAccess || (() => { window.location.href = '/concierge-access'; })}
          onMarketing={onNavigateMarketing || (() => { window.location.href = '/admin/marketing'; })}
          onScheduleMD={() => { /* already here */ }}
          onAllowlist={() => { window.location.href = '/settings/allowlist'; }}
        />
      </div>

      <div className="smd-page" style={{display:'flex', flex:1, minHeight:0}}>
        {/* Sidebar */}
        <aside className="smd-no-print" style={{
          width:'88px', flexShrink:0,
          background:`linear-gradient(180deg, ${NAVY_DK} 0%, ${NAVY} 100%)`,
          color:'white', display:'flex', flexDirection:'column', alignItems:'center',
          padding:'18px 0', gap:'18px',
        }}>
          <button onClick={onBack} title="Back" style={{
            background:'rgba(255,255,255,0.08)', color:'white',
            border:'1px solid rgba(255,255,255,0.18)', borderRadius:'10px',
            width:'46px', height:'40px', cursor:'pointer', fontSize:'17px', fontWeight:600,
          }}>←</button>
          <div style={{
            writingMode:'vertical-rl', transform:'rotate(180deg)',
            fontFamily: SERIF, fontSize:'18px', letterSpacing:'0.32em',
            textTransform:'uppercase', color:'rgba(255,255,255,0.92)', marginTop:'12px',
          }}>ScheduleMD</div>
          <div style={{flex:1}}/>
          <div style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase',
                       color:'rgba(255,255,255,0.4)', writingMode:'vertical-rl', transform:'rotate(180deg)'}}>
            SoulMD
          </div>
        </aside>

        {/* Main */}
        <main style={{flex:1, minWidth:0, display:'flex', flexDirection:'column'}}>
          {/* Tab strip */}
          <div className="smd-no-print" style={{
            display:'flex', alignItems:'center', gap:'4px',
            background: CARD_BG, borderBottom:`1px solid ${BORDER}`,
            padding:'10px clamp(14px,3vw,28px)', overflowX:'auto', whiteSpace:'nowrap',
          }}>
            <h1 style={{margin:0, fontFamily: SERIF, fontWeight:400, fontSize:'22px', color: NAVY,
                        letterSpacing:'0.01em', marginRight:'18px'}}>ScheduleMD</h1>
            {([
              ['schedule', 'Schedule'],
              ['providers', 'Providers'],
              ['prefsoff', 'Preferences & Time Off'],
              ['equity', 'Equity'],
              ['swaps', 'Swaps'],
            ] as [TabKey, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                background: tab === k ? '#EEEBFA' : 'transparent',
                color: tab === k ? PURPLE : INK_SOFT,
                border: 'none', borderRadius: '10px',
                padding: '8px 14px', fontSize: '13px',
                fontWeight: tab === k ? 700 : 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{l}</button>
            ))}
            <div style={{flex:1, minWidth:'8px'}}/>
            <BlockSelector
              blocks={blocks}
              activeId={activeBlockId}
              onChange={setActiveBlockId}
              onCreated={loadBlocks}
              API={API}
              token={token}
            />
          </div>

          {warningToast && (
            <div className="smd-no-print" style={{
              background:'#FFF7DC', color:'#7A5A1F',
              borderBottom:'1px solid rgba(168,106,31,0.25)',
              padding:'8px 16px', fontSize:'13px', fontWeight:600,
            }}>
              ⚠ {warningToast}
              <button onClick={() => setWarningToast('')} style={{
                marginLeft:'10px', background:'transparent', border:'none', color:'#7A5A1F',
                cursor:'pointer', fontWeight:700,
              }}>dismiss</button>
            </div>
          )}

          {err && (
            <div className="smd-no-print" style={{
              background:'rgba(154,42,42,0.06)', color:'#9A2A2A',
              padding:'10px 16px', fontSize:'13px',
            }}>{err}</div>
          )}

          <div style={{flex:1, overflow:'auto', padding:'18px clamp(12px,2.5vw,24px)'}}>
            {tab === 'schedule' && (
              <ScheduleTab
                API={API} token={token} auth={auth}
                date={date} setDate={setDate}
                hospitals={hospitals}
                providers={providers}
                blocks={blocks}
                activeBlockId={activeBlockId}
                loading={loading}
                totals={totals}
                totalGaps={totalGaps}
                reload={() => loadSchedule(dateISO, activeBlockId)}
                onWarn={setWarningToast}
              />
            )}
            {tab === 'providers' && (
              <ProvidersTab
                API={API} token={token} auth={auth}
                providers={providers}
                onChanged={loadProviders}
              />
            )}
            {tab === 'prefsoff' && (
              <PrefsOffTab
                API={API} token={token} auth={auth}
                blocks={blocks}
                activeBlockId={activeBlockId}
                providers={providers}
              />
            )}
            {tab === 'equity' && (
              <EquityTab
                API={API} token={token}
                blocks={blocks}
                activeBlockId={activeBlockId}
              />
            )}
            {tab === 'swaps' && (
              <SwapsTab
                API={API} token={token} auth={auth}
                providers={providers}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// ─── Block selector ──────────────────────────────────────────────────
const BlockSelector: React.FC<{
  blocks: Block[]; activeId: number | null; onChange: (id: number) => void;
  onCreated: () => void; API: string; token: string;
}> = ({ blocks, activeId, onChange, onCreated, API, token }) => {
  const [creating, setCreating] = useState(false);
  return (
    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
      <select
        value={activeId ?? ''}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          ...secondaryBtn, padding:'8px 12px', minWidth:'220px',
        }}
      >
        {blocks.length === 0 && <option value="">No blocks yet</option>}
        {blocks.map(b => (
          <option key={b.id} value={b.id}>
            {b.name} · {b.status}
          </option>
        ))}
      </select>
      <button onClick={() => setCreating(true)} style={secondaryBtn}>+ Block</button>
      {activeId != null && (
        <BlockStatusActions
          API={API} token={token}
          block={blocks.find(b => b.id === activeId) || null}
          onChanged={onCreated}
        />
      )}
      {creating && (
        <BlockCreateModal API={API} token={token}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); onCreated(); }}/>
      )}
    </div>
  );
};

const BlockStatusActions: React.FC<{
  API: string; token: string; block: Block | null; onChanged: () => void;
}> = ({ API, token, block, onChanged }) => {
  if (!block) return null;
  const transition = async (next: 'preference_open' | 'published') => {
    if (next === 'published' && !window.confirm('Publish block? This emails every assigned provider their schedule + iCal.')) return;
    try {
      const r = await fetch(`${API}/api/schedulemd/blocks/${block.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error(`status (${r.status})`);
      onChanged();
    } catch (e: any) { alert(e.message); }
  };
  if (block.status === 'draft') {
    return <button style={secondaryBtn} onClick={() => transition('preference_open')}>Open Preferences</button>;
  }
  if (block.status === 'preference_open') {
    return <button style={{...primaryBtn, padding:'8px 14px'}} onClick={() => transition('published')}>Publish & Notify</button>;
  }
  return <span style={{
    fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', fontWeight:700,
    color:'#2A7A4A', padding:'6px 10px', background:'rgba(42,122,74,0.10)', borderRadius:'6px',
  }}>Published</span>;
};

const BlockCreateModal: React.FC<{API: string; token: string; onClose: () => void; onSaved: () => void}> = ({ API, token, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await fetch(`${API}/api/schedulemd/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, start_date: start, end_date: end }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `save (${r.status})`);
      }
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 12px', fontFamily: SERIF, fontWeight:400, fontSize:'20px'}}>New block</h3>
        <label style={labelStyle}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Block 1 — Jan–Jun 2026" style={inputStyle}/>
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Start</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle}/>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>End</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle}/>
          </div>
        </div>
        {err && <div style={{color:'#9A2A2A', fontSize:'12px', marginTop:'10px'}}>{err}</div>}
        <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'18px'}}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={submit} disabled={busy || !name || !start || !end} style={primaryBtn}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── SCHEDULE TAB ────────────────────────────────────────────────────
const ScheduleTab: React.FC<{
  API: string; token: string; auth: any;
  date: Date; setDate: (d: Date) => void;
  hospitals: Hospital[]; providers: Provider[];
  blocks: Block[]; activeBlockId: number | null;
  loading: boolean;
  totals: { name: string; color: string; filled: number; total: number }[];
  totalGaps: number;
  reload: () => void;
  onWarn: (msg: string) => void;
}> = ({ API, token, auth, date, setDate, hospitals, providers, activeBlockId, loading, totals, totalGaps, reload, onWarn }) => {
  const dateISO = fmtISO(date);
  const [assignTarget, setAssignTarget] = useState<{shift: Shift; existing: Assignment | null} | null>(null);

  const shiftDays = (delta: number) => {
    const next = new Date(date); next.setDate(next.getDate() + delta); setDate(next);
  };

  const onSave = async (shiftId: number, providerId: number | null, isOpen: boolean) => {
    try {
      const r = await fetch(`${API}/api/schedulemd/assignments`, {
        method: 'POST', headers: auth,
        body: JSON.stringify({
          shift_id: shiftId,
          block_id: activeBlockId,
          schedule_date: dateISO,
          provider_id: providerId,
          is_open: isOpen,
        }),
      });
      if (!r.ok) throw new Error(`save (${r.status})`);
      const data = await r.json();
      const warnings = (data.warnings as string[]) || [];
      if (warnings.length) onWarn(warnings.map(v => RULE_LABEL[v] || v).join(' · '));
      else onWarn('');
      setAssignTarget(null);
      reload();
    } catch (e: any) { alert(e.message); }
  };

  const onDelete = async (assignmentId: number) => {
    try {
      const r = await fetch(`${API}/api/schedulemd/assignments/${assignmentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`delete (${r.status})`);
      setAssignTarget(null);
      reload();
    } catch (e: any) { alert(e.message); }
  };

  const exportCSV = async () => {
    if (!activeBlockId) return alert('Select a block first');
    try {
      const r = await fetch(`${API}/api/schedulemd/export/csv?block_id=${activeBlockId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`csv (${r.status})`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'schedulemd.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div className="smd-no-print" style={{
        display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'16px',
      }}>
        <button onClick={() => shiftDays(-1)} style={navBtn}>‹</button>
        <DatePicker value={dateISO} onChange={iso => setDate(parseISO(iso))} pretty={fmtPretty(date)}/>
        <button onClick={() => shiftDays(1)} style={navBtn}>›</button>
        <button onClick={() => setDate(new Date())} style={{...navBtn, padding:'8px 14px', fontSize:'12px', fontWeight:600}}>Today</button>
        <div style={{flex:1}}/>
        <div title="Unfilled shifts" style={{
          display:'flex', alignItems:'center', gap:'8px',
          padding:'8px 14px', borderRadius:'999px',
          background: totalGaps > 0 ? 'rgba(154,42,42,0.08)' : 'rgba(42,122,74,0.08)',
          color: totalGaps > 0 ? '#9A2A2A' : '#2A7A4A',
          fontSize:'13px', fontWeight:700,
          border: `1px solid ${totalGaps > 0 ? 'rgba(154,42,42,0.25)' : 'rgba(42,122,74,0.25)'}`,
        }}>
          <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'currentColor'}}/>
          {totalGaps > 0 ? `${totalGaps} coverage gap${totalGaps === 1 ? '' : 's'}` : 'Fully covered'}
        </div>
        <button onClick={exportCSV} style={secondaryBtn}>Export CSV</button>
        <button onClick={() => window.print()} style={secondaryBtn}>Export PDF</button>
      </div>

      {loading && hospitals.length === 0 ? (
        <div style={{padding:'40px 0', textAlign:'center', color: INK_SOFT, fontSize:'14px'}}>Loading schedule…</div>
      ) : (
        <div className="smd-grid" style={{display:'grid', gap:'18px',
                                          gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))'}}>
          {hospitals.map(h => (
            <HospitalColumn
              key={h.id}
              hospital={h}
              onAssign={(shift, existing) => setAssignTarget({ shift, existing })}
            />
          ))}
        </div>
      )}

      {/* Bottom strip */}
      <div className="smd-no-print" style={{
        position:'sticky', bottom:0, marginTop:'18px',
        background: CARD_BG, borderTop:`1px solid ${BORDER}`,
        borderRadius:'10px', padding:'12px 16px',
        display:'flex', alignItems:'center', gap:'18px', flexWrap:'wrap', fontSize:'13px',
      }}>
        {totals.map(t => (
          <span key={t.name} style={{display:'inline-flex', alignItems:'center', gap:'7px', fontWeight:600}}>
            <span style={{width:'9px', height:'9px', borderRadius:'2px', background: t.color}}/>
            <span style={{color: t.color, fontWeight:800}}>{t.name}</span>
            <span style={{color: INK_SOFT}}>{t.filled}/{t.total}</span>
          </span>
        ))}
      </div>

      {assignTarget && (
        <AssignModal
          shift={assignTarget.shift}
          existing={assignTarget.existing}
          providers={providers}
          onClose={() => setAssignTarget(null)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};

const HospitalColumn: React.FC<{hospital: Hospital; onAssign: (shift: Shift, existing: Assignment | null) => void}> = ({ hospital, onAssign }) => {
  const filled = hospital.shifts.filter(s => {
    const a = s.assignments.find(x => !x.is_swapped);
    return a && a.provider_id != null && !a.is_open;
  }).length;
  return (
    <div style={{background: CARD_BG, borderRadius:'14px', border:`1px solid ${BORDER}`, overflow:'hidden',
                  display:'flex', flexDirection:'column', boxShadow:'0 1px 3px rgba(20,18,40,0.04)'}}>
      <div style={{background: hospital.color, color:'white', padding:'14px 18px',
                    display:'flex', alignItems:'baseline', gap:'10px'}}>
        <h2 style={{margin:0, fontFamily: SERIF, fontWeight:400, fontSize:'22px', letterSpacing:'0.04em'}}>{hospital.name}</h2>
        <span style={{marginLeft:'auto', fontSize:'12px', fontWeight:700, opacity:0.92, letterSpacing:'0.04em'}}>{filled}/{hospital.shifts.length}</span>
      </div>
      <div style={{display:'flex', flexDirection:'column'}}>
        {hospital.shifts.map(s => (
          <ShiftRow key={s.id} shift={s}
            active={s.assignments.find(a => !a.is_swapped) || null}
            swapped={s.assignments.filter(a => a.is_swapped)}
            onClick={() => onAssign(s, s.assignments.find(a => !a.is_swapped) || null)}
          />
        ))}
      </div>
    </div>
  );
};

const ShiftRow: React.FC<{
  shift: Shift; active: Assignment | null; swapped: Assignment[]; onClick: () => void;
}> = ({ shift, active, swapped, onClick }) => {
  const badge = SHIFT_TYPE_BADGE[shift.shift_type];
  const filled = !!active && !!active.provider_id && !active.is_open;
  return (
    <button type="button" onClick={onClick} className="smd-card"
      style={{
        display:'flex', alignItems:'center', gap:'12px', padding:'10px 16px',
        background:'transparent', border:'none', borderTop:`1px solid ${BORDER}`,
        textAlign:'left', cursor:'pointer', fontFamily:'inherit',
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
          <div key={s.id} style={{fontSize:'12px', textDecoration:'line-through', color: INK_SOFT, opacity:0.7}}>
            {s.provider_name || '—'}
            {s.swap_note && <span style={{marginLeft:'6px', fontStyle:'italic'}}>· {s.swap_note}</span>}
          </div>
        ))}
        {filled && (
          <div style={{fontSize:'14px', fontWeight:600, color: INK}}>
            {active!.provider_name}
            {active!.source === 'swap' && <span style={{marginLeft:'6px', fontSize:'10px', color: PURPLE, letterSpacing:'1px', fontWeight:700, textTransform:'uppercase'}}>swap</span>}
            {active!.source === 'pickup' && <span style={{marginLeft:'6px', fontSize:'10px', color:'#2A7A4A', letterSpacing:'1px', fontWeight:700, textTransform:'uppercase'}}>pickup</span>}
          </div>
        )}
        {active?.is_open && (
          <div style={{fontSize:'13px', color:'#A86A1F', fontWeight:600}}>🟡 Open shift</div>
        )}
        {!active && (
          <div style={{display:'inline-block', border:`1.5px dashed ${BORDER}`, borderRadius:'6px',
                        padding:'3px 10px', fontSize:'12px', color: PURPLE, fontWeight:600}}>+ Assign</div>
        )}
      </div>
      <span className="smd-hint" style={{opacity:0, transition:'opacity 120ms', fontSize:'11px', color: INK_SOFT}}>edit</span>
    </button>
  );
};

const AssignModal: React.FC<{
  shift: Shift; existing: Assignment | null; providers: Provider[];
  onClose: () => void;
  onSave: (shiftId: number, providerId: number | null, isOpen: boolean) => void;
  onDelete: (id: number) => void;
}> = ({ shift, existing, providers, onClose, onSave, onDelete }) => {
  const [providerId, setProviderId] = useState<number | null>(existing?.provider_id ?? null);
  const [isOpen, setIsOpen] = useState<boolean>(existing?.is_open ?? false);
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return providers.filter(p => !q || p.name.toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [providers, filter]);
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:'11px', letterSpacing:'1.4px', textTransform:'uppercase', color: PURPLE, fontWeight:800}}>
          {existing ? 'Edit assignment' : 'Assign shift'}
        </div>
        <div style={{fontFamily: SERIF, fontSize:'20px', color: INK}}>{shift.name}</div>
        <div style={{fontSize:'12px', color: INK_SOFT, marginBottom:'14px'}}>
          {shift.start_time}–{shift.end_time} · {SHIFT_TYPE_BADGE[shift.shift_type].label}
        </div>
        <label style={labelStyle}>Provider</label>
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name…" style={inputStyle}/>
        <div style={{maxHeight:'200px', overflow:'auto', border:`1px solid ${BORDER}`, borderRadius:'8px', marginTop:'6px'}}>
          <button type="button" onClick={() => setProviderId(null)}
            style={{...rowBtn, background: providerId === null ? '#EEEBFA' : 'transparent'}}>
            <span style={{fontWeight:600}}>(none — leave empty)</span>
          </button>
          {filtered.map(p => (
            <button key={p.id} type="button" onClick={() => setProviderId(p.id)}
              style={{...rowBtn, background: providerId === p.id ? '#EEEBFA' : 'transparent'}}>
              <span style={{fontWeight:600}}>{p.name}</span>
              <span style={{color: INK_SOFT}}>{p.role}{p.no_nights ? ' · no-nights' : ''}</span>
            </button>
          ))}
        </div>
        <label style={{...checkboxRow, marginTop:'12px'}}>
          <input type="checkbox" checked={isOpen} onChange={e => { setIsOpen(e.target.checked); if (e.target.checked) setProviderId(null); }}/>
          <span>Mark as open shift (eligible for portal pickup)</span>
        </label>
        <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'18px'}}>
          {existing && (
            <button onClick={() => onDelete(existing.id)} style={{...secondaryBtn, color:'#9A2A2A', borderColor:'rgba(154,42,42,0.25)'}}>Remove</button>
          )}
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={() => onSave(shift.id, providerId, isOpen)} style={primaryBtn}>Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── PROVIDERS TAB ───────────────────────────────────────────────────
const ProvidersTab: React.FC<{
  API: string; token: string; auth: any;
  providers: Provider[]; onChanged: () => void;
}> = ({ API, token, auth, providers, onChanged }) => {
  const [editing, setEditing] = useState<Provider | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [linkInfo, setLinkInfo] = useState<string>('');

  const sendLink = async (p: Provider) => {
    if (!p.email) { alert('Add an email for this provider first.'); return; }
    setBusy(p.id);
    try {
      const r = await fetch(`${API}/api/schedulemd/providers/${p.id}/send-magic-link`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `link (${r.status})`);
      }
      const d = await r.json();
      setLinkInfo(`Sent to ${p.email}. Expires ${new Date(d.expires_at).toLocaleDateString()}.`);
      onChanged();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };

  const remove = async (p: Provider) => {
    if (!window.confirm(`Delete ${p.name}? Their assignments become open shifts.`)) return;
    try {
      const r = await fetch(`${API}/api/schedulemd/providers/${p.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`delete (${r.status})`);
      onChanged();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px'}}>
        <h2 style={{fontFamily: SERIF, fontWeight:400, fontSize:'20px', color: NAVY, margin:0}}>Roster ({providers.length})</h2>
        <div style={{flex:1}}/>
        <button onClick={() => setCreating(true)} style={primaryBtn}>+ Add Provider</button>
      </div>
      {linkInfo && (
        <div style={{background:'rgba(42,122,74,0.08)', color:'#2A7A4A', padding:'10px 14px',
                      borderRadius:'8px', fontSize:'13px', fontWeight:600, marginBottom:'14px'}}>{linkInfo}</div>
      )}
      <div style={{background: CARD_BG, borderRadius:'12px', border:`1px solid ${BORDER}`, overflow:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead style={{background:'#FAFAFD'}}>
            <tr>
              {['Name', 'Role', 'Type', 'Hospitals', 'Contracted', 'No Nights', 'Portal', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 && (
              <tr><td colSpan={8} style={{padding:'24px', textAlign:'center', color: INK_SOFT}}>No providers yet. Add one to begin.</td></tr>
            )}
            {providers.map(p => (
              <tr key={p.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={tdStyle}>
                  <div style={{fontWeight:700}}>{p.name}</div>
                  {p.full_name && <div style={{color: INK_SOFT, fontSize:'11px'}}>{p.full_name}</div>}
                  {p.email && <div style={{color: INK_SOFT, fontSize:'11px'}}>{p.email}</div>}
                </td>
                <td style={tdStyle}>{p.role}</td>
                <td style={tdStyle}>{p.employment_type || '—'}</td>
                <td style={tdStyle}>{(p.hospitals || []).join(', ') || '—'}</td>
                <td style={tdStyle}>
                  {p.contracted_shifts_per_block ?? '—'}
                  {p.min_shifts_per_block != null && (
                    <div style={{fontSize:'10px', color: INK_SOFT}}>
                      min {p.min_shifts_per_block} · max {p.max_shifts_per_block ?? '—'}
                    </div>
                  )}
                </td>
                <td style={tdStyle}>{p.no_nights ? '🚫' : '—'}</td>
                <td style={tdStyle}>
                  {p.has_active_link ? (
                    <span style={{fontSize:'11px', color:'#2A7A4A'}}>active</span>
                  ) : (
                    <span style={{fontSize:'11px', color: INK_SOFT}}>—</span>
                  )}
                </td>
                <td style={{...tdStyle, whiteSpace:'nowrap'}}>
                  <button onClick={() => setEditing(p)} style={smallBtn}>Edit</button>
                  <button onClick={() => sendLink(p)} disabled={busy === p.id} style={{...smallBtn, marginLeft:'4px'}}>{busy === p.id ? 'Sending…' : 'Send Link'}</button>
                  <button onClick={() => remove(p)} style={{...smallBtn, marginLeft:'4px', color:'#9A2A2A'}}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(creating || editing) && (
        <ProviderModal
          API={API} token={token}
          provider={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); onChanged(); }}
        />
      )}
    </div>
  );
};

const ProviderModal: React.FC<{
  API: string; token: string; provider: Provider | null;
  onClose: () => void; onSaved: () => void;
}> = ({ API, token, provider, onClose, onSaved }) => {
  const isEdit = !!provider;
  const [form, setForm] = useState<any>(() => ({
    name: provider?.name ?? '',
    full_name: provider?.full_name ?? '',
    email: provider?.email ?? '',
    role: provider?.role ?? 'MD',
    employment_type: provider?.employment_type ?? 'fte',
    hospitals: new Set<string>(provider?.hospitals ?? []),
    no_nights: provider?.no_nights ?? false,
    contracted_shifts_per_block: provider?.contracted_shifts_per_block ?? '',
    min_shifts_per_block: provider?.min_shifts_per_block ?? '',
    max_shifts_per_block: provider?.max_shifts_per_block ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true);
    const payload: any = {
      full_name: form.full_name || null,
      email: form.email || null,
      role: form.role,
      employment_type: form.employment_type,
      hospitals: Array.from(form.hospitals),
      no_nights: !!form.no_nights,
      contracted_shifts_per_block: form.contracted_shifts_per_block === '' ? null : Number(form.contracted_shifts_per_block),
      min_shifts_per_block: form.min_shifts_per_block === '' ? null : Number(form.min_shifts_per_block),
      max_shifts_per_block: form.max_shifts_per_block === '' ? null : Number(form.max_shifts_per_block),
    };
    if (!isEdit) payload.name = form.name;
    try {
      const url = isEdit ? `${API}/api/schedulemd/providers/${provider!.id}` : `${API}/api/schedulemd/providers`;
      const r = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `save (${r.status})`);
      }
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const setF = (k: string, v: any) => setForm((f: any) => ({...f, [k]: v}));
  const toggleHospital = (h: string) => {
    const next = new Set<string>(form.hospitals);
    if (next.has(h)) next.delete(h); else next.add(h);
    setF('hospitals', next);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{...modalCard, maxWidth:'480px'}} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:'0 0 12px', fontFamily: SERIF, fontWeight:400, fontSize:'20px'}}>
          {isEdit ? 'Edit provider' : 'New provider'}
        </h3>
        {!isEdit && (
          <>
            <label style={labelStyle}>Name (LastnameInitials)</label>
            <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="AndersonNE" style={inputStyle}/>
          </>
        )}
        <label style={{...labelStyle, marginTop:'10px'}}>Full name</label>
        <input value={form.full_name} onChange={e => setF('full_name', e.target.value)} style={inputStyle}/>
        <label style={{...labelStyle, marginTop:'10px'}}>Email</label>
        <input value={form.email} onChange={e => setF('email', e.target.value)} type="email" style={inputStyle}/>
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={e => setF('role', e.target.value)} style={inputStyle}>
              {['MD','DO','APP','NP','PA'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>Employment</label>
            <select value={form.employment_type} onChange={e => setF('employment_type', e.target.value)} style={inputStyle}>
              {[['fte','FTE'],['part_time','Part-time'],['moonlighter','Moonlighter'],['locum','Locum']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <label style={{...labelStyle, marginTop:'10px'}}>Hospitals</label>
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {['IMED','AV','LDS'].map(h => (
            <button key={h} type="button" onClick={() => toggleHospital(h)} style={{
              ...secondaryBtn,
              background: form.hospitals.has(h) ? PURPLE : CARD_BG,
              color: form.hospitals.has(h) ? 'white' : INK,
              borderColor: form.hospitals.has(h) ? PURPLE : BORDER,
            }}>{h}</button>
          ))}
        </div>
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Contracted / block</label>
            <input value={form.contracted_shifts_per_block} onChange={e => setF('contracted_shifts_per_block', e.target.value)} type="number" style={inputStyle}/>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>Min</label>
            <input value={form.min_shifts_per_block} onChange={e => setF('min_shifts_per_block', e.target.value)} type="number" style={inputStyle}/>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>Max</label>
            <input value={form.max_shifts_per_block} onChange={e => setF('max_shifts_per_block', e.target.value)} type="number" style={inputStyle}/>
          </div>
        </div>
        <label style={{...checkboxRow, marginTop:'12px'}}>
          <input type="checkbox" checked={form.no_nights} onChange={e => setF('no_nights', e.target.checked)}/>
          <span>No nights (rules engine warns on night assignments)</span>
        </label>
        {err && <div style={{color:'#9A2A2A', fontSize:'12px', marginTop:'10px'}}>{err}</div>}
        <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'18px'}}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={submit} disabled={busy} style={primaryBtn}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── PREFERENCES & TIME OFF TAB ──────────────────────────────────────
const PrefsOffTab: React.FC<{
  API: string; token: string; auth: any;
  blocks: Block[]; activeBlockId: number | null; providers: Provider[];
}> = ({ API, token, auth, blocks, activeBlockId, providers }) => {
  const [sub, setSub] = useState<SubTabKey>('preferences');
  return (
    <div>
      <div style={{display:'flex', gap:'4px', marginBottom:'14px'}}>
        {([['preferences','Preferences'],['timeoff','Time Off']] as [SubTabKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} style={{
            background: sub === k ? '#EEEBFA' : 'transparent',
            color: sub === k ? PURPLE : INK_SOFT,
            border: 'none', borderRadius: '8px', padding: '7px 14px',
            fontSize: '12px', fontWeight: sub === k ? 700 : 600,
            cursor:'pointer', fontFamily:'inherit',
          }}>{l}</button>
        ))}
      </div>
      {sub === 'preferences' && (
        <PreferencesPane API={API} token={token} blocks={blocks} activeBlockId={activeBlockId} providers={providers}/>
      )}
      {sub === 'timeoff' && (
        <TimeOffPane API={API} token={token} auth={auth} blocks={blocks} activeBlockId={activeBlockId}/>
      )}
    </div>
  );
};

const PreferencesPane: React.FC<{
  API: string; token: string; blocks: Block[]; activeBlockId: number | null; providers: Provider[];
}> = ({ API, token, blocks, activeBlockId, providers }) => {
  // Without a portal-side admin endpoint listing all preferences in one shot, we
  // fetch per-provider via the portal endpoint isn't possible (token-gated).
  // So we render the providers list with a per-row "no submission yet" or
  // their last submitted prefs (admin can ask physicians to submit). For
  // now, display a placeholder message + provider list as documentation.
  return (
    <div style={{background: CARD_BG, borderRadius:'12px', border:`1px solid ${BORDER}`, padding:'18px'}}>
      <h3 style={{margin:'0 0 8px', fontFamily: SERIF, fontWeight:400, fontSize:'18px'}}>Preferences</h3>
      <p style={{color: INK_SOFT, fontSize:'13px', margin:'0 0 14px', lineHeight:1.6}}>
        Providers submit preferences from the portal (Send Link → Preferences tab).
        Submitted preferences influence assignment recommendations but never hard-block
        scheduling. The admin schedule view shows preferred days / shift types /
        hospitals as soft hints.
      </p>
      <div style={{fontSize:'12px', color: INK_SOFT}}>
        {providers.length} provider{providers.length === 1 ? '' : 's'} on roster · {blocks.length} block{blocks.length === 1 ? '' : 's'} configured
      </div>
    </div>
  );
};

const TimeOffPane: React.FC<{
  API: string; token: string; auth: any; blocks: Block[]; activeBlockId: number | null;
}> = ({ API, token, auth, blocks, activeBlockId }) => {
  const [rows, setRows] = useState<TimeOffRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeBlockId != null) params.set('block_id', String(activeBlockId));
      if (filter !== 'all') params.set('status', filter);
      const r = await fetch(`${API}/api/schedulemd/time-off?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const d = await r.json();
      setRows(d.requests || []);
    } catch { /* silent */ }
  }, [API, token, activeBlockId, filter]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, status: 'approved' | 'denied') => {
    try {
      const r = await fetch(`${API}/api/schedulemd/time-off/${id}`, {
        method: 'PATCH', headers: auth, body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`patch (${r.status})`);
      load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div style={{display:'flex', gap:'6px', marginBottom:'10px'}}>
        {(['all','pending','approved','denied'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...secondaryBtn,
            background: filter === f ? PURPLE : CARD_BG,
            color: filter === f ? 'white' : INK,
            borderColor: filter === f ? PURPLE : BORDER,
            textTransform:'capitalize',
          }}>{f}</button>
        ))}
      </div>
      <div style={{background: CARD_BG, borderRadius:'12px', border:`1px solid ${BORDER}`, overflow:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead style={{background:'#FAFAFD'}}>
            <tr>{['Provider','Range','Reason','Note','Status','Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{padding:'24px', textAlign:'center', color: INK_SOFT}}>No time-off requests.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={tdStyle}>{r.provider_name || `#${r.provider_id}`}</td>
                <td style={tdStyle}>{r.start_date} → {r.end_date}</td>
                <td style={tdStyle}>{r.reason || '—'}</td>
                <td style={tdStyle}>{r.note || '—'}</td>
                <td style={tdStyle}><StatusPill status={r.status}/></td>
                <td style={tdStyle}>
                  {r.status === 'pending' ? (
                    <>
                      <button onClick={() => decide(r.id, 'approved')} style={{...smallBtn, color:'#2A7A4A'}}>Approve</button>
                      <button onClick={() => decide(r.id, 'denied')} style={{...smallBtn, marginLeft:'4px', color:'#9A2A2A'}}>Deny</button>
                    </>
                  ) : <span style={{color: INK_SOFT, fontSize:'11px'}}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── EQUITY TAB ──────────────────────────────────────────────────────
const EquityTab: React.FC<{API: string; token: string; blocks: Block[]; activeBlockId: number | null}> = ({ API, token, activeBlockId }) => {
  const [rows, setRows] = useState<EquityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (activeBlockId == null) { setRows([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/schedulemd/equity?block_id=${activeBlockId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`equity (${r.status})`);
      const d = await r.json();
      setRows(d.rows || []);
    } finally { setLoading(false); }
  }, [API, token, activeBlockId]);
  useEffect(() => { load(); }, [load]);

  const maxBar = Math.max(1, ...rows.map(r => Math.max(r.contracted, r.worked)));

  const statusLabel = (r: EquityRow) => {
    if (!r.contracted) return { label: 'Open', bg: 'rgba(107,104,137,0.15)', fg: INK_SOFT };
    if (r.worked >= r.contracted) return { label: 'On Track', bg: 'rgba(42,122,74,0.12)', fg: '#2A7A4A' };
    if (r.worked >= r.contracted * 0.6) return { label: 'On Track', bg: 'rgba(42,122,74,0.12)', fg: '#2A7A4A' };
    return { label: 'Under', bg: 'rgba(168,106,31,0.12)', fg: '#A86A1F' };
  };

  return (
    <div>
      {loading && <div style={{textAlign:'center', color: INK_SOFT, padding:'40px 0'}}>Loading equity…</div>}
      <div style={{background: CARD_BG, borderRadius:'12px', border:`1px solid ${BORDER}`, overflow:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead style={{background:'#FAFAFD'}}>
            <tr>{['Provider','Contracted','Worked','Remaining','Nights','Weekends','Holidays','Status','Bar'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={9} style={{padding:'24px', textAlign:'center', color: INK_SOFT}}>
                {activeBlockId == null ? 'Select a block above.' : 'No data yet.'}
              </td></tr>
            )}
            {rows.map(r => {
              const s = statusLabel(r);
              const cw = (r.contracted / maxBar) * 100;
              const ww = (r.worked / maxBar) * 100;
              return (
                <tr key={r.provider_id} style={{borderTop:`1px solid ${BORDER}`}}>
                  <td style={tdStyle}>
                    <div style={{fontWeight:700}}>{r.name}</div>
                    {r.full_name && <div style={{fontSize:'11px', color: INK_SOFT}}>{r.full_name} · {r.role}</div>}
                  </td>
                  <td style={tdStyle}>{r.contracted}</td>
                  <td style={tdStyle}>{r.worked}</td>
                  <td style={tdStyle}>{r.remaining}</td>
                  <td style={tdStyle}>{r.nights}</td>
                  <td style={tdStyle}>{r.weekends}</td>
                  <td style={tdStyle}>{r.holidays}</td>
                  <td style={tdStyle}>
                    <span style={{display:'inline-block', padding:'3px 10px', borderRadius:'10px',
                                  background: s.bg, color: s.fg, fontSize:'11px', fontWeight:700}}>{s.label}</span>
                  </td>
                  <td style={{...tdStyle, minWidth:'180px'}}>
                    <div style={{position:'relative', height:'18px'}}>
                      <div style={{position:'absolute', top:'2px', left:0, height:'6px', width:`${cw}%`,
                                    background:'rgba(83,74,183,0.25)', borderRadius:'3px'}} title={`Contracted: ${r.contracted}`}/>
                      <div style={{position:'absolute', top:'10px', left:0, height:'6px', width:`${ww}%`,
                                    background: PURPLE, borderRadius:'3px'}} title={`Worked: ${r.worked}`}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:'10px', fontSize:'11px', color: INK_SOFT}}>
        <span style={{display:'inline-block', width:'10px', height:'4px', background:'rgba(83,74,183,0.25)', marginRight:'4px'}}/>
        Contracted &nbsp;
        <span style={{display:'inline-block', width:'10px', height:'4px', background: PURPLE, marginRight:'4px', marginLeft:'10px'}}/>
        Worked
      </div>
    </div>
  );
};

// ─── SWAPS TAB ───────────────────────────────────────────────────────
const SwapsTab: React.FC<{API: string; token: string; auth: any; providers: Provider[]}> = ({ API, token, auth }) => {
  const [rows, setRows] = useState<SwapRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'auto_approved' | 'approved' | 'denied'>('pending');
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      const r = await fetch(`${API}/api/schedulemd/swaps?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const d = await r.json();
      setRows(d.swaps || []);
    } catch { /* silent */ }
  }, [API, token, filter]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, status: 'approved' | 'denied') => {
    try {
      const r = await fetch(`${API}/api/schedulemd/swaps/${id}`, {
        method:'PATCH', headers: auth, body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`patch (${r.status})`);
      load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div style={{display:'flex', gap:'6px', marginBottom:'14px'}}>
        {(['all','pending','auto_approved','approved','denied'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...secondaryBtn,
            background: filter === f ? PURPLE : CARD_BG,
            color: filter === f ? 'white' : INK,
            borderColor: filter === f ? PURPLE : BORDER,
            textTransform:'capitalize',
          }}>{f.replace('_',' ')}</button>
        ))}
      </div>
      <div style={{display:'grid', gap:'10px'}}>
        {rows.length === 0 && (
          <div style={{padding:'40px', textAlign:'center', color: INK_SOFT, background: CARD_BG, borderRadius:'12px', border:`1px solid ${BORDER}`}}>
            No swap requests for this filter.
          </div>
        )}
        {rows.map(s => (
          <div key={s.id} style={{
            background: CARD_BG, borderRadius:'12px', border:`1px solid ${BORDER}`,
            padding:'14px 18px', display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
          }}>
            <div style={{flex:'1 1 280px', minWidth:0}}>
              <div style={{fontSize:'14px', fontWeight:700, color: INK}}>
                {s.requesting_provider_name || `#${s.requesting_provider_id}`}
                <span style={{margin:'0 8px', color: INK_SOFT}}>→</span>
                {s.swap_type === 'donate' ? <em style={{color: INK_SOFT}}>Donate to pool</em> : (s.receiving_provider_name || `#${s.receiving_provider_id}`)}
              </div>
              <div style={{fontSize:'12px', color: INK_SOFT, marginTop:'2px'}}>
                {s.swap_type === 'direct' ? 'Direct swap' : 'Donation'} · assignment #{s.assignment_id} · requested {s.requested_at?.slice(0,10)}
              </div>
              {s.rule_violations && s.rule_violations.length > 0 && (
                <div style={{marginTop:'6px', display:'flex', gap:'6px', flexWrap:'wrap'}}>
                  {s.rule_violations.map(v => (
                    <span key={v} style={{
                      fontSize:'10px', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700,
                      padding:'2px 7px', borderRadius:'4px', background:'rgba(154,42,42,0.12)', color:'#9A2A2A',
                    }}>{RULE_LABEL[v] || v}</span>
                  ))}
                </div>
              )}
            </div>
            <StatusPill status={s.status}/>
            {s.status === 'pending' && (
              <div style={{display:'flex', gap:'6px'}}>
                <button onClick={() => decide(s.id, 'approved')} style={{...smallBtn, color:'#2A7A4A'}}>Approve</button>
                <button onClick={() => decide(s.id, 'denied')} style={{...smallBtn, color:'#9A2A2A'}}>Deny</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Shared ──────────────────────────────────────────────────────────
const StatusPill: React.FC<{status: string}> = ({ status }) => {
  const map: Record<string, {bg: string; fg: string}> = {
    pending:        {bg:'rgba(168,106,31,0.12)', fg:'#A86A1F'},
    approved:       {bg:'rgba(42,122,74,0.12)',  fg:'#2A7A4A'},
    auto_approved:  {bg:'rgba(42,122,74,0.12)',  fg:'#2A7A4A'},
    denied:         {bg:'rgba(154,42,42,0.12)',  fg:'#9A2A2A'},
  };
  const s = map[status] || {bg:'rgba(107,104,137,0.12)', fg: INK_SOFT};
  return (
    <span style={{
      display:'inline-block', padding:'3px 10px', borderRadius:'10px',
      background: s.bg, color: s.fg, fontSize:'11px', fontWeight:700,
      textTransform:'uppercase', letterSpacing:'0.06em',
    }}>{status.replace('_',' ')}</span>
  );
};

const DatePicker: React.FC<{value: string; onChange: (iso: string) => void; pretty: string}> = ({ value, onChange, pretty }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{position:'relative'}}>
      <button type="button" onClick={() => {
        const el = ref.current; if (!el) return;
        if (typeof (el as any).showPicker === 'function') (el as any).showPicker();
        else el.focus();
      }} style={{...navBtn, padding:'8px 14px', minWidth:'180px', fontSize:'13px', fontWeight:600, color: INK}}>
        {pretty}
      </button>
      <input ref={ref} type="date" value={value} onChange={e => e.target.value && onChange(e.target.value)}
        style={{position:'absolute', inset:0, opacity:0, pointerEvents:'none'}}/>
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
const smallBtn: React.CSSProperties = {
  background:'transparent', border:'none',
  fontSize:'12px', fontWeight:700, cursor:'pointer',
  fontFamily:'inherit', padding:'4px 8px', borderRadius:'6px',
  color: PURPLE,
};
const thStyle: React.CSSProperties = {
  textAlign:'left', padding:'10px 12px',
  fontSize:'10px', letterSpacing:'0.08em', textTransform:'uppercase',
  color: INK_SOFT, fontWeight:700, borderBottom:`1px solid ${BORDER}`,
};
const tdStyle: React.CSSProperties = {
  padding:'10px 12px', fontSize:'13px', color: INK, verticalAlign:'top',
};
const overlayStyle: React.CSSProperties = {
  position:'fixed', inset:0, background:'rgba(20,18,40,0.42)',
  display:'flex', alignItems:'center', justifyContent:'center',
  zIndex:1000, padding:'20px',
};
const modalCard: React.CSSProperties = {
  background: CARD_BG, borderRadius:'14px',
  padding:'22px 24px', maxWidth:'420px', width:'100%',
  boxShadow:'0 20px 60px rgba(20,18,40,0.25)',
  maxHeight:'90vh', overflow:'auto',
};
const labelStyle: React.CSSProperties = {
  display:'block', fontSize:'11px', letterSpacing:'0.06em',
  textTransform:'uppercase', color: INK_SOFT, fontWeight:700, marginBottom:'6px',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'8px',
  border:`1px solid ${BORDER}`, fontSize:'14px',
  fontFamily:'inherit', boxSizing:'border-box', color: INK,
  background: CARD_BG,
};
const checkboxRow: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:'7px',
  fontSize:'13px', color: INK, cursor:'pointer',
};
const rowBtn: React.CSSProperties = {
  display:'flex', justifyContent:'space-between', alignItems:'center',
  width:'100%', padding:'8px 12px', background:'transparent',
  border:'none', borderBottom:`1px solid ${BORDER}`,
  cursor:'pointer', fontFamily:'inherit', textAlign:'left', fontSize:'13px',
};

export default ScheduleMD;
