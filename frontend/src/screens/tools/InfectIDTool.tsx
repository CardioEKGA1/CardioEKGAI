// © 2026 SoulMD. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL } from './shared';
import DictationButton from '../../DictationButton';
import SmartUnitInput from '../../SmartUnitInput';

interface Props { API: string; token: string; onBack: () => void; }

const INFECTION_SITES = [
  'Bloodstream / Bacteremia','Pneumonia / CAP','Pneumonia / HAP','Pneumonia / VAP','Aspiration pneumonia',
  'Uncomplicated cystitis','Complicated UTI / Pyelonephritis','Catheter-associated UTI',
  'Cellulitis','Erysipelas','Diabetic foot infection','Necrotizing fasciitis','Abscess',
  'Meningitis (community)','Meningitis (nosocomial)','Encephalitis','Brain abscess',
  'Endocarditis (native valve)','Endocarditis (prosthetic valve)','Pericarditis',
  'Intra-abdominal abscess','Cholangitis','Cholecystitis','Diverticulitis','Peritonitis / SBP','C. difficile colitis',
  'Osteomyelitis','Septic arthritis','Prosthetic joint infection','Vertebral osteomyelitis',
  'Sepsis / unknown source','Neutropenic fever','Line-associated BSI','CLABSI',
  'Sinusitis','Otitis media','Pharyngitis / Strep throat','Dental / Odontogenic',
  'PID','Chorioamnionitis','Endometritis','Mastitis',
  'COVID-19','Influenza','RSV','HSV','VZV / Shingles','CMV','EBV',
  'TB (active)','Atypical mycobacteria','Lyme disease','Rickettsial / Tick-borne',
  'Candidemia','Invasive aspergillosis','Mucormycosis','Cryptococcosis','Pneumocystis (PJP)',
  'Surgical site infection','Prosthetic device infection','Burn wound infection',
];

const ORGANISMS = [
  'MRSA','MSSA','VRE','Enterococcus faecalis','Enterococcus faecium','Streptococcus pneumoniae','Group A Strep','Group B Strep','Viridans Strep',
  'Escherichia coli','Klebsiella pneumoniae','Klebsiella oxytoca','Enterobacter cloacae','Citrobacter','Serratia marcescens','Proteus mirabilis','Morganella',
  'Pseudomonas aeruginosa','Acinetobacter baumannii','Stenotrophomonas maltophilia','Burkholderia',
  'ESBL E. coli','ESBL Klebsiella','CRE / CPE','KPC producer','NDM producer',
  'Haemophilus influenzae','Moraxella catarrhalis','Neisseria meningitidis','Neisseria gonorrhoeae','Legionella','Mycoplasma pneumoniae','Chlamydia pneumoniae',
  'Bacteroides fragilis','Clostridioides difficile','Clostridium perfringens','Peptostreptococcus','Fusobacterium',
  'Candida albicans','Candida glabrata','Candida auris','Candida krusei','Aspergillus fumigatus','Cryptococcus neoformans','Pneumocystis jirovecii',
  'Mycobacterium tuberculosis','MAC','Influenza A','Influenza B','SARS-CoV-2','RSV','HSV-1','HSV-2','VZV','CMV','EBV',
  'Unknown','Culture pending','Polymicrobial',
];

const COMMON_ALLERGIES = [
  'Penicillin - anaphylaxis','Penicillin - rash','Penicillin - hives','Penicillin - unknown reaction',
  'Cephalosporin - anaphylaxis','Cephalosporin - rash',
  'Sulfa - SJS/TEN','Sulfa - rash','Sulfa - hepatitis',
  'Fluoroquinolone - tendinopathy','Fluoroquinolone - QT prolongation',
  'Vancomycin - red man syndrome','Vancomycin - DRESS',
  'Macrolide - GI intolerance','Macrolide - QT prolongation',
  'Tetracycline - photosensitivity',
  'Carbapenem - anaphylaxis',
  'Aminoglycoside - nephrotoxicity','Aminoglycoside - ototoxicity',
  'Clindamycin - C. diff',
  'Metronidazole - disulfiram reaction',
  'Linezolid - serotonin syndrome',
  'Daptomycin - rhabdomyolysis',
  'No known drug allergies',
];

