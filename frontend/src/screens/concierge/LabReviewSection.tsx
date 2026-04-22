// © 2026 SoulMD, LLC. All rights reserved.
// Physician-facing Lab Review. Pending inbox, Reviewed, Flagged tabs.
// Tap a lab → preview pane with file viewer + physician-note textarea +
// Mark reviewed / Flag buttons. Flips the lab's status server-side and
// pushes the patient.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface Lab {
  id: number; patient_id: number; patient_name: string;
  filename: string; mime_type: string | null; size_bytes: number;
  status: 'pending' | 'reviewed' | 'flagged';
  flagged: boolean;
  physician_note: string;
  uploaded_at: string | null; reviewed_at: string | null;
}
interface Counts { pending: number; reviewed: number; flagged: number; }

type Tab = 'pending' | 'reviewed' | 'flagged';

const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', borderRadius:'16px',
  border:'1px solid rgba(122,176,240,0.2)',
  boxShadow:'0 2px 10px rgba(100,130,200,0.1)', padding:'16px',
};
const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};

const STATUS_STYLES: Record<string, {bg:string; color:string; label:string}> = {
  pending:  { bg:'rgba(232,168,64,0.18)', color:'#a06810', label:'Pending' },
  reviewed: { bg:'rgba(42,191,191,0.15)', color:'#147070', label:'Reviewed' },
  flagged:  { bg:'rgba(232,144,176,0.18)', color:'#a02060', label:'Flagged' },
};

const bytes = (n: number) => n > 1024*1024 ? `${(n/1024/1024).toFixed(1)} MB` : `${Math.round(n/1024)} KB`;

