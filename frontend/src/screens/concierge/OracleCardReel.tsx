// © 2026 SoulMD, LLC. All rights reserved.
//
// Daily Oracle — Spinning Reel edition.
// Replaces the 5-step intimate ritual with a 3D rolodex the patient can
// shuffle + swipe. 100 identical card-backs arranged on a cylinder; drag
// rotates it with momentum; Shuffle triggers a fast spin + decay; tapping
// the active (front) card confirms the pull and flips it to reveal today's
// message. Backend contract unchanged — /concierge/oracle/today returns
// the deterministic daily pull.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, useTransform, AnimatePresence } from 'framer-motion';
import { shareOracleCard } from './shareOracleCard';

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

// Reel geometry. 100 cards, radius chosen so ~9 cards are visually forward.
const CARD_COUNT = 100;
const ANGLE_STEP = 360 / CARD_COUNT;
const RADIUS = 480;     // px — distance from center to each card
const CARD_W = 160;     // px
const CARD_H = 240;     // px

const GOLD       = '#E2B567';
const GOLD_SOFT  = '#F5CF8A';
const INK        = '#2a3a6b';   // deep navy — for body text on light bg
const INK_SOFT   = '#6B6889';
const PURPLE     = '#534AB7';
const PURPLE_MID = '#9b8fe8';
const LIGHT_BLUE = '#7ab0f0';
const SERIF      = '"Cormorant Garamond","Playfair Display",Georgia,serif';
// Ethereal pearl-lavender page background. Matches the main SoulMD palette
// (same linear-gradient family used on Landing + Dashboard) so the oracle
// doesn't feel like a different app.
const SCREEN_BG  = 'linear-gradient(135deg,#F5F1FF 0%,#E8E4FB 35%,#DFEAFC 70%,#F1E7F8 100%)';
const PURPLE_BTN = 'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)';

