// © 2026 SoulMD, LLC. All rights reserved.
//
// Oracle card ritual — 7-card watercolor-sprite arc with guaranteed-no-
// overflow reveal. Animation engine + sprite cropping live in shared
// components so the /meditate oracle stays in sync with this one.
//
// Card back: 1 of 10 watercolor flowers from frontend/src/assets/flowers.png
// (2-row, 5-column sprite sheet). Flower rotates daily via dayOfYear % 10.
// The bottom 16% of each sprite cell is a baked-in flower-name label —
// hidden via the FlowerSpriteFill component (clip-path).
//
// Card front (revealed): cream + gold, auto-fit typography bucketed by
// message length so the longest oracle pull still fits without scrolling.
import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { shareOracleCard } from './shareOracleCard';
import {
  OracleCardFan, OracleGoldParticles, EASE,
  type OraclePhase,
} from '../../components/shared/OracleCardFan';
import { FlowerSpriteFill, SPRITE_FLOWERS, type FlowerCell } from '../../components/shared/FlowerSprite';

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
// GOLD_BRIGHT lived only inside the in-file GoldParticles which now
// resides in shared/OracleCardFan.
const CREAM     = '#FFFEFA';
const INK_CARD  = '#2A2150';
const INK_SOFT  = '#6B6889';
const PURPLE    = '#534AB7';
const PURPLE_MID= '#9b8fe8';
const SERIF     = '"Playfair Display",serif';
// EASE is re-imported from the shared module so this file stays consistent
// with the canonical timing curve. Re-export is unused here.

const dayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};
const initialFlowerIndex = (): number => dayOfYear() % SPRITE_FLOWERS.length;

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
// Shine + breathe + gold-ring + particle-drift keyframes now live inside
// shared/OracleCardFan, injected on import.

const dateKey = () => new Date().toISOString().slice(0, 10);
const lockKey = () => `oracle_pulled_${dateKey()}`;

// Card geometry now lives in shared/OracleCardFan (CARD_W_*, CARD_H_*,
// STAGE_H, FAN). Re-imported as needed.

const OracleDailyCard: React.FC<Props> = ({ API, token, todaysCard, isSuperuser, onChanged, onOpenEnergyLog }) => {
  const [phase, setPhase] = useState<OraclePhase>('deck');
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

  const flower = SPRITE_FLOWERS[flowerIndex % SPRITE_FLOWERS.length];

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
      setFlowerIndex(prev => (prev + 1) % SPRITE_FLOWERS.length);
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
      <OracleGoldParticles/>

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

      {/* STAGE — 7-card fan from shared component */}
      <OracleCardFan
        phase={phase}
        pickedIndex={pickedIndex}
        flipped={flipped}
        locked={lockedToday}
        onPick={pickCard}
        renderBack={() => <ConciergeCardBack flower={flower}/>}
        renderFront={({ isPicked }) => <ConciergeCardFront card={card} show={phase === 'revealed' && isPicked}/>}
      />

      {/* Hint */}
      <div style={{marginTop:'14px', textAlign:'center', minHeight:'22px', color: INK_SOFT, fontSize:'12.5px', fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.4px', position:'relative', zIndex:2}}>
        {phase === 'deck' && !lockedToday && (loading ? 'Drawing your card…' : 'Tap the card that calls to you')}
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

// ─── Card faces ───────────────────────────────────────────────────────────
// FanCard / per-slot motion lives in shared/OracleCardFan.tsx now.

const ConciergeCardBack: React.FC<{flower: FlowerCell}> = ({ flower }) => {
  const idx = SPRITE_FLOWERS.findIndex(f => f.col === flower.col && f.row === flower.row);
  return (
    <div style={{
      position:'absolute', inset:0,
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
      {/* Flower fills the card back; FlowerSpriteFill clips the bottom
          16% label baked into the sprite. */}
      <div style={{position:'absolute', inset:'8px', borderRadius:'6px', overflow:'hidden'}}>
        <FlowerSpriteFill index={idx >= 0 ? idx : 0}/>
      </div>
      {/* Corner sparkles */}
      <span style={{position:'absolute', top:'6px',    left:'8px',  fontSize:'8px', color: GOLD_SOFT, opacity: 0.9}}>✦</span>
      <span style={{position:'absolute', top:'6px',    right:'8px', fontSize:'8px', color: GOLD_SOFT, opacity: 0.9}}>✦</span>
      <span style={{position:'absolute', bottom:'6px', left:'8px',  fontSize:'7px', color: GOLD_SOFT, opacity: 0.7}}>✧</span>
      <span style={{position:'absolute', bottom:'6px', right:'8px', fontSize:'7px', color: GOLD_SOFT, opacity: 0.7}}>✧</span>
    </div>
  );
};

// Body font + line clamp by length. 4-bucket schedule tuned for readability
// on the 220×340 revealed face with 20px/16px padding — at 1.5 line-height
// the tallest bucket (20px × 4 lines) uses 120px, leaving headroom for the
// category / sparkle / title / divider / heart chrome above and below.
function bodyStyleFor(text: string): { fontSize: string; lineClamp: number } {
  const len = (text || '').length;
  if (len < 80)  return { fontSize: '20px', lineClamp: 4 };
  if (len < 150) return { fontSize: '17px', lineClamp: 5 };
  if (len < 220) return { fontSize: '15px', lineClamp: 6 };
  return                { fontSize: '13px', lineClamp: 7 };
}

const ConciergeCardFront: React.FC<{card: OracleCardData | null; show: boolean}> = ({ card, show }) => {
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

  // The shared OracleCardFan wrapper already handles rotateY(180deg) +
  // backface-hidden positioning. This component just paints the card's
  // visible content — relative box, full size of the parent.
  return (
    <div style={{
      position:'relative', width:'100%', height:'100%',
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
          color: INK_CARD, lineHeight: 1.5, fontWeight:500,
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

// GoldParticles moved to shared/OracleCardFan as OracleGoldParticles.

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