const WEIGHT_UNITS = [{label:'kg', perBase:1}, {label:'lbs', perBase:2.2046}];

const InfectIDTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [form, setForm] = useState({
    infection_site:'', organism:'', allergies_list: [] as string[], allergies_other:'',
    renal_input_type:'CrCl', crcl:'', crcl_unit:'mL/min', egfr:'', egfr_unit:'mL/min/1.73m²',
    on_dialysis: false, weight:'', weight_unit:'kg', age:'', notes:'',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const up = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleAllergy = (a: string) => setForm(f => ({
    ...f, allergies_list: f.allergies_list.includes(a) ? f.allergies_list.filter(x => x !== a) : [...f.allergies_list, a]
  }));

  const analyze = async () => {
    if (!form.infection_site.trim()) { setError('Infection site is required.'); return; }
    setLoading(true); setError(''); setResult(null);

    const body: any = { infection_site: form.infection_site };
    if (form.organism) body.organism = form.organism;

    const allergies = [...form.allergies_list];
    if (form.allergies_other.trim()) allergies.push(form.allergies_other.trim());
    if (allergies.length) body.allergies = allergies.join('; ');

    if (form.on_dialysis) {
      body.renal_function = 'On dialysis';
    } else if (form.renal_input_type === 'CrCl' && form.crcl) {
      body.renal_function = `CrCl ${form.crcl} ${form.crcl_unit}`;
      body.crcl = parseFloat(form.crcl);
    } else if (form.renal_input_type === 'eGFR' && form.egfr) {
      body.renal_function = `eGFR ${form.egfr} ${form.egfr_unit}`;
      body.egfr = parseFloat(form.egfr);
    }

    if (form.weight) {
      const wkg = form.weight_unit === 'lbs' ? parseFloat(form.weight) / 2.2046 : parseFloat(form.weight);
      body.weight_kg = Number(wkg.toFixed(2));
    }
    if (form.age) body.age = parseInt(form.age);
    if (form.notes) body.notes = form.notes;

    try {
      const res = await fetch(`${API}/tools/infectid/analyze`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ToolShell name="InfectID" subtitle="IDSA-based antibiotic recommendations." onBack={onBack} icon={<span style={{fontSize:'20px', lineHeight:1}}>🦠</span>}>
      <div style={CARD}>
        <div style={LABEL}>Clinical context</div>

        <div style={{marginBottom:'12px'}}>
          <div style={FIELD_LABEL}>Infection site *</div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input list="infectid-sites" value={form.infection_site} onChange={e=>up('infection_site', e.target.value)} placeholder="Type or select — free text accepted" style={{...INPUT, flex:1}}/>
            <DictationButton onTranscript={t => up('infection_site', form.infection_site + t)}/>
          </div>
          <datalist id="infectid-sites">{INFECTION_SITES.map(s => <option key={s} value={s}/>)}</datalist>
        </div>

        <div style={{marginBottom:'12px'}}>
          <div style={FIELD_LABEL}>Organism (if known)</div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input list="infectid-organisms" value={form.organism} onChange={e=>up('organism', e.target.value)} placeholder="Type or select — free text accepted" style={{...INPUT, flex:1}}/>
            <DictationButton onTranscript={t => up('organism', form.organism + t)}/>
          </div>
          <datalist id="infectid-organisms">{ORGANISMS.map(o => <option key={o} value={o}/>)}</datalist>
        </div>

        <div style={{marginBottom:'12px'}}>
          <div style={FIELD_LABEL}>Allergies</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'8px'}}>
            {COMMON_ALLERGIES.map(a => {
              const active = form.allergies_list.includes(a);
              return (
                <button type="button" key={a} onClick={()=>toggleAllergy(a)}
                  style={{fontSize:'11px', padding:'4px 10px', borderRadius:'999px', cursor:'pointer',
                    border: active ? '1px solid #c04040' : '1px solid rgba(122,176,240,0.3)',
                    background: active ? 'rgba(192,64,64,0.12)' : 'rgba(255,255,255,0.7)',
                    color: active ? '#c04040' : '#4a7ad0', fontWeight: active ? 700 : 500}}>
                  {active ? '✓ ' : ''}{a}
                </button>
              );
            })}
          </div>
          <input value={form.allergies_other} onChange={e=>up('allergies_other', e.target.value)} placeholder="Other allergy (free text) — e.g. 'daptomycin rash'" style={INPUT}/>
        </div>

        <div style={{marginBottom:'12px', padding:'12px', background:'rgba(240,246,255,0.4)', borderRadius:'10px', border:'1px solid rgba(122,176,240,0.2)'}}>
          <div style={FIELD_LABEL}>Renal function</div>
          <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'8px', flexWrap:'wrap'}}>
            <label style={{fontSize:'12px', display:'flex', gap:'4px', alignItems:'center', cursor:'pointer'}}>
              <input type="radio" checked={form.renal_input_type==='CrCl'} onChange={()=>up('renal_input_type','CrCl')}/> CrCl
            </label>
            <label style={{fontSize:'12px', display:'flex', gap:'4px', alignItems:'center', cursor:'pointer'}}>
              <input type="radio" checked={form.renal_input_type==='eGFR'} onChange={()=>up('renal_input_type','eGFR')}/> eGFR
            </label>
            <label style={{fontSize:'12px', display:'flex', gap:'4px', alignItems:'center', cursor:'pointer', marginLeft:'auto'}}>
              <input type="checkbox" checked={form.on_dialysis} onChange={e=>up('on_dialysis', e.target.checked)}/> On dialysis
            </label>
          </div>
          {!form.on_dialysis && form.renal_input_type === 'CrCl' && (
            <SmartUnitInput value={form.crcl} unit={form.crcl_unit}
              onChange={(v,u)=>setForm(f=>({...f, crcl:v, crcl_unit:u}))}
              units={[{label:'mL/min', perBase:1}, {label:'mL/min/1.73m²', perBase:1}]}
              listId="infectid-crcl-units" placeholder="e.g. 65"/>
          )}
          {!form.on_dialysis && form.renal_input_type === 'eGFR' && (
            <SmartUnitInput value={form.egfr} unit={form.egfr_unit}
              onChange={(v,u)=>setForm(f=>({...f, egfr:v, egfr_unit:u}))}
              units={[{label:'mL/min/1.73m²', perBase:1}, {label:'mL/min', perBase:1}]}
              listId="infectid-egfr-units" placeholder="e.g. 55"/>
          )}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px'}}>
          <div>
            <div style={FIELD_LABEL}>Weight</div>
            <SmartUnitInput value={form.weight} unit={form.weight_unit}
              onChange={(v,u)=>setForm(f=>({...f, weight:v, weight_unit:u}))}
              units={WEIGHT_UNITS} listId="infectid-weight-units" placeholder="e.g. 70"/>
          </div>
          <div>
            <div style={FIELD_LABEL}>Age</div>
            <input type="text" inputMode="numeric" value={form.age} onChange={e=>up('age', e.target.value)} placeholder="years" style={INPUT}/>
          </div>
        </div>

        <div style={{marginBottom:'12px'}}>
          <div style={FIELD_LABEL}>Clinical notes</div>
          <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
            <textarea value={form.notes} onChange={e=>up('notes', e.target.value)} placeholder="severity, immune status, source control, recent antibiotics, hospital exposure…" style={{...INPUT, minHeight:'70px', resize:'vertical', flex:1}}/>
            <DictationButton onTranscript={t => up('notes', form.notes + t)}/>
          </div>
        </div>

        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1}}>{loading ? 'Generating recommendations…' : 'Recommend regimen'}</button>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default InfectIDTool;
