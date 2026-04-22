// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface PatientRow {
  patient_id: number;
  name: string;
  email: string;
  total_habits: number;
  active_habits: number;
  avg_compliance_7d_pct: number;
}

interface StripCell { date: string; status: 'done' | 'partial' | 'skipped' | null; }

interface Habit {
  id: number;
  patient_id: number;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  target: string;
  active: boolean;
  strip_14d: StripCell[];
  streak: number;
  compliance_7d_pct: number;
  last_checkin_at: string | null;
  total_checkins: number;
  created_at: string | null;
}

interface PatientMini { id: number; name: string; email: string; }

const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', borderRadius:'16px',
  border:'1px solid rgba(122,176,240,0.2)',
  boxShadow:'0 2px 10px rgba(100,130,200,0.1)',
  padding:'16px',
};
const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};
const FIELD_LABEL: React.CSSProperties = { fontSize:'11px', color:'#4a7ad0', fontWeight:600, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' };

const STATUS_COLOR: Record<string, string> = {
  done:    '#5cb87a',
  partial: '#e8a840',
  skipped: '#d86a6a',
};
const STATUS_LABEL: Record<string, string> = { done: 'Done', partial: 'Partial', skipped: 'Skipped' };

const complianceTone = (pct: number): {bg: string; color: string} => {
  if (pct >= 75) return { bg: 'rgba(92,184,122,0.15)', color: '#2a7a2a' };
  if (pct >= 40) return { bg: 'rgba(232,168,64,0.18)',  color: '#a06810' };
  return { bg: 'rgba(216,106,106,0.15)', color: '#a02020' };
};

const shortDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';

const HabitsSection: React.FC<Props> = ({ API, token, accent }) => {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [patients, setPatients] = useState<PatientMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState<{patientId: number | null} | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/habits`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { patients: [] }),
      fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { patients: [] }),
    ]).then(([habits, pts]) => {
      setRows(habits.patients || []);
      setPatients((pts.patients || []).map((x: any) => ({ id: x.id, name: x.name, email: x.email })));
    }).catch(() => setError('Could not load habits.'))
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const total_habits = rows.reduce((s, r) => s + r.total_habits, 0);
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.avg_compliance_7d_pct, 0) / rows.length) : 0;
    return { patients: rows.length, total_habits, avg };
  }, [rows]);

  if (selected != null) {
    return <PatientHabitsView API={API} token={token} accent={accent} patientId={selected} onClose={() => { setSelected(null); load(); }} onCreate={() => setShowCreate({patientId: selected})} />;
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Habits</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>
            {totals.patients} patient{totals.patients === 1 ? '' : 's'} · {totals.total_habits} habit{totals.total_habits === 1 ? '' : 's'} tracked · {totals.avg}% 7-day avg
          </div>
        </div>
        <button onClick={() => setShowCreate({patientId: null})}
          style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer'}}>
          + New habit
        </button>
      </div>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.4}}>🌱</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>No habits assigned yet</div>
          <div style={{fontSize:'12px', marginBottom:'14px'}}>Assign habits to patients from their profile — or click below to start.</div>
          <button onClick={() => setShowCreate({patientId: null})}
            style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 18px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer'}}>
            Assign a habit
          </button>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px'}}>
          {rows.map(r => {
            const tone = complianceTone(r.avg_compliance_7d_pct);
            return (
              <button key={r.patient_id} onClick={() => setSelected(r.patient_id)}
                style={{...CARD, textAlign:'left', cursor:'pointer', fontFamily:'inherit', padding:'14px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'10px'}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.name}</div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.email}</div>
                  </div>
                  <span style={{fontSize:'11px', fontWeight:700, padding:'3px 9px', borderRadius:'999px', background: tone.bg, color: tone.color, whiteSpace:'nowrap'}}>{r.avg_compliance_7d_pct}%</span>
                </div>
                <div style={{display:'flex', gap:'14px', fontSize:'11px', color:'#4a7ad0'}}>
                  <div><strong style={{color:'#1a2a4a', fontSize:'13px'}}>{r.active_habits}</strong> active</div>
                  <div style={{color:'#8aa0c0'}}>·</div>
                  <div><strong style={{color:'#1a2a4a', fontSize:'13px'}}>{r.total_habits}</strong> total</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateHabitModal
          API={API} token={token} accent={accent}
          patients={patients}
          initialPatientId={showCreate.patientId}
          onClose={() => setShowCreate(null)}
          onCreated={() => { setShowCreate(null); load(); }}
        />
      )}
    </div>
  );
};

// ───── Per-patient detail view ─────────────────────────────────────────────

const PatientHabitsView: React.FC<{API:string; token:string; accent:string; patientId:number; onClose:()=>void; onCreate:()=>void}> = ({ API, token, accent, patientId, onClose, onCreate }) => {
  const [data, setData] = useState<{patient: PatientMini; habits: Habit[]} | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ok:boolean; text:string} | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/patients/${patientId}/habits`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setBanner({ok:false, text:'Could not load habits.'}))
      .finally(() => setLoading(false));
  }, [API, token, patientId]);

  useEffect(() => { load(); }, [load]);

  const checkin = async (habitId: number, status: 'done' | 'partial' | 'skipped') => {
    const key = `${habitId}:${status}`;
    setBusy(key); setBanner(null);
    try {
      const res = await fetch(`${API}/concierge/habits/${habitId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Check-in failed'); }
      const updated: Habit = await res.json();
      setData(prev => prev ? { ...prev, habits: prev.habits.map(h => h.id === habitId ? updated : h) } : prev);
      setBanner({ok:true, text:`Logged ${STATUS_LABEL[status].toLowerCase()} for ${updated.title}.`});
    } catch (e: any) { setBanner({ok:false, text: e.message}); }
    finally { setBusy(null); }
  };

  const archive = async (habitId: number, current: boolean) => {
    setBusy(`${habitId}:archive`); setBanner(null);
    try {
      const res = await fetch(`${API}/concierge/habits/${habitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !current }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated: Habit = await res.json();
      setData(prev => prev ? { ...prev, habits: prev.habits.map(h => h.id === habitId ? updated : h) } : prev);
    } catch (e: any) { setBanner({ok:false, text: e.message}); }
    finally { setBusy(null); }
  };

  const remove = async (habitId: number, title: string) => {
    if (!window.confirm(`Delete "${title}" and all its check-ins? This can't be undone.`)) return;
    setBusy(`${habitId}:delete`); setBanner(null);
    try {
      const res = await fetch(`${API}/concierge/habits/${habitId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setData(prev => prev ? { ...prev, habits: prev.habits.filter(h => h.id !== habitId) } : prev);
      setBanner({ok:true, text:'Habit deleted.'});
    } catch (e: any) { setBanner({ok:false, text: e.message}); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px', marginBottom:'14px'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>← All habits</button>
        <button onClick={onCreate} style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer'}}>+ New habit for this patient</button>
      </div>

      {data && (
        <div style={{...CARD, marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px'}}>
          <div>
            <div style={{fontSize:'11px', color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:700}}>Patient</div>
            <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a'}}>{data.patient.name}</div>
            <div style={{fontSize:'12px', color:'#6a8ab0'}}>{data.patient.email}</div>
          </div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>{data.habits.length} habit{data.habits.length === 1 ? '' : 's'}</div>
        </div>
      )}

      {banner && (
        <div style={{padding:'10px 12px', borderRadius:'10px', fontSize:'12px', marginBottom:'12px',
          background: banner.ok ? 'rgba(112,184,112,0.1)' : 'rgba(224,80,80,0.08)',
          color: banner.ok ? '#2a7a2a' : '#a02020',
          border: `1px solid ${banner.ok ? 'rgba(112,184,112,0.3)' : 'rgba(224,80,80,0.3)'}`}}>
          {banner.text}
        </div>
      )}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
      ) : !data || data.habits.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.4}}>🌱</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>No habits yet</div>
          <div style={{fontSize:'12px'}}>Click "+ New habit for this patient" to assign one.</div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          {data.habits.map(h => <HabitCard key={h.id} habit={h} busy={busy} onCheckin={checkin} onArchive={archive} onDelete={remove} accent={accent}/>)}
        </div>
      )}
    </div>
  );
};

// ───── Habit card with strip + check-in row ────────────────────────────────

const HabitCard: React.FC<{habit: Habit; busy: string | null; onCheckin: (id:number, status:'done'|'partial'|'skipped')=>void; onArchive:(id:number, current:boolean)=>void; onDelete:(id:number, title:string)=>void; accent: string}> = ({ habit, busy, onCheckin, onArchive, onDelete, accent }) => {
  const tone = complianceTone(habit.compliance_7d_pct);
  return (
    <div style={{...CARD, opacity: habit.active ? 1 : 0.6}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'8px', flexWrap:'wrap'}}>
        <div style={{minWidth:0, flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px'}}>
            <div style={{fontSize:'15px', fontWeight:800, color:'#1a2a4a'}}>{habit.title}</div>
            {!habit.active && <span style={{fontSize:'10px', fontWeight:700, background:'rgba(160,160,160,0.15)', color:'#808080', padding:'2px 8px', borderRadius:'999px', textTransform:'uppercase', letterSpacing:'0.5px'}}>Archived</span>}
            <span style={{fontSize:'10px', fontWeight:700, background:'rgba(122,176,240,0.15)', color:'#4a7ad0', padding:'2px 8px', borderRadius:'999px', textTransform:'uppercase', letterSpacing:'0.5px'}}>{habit.frequency}</span>
            {habit.target && <span style={{fontSize:'10px', fontWeight:700, background:'rgba(155,143,232,0.15)', color:'#6a60b0', padding:'2px 8px', borderRadius:'999px'}}>{habit.target}</span>}
          </div>
          {habit.description && <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.5}}>{habit.description}</div>}
        </div>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'10px', color:'#8aa0c0', letterSpacing:'0.4px', textTransform:'uppercase', fontWeight:700}}>7-day</div>
            <div style={{fontSize:'13px', fontWeight:800, padding:'2px 10px', borderRadius:'999px', background: tone.bg, color: tone.color}}>{habit.compliance_7d_pct}%</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'10px', color:'#8aa0c0', letterSpacing:'0.4px', textTransform:'uppercase', fontWeight:700}}>Streak</div>
            <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a'}}>🔥 {habit.streak}</div>
          </div>
        </div>
      </div>

      {/* 14-day strip */}
      <div style={{display:'flex', gap:'4px', marginTop:'10px', marginBottom:'12px'}}>
        {habit.strip_14d.map((cell, i) => {
          const bg = cell.status ? STATUS_COLOR[cell.status] : 'rgba(122,176,240,0.12)';
          const border = cell.status ? 'none' : '1px dashed rgba(122,176,240,0.3)';
          const label = cell.status ? `${new Date(cell.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})} — ${STATUS_LABEL[cell.status]}` : `${new Date(cell.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})} — no log`;
          return <div key={i} title={label} style={{flex:1, aspectRatio:'1', minHeight:'20px', maxHeight:'28px', borderRadius:'5px', background: bg, border}}/>;
        })}
      </div>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#8aa0c0', marginBottom:'14px'}}>
        <span>14 days ago</span>
        <span>Today</span>
      </div>

      {/* Quick check-in row */}
      {habit.active && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginBottom:'10px'}}>
          {(['done','partial','skipped'] as const).map(st => (
            <button key={st} onClick={() => onCheckin(habit.id, st)} disabled={busy === `${habit.id}:${st}`}
              style={{
                padding:'10px', borderRadius:'10px', fontSize:'12px', fontWeight:700,
                border:`1px solid ${STATUS_COLOR[st]}`, color: STATUS_COLOR[st],
                background: 'rgba(255,255,255,0.85)', cursor:'pointer',
                opacity: busy === `${habit.id}:${st}` ? 0.5 : 1,
              }}>
              {busy === `${habit.id}:${st}` ? '…' : `${STATUS_LABEL[st]} today`}
            </button>
          ))}
        </div>
      )}

      {/* Metadata + menu */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', color:'#8aa0c0', flexWrap:'wrap', gap:'8px', borderTop:'1px solid rgba(122,176,240,0.12)', paddingTop:'10px'}}>
        <div>{habit.total_checkins} check-in{habit.total_checkins === 1 ? '' : 's'} · last {shortDate(habit.last_checkin_at)}</div>
        <div style={{display:'flex', gap:'6px'}}>
          <button onClick={() => onArchive(habit.id, habit.active)}
            style={{background:'transparent', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>
            {habit.active ? 'Archive' : 'Reactivate'}
          </button>
          <button onClick={() => onDelete(habit.id, habit.title)}
            style={{background:'transparent', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:700, color:'#c04040', cursor:'pointer'}}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ───── Create modal ────────────────────────────────────────────────────────

const CreateHabitModal: React.FC<{API:string; token:string; accent:string; patients: PatientMini[]; initialPatientId: number | null; onClose:()=>void; onCreated:()=>void}> = ({ API, token, accent, patients, initialPatientId, onClose, onCreated }) => {
  const [patientId, setPatientId] = useState<number | ''>(initialPatientId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!patientId) { setError('Pick a patient.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/habits`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId, title: title.trim(), description: description.trim(), frequency, target: target.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Create failed'); }
      onCreated();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose}
      style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px'}}>
      <div onClick={e => e.stopPropagation()}
        style={{background:'white', borderRadius:'20px', padding:'24px', width:'100%', maxWidth:'460px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a', marginBottom:'4px'}}>New habit</div>
        <div style={{fontSize:'12px', color:'#6a8ab0', marginBottom:'16px'}}>Assign a habit to a concierge patient. Check-ins are recorded during visits or over messages.</div>

        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Patient</div>
          <select value={patientId} onChange={e => setPatientId(e.target.value ? parseInt(e.target.value) : '')}
            style={{...INPUT, appearance:'auto'}}>
            <option value="">— Select patient —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Title</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning meditation, 10k steps, No screens after 9pm" style={INPUT}/>
        </div>

        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Description (optional)</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Why it matters, how to do it, context…"
            style={{...INPUT, minHeight:'70px', resize:'vertical'}}/>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px'}}>
          <div>
            <div style={FIELD_LABEL}>Frequency</div>
            <select value={frequency} onChange={e => setFrequency(e.target.value as 'daily'|'weekly')} style={{...INPUT, appearance:'auto'}}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <div style={FIELD_LABEL}>Target (optional)</div>
            <input value={target} onChange={e => setTarget(e.target.value)} placeholder="10k, 10 min, 5x/wk…" style={INPUT}/>
          </div>
        </div>

        {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{background:accent, border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer', opacity: saving ? 0.6 : 1}}>
            {saving ? 'Creating…' : 'Create habit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitsSection;
