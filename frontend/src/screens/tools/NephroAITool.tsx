// © 2026 SoulMD, LLC. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';
import DictationButton from '../../DictationButton';
import SmartUnitInput, { Unit } from '../../SmartUnitInput';

interface Props { API: string; token: string; onBack: () => void; }

type TabId = 'aki' | 'ckd' | 'electrolytes' | 'acid_base' | 'glomerulonephritis' | 'nephrotic' | 'hypertension' | 'dialysis' | 'transplant' | 'stones';

type FieldType = 'text' | 'number' | 'multiline' | 'smart_unit' | 'combobox';
interface Field {
  key: string;
  label: string;
  placeholder?: string;
  type?: FieldType;
  options?: string[];
  units?: Unit[];
  defaultUnit?: string;
}

const U = {
  creatinine:    [{label:'mg/dL',perBase:1},{label:'μmol/L',perBase:88.4}] as Unit[],
  bun_urea:      [{label:'mg/dL',perBase:1},{label:'mmol/L',perBase:0.357}] as Unit[],
  egfr:          [{label:'mL/min/1.73m²',perBase:1},{label:'mL/min',perBase:1}] as Unit[],
  proteinuria:   [{label:'mg/day',perBase:1},{label:'g/day',perBase:0.001},{label:'mg/g Cr'},{label:'g/g Cr'}] as Unit[],
  sodium:        [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}] as Unit[],
  potassium:     [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}] as Unit[],
  calcium:       [{label:'mg/dL',perBase:1},{label:'mmol/L',perBase:0.2495},{label:'mEq/L',perBase:0.499}] as Unit[],
  magnesium:     [{label:'mg/dL',perBase:1},{label:'mmol/L',perBase:0.4114},{label:'mEq/L',perBase:0.8228}] as Unit[],
  phosphorus:    [{label:'mg/dL',perBase:1},{label:'mmol/L',perBase:0.3229}] as Unit[],
  bicarbonate:   [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}] as Unit[],
  chloride:      [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}] as Unit[],
  paco2:         [{label:'mmHg',perBase:1},{label:'kPa',perBase:0.133}] as Unit[],
  pao2:          [{label:'mmHg',perBase:1},{label:'kPa',perBase:0.133}] as Unit[],
  hco3:          [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}] as Unit[],
  fio2:          [{label:'fraction',perBase:1},{label:'%',perBase:100}] as Unit[],
  base_excess:   [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}] as Unit[],
  albumin:       [{label:'g/dL',perBase:1},{label:'g/L',perBase:10}] as Unit[],
  cholesterol:   [{label:'mg/dL',perBase:1},{label:'mmol/L',perBase:0.0259}] as Unit[],
  c3_c4:         [{label:'mg/dL',perBase:1},{label:'g/L',perBase:0.01}] as Unit[],
  urine_output:  [{label:'mL/kg/hr'},{label:'mL/hr'},{label:'L/day'}] as Unit[],
  uric_acid:     [{label:'mg/dL',perBase:1},{label:'μmol/L',perBase:59.48}] as Unit[],
  tacrolimus:    [{label:'ng/mL',perBase:1},{label:'μg/L',perBase:1}] as Unit[],
  cyclosporine:  [{label:'ng/mL',perBase:1},{label:'μg/L',perBase:1}] as Unit[],
  urine24_mass:  [{label:'mg/day',perBase:1},{label:'mmol/day'}] as Unit[],
  urine_volume:  [{label:'L/day',perBase:1},{label:'mL/day',perBase:1000}] as Unit[],
  weight:        [{label:'kg',perBase:1},{label:'lbs',perBase:2.2046}] as Unit[],
};

const ELECTROLYTE_UNITS: Record<string, Unit[]> = {
  'Sodium': U.sodium, 'Potassium': U.potassium, 'Calcium': U.calcium,
  'Magnesium': U.magnesium, 'Phosphorus': U.phosphorus, 'Bicarbonate': U.bicarbonate, 'Chloride': U.chloride,
};

