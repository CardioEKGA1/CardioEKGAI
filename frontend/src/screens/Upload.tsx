import React, { useState, useRef } from 'react';
import { EkgResult, User } from '../App';

interface Props { API: string; token: string; user: User | null; onResult: (r: EkgResult, url: string) => void; onPaywall: () => void; onLogout: () => void; }

const Upload: React.FC<Props> = ({ API, token, user, onResult, onPaywall, onLogout }) => {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = async (file: File) => {
    setLoading(true); setError('');
    const url = URL.createObjectURL(file);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (res.status === 402) { onPaywall(); return; }
      if (res.status === 401) { setError('Please sign in to analyze EKGs.'); return; }
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      onResult(data, url);
    } catch { setError('Analysis failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'40px',maxWidth:'520px',width:'100%',boxShadow:'0 8px 32px rgba(100,130,200,0.12)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="22" height="16" viewBox="0 0 22 16"><polyline points="0,8 4,8 6,2 8,14 10,4 12,12 14,8 22,8" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{fontSize:'18px',fontWeight:'800',color:'#1a2a4a'}}>EKGScan</div>
              <div style={{fontSize:'11px',color:'#8aa0c0'}}>Signed in as {user?.email}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{background:'none',border:'1px solid rgba(122,176,240,0.3)',borderRadius:'8px',padding:'6px 12px',fontSize:'12px',color:'#8aa0c0',cursor:'pointer'}}>Sign Out</button>
        </div>

        {user && !user.is_subscribed && (
          <div style={{background:'rgba(122,176,240,0.1)',borderRadius:'12px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'#4a7ad0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{user.scan_count === 0 ? '1 free scan remaining' : 'Free scan used — upgrade for unlimited'}</span>
            {user.scan_count > 0 && <span onClick={onPaywall} style={{fontWeight:'700',cursor:'pointer'}}>Upgrade →</span>}
          </div>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if(f) analyze(f); }}
          style={{border:`2px dashed ${dragging?'#7ab0f0':'#c0d4f0'}`,borderRadius:'16px',padding:'40px 20px',textAlign:'center',cursor:'pointer',background:dragging?'rgba(122,176,240,0.08)':'rgba(240,246,255,0.5)',transition:'all 0.2s',marginBottom:'20px'}}
        >
          {loading ? (
            <div>
              <div style={{fontSize:'32px',marginBottom:'12px'}}>🔬</div>
              <div style={{fontSize:'15px',fontWeight:'600',color:'#4a7ad0'}}>Analyzing EKG...</div>
              <div style={{fontSize:'12px',color:'#8aa0c0',marginTop:'4px'}}>Claude AI is reading the tracing</div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:'36px',marginBottom:'12px'}}>📄</div>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#1a2a4a',marginBottom:'6px'}}>Drop EKG image here</div>
              <div style={{fontSize:'12px',color:'#8aa0c0',marginBottom:'16px'}}>JPEG · PNG · PDF · up to 20MB</div>
              <div style={{background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',color:'white',borderRadius:'12px',padding:'10px 24px',fontSize:'14px',fontWeight:'600',display:'inline-block'}}>Choose File</div>
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e => { const f = e.target.files?.[0]; if(f) analyze(f); }}/>

        {error && <div style={{background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#c04040',marginBottom:'16px'}}>{error}</div>}

        <div style={{background:'rgba(122,176,240,0.1)',borderRadius:'12px',padding:'12px',fontSize:'11px',color:'#6a8ab0',lineHeight:'1.6',textAlign:'center'}}>
          For decision support only. AI interpretation must be reviewed by a qualified clinician.
        </div>
      </div>
    </div>
  );
};
export default Upload;
