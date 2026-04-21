// © 2026 SoulMD, LLC. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL } from './shared';
import DictationButton from '../../DictationButton';

interface Props { API: string; token: string; onBack: () => void; }

const NOTE_TYPES = ['SOAP', 'H&P', 'Progress Note', 'Discharge Summary', 'Consult Note', 'Procedure Note', 'Operative Note', 'Prior Auth Letter'];
const SPECIALTIES = ['Internal Medicine','Hospitalist','Emergency Medicine','Nephrology','Cardiology','Pulmonology','Neurology','Surgery','Oncology','Palliative Care','Primary Care','Pediatrics','OB/GYN','Psychiatry','Orthopedics','ICU / Critical Care','Infectious Disease','Endocrinology','GI / Hepatology','Other'];
const SETTINGS = ['Inpatient','Outpatient','Emergency Department','ICU','SNF / Rehab','Telehealth','Home Visit'];
const STYLES = [
  { value: 'concise',          label: 'Concise' },
  { value: 'standard',         label: 'Standard' },
  { value: 'detailed',         label: 'Detailed' },
  { value: 'academic',         label: 'Academic' },
  { value: 'patient_friendly', label: 'Patient-Friendly' },
];
const INSURANCE_TYPES = [
  'Medicare','Medicare Advantage','Medicaid','Blue Cross Blue Shield','UnitedHealthcare','Aetna',
  'Cigna','Humana','Kaiser Permanente','Anthem','Tricare','VA','Commercial (other)','Other',
];

const isPriorAuth = (noteType: string) => noteType.trim().toLowerCase() === 'prior auth letter';

const ClinicalNoteTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [noteType, setNoteType] = useState('SOAP');
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [setting, setSetting] = useState('Inpatient');
  const [patientAge, setPatientAge] = useState('');
  const [style, setStyle] = useState('standard');
  const [bullets, setBullets] = useState('');
  // Prior Auth fields
  const [medicationName, setMedicationName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [justification, setJustification] = useState('');
  const [insuranceType, setInsuranceType] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const priorAuth = isPriorAuth(noteType);

  const generate = async () => {
    setError('');

    if (priorAuth) {
      if (!medicationName.trim() || !diagnosis.trim()) {
        setError('Medication and diagnosis are required for a Prior Auth Letter.');
        return;
      }
    } else {
      if (!bullets.trim()) { setError('Enter bullet points first.'); return; }
    }

    setLoading(true); setResult(null); setCopied(false);

    let body: any = { note_type: noteType, style };

    if (priorAuth) {
      body.medication_name = medicationName.trim();
      body.diagnosis = diagnosis.trim();
      body.justification = justification.trim();
      body.insurance_type = insuranceType.trim();
      body.bullets = bullets.trim();
    } else {
      const contextLines: string[] = [];
      if (specialty) contextLines.push(`Specialty: ${specialty}`);
      if (setting) contextLines.push(`Setting: ${setting}`);
      if (patientAge) contextLines.push(`Patient age: ${patientAge}`);
      body.bullets = contextLines.length > 0
        ? `[Context]\n${contextLines.join('\n')}\n\n[Bullets]\n${bullets}`
        : bullets;
      body.specialty = specialty;
      body.setting = setting;
      body.patient_age = patientAge ? parseInt(patientAge) : undefined;
    }

    try {
      const res = await fetch(`${API}/tools/clinicalnote/generate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Generation failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = async () => {
    if (!result?.note) return;
    try { await navigator.clipboard.writeText(result.note); setCopied(true); setTimeout(()=>setCopied(false), 2000); }
    catch {}
  };

  return (
    <ToolShell name="ClinicalNote AI" subtitle="Turn bullet points into a complete, formatted note — or generate a prior-auth letter." onBack={onBack} icon={<span style={{fontSize:'20px', lineHeight:1}}>📝</span>}>
      <div style={CARD}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px', marginBottom:'12px'}}>
          <div>
            <div style={FIELD_LABEL}>Note type</div>
            <input list="cn-note-types" value={noteType} onChange={e=>setNoteType(e.target.value)} placeholder="Type or select" style={INPUT}/>
            <datalist id="cn-note-types">{NOTE_TYPES.map(n => <option key={n} value={n}/>)}</datalist>
          </div>
          {!priorAuth && (
            <>
              <div>
                <div style={FIELD_LABEL}>Specialty</div>
                <input list="cn-specialties" value={specialty} onChange={e=>setSpecialty(e.target.value)} placeholder="Type or select" style={INPUT}/>
                <datalist id="cn-specialties">{SPECIALTIES.map(s => <option key={s} value={s}/>)}</datalist>
              </div>
              <div>
                <div style={FIELD_LABEL}>Setting</div>
                <input list="cn-settings" value={setting} onChange={e=>setSetting(e.target.value)} placeholder="Type or select" style={INPUT}/>
                <datalist id="cn-settings">{SETTINGS.map(s => <option key={s} value={s}/>)}</datalist>
              </div>
              <div>
                <div style={FIELD_LABEL}>Patient age</div>
                <input type="text" inputMode="numeric" value={patientAge} onChange={e=>setPatientAge(e.target.value)} placeholder="years" style={INPUT}/>
              </div>
            </>
          )}
          <div>
            <div style={FIELD_LABEL}>Style</div>
            <input list="cn-styles" value={STYLES.find(s=>s.value===style)?.label || style} onChange={e=>{
              const found = STYLES.find(s=>s.label.toLowerCase()===e.target.value.toLowerCase());
              setStyle(found ? found.value : e.target.value.toLowerCase());
            }} placeholder="Type or select" style={INPUT}/>
            <datalist id="cn-styles">{STYLES.map(s => <option key={s.value} value={s.label}/>)}</datalist>
          </div>
        </div>

        {priorAuth && (
          <div style={{background:'rgba(122,176,240,0.08)', border:'1px solid rgba(122,176,240,0.25)', borderRadius:'12px', padding:'14px', marginBottom:'12px'}}>
            <div style={{fontSize:'12px', fontWeight:'700', color:'#4a7ad0', marginBottom:'10px', letterSpacing:'0.5px', textTransform:'uppercase'}}>Prior Authorization Request</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'10px', marginBottom:'10px'}}>
              <div>
                <div style={FIELD_LABEL}>Medication *</div>
                <input value={medicationName} onChange={e=>setMedicationName(e.target.value)} placeholder="e.g. Semaglutide 1 mg SubQ weekly" style={INPUT}/>
              </div>
              <div>
                <div style={FIELD_LABEL}>Diagnosis *</div>
                <input value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} placeholder="e.g. Type 2 DM (E11.9), obesity (E66.01)" style={INPUT}/>
              </div>
              <div>
                <div style={FIELD_LABEL}>Insurance</div>
                <input list="cn-insurance" value={insuranceType} onChange={e=>setInsuranceType(e.target.value)} placeholder="Type or select" style={INPUT}/>
                <datalist id="cn-insurance">{INSURANCE_TYPES.map(i => <option key={i} value={i}/>)}</datalist>
              </div>
            </div>
            <div style={FIELD_LABEL}>Clinical justification *</div>
            <div style={{display:'flex', gap:'8px', alignItems:'flex-start', marginTop:'4px'}}>
              <textarea value={justification} onChange={e=>setJustification(e.target.value)} placeholder={"A1c 9.2% despite max metformin + glipizide for 6 months. BMI 36. Contraindication to pioglitazone (CHF). Prior trial of sitagliptin (3 months) — inadequate response. Patient meets ADA criteria for GLP-1RA initiation."} style={{...INPUT, minHeight:'110px', resize:'vertical', flex:1}}/>
              <DictationButton onTranscript={t => setJustification(prev => (prev ? prev.trimEnd() + ' ' : '') + t)}/>
            </div>
          </div>
        )}

        <div style={FIELD_LABEL}>{priorAuth ? 'Additional clinical context (optional)' : 'Bullet points'}</div>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-start', marginTop:'4px'}}>
          <textarea value={bullets} onChange={e=>setBullets(e.target.value)}
            placeholder={priorAuth
              ? 'Prior trials, allergies, comorbidities, relevant labs — anything else the reviewer should see.'
              : "- 62 y/o M with HTN, DM2, CKD3\n- Chest pain x 2h, non-radiating\n- BP 160/95, HR 92, SpO2 97% RA\n- Trop neg x1, ECG NSR, BNP 300\n- Plan: admit tele, serial trops, ASA, statin"}
            style={{...INPUT, minHeight: priorAuth ? '100px' : '200px', resize:'vertical', fontFamily:'ui-monospace, monospace', flex:1}}/>
          <DictationButton onTranscript={t => setBullets(prev => (prev ? prev + '\n' : '') + t.trim())}/>
        </div>
        <button onClick={generate} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'10px'}}>
          {loading ? (priorAuth ? 'Drafting letter…' : 'Generating note…') : (priorAuth ? 'Generate prior auth letter' : 'Generate note')}
        </button>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result?.urgent_flags?.length > 0 && (
        <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'14px', padding:'14px', marginBottom:'12px'}}>
          <div style={{fontSize:'13px', fontWeight:'700', color:'#c04040', marginBottom:'6px'}}>⚠ Red flags</div>
          {result.urgent_flags.map((f: string, i: number) => <div key={i} style={{fontSize:'13px', color:'#c04040', marginBottom:'3px'}}>• {f}</div>)}
        </div>
      )}
      {result?.note && (
        <div style={CARD}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <div style={LABEL}>{noteType}{!priorAuth ? ` · ${STYLES.find(s=>s.value===style)?.label || style}` : ''}</div>
            <button onClick={copy} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'700', color:'#4a7ad0', cursor:'pointer'}}>
              {copied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>
          <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontSize:'13px', color:'#1a2a4a', lineHeight:'1.75', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>{result.note}</pre>
        </div>
      )}
      {result?.disclaimer && <div style={{fontSize:'11px', color:'#a0b0c8', textAlign:'center', padding:'6px'}}>{result.disclaimer}</div>}
    </ToolShell>
  );
};

export default ClinicalNoteTool;
