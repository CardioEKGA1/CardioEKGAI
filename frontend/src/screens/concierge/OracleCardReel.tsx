// © 2026 SoulMD, LLC. All rights reserved.
//
// Daily Oracle — Gabby Bernstein-style fanned deck.
//
// Replaces the earlier 100-card 3D cylinder with a flat fan of 7 cards.
// Each card is large enough to show the holographic card-back artwork, the
// pick-animation singles out a card dramatically, and the flip is a slow
// ceremonial reveal. Backend contract unchanged — /concierge/oracle/today
// returns the deterministic daily pull (superusers get a fresh card every
// call thanks to the existing bypass at main.py:4648).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { shareOracleCard } from './shareOracleCard';
import cardBackImg from '../../assets/card-back.png';

interface OracleCardData {
  id: number; category: string;
  category_label?: string; category_color?: string;
  title: string; body: string;
  intention?: string;
  reflection?: string;
  saved?: boolean;
}
interface TodayPayload {
  date: string;
  pulled: boolean;
  card: OracleCardData | null;
}

interface Props {
  API: string;
  token: string;
  userName: string;
  initialStep?: 'intention' | 'card' | 'reflection';
  onClose: () => void;
  onBookMeditation?: () => void;
}

// Fan geometry
const FAN_CARDS      = 7;        // total cards visible in the fan
const ANGLE_PER_CARD = 6;        // degrees between adjacent cards in the fan
const FAN_RADIUS     = 220;      // px — radius of the arc the cards sit on
const CARD_W         = 150;      // px — base card width
const CARD_H         = 225;      // = CARD_W * 1.5 (2:3 oracle ratio)

// Palette
const GOLD       = '#E2B567';
const GOLD_SOFT  = '#F5CF8A';
const INK        = '#2a3a6b';    // deep navy — body text on white
const INK_SOFT   = '#6B6889';
const PURPLE     = '#534AB7';
const PURPLE_MID = '#9b8fe8';
const SERIF      = '"Cormorant Garamond","Playfair Display",Georgia,serif';
const SCREEN_BG  = 'linear-gradient(135deg,#F5F1FF 0%,#E8E4FB 35%,#DFEAFC 70%,#F1E7F8 100%)';
const PURPLE_BTN = 'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)';

const greetingFor = (d: Date): string => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// Google Fonts + keyframes — inject once per session.
if (typeof document !== 'undefined' && !document.getElementById('oracle-reel-fonts')) {
  const pre1 = document.createElement('link');
  pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
  const pre2 = document.createElement('link');
  pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
  const link = document.createElement('link');
  link.id = 'oracle-reel-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap';
  document.head.appendChild(pre1);
  document.head.appendChild(pre2);
  document.head.appendChild(link);
}
if (typeof document !== 'undefined' && !document.getElementById('oracle-reel-keyframes')) {
  const s = document.createElement('style');
  s.id = 'oracle-reel-keyframes';
  s.innerHTML = `
    @keyframes oracleSparkleDrift {
      0%   { transform: translateY(0) translateX(0); opacity: 0 }
      10%  { opacity: 0.9 }
      85%  { opacity: 0.7 }
      100% { transform: translateY(-110vh) translateX(16px); opacity: 0 }
    }
  `;
  document.head.appendChild(s);
}

