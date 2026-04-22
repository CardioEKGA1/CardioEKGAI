// © 2026 SoulMD, LLC. All rights reserved.
// Daily Oracle Card — full-screen pull experience.
// Phase 1a: tap to reveal, nebula + Cho Ku Rei symbol + 8 radiating beams,
// opal bottom half with message, breathing + shimmer animations. Share as
// image + Book matching meditation are Phase 1b stubs.
import React, { useEffect, useState } from 'react';
import ChoKuRei from './ChoKuRei';

interface OracleCardData {
  id: number;
  category: string;
  category_label?: string;
  category_color?: string;
  title: string;
  body: string;
}
interface TodayPayload {
  already_pulled: boolean;
  date: string;
  card: OracleCardData;
  saved: boolean;
}

interface Props {
  API: string;
  token: string;
  userName: string;
  onClose: () => void;
  onBookMeditation?: () => void;
}

// Keyframes injected once at module load. Using raw CSS because the rest of
// the app uses inline styles — keeping a tiny stylesheet for animations that
// can't be expressed inline.
const ORACLE_STYLE_ID = 'oracle-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ORACLE_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = ORACLE_STYLE_ID;
  s.innerHTML = `
    @keyframes oracleBreath  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
    @keyframes oracleShimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
    @keyframes oracleGlowRing{ 0%,100% { opacity: 0.55 } 50% { opacity: 0.95 } }
    @keyframes oracleBeamRotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
    @keyframes oracleTwinkle { 0%,100% { opacity: 0.25 } 50% { opacity: 1 } }
    @keyframes oracleFadeIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes oracleDeckHover { 0%,100% { transform: translateY(0) rotate(-2deg) } 50% { transform: translateY(-4px) rotate(-2deg) } }
  `;
  document.head.appendChild(s);
}

const OPAL_BG = 'linear-gradient(135deg, #1a0d35 0%, #2d1b4e 45%, #6b3a7c 100%)';
const CARD_BOTTOM = 'linear-gradient(180deg, rgba(245,232,248,1) 0%, rgba(232,218,245,1) 100%)';