const greetingFor = (d: Date): string => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const OracleCardReel: React.FC<Props> = ({ API, token, userName, initialStep, onClose, onBookMeditation }) => {
  // Phases: reel → revealing → revealed
  const [phase, setPhase] = useState<'reel' | 'revealing' | 'revealed'>('reel');
  const [card, setCard] = useState<OracleCardData | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [err, setErr] = useState('');
  const [flipped, setFlipped] = useState(false);

  const rotation = useMotionValue(0);     // degrees, drives every card's angle
  const dragStartRot = useRef(0);

  // If opened from home tab with initialStep='card'|'reflection', jump past the reel.
  useEffect(() => {
    if (initialStep === 'card' || initialStep === 'reflection') {
      (async () => {
        try {
          const res = await fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } });
          const d: TodayPayload = await res.json();
          if (d.pulled && d.card) {
            setCard(d.card);
            setPhase('revealed');
            setFlipped(true);
          }
        } catch {}
      })();
    }
  }, [API, token, initialStep]);

  // Idle slow rotation when the reel is waiting.
  useEffect(() => {
    if (phase !== 'reel' || shuffling) return;
    const ctrl = animate(rotation, rotation.get() - 360, {
      duration: 120,         // 120s per full rotation — very slow idle
      ease: 'linear',
      repeat: Infinity,
    });
    return () => ctrl.stop();
  }, [phase, shuffling, rotation]);

  const shuffle = useCallback(async () => {
    if (shuffling || phase !== 'reel') return;
    setShuffling(true); setErr('');
    // Fast spin, then decay to a "random" landing.
    const land = rotation.get() - 720 - Math.random() * 720;
    await animate(rotation, land, {
      type: 'spring',
      stiffness: 40,
      damping: 18,
      mass: 2.5,
      velocity: -3000,
    });
    setShuffling(false);
  }, [shuffling, phase, rotation]);

  const confirmPull = useCallback(async () => {
    if (phase !== 'reel' || shuffling) return;
    setErr('');
    setPhase('revealing');
    try {
      const res = await fetch(`${API}/concierge/oracle/today`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not draw today\'s card.');
      setCard(d.card);
      // Pause briefly to let the "revealing" dim effect play, then flip.
      setTimeout(() => {
        setFlipped(true);
        setTimeout(() => setPhase('revealed'), 750);
      }, 400);
    } catch (e: any) {
      setErr(e.message || 'Could not draw today\'s card.');
      setPhase('reel');
    }
  }, [API, token, phase, shuffling]);

  const onDragEnd = useCallback((_e: any, info: { velocity: { x: number } }) => {
    // Let Framer's momentum finish via an inertia animation on rotation.
    const vx = info.velocity.x;
    const decay = vx / 2;      // velocity pixels/s → degrees/s scaled
    animate(rotation, rotation.get() + decay, {
      type: 'inertia',
      velocity: decay,
      power: 0.6,
      timeConstant: 700,
      modifyTarget: (target) => Math.round(target / ANGLE_STEP) * ANGLE_STEP, // snap to a card
    });
  }, [rotation]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:2500,
      background: SCREEN_BG,
      color: INK, overflow:'hidden',
      display:'flex', flexDirection:'column',
      fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif',
    }}>
      <GoldSparkles/>
      {shuffling && <ParticleBurst/>}

      {/* Close */}
      <button onClick={onClose} aria-label="Close"
        style={{position:'absolute', top:'14px', right:'14px', zIndex:20, background:'rgba(255,255,255,0.85)', color: PURPLE, border:'0.5px solid rgba(155,143,232,0.35)', width:'36px', height:'36px', borderRadius:'50%', cursor:'pointer', fontSize:'18px', boxShadow:'0 2px 8px rgba(83,74,183,0.1)'}}>×</button>

      {phase !== 'revealed' && (
        <div style={{padding:'clamp(18px,5vw,36px) 20px 0', textAlign:'center', color: INK, position:'relative', zIndex:2}}>
          <div style={{fontFamily:SERIF, fontSize:'clamp(22px,4vw,30px)', fontWeight:500, letterSpacing:'0.3px', lineHeight:1.3, color: INK}}>
            {greetingFor(new Date())}, {userName || 'friend'} <span style={{color: GOLD}}>✦</span>
          </div>
          <div style={{fontSize:'13px', color: INK_SOFT, marginTop:'6px', fontStyle:'italic', fontFamily:SERIF}}>
            The Universe has a message for you today.
          </div>
        </div>
      )}

      {/* REEL */}
      {phase === 'reel' && (
        <>
          <div style={{
            flex:1, perspective:'1400px', perspectiveOrigin:'50% 55%',
            display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
          }}>
            <motion.div
              drag="x"
              dragMomentum={false}
              onDragStart={() => { dragStartRot.current = rotation.get(); rotation.stop(); }}
              onDrag={(_e, info) => { rotation.set(dragStartRot.current + info.offset.x * 0.35); }}
              onDragEnd={onDragEnd}
              style={{
                width: `${CARD_W}px`, height: `${CARD_H}px`,
                position:'relative', transformStyle:'preserve-3d',
                touchAction:'pan-y',
              }}>
              {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <ReelCard key={i} index={i} rotation={rotation} onTapActive={confirmPull}/>
              ))}
            </motion.div>
          </div>

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
              Swipe to browse · tap the glowing card to confirm
            </div>
          </div>
        </>
      )}

      {/* REVEALING — single card centered, flipping */}
      {(phase === 'revealing' || phase === 'revealed') && (
        <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', perspective:'1400px', padding:'clamp(16px,4vw,32px)'}}>
          <motion.div
            initial={false}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.75, ease: [0.4, 0.0, 0.2, 1] }}
            style={{
              width:'min(340px, 86vw)', aspectRatio:'3/5',
              position:'relative', transformStyle:'preserve-3d',
              filter:'drop-shadow(0 20px 50px rgba(83,74,183,0.25))',
            }}>
            <CardBackFace large/>
            <CardFrontFace card={card} large showContent={phase === 'revealed'} onBookMeditation={onBookMeditation}/>
          </motion.div>
        </div>
      )}

      {/* POST-REVEAL — link row below the card (sparkle burst lives on the card) */}
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

// ──── Per-card rendered at an angle around the cylinder ────────────────────

const ReelCard: React.FC<{index:number; rotation:import('framer-motion').MotionValue<number>; onTapActive:()=>void}> = ({ index, rotation, onTapActive }) => {
  // All hooks hoisted to the top to avoid re-creating MotionValues on every
  // render. Each card's absolute angle = base rotation + index * step.
  const angle = useTransform(rotation, (r) => r + index * ANGLE_STEP);
  const front = useTransform(angle, (a) => {
    const norm = ((a % 360) + 360) % 360;
    const signed = norm > 180 ? norm - 360 : norm;
    return Math.max(0, Math.cos((signed * Math.PI) / 180));
  });
  const transform = useTransform(angle, (a) => `rotateY(${a}deg) translateZ(${RADIUS}px)`);
  // Culling: when cos(θ) ≤ 0 the card is on the back half of the cylinder
  // and can't be seen anyway — hide it with visibility:hidden so the
  // browser skips paint/composite. `front` is already max(0, cos) so we
  // just threshold at ~0.02 (≈88° off-axis) to avoid flicker at the edge.
  const opacity    = useTransform(front, (f) => (f < 0.02 ? 0 : 0.15 + f * 0.9));
  const scale      = useTransform(front, (f) => 0.7 + f * 0.35);
  const filterMV   = useTransform(front, (f) => `brightness(${0.45 + f * 0.65})`);
  const shadowMV   = useTransform(front, (f) =>
    f > 0.92
      ? '0 0 0 2px rgba(245,207,138,0.75), 0 10px 40px rgba(245,207,138,0.55)'
      : '0 4px 14px rgba(0,0,0,0.4)');
  const visibility = useTransform(front, (f) => (f < 0.02 ? 'hidden' : 'visible')) as unknown as import('framer-motion').MotionValue<'visible' | 'hidden'>;
  const pointerMV  = useTransform(front, (f) => (f < 0.02 ? 'none' : 'auto')) as unknown as import('framer-motion').MotionValue<'none' | 'auto'>;

  return (
    <motion.div
      onTap={() => { if (front.get() > 0.92) onTapActive(); }}
      style={{
        position:'absolute', inset:0,
        transform, opacity, scale,
        visibility: visibility as any,
        pointerEvents: pointerMV as any,
        transformStyle:'preserve-3d',
        cursor:'pointer',
      }}>
      <motion.div style={{
        width:'100%', height:'100%',
        filter: filterMV,
        boxShadow: shadowMV,
        borderRadius:'14px',
      }}>
        <CardBackFace/>
      </motion.div>
    </motion.div>
  );
};

