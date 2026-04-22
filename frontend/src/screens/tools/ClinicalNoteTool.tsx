// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ToolShell, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';
import DictationButton from '../../DictationButton';
import { notifyTrialUsed } from '../../trialHelpers';

interface Props { API: string; token: string; onBack: () => void; }

type TabId = 'soap' | 'hp' | 'discharge' | 'consult' | 'procedure' | 'prior_auth' | 'settings';

interface FieldDef { key: string; label: string; kind: 'short' | 'long' | 'select'; placeholder?: string; options?: string[]; }

interface TabConfig { id: TabId; label: string; icon: string; noteType: string; blurb: string; fields: FieldDef[]; }

const TABS: TabConfig[] = [
  {
    id: 'soap', label: 'SOAP', icon: '📝', noteType: 'SOAP note',
    blurb: 'Subjective, Objective, Assessment, Plan — expanded from your bullets.',
    fields: [
      { key: 'specialty',   label: 'Specialty',    kind: 'short', placeholder: 'Internal Medicine, Cardiology…' },
      { key: 'setting',     label: 'Setting',      kind: 'short', placeholder: 'Inpatient, ED, Clinic…' },
      { key: 'patient_age', label: 'Patient age',  kind: 'short', placeholder: 'years' },
      { key: 'bullets',     label: 'Bullet points', kind: 'long',
        placeholder: '- 62 y/o M with HTN, DM2, CKD3\n- Chest pain x 2h, non-radiating\n- BP 160/95, HR 92, SpO2 97% RA\n- Trop neg x1, ECG NSR, BNP 300\n- Plan: admit tele, serial trops, ASA, statin' },
    ],
  },
  {
    id: 'hp', label: 'H&P', icon: '🩺', noteType: 'H&P (History and Physical)',
    blurb: 'Full admission H&P — structure is generated for you.',
    fields: [
      { key: 'cc',         label: 'Chief complaint',  kind: 'short', placeholder: 'Chest pain' },
      { key: 'hpi',        label: 'HPI',              kind: 'long',  placeholder: 'Onset, character, timing, associated symptoms, prior workup…' },
      { key: 'pmh',        label: 'PMH / PSH',        kind: 'long',  placeholder: 'HTN (2010), DM2 (2012) on metformin, CABG 2019…' },
      { key: 'medications',label: 'Medications',      kind: 'long',  placeholder: 'Lisinopril 20 mg QD, metformin 1000 mg BID…' },
      { key: 'allergies',  label: 'Allergies',        kind: 'short', placeholder: 'Penicillin (rash), NKDA' },
      { key: 'social',     label: 'Social / Family',  kind: 'long',  placeholder: 'Tobacco 20 pack-year, father MI at 55…' },
      { key: 'ros',        label: 'ROS',              kind: 'long',  placeholder: 'CV: as per HPI. Resp: mild DOE. All others negative.' },
      { key: 'exam',       label: 'Vitals & Exam',    kind: 'long',  placeholder: 'BP 148/86, HR 96. Gen: alert, NAD. Heart: RRR no MRG…' },
      { key: 'data',       label: 'Data (labs/imaging)', kind: 'long', placeholder: 'Trop 0.08, BNP 412, Cr 1.4. CXR clear. ECG NSR w/ LAE.' },
    ],
  },
  {
    id: 'discharge', label: 'Discharge', icon: '🏠', noteType: 'Discharge summary',
    blurb: 'Full discharge summary plus a patient-friendly plain-language version.',
    fields: [
      { key: 'patient',          label: 'Patient',               kind: 'short', placeholder: '68 y/o F' },
      { key: 'admit_dx',         label: 'Admission diagnosis',   kind: 'short', placeholder: 'Acute decompensated CHF' },
      { key: 'hospital_course',  label: 'Hospital course',       kind: 'long',  placeholder: '- Admitted with dyspnea, BNP 2800\n- IV Lasix → 4L net-neg over 3 days\n- Uptitrated metoprolol…' },
      { key: 'discharge_cond',   label: 'Discharge condition',   kind: 'short', placeholder: 'Stable, ambulating, room air' },
      { key: 'discharge_meds',   label: 'Discharge medications', kind: 'long',  placeholder: 'Furosemide 40 mg BID, metoprolol succ 50 mg QD, lisinopril 10 mg QD…' },
      { key: 'followup',         label: 'Follow-up instructions', kind: 'long', placeholder: 'Cardiology clinic in 1 week. Daily weights — call if >2 lbs overnight. Return for dyspnea, CP…' },
    ],
  },
  {
    id: 'consult', label: 'Consult', icon: '📨', noteType: 'Consult request',
    blurb: 'Professional consult request — tone adapts to the specialty.',
    fields: [
      { key: 'to_specialty',   label: 'Consulting specialty', kind: 'short', placeholder: 'Cardiology, General Surgery, Neurology…' },
      { key: 'urgency',        label: 'Urgency',              kind: 'select', options: ['Routine', 'Urgent', 'Emergent'] },
      { key: 'reason',         label: 'Reason for consult',   kind: 'short', placeholder: 'Rule out ACS vs. unstable angina' },
      { key: 'relevant_hx',    label: 'Relevant history',     kind: 'long',  placeholder: 'PMH, recent workup, current meds, key findings…' },
      { key: 'question',       label: 'Specific clinical question', kind: 'long', placeholder: 'Recommend re: stress test vs. cath given rising troponin and new T-wave inversions.' },
    ],
  },
  {
    id: 'procedure', label: 'Procedure', icon: '🔬', noteType: 'Procedure note',
    blurb: 'Complete procedure note with standard sections.',
    fields: [
      { key: 'procedure',      label: 'Procedure',      kind: 'short', placeholder: 'Central venous catheter placement, right IJ' },
      { key: 'indication',     label: 'Indication',     kind: 'short', placeholder: 'Vasopressor access for septic shock' },
      { key: 'consent',        label: 'Consent',        kind: 'short', placeholder: 'Informed consent obtained; risks/benefits/alts discussed' },
      { key: 'technique',      label: 'Technique',      kind: 'long',  placeholder: '- Time-out\n- Sterile prep/drape\n- Ultrasound-guided access\n- Seldinger technique\n- 8.5 Fr TLC placed…' },
      { key: 'findings',       label: 'Findings',       kind: 'short', placeholder: 'Good blood return all ports, no immediate complications' },
      { key: 'complications',  label: 'Complications',  kind: 'short', placeholder: 'None' },
      { key: 'plan',           label: 'Plan',           kind: 'short', placeholder: 'CXR to confirm placement, begin pressors' },
    ],
  },
  {
    id: 'prior_auth', label: 'Prior Auth', icon: '🗂️', noteType: 'Prior Auth Letter',
    blurb: 'Formal prior authorization letter with medical-necessity argument and guideline citations.',
    fields: [
      { key: 'medication_name', label: 'Medication *',         kind: 'short', placeholder: 'Semaglutide 1 mg SubQ weekly' },
      { key: 'diagnosis',       label: 'Diagnosis *',          kind: 'short', placeholder: 'Type 2 DM (E11.9), obesity (E66.01)' },
      { key: 'insurance_type',  label: 'Insurance',            kind: 'short', placeholder: 'Blue Cross Blue Shield' },
      { key: 'justification',   label: 'Clinical justification *', kind: 'long',
        placeholder: 'A1c 9.2% despite max metformin + glipizide for 6 months. BMI 36. Contraindication to pioglitazone (CHF). Prior trial of sitagliptin (3 months) — inadequate response. Patient meets ADA criteria for GLP-1RA initiation.' },
      { key: 'bullets',         label: 'Additional clinical context', kind: 'long',
        placeholder: 'Prior trials, allergies, comorbidities, relevant labs — anything else the reviewer should see.' },
    ],
  },
];

