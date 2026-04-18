// © 2026 SoulMD. All rights reserved.
import React, { useState } from 'react';
import { ToolShell, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL } from './shared';
import DictationButton from '../../DictationButton';

interface Props { API: string; token: string; onBack: () => void; }

const NOTE_TYPES = ['SOAP', 'H&P', 'Discharge Summary', 'Progress Note', 'Consult Note'];
const STYLES = [
  { value: 'concise',          label: 'Concise' },
  { value: 'standard',         label: 'Standard' },
  { value: 'detailed',         label: 'Detailed' },
  { value: 'academic',         label: 'Academic' },
  { value: 'patient_friendly', label: 'Patient-Friendly' },
];

const ClinicalNoteTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [noteType, setNoteType] = useState('SOAP');
  const [style, setStyle] = useState('standard');
  const [bullets, setBullets] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!bullets.trim()) { setError('Enter bullet points first.'); return; }
    setLoading(true); setError(''); setResult(null); setCopied(false);
    try {
      const res = await fetch(`${API}/tools/clinicalnote/generate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ note_type: noteType, style, bullets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Generation failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = async () => {
    if (!result?.note) return;
    try { await navigator.clipboard.writeText(result.note); setCopied(true); setTimeout(()=>setCopied(false), 2000); }
    catch {}
  };

  return (
    <ToolShell name="ClinicalNote AI" subtitle="Turn bullet points into a complete, formatted note." onBack={onBack}>
      <div style={CARD}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px'}}>
          <div>
            <div style={FIELD_LABEL}>Note type</div>
            <select value={noteType} onChange={e=>setNoteType(e.target.value)} style={INPUT}>
              {NOTE_TYPES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <div style={FIELD_LABEL}>Style</div>
            <select value={style} onChange={e=>setStyle(e.target.value)} style={INPUT}>
              {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={FIELD_LABEL}>Bullet points</div>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-start', marginTop:'4px'}}>
          <textarea value={bullets} onChange={e=>setBullets(e.target.value)} placeholder={"- 62 y/o M with HTN, DM2, CKD3\n- Chest pain x 2h, non-radiating\n- BP 160/95, HR 92, SpO2 97% RA\n- Trop neg x1, ECG NSR, BNP 300\n- Plan: admit tele, serial trops, ASA, statin"} style={{...INPUT, minHeight:'200px', resize:'vertical', fontFamily:'ui-monospace, monospace', flex:1}}/>
          <DictationButton onTranscript={t => setBullets(prev => (prev ? prev + '\n' : '') + t.trim())}/>
        </div>
        <button onClick={generate} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'10px'}}>{loading ? 'Generating note…' : 'Generate note'}</button>
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
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <div style={LABEL}>{noteType} · {STYLES.find(s=>s.value===style)?.label}</div>
            <button onClick={copy} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'700', color:'#4a7ad0', cursor:'pointer'}}>
              {copied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>
          <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontSize:'13px', color:'#1a2a4a', lineHeight:'1.75', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>{result.note}</pre>
        </div>
      )}
      {result?.disclaimer && <div style={{fontSize:'11px', color:'#a0b0c8', textAlign:'center', padding:'6px'}}>{result.disclaimer}</div>}
    </ToolShell>
  );
};

export default ClinicalNoteTool;