const OracleCard: React.FC<Props> = ({ API, token, userName, onClose, onBookMeditation }) => {
  const [phase, setPhase] = useState<'deck' | 'revealing' | 'revealed'>('deck');
  const [data, setData] = useState<TodayPayload | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => { ensureKeyframes(); }, []);

  const pullCard = async () => {
    if (phase !== 'deck') return;
    setPhase('revealing');
    try {
      const res = await fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not pull today\'s card.');
      // Slight delay so the reveal animation reads, even on fast networks.
      setTimeout(() => { setData(d); setPhase('revealed'); }, 1100);
    } catch (e: any) {
      setErr(e.message || 'Could not pull card.');
      setPhase('deck');
    }
  };

  const save = async () => {
    if (!data) return;
    try {
      const res = await fetch(`${API}/concierge/oracle/today/save`, { method:'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData({ ...data, saved: true });
    } catch {}
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3000, overflow:'auto',
      background: OPAL_BG, color:'white',
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'clamp(20px,5vw,40px)',
    }}>
      {/* Twinkling stars background — 30 random points. Seeded positions so
          they don't re-shuffle every re-render. */}
      <StarField/>

      {/* Top greeting */}
      <div style={{zIndex:1, textAlign:'center', marginTop:'clamp(12px,4vw,24px)', maxWidth:'520px', animation:'oracleFadeIn 0.8s ease'}}>
        <div style={{fontSize:'11px', letterSpacing:'3px', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', fontWeight:600, marginBottom:'6px'}}>
          {new Date().toLocaleDateString(undefined,{ weekday:'long', month:'long', day:'numeric' })}
        </div>
        <div style={{fontSize:'clamp(20px,5vw,26px)', fontWeight:700, color:'white', lineHeight:1.3}}>
          Good morning, {userName || 'friend'} <span style={{fontWeight:400}}>✨</span>
        </div>
        <div style={{fontSize:'14px', color:'rgba(245,232,248,0.8)', marginTop:'8px', lineHeight:1.5, fontStyle:'italic'}}>
          {phase === 'revealed' ? 'You\'ll be amazed by the guidance you receive from the Universe.' : 'The Universe has a message for you today.'}
        </div>
      </div>

      {/* Deck / Card stage */}
      <div style={{zIndex:1, flex:'0 0 auto', marginTop:'clamp(24px,5vw,40px)', marginBottom:'clamp(20px,4vw,28px)', minHeight:'clamp(420px,70vw,560px)', width:'100%', maxWidth:'400px', display:'flex', alignItems:'center', justifyContent:'center'}}>
        {phase !== 'revealed' && <Deck onPick={pullCard} revealing={phase === 'revealing'}/>}
        {phase === 'revealed' && data && <RevealedCard data={data}/>}
      </div>

      {/* Error banner */}
      {err && (
        <div style={{zIndex:1, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(246,191,211,0.4)', color:'#F6BFD3', borderRadius:'12px', padding:'10px 14px', fontSize:'12px', marginBottom:'16px'}}>
          {err}
        </div>
      )}

      {/* Action bar */}
      <div style={{zIndex:1, display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center', marginBottom:'28px', width:'100%', maxWidth:'420px'}}>
        {phase === 'revealed' && data && (
          <>
            <button onClick={save} disabled={data.saved}
              style={{flex:'1 1 140px', background: data.saved ? 'rgba(246,191,211,0.3)' : 'linear-gradient(135deg,#F6BFD3,#E890B0)', color:'white', border:'none', borderRadius:'14px', padding:'12px 14px', fontSize:'13px', fontWeight:700, cursor: data.saved ? 'default' : 'pointer'}}>
              {data.saved ? '♡ Saved to Energy Log' : '♡ Save to Energy Log'}
            </button>
            {onBookMeditation && (
              <button onClick={onBookMeditation}
                style={{flex:'1 1 140px', background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'14px', padding:'12px 14px', fontSize:'13px', fontWeight:700, cursor:'pointer'}}>
                🧘 Book meditation
              </button>
            )}
          </>
        )}
        <button onClick={onClose}
          style={{flex:'1 1 140px', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.85)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'14px', padding:'12px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer'}}>
          {phase === 'revealed' ? 'Pull again tomorrow' : 'Not today'}
        </button>
      </div>
    </div>
  );
};

// Deck before reveal — stack of 3 "cards" with gentle hover animation.
const Deck: React.FC<{onPick: () => void; revealing: boolean}> = ({ onPick, revealing }) => {
  return (
    <button onClick={onPick} disabled={revealing}
      style={{
        position:'relative', width:'clamp(220px,62vw,300px)', height:'clamp(330px,94vw,440px)',
        background:'transparent', border:'none', cursor: revealing ? 'wait' : 'pointer', padding:0,
        animation: revealing ? 'oracleGlowRing 1.1s ease-in-out infinite' : 'oracleDeckHover 3.6s ease-in-out infinite',
      }}>
      {[2,1,0].map(i => (
        <div key={i} style={{
          position:'absolute', inset:0,
          transform: `translate(${i*4}px, ${-i*4}px) rotate(${-2 + i*1.5}deg)`,
          borderRadius:'22px',
          background: 'linear-gradient(180deg, #1a0d35, #2d1b4e 55%, #4a2d6b)',
          border:'1px solid rgba(255,255,255,0.15)',
          boxShadow: `0 ${10+i*4}px ${25+i*6}px rgba(0,0,0,0.45), inset 0 0 80px rgba(155,143,232,0.25)`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {i === 0 && <ChoKuRei size={120} color="#e0c4ff" opacity={0.6} glow/>}
        </div>
      ))}
      {!revealing && (
        <div style={{position:'absolute', bottom:'-36px', left:0, right:0, textAlign:'center', fontSize:'12px', color:'rgba(255,255,255,0.75)', letterSpacing:'1.5px', textTransform:'uppercase'}}>
          Tap to pull
        </div>
      )}
    </button>
  );
};

// Revealed card — nebula top + opal bottom + message.
const RevealedCard: React.FC<{data: TodayPayload}> = ({ data }) => {
  const catColor = data.card.category_color || '#B08AE0';
  return (
    <div style={{
      position:'relative', width:'clamp(260px,78vw,340px)', borderRadius:'24px', overflow:'hidden',
      boxShadow:'0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.15), inset 0 0 60px rgba(155,143,232,0.15)',
      animation:'oracleBreath 5s ease-in-out infinite, oracleFadeIn 0.9s ease',
      background:'white',
    }}>
      {/* Glow ring behind the card */}
      <div style={{position:'absolute', inset:'-8px', borderRadius:'32px', background:`radial-gradient(ellipse at center, ${catColor}66, transparent 70%)`, filter:'blur(14px)', animation:'oracleGlowRing 4s ease-in-out infinite', zIndex:-1}}/>

      {/* Nebula top 55% */}
      <div style={{position:'relative', height:'clamp(200px,50vw,260px)', background: 'radial-gradient(ellipse at 30% 30%, #6b3a7c 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, #9e7bd4 0%, transparent 55%), linear-gradient(180deg, #1a0d35, #2d1b4e)'}}>
        {/* Nebula clouds */}
        <div style={{position:'absolute', top:'-10%', left:'-10%', width:'60%', height:'70%', background:'radial-gradient(circle, rgba(246,191,211,0.5) 0%, transparent 70%)', filter:'blur(28px)'}}/>
        <div style={{position:'absolute', bottom:'-15%', right:'-10%', width:'70%', height:'80%', background:'radial-gradient(circle, rgba(158,123,212,0.55) 0%, transparent 70%)', filter:'blur(32px)'}}/>
        <div style={{position:'absolute', top:'30%', right:'20%', width:'40%', height:'50%', background:'radial-gradient(circle, rgba(197,232,244,0.35) 0%, transparent 70%)', filter:'blur(24px)'}}/>

        {/* Twinkling stars */}
        <StarField small/>

        {/* 8 radiating light beams */}
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{position:'relative', width:'1px', height:'1px', animation:'oracleBeamRotate 28s linear infinite'}}>
            {Array.from({length:8}).map((_, i) => (
              <div key={i} style={{
                position:'absolute', left:'-1px', top:'-140px', width:'2px', height:'140px',
                background:'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                transformOrigin:'1px 140px',
                transform:`rotate(${i * 45}deg)`,
                filter:'blur(1px)',
              }}/>
            ))}
          </div>
        </div>

        {/* Centered Cho Ku Rei */}
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <ChoKuRei size={130} color="#ffffff" opacity={0.92} glow/>
        </div>

        {/* Category tag top-left */}
        <div style={{position:'absolute', top:'12px', left:'12px', fontSize:'10px', color:'rgba(255,255,255,0.92)', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', padding:'3px 10px', borderRadius:'999px', letterSpacing:'1.2px', textTransform:'uppercase', fontWeight:700, backdropFilter:'blur(6px)'}}>
          {data.card.category_label || data.card.category}
        </div>
      </div>

      {/* Opal bottom 45% */}
      <div style={{position:'relative', background: CARD_BOTTOM, padding:'20px 20px 22px 20px'}}>
        {/* Pearly shimmer overlay */}
        <div style={{position:'absolute', inset:0, background:'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)', backgroundSize:'200% 100%', animation:'oracleShimmer 6s linear infinite', pointerEvents:'none', opacity:0.5}}/>
        <div style={{position:'relative'}}>
          <div style={{fontSize:'17px', fontWeight:800, color:'#4a2d6b', letterSpacing:'0.2px', marginBottom:'10px'}}>{data.card.title}</div>
          <div style={{fontSize:'13px', color:'#6b4e7c', lineHeight:1.7, fontStyle:'italic', marginBottom:'16px'}}>{data.card.body}</div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(107,78,124,0.15)', paddingTop:'8px'}}>
            <div style={{fontSize:'9px', color:'#6b4e7c', letterSpacing:'2px', textTransform:'uppercase', fontWeight:700, opacity:0.7}}>SoulMD Oracle</div>
            <div style={{fontSize:'10px', color:'#8a6db0'}}>{data.date}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Seeded-random star field so stars don't re-shuffle on re-render.
const STARS = Array.from({length: 40}, (_, i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  const y = Math.sin(i * 78.233)  * 43758.5453;
  const d = Math.sin(i * 24.541)  * 43758.5453;
  return {
    top: (Math.abs(x) % 100).toFixed(2) + '%',
    left: (Math.abs(y) % 100).toFixed(2) + '%',
    delay: (Math.abs(d) % 3).toFixed(2) + 's',
    size: (Math.abs(x * y) % 2 + 1).toFixed(1),
  };
});

const StarField: React.FC<{small?: boolean}> = ({ small }) => (
  <div style={{position:'absolute', inset:0, pointerEvents:'none'}}>
    {STARS.slice(0, small ? 20 : 40).map((s, i) => (
      <div key={i} style={{
        position:'absolute', top:s.top, left:s.left,
        width:`${s.size}px`, height:`${s.size}px`,
        background:'white', borderRadius:'50%',
        boxShadow:'0 0 4px white',
        animation:`oracleTwinkle 2.4s ease-in-out infinite`,
        animationDelay: s.delay,
        opacity: 0.5,
      }}/>
    ))}
  </div>
);

export default OracleCard;
