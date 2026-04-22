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

const GOLD      = '#E2B567';
const GOLD_SOFT = '#F5CF8A';
const INK       = '#2A1F3F';
const INK_SOFT  = '#6D627F';
const SERIF     = '"Cormorant Garamond","Playfair Display",Georgia,serif';

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
      background:'radial-gradient(ellipse at 50% 30%, #2B2148 0%, #14102A 60%, #06040F 100%)',
      color: INK, overflow:'hidden',
      display:'flex', flexDirection:'column',
      fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif',
    }}>
      <StarField/>
      {shuffling && <ParticleBurst/>}

      {/* Close */}
      <button onClick={onClose} aria-label="Close"
        style={{position:'absolute', top:'14px', right:'14px', zIndex:20, background:'rgba(255,255,255,0.08)', color:'white', border:'0.5px solid rgba(255,255,255,0.15)', width:'36px', height:'36px', borderRadius:'50%', cursor:'pointer', fontSize:'16px'}}>×</button>

      {phase !== 'revealed' && (
        <div style={{padding:'clamp(18px,5vw,36px) 20px 0', textAlign:'center', color:'white'}}>
          <div style={{fontFamily:SERIF, fontSize:'clamp(22px,4vw,30px)', fontWeight:500, letterSpacing:'0.3px', lineHeight:1.3}}>
            {greetingFor(new Date())}, {userName || 'friend'} <span style={{color: GOLD_SOFT}}>✦</span>
          </div>
          <div style={{fontSize:'13px', color:'rgba(255,255,255,0.72)', marginTop:'6px', fontStyle:'italic', fontFamily:SERIF}}>
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

          <div style={{padding:'0 20px clamp(24px,6vw,44px)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', color:'white'}}>
            {err && <div style={{fontSize:'12px', color:'#ff9090'}}>{err}</div>}
            <button onClick={shuffle} disabled={shuffling}
              style={{
                background:'linear-gradient(135deg,#F5CF8A,#E2B567,#C38F3C)',
                color:'#2A1F08', border:'none', borderRadius:'999px',
                padding:'12px 28px', fontSize:'13px', fontWeight:800,
                letterSpacing:'0.5px', textTransform:'uppercase', cursor: shuffling ? 'default' : 'pointer',
                opacity: shuffling ? 0.7 : 1,
                boxShadow:'0 8px 22px rgba(226,181,103,0.35)', fontFamily:'inherit',
              }}>
              {shuffling ? 'Shuffling…' : 'Shuffle the Deck'}
            </button>
            <div style={{fontSize:'11.5px', color:'rgba(255,255,255,0.55)', fontStyle:'italic', fontFamily:SERIF}}>
              Swipe to browse · tap the glowing card to confirm
            </div>
          </div>
        </>
      )}

      {/* REVEALING — single card centered, flipping */}
      {(phase === 'revealing' || phase === 'revealed') && (
        <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', perspective:'1400px', padding:'20px'}}>
          <motion.div
            initial={false}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.75, ease: [0.4, 0.0, 0.2, 1] }}
            style={{
              width:`${Math.min(300, CARD_W * 1.75)}px`, height:`${Math.min(450, CARD_H * 1.75)}px`,
              position:'relative', transformStyle:'preserve-3d',
              filter:'drop-shadow(0 20px 40px rgba(226,181,103,0.35))',
            }}>
            <CardBackFace large/>
            <CardFrontFace card={card} large/>
          </motion.div>
        </div>
      )}

      {/* POST-REVEAL */}
      <AnimatePresence>
        {phase === 'revealed' && card && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{padding:'0 20px clamp(20px,5vw,40px)', color:'white', textAlign:'center'}}>
            <div style={{fontFamily:SERIF, fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'10px'}}>
              Today's Message
            </div>
            <div style={{fontFamily:SERIF, fontSize:'22px', color:'white', fontWeight:500, lineHeight:1.3, marginBottom:'8px'}}>
              {card.title}
            </div>
            <div style={{fontSize:'14px', color:'rgba(255,255,255,0.82)', lineHeight:1.6, maxWidth:'420px', margin:'0 auto 18px'}}>
              {card.body}
            </div>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center'}}>
              <ActionBtn label="Save to Energy Log" onClick={() => alert('Saved ✓')}/>
              <ActionBtn label="Share" onClick={() => card && shareOracleCard(card).catch(() => {})}/>
              {onBookMeditation && <ActionBtn label="Book a session" onClick={onBookMeditation}/>}
              <ActionBtn label="Pull Again Tomorrow" onClick={onClose} variant="ghost"/>
            </div>
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
    background: 'center / cover no-repeat url(/card-back.png)',
    overflow:'hidden',
  }}>
    <div style={{
      position:'absolute', inset:0,
      background:'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
      animation:'oracleShimmer 3.5s ease-in-out infinite',
      mixBlendMode:'overlay',
    }}/>
  </div>
);

