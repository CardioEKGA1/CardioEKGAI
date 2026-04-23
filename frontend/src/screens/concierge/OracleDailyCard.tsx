// © 2026 SoulMD, LLC. All rights reserved.
//
// Inline "Today's Message" flip card for the patient Home tab.
// Replaces the old overlay/reel — a single large portrait card shows the
// holographic card-back.png until tapped, then performs a slow 3D flip to
// reveal the oracle message. Designed to be the centerpiece of the Home tab.
import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { shareOracleCard } from './shareOracleCard';

interface OracleCardData {
  id: number; category: string;
  category_label?: string; category_color?: string;
  title: string; body: string;
  intention?: string; reflection?: string; saved?: boolean;
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
  onChanged: () => void;           // parent refetches todaysCard after a pull / reset
  onOpenEnergyLog: () => void;
}

const GOLD       = '#E2B567';
const GOLD_SOFT  = '#F5CF8A';
const INK        = '#2a3a6b';
const INK_SOFT   = '#6B6889';
const PURPLE     = '#534AB7';
const PURPLE_MID = '#9b8fe8';
const SERIF      = '"Playfair Display",Georgia,serif';

// Inject Google Fonts + keyframes once per session. Caveat for body,
// Playfair Display for title + category small-caps.
if (typeof document !== 'undefined' && !document.getElementById('oracle-daily-fonts')) {
  const pre1 = document.createElement('link');
  pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
  const pre2 = document.createElement('link');
  pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
  const link = document.createElement('link');
  link.id = 'oracle-daily-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap';
  document.head.appendChild(pre1);
  document.head.appendChild(pre2);
  document.head.appendChild(link);
}
if (typeof document !== 'undefined' && !document.getElementById('oracle-daily-keyframes')) {
  const s = document.createElement('style');
  s.id = 'oracle-daily-keyframes';
  s.innerHTML = `
    @keyframes oracleCardBreathe {
      0%, 100% { transform: translateY(0) }
      50%      { transform: translateY(-6px) }
    }
    @keyframes oracleCardGlow {
      0%, 100% { box-shadow: 0 20px 50px rgba(83,74,183,0.25), 0 0 0 1px rgba(226,181,103,0.35) }
      50%      { box-shadow: 0 22px 60px rgba(83,74,183,0.35), 0 0 0 1px rgba(226,181,103,0.75), 0 0 30px rgba(245,207,138,0.35) }
    }
  `;
  document.head.appendChild(s);
}

// Accent words for body text — rotated through three colors for emphasis.
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