// ──── Static card faces ────────────────────────────────────────────────────

const CardBackFace: React.FC<{large?: boolean}> = ({ large }) => (
  <div style={{
    position:'absolute', inset:0, backfaceVisibility:'hidden',
    borderRadius: large ? '20px' : '14px',
    // Use explicit backgroundImage + backgroundSize so CRA's public-asset
    // URL rewriting can't get confused by shorthand form.
    backgroundImage: "url('/card-back.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    // Soft fallback gradient if the image somehow fails to load — keeps
    // the card readable rather than invisible.
    backgroundColor: '#EDE6FB',
    overflow:'hidden',
    // Subtle purple/gold ring so the card reads as "precious" on the light bg.
    boxShadow: large
      ? 'inset 0 0 0 1px rgba(226,181,103,0.55), inset 0 0 30px rgba(255,255,255,0.25)'
      : 'inset 0 0 0 0.5px rgba(226,181,103,0.4)',
  }}>
    {/* White shimmer sweep overlay */}
    <div style={{
      position:'absolute', inset:0,
      background:'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
      animation:'oracleShimmer 3.5s ease-in-out infinite',
      mixBlendMode:'screen',
      pointerEvents:'none',
    }}/>
  </div>
);

// Words in an oracle message that get tinted in a non-navy color — creates
// visual emphasis on the "spiritual" nouns without needing a real NLP pass.
// Deterministic per-word: each hit gets purple, gold, or teal in rotation
// based on word length.
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

const CardFrontFace: React.FC<{card: OracleCardData | null; large?: boolean; showContent?: boolean; onBookMeditation?: () => void}> = ({ card, large, showContent, onBookMeditation }) => (
  <div style={{
    position:'absolute', inset:0, backfaceVisibility:'hidden',
    transform:'rotateY(180deg)',
    borderRadius: large ? '22px' : '14px',
    // Pure white, warm cream tint — Gabby's oracle deck palette.
    background:'linear-gradient(180deg,#FFFFFF 0%,#FFFDF7 100%)',
    padding: large ? 'clamp(22px,5vw,32px)' : '18px 14px',
    display:'flex', flexDirection:'column',
    // Soft purple ring with inner warm cream wash.
    border: `1px solid ${PURPLE_MID}33`,
    boxShadow:'inset 0 0 60px rgba(255,248,232,0.8), 0 0 0 1px rgba(201,168,76,0.18)',
    overflow:'hidden',
    textAlign:'center',
  }}>
    {/* Decorative corner stars — four corners, Gabby-style whimsy */}
    {large && (
      <>
        <span style={{position:'absolute', top:'14px', left:'16px',  fontSize:'14px', color: GOLD, opacity: 0.75}}>✦</span>
        <span style={{position:'absolute', top:'14px', right:'16px', fontSize:'14px', color: PURPLE_MID, opacity: 0.7}}>✦</span>
        <span style={{position:'absolute', bottom:'14px', left:'16px', fontSize:'12px', color: PURPLE_MID, opacity: 0.55}}>✧</span>
        <span style={{position:'absolute', bottom:'14px', right:'16px', fontSize:'12px', color: GOLD, opacity: 0.6}}>✧</span>
      </>
    )}

    {/* Category */}
    <div style={{
      fontSize: large ? '10px' : '9px',
      letterSpacing:'3px', textTransform:'uppercase',
      color: PURPLE, fontWeight:700,
      fontFamily:'"Playfair Display",Georgia,serif',
      marginBottom: large ? 'clamp(14px,3vw,20px)' : '6px',
    }}>
      {card?.category_label || '—'}
    </div>

    {/* Body — star · message · star layout, animated fade-in after flip */}
    <motion.div
      initial={false}
      animate={{ opacity: showContent ? 1 : 0 }}
      transition={{ duration: 0.5, delay: showContent ? 0.55 : 0 }}
      style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: large ? '14px' : '6px'}}>
      {large && <span style={{fontSize:'18px', color: GOLD, opacity:0.7}}>✦</span>}
      {card?.title && (
        <div style={{
          fontFamily:'"Playfair Display",Georgia,serif',
          fontSize: large ? 'clamp(18px,4vw,22px)' : '14px',
          fontWeight:500, fontStyle:'italic',
          color: PURPLE, lineHeight:1.3,
          padding: large ? '0 4px' : 0,
        }}>
          {card.title}
        </div>
      )}
      <div style={{
        fontFamily:'"Caveat","Playfair Display",Georgia,cursive',
        fontSize: large ? 'clamp(22px,5.8vw,30px)' : '12px',
        color: INK, lineHeight: 1.35, fontWeight:500,
        padding: large ? '0 6px' : 0,
      }}>
        {renderAccented(card?.body || '')}
      </div>
      {large && <span style={{fontSize:'18px', color: PURPLE_MID, opacity:0.6}}>✦</span>}
    </motion.div>

    {/* Footer: heart · play · share */}
    {large && showContent && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.0 }}
        style={{display:'flex', justifyContent:'center', gap:'22px', paddingTop: 'clamp(12px,3vw,20px)', borderTop:`0.5px solid ${PURPLE_MID}22`, marginTop:'auto'}}>
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