const STYLES = [
  { value: 'concise',   label: 'Concise',   desc: 'Bullet-point heavy, minimal prose' },
  { value: 'narrative', label: 'Narrative', desc: 'Full paragraph style' },
  { value: 'academic',  label: 'Academic',  desc: 'Formal, detailed' },
  { value: 'emergency', label: 'Emergency', desc: 'Ultra-brief, action-focused' },
  { value: 'my_style',  label: 'My Style',  desc: 'Learned from your own notes' },
];

interface StyleProfilePayload { has_profile: boolean; profile_text: string; sample_count: number; updated_at: string | null; created_at: string | null; }

const ClinicalNoteTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [tab, setTab] = useState<TabId>('soap');
  const [values, setValues] = useState<Record<string, string>>({});
  const [style, setStyle] = useState('narrative');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [styleProfile, setStyleProfile] = useState<StyleProfilePayload | null>(null);
  const [samples, setSamples] = useState('');
  const [learning, setLearning] = useState(false);
  const [styleMsg, setStyleMsg] = useState('');

  const currentTab = useMemo(() => TABS.find(t => t.id === tab) || TABS[0], [tab]);

  const loadProfile = useCallback(() => {
    fetch(`${API}/tools/clinicalnote/style`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStyleProfile(d))
      .catch(() => {});
  }, [API, token]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const setField = (key: string, v: string) => setValues(prev => ({ ...prev, [key]: v }));

  const generate = async () => {
    setError(''); setResult(null); setCopied(false);
    if (tab === 'prior_auth') {
      if (!values.medication_name?.trim() || !values.diagnosis?.trim() || !values.justification?.trim()) {
        setError('Medication, diagnosis, and clinical justification are required for a Prior Auth Letter.');
        return;
      }
    } else {
      const hasContent = currentTab.fields.some(f => (values[f.key] || '').trim());
      if (!hasContent) { setError('Fill in at least one field.'); return; }
    }

    let body: any = { note_type: currentTab.noteType, style };

    if (tab === 'prior_auth') {
      body.medication_name = (values.medication_name || '').trim();
      body.diagnosis = (values.diagnosis || '').trim();
      body.justification = (values.justification || '').trim();
      body.insurance_type = (values.insurance_type || '').trim();
      body.bullets = (values.bullets || '').trim();
    } else {
      const lines: string[] = [];
      for (const f of currentTab.fields) {
        const v = (values[f.key] || '').trim();
        if (v) lines.push(`[${f.label}]\n${v}`);
      }
      body.bullets = lines.join('\n\n');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/tools/clinicalnote/generate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Generation failed');
      setResult(data);
      if (data._trial_mode) notifyTrialUsed('clinicalnote');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = async () => {
    if (!result?.note) return;
    try { await navigator.clipboard.writeText(result.note); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch {}
  };

  // ───── Style learning actions ─────
  const learnStyle = async () => {
    setStyleMsg('');
    if (samples.trim().length < 200) { setStyleMsg('Paste at least ~200 characters of your own notes (ideally 3-5 full notes).'); return; }
    setLearning(true);
    try {
      const res = await fetch(`${API}/tools/clinicalnote/style/learn`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ samples }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Style learning failed');
      setStyleProfile(data);
      setSamples('');
      setStyleMsg('Style learned. Select "My Style" on any note tab to use it.');
    } catch (e: any) { setStyleMsg(e.message); }
    finally { setLearning(false); }
  };

  const saveEditedProfile = async () => {
    if (!styleProfile) return;
    setStyleMsg('');
    try {
      const res = await fetch(`${API}/tools/clinicalnote/style`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ profile_text: styleProfile.profile_text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      setStyleProfile(data);
      setStyleMsg('Saved.');
    } catch (e: any) { setStyleMsg(e.message); }
  };

  const deleteProfile = async () => {
    if (!window.confirm('Delete your learned style profile? You can always re-learn from new samples.')) return;
    try {
      const res = await fetch(`${API}/tools/clinicalnote/style`, {
        method: 'DELETE',
        headers: { Authorization:`Bearer ${token}` },
      });
      const data = await res.json();
      setStyleProfile(data);
      setStyleMsg('Style profile cleared.');
    } catch {}
  };

  // ───── Derived ─────
  const styleActive = style === 'my_style';
  const myStyleAvailable = !!styleProfile?.has_profile;
  const wordCount = result?.note ? (result.note.match(/\b\w+\b/g) || []).length : 0;
  const charCount = result?.note ? result.note.length : 0;

  return (
    <ToolShell
      name="ClinicalNote AI"
      subtitle="AI that writes clinical notes in your voice — SOAP, H&P, discharge, consult, procedure, prior-auth — with style learning that adapts to how you write."
      onBack={onBack}
      icon={<span style={{fontSize:'20px', lineHeight:1}}>📝</span>}
    >
      {/* Tab bar */}
      <div style={{display:'flex', gap:'6px', marginBottom:'14px', overflowX:'auto', paddingBottom:'4px'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(''); }}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'9px 14px', borderRadius:'999px', fontSize:'12px',
              fontWeight: tab === t.id ? 700 : 600,
              border: tab === t.id ? 'none' : '1px solid rgba(122,176,240,0.3)',
              background: tab === t.id ? WORDMARK : 'rgba(255,255,255,0.75)',
              color: tab === t.id ? 'white' : '#4a7ad0',
              cursor: 'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:'inherit',
            }}>
            <span style={{fontSize:'14px'}}>{t.icon}</span>{t.label}
          </button>
        ))}
        <button onClick={() => { setTab('settings'); setResult(null); setError(''); setStyleMsg(''); }}
          title="My Style settings"
          style={{
            padding:'9px 12px', borderRadius:'999px', fontSize:'14px',
            fontWeight: tab === 'settings' ? 700 : 600,
            border: tab === 'settings' ? 'none' : '1px solid rgba(122,176,240,0.3)',
            background: tab === 'settings' ? WORDMARK : 'rgba(255,255,255,0.75)',
            color: tab === 'settings' ? 'white' : '#4a7ad0',
            cursor: 'pointer', flexShrink:0, marginLeft:'auto',
          }}>⚙</button>
      </div>

      {tab === 'settings' ? (
        <MyStylePanel
          profile={styleProfile}
          samples={samples}
          setSamples={setSamples}
          onLearn={learnStyle}
          onSave={saveEditedProfile}
          onDelete={deleteProfile}
          onEdit={(t) => setStyleProfile(prev => prev ? { ...prev, profile_text: t } : prev)}
          learning={learning}
          message={styleMsg}
        />
      ) : (
        <>
          {/* Dynamic form + style selector */}
          <div style={CARD}>
            <div style={{fontSize:'12px', color:'#6a8ab0', marginBottom:'12px', lineHeight:1.5}}>{currentTab.blurb}</div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'10px', marginBottom:'10px'}}>
              {currentTab.fields.filter(f => f.kind === 'short' || f.kind === 'select').map(f => (
                <div key={f.key}>
                  <div style={FIELD_LABEL}>{f.label}</div>
                  {f.kind === 'select' ? (
                    <select value={values[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={{...INPUT, appearance:'auto'}}>
                      <option value="">—</option>
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={values[f.key] || ''} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder} style={INPUT}/>
                  )}
                </div>
              ))}
            </div>

            {currentTab.fields.filter(f => f.kind === 'long').map(f => (
              <div key={f.key} style={{marginBottom:'10px'}}>
                <div style={FIELD_LABEL}>{f.label}</div>
                <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
                  <textarea value={values[f.key] || ''} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder}
                    style={{...INPUT, minHeight: '110px', resize:'vertical', fontFamily:'ui-monospace, monospace', flex:1}}/>
                  <DictationButton onTranscript={t => setField(f.key, (values[f.key] ? values[f.key].trimEnd() + ' ' : '') + t.trim())}/>
                </div>
              </div>
            ))}

            {/* Style selector (hidden for Prior Auth — that uses a fixed formal letter format) */}
            {tab !== 'prior_auth' && (
              <div style={{marginTop:'8px', display:'flex', flexWrap:'wrap', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'12px', background:'rgba(122,176,240,0.08)', border:'1px solid rgba(122,176,240,0.2)'}}>
                <div style={{fontSize:'11px', fontWeight:700, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase'}}>Style</div>
                <select value={style} onChange={e => setStyle(e.target.value)} style={{...INPUT, width:'auto', minWidth:'180px', padding:'7px 10px'}}>
                  {STYLES.map(s => (
                    <option key={s.value} value={s.value} disabled={s.value === 'my_style' && !myStyleAvailable}>
                      {s.label}{s.value === 'my_style' && !myStyleAvailable ? ' (not set — see ⚙)' : ''} — {s.desc}
                    </option>
                  ))}
                </select>
                {styleActive && myStyleAvailable && (
                  <span style={{fontSize:'10px', fontWeight:700, background:WORDMARK, color:'white', borderRadius:'999px', padding:'3px 9px', letterSpacing:'0.4px', textTransform:'uppercase'}}>
                    My Style (learned)
                  </span>
                )}
              </div>
            )}

            <button onClick={generate} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'12px'}}>
              {loading ? (tab === 'prior_auth' ? 'Drafting letter…' : 'Generating note…') : (tab === 'prior_auth' ? 'Generate prior auth letter' : `Generate ${currentTab.label} note`)}
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
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexWrap:'wrap', gap:'8px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                  <div style={LABEL}>{currentTab.noteType}{tab !== 'prior_auth' ? ` · ${STYLES.find(s => s.value === style)?.label || style}` : ''}</div>
                  <span style={{fontSize:'11px', color:'#6a8ab0'}}>{wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars</span>
                </div>
                <button onClick={copy} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'700', color:'#4a7ad0', cursor:'pointer'}}>
                  {copied ? '✓ Copied' : 'Copy to clipboard'}
                </button>
              </div>
              <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontSize:'13px', color:'#1a2a4a', lineHeight:'1.75', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>{result.note}</pre>
            </div>
          )}
          {result?.disclaimer && <div style={{fontSize:'11px', color:'#a0b0c8', textAlign:'center', padding:'6px'}}>{result.disclaimer}</div>}
        </>
      )}
    </ToolShell>
  );
};