const CardFrontFace: React.FC<{card: OracleCardData | null; large?: boolean}> = ({ card, large }) => (
  <div style={{
    position:'absolute', inset:0, backfaceVisibility:'hidden',
    transform:'rotateY(180deg)',
    borderRadius: large ? '20px' : '14px',
    background:'linear-gradient(155deg,#FFF8ED 0%,#F5E1C0 55%,#E6C79A 100%)',
    padding:'22px 18px',
    display:'flex', flexDirection:'column', justifyContent:'space-between',
    border:'0.5px solid rgba(226,181,103,0.5)',
    overflow:'hidden',
    boxShadow:'inset 0 0 40px rgba(226,181,103,0.25)',
  }}>
    <div>
      <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color: card?.category_color || GOLD, fontWeight:800, marginBottom:'6px'}}>
        {card?.category_label || '—'}
      </div>
      <div style={{fontFamily: SERIF, fontSize: large ? '22px' : '15px', color: INK, fontWeight:500, lineHeight:1.25}}>
        {card?.title || 'Your message is arriving…'}
      </div>
    </div>
    <div style={{fontSize: large ? '13.5px' : '10.5px', color: INK_SOFT, lineHeight:1.55, fontFamily: SERIF, fontStyle:'italic'}}>
      {card?.body || ''}
    </div>
  </div>
);

// ──── Atmosphere ───────────────────────────────────────────────────────────

const StarField: React.FC = () => (
  <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0}}>
    {Array.from({ length: 40 }).map((_, i) => (
      <div key={i} style={{
        position:'absolute',
        top: `${(i * 37) % 100}%`,
        left: `${(i * 73) % 100}%`,
        width:'2px', height:'2px', borderRadius:'50%',
        background:'white',
        opacity: 0.15 + ((i * 17) % 50) / 100,
        animation: `oracleTwinkle ${3 + (i % 5)}s ease-in-out ${(i % 10) * 0.3}s infinite`,
      }}/>
    ))}
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
            width:'6px', height:'6px', borderRadius:'50%',
            background:'radial-gradient(circle, #F5CF8A 0%, rgba(245,207,138,0) 70%)',
            boxShadow:'0 0 12px #F5CF8A',
          }}/>
      );
    })}
  </div>
);

const ActionBtn: React.FC<{label:string; onClick:()=>void; variant?: 'solid'|'ghost'}> = ({ label, onClick, variant='solid' }) => (
  <button onClick={onClick}
    style={{
      background: variant === 'solid' ? 'rgba(245,207,138,0.2)' : 'transparent',
      color: variant === 'solid' ? GOLD_SOFT : 'rgba(255,255,255,0.65)',
      border: variant === 'solid' ? '0.5px solid rgba(245,207,138,0.4)' : '0.5px solid rgba(255,255,255,0.2)',
      borderRadius:'999px', padding:'9px 16px', fontSize:'12px', fontWeight:700,
      cursor:'pointer', fontFamily:'inherit',
    }}>
    {label}
  </button>
);

// Inject keyframes once per session.
if (typeof document !== 'undefined' && !document.getElementById('oracle-reel-keyframes')) {
  const s = document.createElement('style');
  s.id = 'oracle-reel-keyframes';
  s.innerHTML = `
    @keyframes oracleShimmer { 0%,100% { transform: translateX(-30%) } 50% { transform: translateX(30%) } }
    @keyframes oracleTwinkle { 0%,100% { opacity: 0.2 } 50% { opacity: 0.9 } }
  `;
  document.head.appendChild(s);
}

export default OracleCardReel;
export function ensureOracleReelKeyframes() { /* keyframes injected at import-time */ }
