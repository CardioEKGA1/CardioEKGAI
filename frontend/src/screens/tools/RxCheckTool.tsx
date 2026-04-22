// © 2026 SoulMD, LLC. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY } from './shared';
import DictationButton from '../../DictationButton';
import DrugSearchInput, { Medication, formatMedication } from '../../DrugSearchInput';
import { notifyTrialUsed } from '../../trialHelpers';

interface Props { API: string; token: string; onBack: () => void; }

const RxCheckTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [rows, setRows] = useState<Medication[]>([
    { name:'', dose:'', dose_unit:'mg', frequency:'Once daily', route:'Oral' },
    { name:'', dose:'', dose_unit:'mg', frequency:'Once daily', route:'Oral' },
  ]);
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    const structured = rows
      .filter(r => r.name.trim())
      .map(formatMedication);
    const freetext = extra.split('\n').map(s => s.trim()).filter(Boolean);
    const medications = [...structured, ...freetext];
    if (medications.length < 2) { setError('Enter at least two medications to check for interactions.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/tools/rxcheck/analyze`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ medications }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
      if (data._trial_mode) notifyTrialUsed('rxcheck');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ToolShell name="RxCheck" subtitle="Medication interaction safety check." onBack={onBack} icon={<span style={{fontSize:'20px', lineHeight:1}}>💊</span>}>
      <div style={CARD}>
        <div style={LABEL}>Medications</div>
        <div style={{fontSize:'11px', color:'#8aa0c0', marginBottom:'10px', lineHeight:'1.5'}}>
          Start typing a drug name — suggestions appear but you can type any drug freely. Tab between fields. Minimum 2 medications for interaction check.
        </div>
        <DrugSearchInput rows={rows} onChange={setRows} maxRows={25}/>

        <div style={{marginTop:'18px'}}>
          <div style={LABEL}>Additional medications (free text — optional)</div>
          <div style={{fontSize:'11px', color:'#8aa0c0', marginBottom:'6px'}}>One per line. Use for combo drugs, herbals, or anything not in the structured list above.</div>
          <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
            <textarea value={extra} onChange={e=>setExtra(e.target.value)} placeholder={"St. John's Wort\nGrapefruit juice daily\nCannabis edibles nightly"} style={{...INPUT, minHeight:'90px', resize:'vertical', fontFamily:'ui-monospace, monospace', flex:1}}/>
            <DictationButton onTranscript={t => setExtra(prev => (prev ? prev + '\n' : '') + t.trim())}/>
          </div>
        </div>

        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'14px'}}>{loading ? 'Checking interactions…' : 'Check interactions'}</button>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default RxCheckTool;
