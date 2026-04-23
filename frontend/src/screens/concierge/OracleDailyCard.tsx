// © 2026 SoulMD, LLC. All rights reserved.
//
// Daily oracle card — Gabby Bernstein-style ritual.
//
// 6-step reference flow (matches the user's reference screenshot):
//   1. CHOOSE A CARD — three periwinkle cards float on a deep misty gradient,
//      each bearing a gold sun-moon-star mandala. Lotus icon + tagline
//      "Trust. Pause. Receive." + hint "Swipe or tap a card".
//   2. YOU CHOOSE — the tapped card ignites with a gold sparkle burst, the
//      others dim.
//   3. MOVES TO CENTER — chosen card scales up and translates to center.
//   4. FLIPS — 3D flip with a golden ring mid-flip (conic-gradient swirl).
//   5. MESSAGE REVEALS — cream card face with sun icon top, serif message,
//      italic subtitle, heart at bottom.
//   6. RECEIVE / REFLECT — "Take a moment to reflect" CTA + "Draw again
//      tomorrow" link. Superusers can tap; regular patients see text only.
//
// Zero network asset dependencies: the sun-moon-star mandala, the golden
// swirl ring, and the floating particles are all inline SVG/CSS. The
// oracle message text comes from /concierge/oracle/today.
import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { shareOracleCard } from './shareOracleCard';
import FlowerOfTheDay from './FlowerOfTheDay';

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

// Design tokens — light pearl/lavender stage matching the rest of the PWA.
const BG_PEARL    = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)';
const GOLD        = '#C9A84C';
const GOLD_SOFT   = '#E6C97A';
const GOLD_BRIGHT = '#FFE4A3';
const CREAM       = '#FFF8F0';
const CREAM_EDGE  = '#F5E8C7';
const INK_CARD    = '#2A2150';
const INK_SOFT    = '#6B6889';
const PURPLE      = '#534AB7';
const PURPLE_MID  = '#9b8fe8';
const SERIF       = '"Playfair Display",Georgia,serif';
const EASE        = [0.22, 1, 0.36, 1] as const;

