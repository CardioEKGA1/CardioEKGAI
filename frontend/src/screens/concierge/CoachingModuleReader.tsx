// © 2026 SoulMD, LLC. All rights reserved.
// Patient-side coaching module reader. Shows physician-assigned content,
// reflection exercises, and a self-report progress stepper. Warm opal
// palette matching the oracle/meditation ritual.
import React, { useEffect, useState } from 'react';
import ChoKuRei from './ChoKuRei';

interface ModuleDetail {
  id: number; title: string;
  description: string; content: string;
  exercises: any[];
  assignment_id: number;
  progress_pct: number;
  completed_at: string | null;
}

interface Props { API: string; token: string; moduleId: number; onClose: () => void; }

const WARM_BG = 'radial-gradient(ellipse at 30% 20%, #fbeedd 0%, #f6d8c4 45%, #e9c4a4 100%)';
const GOLD    = '#d4a86b';
const INK     = '#4a3a2e';
const INK_SOFT= '#6b5646';
const SERIF   = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

const CoachingModuleReader: React.FC<Props> = ({ API, token, moduleId, onClose }) => {
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/concierge/me/coaching/modules/${moduleId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMod(d))
      .catch(() => setErr('Could not load this module.'))
      .finally(() => setLoading(false));
  }, [API, token, moduleId]);

  const setProgress = async (pct: number) => {
    if (!mod) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/me/coaching/assignments/${mod.assignment_id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ progress_pct: pct }),
      });
      if (res.ok) {
        const d = await res.json();
        setMod({ ...mod, progress_pct: d.progress_pct, completed_at: d.completed_at });
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3400, overflow:'auto',
      background: WARM_BG, color: INK,
      fontFamily: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(20px,5vw,40px) clamp(20px,5vw,32px)',
    }}>
      <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0}}>
        <div style={{position:'absolute', top:'4%', left:'-30px'}}><ChoKuRei size={210} color={GOLD} opacity={0.06}/></div>
        <div style={{position:'absolute', bottom:'8%', right:'-30px'}}><ChoKuRei size={180} color={GOLD} opacity={0.05}/></div>
      </div>

      <div style={{position:'relative', zIndex:1, maxWidth:'620px', margin:'0 auto'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', gap:'10px'}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.6)', border:'1px solid rgba(107,86,70,0.2)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>← Close</button>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: INK_SOFT}}>Coaching</div>
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'80px 0', fontFamily: SERIF, fontStyle:'italic', color: INK_SOFT}}>Opening your module…</div>
        ) : err ? (
          <div style={{textAlign:'center', padding:'60px 20px', color:'#a85020'}}>{err}</div>
        ) : mod ? (
          <>
            {/* Header */}
            <div style={{textAlign:'center', marginBottom:'clamp(24px,5vw,32px)', padding:'10px 0'}}>
              <ChoKuRei size={44} color={GOLD} opacity={0.6}/>
              <div style={{fontFamily: SERIF, fontSize:'clamp(26px,6vw,34px)', fontWeight:600, color: INK, lineHeight:1.15, marginTop:'14px', letterSpacing:'-0.3px'}}>
                {mod.title}
              </div>
              {mod.description && (
                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK_SOFT, marginTop:'12px', lineHeight:1.6, maxWidth:'480px', margin:'12px auto 0'}}>
                  {mod.description}
                </div>
              )}
            </div>

            {/* Progress stepper */}
            <div style={{background:'rgba(255,255,255,0.55)', border:'1px solid rgba(212,168,107,0.3)', borderRadius:'16px', padding:'14px 16px', marginBottom:'24px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px'}}>
                <div style={{fontSize:'10px', letterSpacing:'1.8px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800}}>Your progress</div>
                <div style={{fontSize:'15px', fontWeight:800, color: INK}}>{mod.progress_pct}%</div>
              </div>
              <div style={{height:'6px', borderRadius:'999px', background:'rgba(212,168,107,0.18)', overflow:'hidden', marginBottom:'10px'}}>
                <div style={{width:`${mod.progress_pct}%`, height:'100%', background: `linear-gradient(135deg, ${GOLD}, #8e5d2e)`, transition:'width 0.3s'}}/>
              </div>
              <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                {[0, 25, 50, 75, 100].map(p => (
                  <button key={p} onClick={() => setProgress(p)} disabled={saving}
                    style={{flex:'1 1 auto', minWidth:'54px', background: mod.progress_pct === p ? `${GOLD}29` : 'rgba(255,255,255,0.65)', border:`1px solid ${mod.progress_pct === p ? GOLD : 'rgba(212,168,107,0.3)'}`, borderRadius:'10px', padding:'6px 10px', fontSize:'11px', fontWeight: mod.progress_pct === p ? 800 : 600, color: INK, cursor: saving ? 'wait' : 'pointer', fontFamily:'inherit', opacity: saving ? 0.6 : 1}}>
                    {p}%
                  </button>
                ))}
              </div>
              {mod.completed_at && (
                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'12px', color: INK_SOFT, marginTop:'10px', textAlign:'center'}}>
                  Completed {new Date(mod.completed_at).toLocaleDateString()}.
                </div>
              )}
            </div>

            {/* Content */}
            {mod.content ? (
              <div style={{fontFamily: SERIF, fontSize:'17px', lineHeight:1.85, color: INK, letterSpacing:'0.1px', maxWidth:'560px', margin:'0 auto', marginBottom:'28px', whiteSpace:'pre-wrap'}}>
                {mod.content}
              </div>
            ) : (
              <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: INK_SOFT, textAlign:'center', padding:'40px 20px'}}>
                This module's content hasn't been written yet.
              </div>
            )}

            {/* Exercises */}
            {mod.exercises.length > 0 && (
              <div style={{marginBottom:'28px'}}>
                <div style={{fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, textAlign:'center', marginBottom:'14px'}}>
                  Reflections · {mod.exercises.length}
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  {mod.exercises.map((ex: any, i: number) => (
                    <div key={i} style={{background:'rgba(255,255,255,0.6)', border:'1px solid rgba(212,168,107,0.25)', borderRadius:'14px', padding:'14px 16px'}}>
                      <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'15px', color: INK, lineHeight:1.6}}>
                        {typeof ex === 'string' ? ex : (ex.prompt || JSON.stringify(ex))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{textAlign:'center', marginTop:'30px'}}>
              <ChoKuRei size={30} color={GOLD} opacity={0.5}/>
              <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'12px', color: INK_SOFT, opacity:0.75, marginTop:'10px'}}>
                Return when you're ready to continue.
              </div>
            </div>

            <div style={{display:'flex', justifyContent:'center', paddingBottom:'32px', marginTop:'18px'}}>
              <button onClick={onClose}
                style={{background:'linear-gradient(135deg,#d4a86b,#8e5d2e)', color:'white', border:'none', borderRadius:'14px', padding:'12px 26px', fontSize:'13px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase', boxShadow:'0 10px 22px rgba(142,93,46,0.25)'}}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CoachingModuleReader;
