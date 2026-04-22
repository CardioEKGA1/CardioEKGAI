// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, AssignModal, ghostBtn, solidBtn } from './MeditationsSection';

interface Props { API: string; token: string; accent: string; }

interface Module {
  id: number; title: string;
  description: string; content: string;
  exercises: any[];
  assignment_count: number;
  created_at: string | null;
}
interface Assignment {
  id: number; assigned_at: string | null;
  progress_pct: number; completed_at: string | null;
  patient_id: number; patient_name: string;
  module_id: number; module_title: string;
}
interface PatientMini { id: number; name: string; email: string; }

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

const CoachingSection: React.FC<Props> = ({ API, token, accent }) => {
  const [view, setView] = useState<'library' | 'assignments'>('library');
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [patients, setPatients] = useState<PatientMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Module | null>(null);
  const [preview, setPreview] = useState<Module | null>(null);
  const [banner, setBanner] = useState<{ok:boolean; text:string} | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/coaching/modules`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { modules: [] }),
      fetch(`${API}/concierge/coaching/assignments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { assignments: [] }),
      fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { patients: [] }),
    ]).then(([m, a, p]) => {
      setModules(m.modules || []);
      setAssignments(a.assignments || []);
      setPatients((p.patients || []).map((x: any) => ({ id: x.id, name: x.name, email: x.email })));
    }).catch(() => setError('Could not load coaching modules.'))
      .finally(() => setLoading(false));
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => ({
    library: modules.length,
    assigned: assignments.length,
    completed: assignments.filter(a => a.progress_pct >= 100).length,
  }), [modules, assignments]);

  const remove = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}" module and all assignments?`)) return;
    const res = await fetch(`${API}/concierge/coaching/modules/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
    if (res.ok) { setBanner({ok:true, text:'Module deleted.'}); load(); }
  };

  const updateProgress = async (assignId: number, pct: number) => {
    const res = await fetch(`${API}/concierge/coaching/assignments/${assignId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify({ progress_pct: pct }),
    });
    if (res.ok) { load(); }
  };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Coaching</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>
            {totals.library} module{totals.library === 1 ? '' : 's'} · {totals.assigned} assigned · {totals.completed} completed
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer'}}>
          + New module
        </button>
      </div>

      {banner && <div style={{padding:'10px 12px', borderRadius:'10px', fontSize:'12px', marginBottom:'12px', background: banner.ok ? 'rgba(112,184,112,0.1)' : 'rgba(224,80,80,0.08)', color: banner.ok ? '#2a7a2a' : '#a02020'}}>{banner.text}</div>}

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
              {v === 'library' ? `Library (${modules.length})` : `Assignments (${assignments.length})`}
            </button>
          );
        })}
      </div>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {view === 'library' ? (
        loading ? (
          <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
        ) : modules.length === 0 ? (
          <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
            <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.5}}>🧭</div>
            <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>No modules yet</div>
            <div style={{fontSize:'12px'}}>Create your first coaching module — a self-paced unit with content and optional exercises.</div>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'12px'}}>
            {modules.map(m => (
              <div key={m.id} style={{...CARD, display:'flex', flexDirection:'column', gap:'8px'}}>
                <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a', lineHeight:1.3}}>{m.title}</div>
                {m.description && <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:3, overflow:'hidden'}}>{m.description}</div>}
                <div style={{display:'flex', gap:'12px', fontSize:'11px', color:'#6a8ab0'}}>
                  <span>{(m.content || '').length} chars</span>
                  <span>·</span>
                  <span>{(m.exercises || []).length} exercise{(m.exercises||[]).length === 1 ? '' : 's'}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'8px', borderTop:'1px solid rgba(122,176,240,0.12)'}}>
                  <div style={{fontSize:'11px', color:'#6a8ab0'}}>{m.assignment_count} patient{m.assignment_count === 1 ? '' : 's'}</div>
                  <div style={{display:'flex', gap:'6px'}}>
                    <button onClick={() => setPreview(m)} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.35)', borderRadius:'8px', padding:'5px 10px', fontSize:'11px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Preview</button>
                    <button onClick={() => setAssignTarget(m)} style={{background:accent, border:'none', borderRadius:'8px', padding:'5px 12px', fontSize:'11px', fontWeight:800, color:'white', cursor:'pointer'}}>Assign →</button>
                    <button onClick={() => remove(m.id, m.title)} style={{background:'transparent', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'8px', padding:'5px 10px', fontSize:'11px', fontWeight:700, color:'#c04040', cursor:'pointer'}}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Assignments view */
        assignments.length === 0 ? (
          <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>No assignments yet.</div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            {assignments.map(a => (
              <div key={a.id} style={CARD}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'8px'}}>
                  <div>
                    <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a'}}>{a.module_title}</div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'2px'}}>
                      {a.patient_name} · assigned {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <span style={{fontSize:'11px', fontWeight:800, padding:'3px 9px', borderRadius:'999px', background: a.progress_pct >= 100 ? 'rgba(112,184,112,0.15)' : 'rgba(122,176,240,0.15)', color: a.progress_pct >= 100 ? '#2a7a2a' : '#4a7ad0'}}>
                    {a.progress_pct}%
                  </span>
                </div>
                <div style={{height:'6px', borderRadius:'999px', background:'rgba(122,176,240,0.15)', overflow:'hidden', marginBottom:'8px'}}>
                  <div style={{width:`${a.progress_pct}%`, height:'100%', background:accent, transition:'width 0.3s'}}/>
                </div>
                <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                  {[0, 25, 50, 75, 100].map(p => (
                    <button key={p} onClick={() => updateProgress(a.id, p)}
                      style={{flex:'0 0 auto', background: a.progress_pct === p ? 'rgba(122,176,240,0.2)' : 'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight: a.progress_pct === p ? 800 : 600, color:'#4a7ad0', cursor:'pointer', fontFamily:'inherit'}}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showCreate && (
        <CreateModuleModal
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            const res = await fetch(`${API}/concierge/coaching/modules`, {
              method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
              body: JSON.stringify(payload),
            });
            if (res.ok) { setShowCreate(false); setBanner({ok:true, text:'Module created.'}); load(); }
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
            const res = await fetch(`${API}/concierge/coaching/modules/${assignTarget.id}/assign`, {
              method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
              body: JSON.stringify({ patient_id: patientId }),
            });
            if (res.ok) { setAssignTarget(null); setBanner({ok:true, text:'Module assigned. Patient notified.'}); load(); }
            else { const d = await res.json().catch(()=>({})); setBanner({ok:false, text: d.detail || 'Assign failed'}); }
          }}
          accent={accent}
        />
      )}

      {preview && (
        <Modal onClose={() => setPreview(null)} title={preview.title}>
          {preview.description && <div style={{fontSize:'13px', color:'#6a8ab0', marginBottom:'12px', lineHeight:1.6}}>{preview.description}</div>}
          <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:1.7, whiteSpace:'pre-wrap', maxHeight:'50vh', overflow:'auto', background:'rgba(240,246,255,0.5)', border:'1px solid rgba(122,176,240,0.2)', borderRadius:'10px', padding:'14px'}}>
            {preview.content || <span style={{color:'#6a8ab0', fontStyle:'italic'}}>No content yet.</span>}
          </div>
          {(preview.exercises || []).length > 0 && (
            <div style={{marginTop:'14px'}}>
              <div style={FIELD_LABEL}>Exercises</div>
              <div style={{display:'flex', flexDirection:'column', gap:'6px', marginTop:'6px'}}>
                {(preview.exercises || []).map((ex: any, i: number) => (
                  <div key={i} style={{background:'rgba(155,143,232,0.08)', border:'1px solid rgba(155,143,232,0.2)', borderRadius:'10px', padding:'10px 12px', fontSize:'12px', color:'#1a2a4a'}}>
                    {typeof ex === 'string' ? ex : (ex.prompt || JSON.stringify(ex))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:'14px'}}>
            <button onClick={() => setPreview(null)} style={ghostBtn}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const CreateModuleModal: React.FC<{onClose:()=>void; onCreate:(payload:any)=>void; accent:string}> = ({ onClose, onCreate, accent }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [exerciseText, setExerciseText] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!title.trim()) { setErr('Title is required.'); return; }
    // Split on double-newlines → each paragraph becomes a "prompt" exercise.
    const exercises = exerciseText.trim()
      ? exerciseText.split(/\n\s*\n/).map(p => ({ prompt: p.trim(), type: 'reflection' })).filter(e => e.prompt)
      : [];
    onCreate({ title: title.trim(), description: description.trim(), content: content.trim(), exercises });
  };
  return (
    <Modal onClose={onClose} title="New coaching module">
      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>Title</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Week 1: Roots of sleep hygiene" style={INPUT}/>
      </div>
      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>One-sentence summary</div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="A grounded look at what helps your body remember rest." style={INPUT}/>
      </div>
      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>Module content (markdown-friendly)</div>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="Long-form content the patient will read. Section headers, lists, links — all welcome." style={{...INPUT, minHeight:'180px', resize:'vertical', fontFamily:'ui-monospace, monospace'}}/>
      </div>
      <div style={{marginBottom:'14px'}}>
        <div style={FIELD_LABEL}>Reflection exercises (optional) — separate with blank lines</div>
        <textarea value={exerciseText} onChange={e => setExerciseText(e.target.value)} rows={4} placeholder="What time did you fall asleep last night?&#10;&#10;What one change could you test this week?" style={{...INPUT, minHeight:'100px', resize:'vertical'}}/>
      </div>
      {err && <div style={{color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>{err}</div>}
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={submit} style={solidBtn(accent)}>Create</button>
      </div>
    </Modal>
  );
};

export default CoachingSection;
