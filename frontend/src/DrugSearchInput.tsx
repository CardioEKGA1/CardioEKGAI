// © 2026 SoulMD. All rights reserved.
import React from 'react';

export interface Medication {
  name: string;
  dose: string;
  dose_unit: string;
  frequency: string;
  route: string;
}

const DOSE_UNITS = ['mg','mcg','g','units','mEq','mg/kg','mL','%'];
const FREQUENCIES = ['Once daily','Twice daily','Three times daily','Four times daily','Every 6h','Every 8h','Every 12h','Weekly','As needed','Other'];
const ROUTES = ['Oral','IV','SubQ','IM','Topical','Inhaled','Sublingual','PR','Intrathecal'];

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

const blankMed = (): Medication => ({ name:'', dose:'', dose_unit:'mg', frequency:'Once daily', route:'Oral' });

const INPUT: React.CSSProperties = {
  padding:'8px 10px', borderRadius:'8px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'12px', background:'rgba(240,246,255,0.5)', outline:'none',
  color:'#1a2a4a', boxSizing:'border-box', minWidth:0,
};

const DrugSearchInput: React.FC<Props> = ({ rows, onChange, maxRows=20, drugList=COMMON_DRUGS }) => {
  const update = (idx: number, patch: Partial<Medication>) => {
    onChange(rows.map((r,i) => i===idx ? {...r, ...patch} : r));
  };
  const remove = (idx: number) => onChange(rows.filter((_,i) => i !== idx));
  const add = () => { if (rows.length < maxRows) onChange([...rows, blankMed()]); };

  return (
    <div>
      <datalist id="soulmd-drug-list">{drugList.map(d => <option key={d} value={d}/>)}</datalist>
      <datalist id="soulmd-dose-units">{DOSE_UNITS.map(u => <option key={u} value={u}/>)}</datalist>
      <datalist id="soulmd-frequencies">{FREQUENCIES.map(f => <option key={f} value={f}/>)}</datalist>
      <datalist id="soulmd-routes">{ROUTES.map(r => <option key={r} value={r}/>)}</datalist>

      {rows.length === 0 && <div style={{fontSize:'12px', color:'#8aa0c0', textAlign:'center', padding:'16px 0'}}>No medications yet.</div>}

      {rows.map((row, i) => (
        <div key={i} style={{display:'grid', gridTemplateColumns:'minmax(120px,1.6fr) minmax(60px,0.7fr) minmax(60px,0.6fr) minmax(100px,1.1fr) minmax(70px,0.7fr) 30px', gap:'6px', marginBottom:'8px', alignItems:'stretch'}}>
          <input type="text" list="soulmd-drug-list" placeholder="Drug name (type freely)" value={row.name} onChange={e => update(i, {name:e.target.value})} style={INPUT}/>
          <input type="text" inputMode="decimal" placeholder="Dose" value={row.dose} onChange={e => update(i, {dose:e.target.value})} style={INPUT}/>
          <input type="text" list="soulmd-dose-units" placeholder="unit" value={row.dose_unit} onChange={e => update(i, {dose_unit:e.target.value})} style={INPUT}/>
          <input type="text" list="soulmd-frequencies" placeholder="Frequency" value={row.frequency} onChange={e => update(i, {frequency:e.target.value})} style={INPUT}/>
          <input type="text" list="soulmd-routes" placeholder="Route" value={row.route} onChange={e => update(i, {route:e.target.value})} style={INPUT}/>
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
