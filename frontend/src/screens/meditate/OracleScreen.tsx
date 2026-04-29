// © 2026 SoulMD, LLC. All rights reserved.
//
// Oracle ritual for /meditate. Uses the SAME shared 7-card fan + flip
// + sparkle animation as the concierge oracle (frontend/src/components/
// shared/OracleCardFan), so any tuning to the choreography lives in
// exactly one place forever.
//
// Per spec, the card faces differ from concierge:
//   • Back (pre-flip)  — soft gradient #C5E8F4 → #f0c8d8 (or
//                        /card-back.png), no flower, no text. All seven
//                        cards look identical face-down.
//   • Front (post-flip)— watercolor flower (cropped via FlowerSprite,
//                        labels hidden) + Yogananda message in Georgia
//                        italic + "✦ YOGANANDA ✦" attribution in gold.
//
// Backend wired to /meditate/oracle/today + /meditate/oracle/pull +
// /meditate/oracle/reflect (already built).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DictationButton from '../../DictationButton';
import { MEDITATE_TOKENS as T } from './MeditateApp';
import {
  OracleCardFan, OracleGoldParticles, EASE, CENTER_INDEX,
  type OraclePhase,
} from '../../components/shared/OracleCardFan';
import { FlowerSprite } from '../../components/shared/FlowerSprite';

// Same daily-flower trick the concierge oracle uses: pick one flower
// (0-9) per day so all 7 deck cards show the same illustration before
// the user picks one. Keeps the deck visually unified and matches the
// concierge UX exactly.
const dayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

interface Props {
  API: string;
  token: string;
  onBeginMeditation: () => void;
}

interface OracleCard {
  id: number;
  date: string;
  message_id: number;
  message_text: string;
  flower_index: number;
  reflection: string;
  reflected_at: string | null;
  created_at: string;
}