const IconButton: React.FC<React.PropsWithChildren<{onClick: () => void; 'aria-label': string}>> = ({ onClick, children, ...rest }) => (
  <button onClick={onClick} {...rest}
    style={{background:'transparent', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center', color: PURPLE}}>
    {children}
  </button>
);

const HeartIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const PlayIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const ShareIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5"  r="3"/><circle cx="6"  cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49"/>
  </svg>
);

// ──── Atmosphere ───────────────────────────────────────────────────────────

// Floating gold sparkles drifting upward — replaces the dark-mode starfield.
// 28 dots at random offsets drift from bottom to top over 12–22s cycles.
const GoldSparkles: React.FC = () => (
  <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0}}>
    {Array.from({ length: 28 }).map((_, i) => {
      const size = 3 + (i % 4);
      const dur  = 12 + (i % 10);
      const delay = -(i * 0.8);   // negative delay so some start partway up on mount
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

const ParticleBurst: React.FC = () => (
  <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', zIndex:10}}>
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * 360;
      const d = 140 + (i % 4) * 40;
      return (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{
            x: Math.cos(angle * Math.PI / 180) * d,
            y: Math.sin(angle * Math.PI / 180) * d,
            opacity: [0, 1, 0],
            scale: [0.3, 1.2, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: (i % 6) * 0.1 }}
          style={{
            position:'absolute', top:'50%', left:'50%',
            width:'8px', height:'8px', borderRadius:'50%',
            background:`radial-gradient(circle, ${GOLD_SOFT} 0%, rgba(245,207,138,0) 70%)`,
            boxShadow:`0 0 14px ${GOLD_SOFT}`,
          }}/>
      );
    })}
  </div>
);

const ActionBtn: React.FC<{label:string; onClick:()=>void; variant?: 'solid'|'ghost'}> = ({ label, onClick, variant='solid' }) => (
  <button onClick={onClick}
    style={{
      background: variant === 'solid' ? PURPLE_BTN : 'rgba(255,255,255,0.75)',
      color: variant === 'solid' ? 'white' : PURPLE,
      border: variant === 'solid' ? 'none' : `0.5px solid ${PURPLE_MID}55`,
      borderRadius:'999px', padding:'10px 18px', fontSize:'12px', fontWeight:700,
      cursor:'pointer', fontFamily:'inherit',
      boxShadow: variant === 'solid' ? '0 6px 16px rgba(83,74,183,0.25)' : 'none',
    }}>
    {label}
  </button>
);

// Inject Google Fonts (Caveat + Playfair Display) + keyframes once per
// session. Kept out of index.html so the 50kB font blob only loads when the
// oracle reel actually mounts — most users won't see it until first open.
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
    @keyframes oracleShimmer { 0%,100% { transform: translateX(-30%) } 50% { transform: translateX(30%) } }
    @keyframes oracleSparkleDrift {
      0%   { transform: translateY(0) translateX(0); opacity: 0 }
      10%  { opacity: 0.9 }
      85%  { opacity: 0.7 }
      100% { transform: translateY(-110vh) translateX(16px); opacity: 0 }
    }
  `;
  document.head.appendChild(s);
}

export default OracleCardReel;
export function ensureOracleReelKeyframes() { /* keyframes injected at import-time */ }
