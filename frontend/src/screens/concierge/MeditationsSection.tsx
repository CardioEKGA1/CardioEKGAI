// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface Meditation {
  id: number; title: string; category: string;
  description: string; duration_min: number;
  script: string; audio_url: string;
  assignment_count: number;
  created_at: string | null;
}
interface Assignment {
  id: number; assigned_at: string | null;
  patient_id: number; patient_name: string;
  meditation_id: number; meditation_title: string;
  category: string | null;
}
interface PatientMini { id: number; name: string; email: string; }

const CATEGORIES: {id: string; label: string; color: string; icon: string}[] = [
  { id: 'breathwork',     label: 'Breathwork',     color: '#2ABFBF', icon: '🌬️' },
  { id: 'body_scan',      label: 'Body Scan',      color: '#4a7ad0', icon: '🧘' },
  { id: 'visualization',  label: 'Visualization',  color: '#9E7BD4', icon: '✨' },
  { id: 'energy_healing', label: 'Energy Healing', color: '#d4a86b', icon: '💫' },
  { id: 'sleep',          label: 'Sleep',          color: '#6b4e7c', icon: '🌙' },
  { id: 'stress',         label: 'Stress Release', color: '#E890B0', icon: '🕊️' },
];

const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', borderRadius:'16px',
  border:'1px solid rgba(122,176,240,0.2)',
  boxShadow:'0 2px 10px rgba(100,130,200,0.1)', padding:'16px',
};
const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};
const FIELD_LABEL: React.CSSProperties = { fontSize:'11px', color:'#4a7ad0', fontWeight:600, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' };

const MeditationsSection: React.FC<Props> = ({ API, token, accent }) => {
  const [view, setView] = useState<'library' | 'assignments'>('library');
  const [meds, setMeds] = useState<Meditation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [patients, setPatients] = useState<PatientMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Meditation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [banner, setBanner] = useState<{ok: boolean; text: string} | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/meditations`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { meditations: [] }),
      fetch(`${API}/concierge/meditations/assignments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { assignments: [] }),
      fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { patients: [] }),
    ]).then(([m, a, p]) => {
      setMeds(m.meditations || []);
      setAssignments(a.assignments || []);
      setPatients((p.patients || []).map((x: any) => ({ id: x.id, name: x.name, email: x.email })));
    }).catch(() => setError('Could not load meditations.'))
      .finally(() => setLoading(false));
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => categoryFilter ? meds.filter(m => m.category === categoryFilter) : meds, [meds, categoryFilter]);

  const remove = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}" and all its assignments?`)) return;
    const res = await fetch(`${API}/concierge/meditations/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
    if (res.ok) { setBanner({ok:true, text:'Meditation deleted.'}); load(); }
  };

  const totals = useMemo(() => ({
    library: meds.length,
    assigned: assignments.length,
    categories: new Set(meds.map(m => m.category)).size,
  }), [meds, assignments]);

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Meditations</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>
            {totals.library} in library · {totals.assigned} sent · {totals.categories} categor{totals.categories === 1 ? 'y' : 'ies'}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer'}}>
          + New meditation
        </button>
      </div>

      {banner && <div style={{padding:'10px 12px', borderRadius:'10px', fontSize:'12px', marginBottom:'12px', background: banner.ok ? 'rgba(112,184,112,0.1)' : 'rgba(224,80,80,0.08)', color: banner.ok ? '#2a7a2a' : '#a02020'}}>{banner.text}</div>}

      {/* View toggle */}
      <div style={{display:'flex', gap:'6px', marginBottom:'14px'}}>
        {(['library', 'assignments'] as const).map(v => {
          const active = view === v;
          return (
            <button key={v} onClick={() => setView(v)}
              style={{
                flex:1, padding:'9px 14px', borderRadius:'999px', fontSize:'12px',
                fontWeight: active ? 700 : 600,
                border: active ? 'none' : '1px solid rgba(122,176,240,0.3)',
                background: active ? accent : 'rgba(255,255,255,0.7)',
                color: active ? 'white' : '#4a7ad0',
                cursor:'pointer', fontFamily:'inherit',
              }}>
              {v === 'library' ? `Library (${meds.length})` : `Recent assignments (${assignments.length})`}
            </button>
          );
        })}
      </div>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {view === 'library' ? (
        <>
          {/* Category filter */}
          <div style={{display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'6px', marginBottom:'12px'}}>
            <button onClick={() => setCategoryFilter('')}
              style={{flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: !categoryFilter ? 800 : 600, border: !categoryFilter ? '1px solid rgba(122,176,240,0.5)' : '1px solid rgba(122,176,240,0.18)', background: !categoryFilter ? 'rgba(122,176,240,0.15)' : 'rgba(255,255,255,0.7)', color:'#1a2a4a', cursor:'pointer', fontFamily:'inherit'}}>
              All
            </button>
            {CATEGORIES.map(c => {
              const active = categoryFilter === c.id;
              return (
                <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                  style={{flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: active ? 800 : 600, border: active ? `1px solid ${c.color}` : '1px solid rgba(122,176,240,0.18)', background: active ? `${c.color}1a` : 'rgba(255,255,255,0.7)', color: active ? c.color : '#1a2a4a', cursor:'pointer', fontFamily:'inherit'}}>
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
              <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.5}}>🧘</div>
              <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>No meditations yet</div>
              <div style={{fontSize:'12px'}}>Create your first meditation to build the library.</div>
            </div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px'}}>
              {filtered.map(m => {
                const cat = CATEGORIES.find(c => c.id === m.category);
                return (
                  <div key={m.id} style={{...CARD, display:'flex', flexDirection:'column', gap:'8px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <span style={{fontSize:'10px', fontWeight:800, padding:'3px 9px', borderRadius:'999px', background:`${cat?.color || '#6a8ab0'}1f`, color: cat?.color || '#6a8ab0', letterSpacing:'0.4px', textTransform:'uppercase'}}>
                        {cat?.icon} {cat?.label || m.category}
                      </span>
                      <span style={{fontSize:'11px', color:'#6a8ab0', fontWeight:600}}>{m.duration_min} min</span>
                    </div>
                    <div style={{fontSize:'15px', fontWeight:800, color:'#1a2a4a', lineHeight:1.3}}>{m.title}</div>
                    {m.description && <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:3, overflow:'hidden'}}>{m.description}</div>}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'8px', borderTop:'1px solid rgba(122,176,240,0.12)'}}>
                      <div style={{fontSize:'11px', color:'#6a8ab0'}}>Sent {m.assignment_count}×</div>
                      <div style={{display:'flex', gap:'6px'}}>
                        <button onClick={() => setAssignTarget(m)} style={{background:accent, border:'none', borderRadius:'8px', padding:'5px 12px', fontSize:'11px', fontWeight:800, color:'white', cursor:'pointer'}}>Assign →</button>
                        <button onClick={() => remove(m.id, m.title)} style={{background:'transparent', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'8px', padding:'5px 10px', fontSize:'11px', fontWeight:700, color:'#c04040', cursor:'pointer'}}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Assignments view */
        assignments.length === 0 ? (
          <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>No assignments yet.</div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {assignments.map(a => {
              const cat = CATEGORIES.find(c => c.id === a.category);
              return (
                <div key={a.id} style={{...CARD, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a'}}>{a.meditation_title}</div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'2px'}}>
                      Sent to {a.patient_name} · {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  {cat && <span style={{fontSize:'10px', padding:'3px 9px', borderRadius:'999px', background:`${cat.color}1f`, color:cat.color, fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase'}}>{cat.label}</span>}
                </div>
              );
            })}
          </div>
        )
      )}

      {showCreate && (
        <CreateMeditationModal
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            const res = await fetch(`${API}/concierge/meditations`, {
              method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
              body: JSON.stringify(payload),
            });
            if (res.ok) { setShowCreate(false); setBanner({ok:true, text:'Meditation created.'}); load(); }
            else { const d = await res.json().catch(()=>({})); setBanner({ok:false, text: d.detail || 'Create failed'}); }
          }}
          accent={accent}
        />
      )}

      {assignTarget && (
        <AssignModal
          title={`Assign "${assignTarget.title}"`}
          patients={patients}
          onClose={() => setAssignTarget(null)}
          onAssign={async (patientId) => {
            const res = await fetch(`${API}/concierge/meditations/${assignTarget.id}/assign`, {
              method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
              body: JSON.stringify({ patient_id: patientId }),
            });
            if (res.ok) { setAssignTarget(null); setBanner({ok:true, text:'Assigned. Patient notified.'}); load(); }
            else { const d = await res.json().catch(()=>({})); setBanner({ok:false, text: d.detail || 'Assign failed'}); }
          }}
          accent={accent}
        />
      )}
    </div>
  );
};

const CreateMeditationModal: React.FC<{onClose: () => void; onCreate: (payload: any) => void; accent: string}> = ({ onClose, onCreate, accent }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('breathwork');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('10');
  const [script, setScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!title.trim()) { setErr('Title is required.'); return; }
    onCreate({ title: title.trim(), category, description: description.trim(), duration_min: parseInt(duration) || 10, script: script.trim(), audio_url: audioUrl.trim() });
  };
  return (
    <Modal onClose={onClose} title="New meditation">
      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>Title</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="10-minute morning breath" style={INPUT}/>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 100px', gap:'8px', marginBottom:'10px'}}>
        <div>
          <div style={FIELD_LABEL}>Category</div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{...INPUT, appearance:'auto'}}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <div style={FIELD_LABEL}>Minutes</div>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1} max={90} style={INPUT}/>
        </div>
      </div>
      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>Short description</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="For patients just starting a practice; minimal instruction." style={{...INPUT, minHeight:'60px', resize:'vertical'}}/>
      </div>
      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>Script (optional)</div>
        <textarea value={script} onChange={e => setScript(e.target.value)} rows={4} placeholder="Full guided text — read aloud or streamed via audio URL below." style={{...INPUT, minHeight:'100px', resize:'vertical'}}/>
      </div>
      <div style={{marginBottom:'14px'}}>
        <div style={FIELD_LABEL}>Audio URL (optional)</div>
        <input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://…" style={INPUT}/>
      </div>
      {err && <div style={{color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>{err}</div>}
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={submit} style={{...solidBtn(accent)}}>Create</button>
      </div>
    </Modal>
  );
};

export const AssignModal: React.FC<{title:string; patients:PatientMini[]; onClose:()=>void; onAssign:(patientId:number)=>void; accent:string}> = ({ title, patients, onClose, onAssign, accent }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const active = patients.filter(p => true);
  return (
    <Modal onClose={onClose} title={title}>
      <div style={{fontSize:'12px', color:'#6a8ab0', marginBottom:'12px'}}>Pick a patient. They'll receive a secure push notification.</div>
      {active.length === 0 ? (
        <div style={{fontSize:'12px', color:'#6a8ab0'}}>No patients yet. Add one in the Patients tab first.</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'6px', maxHeight:'280px', overflow:'auto'}}>
          {active.map(p => {
            const sel = selected === p.id;
            return (
              <button key={p.id} onClick={() => setSelected(p.id)}
                style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  background: sel ? 'rgba(122,176,240,0.12)' : 'rgba(255,255,255,0.65)',
                  border: sel ? '2px solid #4a7ad0' : '1px solid rgba(122,176,240,0.2)',
                  borderRadius:'12px', padding:'10px 12px',
                }}>
                <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a'}}>{p.name}</div>
                <div style={{fontSize:'11px', color:'#6a8ab0'}}>{p.email}</div>
              </button>
            );
          })}
        </div>
      )}
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'14px'}}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={() => selected && onAssign(selected)} disabled={!selected} style={{...solidBtn(accent), opacity: selected ? 1 : 0.5}}>Send</button>
      </div>
    </Modal>
  );
};

export const Modal: React.FC<{title: string; onClose:()=>void; children: React.ReactNode}> = ({ title, onClose, children }) => (
  <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:1500, background:'rgba(26,42,74,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
    <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'18px', padding:'22px', maxWidth:'480px', width:'100%', maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 50px rgba(0,0,0,0.25)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
        <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a'}}>{title}</div>
        <button onClick={onClose} style={{background:'transparent', border:'none', fontSize:'20px', color:'#6a8ab0', cursor:'pointer'}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

export const ghostBtn: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)',
  borderRadius:'10px', padding:'9px 14px', fontSize:'12px', fontWeight:700,
  color:'#4a7ad0', cursor:'pointer', fontFamily:'inherit',
};
export const solidBtn = (accent: string): React.CSSProperties => ({
  background: accent, border:'none',
  borderRadius:'10px', padding:'9px 18px', fontSize:'12px', fontWeight:800,
  color:'white', cursor:'pointer', fontFamily:'inherit',
});

export default MeditationsSection;
