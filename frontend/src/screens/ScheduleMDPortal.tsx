// © 2026 SoulMD, LLC. All rights reserved.
//
// ScheduleMDPortal — physician-facing portal at /schedulemd/portal?token=XXX.
// Mobile-first: bottom tab bar (My Schedule / Preferences / Time Off /
// Open Shifts). All requests carry the magic-link token in the body or
// query string — no JWT, no superuser gate. Backend looks up the token
// against schedulemd_providers.magic_link_token and refuses 401 if it's
// missing or expired.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  API: string;
  token: string;     // magic-link token from URL
}

interface Provider {
  id: number;
  name: string;
  full_name: string | null;
  email: string | null;
  role: string;
  hospitals: string[];
  no_nights: boolean;
}
interface Block {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'preference_open' | 'published';
}
interface ShiftLite {
  id: number;
  name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
}
interface HospitalLite { id: number; name: string; color: string; }
interface AssignmentItem {
  id: number;
  schedule_date: string;
  shift: ShiftLite | null;
  hospital: HospitalLite | null;
  is_open: boolean;
  source: string;
}
interface TimeOffRow {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string | null;
}
interface PreferenceShape {
  block_id: number;
  preferred_days: string[];
  preferred_shift_types: string[];
  preferred_hospitals: string[];
  avoid_hospitals: string[];
}

type TabKey = 'schedule' | 'prefs' | 'timeoff' | 'open';

const NAVY     = '#1a2a4a';
const PURPLE   = '#534AB7';
const INK      = '#1F1B3A';
const INK_SOFT = '#6B6889';
const BORDER   = 'rgba(83,74,183,0.14)';
const PAGE_BG  = '#F7F7FB';
const CARD_BG  = '#FFFFFF';
const SERIF    = 'Georgia, "Times New Roman", serif';
const SANS     = '-apple-system,BlinkMacSystemFont,Inter,sans-serif';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SHIFT_TYPES = ['day','swing','night','app','backup','admin'];
const HOSPITALS = ['IMED','AV','LDS'];
const REASONS = [['vacation','Vacation'],['cme','CME'],['personal','Personal'],['other','Other']];

const SHIFT_TYPE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  day:    { label: 'DAY',    bg: '#E8F1FF', fg: '#2855A8' },
  swing:  { label: 'SWING',  bg: '#FFF1DC', fg: '#A86A1F' },
  night:  { label: 'NIGHT',  bg: '#1F1B3A', fg: '#E8E4FF' },
  app:    { label: 'APP',    bg: '#E8F8EE', fg: '#2A7A4A' },
  backup: { label: 'BACKUP', bg: '#F1ECFF', fg: '#5A4AA8' },
  admin:  { label: 'ADMIN',  bg: '#FCE9E9', fg: '#9A2A2A' },
};

