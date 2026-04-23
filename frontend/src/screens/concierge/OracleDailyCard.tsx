// © 2026 SoulMD, LLC. All rights reserved.
//
// Oracle card ritual — 7-card watercolor-sprite arc with guaranteed-no-overflow reveal.
//
// Card back: 1 of 10 watercolor flowers from frontend/src/assets/flowers.png
// (2-row, 5-column sprite sheet). Flower rotates daily via dayOfYear % 10.
// Card front (revealed): cream + gold, auto-fit typography bucketed by
// message length so the longest oracle pull still fits without scrolling.
import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { shareOracleCard } from './shareOracleCard';
import flowersImg from '../../assets/flowers.png';

interface OracleCardData {
  id: number; category: string;
  category_label?: string; category_color?: string;
  title: string; body: string;
}
interface OracleTodaySlim {
  pulled: boolean;
  card: { id:number; title:string; category_label?:string; reflection?:string; saved?:boolean } | null;
}

interface Props {
  API: string;
  token: string;
  todaysCard: OracleTodaySlim | null;
  isSuperuser: boolean;
  onChanged: () => void;
  onOpenEnergyLog: () => void;
}

const BG_PEARL  = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)';
const GOLD      = '#C9A84C';
const GOLD_SOFT = '#E6C97A';
const GOLD_BRIGHT = '#FFE4A3';
const CREAM     = '#FFFEFA';
const INK_CARD  = '#2A2150';
const INK_SOFT  = '#6B6889';
const PURPLE    = '#534AB7';
const PURPLE_MID= '#9b8fe8';
const SERIF     = '"Playfair Display",serif';
const EASE      = [0.22, 1, 0.36, 1] as const;

// Sprite sheet mapping — 5 columns × 2 rows, 10 flowers.
interface FlowerCell { name: string; col: number; row: number; }
const FLOWERS: FlowerCell[] = [
  { name: 'Rose',           col: 0, row: 0 },
  { name: 'Lotus',          col: 1, row: 0 },
  { name: 'Sunflower',      col: 2, row: 0 },
  { name: 'Cherry Blossom', col: 3, row: 0 },
  { name: 'Iris',           col: 4, row: 0 },
  { name: 'Peony',          col: 0, row: 1 },
  { name: 'Lily',           col: 1, row: 1 },
  { name: 'Dahlia',          col: 2, row: 1 },
  { name: 'Lavender',       col: 3, row: 1 },
  { name: 'Hibiscus',       col: 4, row: 1 },
];

const dayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};
const initialFlowerIndex = (): number => dayOfYear() % FLOWERS.length;

// Background position for a sprite cell on a 500% × 200% backgroundSize.
// Each cell is 20% wide + 100% tall; x-position steps by 20% and wraps
// column 0..4 → 0%, 25%, 50%, 75%, 100%. y-position steps row 0 → 0%, row 1 → 100%.
const spriteBgPosition = (cell: FlowerCell) => ({
  backgroundImage: `url(${flowersImg})`,
  backgroundSize: '500% 200%',
  backgroundPosition: `${cell.col * 25}% ${cell.row * 100}%`,
  backgroundRepeat: 'no-repeat' as const,
});

