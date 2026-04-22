// © 2026 SoulMD, LLC. All rights reserved.
// Patient-side meditation player. Opens a distraction-free full-screen
// reader with the script from a physician prescription. Warm opal palette
// matching the oracle ritual. Typography-first; audio lands in Phase 2.
import React, { useCallback, useEffect, useState } from 'react';
import ChoKuRei from './ChoKuRei';

interface Meditation {
  id: number; title: string; category: string;
  duration_min: number; description: string;
  script: string; audio_url: string;
  assigned_at?: string | null;
}

interface Props {
  API: string;
  token: string;
  medId: number;
  onClose: () => void;
}

const WARM_BG = 'radial-gradient(ellipse at 30% 20%, #fbeedd 0%, #f6d8c4 45%, #e9c4a4 100%)';
const GOLD    = '#d4a86b';
const INK     = '#4a3a2e';
const INK_SOFT= '#6b5646';
const SERIF   = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

const FONT_SIZES = [16, 18, 20, 22, 24];

const MeditationPlayer: React.FC<Props> = ({ API, token, medId, onClose }) => {
  const [med, setMed] = useState<Meditation | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [fontSize, setFontSize] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem('meditation_font_size') || '');
      return isNaN(v) || !FONT_SIZES.includes(v) ? 18 : v;
    } catch { return 18; }
  });

  useEffect(() => {
    fetch(`${API}/concierge/me/meditations/${medId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMed(d))
      .catch(() => setErr('Could not load this meditation.'))
      .finally(() => setLoading(false));
  }, [API, token, medId]);

  const bumpFont = (dir: 1 | -1) => {
    const idx = FONT_SIZES.indexOf(fontSize);
    const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + dir))];
    setFontSize(next);
    try { localStorage.setItem('meditation_font_size', String(next)); } catch {}
  };

  // Render the script with natural section pauses for double-newline breaks.
  const paragraphs = (med?.script || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3400, overflow:'auto',
      background: WARM_BG, color: INK,
      fontFamily: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(20px,5vw,40px) clamp(20px,5vw,32px)',
    }}>
      {/* Watermark */}
      <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0}}>
        <div style={{position:'absolute', top:'4%', left:'-30px'}}><ChoKuRei size={210} color={GOLD} opacity={0.06}/></div>
        <div style={{position:'absolute', bottom:'8%', right:'-30px'}}><ChoKuRei size={180} color={GOLD} opacity={0.05}/></div>
      </div>

      <div style={{position:'relative', zIndex:1, maxWidth:'620px', margin:'0 auto'}}>
        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', gap:'10px'}}>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.6)', border:'1px solid rgba(107,86,70,0.2)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>← Close</button>
          <div style={{display:'flex', gap:'4px'}}>
            <button onClick={() => bumpFont(-1)} aria-label="Smaller text"
              style={{background:'rgba(255,255,255,0.55)', border:'1px solid rgba(107,86,70,0.15)', borderRadius:'8px', padding:'6px 10px', fontSize:'11px', fontWeight:700, color:INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>A⁻</button>
            <button onClick={() => bumpFont(1)} aria-label="Larger text"
              style={{background:'rgba(255,255,255,0.55)', border:'1px solid rgba(107,86,70,0.15)', borderRadius:'8px', padding:'6px 10px', fontSize:'13px', fontWeight:700, color:INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>A⁺</button>
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'80px 0', fontFamily: SERIF, fontStyle:'italic', color: INK_SOFT}}>Gathering your meditation…</div>
        ) : err ? (
          <div style={{textAlign:'center', padding:'60px 20px', color:'#a85020'}}>{err}</div>
        ) : med ? (
          <>
            {/* Title card */}
            <div style={{textAlign:'center', marginBottom:'clamp(28px,6vw,40px)', padding:'20px 10px'}}>
              <ChoKuRei size={52} color={GOLD} opacity={0.75}/>
              <div style={{fontFamily: SERIF, fontSize:'clamp(26px,6vw,34px)', fontWeight:600, color: INK, lineHeight:1.15, marginTop:'16px', letterSpacing:'-0.3px'}}>
                {med.title}
              </div>
              <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: INK_SOFT, marginTop:'10px', letterSpacing:'0.3px'}}>
                {med.duration_min} minutes · prescribed by Dr. Anderson
              </div>
              {med.description && (
                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK_SOFT, marginTop:'14px', lineHeight:1.6, maxWidth:'460px', margin:'14px auto 0'}}>
                  {med.description}
                </div>
              )}
            </div>

            {/* Invitation */}
            <div style={{
              background:'rgba(255,255,255,0.55)',
              border:'1px solid rgba(212,168,107,0.3)',
              borderRadius:'18px', padding:'16px 18px',
              fontFamily: SERIF, fontStyle:'italic', fontSize:'14px',
              color: INK, lineHeight:1.7, textAlign:'center',
              marginBottom:'clamp(24px,5vw,32px)',
            }}>
              Find a quiet place. Put the phone aside when you can — or let the words carry you where you sit. Read slowly. Each paragraph holds a breath.
            </div>

            {/* Script */}
            <div style={{
              fontFamily: SERIF, fontSize: `${fontSize}px`, lineHeight: 1.85,
              color: INK, letterSpacing: '0.1px',
              display:'flex', flexDirection:'column', gap:'clamp(18px,3vw,24px)',
              maxWidth:'560px', margin:'0 auto',
            }}>
              {paragraphs.length > 0 ? paragraphs.map((p, i) => (
                <p key={i} style={{margin:0, whiteSpace:'pre-wrap'}}>{p}</p>
              )) : (
                <p style={{margin:0, fontStyle:'italic', color: INK_SOFT, textAlign:'center'}}>This meditation has no script yet.</p>
              )}
            </div>

            {/* Closing */}
            <div style={{textAlign:'center', marginTop:'clamp(32px,6vw,44px)', padding:'12px 0 8px'}}>
              <ChoKuRei size={36} color={GOLD} opacity={0.55}/>
              <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'12px', color: INK_SOFT, opacity:0.75, marginTop:'10px'}}>
                Sit in what this opens for you before returning to the day.
              </div>
            </div>

            <div style={{display:'flex', justifyContent:'center', paddingBottom:'32px', marginTop:'22px'}}>
              <button onClick={onClose}
                style={{background:'linear-gradient(135deg,#d4a86b,#8e5d2e)', color:'white', border:'none', borderRadius:'14px', padding:'12px 26px', fontSize:'13px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase', boxShadow:'0 10px 22px rgba(142,93,46,0.25)'}}>
                Return gently
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MeditationPlayer;
