// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PatientWellnessPanel from './PatientWellnessPanel';

interface Props { API: string; token: string; accent: string; }

interface Patient {
  id: number;
  name: string;
  email: string;
  dob: string | null;
  phone: string | null;
  membership_tier: 'awaken' | 'align' | 'ascend' | string;
  intake_data: IntakeData;
  doctor_notes: string;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IntakeData {
  chief_complaint?: string;
  medical_history?: string;
  medications?: string;
  allergies?: string;
  goals_medical?: string;
  goals_coaching?: string;
  goals_spiritual?: string;
  communication_preference?: string;
}

const TIERS: {id: string; label: string; price: string; color: string}[] = [
  { id: 'awaken', label: 'Awaken', price: '$150/mo', color: '#7ab0f0' },
  { id: 'align',  label: 'Align',  price: '$300/mo', color: '#4a7ad0' },
  { id: 'ascend', label: 'Ascend', price: '$500/mo', color: '#1a2a4a' },
];

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius:'16px',
  border: '1px solid rgba(122,176,240,0.2)',
  boxShadow: '0 2px 10px rgba(100,130,200,0.1)',
  padding:'16px',
};

const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)',
  outline:'none', boxSizing:'border-box',
};

const FIELD_LABEL: React.CSSProperties = { fontSize:'11px', color:'#4a7ad0', fontWeight:600, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' };

const PatientsSection: React.FC<Props> = ({ API, token, accent }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/patients`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setPatients(data.patients || []); })
      .catch(() => setError('Could not load patients.'))
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  }, [patients, search]);

  if (selected) {
    return <PatientDetail API={API} token={token} accent={accent} patient={selected} onClose={()=>{setSelected(null); load();}} onDeleted={()=>{setSelected(null); load();}}/>;
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Patients</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>{patients.length} total · {patients.filter(p=>p.membership_tier==='ascend').length} Ascend · {patients.filter(p=>p.membership_tier==='align').length} Align · {patients.filter(p=>p.membership_tier==='awaken').length} Awaken</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 18px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer', whiteSpace:'nowrap'}}>+ Add patient</button>
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search name, email, or phone…"
        style={{...INPUT, marginBottom:'14px'}}
      />

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading patients…</div>
      ) : filtered.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.4}}>👥</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>{patients.length === 0 ? 'No patients yet' : 'No matches'}</div>
          <div style={{fontSize:'12px'}}>{patients.length === 0 ? 'Add your first concierge patient to begin.' : 'Try a different search.'}</div>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'12px'}}>
          {filtered.map(p => {
            const tier = TIERS.find(t => t.id === p.membership_tier) || TIERS[0];
            const last = p.last_contact_at ? new Date(p.last_contact_at) : null;
            const joined = new Date(p.created_at);
            return (
              <button
                key={p.id}
                onClick={()=>setSelected(p)}
                style={{...CARD, textAlign:'left', cursor:'pointer', fontFamily:'inherit'}}
              >
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                  <div style={{fontSize:'15px', fontWeight:800, color:'#1a2a4a'}}>{p.name}</div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background:`${tier.color}1a`, color:tier.color, fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', whiteSpace:'nowrap'}}>{tier.label}</span>
                </div>
                <div style={{fontSize:'12px', color:'#4a5e6a', marginBottom:'8px', wordBreak:'break-all'}}>{p.email}</div>
                <div style={{display:'flex', gap:'10px', flexWrap:'wrap', fontSize:'11px', color:'#4a7ad0'}}>
                  <span>Joined {joined.toLocaleDateString()}</span>
                  {last && <span>· Last contact {last.toLocaleDateString()}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showAdd && <AddPatientModal API={API} token={token} accent={accent} onClose={()=>setShowAdd(false)} onCreated={()=>{setShowAdd(false); load();}}/>}
    </div>
  );
};

// ───── Add Patient Modal ─────────────────────────────────────────────────────

const AddPatientModal: React.FC<{API:string; token:string; accent:string; onClose:()=>void; onCreated:()=>void}> = ({API, token, accent, onClose, onCreated}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<string>('awaken');
  const [intake, setIntake] = useState<IntakeData>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (k: keyof IntakeData, v: string) => setIntake(x => ({...x, [k]: v}));

  const save = async () => {
    setError('');
    if (!name.trim() || !email.trim()) { setError('Name and email required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/patients`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ name, email, dob: dob || undefined, phone: phone || undefined, membership_tier: tier, intake_data: intake }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not save patient');
      onCreated();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px', overflowY:'auto', zIndex:1500}}>
      <div style={{background:'white', borderRadius:'20px', padding:'24px', maxWidth:'640px', width:'100%', boxShadow:'0 20px 60px rgba(26,42,74,0.3)', margin:'20px 0'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a'}}>Add patient</div>
            <div style={{fontSize:'12px', color:'#4a7ad0'}}>Core info + optional intake form. You can fill intake later.</div>
          </div>
          <button onClick={onClose} style={{background:'transparent', border:'none', fontSize:'20px', color:'#4a7ad0', cursor:'pointer'}}>×</button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'14px'}}>
          <div>
            <div style={FIELD_LABEL}>Name *</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" style={INPUT}/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Email *</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="patient@example.com" style={INPUT}/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Date of birth</div>
            <input type="date" value={dob} onChange={e=>setDob(e.target.value)} style={INPUT}/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Phone</div>
            <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 ..." style={INPUT}/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Membership tier</div>
            <select value={tier} onChange={e=>setTier(e.target.value)} style={{...INPUT, appearance:'auto'}}>
              {TIERS.map(t => <option key={t.id} value={t.id}>{t.label} — {t.price}</option>)}
            </select>
          </div>
        </div>

        <div style={{borderTop:'1px solid rgba(122,176,240,0.2)', paddingTop:'16px', marginTop:'6px'}}>
          <div style={{fontSize:'12px', fontWeight:700, color:'#1a2a4a', marginBottom:'10px', letterSpacing:'0.5px', textTransform:'uppercase'}}>Intake form (optional)</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr', gap:'10px'}}>
            <TextArea label="Chief complaint / reason for joining" value={intake.chief_complaint||''} onChange={v=>update('chief_complaint', v)}/>
            <TextArea label="Medical history (conditions, surgeries)" value={intake.medical_history||''} onChange={v=>update('medical_history', v)}/>
            <TextArea label="Current medications" value={intake.medications||''} onChange={v=>update('medications', v)}/>
            <TextArea label="Allergies" value={intake.allergies||''} onChange={v=>update('allergies', v)}/>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'10px'}}>
              <TextArea label="Medical goals" value={intake.goals_medical||''} onChange={v=>update('goals_medical', v)} small/>
              <TextArea label="Life coaching goals" value={intake.goals_coaching||''} onChange={v=>update('goals_coaching', v)} small/>
              <TextArea label="Spiritual goals" value={intake.goals_spiritual||''} onChange={v=>update('goals_spiritual', v)} small/>
            </div>
            <div>
              <div style={FIELD_LABEL}>Preferred communication</div>
              <select value={intake.communication_preference || ''} onChange={e=>update('communication_preference', e.target.value)} style={{...INPUT, appearance:'auto'}}>
                <option value="">(not set)</option>
                <option value="email">Email</option>
                <option value="sms">Text / SMS</option>
                <option value="phone">Phone</option>
                <option value="in_person">In person only</option>
                <option value="telehealth">Telehealth video</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginTop:'12px'}}>{error}</div>}

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'16px'}}>
          <button onClick={onClose} disabled={saving} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px 18px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={saving || !name.trim() || !email.trim()} style={{background:accent, border:'none', borderRadius:'12px', padding:'10px 20px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer', opacity:(saving||!name.trim()||!email.trim())?0.6:1}}>
            {saving ? 'Saving…' : 'Save patient'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TextArea: React.FC<{label:string; value:string; onChange:(v:string)=>void; small?:boolean}> = ({label, value, onChange, small}) => (
  <div>
    <div style={FIELD_LABEL}>{label}</div>
    <textarea value={value} onChange={e=>onChange(e.target.value)} style={{...INPUT, minHeight: small ? '60px' : '70px', resize:'vertical', fontFamily:'inherit'}}/>
  </div>
);

// ───── Patient Detail ──────────────────────────────────────────────────────

const PatientDetail: React.FC<{API:string; token:string; accent:string; patient:Patient; onClose:()=>void; onDeleted:()=>void}> = ({API, token, accent, patient, onClose, onDeleted}) => {
  const [p, setP] = useState<Patient>(patient);
  const [doctorNotes, setDoctorNotes] = useState(patient.doctor_notes);
  const [intake, setIntake] = useState<IntakeData>(patient.intake_data || {});
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const update = (k: keyof IntakeData, v: string) => setIntake(x => ({...x, [k]: v}));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/patients/${p.id}`, {
        method:'PATCH',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ doctor_notes: doctorNotes, intake_data: intake }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Save failed');
      const data = await res.json();
      setP(data); setIntake(data.intake_data || {}); setDoctorNotes(data.doctor_notes || '');
      setSavedTick(true); setTimeout(()=>setSavedTick(false), 1500);
      setEditMode(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    try {
      await fetch(`${API}/concierge/patients/${p.id}`, { method:'DELETE', headers:{Authorization:`Bearer ${token}`} });
      onDeleted();
    } catch {}
  };

  const tier = TIERS.find(t => t.id === p.membership_tier) || TIERS[0];
  const age = p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / 31557600000) : null;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'16px'}}>
        <button onClick={onClose} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>← All patients</button>
        <div style={{display:'flex', gap:'8px'}}>
          {!editMode && <button onClick={()=>setEditMode(true)} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Edit intake</button>}
          {editMode && <button onClick={save} disabled={saving} style={{background:accent, border:'none', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:700, color:'white', cursor:'pointer', opacity:saving?0.6:1}}>{saving ? 'Saving…' : savedTick ? '✓ Saved' : 'Save changes'}</button>}
          <button onClick={()=>setDeleteConfirm(true)} style={{background:'transparent', border:'1px solid rgba(192,64,64,0.35)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:600, color:'#c04040', cursor:'pointer'}}>Delete</button>
        </div>
      </div>

      {/* Header card */}
      <div style={{...CARD, marginBottom:'14px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap'}}>
          <div style={{minWidth:0, flex:1}}>
            <div style={{fontSize:'22px', fontWeight:800, color:'#1a2a4a', marginBottom:'4px'}}>{p.name}</div>
            <div style={{fontSize:'13px', color:'#4a5e6a', wordBreak:'break-all'}}>{p.email}</div>
            <div style={{display:'flex', gap:'12px', marginTop:'8px', flexWrap:'wrap', fontSize:'12px', color:'#4a7ad0'}}>
              {age !== null && <span>Age {age}</span>}
              {p.dob && <span>· DOB {p.dob}</span>}
              {p.phone && <span>· {p.phone}</span>}
            </div>
          </div>
          <span style={{fontSize:'11px', padding:'5px 12px', borderRadius:'999px', background:`${tier.color}1a`, color:tier.color, fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', whiteSpace:'nowrap'}}>{tier.label} · {tier.price}</span>
        </div>
      </div>

      {/* Two-column on desktop, stacked on mobile */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'14px'}}>

        {/* Intake form */}
        <div style={{...CARD}}>
          <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a', marginBottom:'12px', letterSpacing:'0.5px', textTransform:'uppercase'}}>Intake</div>
          {[
            ['chief_complaint', 'Chief complaint / reason for joining'],
            ['medical_history', 'Medical history'],
            ['medications', 'Current medications'],
            ['allergies', 'Allergies'],
            ['goals_medical', 'Medical goals'],
            ['goals_coaching', 'Life coaching goals'],
            ['goals_spiritual', 'Spiritual goals'],
            ['communication_preference', 'Preferred communication'],
          ].map(([k, label]) => (
            <div key={k} style={{marginBottom:'12px'}}>
              <div style={FIELD_LABEL}>{label}</div>
              {editMode ? (
                <textarea value={(intake as any)[k] || ''} onChange={e => update(k as keyof IntakeData, e.target.value)} style={{...INPUT, minHeight:'60px', resize:'vertical', fontFamily:'inherit'}}/>
              ) : (
                <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:1.6, whiteSpace:'pre-wrap', minHeight:'20px'}}>
                  {(intake as any)[k] || <span style={{color:'#7ab0f0', fontStyle:'italic'}}>(not filled)</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Doctor notes + metadata */}
        <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>
          <div style={{...CARD, background:'rgba(240,246,255,0.6)', border:'1px solid rgba(122,176,240,0.4)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
              <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a', letterSpacing:'0.5px', textTransform:'uppercase'}}>Doctor notes</div>
              <div style={{fontSize:'10px', color:'#4a7ad0', fontStyle:'italic'}}>Private — only visible here</div>
            </div>
            <textarea
              value={doctorNotes}
              onChange={e => setDoctorNotes(e.target.value)}
              placeholder="Your private notes on this patient. Medical observations, coaching progress, anything to remember."
              style={{...INPUT, minHeight:'240px', resize:'vertical', fontFamily:'inherit', lineHeight:1.6, background:'rgba(240,246,255,0.6)'}}
            />
            <button onClick={save} disabled={saving} style={{marginTop:'10px', background:accent, border:'none', borderRadius:'10px', padding:'8px 16px', fontSize:'12px', fontWeight:700, color:'white', cursor:'pointer', opacity:saving?0.6:1}}>
              {saving ? 'Saving…' : savedTick ? '✓ Saved' : 'Save notes'}
            </button>
          </div>

          <div style={{...CARD}}>
            <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a', marginBottom:'10px', letterSpacing:'0.5px', textTransform:'uppercase'}}>Record</div>
            <div style={{fontSize:'12px', color:'#4a5e6a', lineHeight:1.8}}>
              <div><b>Patient ID:</b> #{p.id}</div>
              <div><b>Joined:</b> {new Date(p.created_at).toLocaleString()}</div>
              <div><b>Last updated:</b> {new Date(p.updated_at).toLocaleString()}</div>
              {p.last_contact_at && <div><b>Last contact:</b> {new Date(p.last_contact_at).toLocaleString()}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Wellness panel — energy log trend + post-meditation reflections.
          Lives below the intake row so the doctor sees objective patient
          state (mood pattern, journal notes) without scrolling past the
          intake form she relies on at the start of each visit. */}
      <div style={{marginTop:'14px'}}>
        <PatientWellnessPanel API={API} token={token} patientId={p.id} accent={accent}/>
      </div>

      {deleteConfirm && (
        <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
          <div style={{background:'white', borderRadius:'18px', padding:'24px', maxWidth:'420px', width:'100%', boxShadow:'0 16px 50px rgba(26,42,74,0.3)'}}>
            <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a', marginBottom:'8px'}}>Delete patient?</div>
            <div style={{fontSize:'13px', color:'#4a5e6a', marginBottom:'18px', lineHeight:1.6}}>
              This will permanently delete <b>{p.name}</b>'s record and ALL associated messages, appointments, invoices, habits, and assignments. This cannot be undone.
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
              <button onClick={()=>setDeleteConfirm(false)} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
              <button onClick={doDelete} style={{background:'#c04040', border:'none', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor:'pointer'}}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsSection;
