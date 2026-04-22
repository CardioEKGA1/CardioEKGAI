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
interface Template {
  slug: string; name: string; category: string;
  duration_min: number; teacher: string; summary: string;
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Meditation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [banner, setBanner] = useState<{ok: boolean; text: string} | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/meditations`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { meditations: [] }),
      fetch(`${API}/concierge/meditations/assignments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { assignments: [] }),
      fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { patients: [] }),
      fetch(`${API}/concierge/meditations/templates`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { templates: [] }),
    ]).then(([m, a, p, t]) => {
      setMeds(m.meditations || []);
      setAssignments(a.assignments || []);
      setPatients((p.patients || []).map((x: any) => ({ id: x.id, name: x.name, email: x.email })));
      setTemplates(t.templates || []);
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
            {totals.library} in library · {totals.assigned} sent · {templates.length} templates
          </div>
        </div>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
          <button onClick={() => setShowPrescribe(true)}
            style={{background:'linear-gradient(135deg,#d4a86b,#9b8fe8)', border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:800, color:'white', cursor:'pointer', boxShadow:'0 8px 20px rgba(155,143,232,0.35)', letterSpacing:'0.3px'}}>
            ✨ Prescribe personalized
          </button>
          <button onClick={() => setShowLibrary(true)}
            style={{background:'linear-gradient(135deg,#4a7ad0,#9b8fe8)', border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'13px', fontWeight:800, color:'white', cursor:'pointer', boxShadow:'0 8px 20px rgba(122,176,240,0.3)'}}>
            📚 Browse library
          </button>
          <button onClick={() => setShowCreate(true)}
            style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'12px', padding:'10px 14px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>
            + Manual entry
          </button>
        </div>
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

      {showPrescribe && (
        <PrescribeModal
          API={API} token={token}
          templates={templates} patients={patients}
          onClose={() => setShowPrescribe(false)}
          onPrescribed={(detail) => {
            setShowPrescribe(false);
            setBanner({ok:true, text: `Prescribed "${detail.title}" (${detail.duration_min} min). Patient notified.`});
            load();
          }}
        />
      )}

      {showLibrary && (
        <LibraryPickerModal
          API={API} token={token} patients={patients}
          onClose={() => setShowLibrary(false)}
          onPrescribed={(detail) => {
            setShowLibrary(false);
            setBanner({ok:true, text: `Sent "${detail.title}" to ${detail.patient_name}. Patient notified.`});
            load();
          }}
        />
      )}
    </div>
  );
};

// ───── Prescribe personalized meditation ──────────────────────────────────
// Physician picks a template + patient + optional personalization note.
// Claude generates a full script that blends all five teachers for this
// specific patient. Auto-assigned, auto-pushed.