const LabReviewSection: React.FC<Props> = ({ API, token, accent }) => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, reviewed: 0, flagged: 0 });
  const [tab, setTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Lab | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/labs?status=${tab}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setLabs(d.labs || []); setCounts(d.counts || { pending: 0, reviewed: 0, flagged: 0 }); })
      .catch(() => setError('Could not load labs.'))
      .finally(() => setLoading(false));
  }, [API, token, tab]);
  useEffect(() => { load(); }, [load]);

  if (selected) {
    return <LabDetail API={API} token={token} accent={accent} lab={selected} onClose={() => { setSelected(null); load(); }}/>;
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Lab Review</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>
            {counts.pending} pending · {counts.reviewed} reviewed · {counts.flagged} flagged
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:'6px', marginBottom:'14px'}}>
        {(['pending', 'reviewed', 'flagged'] as const).map(t => {
          const active = tab === t;
          const c = counts[t];
          const ss = STATUS_STYLES[t];
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex:1, padding:'9px 14px', borderRadius:'999px',
                fontSize:'12px', fontWeight: active ? 700 : 600,
                border: active ? 'none' : '1px solid rgba(122,176,240,0.3)',
                background: active ? accent : 'rgba(255,255,255,0.7)',
                color: active ? 'white' : '#4a7ad0',
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              }}>
              {ss.label}
              <span style={{fontSize:'10px', fontWeight:800, padding:'2px 7px', borderRadius:'999px', background: active ? 'rgba(255,255,255,0.25)' : ss.bg, color: active ? 'white' : ss.color}}>{c}</span>
            </button>
          );
        })}
      </div>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
      ) : labs.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.5}}>🧪</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>
            {tab === 'pending' ? 'Inbox clear' : tab === 'reviewed' ? 'No reviewed labs' : 'No flagged labs'}
          </div>
          <div style={{fontSize:'12px'}}>
            {tab === 'pending' ? 'Patient lab uploads appear here for review.' : `Items marked ${tab} show up here.`}
          </div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {labs.map(lab => {
            const ss = STATUS_STYLES[lab.status] || STATUS_STYLES.pending;
            return (
              <button key={lab.id} onClick={() => setSelected(lab)}
                style={{...CARD, textAlign:'left', cursor:'pointer', fontFamily:'inherit', width:'100%', padding:'14px 16px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <div style={{minWidth:0, flex:1}}>
                    <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lab.filename}</div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'2px'}}>
                      {lab.patient_name} · {lab.uploaded_at ? new Date(lab.uploaded_at).toLocaleString() : '—'} · {bytes(lab.size_bytes)}
                    </div>
                  </div>
                  <span style={{fontSize:'10px', padding:'4px 10px', borderRadius:'999px', background: ss.bg, color: ss.color, fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase'}}>{ss.label}</span>
                </div>
                {lab.physician_note && (
                  <div style={{fontSize:'12px', color:'#4a5e6a', marginTop:'8px', lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2, overflow:'hidden'}}>
                    <strong>Your note:</strong> {lab.physician_note}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───── Detail view ─────────────────────────────────────────────────────────

const LabDetail: React.FC<{API:string; token:string; accent:string; lab: Lab; onClose: () => void}> = ({ API, token, accent, lab, onClose }) => {
  const [note, setNote] = useState(lab.physician_note || '');
  const [saving, setSaving] = useState<'reviewed' | 'flagged' | null>(null);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(true);

  useEffect(() => {
    setFileLoading(true);
    fetch(`${API}/concierge/labs/${lab.id}/file`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const bin = atob(d.file_b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: d.mime_type || 'application/octet-stream' });
        setFileUrl(URL.createObjectURL(blob));
      })
      .catch(() => setError('Could not load file.'))
      .finally(() => setFileLoading(false));
    return () => { if (fileUrl) URL.revokeObjectURL(fileUrl); };
    // Deps intentionally only lab.id — fileUrl is produced INSIDE this effect;
    // including it would loop. API/token are stable for a given mount.
  }, [lab.id]);  // eslint-disable-line

  const act = async (status: 'reviewed' | 'flagged') => {
    setSaving(status); setError('');
    try {
      const res = await fetch(`${API}/concierge/labs/${lab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ status, physician_note: note.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.detail || 'Failed'); }
      onClose();
    } catch (e: any) { setError(e.message); setSaving(null); }
  };

  const isPDF = (lab.mime_type || '') === 'application/pdf';
  const isImage = (lab.mime_type || '').startsWith('image/');

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', marginBottom:'14px', flexWrap:'wrap'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>← All labs</button>
        {fileUrl && <a href={fileUrl} download={lab.filename} style={{fontSize:'12px', color:'#4a7ad0', fontWeight:700, textDecoration:'none', background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'7px 14px'}}>Download ↓</a>}
      </div>

      <div style={{...CARD, marginBottom:'14px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', flexWrap:'wrap'}}>
          <div style={{minWidth:0, flex:1}}>
            <div style={{fontSize:'11px', color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:700}}>{lab.patient_name}</div>
            <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lab.filename}</div>
            <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'4px'}}>
              Uploaded {lab.uploaded_at ? new Date(lab.uploaded_at).toLocaleString() : '—'} · {bytes(lab.size_bytes)} · {lab.mime_type}
            </div>
          </div>
          <span style={{fontSize:'10px', padding:'4px 10px', borderRadius:'999px', background: (STATUS_STYLES[lab.status] || STATUS_STYLES.pending).bg, color: (STATUS_STYLES[lab.status] || STATUS_STYLES.pending).color, fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase'}}>{(STATUS_STYLES[lab.status] || STATUS_STYLES.pending).label}</span>
        </div>
      </div>

      {/* File preview */}
      <div style={{...CARD, marginBottom:'14px', padding:'0', overflow:'hidden'}}>
        {fileLoading ? (
          <div style={{padding:'60px 20px', textAlign:'center', color:'#6a8ab0'}}>Loading file…</div>
        ) : !fileUrl ? (
          <div style={{padding:'60px 20px', textAlign:'center', color:'#a02020'}}>Could not load file.</div>
        ) : isPDF ? (
          <iframe src={fileUrl} title={lab.filename} style={{width:'100%', height:'clamp(400px, 70vh, 720px)', border:'none', display:'block'}}/>
        ) : isImage ? (
          <div style={{textAlign:'center', padding:'12px', background:'rgba(240,246,255,0.3)'}}>
            <img src={fileUrl} alt={lab.filename} style={{maxWidth:'100%', maxHeight:'600px', borderRadius:'8px'}}/>
          </div>
        ) : (
          <div style={{padding:'30px 20px', textAlign:'center', color:'#6a8ab0', fontSize:'13px'}}>
            Preview not available for {lab.mime_type || 'this file type'}. Use Download above.
          </div>
        )}
      </div>

      {/* Review pane */}
      <div style={{...CARD}}>
        <div style={{fontSize:'11px', fontWeight:800, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'10px'}}>Your note to the patient</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={5}
          placeholder="What to share when they open the result. Keep it plain-language and grounding. Normal ranges → in teal; anything flagged → in blush pink on their end."
          style={{...INPUT, minHeight:'130px', resize:'vertical'}}/>
        <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'6px', lineHeight:1.5}}>
          A push notification is sent when you mark reviewed or flagged; the first 120 characters of this note become the push preview.
        </div>

        {error && <div style={{color:'#a02020', fontSize:'12px', marginTop:'10px'}}>{error}</div>}

        <div style={{display:'flex', gap:'8px', marginTop:'14px', flexWrap:'wrap'}}>
          <button onClick={() => act('reviewed')} disabled={!!saving}
            style={{flex:1, minWidth:'140px', background: 'linear-gradient(135deg,#2ABFBF,#147070)', border:'none', color:'white', borderRadius:'12px', padding:'12px 18px', fontSize:'13px', fontWeight:800, cursor: saving ? 'wait' : 'pointer', opacity: saving === 'reviewed' ? 0.6 : 1, fontFamily:'inherit'}}>
            {saving === 'reviewed' ? 'Saving…' : '✓ Mark reviewed'}
          </button>
          <button onClick={() => act('flagged')} disabled={!!saving}
            style={{flex:1, minWidth:'140px', background: 'linear-gradient(135deg,#E890B0,#a02060)', border:'none', color:'white', borderRadius:'12px', padding:'12px 18px', fontSize:'13px', fontWeight:800, cursor: saving ? 'wait' : 'pointer', opacity: saving === 'flagged' ? 0.6 : 1, fontFamily:'inherit'}}>
            {saving === 'flagged' ? 'Saving…' : '⚑ Flag for follow-up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabReviewSection;