// Fonts + keyframes (once).
if (typeof document !== 'undefined' && !document.getElementById('oracle-daily-fonts')) {
  const pre1 = document.createElement('link');
  pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
  const pre2 = document.createElement('link');
  pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
  const link = document.createElement('link');
  link.id = 'oracle-daily-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap';
  document.head.appendChild(pre1);
  document.head.appendChild(pre2);
  document.head.appendChild(link);
}
if (typeof document !== 'undefined' && !document.getElementById('oracle-daily-keyframes')) {
  const s = document.createElement('style');
  s.id = 'oracle-daily-keyframes';
  s.innerHTML = `
    @keyframes oracleCenterBreathe {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes oracleGoldRing {
      0%, 100% { box-shadow: 0 0 12px rgba(201,168,76,0.25), 0 0 28px rgba(230,201,122,0.15), inset 0 0 14px rgba(255,228,163,0.12); }
      50%      { box-shadow: 0 0 20px rgba(201,168,76,0.55), 0 0 44px rgba(230,201,122,0.28), inset 0 0 22px rgba(255,228,163,0.25); }
    }
    @keyframes oracleShine {
      0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
      35%  { opacity: 0.28; }
      65%  { opacity: 0.28; }
      100% { transform: translateX(120%)  skewX(-18deg); opacity: 0; }
    }
    @keyframes oracleParticleDrift {
      0%   { transform: translate3d(0, 0, 0); opacity: 0; }
      15%  { opacity: 0.85; }
      85%  { opacity: 0.5; }
      100% { transform: translate3d(calc(var(--drift, 16px)), -110vh, 0); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}

const dateKey = () => new Date().toISOString().slice(0, 10);
const lockKey = () => `oracle_pulled_${dateKey()}`;

// Option C dimensions — side cards 200×310, center 220×340. x-offsets tightened
// for 390px-viewport mobile fit; center fully visible, far-left/right allowed
// to clip off-screen (per spec — "feels like endless deck").
const CARD_W_SIDE = 200;
const CARD_H_SIDE = 310;
const CARD_W_CENTER = 220;
const CARD_H_CENTER = 340;
const STAGE_H = 440;   // accommodates center 340 + breathe + hover + reveal y-shift

interface FanPos { x: number; rot: number; scale: number; isCenter: boolean; }
const FAN: FanPos[] = [
  { x: -195, rot: -20, scale: 0.75, isCenter: false }, // far left
  { x: -105, rot: -12, scale: 0.85, isCenter: false }, // mid left
  { x:  -48, rot:  -6, scale: 0.95, isCenter: false }, // near left
  { x:    0, rot:   0, scale: 1.00, isCenter: true  }, // center
  { x:   48, rot:   6, scale: 0.95, isCenter: false }, // near right
  { x:  105, rot:  12, scale: 0.85, isCenter: false }, // mid right
  { x:  195, rot:  20, scale: 0.75, isCenter: false }, // far right
];

const OracleDailyCard: React.FC<Props> = ({ API, token, todaysCard, isSuperuser, onChanged, onOpenEnergyLog }) => {
  const [phase, setPhase] = useState<'deck' | 'picking' | 'revealed'>('deck');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [card, setCard] = useState<OracleCardData | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [flowerIndex, setFlowerIndex] = useState<number>(initialFlowerIndex);

  const [lockedToday, setLockedToday] = useState<boolean>(() => {
    try {
      if (isSuperuser) return false;
      return !!localStorage.getItem(lockKey());
    } catch { return false; }
  });

  const flower = FLOWERS[flowerIndex % FLOWERS.length];

  useEffect(() => {
    if (!(todaysCard?.pulled && todaysCard.card)) return;
    (async () => {
      try {
        const res = await fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        // eslint-disable-next-line no-console
        console.log('[oracle/today GET]', res.status, d);
        if (d?.card) {
          setCard(d.card);
          setPickedIndex(3);         // center card
          setFlipped(true);
          setPhase('revealed');
          if (!isSuperuser) {
            try { localStorage.setItem(lockKey(), String(d.card.id)); } catch {}
            setLockedToday(true);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[oracle/today GET failed]', e);
      }
    })();
  }, [API, token, todaysCard, isSuperuser]);

  const pickCard = useCallback(async (i: number) => {
    if (phase !== 'deck' || loading || lockedToday) return;
    setErr('');
    setPickedIndex(i);
    setPhase('picking');
    setLoading(true);
    try {
      const res = await fetch(`${API}/concierge/oracle/today`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      // eslint-disable-next-line no-console
      console.log('[oracle/today POST]', res.status, d);
      if (!res.ok) throw new Error(d.detail || 'Could not draw today\'s card.');
      if (!d.card) throw new Error('Server returned no card object.');
      if (!d.card.title && !d.card.body) throw new Error('Server returned a card with no title or body.');
      setCard(d.card);
      // Choreography: glide to center (0 → 400ms) → flip (400ms → 1400ms).
      setTimeout(() => {
        setFlipped(true);
        setTimeout(() => {
          setPhase('revealed');
          if (!isSuperuser) {
            try { localStorage.setItem(lockKey(), String(d.card.id)); } catch {}
            setLockedToday(true);
          }
          onChanged();
        }, 1000);
      }, 400);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[oracle/today POST failed]', e);
      setErr(e.message || 'Could not draw today\'s card.');
      setPhase('deck');
      setPickedIndex(null);
    } finally { setLoading(false); }
  }, [API, token, phase, loading, lockedToday, isSuperuser, onChanged]);

  const pullAgain = useCallback(async () => {
    if (loading) return;
    setErr('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/concierge/oracle/today/reset`, {
        method: 'DELETE',
        headers: { Authorization:`Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reset not available.');
      try { localStorage.removeItem(lockKey()); } catch {}
      setLockedToday(false);
      setFlipped(false);
      setCard(null);
      setPickedIndex(null);
      setPhase('deck');
      setFlowerIndex(prev => (prev + 1) % FLOWERS.length);
      onChanged();
    } catch (e: any) {
      setErr(e.message || 'Could not reset.');
    } finally { setLoading(false); }
  }, [API, token, loading, onChanged]);

  return (
    <div style={{
      position:'relative',
      padding:'clamp(20px,4vw,32px) 16px 28px',
      borderRadius:'22px',
      overflow:'hidden',
      background: BG_PEARL,
      marginBottom:'14px',
      boxShadow:'0 10px 30px rgba(83,74,183,0.12)',
      border:'0.5px solid rgba(155,143,232,0.2)',
    }}>
      <GoldParticles/>

      {/* HEADER */}
      {phase !== 'revealed' && (
        <div style={{textAlign:'center', color: INK_CARD, marginBottom:'18px', position:'relative', zIndex:2}}>
          <div style={{fontFamily: SERIF, fontSize:'clamp(20px,4.4vw,26px)', fontWeight:500, letterSpacing:'0.4px', lineHeight:1.25, color: INK_CARD}}>
            What message is for you today?
          </div>
          <div style={{fontSize:'13px', color: INK_SOFT, fontStyle:'italic', marginTop:'6px', fontFamily: SERIF, letterSpacing:'0.6px'}}>
            Trust. Pause. Receive.
          </div>
          <div style={{marginTop:'10px', display:'flex', justifyContent:'center'}}>
            <LotusIcon/>
          </div>
        </div>
      )}

      {/* STAGE — 7 cards in an arc */}
      <div style={{position:'relative', width:'100%', height:`${STAGE_H}px`, display:'flex', alignItems:'center', justifyContent:'center', perspective:'1400px', zIndex:2}}>
        {FAN.map((pos, i) => (
          <FanCard key={i} index={i} pos={pos} phase={phase} pickedIndex={pickedIndex}
            flipped={flipped} card={card} locked={lockedToday}
            flower={flower} onPick={pickCard}/>
        ))}
      </div>

      {/* Hint */}
      <div style={{marginTop:'14px', textAlign:'center', minHeight:'22px', color: INK_SOFT, fontSize:'12.5px', fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.4px', position:'relative', zIndex:2}}>
        {phase === 'deck' && !lockedToday && (loading ? 'Drawing your card…' : `${flower.name} · Tap the card that calls to you`)}
        {phase === 'deck' &&  lockedToday && 'Your message for today is above — tap to reopen'}
        {phase === 'picking' && 'The Universe is listening…'}
      </div>

      {/* Reveal actions */}
      <AnimatePresence>
        {phase === 'revealed' && card && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, delay: 1.2, ease: EASE }}
            style={{marginTop:'22px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', position:'relative', zIndex:2}}>
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center'}}>
              <button onClick={onOpenEnergyLog} style={primaryPill}>Save to Energy Log</button>
              <button onClick={() => card && shareOracleCard(card).catch(() => {})} style={ghostPill}>Share</button>
              {isSuperuser && <button onClick={pullAgain} style={ghostPill}>Pull Again</button>}
            </div>
            {!isSuperuser && (
              <div style={{fontSize:'12px', color: INK_SOFT, fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.4px'}}>
                Come back tomorrow for another message from the Universe <span aria-hidden>🌙</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {err && <div style={{marginTop:'10px', fontSize:'12px', color:'#a02020', textAlign:'center', position:'relative', zIndex:2}}>{err}</div>}
    </div>
  );
};

// ─── Fan card ─────────────────────────────────────────────────────────────

const FanCard: React.FC<{
  index: number;
  pos: FanPos;
  phase: 'deck' | 'picking' | 'revealed';
  pickedIndex: number | null;
  flipped: boolean;
  card: OracleCardData | null;
  locked: boolean;
  flower: FlowerCell;
  onPick: (i: number) => void;
}> = ({ index, pos, phase, pickedIndex, flipped, card, locked, flower, onPick }) => {
  const isPicked = pickedIndex === index;
  const isOther  = pickedIndex !== null && !isPicked;
  const isCenter = pos.isCenter;
  const baseW = isCenter ? CARD_W_CENTER : CARD_W_SIDE;
  const baseH = isCenter ? CARD_H_CENTER : CARD_H_SIDE;

  let x = pos.x, y = 0, rotate = pos.rot, scale = pos.scale, opacity = 1;
  if (phase === 'deck') {
    opacity = locked ? 0.6 : 1;
  } else if (phase === 'picking' || phase === 'revealed') {
    if (isPicked) {
      x = 0; y = -25; rotate = 0; scale = 1.15; opacity = 1;
    } else if (isOther) {
      opacity = 0.18;
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ x, y, rotate, scale, opacity }}
      transition={{ duration: 1.0, ease: EASE }}
      whileHover={phase === 'deck' && !locked ? { y: -8, scale: pos.scale * 1.04, transition:{duration:0.25, ease: EASE} } : undefined}
      onClick={() => onPick(index)}
      style={{
        position:'absolute',
        width:`${baseW}px`, height:`${baseH}px`,
        cursor: phase === 'deck' && !locked ? 'pointer' : 'default',
        transformStyle:'preserve-3d',
        zIndex: isPicked ? 20 : (10 - Math.abs(index - 3)),
      }}>
      {/* Aura + center breathing (only in deck phase on center card) */}
      <div style={{
        position:'absolute', inset:'-4px',
        borderRadius:'14px',
        pointerEvents:'none',
        animation: phase === 'deck' && !locked ? 'oracleGoldRing 3.4s ease-in-out infinite' : undefined,
        animationDelay: `${-index * 0.4}s`,
      }}/>
      <div style={{
        width:'100%', height:'100%',
        animation: phase === 'deck' && isCenter && !locked ? 'oracleCenterBreathe 4.5s ease-in-out infinite' : undefined,
      }}>
        <motion.div
          initial={false}
          animate={{ rotateY: flipped && isPicked ? 180 : 0 }}
          transition={{ duration: 1.0, ease: EASE }}
          style={{width:'100%', height:'100%', position:'relative', transformStyle:'preserve-3d'}}>
          <CardBack flower={flower}/>
          <CardFront card={card} show={phase === 'revealed' && isPicked}/>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─── Card faces ───────────────────────────────────────────────────────────

const CardBack: React.FC<{flower: FlowerCell}> = ({ flower }) => (
  <div style={{
    position:'absolute', inset:0,
    backfaceVisibility:'hidden',
    WebkitBackfaceVisibility:'hidden',
    borderRadius:'12px',
    background: CREAM,
    border:`1.5px solid rgba(201,168,76,0.7)`,
    overflow:'hidden',
    display:'flex', flexDirection:'column',
  }}>
    {/* Inner 8px inset border */}
    <div style={{
      position:'absolute', inset:'8px',
      border:`1px solid ${GOLD_SOFT}80`,
      borderRadius:'6px',
      pointerEvents:'none',
    }}/>
    {/* Flower sprite fills top 82% */}
    <div style={{
      height:'82%',
      margin:'8px 8px 0',
      borderRadius:'6px',
      ...spriteBgPosition(flower),
    }}/>
    {/* Flower name — fixed 36px height, 12px label */}
    <div style={{
      height:'36px', flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:'12px', letterSpacing:'2.5px', textTransform:'uppercase',
      color: GOLD, fontWeight:700, fontFamily: SERIF,
    }}>
      {flower.name}
    </div>
    {/* Corner sparkles */}
    <span style={{position:'absolute', top:'6px',    left:'8px',  fontSize:'8px', color: GOLD_SOFT, opacity: 0.9}}>✦</span>
    <span style={{position:'absolute', top:'6px',    right:'8px', fontSize:'8px', color: GOLD_SOFT, opacity: 0.9}}>✦</span>
    <span style={{position:'absolute', bottom:'6px', left:'8px',  fontSize:'7px', color: GOLD_SOFT, opacity: 0.7}}>✧</span>
    <span style={{position:'absolute', bottom:'6px', right:'8px', fontSize:'7px', color: GOLD_SOFT, opacity: 0.7}}>✧</span>
    {/* Shine sweep */}
    <div style={{
      position:'absolute', top:0, bottom:0, left:0, width:'50%',
      background:'linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)',
      animation:'oracleShine 5s ease-in-out infinite',
      mixBlendMode:'screen', pointerEvents:'none',
    }}/>
  </div>
);

// Body font + line clamp by length. User-specified 3-bucket schedule
// (14/12/11 px, 5/6/8 lines) applied inline at render so it never
// overflows the revealed face.
function bodyStyleFor(text: string): { fontSize: string; lineClamp: number } {
  const len = (text || '').length;
  if (len < 80)  return { fontSize: '14px', lineClamp: 5 };
  if (len < 150) return { fontSize: '12px', lineClamp: 6 };
  return                { fontSize: '11px', lineClamp: 8 };
}

const CardFront: React.FC<{card: OracleCardData | null; show: boolean}> = ({ card, show }) => {
  const cat  = useAnimation();
  const tit  = useAnimation();
  const body = useAnimation();

  useEffect(() => {
    if (show) {
      cat.start ({ opacity: 1, y: 0, letterSpacing: '2.5px',  transition: { duration: 1.2, delay: 0.1, ease: EASE } });
      tit.start ({ opacity: 1, y: 0, letterSpacing: '0.02em', transition: { duration: 1.2, delay: 0.35, ease: EASE } });
      body.start({ opacity: 1, y: 0, letterSpacing: '0em',    transition: { duration: 1.2, delay: 0.6,  ease: EASE } });
    } else {
      cat.set ({ opacity: 0, y: 6, letterSpacing: '0em' });
      tit.set ({ opacity: 0, y: 6, letterSpacing: '0em' });
      body.set({ opacity: 0, y: 6, letterSpacing: '0em' });
    }
  }, [show, cat, tit, body]);

  const bodyText = card?.body || '';
  const bodyS = bodyStyleFor(bodyText);

  return (
    <div style={{
      position:'absolute', inset:0,
      backfaceVisibility:'hidden',
      WebkitBackfaceVisibility:'hidden',
      transform:'rotateY(180deg)',
      borderRadius:'12px',
      background: CREAM,
      border:`1.5px solid ${GOLD}`,
      boxShadow:`inset 0 0 0 0.5px rgba(201,168,76,0.5)`,
      padding:'20px 16px',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
      overflow:'hidden',
      textAlign:'center',
      boxSizing:'border-box',
    }}>
      {/* Inner gold rule */}
      <div style={{
        position:'absolute', inset:'8px',
        border:`0.5px solid ${GOLD_SOFT}80`,
        borderRadius:'8px',
        pointerEvents:'none',
      }}/>

      {/* Category */}
      <motion.div animate={cat}
        style={{fontSize:'10px', textTransform:'uppercase', color: PURPLE, fontWeight:700,
          fontFamily: SERIF, marginTop:'2px', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
        {card?.category_label || '—'}
      </motion.div>

      {/* Sparkle divider */}
      <div style={{fontSize:'11px', color: GOLD, margin:'6px 0 4px', opacity: 0.85}}>✦</div>

      {/* Title — clamped to 2 lines so a rare long title can't displace body */}
      <motion.div animate={tit}
        style={{fontFamily: SERIF, fontSize:'18px', fontWeight:500, fontStyle:'italic',
          color: INK_CARD, lineHeight:1.2, padding:'0 2px', maxWidth:'100%', wordBreak:'break-word',
          display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
        {card?.title || ''}
      </motion.div>

      {/* Thin divider */}
      <div style={{
        width:'40%', height:'0.5px', background: `${GOLD_SOFT}99`,
        margin:'10px 0 8px', flexShrink:0,
      }}/>

      {/* Body — user-spec inline clamp; can NOT overflow */}
      <motion.div animate={body}
        style={{
          fontFamily:'"Caveat","Playfair Display",cursive',
          fontSize: bodyS.fontSize,
          color: INK_CARD, lineHeight: 1.3, fontWeight:500,
          padding:'0 2px',
          flex: 1,
          width: '100%',
          display:'-webkit-box',
          WebkitLineClamp: bodyS.lineClamp,
          WebkitBoxOrient: 'vertical',
          overflow:'hidden',
          textOverflow:'ellipsis',
          wordBreak:'break-word',
        }}>
        {bodyText}
      </motion.div>

      {/* Heart */}
      <div style={{color: GOLD, fontSize:'10px', opacity: 0.75, marginTop:'2px', flexShrink:0}}>♡</div>
    </div>
  );
};

// ─── Decorations ──────────────────────────────────────────────────────────

const LotusIcon: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    {[-60, -30, 0, 30, 60].map((a, i) => (
      <path key={i} transform={`rotate(${a} 16 22)`}
        d="M 16 22 Q 10 12, 16 4 Q 22 12, 16 22 Z"
        fill={GOLD_SOFT} opacity="0.85" stroke={GOLD} strokeWidth="0.6"/>
    ))}
    <ellipse cx="16" cy="23" rx="6" ry="1.5" fill={GOLD}/>
  </svg>
);

const GoldParticles: React.FC = () => (
  <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:1}}>
    {Array.from({ length: 28 }).map((_, i) => {
      const size = 2 + ((i * 13) % 4);
      const dur = 14 + (i % 12);
      const delay = -(i * 0.7);
      const drift = ((i % 5) - 2) * 12;
      return (
        <div key={i} style={{
          position:'absolute',
          left: `${(i * 41) % 100}%`,
          bottom: `-${10 + (i % 20)}px`,
          width: `${size}px`, height: `${size}px`, borderRadius:'50%',
          background: `radial-gradient(circle, ${GOLD_BRIGHT} 0%, rgba(245,207,138,0) 70%)`,
          boxShadow: `0 0 ${size * 3}px ${GOLD_SOFT}`,
          opacity: 0.45 + ((i * 17) % 50) / 100,
          // @ts-expect-error CSS custom property
          '--drift': `${drift}px`,
          animation: `oracleParticleDrift ${dur}s linear ${delay}s infinite`,
        }}/>
      );
    })}
  </div>
);

const primaryPill: React.CSSProperties = {
  background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)',
  color:'white', border:'none', borderRadius:'999px',
  padding:'10px 18px', fontSize:'12.5px', fontWeight:700,
  cursor:'pointer', fontFamily:'inherit',
  boxShadow:'0 6px 16px rgba(83,74,183,0.25)',
};
const ghostPill: React.CSSProperties = {
  background:'rgba(255,255,255,0.8)',
  color: PURPLE,
  border:`0.5px solid ${PURPLE_MID}55`,
  borderRadius:'999px',
  padding:'10px 18px', fontSize:'12.5px', fontWeight:700,
  cursor:'pointer', fontFamily:'inherit',
};

export default OracleDailyCard;
