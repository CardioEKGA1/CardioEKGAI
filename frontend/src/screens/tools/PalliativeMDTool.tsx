// © 2026 SoulMD, LLC. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';
import DictationButton from '../../DictationButton';

interface Props { API: string; token: string; onBack: () => void; }

type ConvType = 'goals_of_care' | 'prognosis' | 'code_status' | 'hospice' | 'family_meeting' | 'withdrawing_treatment' | 'pediatric';

const CONV_TYPES: {id: ConvType; label: string}[] = [
  { id: 'goals_of_care',        label: 'Goals of Care' },
  { id: 'prognosis',            label: 'Prognosis' },
  { id: 'code_status',          label: 'Code Status' },
  { id: 'hospice',              label: 'Hospice' },
  { id: 'family_meeting',       label: 'Family Meeting' },
  { id: 'withdrawing_treatment',label: 'Withdrawing Treatment' },
  { id: 'pediatric',            label: 'Pediatric' },
];

const DIAGNOSIS_OPTIONS = [
  'Cancer — metastatic solid tumor','Cancer — hematologic malignancy','Cancer — in remission',
  'Advanced heart failure (NYHA IV)','Advanced COPD / end-stage lung disease','Pulmonary fibrosis',
  'Advanced dementia (FAST 7)','Early/moderate dementia','Alzheimer disease','Lewy body dementia',
  'ALS / motor neuron disease','Parkinson disease — advanced','Huntington disease',
  'End-stage liver disease / cirrhosis','End-stage renal disease','Frailty / multimorbidity',
  'Stroke — devastating','Stroke — recovering','Anoxic brain injury','Traumatic brain injury',
  'Advanced HIV / AIDS','Progressive multisystem failure','Pediatric neurological — severe',
  'Cystic fibrosis — advanced','Pulmonary hypertension','Congenital heart disease — adult',
  'Other',
];

const PROGNOSIS_OPTIONS = [
  'Hours to days','Days to weeks','Weeks to months','1-3 months','3-6 months','6-12 months','>12 months','Uncertain / cannot predict',
];

const CODE_STATUS_OPTIONS = [
  'Full code','DNR (no CPR)','DNI (no intubation)','DNR / DNI','Comfort measures only (CMO)','Limited interventions — specify','Unknown / not yet discussed',
];

const FUNCTIONAL_STATUS_OPTIONS = [
  'Fully independent (ECOG 0 / KPS 90-100)','Mildly symptomatic (ECOG 1 / KPS 80)','Symptomatic, <50% in bed (ECOG 2 / KPS 60-70)','Symptomatic, >50% in bed (ECOG 3 / KPS 40-50)','Bedbound (ECOG 4 / KPS 10-30)','Moribund (KPS ≤ 20)','PPS 70%','PPS 50%','PPS 30%','PPS ≤ 20%',
];

const TEMPLATE_FIELDS: {key: string; label: string; listId?: string; options?: string[]; placeholder?: string}[] = [
  { key: 'patient_age',       label: 'Patient age', placeholder: 'e.g. 78' },
  { key: 'diagnosis',         label: 'Diagnosis', listId: 'palli-diagnosis', options: DIAGNOSIS_OPTIONS, placeholder: 'Type or select' },
  { key: 'prognosis',         label: 'Prognosis', listId: 'palli-prognosis', options: PROGNOSIS_OPTIONS, placeholder: 'Type or select' },
  { key: 'code_status',       label: 'Current code status', listId: 'palli-code', options: CODE_STATUS_OPTIONS, placeholder: 'Type or select' },
  { key: 'functional_status', label: 'Functional status', listId: 'palli-func', options: FUNCTIONAL_STATUS_OPTIONS, placeholder: 'Type or select' },
  { key: 'family_context',    label: 'Family / surrogate situation', placeholder: 'e.g. daughter is HCPOA, wants everything done' },
  { key: 'known_wishes',      label: "Patient's known wishes", placeholder: 'e.g. has advance directive, did not want vent' },
  { key: 'conversation_goal', label: 'Clinical question / conversation goal', placeholder: 'e.g. align family on comfort-focused plan' },
  { key: 'cultural_context',  label: 'Cultural or spiritual context (optional)', placeholder: 'e.g. devout Catholic family, chaplain involved' },
];

