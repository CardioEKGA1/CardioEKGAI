// © 2026 SoulMD. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY } from './shared';
import DictationButton from '../../DictationButton';

interface Props { API: string; token: string; onBack: () => void; }

const RxCheckTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [meds, setMeds] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    const medications = meds.split('\n').map(s => s.trim()).filter(Boolean);
    if (medications.length === 0) { setError('Enter at least one medication.'); return; }
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
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ToolShell name="RxCheck" subtitle="Medication interaction safety check." onBack={onBack}>
      <div style={CARD}>
        <div style={LABEL}>Medications — one per line</div>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
          <textarea value={meds} onChange={e=>setMeds(e.target.value)} placeholder={"warfarin 5 mg daily\namiodarone 200 mg daily\nsimvastatin 40 mg qhs"} style={{...INPUT, minHeight:'160px', resize:'vertical', fontFamily:'ui-monospace, monospace', flex:1}}/>
          <DictationButton onTranscript={t => setMeds(prev => (prev ? prev + '\n' : '') + t.trim())}/>
        </div>
        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'10px'}}>{loading ? 'Checking interactions…' : 'Check interactions'}</button>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default RxCheckTool;