// Keyframes + Google Fonts once per session.
if (typeof document !== 'undefined' && !document.getElementById('oracle-daily-fonts')) {
  const pre1 = document.createElement('link');
  pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
  const pre2 = document.createElement('link');
  pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
  const link = document.createElement('link');
  link.id = 'oracle-daily-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap';
  document.head.appendChild(pre1);
  document.head.appendChild(pre2);
  document.head.appendChild(link);
}
if (typeof document !== 'undefined' && !document.getElementById('oracle-daily-keyframes')) {
  const s = document.createElement('style');
  s.id = 'oracle-daily-keyframes';
  s.innerHTML = `
    @keyframes oracleCardFloat {
      0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
      50%      { transform: translateY(-10px) rotate(var(--rot, 0deg)); }
    }
    @keyframes oracleGoldAura {
      0%, 100% { box-shadow:
        0 0 18px rgba(201,168,76,0.30),
        0 0 40px rgba(201,168,76,0.18),
        inset 0 0 22px rgba(255,228,163,0.15); }
      50%      { box-shadow:
        0 0 26px rgba(201,168,76,0.55),
        0 0 60px rgba(201,168,76,0.30),
        inset 0 0 30px rgba(255,228,163,0.28); }
    }
    @keyframes oracleParticleDrift {
      0%   { transform: translate3d(0, 0, 0); opacity: 0; }
      15%  { opacity: 0.9; }
      85%  { opacity: 0.5; }
      100% { transform: translate3d(calc(var(--drift, 16px)), -110vh, 0); opacity: 0; }
    }
    @keyframes oracleSwirl {
      0%   { transform: rotate(0deg);   opacity: 0; }
      15%  { opacity: 1; }
      85%  { opacity: 1; }
      100% { transform: rotate(360deg); opacity: 0; }
    }
    @keyframes oracleSparkleBurst {
      0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
    }
    /* Hide scrollbars on the overflow-y auto message container */
    .oracle-msg-scroll::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(s);
}

// Note: superuser bypass is driven by the isSuperuser prop, populated upstream
// by /concierge/me (which reads User.is_superuser on the server). The
// authoritative superuser email list lives in backend/main.py:SUPERUSER_EMAILS.

const dateKey = () => new Date().toISOString().slice(0, 10);
const lockKey = () => `oracle_pulled_${dateKey()}`;

const CARD_COUNT = 3;
const CARD_W = 170;
const CARD_H = 255;   // 2:3
const DECK_GAP = 26;

const OracleDailyCard: React.FC<Props> = ({ API, token, todaysCard, isSuperuser, onChanged, onOpenEnergyLog }) => {
  const [phase, setPhase] = useState<'deck' | 'picking' | 'revealed'>('deck');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [card, setCard] = useState<OracleCardData | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showBurst, setShowBurst] = useState(false);

  const [lockedToday, setLockedToday] = useState<boolean>(() => {
    try {
      if (isSuperuser) return false;
      return !!localStorage.getItem(lockKey());
    } catch { return false; }
  });

  // Pre-load today's card if it's already been pulled.
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
          setPickedIndex(Math.floor(CARD_COUNT / 2));
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
    setShowBurst(true);                          // gold sparkle burst on tapped card
    setTimeout(() => setShowBurst(false), 900);
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
      // Choreography: sparkle (0–0.9s) → glide to center (0.4–1.3s) → flip (1.3–2.3s)
      setTimeout(() => {
        setFlipped(true);
        setTimeout(() => {
          setPhase('revealed');
          if (!isSuperuser) {
            try { localStorage.setItem(lockKey(), String(d.card.id)); } catch {}
            setLockedToday(true);
          }
          onChanged();
        }, 1000);    // flip duration
      }, 1300);      // glide to center
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[oracle/today POST failed]', e);
      setErr(e.message || 'Could not draw today\'s card.');
      setPhase('deck');
      setPickedIndex(null);
    } finally {
      setLoading(false);
    }
  }, [API, token, phase, loading, lockedToday, isSuperuser, onChanged]);

  const drawAgainTomorrow = useCallback(async () => {
    if (!isSuperuser || loading) return;
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
      onChanged();
    } catch (e: any) {
      setErr(e.message || 'Could not reset.');
    } finally { setLoading(false); }
  }, [API, token, isSuperuser, loading, onChanged]);

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

      {/* STAGE */}
      <div style={{position:'relative', width:'100%', height:`${CARD_H + 100}px`, display:'flex', alignItems:'center', justifyContent:'center', perspective:'1400px', zIndex:2}}>
        {/* Golden swirl ring — visible during flip */}
        <GoldenSwirlRing active={phase === 'picking' && flipped === false && pickedIndex !== null} />
        <AnimatePresence>
          {flipped && phase !== 'revealed' && <GoldenSwirlRing active key="mid-flip" />}
        </AnimatePresence>

        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <FloatingCard
            key={i}
            index={i}
            total={CARD_COUNT}
            phase={phase}
            pickedIndex={pickedIndex}
            flipped={flipped}
            card={card}
            locked={lockedToday}
            sparkleOnMe={showBurst && pickedIndex === i}
            onPick={pickCard}
          />
        ))}
      </div>

      {/* Hint under stage */}
      <div style={{marginTop:'14px', textAlign:'center', minHeight:'22px', color: INK_SOFT, fontSize:'12.5px', fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.4px', position:'relative', zIndex:2}}>
        {phase === 'deck' && !lockedToday && (loading ? 'Drawing your card…' : 'Swipe or tap a card')}
        {phase === 'deck' &&  lockedToday && 'Your message for today is above — tap to reopen'}
        {phase === 'picking' && 'The Universe is listening…'}
        {phase === 'revealed' && null}
      </div>

      {/* Revealed CTA row */}
      <AnimatePresence>
        {phase === 'revealed' && card && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, delay: 1.4, ease: EASE }}
            style={{marginTop:'22px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', position:'relative', zIndex:2}}>
            <button onClick={onOpenEnergyLog}
              style={{
                background:'linear-gradient(135deg,#F5CF8A,#E2B567)',
                border:`1px solid ${GOLD}`,
                color: INK_CARD,
                borderRadius:'999px',
                padding:'12px 30px',
                fontSize:'11.5px', fontWeight:700,
                letterSpacing:'3px', textTransform:'uppercase',
                cursor:'pointer', fontFamily:'inherit',
                boxShadow:`0 8px 20px rgba(201,168,76,0.25)`,
              }}>
              Take a moment to reflect
            </button>
            <div style={{display:'flex', gap:'14px', alignItems:'center'}}>
              {isSuperuser ? (
                <button onClick={drawAgainTomorrow}
                  style={{background:'transparent', border:'none', color: PURPLE, fontSize:'12px', fontWeight:600, fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.6px', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:'3px'}}>
                  Draw Again Tomorrow
                </button>
              ) : (
                <span style={{color: INK_SOFT, fontSize:'12px', fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.6px'}}>
                  Draw Again Tomorrow
                </span>
              )}
              <button onClick={() => card && shareOracleCard(card).catch(() => {})}
                style={{background:'transparent', border:'none', color: PURPLE, fontSize:'12px', fontWeight:600, fontStyle:'italic', fontFamily: SERIF, letterSpacing:'0.6px', cursor:'pointer'}}>
                Share
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <div style={{marginTop:'10px', fontSize:'12px', color:'#ffb3b3', textAlign:'center', position:'relative', zIndex:2}}>{err}</div>}
    </div>
  );
};

// ─── Floating card ────────────────────────────────────────────────────────

const FloatingCard: React.FC<{
  index: number;
  total: number;
  phase: 'deck' | 'picking' | 'revealed';
  pickedIndex: number | null;
  flipped: boolean;
  card: OracleCardData | null;
  locked: boolean;
  sparkleOnMe: boolean;
  onPick: (i: number) => void;
}> = ({ index, total, phase, pickedIndex, flipped, card, locked, sparkleOnMe, onPick }) => {
  const isPicked = pickedIndex === index;
  const isOther  = pickedIndex !== null && pickedIndex !== index;
  const middle   = (total - 1) / 2;
  const offIdx   = index - middle;
  const deckX    = offIdx * (CARD_W + DECK_GAP);
  const deckRot  = offIdx * 5;
  const floatDelay = `${-(index * 1.2)}s`;

  let x = 0, y = 0, rotate = 0, scale = 1, opacity = 1;
  if (phase === 'deck') {
    x = deckX; rotate = deckRot; scale = 1; opacity = locked ? 0.55 : 1;
  } else if (phase === 'picking' || phase === 'revealed') {
    if (isPicked) {
      x = 0; y = -10; rotate = 0; scale = 1.28; opacity = 1;
    } else if (isOther) {
      x = deckX; rotate = deckRot; scale = 0.88; opacity = 0.05;
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ x, y, rotate, scale, opacity }}
      transition={{ duration: 0.9, ease: EASE }}
      whileHover={phase === 'deck' && !locked ? { scale: 1.06, y: -12 } : undefined}
      onClick={() => onPick(index)}
      style={{
        position:'absolute',
        width:`${CARD_W}px`, height:`${CARD_H}px`,
        cursor: phase === 'deck' && !locked ? 'pointer' : 'default',
        transformStyle:'preserve-3d',
        zIndex: isPicked ? 10 : 1,
      }}>
      {/* Gold aura pulse */}
      {(phase === 'deck' || sparkleOnMe) && (
        <div style={{
          position:'absolute', inset:'-4px',
          borderRadius:'20px',
          pointerEvents:'none',
          animation:'oracleGoldAura 3.2s ease-in-out infinite',
          animationDelay: floatDelay,
        }}/>
      )}
      {/* Sparkle burst on pick */}
      {sparkleOnMe && (
        <div style={{position:'absolute', top:'50%', left:'50%', pointerEvents:'none', zIndex:5}}>
          <SparkleBurst/>
        </div>
      )}
      {/* Float bobbing wrapper — separate so Framer's transform + CSS anim don't fight */}
      <div style={{
        width:'100%', height:'100%',
        animation: phase === 'deck' ? 'oracleCardFloat 6s ease-in-out infinite' : undefined,
        animationDelay: floatDelay,
      }}>
        {/* Flip container */}
        <motion.div
          initial={false}
          animate={{ rotateY: flipped && isPicked ? 180 : 0 }}
          transition={{ duration: 1.0, ease: EASE }}
          style={{width:'100%', height:'100%', position:'relative', transformStyle:'preserve-3d'}}>
          <CardFrontFlower/>
          <CardMessageFace card={card} show={phase === 'revealed' && isPicked}/>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─── Card faces ───────────────────────────────────────────────────────────

// All cards share today's flower — rotates daily through 20 flower types
// × 30 palettes × variation = 365 unique daily looks. Drawn as inline SVG.
const CardFrontFlower: React.FC = () => (
  <div style={{
    position:'absolute', inset:0,
    backfaceVisibility:'hidden',
    WebkitBackfaceVisibility:'hidden',
    borderRadius:'16px',
    overflow:'hidden',
  }}>
    <FlowerOfTheDay borderRadius={14}/>
  </div>
);

// Auto-fit message font-size bucketed by body length. Prevents long oracle
// pulls from overflowing the card — short messages get big handwritten flair,
// long ones get smaller-but-still-readable type. clamp() also responds to
// viewport width so the same bucket shrinks further on phones.
function bodyFontFor(text: string): { size: string; lineHeight: number } {
  const len = (text || '').length;
  if (len < 80)      return { size: 'clamp(15px, 4.2vw, 22px)', lineHeight: 1.3  };
  if (len < 150)     return { size: 'clamp(13px, 3.6vw, 18px)', lineHeight: 1.35 };
  return                    { size: 'clamp(11px, 3vw,   15px)', lineHeight: 1.45 };
}
function titleFontFor(text: string): string {
  const len = (text || '').length;
  if (len < 30) return 'clamp(14px, 3.6vw, 18px)';
  if (len < 50) return 'clamp(12px, 3.2vw, 16px)';
  return              'clamp(11px, 2.8vw, 14px)';
}

const CardMessageFace: React.FC<{card: OracleCardData | null; show: boolean}> = ({ card, show }) => {
  const cat  = useAnimation();
  const tit  = useAnimation();
  const body = useAnimation();

  useEffect(() => {
    if (show) {
      cat.start({ opacity: 1, y: 0, letterSpacing: '3px',   transition: { duration: 1.4, delay: 0,   ease: EASE } });
      tit.start({ opacity: 1, y: 0, letterSpacing: '0.05em', transition: { duration: 1.4, delay: 0.3, ease: EASE } });
      body.start({ opacity: 1, y: 0, letterSpacing: '0.02em', transition: { duration: 1.4, delay: 0.6, ease: EASE } });
    } else {
      cat.set ({ opacity: 0, y: 12, letterSpacing: '0em' });
      tit.set ({ opacity: 0, y: 12, letterSpacing: '0em' });
      body.set({ opacity: 0, y: 12, letterSpacing: '0em' });
    }
  }, [show, cat, tit, body]);

  const bodyText = card?.body || '';
  const titleText = card?.title || '';
  const bodyFont = bodyFontFor(bodyText);

  return (
    <div style={{
      position:'absolute', inset:0,
      backfaceVisibility:'hidden',
      WebkitBackfaceVisibility:'hidden',
      transform:'rotateY(180deg)',
      borderRadius:'16px',
      background: CREAM,
      boxShadow:`inset 0 0 0 2px ${GOLD}, inset 0 0 0 4px rgba(201,168,76,0.28)`,
      padding:'20px',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between',
      overflow:'hidden',
      textAlign:'center',
      boxSizing:'border-box',
    }}>
      {/* Inner gold ruled border */}
      <div style={{
        position:'absolute', inset:'10px',
        border:`1px solid ${CREAM_EDGE}`,
        borderRadius:'10px',
        pointerEvents:'none',
      }}/>

      {/* Sun icon top */}
      <div style={{position:'relative', flexShrink:0}}>
        <TopSunIcon/>
      </div>

      {/* Content area — max 65% of card height, scrolls invisibly if long copy
          overflows after the font-size bucket kicks in. */}
      <div className="oracle-msg-scroll" style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        gap:'8px', width:'100%', padding:'4px 2px',
        maxHeight:'65%',
        overflowY:'auto',
        scrollbarWidth:'none',
      }}>
        <motion.div animate={cat}
          style={{fontSize:'clamp(8.5px,2.4vw,10px)', textTransform:'uppercase', color: GOLD, fontWeight:700,
            fontFamily: SERIF, letterSpacing:'0em', flexShrink:0}}>
          {card?.category_label || '—'}
        </motion.div>
        {!!titleText && (
          <motion.div animate={tit}
            style={{fontFamily: SERIF, fontSize: titleFontFor(titleText), fontWeight:500, fontStyle:'italic',
              color: INK_CARD, lineHeight:1.3, letterSpacing:'0em', flexShrink:0, maxWidth:'100%', wordBreak:'break-word'}}>
            {titleText}
          </motion.div>
        )}
        {!!bodyText && (
          <motion.div animate={body}
            style={{fontFamily:'"Caveat","Playfair Display",Georgia,cursive',
              fontSize: bodyFont.size, color: INK_CARD, lineHeight: bodyFont.lineHeight, fontWeight:500,
              letterSpacing:'0em', padding:'0 2px', maxWidth:'100%', wordBreak:'break-word'}}>
            {bodyText}
          </motion.div>
        )}
      </div>

      {/* Heart at bottom */}
      <div style={{color: GOLD, opacity: 0.7, fontSize:'14px', marginTop:'4px', flexShrink:0}}>♡</div>
    </div>
  );
};

// ─── Decorations ──────────────────────────────────────────────────────────

const LotusIcon: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {[-60, -30, 0, 30, 60].map((a, i) => (
      <path key={i} transform={`rotate(${a} 16 22)`}
        d="M 16 22 Q 10 12, 16 4 Q 22 12, 16 22 Z"
        fill={GOLD_SOFT} opacity="0.85" stroke={GOLD} strokeWidth="0.6"/>
    ))}
    <ellipse cx="16" cy="23" rx="6" ry="1.5" fill={GOLD}/>
  </svg>
);

const TopSunIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    {Array.from({length: 12}).map((_, i) => (
      <line key={i} x1="16" y1="2" x2="16" y2="6"
        stroke={GOLD} strokeWidth="1" strokeLinecap="round"
        transform={`rotate(${i * 30} 16 16)`}/>
    ))}
    <circle cx="16" cy="16" r="5" fill="none" stroke={GOLD} strokeWidth="1.2"/>
    <circle cx="16" cy="16" r="2" fill={GOLD}/>
  </svg>
);

// Animated sparkle burst — 20 gold particles radiating from center.
const SparkleBurst: React.FC = () => (
  <>
    {Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * 360;
      const dist = 70 + (i % 4) * 14;
      return (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: Math.cos(angle * Math.PI / 180) * dist,
            y: Math.sin(angle * Math.PI / 180) * dist,
            opacity: [0, 1, 0],
            scale: [0.4, 1.2, 0.6],
          }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{
            position:'absolute',
            width:'7px', height:'7px', borderRadius:'50%',
            background: `radial-gradient(circle, ${GOLD_BRIGHT} 0%, rgba(255,228,163,0) 70%)`,
            boxShadow: `0 0 10px ${GOLD_SOFT}`,
          }}/>
      );
    })}
  </>
);

// Golden ring that swirls around the picked card during the flip moment.
const GoldenSwirlRing: React.FC<{active: boolean}> = ({ active }) => {
  if (!active) return null;
  return (
    <div aria-hidden style={{
      position:'absolute', top:'50%', left:'50%',
      width:'330px', height:'330px',
      marginLeft:'-165px', marginTop:'-165px',
      pointerEvents:'none',
      borderRadius:'50%',
      background:
        `conic-gradient(from 0deg,
          rgba(201,168,76,0) 0deg,
          rgba(230,201,122,0.65) 60deg,
          rgba(255,228,163,0.85) 90deg,
          rgba(201,168,76,0.45) 120deg,
          rgba(201,168,76,0) 200deg,
          rgba(201,168,76,0) 360deg)`,
      animation:'oracleSwirl 1.4s linear',
      maskImage:'radial-gradient(circle, transparent 54%, black 57%, black 72%, transparent 76%)',
      WebkitMaskImage:'radial-gradient(circle, transparent 54%, black 57%, black 72%, transparent 76%)',
      filter:'blur(0.5px) drop-shadow(0 0 10px rgba(230,201,122,0.4))',
      zIndex: 6,
    }}/>
  );
};

// Gold particles drifting upward across the light-pearl oracle panel.
// Pure gold tones so they stay visible against the pearl gradient.
const GoldParticles: React.FC = () => (
  <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:1}}>
    {Array.from({ length: 32 }).map((_, i) => {
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

export default OracleDailyCard;
