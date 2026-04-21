// © 2026 SoulMD, LLC. All rights reserved.
import React, { useRef, useState } from 'react';
import { ToolShell, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL } from './shared';
import DictationButton from '../../DictationButton';

interface Props { API: string; token: string; onBack: () => void; }

type Severity = 'low' | 'high' | 'critical' | 'borderline';
interface AbnormalValue {
  test: string;
  value: string;
  reference_range?: string;
  severity?: Severity;
  comment?: string;
}
interface LabResult {
  abnormal_values?: AbnormalValue[];
  panel_interpretation?: string;
  differential_diagnoses?: string[];
  next_steps?: string[];
  urgency?: 'routine' | 'urgent' | 'critical';
  urgent_flags?: string[];
  free_tier_remaining?: number;
  disclaimer?: string;
}

const SEVERITY_STYLE: Record<Severity, {bg: string; border: string; text: string; label: string}> = {
  critical:   { bg: '#fde8e8', border: '#f0b0b0', text: '#a02020', label: 'CRITICAL' },
  high:       { bg: '#fdf2e4', border: '#f0c890', text: '#a85c10', label: 'HIGH' },
  low:        { bg: '#e4eefd', border: '#a0c0f0', text: '#2060b0', label: 'LOW' },
  borderline: { bg: '#fdfbe4', border: '#e8d878', text: '#907020', label: 'BORDERLINE' },
};

const URGENCY_STYLE: Record<string, {bg: string; text: string; label: string}> = {
  routine:  { bg: 'rgba(112,184,112,0.15)', text: '#2a7a2a', label: 'Routine' },
  urgent:   { bg: 'rgba(240,180,80,0.18)',  text: '#a06810', label: 'Urgent' },
  critical: { bg: 'rgba(224,80,80,0.15)',   text: '#a02020', label: 'Critical' },
};

const LabReadTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [labText, setLabText] = useState('');
  const [context, setContext] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LabResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setExtracting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/tools/labread/extract`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Extraction failed');
      if (data.is_lab_report === false) {
        setError('Document does not look like a lab report. Please paste values manually.');
      } else {
        const extracted = (data.extracted_text || '').trim();
        if (!extracted) {
          setError('No lab values detected in the document. Please paste manually.');
        } else {
          setLabText(prev => prev ? `${prev}\n\n${extracted}` : extracted);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const analyze = async () => {
    if (!labText.trim()) { setError('Paste, dictate, or upload lab values first.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/tools/labread/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lab_text: labText, clinical_context: context || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const remaining = result?.free_tier_remaining;

  return (
    <ToolShell name="LabRead" subtitle="Paste, dictate, or upload a lab panel → AI interpretation with flagged abnormal values." onBack={onBack} icon={<span style={{fontSize:'20px', lineHeight:1}}>🧪</span>}>
      <div style={CARD}>
        <div style={LABEL}>Lab values</div>
        <div style={{fontSize:'11px', color:'#8aa0c0', marginBottom:'8px', lineHeight:1.5}}>
          Paste directly, dictate, or upload a PDF/photo and review the extracted text before analyzing.
        </div>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
          <textarea
            value={labText}
            onChange={e => setLabText(e.target.value)}
            placeholder={"e.g.\nNa 132 (135-145)\nK 5.8 H (3.5-5.0)\nCr 2.1 H (0.6-1.2)\nBUN 42 H (7-20)\nHgb 9.4 L (13.5-17.5)\nWBC 14.2 H (4.5-11)"}
            style={{...INPUT, minHeight:'200px', resize:'vertical', fontFamily:'ui-monospace, monospace', flex:1}}
          />
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            <DictationButton onTranscript={t => setLabText(prev => prev ? prev + '\n' + t.trim() : t.trim())}/>
            <button
              type="button"
              onClick={pickFile}
              disabled={extracting}
              title="Upload PDF, JPEG, or PNG"
              style={{width:'40px', height:'40px', borderRadius:'50%', border:'1px solid rgba(122,176,240,0.3)', background:'rgba(255,255,255,0.8)', cursor: extracting ? 'wait' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px'}}
            >
              {extracting ? '⏳' : '📎'}
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          style={{display:'none'}}
          onChange={e => onFile(e.target.files?.[0])}
        />
        {extracting && <div style={{marginTop:'8px', fontSize:'12px', color:'#4a7ad0'}}>Reading your document…</div>}

        <div style={{marginTop:'14px'}}>
          <div style={FIELD_LABEL}>Clinical context (optional)</div>
          <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="e.g. 68M with HTN, DM2, on lisinopril and metformin. Presents with 2 weeks of fatigue and decreased PO intake."
              style={{...INPUT, minHeight:'70px', resize:'vertical', flex:1}}
            />
            <DictationButton onTranscript={t => setContext(prev => prev ? prev.trimEnd() + ' ' + t : t)}/>
          </div>
        </div>

        <button onClick={analyze} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1, marginTop:'14px'}}>
          {loading ? 'Analyzing…' : 'Analyze lab panel'}
        </button>
      </div>

      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}

      {result && (
        <>
          {result.urgency && URGENCY_STYLE[result.urgency] && (
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderRadius:'14px', background: URGENCY_STYLE[result.urgency].bg, marginBottom:'12px'}}>
              <div style={{fontSize:'13px', fontWeight:700, color: URGENCY_STYLE[result.urgency].text}}>
                Urgency: {URGENCY_STYLE[result.urgency].label}
              </div>
              {typeof remaining === 'number' && (
                <div style={{fontSize:'11px', color:'#6a8ab0'}}>{remaining} free analyses left today</div>
              )}
            </div>
          )}

          {result.urgent_flags && result.urgent_flags.length > 0 && (
            <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'14px', padding:'14px', marginBottom:'12px'}}>
              <div style={{fontSize:'13px', fontWeight:700, color:'#c04040', marginBottom:'6px'}}>⚠ Urgent findings</div>
              {result.urgent_flags.map((f, i) => <div key={i} style={{fontSize:'13px', color:'#c04040', marginBottom:'3px'}}>• {f}</div>)}
            </div>
          )}

          {result.abnormal_values && result.abnormal_values.length > 0 && (
            <div style={CARD}>
              <div style={LABEL}>Abnormal values ({result.abnormal_values.length})</div>
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {result.abnormal_values.map((av, i) => {
                  const sev = av.severity && SEVERITY_STYLE[av.severity];
                  return (
                    <div key={i} style={{display:'flex', gap:'10px', padding:'10px 12px', borderRadius:'10px', background: sev ? sev.bg : 'rgba(240,240,240,0.5)', border: `1px solid ${sev ? sev.border : '#ddd'}`}}>
                      <div style={{flexShrink:0, fontSize:'10px', fontWeight:800, color: sev ? sev.text : '#666', padding:'2px 8px', borderRadius:'999px', background:'rgba(255,255,255,0.6)', alignSelf:'flex-start', letterSpacing:'0.5px'}}>
                        {sev ? sev.label : 'FLAG'}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a'}}>
                          {av.test} — <span style={{color: sev ? sev.text : '#1a2a4a'}}>{av.value}</span>
                          {av.reference_range && <span style={{fontSize:'11px', color:'#8aa0c0', fontWeight:500}}> (ref: {av.reference_range})</span>}
                        </div>
                        {av.comment && <div style={{fontSize:'12px', color:'#4a5e6a', marginTop:'4px', lineHeight:1.55}}>{av.comment}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.panel_interpretation && (
            <div style={CARD}>
              <div style={LABEL}>Panel interpretation</div>
              <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:1.7}}>{result.panel_interpretation}</div>
            </div>
          )}

          {result.differential_diagnoses && result.differential_diagnoses.length > 0 && (
            <div style={CARD}>
              <div style={LABEL}>Differential diagnoses</div>
              <ol style={{margin:0, paddingLeft:'20px', fontSize:'13px', color:'#1a2a4a', lineHeight:1.7}}>
                {result.differential_diagnoses.map((d, i) => <li key={i} style={{marginBottom:'6px'}}>{d}</li>)}
              </ol>
            </div>
          )}

          {result.next_steps && result.next_steps.length > 0 && (
            <div style={{...CARD, background:'linear-gradient(135deg, rgba(122,176,240,0.12), rgba(155,143,232,0.12))'}}>
              <div style={LABEL}>Next steps</div>
              <ul style={{margin:0, paddingLeft:'20px', fontSize:'13px', color:'#1a2a4a', lineHeight:1.7}}>
                {result.next_steps.map((s, i) => <li key={i} style={{marginBottom:'6px'}}>{s}</li>)}
              </ul>
            </div>
          )}

          {result.disclaimer && <div style={{fontSize:'11px', color:'#a0b0c8', textAlign:'center', padding:'6px'}}>{result.disclaimer}</div>}
        </>
      )}
    </ToolShell>
  );
};

export default LabReadTool;
