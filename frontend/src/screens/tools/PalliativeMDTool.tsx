// © 2026 SoulMD. All rights reserved.
import React, { useState, useRef, useEffect } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';

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

const TEMPLATE_FIELDS: {key: string; label: string; placeholder?: string}[] = [
  { key: 'patient_age',       label: 'Patient age' },
  { key: 'diagnosis',         label: 'Diagnosis' },
  { key: 'prognosis',         label: 'Prognosis' },
  { key: 'functional_status', label: 'Current functional status' },
  { key: 'family_context',    label: 'Family / surrogate situation' },
  { key: 'known_wishes',      label: "Patient's known wishes" },
  { key: 'conversation_goal', label: 'Clinical question / conversation goal' },
  { key: 'cultural_context',  label: 'Cultural or spiritual context (optional)' },
];

const WARM_BG = 'linear-gradient(135deg, rgba(255,230,210,0.35), rgba(240,220,240,0.35))';

const PalliativeMDTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [convType, setConvType] = useState<ConvType>('goals_of_care');
  const [text, setText] = useState('');
  const [template, setTemplate] = useState<Record<string, string>>({});
  const [templateOpen, setTemplateOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef<string>('');

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => { try { recognitionRef.current?.stop(); } catch {} };
  }, []);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      interimRef.current = '';
      rec.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalChunk += t; else interimChunk += t;
        }
        if (finalChunk) {
          setText(prev => (prev ? prev.trimEnd() + ' ' : '') + finalChunk.trim() + ' ');
        }
        interimRef.current = interimChunk;
      };
      rec.onerror = (e: any) => { setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice recognition error.'); setRecording(false); };
      rec.onend = () => setRecording(false);
      rec.start();
      recognitionRef.current = rec;
      setRecording(true); setError('');
    } catch (e: any) { setError('Could not start voice input.'); setRecording(false); }
  };

  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setRecording(false);
  };

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
    <ToolShell name="PalliativeMD" subtitle="Compassionate AI guidance for difficult conversations." onBack={onBack}>
      <div style={{display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap'}}>
        {CONV_TYPES.map(c => (
          <button key={c.id} onClick={()=>{ setConvType(c.id); setResult(null); }} style={{background: convType===c.id ? WORDMARK : 'rgba(255,255,255,0.75)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:'600', color: convType===c.id ? 'white' : '#4a7ad0', cursor:'pointer'}}>{c.label}</button>
        ))}
      </div>

      <div style={{...CARD, background: WARM_BG}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <div style={LABEL}>Describe the case</div>
          {supported ? (
            <button onClick={recording ? stopRecording : startRecording} style={{
              display:'flex', alignItems:'center', gap:'8px',
              background: recording ? '#e89898' : WORDMARK,
              border:'none', borderRadius:'999px', padding:'8px 16px',
              fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer',
              boxShadow: recording ? '0 0 0 4px rgba(232,152,152,0.25)' : 'none',
            }}>
              <span style={{fontSize:'14px'}}>{recording ? '■' : '🎙'}</span>
              {recording ? 'Stop' : 'Dictate'}
            </button>
          ) : (
            <span style={{fontSize:'11px', color:'#8aa0c0'}}>Voice input not supported in this browser</span>
          )}
        </div>
        <textarea
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="e.g. 78 y/o with metastatic pancreatic ca, hospice discussed but family wants 'everything done'. Patient has capacity, says she's tired. Need to align family on patient's wishes tomorrow morning."
          style={{...INPUT, minHeight:'160px', resize:'vertical', lineHeight:'1.6'}}
        />
        {recording && <div style={{fontSize:'11px', color:'#c04040', marginTop:'-4px', marginBottom:'6px'}}>● Listening… speak naturally, punctuation is optional.</div>}

        <button onClick={()=>setTemplateOpen(v=>!v)} style={{background:'transparent', border:'none', color:'#4a7ad0', fontSize:'12px', fontWeight:'700', cursor:'pointer', padding:'4px 0', marginTop:'6px'}}>
          {templateOpen ? '▾ Hide case template' : '▸ Fill case template (optional)'}
        </button>

        {templateOpen && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'10px', marginTop:'10px'}}>
            {TEMPLATE_FIELDS.map(f => (
              <div key={f.key}>
                <div style={FIELD_LABEL}>{f.label}</div>
                <input value={template[f.key]||''} onChange={e=>updateField(f.key, e.target.value)} placeholder={f.placeholder||''} style={INPUT}/>
              </div>
            ))}
          </div>
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
