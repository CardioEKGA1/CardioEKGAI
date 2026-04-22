// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_email?: string;
  starts_at: string;
  duration_min: number;
  appointment_type: string;
  status: string;
  notes: string;
  created_at: string;
}

interface PatientMini { id: number; name: string; email: string; }

const APPT_TYPES: {id: string; label: string; icon: string; color: string}[] = [
  { id: 'medical_visit', label: 'Medical Visit',       icon: '🩺', color: '#3a7ad0' },
  { id: 'life_coaching', label: 'Life Coaching',       icon: '🧭', color: '#4a7ad0' },
  { id: 'guided_meditation', label: 'Guided Meditation', icon: '🧘', color: '#a070c0' },
  { id: 'telehealth',    label: 'Telehealth',          icon: '💻', color: '#4a9a7a' },
  { id: 'follow_up',     label: 'Follow-up',           icon: '🔁', color: '#6a6a6a' },
];

const STATUS_STYLES: Record<string, {bg: string; color: string; label: string}> = {
  scheduled: { bg: 'rgba(122,176,240,0.15)', color: '#4a7ad0', label: 'Scheduled' },
  completed: { bg: 'rgba(112,184,112,0.15)', color: '#2a7a2a', label: 'Completed' },
  canceled:  { bg: 'rgba(160,160,160,0.15)', color: '#808080', label: 'Canceled' },
  no_show:   { bg: 'rgba(224,140,80,0.15)',  color: '#a85020', label: 'No show' },
};

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius:'16px',
  border: '1px solid rgba(122,176,240,0.2)',
  boxShadow: '0 2px 10px rgba(100,130,200,0.1)', padding:'16px',
};

const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};

const FIELD_LABEL: React.CSSProperties = { fontSize:'11px', color:'#4a7ad0', fontWeight:600, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' };

// Simple week/month view toggle. Not a full calendar library — just a
// chronological list grouped by day for now. The doctor needs to see
// what's coming; a fancy grid calendar is next iteration.
type View = 'upcoming' | 'all';

const AppointmentsSection: React.FC<Props> = ({ API, token, accent }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientMini[]>([]);
  const [view, setView] = useState<View>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/appointments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {appointments: []}),
      fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {patients: []}),
    ]).then(([a, p]) => {
      setAppointments(a.appointments || []);
      setPatients((p.patients || []).map((x: any) => ({ id: x.id, name: x.name, email: x.email })));
    }).catch(() => setError('Could not load.'))
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (view === 'all') return appointments;
    const now = new Date();
    return appointments.filter(a => new Date(a.starts_at) >= new Date(now.getTime() - 3600000));
  }, [appointments, view]);

  // Group by date
  const grouped = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const d = new Date(a.starts_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const update = async (id: number, patch: Partial<Appointment>) => {
    try {
      const res = await fetch(`${API}/concierge/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('update failed');
      load();
    } catch {}
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await fetch(`${API}/concierge/appointments/${id}`, { method:'DELETE', headers:{Authorization:`Bearer ${token}`} });
      load();
    } catch {}
  };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Appointments</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>{appointments.length} total · {appointments.filter(a => a.status === 'scheduled').length} scheduled</div>
        </div>
        <div style={{display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap'}}>
          <div style={{display:'flex', background:'rgba(255,255,255,0.7)', borderRadius:'999px', padding:'3px', border:'1px solid rgba(122,176,240,0.3)'}}>
            <button onClick={()=>setView('upcoming')} style={{padding:'6px 14px', fontSize:'12px', fontWeight:700, borderRadius:'999px', border:'none', background: view==='upcoming' ? accent : 'transparent', color: view==='upcoming' ? 'white' : '#4a7ad0', cursor:'pointer'}}>Upcoming</button>
            <button onClick={()=>setView('all')} style={{padding:'6px 14px', fontSize:'12px', fontWeight:700, borderRadius:'999px', border:'none', background: view==='all' ? accent : 'transparent', color: view==='all' ? 'white' : '#4a7ad0', cursor:'pointer'}}>All</button>
          </div>
          <button onClick={()=>setShowCreate(true)} disabled={patients.length === 0} style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer', whiteSpace:'nowrap', opacity: patients.length === 0 ? 0.5 : 1}}>+ Schedule</button>
        </div>
      </div>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
      ) : grouped.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.4}}>📅</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>{view === 'upcoming' ? 'No upcoming appointments' : 'No appointments yet'}</div>
          <div style={{fontSize:'12px'}}>{patients.length === 0 ? 'Add a patient first, then schedule.' : 'Click Schedule to create one.'}</div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>
          {grouped.map(([dateKey, list]) => {
            const d = new Date(dateKey + 'T00:00:00');
            const isToday = new Date().toDateString() === d.toDateString();
            const dayLabel = d.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
            return (
              <div key={dateKey}>
                <div style={{fontSize:'12px', fontWeight:800, color: isToday ? '#1a2a4a' : '#4a7ad0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px', padding:'0 4px'}}>
                  {isToday && <span style={{background: accent, color:'white', padding:'2px 8px', borderRadius:'6px', marginRight:'8px', letterSpacing:0, textTransform:'none', fontSize:'10px'}}>Today</span>}
                  {dayLabel}
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                  {list.map(a => {
                    const t = APPT_TYPES.find(x => x.id === a.appointment_type) || APPT_TYPES[0];
                    const ss = STATUS_STYLES[a.status] || STATUS_STYLES.scheduled;
                    const start = new Date(a.starts_at);
                    const end = new Date(start.getTime() + a.duration_min * 60000);
                    return (
                      <div key={a.id} style={{...CARD, padding:'12px 14px', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'12px', alignItems:'center'}}>
                        <div style={{fontSize:'26px', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', background: `${t.color}18`, borderRadius:'12px'}}>{t.icon}</div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a', marginBottom:'2px'}}>
                            {a.patient_name || `Patient #${a.patient_id}`}
                            <span style={{fontSize:'11px', fontWeight:500, color: t.color, marginLeft:'8px'}}>· {t.label}</span>
                          </div>
                          <div style={{fontSize:'12px', color:'#4a5e6a'}}>
                            {start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} – {end.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} ({a.duration_min} min)
                          </div>
                          {a.notes && <div style={{fontSize:'11px', color:'#4a7ad0', marginTop:'3px', fontStyle:'italic', whiteSpace:'pre-wrap'}}>{a.notes}</div>}
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end'}}>
                          <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background: ss.bg, color: ss.color, fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase', whiteSpace:'nowrap'}}>{ss.label}</span>
                          {a.status === 'scheduled' && (
                            <div style={{display:'flex', gap:'4px', marginTop:'4px'}}>
                              <button onClick={()=>update(a.id, {status:'completed'} as any)} title="Mark completed" style={{background:'rgba(112,184,112,0.15)', border:'none', borderRadius:'6px', padding:'3px 7px', fontSize:'10px', color:'#2a7a2a', cursor:'pointer', fontWeight:700}}>✓</button>
                              <button onClick={()=>update(a.id, {status:'canceled'} as any)} title="Cancel" style={{background:'rgba(160,160,160,0.15)', border:'none', borderRadius:'6px', padding:'3px 7px', fontSize:'10px', color:'#808080', cursor:'pointer', fontWeight:700}}>✕</button>
                              <button onClick={()=>remove(a.id)} title="Delete" style={{background:'rgba(224,80,80,0.1)', border:'none', borderRadius:'6px', padding:'3px 7px', fontSize:'10px', color:'#c04040', cursor:'pointer', fontWeight:700}}>🗑</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateAppointmentModal API={API} token={token} accent={accent} patients={patients} onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false); load();}}/>}

      <div style={{...CARD, marginTop:'16px', fontSize:'11px', color:'#4a7ad0', textAlign:'center', padding:'10px'}}>
        Calendar integration (Google Calendar / Calendly) coming soon — for now, create appointments manually here.
      </div>
    </div>
  );
};