// ───────── My Style panel ─────────

const MyStylePanel: React.FC<{
  profile: StyleProfilePayload | null;
  samples: string;
  setSamples: (s: string) => void;
  onLearn: () => void;
  onSave: () => void;
  onDelete: () => void;
  onEdit: (t: string) => void;
  learning: boolean;
  message: string;
}> = ({ profile, samples, setSamples, onLearn, onSave, onDelete, onEdit, learning, message }) => {
  const has = !!profile?.has_profile;
  return (
    <>
      <div style={CARD}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px'}}>
          <span style={{fontSize:'22px'}}>✍️</span>
          <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a'}}>My Style</div>
          {has && <span style={{fontSize:'10px', fontWeight:700, background:WORDMARK, color:'white', borderRadius:'999px', padding:'3px 9px', letterSpacing:'0.4px', textTransform:'uppercase'}}>Active</span>}
        </div>
        <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.6, marginBottom:'14px'}}>
          Paste 3-5 of your own prior notes below. Claude will analyze your sentence structure, abbreviations, assessment/plan organization, and distinctive phrasing — and save a style profile. Pick "My Style" on any note tab to generate future notes in your exact voice.
        </div>

        {has && profile && (
          <div style={{background:'rgba(122,176,240,0.08)', border:'1px solid rgba(122,176,240,0.2)', borderRadius:'12px', padding:'12px', marginBottom:'14px'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', flexWrap:'wrap', marginBottom:'8px'}}>
              <div style={{fontSize:'11px', fontWeight:700, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase'}}>Your learned style profile</div>
              <div style={{fontSize:'11px', color:'#6a8ab0'}}>
                {profile.sample_count ? `${profile.sample_count} sample${profile.sample_count === 1 ? '' : 's'}` : 'edited manually'}
                {profile.updated_at && ` · updated ${new Date(profile.updated_at).toLocaleDateString()}`}
              </div>
            </div>
            <textarea value={profile.profile_text} onChange={e => onEdit(e.target.value)}
              style={{...INPUT, minHeight:'140px', resize:'vertical', fontFamily:'ui-monospace, monospace', fontSize:'12px', lineHeight:1.55}}/>
            <div style={{display:'flex', gap:'8px', marginTop:'8px', flexWrap:'wrap'}}>
              <button onClick={onSave} style={{...BTN_PRIMARY, padding:'8px 14px', fontSize:'12px'}}>Save edits</button>
              <button onClick={onDelete} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:'700', color:'#c04040', cursor:'pointer'}}>Delete profile</button>
            </div>
          </div>
        )}

        <div style={FIELD_LABEL}>{has ? 'Re-learn from new samples' : 'Paste 3-5 of your own prior notes'}</div>
        <textarea value={samples} onChange={e => setSamples(e.target.value)}
          placeholder={`Note 1\n—————\n[Paste an actual note you wrote]\n\nNote 2\n—————\n[Paste another]\n\nNote 3\n—————\n[...]`}
          style={{...INPUT, minHeight:'180px', resize:'vertical', fontFamily:'ui-monospace, monospace'}}/>
        <div style={{fontSize:'11px', color:'#8aa0c0', marginTop:'4px'}}>
          De-identify as needed — don't include real patient names, MRNs, or dates of birth.
        </div>

        <button onClick={onLearn} disabled={learning} style={{...BTN_PRIMARY, width:'100%', marginTop:'10px', opacity: learning ? 0.6 : 1}}>
          {learning ? 'Analyzing your style…' : (has ? 'Update my style from new samples' : 'Learn my style')}
        </button>

        {message && (
          <div style={{marginTop:'10px', padding:'10px 12px', borderRadius:'10px', fontSize:'12px', background: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') || message.toLowerCase().includes('paste at least') ? 'rgba(224,80,80,0.08)' : 'rgba(112,184,112,0.1)', color: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') || message.toLowerCase().includes('paste at least') ? '#a02020' : '#2a7a2a'}}>
            {message}
          </div>
        )}
      </div>
    </>
  );
};

export default ClinicalNoteTool;
