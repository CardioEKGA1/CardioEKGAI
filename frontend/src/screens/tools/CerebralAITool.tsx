// © 2026 SoulMD. All rights reserved.
import React, { useState, useRef } from 'react';
import { ToolShell, ToolResult, CARD, LABEL, BTN_PRIMARY } from './shared';

interface Props { API: string; token: string; onBack: () => void; }

const CerebralAITool: React.FC<Props> = ({ API, token, onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null | undefined) => {
    setResult(null); setError('');
    if (!f) return;
    const name = f.name.toLowerCase();
    const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(name);
    const isDicom = f.type === 'application/dicom' || /\.(dcm|dicom)$/i.test(name);
    const isImageOrPdf = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(f.type);
    if (!isVideo && !isDicom && !isImageOrPdf) {
      setError('JPEG, PNG, PDF, MP4/MOV video, or DICOM only.'); return;
    }
    const limit = isVideo ? 50 : 10;
    if (f.size > limit * 1024 * 1024) { setError(`File too large. Max ${limit}MB.`); return; }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
  };

  const analyze = async () => {
    if (!file) { setError('Select an image first.'); return; }
    setLoading(true); setError(''); setResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API}/tools/cerebralai/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ToolShell name="CerebralAI" subtitle="Brain and spine MRI / CT interpretation." onBack={onBack}>
      <div style={CARD}>
        <div style={LABEL}>Upload brain or spine study</div>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
          style={{border:`2px dashed ${dragging?'#7ab0f0':'#c0d4f0'}`, borderRadius:'14px', padding:'32px 20px', textAlign:'center', cursor:'pointer', background: dragging?'rgba(122,176,240,0.08)':'rgba(240,246,255,0.5)', transition:'all 0.2s', marginBottom:'12px'}}
        >
          <div style={{fontSize:'32px', marginBottom:'8px'}}>🧠</div>
          <div style={{fontSize:'14px', fontWeight:'700', color:'#1a2a4a', marginBottom:'4px'}}>{file ? file.name : 'Drop MRI / CT slice, video, or DICOM here'}</div>
          <div style={{fontSize:'11px', color:'#8aa0c0'}}>JPEG · PNG · PDF up to 10MB · MP4/MOV up to 50MB · DICOM</div>
        </div>
        <input ref={inputRef} type="file" accept="image/*,.pdf,.mp4,.mov,.m4v,.webm,.dcm,.dicom,video/*,application/dicom" style={{display:'none'}} onChange={e => pickFile(e.target.files?.[0])}/>
        {previewUrl && (
          <div style={{marginBottom:'12px'}}>
            <img src={previewUrl} alt="Neuroimaging preview" style={{maxWidth:'100%', maxHeight:'360px', borderRadius:'12px', border:'1px solid rgba(122,176,240,0.2)', display:'block', margin:'0 auto'}}/>
          </div>
        )}
        <button onClick={analyze} disabled={!file || loading} style={{...BTN_PRIMARY, width:'100%', opacity: (!file || loading) ? 0.6 : 1}}>{loading ? 'Interpreting study…' : 'Interpret study'}</button>
        <div style={{fontSize:'11px', color:'#8aa0c0', marginTop:'10px', textAlign:'center', lineHeight:'1.6'}}>Videos are sampled at 5 frames per minute (up to 15 frames). DICOM studies render the middle slice.</div>
      </div>
      {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      {result && <ToolResult data={result}/>}
    </ToolShell>
  );
};

export default CerebralAITool;