const OracleCardReel: React.FC<Props> = ({ API, token, userName, initialStep, onClose, onBookMeditation }) => {
  // Phases: fan → picking (card flies to center) → revealed (flipped & visible)
  const [phase, setPhase] = useState<'fan' | 'picking' | 'revealed'>('fan');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [card, setCard] = useState<OracleCardData | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  // shuffleSeed bumps on each shuffle; used as a React key on the fan so cards
  // remount (and thus their angles are re-applied by Framer) in a new visual order.
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [err, setErr] = useState('');

  // If opened from home tab with initialStep='card'|'reflection', jump past the fan.
  useEffect(() => {
    if (initialStep !== 'card' && initialStep !== 'reflection') return;
    (async () => {
      try {
        const res = await fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } });
        const d: TodayPayload = await res.json();
        // eslint-disable-next-line no-console
        console.log('[oracle/today GET]', res.status, d);
        if (d.pulled && d.card) {
          setCard(d.card);
          setPickedIndex(Math.floor(FAN_CARDS / 2));
          setFlipped(true);
          setPhase('revealed');
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[oracle/today GET failed]', e);
      }
    })();
  }, [API, token, initialStep]);

  const shuffle = useCallback(() => {
    if (shuffling || phase !== 'fan') return;
    setErr('');
    setShuffling(true);
    setShuffleSeed((s) => s + 1);
    // Fan collapses + respreads over ~1s. Match transition durations below.
    setTimeout(() => setShuffling(false), 1000);
  }, [shuffling, phase]);

  const pickCard = useCallback(async (i: number) => {
    if (phase !== 'fan' || shuffling) return;
    setErr('');
    setPickedIndex(i);
    setPhase('picking');
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
      // Allow the "fly-to-center" animation to finish (~900ms) before flipping.
      setTimeout(() => {
        setFlipped(true);
        // Flip transition is 800ms; reveal controls fade in after.
        setTimeout(() => setPhase('revealed'), 850);
      }, 900);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[oracle/today POST failed]', e);
      setErr(e.message || 'Could not draw today\'s card.');
      setPhase('fan');
      setPickedIndex(null);
    }
  }, [API, token, phase, shuffling]);

  // Deterministic-ish "shuffle" order so the same seed produces the same
  // visual reorder; new seed = new apparent shuffle. Just a mapping from
  // visible index → identity so cards riffle between shuffles.
  const fanOrder = useMemo(() => {
    const arr = Array.from({ length: FAN_CARDS }, (_, i) => i);
    // Fisher–Yates seeded by shuffleSeed
    let seed = shuffleSeed * 9301 + 49297;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [shuffleSeed]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:2500,
      background: SCREEN_BG,
      color: INK, overflow:'hidden',
      display:'flex', flexDirection:'column',
      fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif',
    }}>
      <GoldSparkles/>

      {/* Close */}
      <button onClick={onClose} aria-label="Close"
        style={{position:'absolute', top:'14px', right:'14px', zIndex:20, background:'rgba(255,255,255,0.85)', color: PURPLE, border:'0.5px solid rgba(155,143,232,0.35)', width:'36px', height:'36px', borderRadius:'50%', cursor:'pointer', fontSize:'18px', boxShadow:'0 2px 8px rgba(83,74,183,0.1)'}}>×</button>

      {/* Greeting */}
      {phase !== 'revealed' && (
        <div style={{padding:'clamp(18px,5vw,36px) 20px 0', textAlign:'center', color: INK, position:'relative', zIndex:2}}>
          <div style={{fontFamily:SERIF, fontSize:'clamp(22px,4vw,30px)', fontWeight:500, letterSpacing:'0.3px', lineHeight:1.3, color: INK}}>
            {greetingFor(new Date())}, {userName || 'friend'} <span style={{color: GOLD}}>✦</span>
          </div>
          <div style={{fontSize:'13px', color: INK_SOFT, marginTop:'6px', fontStyle:'italic', fontFamily:SERIF}}>
            The Universe has a message for you today.
          </div>
          <div style={{fontSize:'11.5px', color: INK_SOFT, marginTop:'12px', fontStyle:'italic', fontFamily:SERIF, opacity: phase === 'fan' ? 1 : 0, transition:'opacity 300ms ease'}}>
            Breathe. Choose the card that calls to you.
          </div>
        </div>
      )}

      {/* FAN STAGE */}
      <div style={{flex:1, position:'relative', perspective:'1400px', display:'flex', alignItems:'flex-end', justifyContent:'center'}}>
        <div style={{position:'relative', width:'100%', height:'100%', maxWidth:'560px', margin:'0 auto'}}>
          {Array.from({ length: FAN_CARDS }).map((_, visibleIdx) => {
            const idInFan = fanOrder[visibleIdx];
            const isPicked = pickedIndex === visibleIdx;
            const isSibling = pickedIndex !== null && pickedIndex !== visibleIdx;

            // Fan math: evenly-spaced angles, cards arced on a circle so the
            // midpoint is highest and the edges curve down.
            const middle = (FAN_CARDS - 1) / 2;
            const angle = (visibleIdx - middle) * ANGLE_PER_CARD;
            const rad = (angle * Math.PI) / 180;
            const xFan = Math.sin(rad) * FAN_RADIUS;
            const yFan = (1 - Math.cos(rad)) * FAN_RADIUS;   // positive = down

            // Shuffle state collapses cards into a stack (all at center, no rotation)
            // before re-fanning back out on fanOrder change.
            const xBase = shuffling ? 0    : xFan;
            const yBase = shuffling ? 0    : yFan;
            const rBase = shuffling ? 0    : angle;

            // Picked card: fly to center-top of stage, scale up, no rotation.
            // Siblings: fade + slide down.
            let x = xBase, y = yBase, r = rBase, scale = 1, opacity = 1;
            if (isPicked) {
              x = 0;
              y = -180;           // toward the vertical middle of the screen
              r = 0;
              scale = 1.35;
              opacity = 1;
            } else if (isSibling) {
              x = xBase;
              y = yBase + 140;    // slide further down off-stage
              r = rBase;
              scale = 0.9;
              opacity = 0.15;
            }

            // Breathing: subtle y oscillation while the fan is idle. Disabled
            // during shuffle or after pick so transforms don't fight each other.
            const idle = phase === 'fan' && !shuffling && pickedIndex === null;
            const yAnim: number | number[] = idle ? [y, y - 4, y] : y;

            return (
              <motion.div
                key={`${shuffleSeed}-${visibleIdx}`}
                initial={false}
                animate={{
                  x, y: yAnim, rotate: r, scale, opacity,
                }}
                transition={{
                  x:      { type:'spring', stiffness: 140, damping: 20 },
                  y:      idle
                            ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
                            : { type:'spring', stiffness: 140, damping: 20 },
                  rotate: { type:'spring', stiffness: 140, damping: 20 },
                  scale:  { type:'spring', stiffness: 170, damping: 22 },
                  opacity:{ duration: 0.35 },
                }}
                whileHover={phase === 'fan' && !shuffling ? {
                  y: (yFan as number) - 18,
                  boxShadow: `0 0 0 2px ${GOLD_SOFT}, 0 12px 28px rgba(245,207,138,0.45)`,
                  transition: { type:'spring', stiffness: 300, damping: 20 },
                } : undefined}
                onClick={() => pickCard(visibleIdx)}
                data-card-id={idInFan}
                style={{
                  position:'absolute',
                  left:'50%', top:'50%',
                  marginLeft: `-${CARD_W / 2}px`,
                  marginTop:  `-${CARD_H / 2}px`,
                  width: `${CARD_W}px`,
                  height:`${CARD_H}px`,
                  cursor: phase === 'fan' && !shuffling ? 'pointer' : 'default',
                  transformStyle:'preserve-3d',
                  zIndex: isPicked ? 10 : visibleIdx,
                  filter: 'drop-shadow(0 14px 26px rgba(83,74,183,0.18))',
                }}>
                {/* 3D flip container — rotates 0→180 when flipped */}
                <motion.div
                  initial={false}
                  animate={{ rotateY: flipped && isPicked ? 180 : 0 }}
                  transition={{ duration: 0.8, ease: [0.45, 0, 0.2, 1] }}
                  style={{
                    width:'100%', height:'100%',
                    position:'relative',
                    transformStyle:'preserve-3d',
                  }}>
                  <CardBackFace/>
                  <CardFrontFace
                    card={card}
                    showContent={isPicked && phase === 'revealed'}
                    onBookMeditation={onBookMeditation}/>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer area: shuffle button (fan phase) OR post-reveal links */}
      {phase === 'fan' && (
        <div style={{padding:'0 20px clamp(24px,6vw,44px)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', position:'relative', zIndex:2}}>
          {err && <div style={{fontSize:'12px', color:'#a02020'}}>{err}</div>}
          <button onClick={shuffle} disabled={shuffling}
            style={{
              background: PURPLE_BTN,
              color:'white', border:'none', borderRadius:'999px',
              padding:'12px 28px', fontSize:'13px', fontWeight:800,
              letterSpacing:'0.5px', textTransform:'uppercase', cursor: shuffling ? 'default' : 'pointer',
              opacity: shuffling ? 0.7 : 1,
              boxShadow:'0 8px 22px rgba(155,143,232,0.35)', fontFamily:'inherit',
            }}>
            {shuffling ? 'Shuffling…' : 'Shuffle the Deck'}
          </button>
          <div style={{fontSize:'11.5px', color: INK_SOFT, fontStyle:'italic', fontFamily:SERIF}}>
            Or tap any card to choose
          </div>
        </div>
      )}

      <AnimatePresence>
        {phase === 'revealed' && card && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            style={{padding:'0 20px clamp(20px,5vw,40px)', textAlign:'center', position:'relative', zIndex:2, display:'flex', gap:'18px', justifyContent:'center', flexWrap:'wrap'}}>
            <button onClick={() => alert('Saved to your Energy Log ✓')}
              style={{background:'transparent', border:'none', color: PURPLE, fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.3px'}}>
              Save to Energy Log →
            </button>
            <button onClick={onClose}
              style={{background:'transparent', border:'none', color: INK_SOFT, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit'}}>
              Pull Again Tomorrow
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ──── Card faces ───────────────────────────────────────────────────────────

const CardBackFace: React.FC = () => (
  <div style={{
    position:'absolute', inset:0,
    backfaceVisibility:'hidden',
    WebkitBackfaceVisibility:'hidden',
    borderRadius:'14px',
    overflow:'hidden',
    backgroundColor:'#EDE6FB',   // fallback if the image fails to load
  }}>
    <img src={cardBackImg} alt="" aria-hidden="true"
      style={{
        width:'100%', height:'100%',
        objectFit:'cover', objectPosition:'center',
        display:'block',
        userSelect:'none',
        pointerEvents:'none',
      }}/>
  </div>
);

// Words in an oracle message that get tinted for visual emphasis.
const ACCENT_WORDS = new Set([
  'love','universe','breath','light','heart','body','soul','wisdom','peace',
  'healing','grace','truth','trust','divine','sacred','energy','spirit',
  'presence','power','life','stillness','flow','release','receive','gratitude',
  'abundance','joy','moon','sun','star','earth','sky','you','yourself',
]);
const ACCENT_COLORS = ['#534AB7', '#C9A84C', '#1D9E75'] as const;
function renderAccented(text: string): React.ReactNode[] {
  if (!text) return [];
  return text.split(/(\s+)/).map((tok, i) => {
    const word = tok.toLowerCase().replace(/[^a-z]/g, '');
    if (ACCENT_WORDS.has(word)) {
      const color = ACCENT_COLORS[word.length % ACCENT_COLORS.length];
      return <span key={i} style={{ color, fontWeight: 700 }}>{tok}</span>;
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

const CardFrontFace: React.FC<{card: OracleCardData | null; showContent?: boolean; onBookMeditation?: () => void}> = ({ card, showContent, onBookMeditation }) => {
  // Picked card scales 1.35× so content sizes read as large despite the 150px
  // base width. Text colors are hardcoded high-contrast (purple + deep navy
  // on cream) so they never render invisible even if a font falls back.
  return (
    <div style={{
      position:'absolute', inset:0,
      backfaceVisibility:'hidden',
      WebkitBackfaceVisibility:'hidden',
      transform:'rotateY(180deg)',
      borderRadius:'14px',
      background:'linear-gradient(180deg,#FFFFFF 0%,#FFFDF7 100%)',
      padding:'14px 12px',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between',
      border:`1px solid ${PURPLE_MID}33`,
      boxShadow:'inset 0 0 40px rgba(255,248,232,0.85), 0 0 0 1px rgba(201,168,76,0.18)',
      overflow:'hidden',
      textAlign:'center',
    }}>
      {/* Corner sparkles */}
      <span style={{position:'absolute', top:'8px',    left:'10px',  fontSize:'11px', color: GOLD, opacity: 0.75}}>✦</span>
      <span style={{position:'absolute', top:'8px',    right:'10px', fontSize:'11px', color: PURPLE_MID, opacity: 0.7}}>✦</span>
      <span style={{position:'absolute', bottom:'8px', left:'10px',  fontSize:'10px', color: PURPLE_MID, opacity: 0.55}}>✧</span>
      <span style={{position:'absolute', bottom:'8px', right:'10px', fontSize:'10px', color: GOLD, opacity: 0.6}}>✧</span>

      <motion.div
        initial={false}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.55, delay: showContent ? 0.3 : 0 }}
        style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%'}}>
        {/* Category */}
        <div style={{fontSize:'7.5px', letterSpacing:'2.5px', textTransform:'uppercase',
          color: PURPLE, fontWeight:700, fontFamily:'"Playfair Display",Georgia,serif'}}>
          {card?.category_label || '—'}
        </div>

        {card?.title && (
          <div style={{fontFamily:'"Playfair Display",Georgia,serif',
            fontSize:'12px', fontWeight:500, fontStyle:'italic',
            color: PURPLE, lineHeight:1.25, padding:'0 2px'}}>
            {card.title}
          </div>
        )}

        {card?.body ? (
          <div style={{fontFamily:'"Caveat","Playfair Display",Georgia,cursive',
            fontSize:'15px', color: INK, lineHeight: 1.25, fontWeight:500, padding:'0 4px'}}>
            {renderAccented(card.body)}
          </div>
        ) : showContent ? (
          <div style={{fontFamily:'"Playfair Display",Georgia,serif', fontSize:'10px',
            color: INK_SOFT, fontStyle:'italic'}}>
            The Universe is composing your message…
          </div>
        ) : null}
      </motion.div>

      {/* Footer icons — only when content is visible, avoids poking through the back */}
      {showContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{display:'flex', justifyContent:'center', gap:'10px', paddingTop:'4px',
            borderTop:`0.5px solid ${PURPLE_MID}22`, width:'100%'}}>
          <IconButton aria-label="Favorite" onClick={() => alert('Saved ♡')}>
            <HeartIcon/>
          </IconButton>
          <IconButton aria-label="Open session" onClick={() => onBookMeditation && onBookMeditation()}>
            <PlayIcon/>
          </IconButton>
          <IconButton aria-label="Share" onClick={() => card && shareOracleCard(card).catch(() => {})}>
            <ShareIcon/>
          </IconButton>
        </motion.div>
      )}
    </div>
  );
};

const IconButton: React.FC<React.PropsWithChildren<{onClick: () => void; 'aria-label': string}>> = ({ onClick, children, ...rest }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} {...rest}
    style={{background:'transparent', border:'none', cursor:'pointer', padding:'3px', display:'flex', alignItems:'center', justifyContent:'center', color: PURPLE}}>
    {children}
  </button>
);

const HeartIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const PlayIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const ShareIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5"  r="3"/><circle cx="6"  cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49"/>
  </svg>
);

// Floating gold sparkles drifting upward — ambient atmosphere.
const GoldSparkles: React.FC = () => (
  <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0}}>
    {Array.from({ length: 28 }).map((_, i) => {
      const size = 3 + (i % 4);
      const dur  = 12 + (i % 10);
      const delay = -(i * 0.8);
      return (
        <div key={i} style={{
          position:'absolute',
          left: `${(i * 37) % 100}%`,
          bottom: `-${10 + (i % 20)}px`,
          width: `${size}px`, height: `${size}px`, borderRadius:'50%',
          background: `radial-gradient(circle, ${GOLD_SOFT} 0%, rgba(245,207,138,0) 70%)`,
          boxShadow:`0 0 ${size * 2}px ${GOLD_SOFT}`,
          opacity: 0.4 + ((i * 13) % 50) / 100,
          animation: `oracleSparkleDrift ${dur}s linear ${delay}s infinite`,
        }}/>
      );
    })}
  </div>
);

export default OracleCardReel;
export function ensureOracleReelKeyframes() { /* keyframes injected at import-time */ }
