// © 2026 SoulMD. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL } from './shared';
import DictationButton from '../../DictationButton';

interface Props { API: string; token: string; onBack: () => void; }

const InfectIDTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [form, setForm] = useState({infection_site:'', organism:'', allergies:'', crcl:'', weight_kg:'', age:'', notes:''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const analyze = async () => {
    if (!form.infection_site.trim()) { setError('Infection site is required.'); return; }
    setLoading(true); setError(''); setResult(null);
    const body: any = { infection_site: form.infection_site };
    if (form.organism) body.organism = form.organism;
    if (form.allergies) body.allergies = form.allergies;
    if (form.notes) body.notes = form.notes;
    if (form.crcl) body.crcl = parseFloat(form.crcl);
    if (form.weight_kg) body.weight_kg = parseFloat(form.weight_kg);
    if (form.age) body.age = parseInt(form.age);
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
    <ToolShell name="InfectID" subtitle="IDSA-based antibiotic recommendations." onBack={onBack}>
      <div style={CARD}>
        <div style={LABEL}>Clinical context</div>
        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Infection site *</div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input value={form.infection_site} onChange={e=>up('infection_site', e.target.value)} placeholder="e.g. uncomplicated cystitis, CAP, cellulitis" style={{...INPUT, flex:1}}/>
            <DictationButton onTranscript={t => up('infection_site', form.infection_site + t)}/>
          </div>
        </div>
        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Organism (if known)</div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input value={form.organism} onChange={e=>up('organism', e.target.value)} placeholder="e.g. MSSA, E. coli, Pseudomonas" style={{...INPUT, flex:1}}/>
            <DictationButton onTranscript={t => up('organism', form.organism + t)}/>
          </div>
        </div>
        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Allergies</div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <input value={form.allergies} onChange={e=>up('allergies', e.target.value)} placeholder="e.g. PCN anaphylaxis, sulfa rash" style={{...INPUT, flex:1}}/>
            <DictationButton onTranscript={t => up('allergies', form.allergies + t)}/>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'10px', marginBottom:'10px'}}>
          <div><div style={FIELD_LABEL}>CrCl (mL/min)</div><input type="number" value={form.crcl} onChange={e=>up('crcl', e.target.value)} style={INPUT}/></div>
          <div><div style={FIELD_LABEL}>Weight (kg)</div><input type="number" value={form.weight_kg} onChange={e=>up('weight_kg', e.target.value)} style={INPUT}/></div>
          <div><div style={FIELD_LABEL}>Age</div><input type="number" value={form.age} onChange={e=>up('age', e.target.value)} style={INPUT}/></div>
        </div>
        <div style={{marginBottom:'10px'}}>
          <div style={FIELD_LABEL}>Notes</div>
          <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
            <textarea value={form.notes} onChange={e=>up('notes', e.target.value)} placeholder="severity, immune status, source control, etc." style={{...INPUT, minHeight:'60px', resize:'vertical', flex:1}}/>
            <DictationButton onTranscript={t => up('notes', form.notes + t)}/>
          </div>
        </div>
        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'4px'}}>{loading ? 'Generating recommendations…' : 'Recommend regimen'}</button>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default InfectIDTool;
