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
  { id: 'medical_visit', label: 'Visit',                icon: '🩺', color: '#3a7ad0' },
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
      {/* Incoming patient session requests — pending + counter-proposed.
          Prepended above the historical manual-appointment UI so the
          owner sees what needs a response first. */}
      <IncomingRequestsPanel API={API} token={token} accent={accent} onChanged={load}/>

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

// ───── Incoming Requests panel + Confirm/Propose/Draft modals ──────

interface ReqPatient { id: number; name: string; email: string; membership_tier: string | null; }
interface IncomingRequest {
  id: number; status: string; created_at: string;
  preferred_times: string[]; patient_note: string;
  physician_response_note: string;
  counter_proposed_time: string | null;
  confirmed_appointment_id: number | null;
  zoom_join_url: string | null;
  session_type: { id: number; slug: string; name: string; duration_minutes: number } | null;
  patient?: ReqPatient;
}

const IncomingRequestsPanel: React.FC<{API:string; token:string; accent:string; onChanged:()=>void}> = ({ API, token, accent, onChanged }) => {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<IncomingRequest | null>(null);
  const [proposing, setProposing] = useState<IncomingRequest | null>(null);
  const [drafting, setDrafting] = useState<IncomingRequest | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/session-requests?status=pending`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { session_requests: [] })
      .then(d => setRequests(d.session_requests || []))
      .finally(() => setLoading(false));
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  const decline = async (r: IncomingRequest) => {
    if (!window.confirm(`Decline ${r.patient?.name || 'this'} request?`)) return;
    setActingId(r.id);
    try {
      await fetch(`${API}/concierge/session-requests/${r.id}/decline`, { method:'POST', headers:{Authorization:`Bearer ${token}`} });
      load(); onChanged();
    } finally { setActingId(null); }
  };

  return (
    <div style={{marginBottom:'24px'}}>
      <div style={{display:'flex', alignItems:'baseline', gap:'10px', marginBottom:'10px'}}>
        <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a', letterSpacing:'0.6px', textTransform:'uppercase'}}>Incoming requests</div>
        <div style={{fontSize:'11.5px', color:'#7090a8'}}>· {requests.length}</div>
      </div>
      {loading ? (
        <div style={{...CARD, padding:'18px', textAlign:'center', fontSize:'12.5px', color:'#7090a8'}}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{...CARD, padding:'18px', textAlign:'center', fontSize:'12.5px', color:'#7090a8', fontStyle:'italic'}}>
          No pending session requests right now.
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'10px'}}>
          {requests.map(r => {
            const tier = (r.patient?.membership_tier || '').toLowerCase();
            const tierColor = tier === 'ascend' ? '#C9A84C' : tier === 'align' ? '#534AB7' : '#7ab0f0';
            const busy = actingId === r.id;
            return (
              <div key={r.id} style={{...CARD, background:'linear-gradient(180deg, rgba(255,250,236,0.85), rgba(255,255,255,0.85))', borderColor:'rgba(201,168,76,0.45)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'6px', flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a'}}>{r.patient?.name || '—'}</div>
                    <div style={{fontSize:'11px', color:'#4a5e6a', marginTop:'2px'}}>{r.session_type?.name} · {r.session_type?.duration_minutes} min</div>
                  </div>
                  {r.patient?.membership_tier && (
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background:`${tierColor}1a`, color:tierColor, fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase', whiteSpace:'nowrap'}}>{r.patient.membership_tier}</span>
                  )}
                </div>
                <div style={{fontSize:'11.5px', color:'#1a2a4a', opacity:0.85, marginTop:'8px', lineHeight:1.55}}>
                  <div style={{fontWeight:700, fontSize:'10.5px', textTransform:'uppercase', letterSpacing:'1px', color:'#4a7ad0', marginBottom:'2px'}}>Preferred times</div>
                  {(r.preferred_times || []).map((t, i) => (
                    <div key={i}>· {new Date(t).toLocaleString(undefined, {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}</div>
                  ))}
                </div>
                {r.patient_note && (
                  <div style={{marginTop:'10px', padding:'10px 12px', background:'rgba(83,74,183,0.06)', borderRadius:'10px', fontSize:'12px', fontStyle:'italic', color:'#1a2a4a', lineHeight:1.55}}>
                    "{r.patient_note}"
                  </div>
                )}
                <div style={{display:'flex', gap:'6px', marginTop:'12px', flexWrap:'wrap'}}>
                  <button disabled={busy} onClick={()=>setConfirming(r)} style={{background:'#C9A84C', border:'none', color:'white', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:800, cursor: busy ? 'wait' : 'pointer', boxShadow:'0 4px 12px rgba(201,168,76,0.28)'}}>Confirm</button>
                  <button disabled={busy} onClick={()=>setProposing(r)} style={{background:'transparent', border:'1px solid rgba(83,74,183,0.4)', color:'#534AB7', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:700, cursor: busy ? 'wait' : 'pointer'}}>Propose alt</button>
                  <button disabled={busy} onClick={()=>setDrafting(r)} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.4)', color:'#4a7ad0', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:700, cursor: busy ? 'wait' : 'pointer'}}>✦ Draft</button>
                  <button disabled={busy} onClick={()=>decline(r)} style={{background:'transparent', border:'1px solid rgba(192,64,64,0.35)', color:'#c04040', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', fontWeight:700, cursor: busy ? 'wait' : 'pointer'}}>Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirming && (
        <ConfirmRequestModal
          API={API} token={token}
          request={confirming}
          onClose={()=>setConfirming(null)}
          onDone={()=>{ setConfirming(null); load(); onChanged(); }}
        />
      )}
      {proposing && (
        <ProposeAltModal
          API={API} token={token}
          request={proposing}
          onClose={()=>setProposing(null)}
          onDone={()=>{ setProposing(null); load(); }}
        />
      )}
      {drafting && (
        <AiDraftModal
          API={API} token={token}
          request={drafting}
          onClose={()=>setDrafting(null)}
        />
      )}
    </div>
  );
};

const ConfirmRequestModal: React.FC<{
  API:string; token:string;
  request: IncomingRequest;
  onClose:()=>void;
  onDone:()=>void;
}> = ({ API, token, request, onClose, onDone }) => {
  const [chosen, setChosen] = useState<string>(request.preferred_times[0] || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge/session-requests/${request.id}/confirm`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ chosen_time: chosen }),
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.detail || 'Confirm failed');
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };
  return (
    <ModalShell onClose={onClose} title="Confirm session" subtitle={`${request.patient?.name} · ${request.session_type?.name}`}>
      <div style={{fontSize:'12px', color:'#4a7ad0', fontWeight:700, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px'}}>Pick which time works</div>
      <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px'}}>
        {request.preferred_times.map((t, i) => (
          <label key={i} style={{display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'10px', background: chosen === t ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.7)', border: chosen === t ? '1px solid #C9A84C' : '1px solid rgba(122,176,240,0.25)', cursor:'pointer'}}>
            <input type="radio" checked={chosen === t} onChange={()=>setChosen(t)} style={{accentColor:'#C9A84C'}}/>
            <span style={{fontSize:'13px', color:'#1a2a4a'}}>{new Date(t).toLocaleString(undefined, {weekday:'long', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}</span>
          </label>
        ))}
      </div>
      <div style={{fontSize:'11.5px', color:'#7090a8', marginBottom:'14px', fontStyle:'italic'}}>
        On confirm: a Zoom for Healthcare meeting is auto-created and a confirmation email with the join link is sent to {request.patient?.email}.
      </div>
      {err && <div style={{color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>{err}</div>}
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
        <button onClick={onClose} disabled={submitting} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
        <button onClick={submit} disabled={submitting || !chosen} style={{background:'#C9A84C', border:'none', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', fontWeight:800, color:'white', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1}}>
          {submitting ? 'Confirming…' : 'Confirm + Create Zoom'}
        </button>
      </div>
    </ModalShell>
  );
};

const ProposeAltModal: React.FC<{
  API:string; token:string;
  request: IncomingRequest;
  onClose:()=>void;
  onDone:()=>void;
}> = ({ API, token, request, onClose, onDone }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setErr('');
    if (!date || !time) { setErr('Pick a date and time.'); return; }
    let iso;
    try { iso = new Date(`${date}T${time}:00`).toISOString(); }
    catch { setErr('Invalid date/time.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge/session-requests/${request.id}/propose`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ proposed_time: iso, note }),
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.detail || 'Propose failed');
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  };
  return (
    <ModalShell onClose={onClose} title="Propose alternative time" subtitle={`${request.patient?.name} · ${request.session_type?.name}`}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px'}}>
        <div>
          <div style={FIELD_LABEL}>Date</div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={INPUT}/>
        </div>
        <div>
          <div style={FIELD_LABEL}>Time</div>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={INPUT}/>
        </div>
      </div>
      <div style={{marginBottom:'12px'}}>
        <div style={FIELD_LABEL}>Note to patient (optional)</div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{...INPUT, resize:'vertical', minHeight:'70px', fontFamily:'inherit'}}/>
      </div>
      {err && <div style={{color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>{err}</div>}
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
        <button onClick={onClose} disabled={submitting} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
        <button onClick={submit} disabled={submitting} style={{background:'#534AB7', border:'none', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', fontWeight:800, color:'white', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1}}>
          {submitting ? 'Sending…' : 'Send counter-proposal'}
        </button>
      </div>
    </ModalShell>
  );
};

const AiDraftModal: React.FC<{
  API:string; token:string;
  request: IncomingRequest;
  onClose:()=>void;
}> = ({ API, token, request, onClose }) => {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch(`${API}/concierge/session-requests/${request.id}/draft-response`, {
      method:'POST', headers:{ Authorization:`Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setDraft(d.draft || ''))
      .catch(async r => { try { const d = await (r as any).json(); setErr(d.detail || 'Draft failed'); } catch { setErr('Draft failed'); } })
      .finally(() => setLoading(false));
  }, [API, token, request.id]);
  const copy = () => {
    try { navigator.clipboard.writeText(draft); alert('Copied to clipboard'); } catch {}
  };
  return (
    <ModalShell onClose={onClose} title="✦ AI Draft Response" subtitle={`${request.patient?.name} · ${request.session_type?.name}`}>
      {loading ? (
        <div style={{padding:'24px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Drafting in Dr. Anderson's voice…</div>
      ) : err ? (
        <div style={{color:'#a02020', fontSize:'13px'}}>{err}</div>
      ) : (
        <>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={10} style={{...INPUT, resize:'vertical', minHeight:'200px', fontFamily:'Georgia, serif', lineHeight:1.6, fontSize:'13.5px'}}/>
          <div style={{fontSize:'11px', color:'#7090a8', marginTop:'6px', fontStyle:'italic'}}>
            Edit as needed, then copy & send via your preferred channel. (No automatic send — you stay in the loop.)
          </div>
        </>
      )}
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'14px'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Close</button>
        {!loading && !err && <button onClick={copy} style={{background:'#534AB7', border:'none', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', fontWeight:800, color:'white', cursor:'pointer'}}>Copy draft</button>}
      </div>
    </ModalShell>
  );
};

const ModalShell: React.FC<{title:string; subtitle?:string; onClose:()=>void; children:React.ReactNode}> = ({ title, subtitle, onClose, children }) => (
  <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
    <div style={{background:'white', borderRadius:'18px', padding:'24px', maxWidth:'520px', width:'100%', boxShadow:'0 16px 50px rgba(26,42,74,0.3)', maxHeight:'92vh', overflowY:'auto'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', gap:'10px'}}>
        <div>
          <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a'}}>{title}</div>
          {subtitle && <div style={{fontSize:'12px', color:'#4a7ad0', marginTop:'2px'}}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{background:'transparent', border:'none', fontSize:'20px', color:'#4a7ad0', cursor:'pointer', padding:0, lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

export default AppointmentsSection;