const ScheduleMDPortal: React.FC<Props> = ({ API, token }) => {
  const [tab, setTab] = useState<TabKey>('schedule');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [bootErr, setBootErr] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/schedulemd/portal/me?token=${encodeURIComponent(token)}`);
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.detail || `sign-in (${r.status})`);
        }
        const d = await r.json();
        if (!alive) return;
        setProvider(d.provider || null);
        setBlocks(d.blocks || []);
        setActiveBlockId(d.current_block?.id ?? (d.blocks?.[0]?.id ?? null));
      } catch (e: any) {
        if (alive) setBootErr(e.message || 'Sign-in failed');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API, token]);

  if (loading) {
    return (
      <div style={pageBase}>
        <div style={{padding:'80px 24px', textAlign:'center', color: INK_SOFT, fontFamily: SANS}}>
          Loading your portal…
        </div>
      </div>
    );
  }
  if (bootErr || !provider) {
    return (
      <div style={pageBase}>
        <div style={{padding:'60px 24px', maxWidth:'420px', margin:'0 auto', textAlign:'center', fontFamily: SANS}}>
          <div style={{fontFamily: SERIF, fontSize:'30px', color: NAVY, marginBottom:'10px'}}>Sign-in link expired</div>
          <p style={{color: INK_SOFT, lineHeight:1.7, fontSize:'14px'}}>
            {bootErr || 'We couldn\'t verify your sign-in link.'} Ask the scheduling
            admin to send a fresh link to your email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBase}>
      <header style={{
        background: CARD_BG, borderBottom:`1px solid ${BORDER}`,
        padding:'16px clamp(14px,4vw,24px)',
        display:'flex', alignItems:'center', gap:'12px',
      }}>
        <div>
          <div style={{fontFamily: SERIF, fontSize:'22px', color: NAVY, fontWeight:400}}>ScheduleMD</div>
          <div style={{fontSize:'11px', letterSpacing:'1.6px', color: INK_SOFT, fontWeight:700, textTransform:'uppercase'}}>
            Physician Portal
          </div>
        </div>
        <div style={{flex:1}}/>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'13px', fontWeight:700, color: INK}}>{provider.full_name || provider.name}</div>
          <div style={{fontSize:'11px', color: INK_SOFT}}>{provider.role} · {(provider.hospitals || []).join(', ') || 'no hospitals'}</div>
        </div>
      </header>

      {blocks.length > 0 && (
        <div style={{padding:'10px clamp(14px,4vw,24px)', background:'rgba(255,255,255,0.6)', borderBottom:`1px solid ${BORDER}`}}>
          <select value={activeBlockId ?? ''} onChange={e => setActiveBlockId(Number(e.target.value))}
            style={{
              padding:'8px 12px', borderRadius:'8px', border:`1px solid ${BORDER}`,
              fontSize:'13px', fontWeight:600, fontFamily:'inherit', minWidth:'240px',
            }}>
            {blocks.map(b => (
              <option key={b.id} value={b.id}>{b.name} · {b.status}</option>
            ))}
          </select>
        </div>
      )}

      <main style={{flex:1, overflow:'auto', padding:'18px clamp(14px,4vw,24px)', paddingBottom:'90px'}}>
        {tab === 'schedule' && <MySchedule API={API} token={token} blockId={activeBlockId}/>}
        {tab === 'prefs' && <MyPreferences API={API} token={token} blockId={activeBlockId}/>}
        {tab === 'timeoff' && <MyTimeOff API={API} token={token} blockId={activeBlockId}/>}
        {tab === 'open' && <OpenShifts API={API} token={token} blockId={activeBlockId}/>}
      </main>

      <BottomTabs active={tab} onChange={setTab}/>
    </div>
  );
};

// ─── My Schedule ─────────────────────────────────────────────────────
const MySchedule: React.FC<{API: string; token: string; blockId: number | null}> = ({ API, token, blockId }) => {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<AssignmentItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ token });
      if (blockId != null) params.set('block_id', String(blockId));
      const r = await fetch(`${API}/api/schedulemd/portal/my-schedule?${params}`);
      if (!r.ok) throw new Error(`schedule (${r.status})`);
      const d = await r.json();
      setItems(d.assignments || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [API, token, blockId]);
  useEffect(() => { load(); }, [load]);

  const sendSwap = async (assignment_id: number, swap_type: 'direct' | 'donate', receiving_provider_id: number | null) => {
    try {
      const r = await fetch(`${API}/api/schedulemd/portal/swap-request`, {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ token, assignment_id, swap_type, receiving_provider_id }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `swap (${r.status})`);
      }
      const d = await r.json();
      if (d.status === 'auto_approved') alert('Swap auto-approved.');
      else alert('Swap submitted for admin review.');
      setActionTarget(null);
      load();
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div style={muted}>Loading your shifts…</div>;
  if (items.length === 0) return <div style={muted}>No shifts assigned in this block.</div>;

  return (
    <div style={{display:'grid', gap:'10px'}}>
      {items.map(it => {
        const badge = SHIFT_TYPE_BADGE[it.shift?.shift_type || 'day'];
        return (
          <button key={it.id} onClick={() => setActionTarget(it)} style={{
            ...cardStyle, textAlign:'left', cursor:'pointer',
            display:'flex', alignItems:'center', gap:'12px',
          }}>
            <div style={{width:'4px', alignSelf:'stretch', background: it.hospital?.color || PURPLE, borderRadius:'2px'}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:'13px', color: INK_SOFT, fontWeight:600}}>{it.schedule_date}</div>
              <div style={{fontSize:'15px', fontWeight:700, color: INK}}>{it.shift?.name || 'Shift'}</div>
              <div style={{display:'flex', alignItems:'center', gap:'6px', marginTop:'4px'}}>
                <span style={{
                  fontSize:'9px', letterSpacing:'0.08em', fontWeight:700,
                  padding:'2px 6px', borderRadius:'3px',
                  background: badge.bg, color: badge.fg,
                }}>{badge.label}</span>
                <span style={{fontSize:'12px', color: INK_SOFT}}>
                  {it.shift?.start_time}–{it.shift?.end_time} · {it.hospital?.name || '?'}
                </span>
              </div>
            </div>
            <span style={{color: INK_SOFT, fontSize:'18px'}}>›</span>
          </button>
        );
      })}
      {actionTarget && (
        <ShiftActionModal
          item={actionTarget}
          onClose={() => setActionTarget(null)}
          onSwap={() => sendSwap(actionTarget.id, 'donate', null)}
        />
      )}
    </div>
  );
};

const ShiftActionModal: React.FC<{
  item: AssignmentItem; onClose: () => void; onSwap: () => void;
}> = ({ item, onClose, onSwap }) => (
  <div style={overlayStyle} onClick={onClose}>
    <div style={modalCard} onClick={e => e.stopPropagation()}>
      <div style={{fontSize:'11px', color: PURPLE, fontWeight:800, letterSpacing:'1.2px', textTransform:'uppercase'}}>Shift</div>
      <div style={{fontFamily: SERIF, fontSize:'20px', color: INK, marginTop:'4px'}}>{item.shift?.name}</div>
      <div style={{fontSize:'13px', color: INK_SOFT, marginTop:'2px'}}>
        {item.schedule_date} · {item.shift?.start_time}–{item.shift?.end_time} · {item.hospital?.name}
      </div>
      <p style={{color: INK_SOFT, fontSize:'13px', lineHeight:1.6, margin:'14px 0'}}>
        Donating this shift releases it to the open-shifts pool, where any
        eligible provider can pick it up. The rules engine runs against the
        receiving provider — clean swaps auto-approve, conflicts flag for
        admin review.
      </p>
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'12px'}}>
        <button onClick={onClose} style={secondaryBtn}>Cancel</button>
        <button onClick={onSwap} style={primaryBtn}>Donate to pool</button>
      </div>
    </div>
  </div>
);

// ─── Preferences ─────────────────────────────────────────────────────
const MyPreferences: React.FC<{API: string; token: string; blockId: number | null}> = ({ API, token, blockId }) => {
  const [pref, setPref] = useState<PreferenceShape>({
    block_id: 0, preferred_days: [], preferred_shift_types: [],
    preferred_hospitals: [], avoid_hospitals: [],
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string>('');

  const load = useCallback(async () => {
    if (blockId == null) return;
    try {
      const r = await fetch(`${API}/api/schedulemd/portal/preferences?token=${encodeURIComponent(token)}&block_id=${blockId}`);
      if (!r.ok) return;
      const d = await r.json();
      setPref({
        block_id: blockId,
        preferred_days: d.preferred_days || [],
        preferred_shift_types: d.preferred_shift_types || [],
        preferred_hospitals: d.preferred_hospitals || [],
        avoid_hospitals: d.avoid_hospitals || [],
      });
    } catch { /* silent */ }
  }, [API, token, blockId]);
  useEffect(() => { load(); }, [load]);

  const toggle = (key: keyof PreferenceShape, value: string) => {
    setPref(p => {
      const arr = (p[key] as string[]).slice();
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1); else arr.push(value);
      return { ...p, [key]: arr };
    });
  };

  const submit = async () => {
    if (blockId == null) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/schedulemd/portal/preferences`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          token, block_id: blockId,
          preferred_days: pref.preferred_days,
          preferred_shift_types: pref.preferred_shift_types,
          preferred_hospitals: pref.preferred_hospitals,
          avoid_hospitals: pref.avoid_hospitals,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `save (${r.status})`);
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  };

  if (blockId == null) return <div style={muted}>No active block.</div>;

  const ChipGroup: React.FC<{
    label: string; options: { value: string; label: string }[];
    selected: string[]; onToggle: (v: string) => void;
  }> = ({ label, options, selected, onToggle }) => (
    <div style={{marginBottom:'18px'}}>
      <div style={{fontSize:'11px', letterSpacing:'1.2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700, marginBottom:'8px'}}>{label}</div>
      <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
        {options.map(o => {
          const on = selected.includes(o.value);
          return (
            <button key={o.value} onClick={() => onToggle(o.value)} style={{
              ...secondaryBtn, padding:'8px 14px',
              background: on ? PURPLE : CARD_BG,
              color: on ? 'white' : INK,
              borderColor: on ? PURPLE : BORDER,
            }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <ChipGroup label="Preferred days" options={DAYS.map(d => ({value:d, label:d.slice(0,3)}))}
        selected={pref.preferred_days} onToggle={v => toggle('preferred_days', v)}/>
      <ChipGroup label="Preferred shift types" options={SHIFT_TYPES.map(s => ({value:s, label:s.toUpperCase()}))}
        selected={pref.preferred_shift_types} onToggle={v => toggle('preferred_shift_types', v)}/>
      <ChipGroup label="Preferred hospitals" options={HOSPITALS.map(h => ({value:h, label:h}))}
        selected={pref.preferred_hospitals} onToggle={v => toggle('preferred_hospitals', v)}/>
      <ChipGroup label="Hospitals to avoid" options={HOSPITALS.map(h => ({value:h, label:h}))}
        selected={pref.avoid_hospitals} onToggle={v => toggle('avoid_hospitals', v)}/>
      <button onClick={submit} disabled={busy} style={{...primaryBtn, width:'100%', padding:'14px'}}>
        {busy ? 'Saving…' : 'Submit preferences'}
      </button>
      {savedAt && <div style={{textAlign:'center', color:'#2A7A4A', fontSize:'12px', fontWeight:700, marginTop:'10px'}}>Saved at {savedAt}</div>}
    </div>
  );
};

// ─── Time Off ────────────────────────────────────────────────────────
const MyTimeOff: React.FC<{API: string; token: string; blockId: number | null}> = ({ API, token, blockId }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('vacation');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<TimeOffRow[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/schedulemd/portal/time-off?token=${encodeURIComponent(token)}`);
      if (!r.ok) return;
      const d = await r.json();
      setRows(d.requests || []);
    } catch { /* silent */ }
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!start || !end) return alert('Pick a date range first.');
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/schedulemd/portal/time-off`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, block_id: blockId, start_date: start, end_date: end, reason, note }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `save (${r.status})`);
      }
      setStart(''); setEnd(''); setNote('');
      load();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{...cardStyle, padding:'18px'}}>
        <div style={{fontSize:'15px', fontWeight:700, color: INK, marginBottom:'10px'}}>Request time off</div>
        <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Start</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle}/>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>End</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle}/>
          </div>
        </div>
        <label style={labelStyle}>Reason</label>
        <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
          {REASONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label style={{...labelStyle, marginTop:'10px'}}>Note (optional)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          style={{...inputStyle, resize:'vertical'}}/>
        <button onClick={submit} disabled={busy} style={{...primaryBtn, marginTop:'14px', width:'100%', padding:'12px'}}>
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </div>

      <div style={{marginTop:'18px'}}>
        <div style={{fontSize:'11px', letterSpacing:'1.2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700, marginBottom:'8px'}}>
          Past requests
        </div>
        {rows.length === 0 && <div style={muted}>None yet.</div>}
        {rows.map(r => (
          <div key={r.id} style={{...cardStyle, marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px', fontWeight:700, color: INK}}>{r.start_date} → {r.end_date}</div>
              <div style={{fontSize:'12px', color: INK_SOFT}}>{r.reason || '—'} {r.note ? `· ${r.note}` : ''}</div>
            </div>
            <Pill status={r.status}/>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Open Shifts ─────────────────────────────────────────────────────
const OpenShifts: React.FC<{API: string; token: string; blockId: number | null}> = ({ API, token, blockId }) => {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ token });
      if (blockId != null) params.set('block_id', String(blockId));
      const r = await fetch(`${API}/api/schedulemd/portal/open-shifts?${params}`);
      if (!r.ok) throw new Error(`open (${r.status})`);
      const d = await r.json();
      setItems(d.items || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [API, token, blockId]);
  useEffect(() => { load(); }, [load]);

  const pickup = async (assignment_id: number) => {
    setBusy(assignment_id);
    try {
      const r = await fetch(`${API}/api/schedulemd/portal/pickup`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, assignment_id }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `pickup (${r.status})`);
      }
      const d = await r.json();
      if (d.status === 'auto_approved') alert('Picked up. Shift is on your schedule.');
      else alert(`Pickup pending admin review (${(d.violations || []).length} rule conflict).`);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };

  if (loading) return <div style={muted}>Loading open shifts…</div>;
  if (items.length === 0) return <div style={muted}>No open shifts available.</div>;

  return (
    <div style={{display:'grid', gap:'10px'}}>
      {items.map(it => {
        const badge = SHIFT_TYPE_BADGE[it.shift?.shift_type || 'day'];
        return (
          <div key={it.id} style={{...cardStyle, display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{width:'4px', alignSelf:'stretch', background: it.hospital?.color || PURPLE, borderRadius:'2px'}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:'13px', color: INK_SOFT, fontWeight:600}}>{it.schedule_date}</div>
              <div style={{fontSize:'15px', fontWeight:700, color: INK}}>{it.shift?.name}</div>
              <div style={{display:'flex', alignItems:'center', gap:'6px', marginTop:'4px'}}>
                <span style={{
                  fontSize:'9px', letterSpacing:'0.08em', fontWeight:700,
                  padding:'2px 6px', borderRadius:'3px',
                  background: badge.bg, color: badge.fg,
                }}>{badge.label}</span>
                <span style={{fontSize:'12px', color: INK_SOFT}}>
                  {it.shift?.start_time}–{it.shift?.end_time} · {it.hospital?.name}
                </span>
              </div>
            </div>
            <button onClick={() => pickup(it.id)} disabled={busy === it.id} style={primaryBtn}>
              {busy === it.id ? 'Picking up…' : 'Pick Up'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ─── Bottom tab bar ──────────────────────────────────────────────────
const BottomTabs: React.FC<{active: TabKey; onChange: (t: TabKey) => void}> = ({ active, onChange }) => (
  <nav style={{
    position:'fixed', bottom:0, left:0, right:0,
    background: CARD_BG, borderTop:`1px solid ${BORDER}`,
    display:'flex', justifyContent:'space-around',
    padding:'8px 6px env(safe-area-inset-bottom, 8px)',
    zIndex:50,
  }}>
    {([
      ['schedule', 'My Schedule', '🗓'],
      ['prefs',    'Preferences', '✦'],
      ['timeoff',  'Time Off',    '☂'],
      ['open',     'Open Shifts', '⚑'],
    ] as [TabKey, string, string][]).map(([k, l, ic]) => (
      <button key={k} onClick={() => onChange(k)} style={{
        background:'transparent', border:'none', cursor:'pointer',
        padding:'6px 8px', flex:1, fontFamily:'inherit',
        color: active === k ? PURPLE : INK_SOFT,
        fontWeight: active === k ? 700 : 600,
      }}>
        <div style={{fontSize:'18px', lineHeight:1}}>{ic}</div>
        <div style={{fontSize:'10px', letterSpacing:'0.04em', marginTop:'2px'}}>{l}</div>
      </button>
    ))}
  </nav>
);

const Pill: React.FC<{status: string}> = ({ status }) => {
  const map: Record<string, {bg: string; fg: string}> = {
    pending:  {bg:'rgba(168,106,31,0.12)', fg:'#A86A1F'},
    approved: {bg:'rgba(42,122,74,0.12)',  fg:'#2A7A4A'},
    denied:   {bg:'rgba(154,42,42,0.12)',  fg:'#9A2A2A'},
  };
  const s = map[status] || {bg:'rgba(107,104,137,0.12)', fg: INK_SOFT};
  return (
    <span style={{
      display:'inline-block', padding:'3px 10px', borderRadius:'10px',
      background: s.bg, color: s.fg, fontSize:'11px', fontWeight:700,
      textTransform:'uppercase', letterSpacing:'0.06em',
    }}>{status}</span>
  );
};

const pageBase: React.CSSProperties = {
  minHeight:'100vh', display:'flex', flexDirection:'column',
  background: PAGE_BG, color: INK, fontFamily: SANS,
};
const cardStyle: React.CSSProperties = {
  background: CARD_BG, borderRadius:'12px',
  border:`1px solid ${BORDER}`, padding:'14px 16px',
  boxShadow:'0 1px 3px rgba(20,18,40,0.04)',
};
const muted: React.CSSProperties = {
  padding:'40px 0', textAlign:'center', color: INK_SOFT, fontSize:'14px',
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
const secondaryBtn: React.CSSProperties = {
  background: CARD_BG, color: INK,
  border:`1px solid ${BORDER}`, borderRadius:'8px',
  padding:'8px 14px', cursor:'pointer',
  fontSize:'13px', fontWeight:600, fontFamily:'inherit',
};
const primaryBtn: React.CSSProperties = {
  background: PURPLE, color:'white',
  border:'none', borderRadius:'8px',
  padding:'10px 18px', cursor:'pointer',
  fontSize:'13px', fontWeight:700, fontFamily:'inherit',
};

export default ScheduleMDPortal;