const OracleDailyCard: React.FC<Props> = ({ API, token, todaysCard, isSuperuser, onChanged, onOpenEnergyLog }) => {
  // Initial flipped state honors server truth: if they've pulled today, the
  // card can be opened to show the message without re-fetching.
  const pulledServerSide = !!(todaysCard?.pulled && todaysCard.card);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [card, setCard] = useState<OracleCardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');
  const [burstKey, setBurstKey] = useState<number>(0);

  // If server says we've pulled, pre-load the card payload so tapping the
  // front flips instantly to the revealed message without another roundtrip.
  useEffect(() => {
    if (!pulledServerSide) { setCard(null); setFlipped(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        // eslint-disable-next-line no-console
        console.log('[oracle/today GET]', res.status, d);
        if (d?.card) setCard(d.card);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[oracle/today GET failed]', e);
      }
    })();
  }, [API, token, pulledServerSide]);

  const drawAndFlip = useCallback(async () => {
    if (flipped || loading) return;
    setErr('');
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
      if (!res.ok)        throw new Error(d.detail || 'Could not draw today\'s card.');
      if (!d.card)        throw new Error('Server returned no card object.');
      if (!d.card.title && !d.card.body) throw new Error('Server returned a card with no title or body.');
      setCard(d.card);
      setBurstKey(k => k + 1);     // retrigger particle burst
      setFlipped(true);
      onChanged();                 // refetch slim card state in parent
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[oracle/today POST failed]', e);
      setErr(e.message || 'Could not draw today\'s card.');
    } finally {
      setLoading(false);
    }
  }, [API, token, flipped, loading, onChanged]);

  const pullAgain = useCallback(async () => {
    if (loading) return;
    setErr('');
    setLoading(true);
    try {
      // Superuser-only endpoint — deletes today's pull so the next POST gives
      // a fresh random card. Non-superuser calls return 404 and we surface
      // that as a soft error.
      const res = await fetch(`${API}/concierge/oracle/today/reset`, {
        method: 'DELETE',
        headers: { Authorization:`Bearer ${token}` },
      });
      // eslint-disable-next-line no-console
      console.log('[oracle/today reset]', res.status);
      if (!res.ok) throw new Error('Reset not available.');
      setFlipped(false);
      setCard(null);
      onChanged();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[oracle/today reset failed]', e);
      setErr(e.message || 'Could not reset.');
    } finally {
      setLoading(false);
    }
  }, [API, token, loading, onChanged]);

  return (
    <div style={{padding:'4px 4px 18px', display:'flex', flexDirection:'column', alignItems:'center'}}>
      {/* Category label above — only shows after reveal */}
      <AnimatePresence>
        {flipped && card && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            style={{fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase',
              color: PURPLE, fontWeight:700, fontFamily: SERIF, marginBottom:'10px', textAlign:'center'}}>
            Today's Message · {card.category_label || ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD */}
      <div
        onClick={drawAndFlip}
        role="button"
        aria-label={flipped ? 'Oracle card — revealed' : 'Tap to reveal today\'s message'}
        style={{
          width:'min(300px, 78vw)',
          aspectRatio:'2/3',
          perspective:'1400px',
          cursor: flipped ? 'default' : 'pointer',
          position:'relative',
          animation: flipped ? undefined : 'oracleCardBreathe 5s ease-in-out infinite, oracleCardGlow 4s ease-in-out infinite',
          borderRadius:'16px',
        }}>
        <motion.div
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.85, ease: [0.45, 0, 0.2, 1] }}
          style={{width:'100%', height:'100%', position:'relative', transformStyle:'preserve-3d'}}>
          {/* BACK — holographic image */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden',
            WebkitBackfaceVisibility:'hidden',
            borderRadius:'16px',
            overflow:'hidden',
            backgroundColor:'#EDE6FB',
          }}>
            <img src="/card-back.png" alt="" aria-hidden="true"
              style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block', userSelect:'none', pointerEvents:'none'}}/>
          </div>
          {/* FRONT — Gabby-style reveal */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden',
            WebkitBackfaceVisibility:'hidden',
            transform:'rotateY(180deg)',
            borderRadius:'16px',
            background:'linear-gradient(180deg,#FFFFFF 0%,#FFFDF7 100%)',
            padding:'24px 22px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between',
            border:`1px solid ${PURPLE_MID}33`,
            boxShadow:'inset 0 0 60px rgba(255,248,232,0.85), 0 0 0 1px rgba(201,168,76,0.18)',
            overflow:'hidden',
            textAlign:'center',
          }}>
            <span style={{position:'absolute', top:'12px', left:'14px',  fontSize:'14px', color: GOLD, opacity: 0.75}}>✦</span>
            <span style={{position:'absolute', top:'12px', right:'14px', fontSize:'14px', color: PURPLE_MID, opacity: 0.7}}>✦</span>
            <span style={{position:'absolute', bottom:'12px', left:'14px', fontSize:'12px', color: PURPLE_MID, opacity: 0.55}}>✧</span>
            <span style={{position:'absolute', bottom:'12px', right:'14px', fontSize:'12px', color: GOLD, opacity: 0.6}}>✧</span>

            <motion.div
              initial={false}
              animate={{ opacity: flipped && card ? 1 : 0 }}
              transition={{ duration: 0.55, delay: flipped ? 0.5 : 0 }}
              style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', width:'100%'}}>
              <div style={{fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase',
                color: PURPLE, fontWeight:700, fontFamily: SERIF}}>
                {card?.category_label || '—'}
              </div>
              <span style={{fontSize:'18px', color: GOLD, opacity: 0.8}}>✦</span>
              {card?.title && (
                <div style={{fontFamily: SERIF, fontSize:'18px', fontWeight:500, fontStyle:'italic',
                  color: PURPLE, lineHeight:1.3, padding:'0 4px'}}>
                  {card.title}
                </div>
              )}
              {card?.body && (
                <div style={{fontFamily:'"Caveat",Georgia,cursive',
                  fontSize:'24px', color: INK, lineHeight:1.3, fontWeight:500, padding:'0 6px'}}>
                  {renderAccented(card.body)}
                </div>
              )}
              <span style={{fontSize:'18px', color: PURPLE_MID, opacity: 0.6}}>✦</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Particle burst on reveal */}
        {burstKey > 0 && <ParticleBurst seed={burstKey}/>}
      </div>

      {/* Hint text BEFORE flip */}
      {!flipped && (
        <div style={{marginTop:'14px', fontSize:'13px', color: INK_SOFT,
          fontStyle:'italic', fontFamily: SERIF, textAlign:'center'}}>
          {loading ? 'Drawing your card…' : 'Tap the card to reveal your message'}
        </div>
      )}

      {/* Action row AFTER flip */}
      <AnimatePresence>
        {flipped && card && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 1.2 }}
            style={{marginTop:'18px', display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center'}}>
            <ActionPill onClick={onOpenEnergyLog}>Save to Energy Log →</ActionPill>
            <ActionPill onClick={() => card && shareOracleCard(card).catch(() => {})}>Share</ActionPill>
            {isSuperuser && <ActionPill variant="ghost" onClick={pullAgain}>Pull Again</ActionPill>}
          </motion.div>
        )}
      </AnimatePresence>

      {err && <div style={{marginTop:'10px', fontSize:'12px', color:'#a02020'}}>{err}</div>}
    </div>
  );
};

const ActionPill: React.FC<React.PropsWithChildren<{onClick: () => void; variant?: 'solid' | 'ghost'}>> = ({ onClick, children, variant = 'solid' }) => (
  <button onClick={onClick}
    style={{
      background: variant === 'solid'
        ? 'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)'
        : 'rgba(255,255,255,0.7)',
      color: variant === 'solid' ? 'white' : PURPLE,
      border: variant === 'solid' ? 'none' : `0.5px solid ${PURPLE_MID}55`,
      borderRadius:'999px',
      padding:'10px 18px',
      fontSize:'12.5px', fontWeight:700,
      cursor:'pointer', fontFamily:'inherit',
      boxShadow: variant === 'solid' ? '0 6px 16px rgba(83,74,183,0.25)' : 'none',
    }}>
    {children}
  </button>
);

// 24 gold particles expand + fade on reveal. Keyed by seed so each new reveal
// triggers a fresh animation (remount).
const ParticleBurst: React.FC<{seed: number}> = ({ seed }) => (
  <div key={seed} aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', zIndex:10}}>
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * 360;
      const d = 130 + (i % 4) * 30;
      return (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{
            x: Math.cos(angle * Math.PI / 180) * d,
            y: Math.sin(angle * Math.PI / 180) * d,
            opacity: [0, 1, 0],
            scale: [0.3, 1.2, 0.5],
          }}
          transition={{ duration: 1.6, delay: 0.65 + (i % 6) * 0.04, ease: 'easeOut' }}
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

export default OracleDailyCard;