const WARM_BG = 'linear-gradient(135deg, rgba(255,230,210,0.35), rgba(240,220,240,0.35))';

const PalliativeMDTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [convType, setConvType] = useState<ConvType>('goals_of_care');
  const [text, setText] = useState('');
  const [template, setTemplate] = useState<Record<string, string>>({});
  const [templateOpen, setTemplateOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const updateField = (k: string, v: string) => setTemplate(t => ({ ...t, [k]: v }));

  const analyze = async () => {
    if (!text.trim()) { setError('Describe the case first (type or dictate).'); return; }
    setLoading(true); setError(''); setResult(null);
    const body: any = { conversation_type: convType, text };
    for (const f of TEMPLATE_FIELDS) {
      const v = (template[f.key] || '').trim();
      if (v) body[f.key] = v;
    }
    try {
      const res = await fetch(`${API}/tools/palliativemd/analyze`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Guidance failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ToolShell name="PalliativeMD" subtitle="Compassionate AI guidance for difficult conversations." onBack={onBack} icon={<span style={{fontSize:'20px', lineHeight:1}}>🕊️</span>}>
      <div style={{display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap'}}>
        {CONV_TYPES.map(c => (
          <button key={c.id} onClick={()=>{ setConvType(c.id); setResult(null); }} style={{background: convType===c.id ? WORDMARK : 'rgba(255,255,255,0.75)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'600', color: convType===c.id ? 'white' : '#4a7ad0', cursor:'pointer'}}>{c.label}</button>
        ))}
      </div>

      <div style={{...CARD, background: WARM_BG}}>
        <div style={LABEL}>Describe the case</div>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
          <textarea
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder="e.g. 78 y/o with metastatic pancreatic ca, hospice discussed but family wants 'everything done'. Patient has capacity, says she's tired. Need to align family on patient's wishes tomorrow morning."
            style={{...INPUT, minHeight:'160px', resize:'vertical', lineHeight:'1.6', flex:1}}
          />
          <DictationButton onTranscript={t => setText(prev => (prev ? prev.trimEnd() + ' ' : '') + t)}/>
        </div>

        <button onClick={()=>setTemplateOpen(v=>!v)} style={{background:'transparent', border:'none', color:'#4a7ad0', fontSize:'12px', fontWeight:'700', cursor:'pointer', padding:'4px 0', marginTop:'10px'}}>
          {templateOpen ? '▾ Hide case template' : '▸ Fill case template (recommended)'}
        </button>

        {templateOpen && (
          <>
            <datalist id="palli-diagnosis">{DIAGNOSIS_OPTIONS.map(o => <option key={o} value={o}/>)}</datalist>
            <datalist id="palli-prognosis">{PROGNOSIS_OPTIONS.map(o => <option key={o} value={o}/>)}</datalist>
            <datalist id="palli-code">{CODE_STATUS_OPTIONS.map(o => <option key={o} value={o}/>)}</datalist>
            <datalist id="palli-func">{FUNCTIONAL_STATUS_OPTIONS.map(o => <option key={o} value={o}/>)}</datalist>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'10px', marginTop:'10px'}}>
              {TEMPLATE_FIELDS.map(f => (
                <div key={f.key}>
                  <div style={FIELD_LABEL}>{f.label}</div>
                  <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                    <input
                      list={f.listId}
                      value={template[f.key]||''}
                      onChange={e=>updateField(f.key, e.target.value)}
                      placeholder={f.placeholder||''}
                      style={{...INPUT, flex:1}}
                    />
                    <DictationButton size={28} onTranscript={t => updateField(f.key, (template[f.key]||'') + t)}/>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={analyze} disabled={loading || !text.trim()} style={{...BTN_PRIMARY, width:'100%', marginTop:'14px', opacity: (loading || !text.trim()) ? 0.6 : 1}}>
          {loading ? 'Generating guidance…' : 'Get conversation guidance'}
        </button>
      </div>

      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default PalliativeMDTool;