const PrescribeModal: React.FC<{
  API: string; token: string;
  templates: Template[]; patients: PatientMini[];
  onClose: () => void;
  onPrescribed: (detail: { title: string; duration_min: number }) => void;
}> = ({ API, token, templates, patients, onClose, onPrescribed }) => {
  const [step, setStep] = useState<'template' | 'patient' | 'context' | 'generating'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [context, setContext] = useState('');
  const [error, setError] = useState('');

  const prescribe = async () => {
    if (!selectedTemplate || !selectedPatientId) return;
    setStep('generating'); setError('');
    try {
      const res = await fetch(`${API}/concierge/meditations/prescribe`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          template_slug: selectedTemplate.slug,
          patient_id: selectedPatientId,
          context: context.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Generation failed');
      onPrescribed({ title: d.title, duration_min: d.duration_min });
    } catch (e: any) {
      setError(e.message);
      setStep('context');
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2000, background:'rgba(26,42,74,0.5)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'22px', maxWidth:'640px', width:'100%', maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 30px 70px rgba(26,42,74,0.35)'}}>
        {/* Header */}
        <div style={{padding:'18px 20px 12px', borderBottom:'1px solid rgba(122,176,240,0.2)', background:'linear-gradient(135deg, rgba(212,168,107,0.1), rgba(155,143,232,0.1))'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color:'#6b4e7c', fontWeight:800}}>✨ Prescribe a meditation</div>
            <button onClick={onClose} aria-label="Close" style={{background:'transparent', border:'none', fontSize:'20px', color:'#6a8ab0', cursor:'pointer', padding:'4px 8px', lineHeight:1}}>×</button>
          </div>
          <div style={{fontSize:'13px', color:'#6b4e7c', marginTop:'4px', fontStyle:'italic'}}>
            {step === 'template' && 'Choose a tradition — Claude will personalize the full script for this patient.'}
            {step === 'patient' && `${selectedTemplate?.name} · ${selectedTemplate?.teacher}`}
            {step === 'context' && `For ${selectedPatient?.name} · ${selectedTemplate?.name}`}
            {step === 'generating' && 'Weaving the meditation…'}
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1, overflow:'auto', padding:'16px 20px'}}>
          {step === 'template' && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'10px'}}>
              {templates.map(t => {
                const sel = selectedTemplate?.slug === t.slug;
                return (
                  <button key={t.slug} onClick={() => setSelectedTemplate(t)}
                    style={{
                      textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                      border: sel ? '2px solid #9b8fe8' : '1px solid rgba(155,143,232,0.25)',
                      background: sel ? 'rgba(155,143,232,0.1)' : 'rgba(255,255,255,0.7)',
                      borderRadius:'14px', padding:'14px',
                    }}>
                    <div style={{fontSize:'15px', fontWeight:800, color:'#1a2a4a', marginBottom:'4px'}}>{t.name}</div>
                    <div style={{fontSize:'10px', fontWeight:700, color:'#9b8fe8', letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:'6px'}}>
                      {t.teacher} · {t.duration_min} min
                    </div>
                    <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.5}}>{t.summary}</div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'patient' && (
            patients.length === 0 ? (
              <div style={{fontSize:'12px', color:'#6a8ab0'}}>No patients yet — add one in the Patients tab first.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                {patients.map(p => {
                  const sel = selectedPatientId === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                      style={{textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                        background: sel ? 'rgba(122,176,240,0.12)' : 'rgba(255,255,255,0.65)',
                        border: sel ? '2px solid #4a7ad0' : '1px solid rgba(122,176,240,0.2)',
                        borderRadius:'12px', padding:'10px 12px'}}>
                      <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a'}}>{p.name}</div>
                      <div style={{fontSize:'11px', color:'#6a8ab0'}}>{p.email}</div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {step === 'context' && (
            <div>
              <div style={FIELD_LABEL}>Personalization note (optional)</div>
              <textarea value={context} onChange={e => setContext(e.target.value)} rows={5}
                placeholder="Anything you'd like Claude to weave in — recent health events in spiritual language, the tone to set, an area of the body calling for light…"
                style={{...INPUT, minHeight:'130px', resize:'vertical'}}/>
              <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'8px', lineHeight:1.5}}>
                Today's oracle card (if this patient has pulled one) is automatically woven in. Patient intake notes are used for context but never quoted. Never include clinical details.
              </div>
              {error && <div style={{fontSize:'12px', color:'#a02020', marginTop:'10px'}}>{error}</div>}
            </div>
          )}

          {step === 'generating' && (
            <div style={{padding:'40px 20px', textAlign:'center'}}>
              <div style={{fontSize:'48px', marginBottom:'14px'}}>🕊️</div>
              <div style={{fontSize:'15px', fontWeight:700, color:'#1a2a4a'}}>Claude is writing a meditation for {selectedPatient?.name}…</div>
              <div style={{fontSize:'12px', color:'#6a8ab0', marginTop:'8px', fontStyle:'italic', lineHeight:1.6}}>
                Weaving Martin, Gabby, Abraham, Dispenza, and Cannon into one voice.<br/>
                This can take 15–30 seconds.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 20px', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(240,246,255,0.5)', display:'flex', gap:'8px', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap'}}>
          <div style={{fontSize:'11px', color:'#6a8ab0'}}>
            {step === 'template' && (selectedTemplate ? `Next: pick a patient` : 'Pick a template to continue')}
            {step === 'patient'  && (selectedPatientId ? `Next: optional personalization` : 'Pick a patient to continue')}
            {step === 'context'  && 'Ready to generate and send.'}
            {step === 'generating' && 'Please wait…'}
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            {step !== 'template' && step !== 'generating' && (
              <button onClick={() => setStep(step === 'patient' ? 'template' : 'patient')} style={ghostBtn}>← Back</button>
            )}
            {step === 'template' && (
              <button onClick={() => setStep('patient')} disabled={!selectedTemplate} style={{...solidBtn('linear-gradient(135deg,#d4a86b,#9b8fe8)'), opacity: selectedTemplate ? 1 : 0.5}}>Next</button>
            )}
            {step === 'patient' && (
              <button onClick={() => setStep('context')} disabled={!selectedPatientId} style={{...solidBtn('linear-gradient(135deg,#d4a86b,#9b8fe8)'), opacity: selectedPatientId ? 1 : 0.5}}>Next</button>
            )}
            {step === 'context' && (
              <button onClick={prescribe} style={solidBtn('linear-gradient(135deg,#d4a86b,#9b8fe8)')}>Generate & send ✨</button>
            )}
          </div>
        </div>
      </div>
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

// ───── Browse library ────────────────────────────────────────────────────
// Physician-facing search over the 2,000-meditation generated library
// (source='library'). Filters by category / duration / difficulty / tag /
// free-text. Tap a result → preview → pick patient → assigns via the
// existing /assign endpoint (patient push + Home-tab meditations list).

interface LibraryMeditation {
  id: number; title: string; category: string; duration_min: number;
  difficulty: string | null; tags: string[]; physician_notes: string;
  description: string; script_excerpt: string; script_chars: number;
  assignment_count: number;
}

interface LibraryFilters {
  categories: string[]; durations: number[]; difficulties: string[]; top_tags: string[];
}

// Pretty labels for the library category slugs the generator produces.
// Falls back to Title Case if a slug isn't known.
const LIBRARY_CATEGORY_LABELS: Record<string, string> = {
  divine_light_healing: 'Divine Light Healing',
  universe_surrender:   'Universe Surrender',
  vortex_alignment:     'Vortex Alignment',
  quantum_healing:      'Quantum Healing',
  subconscious_healing: 'Subconscious Healing',
  chakra_balancing:     'Chakra Balancing',
  heart_coherence:      'Heart Coherence',
  morning_activation:   'Morning Activation',
  evening_integration:  'Evening Integration',
  sleep_healing:        'Sleep Healing',
  anxiety_release:      'Anxiety Release',
  grief_and_loss:       'Grief and Loss',
  chronic_pain:         'Chronic Pain',
  immune_boost:         'Immune Boost',
  cardiovascular:       'Cardiovascular',
  kidney_and_detox:     'Kidney and Detox',
  neurological:         'Neurological',
  oncology_support:     'Oncology Support',
  autoimmune:           'Autoimmune',
  soul_purpose:         'Soul Purpose',
  // Manual-entry category fallbacks
  breathwork:      'Breathwork',
  body_scan:       'Body Scan',
  visualization:   'Visualization',
  energy_healing:  'Energy Healing',
  sleep:           'Sleep',
  stress:          'Stress',
};
const labelFor = (slug: string) =>
  LIBRARY_CATEGORY_LABELS[slug] || slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const LibraryPickerModal: React.FC<{
  API: string; token: string;
  patients: PatientMini[];
  onClose: () => void;
  onPrescribed: (d: {title: string; patient_name: string}) => void;
}> = ({ API, token, patients, onClose, onPrescribed }) => {
  const [category, setCategory] = useState<string>('');
  const [duration, setDuration] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [results, setResults] = useState<LibraryMeditation[]>([]);
  const [filters, setFilters] = useState<LibraryFilters>({ categories: [], durations: [], difficulties: [], top_tags: [] });
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<LibraryMeditation | null>(null);

  // Debounce search + filter changes.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (category)     params.set('category', category);
      if (duration)     params.set('duration', String(duration));
      if (difficulty)   params.set('difficulty', difficulty);
      if (tag)          params.set('tag', tag);
      if (q.trim())     params.set('q', q.trim());
      setLoading(true); setError('');
      fetch(`${API}/concierge/meditations/library?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          setResults(d.meditations || []);
          setFilters(d.available_filters || { categories: [], durations: [], difficulties: [], top_tags: [] });
          setTotal(d.total_in_library || 0);
        })
        .catch(() => setError('Could not load library.'))
        .finally(() => setLoading(false));
    }, 240);
    return () => clearTimeout(t);
  }, [API, token, category, duration, difficulty, tag, q]);

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2000, background:'rgba(26,42,74,0.5)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'22px', maxWidth:'780px', width:'100%', maxHeight:'94vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 30px 70px rgba(26,42,74,0.35)'}}>
        {/* Header */}
        <div style={{padding:'16px 20px 12px', borderBottom:'1px solid rgba(122,176,240,0.2)', background:'linear-gradient(135deg, rgba(122,176,240,0.08), rgba(155,143,232,0.08))'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color:'#4a7ad0', fontWeight:800}}>📚 Meditation library</div>
            <button onClick={onClose} aria-label="Close" style={{background:'transparent', border:'none', fontSize:'20px', color:'#6a8ab0', cursor:'pointer', padding:'4px 8px'}}>×</button>
          </div>
          <div style={{fontSize:'12px', color:'#6a8ab0', marginTop:'4px'}}>
            {total} in library · filter to find what this patient needs today
          </div>
        </div>

        {/* Filters */}
        <div style={{padding:'14px 20px 10px', borderBottom:'1px solid rgba(122,176,240,0.15)', background:'rgba(240,246,255,0.35)'}}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title or physician notes…"
            style={{...INPUT, marginBottom:'10px'}}/>
          {filters.categories.length > 0 && (
            <div style={{display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'6px', marginBottom:'8px'}}>
              <FilterPill active={!category} onClick={() => setCategory('')} label="All categories"/>
              {filters.categories.map(c => (
                <FilterPill key={c} active={category === c} onClick={() => setCategory(c)} label={labelFor(c)}/>
              ))}
            </div>
          )}
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'6px'}}>
            {filters.durations.length > 0 && (
              <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                <span style={{fontSize:'10px', color:'#6a8ab0', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', marginRight:'4px'}}>Duration</span>
                <FilterPill active={duration === null} onClick={() => setDuration(null)} label="Any"/>
                {filters.durations.map(d => (
                  <FilterPill key={d} active={duration === d} onClick={() => setDuration(d)} label={`${d} min`}/>
                ))}
              </div>
            )}
            {filters.difficulties.length > 0 && (
              <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                <span style={{fontSize:'10px', color:'#6a8ab0', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', marginRight:'4px'}}>Difficulty</span>
                <FilterPill active={!difficulty} onClick={() => setDifficulty('')} label="Any"/>
                {filters.difficulties.map(d => (
                  <FilterPill key={d} active={difficulty === d} onClick={() => setDifficulty(d)} label={d}/>
                ))}
              </div>
            )}
          </div>
          {filters.top_tags.length > 0 && (
            <div style={{display:'flex', gap:'4px', overflowX:'auto', paddingBottom:'2px'}}>
              <span style={{fontSize:'10px', color:'#6a8ab0', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', marginRight:'4px', flexShrink:0, alignSelf:'center'}}>Tags</span>
              <FilterPill active={!tag} onClick={() => setTag('')} label="Any"/>
              {filters.top_tags.slice(0, 24).map(t => (
                <FilterPill key={t} active={tag === t} onClick={() => setTag(t === tag ? '' : t)} label={t}/>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{flex:1, overflow:'auto', padding:'14px 20px'}}>
          {loading ? (
            <div style={{padding:'40px', textAlign:'center', color:'#6a8ab0', fontSize:'13px'}}>Loading…</div>
          ) : error ? (
            <div style={{padding:'20px', color:'#a02020', fontSize:'13px'}}>{error}</div>
          ) : results.length === 0 ? (
            <div style={{padding:'40px 20px', textAlign:'center', color:'#6a8ab0'}}>
              {total === 0 ? (
                <>
                  <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.5}}>📚</div>
                  <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'6px'}}>Library is empty</div>
                  <div style={{fontSize:'12px', maxWidth:'380px', margin:'0 auto', lineHeight:1.6}}>
                    Run <code style={{background:'rgba(122,176,240,0.15)', padding:'2px 6px', borderRadius:'4px'}}>backend/scripts/generate_meditations.py</code> and <code style={{background:'rgba(122,176,240,0.15)', padding:'2px 6px', borderRadius:'4px'}}>load_meditations.py</code> to populate.
                  </div>
                </>
              ) : (
                <>
                  <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>No matches</div>
                  <div style={{fontSize:'12px'}}>Try relaxing a filter.</div>
                </>
              )}
            </div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'10px'}}>
              {results.map(m => (
                <button key={m.id} onClick={() => setPreview(m)}
                  style={{textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                    background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.2)',
                    borderRadius:'14px', padding:'12px 14px', boxShadow:'0 2px 8px rgba(100,130,200,0.08)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px', gap:'8px'}}>
                    <span style={{fontSize:'10px', fontWeight:800, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{labelFor(m.category)}</span>
                    <span style={{fontSize:'10px', fontWeight:700, color:'#6a8ab0', flexShrink:0}}>{m.duration_min} min</span>
                  </div>
                  <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a', lineHeight:1.25, marginBottom:'6px', minHeight:'36px'}}>{m.title}</div>
                  {m.difficulty && <span style={{fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'999px', background:'rgba(155,143,232,0.12)', color:'#6a60b0', marginRight:'4px'}}>{m.difficulty}</span>}
                  {m.assignment_count > 0 && <span style={{fontSize:'10px', color:'#6a8ab0', marginLeft:'4px'}}>· sent {m.assignment_count}×</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'10px 20px', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(240,246,255,0.5)', fontSize:'11px', color:'#6a8ab0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span>{loading ? '…' : `Showing ${results.length} of ${total}`}</span>
          <button onClick={onClose} style={ghostBtn}>Close</button>
        </div>
      </div>

      {preview && (
        <LibraryPreview
          API={API} token={token} meditation={preview} patients={patients}
          onClose={() => setPreview(null)}
          onPrescribed={onPrescribed}
        />
      )}
    </div>
  );
};

const FilterPill: React.FC<{active: boolean; onClick: () => void; label: string}> = ({ active, onClick, label }) => (
  <button onClick={onClick}
    style={{
      flexShrink:0, padding:'5px 11px', borderRadius:'999px', fontSize:'11px',
      fontWeight: active ? 800 : 600,
      border: active ? '1px solid #4a7ad0' : '1px solid rgba(122,176,240,0.25)',
      background: active ? 'rgba(122,176,240,0.18)' : 'rgba(255,255,255,0.75)',
      color: active ? '#4a7ad0' : '#1a2a4a',
      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
    }}>
    {label}
  </button>
);

const LibraryPreview: React.FC<{
  API: string; token: string;
  meditation: LibraryMeditation;
  patients: PatientMini[];
  onClose: () => void;
  onPrescribed: (d: {title: string; patient_name: string}) => void;
}> = ({ API, token, meditation, patients, onClose, onPrescribed }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const prescribe = async () => {
    if (!selectedPatientId) return;
    setSending(true); setError('');
    try {
      const res = await fetch(`${API}/concierge/meditations/${meditation.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ patient_id: selectedPatientId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Assign failed'); }
      const patient = patients.find(p => p.id === selectedPatientId);
      onPrescribed({ title: meditation.title, patient_name: patient?.name || '' });
    } catch (e: any) { setError(e.message); setSending(false); }
  };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2100, background:'rgba(26,42,74,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'20px', maxWidth:'560px', width:'100%', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 30px 70px rgba(26,42,74,0.35)'}}>
        <div style={{padding:'16px 20px 12px', borderBottom:'1px solid rgba(122,176,240,0.2)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px'}}>
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontSize:'10px', fontWeight:800, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase'}}>{labelFor(meditation.category)} · {meditation.duration_min} min{meditation.difficulty ? ` · ${meditation.difficulty}` : ''}</div>
              <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a', marginTop:'4px', lineHeight:1.25}}>{meditation.title}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{background:'transparent', border:'none', fontSize:'20px', color:'#6a8ab0', cursor:'pointer'}}>×</button>
          </div>
        </div>

        <div style={{overflow:'auto', padding:'14px 20px', flex:1}}>
          {meditation.physician_notes && (
            <div style={{background:'rgba(122,176,240,0.08)', border:'1px solid rgba(122,176,240,0.2)', borderRadius:'10px', padding:'10px 12px', fontSize:'12px', color:'#1a2a4a', lineHeight:1.5, marginBottom:'12px'}}>
              <div style={FIELD_LABEL}>When to prescribe</div>
              <div style={{marginTop:'4px', fontStyle:'italic'}}>{meditation.physician_notes}</div>
            </div>
          )}
          {meditation.tags.length > 0 && (
            <div style={{display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'12px'}}>
              {meditation.tags.map(t => (
                <span key={t} style={{fontSize:'10px', padding:'2px 8px', borderRadius:'999px', background:'rgba(155,143,232,0.12)', color:'#6a60b0', fontWeight:600}}>{t}</span>
              ))}
            </div>
          )}
          <div style={FIELD_LABEL}>Script excerpt</div>
          <div style={{fontSize:'13px', color:'#4a5e6a', marginTop:'4px', lineHeight:1.7, fontStyle:'italic', padding:'12px 14px', background:'rgba(240,246,255,0.5)', borderRadius:'10px', border:'1px solid rgba(122,176,240,0.15)'}}>
            {meditation.script_excerpt}{meditation.script_chars > 280 ? '…' : ''}
          </div>
          <div style={{fontSize:'10px', color:'#8aa0c0', marginTop:'4px'}}>{meditation.script_chars.toLocaleString()} characters total. Full script delivered to the patient.</div>

          <div style={{marginTop:'16px', ...FIELD_LABEL}}>Prescribe to</div>
          {patients.length === 0 ? (
            <div style={{fontSize:'12px', color:'#6a8ab0', marginTop:'6px'}}>No patients yet — add one in Patients first.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'6px', marginTop:'6px', maxHeight:'220px', overflow:'auto'}}>
              {patients.map(p => {
                const sel = selectedPatientId === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                    style={{textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                      background: sel ? 'rgba(122,176,240,0.14)' : 'rgba(255,255,255,0.7)',
                      border: sel ? '2px solid #4a7ad0' : '1px solid rgba(122,176,240,0.2)',
                      borderRadius:'12px', padding:'10px 12px'}}>
                    <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a'}}>{p.name}</div>
                    <div style={{fontSize:'11px', color:'#6a8ab0'}}>{p.email}</div>
                  </button>
                );
              })}
            </div>
          )}
          {error && <div style={{color:'#a02020', fontSize:'12px', marginTop:'10px'}}>{error}</div>}
        </div>

        <div style={{padding:'12px 20px', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(240,246,255,0.5)', display:'flex', gap:'8px', justifyContent:'flex-end'}}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={prescribe} disabled={!selectedPatientId || sending}
            style={{...solidBtn('linear-gradient(135deg,#4a7ad0,#9b8fe8)'), opacity: (!selectedPatientId || sending) ? 0.6 : 1}}>
            {sending ? 'Sending…' : 'Prescribe & notify →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeditationsSection;