const OracleScreen: React.FC<Props> = ({ API, token, onBeginMeditation }) => {
  const [phase, setPhase] = useState<OraclePhase>('deck');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [card, setCard] = useState<OracleCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [err, setErr] = useState<string>('');

  const [reflection, setReflection] = useState<string>('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [savedTickAt, setSavedTickAt] = useState<number | null>(null);

  // Daily flower index used on every card's pre-flip face. Stable for
  // the day so the deck reads as a unified illustration. The actual
  // post-pull card.flower_index is still stored server-side for record
  // — we just don't render it on the deck cards' fronts.
  const deckFlowerIndex = useMemo(() => dayOfYear() % 10, []);

  // Load today's pull. If one exists, jump straight to the revealed
  // state (center card, flipped) so the same message stays visible all
  // day — matches the concierge oracle's "one card per day" rhythm.
  useEffect(() => {
    let alive = true;
    fetch(`${API}/meditate/oracle/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive || !d) return;
        if (d.pulled && d.card) {
          setCard(d.card);
          setPickedIndex(CENTER_INDEX);
          setFlipped(true);
          setPhase('revealed');
          setReflection(d.card.reflection || '');
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [API, token]);

  const pickCard = useCallback(async (i: number) => {
    if (phase !== 'deck' || pulling || card) return;
    setErr('');
    setPickedIndex(i);
    setPhase('picking');
    setPulling(true);
    try {
      const res = await fetch(`${API}/meditate/oracle/pull`, {
        method:'POST',
        headers:{ Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not pull a card.');
      setCard(d);
      setReflection(d.reflection || '');
      // Choreography matches the concierge timing: glide-to-center 400ms,
      // then flip 1000ms, then settle into revealed state.
      window.setTimeout(() => {
        setFlipped(true);
        window.setTimeout(() => setPhase('revealed'), 1000);
      }, 400);
    } catch (e: any) {
      setErr(e.message || 'Could not pull a card.');
      setPhase('deck');
      setPickedIndex(null);
    } finally {
      setPulling(false);
    }
  }, [API, token, phase, pulling, card]);

  // Pull a fresh card. The /meditate route is superuser-gated upstream
  // in App.tsx, so every visitor here is a superuser and the backend
  // hands back a brand-new random message + flower on every call. The
  // legacy ?pull_again=true query is no longer required.
  const pullAgain = useCallback(async () => {
    if (pulling) return;
    setErr('');
    setFlipped(false);
    setPhase('deck');
    setPickedIndex(null);
    setCard(null);
    setReflection('');
    setSavedTickAt(null);
    setPulling(true);
    try {
      const res = await fetch(`${API}/meditate/oracle/pull`, {
        method:'POST',
        headers:{ Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not re-pull.');
      setCard(d);
      setReflection(d.reflection || '');
      setPickedIndex(CENTER_INDEX);
      window.setTimeout(() => {
        setFlipped(true);
        window.setTimeout(() => setPhase('revealed'), 1000);
      }, 400);
    } catch (e: any) {
      setErr(e.message || 'Could not re-pull.');
    } finally {
      setPulling(false);
    }
  }, [API, token, pulling]);

  const saveReflection = useCallback(async () => {
    if (savingReflection) return;
    setSavingReflection(true); setErr('');
    try {
      const res = await fetch(`${API}/meditate/oracle/reflect`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reflection }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not save reflection.');
      setCard(d);
      setSavedTickAt(Date.now());
      window.setTimeout(() => setSavedTickAt(null), 1800);
    } catch (e: any) {
      setErr(e.message || 'Could not save reflection.');
    } finally {
      setSavingReflection(false);
    }
  }, [API, token, reflection, savingReflection]);

  if (loading) {
    return (
      <div style={{padding:'60px 20px', textAlign:'center', color: T.inkSoft, fontFamily: T.serif, fontStyle:'italic'}}>
        Gathering today's message…
      </div>
    );
  }

  return (
    <div style={{
      position:'relative',
      padding:'clamp(20px,4vw,32px) 16px 28px',
      borderRadius:'22px',
      overflow:'hidden',
      background:'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)',
      marginBottom:'14px',
      boxShadow:'0 10px 30px rgba(83,74,183,0.12)',
      border:'0.5px solid rgba(155,143,232,0.2)',
    }}>
      <OracleGoldParticles/>

      {/* Header — hidden once revealed so the message can breathe */}
      {phase !== 'revealed' && (
        <div style={{textAlign:'center', color: T.navy, marginBottom:'18px', position:'relative', zIndex:2}}>
          <div style={{fontFamily: T.serif, fontSize:'clamp(20px,4.4vw,26px)', fontWeight:600, letterSpacing:'0.4px', lineHeight:1.25}}>
            What message is for you today?
          </div>
          <div style={{fontSize:'13px', color: T.inkSoft, fontStyle:'italic', marginTop:'6px', fontFamily: T.serif, letterSpacing:'0.6px'}}>
            Trust. Pause. Receive.
          </div>
        </div>
      )}

      {/* Shared 7-card fan stage — animation parity with /concierge */}
      <OracleCardFan
        phase={phase}
        pickedIndex={pickedIndex}
        flipped={flipped}
        locked={false /* /meditate caps at one pull/day on the server */}
        onPick={pickCard}
        renderBack={() => <MeditateCardBack flowerIndex={deckFlowerIndex}/>}
        renderFront={({ isPicked }) => (
          <MeditateCardFront card={card} show={phase === 'revealed' && isPicked}/>
        )}
      />

      {/* Hint text */}
      <div style={{marginTop:'14px', textAlign:'center', minHeight:'22px', color: T.inkSoft, fontSize:'12.5px', fontStyle:'italic', fontFamily: T.serif, letterSpacing:'0.4px', position:'relative', zIndex:2}}>
        {phase === 'deck' && (pulling ? 'Drawing your card…' : 'Tap the card that calls to you')}
        {phase === 'picking' && 'The Universe is listening…'}
      </div>

      {err && <div style={{marginTop:'10px', fontSize:'12px', color:'#a02020', textAlign:'center', position:'relative', zIndex:2}}>{err}</div>}

      {/* Reveal: reflection prompt + Begin Meditation CTA */}
      <AnimatePresence>
        {phase === 'revealed' && card && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, delay: 1.2, ease: EASE }}
            style={{marginTop:'22px', position:'relative', zIndex:2}}>

            {/* Reflection card */}
            <div style={{
              background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
              padding:'16px', marginBottom:'12px',
              boxShadow:'0 8px 22px rgba(83,74,183,0.10)',
            }}>
              <div style={{fontFamily: T.serif, fontSize:'15px', fontWeight:600, color: T.navy, marginBottom:'10px', textAlign:'center'}}>
                What did this message stir in you?
              </div>
              <div style={{position:'relative'}}>
                <textarea
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                  placeholder="A feeling, a memory, a knowing — anything that arose…"
                  style={{
                    width:'100%', minHeight:'100px',
                    padding:'14px 56px 14px 14px',
                    borderRadius:'14px',
                    border:'1px solid rgba(180,210,230,0.6)',
                    background:'rgba(255,255,255,0.6)',
                    color: T.ink, fontSize:'14px', lineHeight:1.6,
                    fontFamily:'inherit', resize:'vertical', outline:'none',
                    boxSizing:'border-box',
                  }}
                />
                <div style={{position:'absolute', right:10, bottom:10}}>
                  <DictationButton
                    accent="purple" size={36} fallbackWhenUnsupported
                    onTranscript={(chunk) => setReflection(v => (v + (v && !v.endsWith(' ') ? ' ' : '') + chunk).trimStart())}
                  />
                </div>
              </div>
              <button onClick={saveReflection} disabled={savingReflection || !reflection.trim()}
                style={{
                  marginTop:'10px', width:'100%', padding:'12px',
                  background:`linear-gradient(135deg, ${T.purple}, ${T.navy})`,
                  color:'white', border:'none', borderRadius:'12px',
                  fontSize:'12.5px', fontWeight:800, cursor: (savingReflection || !reflection.trim()) ? 'default' : 'pointer',
                  opacity: (savingReflection || !reflection.trim()) ? 0.55 : 1,
                  fontFamily:'inherit', letterSpacing:'0.4px',
                }}>
                {savingReflection ? 'Saving…' : savedTickAt ? 'Saved ✓' : 'Save reflection'}
              </button>
            </div>

            <button onClick={onBeginMeditation}
              style={{
                width:'100%', padding:'14px',
                background:`linear-gradient(135deg, ${T.gold}, #a8842c)`,
                color: T.navy, border:'none', borderRadius:'14px',
                fontSize:'13.5px', fontWeight:800, cursor:'pointer',
                fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase',
                boxShadow:'0 12px 28px rgba(201,168,76,0.28)',
              }}>
              ✦ Begin Meditation
            </button>

            {/* Superuser test re-pull — small text link, easy to ignore */}
            <div style={{textAlign:'center', marginTop:'14px'}}>
              <button onClick={pullAgain}
                style={{background:'transparent', border:'none', color: T.inkSoft, fontSize:'11px', textDecoration:'underline', cursor:'pointer', fontFamily:'inherit'}}>
                ✦ Pull another card
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ───── Card faces ────────────────────────────────────────────────────────
// FRONT (visible pre-flip in the fan): watercolor flower on cream — no
// text, no gradient. All 7 deck cards show the same daily flower so
// the deck reads as a unified illustration. Mirrors the concierge
// CardBack pattern exactly.
// BACK  (revealed after flip): Yogananda message in Georgia italic on
// a soft pearl→lavender gradient — no flower, no attribution.

const MeditateCardBack: React.FC<{flowerIndex: number}> = ({ flowerIndex }) => (
  <div style={{
    position:'relative', width:'100%', height:'100%',
    borderRadius:'12px',
    background:'#FFFEFA',
    border:`1.5px solid ${T.gold}`,
    boxShadow:'inset 0 0 0 0.5px rgba(201,168,76,0.5)',
    overflow:'hidden',
    display:'flex', alignItems:'center', justifyContent:'center',
  }}>
    {/* Inner gold inset ring */}
    <div style={{
      position:'absolute', inset:'8px',
      border:`1px solid rgba(201,168,76,0.45)`,
      borderRadius:'6px',
      pointerEvents:'none',
    }}/>
    {/* Watercolor flower (label-cropped via FlowerSprite). Sized so
        the illustration fills the card minus the inset ring. The
        inner div size is recalculated in CSS off the parent — using
        a fixed 168px square to mirror the concierge crop dimensions
        (200px sprite × 0.84 = 168). */}
    <FlowerSprite index={flowerIndex} size={168} borderRadius={6}/>
    {/* Corner sparkles for tactility */}
    <span style={{position:'absolute', top:'6px',    left:'8px',  fontSize:'8px', color: T.gold, opacity: 0.9}}>✦</span>
    <span style={{position:'absolute', top:'6px',    right:'8px', fontSize:'8px', color: T.gold, opacity: 0.9}}>✦</span>
    <span style={{position:'absolute', bottom:'6px', left:'8px',  fontSize:'7px', color: T.gold, opacity: 0.7}}>✧</span>
    <span style={{position:'absolute', bottom:'6px', right:'8px', fontSize:'7px', color: T.gold, opacity: 0.7}}>✧</span>
  </div>
);

const MeditateCardFront: React.FC<{card: OracleCard | null; show: boolean}> = ({ card, show }) => {
  const text = card?.message_text || '';
  // Bucket font size + line clamp so the longest Yogananda message
  // still fits the 220×340 picked card without scroll.
  const fontSize = text.length < 110 ? 17
                  : text.length < 180 ? 15
                  : text.length < 260 ? 13
                  : 12;
  const lineClamp = text.length < 110 ? 7
                  : text.length < 180 ? 9
                  : text.length < 260 ? 11
                  : 12;
  return (
    <motion.div
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 6 }}
      transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
      style={{
        position:'relative', width:'100%', height:'100%',
        borderRadius:'12px',
        background:'linear-gradient(135deg, #F5F1FF 0%, #E8E4FB 100%)',
        border:`1.5px solid ${T.gold}88`,
        boxShadow:'inset 0 0 0 0.5px rgba(201,168,76,0.4)',
        padding:'22px 18px',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        textAlign:'center',
        overflow:'hidden',
        boxSizing:'border-box',
      }}>
      {/* Inner gold rule */}
      <div style={{
        position:'absolute', inset:'8px',
        border:`0.5px solid rgba(230,201,122,0.5)`,
        borderRadius:'8px',
        pointerEvents:'none',
      }}/>

      {/* Yogananda message — Georgia italic, centered, full card */}
      <div style={{
        fontFamily: T.serif,
        fontStyle:'italic',
        fontSize:`${fontSize}px`,
        color: T.navy,
        lineHeight:1.6,
        padding:'0 4px',
        display:'-webkit-box',
        WebkitBoxOrient:'vertical',
        WebkitLineClamp: lineClamp,
        overflow:'hidden',
      }}>
        {text}
      </div>
    </motion.div>
  );
};

export default OracleScreen;