const CreateAppointmentModal: React.FC<{API:string; token:string; accent:string; patients:PatientMini[]; onClose:()=>void; onCreated:()=>void}> = ({API, token, accent, patients, onClose, onCreated}) => {
  const [patientId, setPatientId] = useState<number>(patients[0]?.id || 0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState('medical_visit');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!patientId || !date || !time) { setError('Patient, date, and time are required.'); return; }
    const starts = new Date(`${date}T${time}`);
    if (isNaN(starts.getTime())) { setError('Invalid date/time.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/appointments`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({
          patient_id: patientId,
          starts_at: starts.toISOString(),
          duration_min: duration,
          appointment_type: type,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not save');
      onCreated();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px', overflowY:'auto', zIndex:1500}}>
      <div style={{background:'white', borderRadius:'20px', padding:'24px', maxWidth:'520px', width:'100%', boxShadow:'0 20px 60px rgba(26,42,74,0.3)', margin:'20px 0'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px'}}>
          <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a'}}>Schedule appointment</div>
          <button onClick={onClose} style={{background:'transparent', border:'none', fontSize:'20px', color:'#4a7ad0', cursor:'pointer'}}>×</button>
        </div>

        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Patient *</div>
          <select value={patientId} onChange={e=>setPatientId(Number(e.target.value))} style={{...INPUT, appearance:'auto'}}>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px'}}>
          <div>
            <div style={FIELD_LABEL}>Date *</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={INPUT}/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Time *</div>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={INPUT}/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Duration</div>
            <select value={duration} onChange={e=>setDuration(Number(e.target.value))} style={{...INPUT, appearance:'auto'}}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Type *</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'6px'}}>
            {APPT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={()=>setType(t.id)}
                style={{
                  padding:'8px', borderRadius:'10px', fontSize:'11px', fontWeight:700, cursor:'pointer',
                  border: type === t.id ? `1px solid ${t.color}` : '1px solid rgba(122,176,240,0.3)',
                  background: type === t.id ? `${t.color}18` : 'rgba(240,246,255,0.4)',
                  color: type === t.id ? t.color : '#4a5e6a',
                  display:'flex', alignItems:'center', gap:'6px', justifyContent:'center',
                }}
              >
                <span style={{fontSize:'14px'}}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:'14px'}}>
          <div style={FIELD_LABEL}>Notes</div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Agenda, prep notes, what to bring, etc." style={{...INPUT, minHeight:'80px', resize:'vertical'}}/>
        </div>

        {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>{error}</div>}

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
          <button onClick={onClose} disabled={saving} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px 18px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving || !date || !time} style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 20px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer', opacity:(saving||!date||!time)?0.6:1}}>
            {saving ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsSection;
