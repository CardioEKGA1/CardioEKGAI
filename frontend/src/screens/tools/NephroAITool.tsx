// © 2026 SoulMD. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';

interface Props { API: string; token: string; onBack: () => void; }
type TabId = 'aki' | 'ckd' | 'electrolytes' | 'acid_base' | 'glomerulonephritis' | 'nephrotic' | 'hypertension' | 'dialysis' | 'transplant' | 'stones';
interface Field { key: string; label: string; placeholder?: string; multiline?: boolean; type?: 'text'|'number'; options?: string[]; }

const TABS: {id: TabId; name: string; fields: Field[]}[] = [
  { id:'aki', name:'AKI', fields:[
    {key:'creatinine', label:'Current creatinine (mg/dL)', type:'number'},
    {key:'baseline_creatinine', label:'Baseline creatinine (mg/dL)', type:'number'},
    {key:'urine_output', label:'Urine output', placeholder:'0.3 mL/kg/hr x 6h'},
    {key:'clinical_context', label:'Clinical context', multiline:true},
  ]},
  { id:'ckd', name:'CKD', fields:[
    {key:'egfr', label:'eGFR (mL/min/1.73m²)', type:'number'},
    {key:'proteinuria', label:'Proteinuria (UACR or UPCR)'},
    {key:'duration', label:'Duration', placeholder:'e.g. 5 years'},
    {key:'comorbidities', label:'Comorbidities', multiline:true},
  ]},
  { id:'electrolytes', name:'Electrolytes', fields:[
    {key:'electrolyte', label:'Electrolyte', options:['Na','K','Ca','Mg','Phos']},
    {key:'value', label:'Value'},
    {key:'units', label:'Units', placeholder:'mEq/L, mg/dL, etc.'},
    {key:'clinical_context', label:'Clinical context', multiline:true},
  ]},
  { id:'acid_base', name:'Acid–Base', fields:[
    {key:'ph', label:'pH', type:'number'},
    {key:'paco2', label:'PaCO₂', type:'number'},
    {key:'pao2', label:'PaO₂', type:'number'},
    {key:'hco3', label:'HCO₃', type:'number'},
    {key:'fio2', label:'FiO₂', type:'number'},
    {key:'clinical_context', label:'Clinical context', multiline:true},
  ]},
  { id:'glomerulonephritis', name:'GN', fields:[
    {key:'urinalysis', label:'Urinalysis (dipstick + micro)', multiline:true},
    {key:'creatinine', label:'Creatinine'},
    {key:'clinical_picture', label:'Clinical picture', multiline:true},
    {key:'age', label:'Age', type:'number'},
  ]},
  { id:'nephrotic', name:'Nephrotic', fields:[
    {key:'proteinuria_level', label:'Proteinuria level'},
    {key:'albumin', label:'Serum albumin'},
    {key:'edema', label:'Edema'},
    {key:'age', label:'Age', type:'number'},
    {key:'clinical_context', label:'Clinical context', multiline:true},
  ]},
  { id:'hypertension', name:'HTN', fields:[
    {key:'bp_readings', label:'BP readings', placeholder:'avg 160/95 over 1 wk'},
    {key:'current_meds', label:'Current meds', multiline:true},
    {key:'clinical_context', label:'Clinical context', multiline:true},
  ]},
  { id:'dialysis', name:'Dialysis', fields:[
    {key:'clinical_scenario', label:'Clinical scenario', multiline:true},
    {key:'current_access', label:'Current access', placeholder:'AVF, CVC, PD catheter, none'},
    {key:'labs', label:'Labs', multiline:true},
  ]},
  { id:'transplant', name:'Transplant', fields:[
    {key:'time_post_transplant', label:'Time post-transplant'},
    {key:'creatinine_trend', label:'Creatinine trend'},
    {key:'symptoms', label:'Symptoms', multiline:true},
  ]},
  { id:'stones', name:'Stones', fields:[
    {key:'stone_composition', label:'Stone composition (if known)'},
    {key:'labs', label:'Labs', multiline:true},
    {key:'imaging_findings', label:'Imaging findings', multiline:true},
  ]},
];

const NephroAITool: React.FC<Props> = ({ API, token, onBack }) => {
  const [tab, setTab] = useState<TabId>('aki');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const currentTab = TABS.find(t => t.id === tab)!;

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/tools/nephroai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ sub_tool: tab, inputs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const switchTab = (id: TabId) => { setTab(id); setInputs({}); setResult(null); setError(''); };
  const update = (k: string, v: string) => setInputs(i => ({ ...i, [k]: v }));

  return (
    <ToolShell name="NephroAI" badge="10 conditions" subtitle="Comprehensive AI nephrology across 10 clinical conditions." onBack={onBack}>
      <div style={{display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>switchTab(t.id)} style={{background: tab===t.id ? WORDMARK : 'rgba(255,255,255,0.75)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'700', color: tab===t.id ? 'white' : '#4a7ad0', cursor:'pointer'}}>{t.name}</button>
        ))}
      </div>
      <div style={CARD}>
        <div style={LABEL}>Inputs · {currentTab.name}</div>
        {currentTab.fields.map(f => (
          <div key={f.key} style={{marginBottom:'10px'}}>
            <div style={FIELD_LABEL}>{f.label}</div>
            {f.options ? (
              <select value={inputs[f.key]||''} onChange={e=>update(f.key, e.target.value)} style={INPUT}>
                <option value="">Select…</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.multiline ? (
              <textarea value={inputs[f.key]||''} onChange={e=>update(f.key, e.target.value)} placeholder={f.placeholder||''} style={{...INPUT, minHeight:'60px', resize:'vertical'}}/>
            ) : (
              <input type={f.type||'text'} value={inputs[f.key]||''} onChange={e=>update(f.key, e.target.value)} placeholder={f.placeholder||''} style={INPUT}/>
            )}
          </div>
        ))}
        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'8px'}}>{loading ? 'Analyzing…' : 'Analyze'}</button>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default NephroAITool;