const TABS: {id: TabId; name: string; fields: Field[]}[] = [
  { id:'aki', name:'AKI', fields:[
    {key:'creatinine', label:'Current creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'baseline_creatinine', label:'Baseline creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'urine_output', label:'Urine output', type:'smart_unit', units:U.urine_output, defaultUnit:'mL/kg/hr', placeholder:'0.3'},
    {key:'bun', label:'BUN / Urea', type:'smart_unit', units:U.bun_urea, defaultUnit:'mg/dL'},
    {key:'clinical_context', label:'Clinical context', type:'multiline'},
  ]},
  { id:'ckd', name:'CKD', fields:[
    {key:'egfr', label:'eGFR', type:'smart_unit', units:U.egfr, defaultUnit:'mL/min/1.73m²'},
    {key:'proteinuria', label:'Proteinuria', type:'smart_unit', units:U.proteinuria, defaultUnit:'mg/g Cr'},
    {key:'creatinine', label:'Creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'duration', label:'Duration', placeholder:'e.g. 5 years'},
    {key:'comorbidities', label:'Comorbidities', type:'multiline'},
  ]},
  { id:'electrolytes', name:'Electrolytes', fields:[
    {key:'electrolyte', label:'Electrolyte', type:'combobox', options:['Sodium','Potassium','Calcium','Magnesium','Phosphorus','Bicarbonate','Chloride']},
    // value field is rendered dynamically with units matched to electrolyte choice
    {key:'clinical_context', label:'Clinical context', type:'multiline'},
  ]},
  { id:'acid_base', name:'Acid-Base', fields:[
    {key:'ph', label:'pH', type:'number', placeholder:'7.40'},
    {key:'paco2', label:'PaCO₂', type:'smart_unit', units:U.paco2, defaultUnit:'mmHg'},
    {key:'pao2', label:'PaO₂', type:'smart_unit', units:U.pao2, defaultUnit:'mmHg'},
    {key:'hco3', label:'HCO₃', type:'smart_unit', units:U.hco3, defaultUnit:'mEq/L'},
    {key:'fio2', label:'FiO₂', type:'smart_unit', units:U.fio2, defaultUnit:'fraction', placeholder:'0.21'},
    {key:'base_excess', label:'Base excess', type:'smart_unit', units:U.base_excess, defaultUnit:'mEq/L'},
    {key:'clinical_context', label:'Clinical context', type:'multiline'},
  ]},
  { id:'glomerulonephritis', name:'GN', fields:[
    {key:'creatinine', label:'Creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'proteinuria', label:'Proteinuria', type:'smart_unit', units:U.proteinuria, defaultUnit:'g/day'},
    {key:'c3', label:'C3', type:'smart_unit', units:U.c3_c4, defaultUnit:'mg/dL'},
    {key:'c4', label:'C4', type:'smart_unit', units:U.c3_c4, defaultUnit:'mg/dL'},
    {key:'urinalysis', label:'Urinalysis (dipstick + micro)', type:'multiline'},
    {key:'clinical_picture', label:'Clinical picture', type:'multiline'},
    {key:'age', label:'Age', type:'number'},
  ]},
  { id:'nephrotic', name:'Nephrotic', fields:[
    {key:'proteinuria_level', label:'Proteinuria', type:'smart_unit', units:U.proteinuria, defaultUnit:'g/day'},
    {key:'albumin', label:'Serum albumin', type:'smart_unit', units:U.albumin, defaultUnit:'g/dL'},
    {key:'cholesterol', label:'Cholesterol', type:'smart_unit', units:U.cholesterol, defaultUnit:'mg/dL'},
    {key:'edema', label:'Edema', placeholder:'e.g. pitting, anasarca, periorbital'},
    {key:'age', label:'Age', type:'number'},
    {key:'clinical_context', label:'Clinical context', type:'multiline'},
  ]},
  { id:'hypertension', name:'HTN', fields:[
    {key:'bp_systolic', label:'Systolic BP (mmHg)', type:'number'},
    {key:'bp_diastolic', label:'Diastolic BP (mmHg)', type:'number'},
    {key:'creatinine', label:'Creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'potassium', label:'Potassium', type:'smart_unit', units:U.potassium, defaultUnit:'mEq/L'},
    {key:'current_meds', label:'Current meds', type:'multiline'},
    {key:'clinical_context', label:'Clinical context', type:'multiline'},
  ]},
  { id:'dialysis', name:'Dialysis', fields:[
    {key:'bun', label:'BUN', type:'smart_unit', units:U.bun_urea, defaultUnit:'mg/dL'},
    {key:'creatinine', label:'Creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'ktv', label:'Kt/V', type:'number'},
    {key:'current_access', label:'Current access', type:'combobox', options:['AVF','AVG','Tunneled catheter (CVC)','Temporary catheter','PD catheter','None']},
    {key:'clinical_scenario', label:'Clinical scenario', type:'multiline'},
    {key:'labs', label:'Additional labs', type:'multiline'},
  ]},
  { id:'transplant', name:'Transplant', fields:[
    {key:'time_post_transplant', label:'Time post-transplant', placeholder:'e.g. 14 days, 3 months, 5 years'},
    {key:'creatinine', label:'Current creatinine', type:'smart_unit', units:U.creatinine, defaultUnit:'mg/dL'},
    {key:'creatinine_trend', label:'Creatinine trend', placeholder:'baseline → peak → current'},
    {key:'tacrolimus', label:'Tacrolimus level', type:'smart_unit', units:U.tacrolimus, defaultUnit:'ng/mL'},
    {key:'cyclosporine', label:'Cyclosporine level', type:'smart_unit', units:U.cyclosporine, defaultUnit:'ng/mL'},
    {key:'symptoms', label:'Symptoms', type:'multiline'},
  ]},
  { id:'stones', name:'Stones', fields:[
    {key:'stone_composition', label:'Stone composition (if known)', type:'combobox', options:['Calcium oxalate','Calcium phosphate','Uric acid','Struvite','Cystine','Mixed','Unknown']},
    {key:'u24_calcium', label:'24-hr urine calcium', type:'smart_unit', units:U.urine24_mass, defaultUnit:'mg/day'},
    {key:'u24_oxalate', label:'24-hr urine oxalate', type:'smart_unit', units:U.urine24_mass, defaultUnit:'mg/day'},
    {key:'u24_citrate', label:'24-hr urine citrate', type:'smart_unit', units:U.urine24_mass, defaultUnit:'mg/day'},
    {key:'u24_volume', label:'24-hr urine volume', type:'smart_unit', units:U.urine_volume, defaultUnit:'L/day'},
    {key:'serum_calcium', label:'Serum calcium', type:'smart_unit', units:U.calcium, defaultUnit:'mg/dL'},
    {key:'uric_acid', label:'Serum uric acid', type:'smart_unit', units:U.uric_acid, defaultUnit:'mg/dL'},
    {key:'imaging_findings', label:'Imaging findings', type:'multiline'},
  ]},
];

const NephroAITool: React.FC<Props> = ({ API, token, onBack }) => {
  const [tab, setTab] = useState<TabId>('aki');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const currentTab = TABS.find(t => t.id === tab)!;

  const updateValue = (k: string, v: string) => setInputs(i => ({ ...i, [k]: v }));
  const updateSmart = (k: string, v: string, u: string) => {
    setInputs(i => ({ ...i, [k]: v }));
    setUnits(un => ({ ...un, [k]: u }));
  };

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null);
    // Pack {value + unit} into a single string per field for AI
    const packed: Record<string, string> = {};
    for (const f of currentTab.fields) {
      const v = inputs[f.key];
      if (v === undefined || v === '') continue;
      if (f.type === 'smart_unit') {
        const u = units[f.key] || f.defaultUnit || '';
        packed[f.key] = u ? `${v} ${u}` : v;
      } else {
        packed[f.key] = v;
      }
    }
    // Electrolytes tab: combine electrolyte+value+unit
    if (tab === 'electrolytes') {
      const e = inputs['electrolyte'] || '';
      const v = inputs['electrolyte_value'] || '';
      const u = units['electrolyte_value'] || '';
      if (e || v) packed['electrolyte_measurement'] = `${e}: ${v}${u ? ' '+u : ''}`.trim();
    }
    try {
      const res = await fetch(`${API}/tools/nephroai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ sub_tool: tab, inputs: packed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const switchTab = (id: TabId) => { setTab(id); setInputs({}); setUnits({}); setResult(null); setError(''); };

  const dictateAppend = (k: string) => (t: string) => setInputs(i => ({ ...i, [k]: (i[k] || '') + t }));

  return (
    <ToolShell name="NephroAI" icon={<span style={{fontSize:'20px', lineHeight:1}}>🫘</span>} subtitle="Comprehensive nephrology decision support." onBack={onBack}>
      <div style={{display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>switchTab(t.id)} style={{background: tab===t.id ? WORDMARK : 'rgba(255,255,255,0.75)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'700', color: tab===t.id ? 'white' : '#4a7ad0', cursor:'pointer'}}>{t.name}</button>
        ))}
      </div>

      <div style={CARD}>
        <div style={LABEL}>Inputs · {currentTab.name}</div>

        {currentTab.fields.map(f => {
          const listId = `neph-${tab}-${f.key}`;
          if (f.type === 'combobox') {
            return (
              <div key={f.key} style={{marginBottom:'10px'}}>
                <div style={FIELD_LABEL}>{f.label}</div>
                <input type="text" list={listId} value={inputs[f.key]||''} onChange={e=>updateValue(f.key, e.target.value)} placeholder={f.placeholder || 'Select or type'} style={INPUT}/>
                <datalist id={listId}>{(f.options||[]).map(o => <option key={o} value={o}/>)}</datalist>
              </div>
            );
          }
          if (f.type === 'smart_unit') {
            return (
              <div key={f.key} style={{marginBottom:'10px'}}>
                <div style={FIELD_LABEL}>{f.label}</div>
                <SmartUnitInput
                  value={inputs[f.key] || ''}
                  unit={units[f.key] ?? f.defaultUnit ?? (f.units?.[0]?.label || '')}
                  onChange={(v,u) => updateSmart(f.key, v, u)}
                  units={f.units || []}
                  listId={listId}
                  placeholder={f.placeholder || ''}
                />
              </div>
            );
          }
          if (f.type === 'multiline') {
            return (
              <div key={f.key} style={{marginBottom:'10px'}}>
                <div style={FIELD_LABEL}>{f.label}</div>
                <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
                  <textarea value={inputs[f.key]||''} onChange={e=>updateValue(f.key, e.target.value)} placeholder={f.placeholder||''} style={{...INPUT, minHeight:'60px', resize:'vertical', flex:1}}/>
                  <DictationButton onTranscript={dictateAppend(f.key)}/>
                </div>
              </div>
            );
          }
          return (
            <div key={f.key} style={{marginBottom:'10px'}}>
              <div style={FIELD_LABEL}>{f.label}</div>
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <input type={f.type==='number' ? 'text' : 'text'} inputMode={f.type==='number' ? 'decimal' : 'text'} value={inputs[f.key]||''} onChange={e=>updateValue(f.key, e.target.value)} placeholder={f.placeholder||''} style={{...INPUT, flex:1}}/>
                {f.type !== 'number' && <DictationButton onTranscript={dictateAppend(f.key)}/>}
              </div>
            </div>
          );
        })}

        {/* Electrolytes tab dynamic value+unit row */}
        {tab === 'electrolytes' && (
          <div style={{marginBottom:'10px'}}>
            <div style={FIELD_LABEL}>Value</div>
            <SmartUnitInput
              value={inputs['electrolyte_value'] || ''}
              unit={units['electrolyte_value'] ?? (ELECTROLYTE_UNITS[inputs['electrolyte']||'']?.[0]?.label || 'mEq/L')}
              onChange={(v,u) => updateSmart('electrolyte_value', v, u)}
              units={ELECTROLYTE_UNITS[inputs['electrolyte']||''] || [{label:'mEq/L',perBase:1},{label:'mmol/L',perBase:1}]}
              listId="neph-electrolyte-value-units"
              placeholder={inputs['electrolyte'] ? `Value for ${inputs['electrolyte']}` : 'Value'}
            />
          </div>
        )}

        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'8px'}}>{loading ? 'Analyzing…' : 'Analyze'}</button>
      </div>

      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default NephroAITool;
