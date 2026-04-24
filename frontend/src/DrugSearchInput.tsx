// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import DictationButton from './DictationButton';

export interface Medication {
  name: string;
  dose: string;
  dose_unit: string;
  frequency: string;
  route: string;
}

const DOSE_UNITS = [
  'mg','mcg','g','mEq','mmol','units','IU','mL','mg/mL','mg/kg','mcg/kg','%',
];
const FREQUENCIES = [
  'Once daily',
  'Twice daily (BID)',
  'Three times daily (TID)',
  'Four times daily (QID)',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'Every 24 hours',
  'Every 48 hours',
  'Weekly',
  'As needed (PRN)',
  'At bedtime (QHS)',
  'Every morning',
  'Every evening',
  'Loading dose then maintenance',
  'Continuous infusion',
];
const ROUTES = [
  'Oral (PO)',
  'Intravenous (IV)',
  'Intramuscular (IM)',
  'Subcutaneous (SQ)',
  'Sublingual (SL)',
  'Topical',
  'Transdermal patch',
  'Inhaled',
  'Intranasal',
  'Ophthalmic',
  'Otic',
  'Rectal (PR)',
  'Intrathecal',
  'Epidural',
  'Nebulized',
  'Vaginal',
];

export const COMMON_DRUGS = [
  'Warfarin','Aspirin','Metoprolol','Lisinopril','Atorvastatin','Metformin','Amlodipine','Omeprazole','Levothyroxine','Hydrochlorothiazide',
  'Amiodarone','Digoxin','Furosemide','Spironolactone','Carvedilol','Losartan','Valsartan','Simvastatin','Rosuvastatin','Clopidogrel',
  'Apixaban','Rivaroxaban','Dabigatran','Heparin','Enoxaparin','Vancomycin','Piperacillin-Tazobactam','Meropenem','Ceftriaxone','Azithromycin',
  'Ciprofloxacin','Levofloxacin','Trimethoprim-Sulfamethoxazole','Metronidazole','Fluconazole','Prednisone','Methylprednisolone','Dexamethasone','Insulin Glargine','Insulin Lispro',
  'Glipizide','Sitagliptin','Empagliflozin','Albuterol','Tiotropium','Budesonide','Morphine','Oxycodone','Hydromorphone','Fentanyl',
  'Tramadol','Gabapentin','Pregabalin','Sertraline','Escitalopram','Fluoxetine','Bupropion','Quetiapine','Haloperidol','Lorazepam',
  'Clonazepam','Zolpidem','Donepezil','Memantine','Levodopa','Carbidopa','Phenytoin','Levetiracetam','Valproate','Carbamazepine',
  'Tacrolimus','Mycophenolate','Cyclosporine','Azathioprine','Hydroxychloroquine','Methotrexate','Adalimumab','Infliximab','Allopurinol','Colchicine',
  'Nifedipine','Hydralazine','Clonidine','Doxazosin','Tamsulosin','Finasteride','Sildenafil','Tadalafil','Ondansetron','Metoclopramide',
  'Pantoprazole','Sucralfate','Lactulose','Polyethylene Glycol','Senna','Bisacodyl','Ferrous Sulfate','Folic Acid','Cyanocobalamin','Calcium Carbonate',
  'Vitamin D3','Potassium Chloride','Sodium Bicarbonate','Magnesium Oxide','Epoetin Alfa','Darbepoetin',
];

interface Props {
  rows: Medication[];
  onChange: (rows: Medication[]) => void;
  maxRows?: number;
  drugList?: string[];
}

const blankMed = (): Medication => ({ name:'', dose:'', dose_unit:'mg', frequency:'Once daily', route:'Oral (PO)' });

const INPUT: React.CSSProperties = {
  padding:'8px 10px', borderRadius:'8px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'12px', background:'rgba(240,246,255,0.5)', outline:'none',
  color:'#1a2a4a', boxSizing:'border-box', minWidth:0, width:'100%',
};

const SELECT: React.CSSProperties = {
  ...INPUT,
  appearance:'none',
  WebkitAppearance:'none',
  MozAppearance:'none',
  paddingRight:'22px',
  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%237a8ab0' d='M0 0l5 6 5-6z'/></svg>")`,
  backgroundRepeat:'no-repeat',
  backgroundPosition:'right 8px center',
};

const DrugSearchInput: React.FC<Props> = ({ rows, onChange, maxRows=20, drugList=COMMON_DRUGS }) => {
  const update = (idx: number, patch: Partial<Medication>) => {
    onChange(rows.map((r,i) => i===idx ? {...r, ...patch} : r));
  };
  const appendToName = (idx: number, chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    const existing = (rows[idx]?.name || '').trim();
    update(idx, { name: existing ? `${existing} ${trimmed}` : trimmed });
  };
  const remove = (idx: number) => onChange(rows.filter((_,i) => i !== idx));
  const add = () => { if (rows.length < maxRows) onChange([...rows, blankMed()]); };

  return (
    <div>
      <datalist id="soulmd-drug-list">{drugList.map(d => <option key={d} value={d}/>)}</datalist>

      {rows.length === 0 && <div style={{fontSize:'12px', color:'#8aa0c0', textAlign:'center', padding:'16px 0'}}>No medications yet.</div>}

      {rows.map((row, i) => (
        <div key={i} style={{display:'grid', gridTemplateColumns:'minmax(140px,1.8fr) minmax(60px,0.6fr) minmax(70px,0.7fr) minmax(130px,1.3fr) minmax(100px,1fr) 30px', gap:'6px', marginBottom:'8px', alignItems:'stretch'}}>
          <div style={{display:'flex', gap:'4px', alignItems:'center', minWidth:0}}>
            <input type="text" list="soulmd-drug-list" placeholder="Drug name (type or dictate)" value={row.name} onChange={e => update(i, {name:e.target.value})} style={{...INPUT, flex:1}}/>
            <DictationButton size={28} onTranscript={(t) => appendToName(i, t)} fallbackWhenUnsupported/>
          </div>
          <input type="text" inputMode="decimal" placeholder="Dose" value={row.dose} onChange={e => update(i, {dose:e.target.value})} style={INPUT}/>
          <select value={row.dose_unit} onChange={e => update(i, {dose_unit:e.target.value})} style={SELECT} aria-label="Dose unit">
            {DOSE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={row.frequency} onChange={e => update(i, {frequency:e.target.value})} style={SELECT} aria-label="Frequency">
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={row.route} onChange={e => update(i, {route:e.target.value})} style={SELECT} aria-label="Route">
            {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => remove(i)} aria-label="Remove" style={{background:'transparent', border:'none', cursor:'pointer', color:'#c04040', fontSize:'14px', padding:0}}>🗑</button>
        </div>
      ))}

      {rows.length < maxRows && (
        <button type="button" onClick={add} style={{background:'rgba(255,255,255,0.7)', border:'1px dashed rgba(122,176,240,0.5)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer', marginTop:'4px'}}>
          + Add medication {rows.length > 0 && <span style={{color:'#8aa0c0', fontWeight:500}}>({rows.length}/{maxRows})</span>}
        </button>
      )}
    </div>
  );
};

export default DrugSearchInput;

export const formatMedication = (m: Medication): string => {
  const parts = [m.name.trim()];
  if (m.dose) parts.push(`${m.dose}${m.dose_unit ? ' '+m.dose_unit : ''}`);
  if (m.route) parts.push(m.route);
  if (m.frequency) parts.push(m.frequency);
  return parts.filter(Boolean).join(' ');
};
