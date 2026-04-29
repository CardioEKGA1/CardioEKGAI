// © 2026 SoulMD, LLC. All rights reserved.
// Oracle ritual for /meditate. Three states:
//   1. unpulled — intention prompt + "Pull a card" CTA
//   2. flipping — front (card-back) → 3D flip → back (flower + Yogananda message)
//   3. revealed — message + reflection textarea + "Begin Meditation" CTA
//
// Uses the existing flowers.png sprite (5 cols × 2 rows of 200×200) and
// the existing card-back.png cover. State persists server-side: same
// card all day per user; superuser can pull again with ?pull_again=true.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DictationButton from '../../DictationButton';
import { MEDITATE_TOKENS as T } from './MeditateApp';
// CRA bundles assets imported as ES modules — gives us a hashed URL.
import flowersUrl from '../../assets/flowers.png';

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

// Inject the 3D flip keyframes once.
if (typeof document !== 'undefined' && !document.getElementById('__meditate_oracle_flip')) {
  const s = document.createElement('style');
  s.id = '__meditate_oracle_flip';
  s.textContent = `
    @keyframes meditateCardFlip {
      0%   { transform: rotateY(0deg); }
      100% { transform: rotateY(180deg); }
    }
    @keyframes meditateCardGlow {
      0%,100% { box-shadow: 0 18px 40px rgba(83,74,183,0.18), 0 0 0 0 rgba(201,168,76,0.0); }
      50%     { box-shadow: 0 18px 40px rgba(83,74,183,0.22), 0 0 0 18px rgba(201,168,76,0.10); }
    }
  `;
  document.head.appendChild(s);
}

const OracleScreen: React.FC<Props> = ({ API, token, onBeginMeditation }) => {
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<OracleCard | null>(null);
  const [pulling, setPulling] = useState(false);
  const [revealed, setRevealed] = useState(false);  // gates the back-of-card view
  const [err, setErr] = useState<string>('');
  const [reflection, setReflection] = useState<string>('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Load today's pull on mount. If one exists we go straight to the
  // revealed state — patients should see today's card all day.
  useEffect(() => {
    let alive = true;
    fetch(`${API}/meditate/oracle/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive || !d) return;
        if (d.pulled && d.card) {
          setCard(d.card);
          setRevealed(true);
          setReflection(d.card.reflection || '');
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [API, token]);

  const pull = useCallback(async (force: boolean = false) => {
    if (pulling) return;
    setPulling(true); setErr('');
    try {
      const url = `${API}/meditate/oracle/pull${force ? '?pull_again=true' : ''}`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not pull a card.');
      setCard(d);
      setReflection(d.reflection || '');
      // Brief flip delay so the animation reads — set revealed after a tick.
      window.setTimeout(() => setRevealed(true), 600);
    } catch (e: any) {
      setErr(e.message || 'Could not pull a card.');
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
        body: JSON.stringify({ reflection: reflection }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not save reflection.');
      setCard(d);
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 1800);
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

  // ── Unpulled: intention setting + pull CTA ──────────────────────────
  if (!card) {
    return (
      <div style={{padding:'20px 4px', textAlign:'center'}}>
        <div style={{fontFamily: T.serif, fontSize:'26px', fontWeight:600, color: T.navy, lineHeight:1.2, letterSpacing:'-0.3px', marginBottom:'8px'}}>
          A message is waiting for you
        </div>
        <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'14px', color: T.inkSoft, lineHeight:1.65, maxWidth:'420px', margin:'0 auto 24px'}}>
          Take a quiet breath. Set an intention — for healing, clarity, surrender, or simply to listen. Then, when you are ready, pull your card.
        </div>

        <button onClick={() => pull(false)} disabled={pulling}
          style={{
            position:'relative',
            width: 'min(76vw, 280px)', height: 'min(108vw, 400px)', margin:'0 auto',
            display:'flex', alignItems:'center', justifyContent:'center',
            background: `url(/card-back.png) center/cover, linear-gradient(135deg, ${T.purple} 0%, ${T.navy} 100%)`,
            border: `1px solid ${T.gold}55`,
            borderRadius:'18px',
            cursor: pulling ? 'wait' : 'pointer',
            color:'white', fontFamily:'inherit',
            animation:'meditateCardGlow 3.2s ease-in-out infinite',
            boxShadow:'0 18px 40px rgba(83,74,183,0.22)',
          }}>
          <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(26,42,74,0.2), rgba(26,42,74,0.55))', borderRadius:'18px'}}/>
          <div style={{position:'relative', textAlign:'center', padding:'20px'}}>
            <div style={{fontSize:'34px', color: T.gold, marginBottom:'10px'}}>✦</div>
            <div style={{fontFamily: T.serif, fontSize:'20px', fontWeight:600, letterSpacing:'-0.2px'}}>
              {pulling ? 'Pulling…' : 'Pull your card'}
            </div>
            <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'12px', opacity:0.8, marginTop:'6px'}}>
              one card per day
            </div>
          </div>
        </button>

        {err && (
          <div style={{marginTop:'14px', fontSize:'12px', color:'#a02020'}}>{err}</div>
        )}

        <div style={{marginTop:'24px', fontFamily: T.serif, fontStyle:'italic', fontSize:'12px', color: T.inkSoft, opacity:0.7}}>
          The same card appears all day, like a thread you can return to.
        </div>
      </div>
    );
  }

  // ── Pulled: card view (back face = message), reflection, CTA ───────
  return (
    <div style={{padding:'12px 4px 4px'}}>
      {/* Card with flip */}
      <div style={{
        position:'relative', perspective:'1200px',
        width: 'min(76vw, 280px)', height: 'min(108vw, 400px)', margin:'0 auto 24px',
      }}>
        <div style={{
          position:'absolute', inset:0,
          transformStyle:'preserve-3d',
          transition:'transform 800ms cubic-bezier(0.5, 0, 0.2, 1)',
          transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* Front (card back design) */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            background: `url(/card-back.png) center/cover, linear-gradient(135deg, ${T.purple} 0%, ${T.navy} 100%)`,
            border: `1px solid ${T.gold}55`,
            borderRadius:'18px',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'white', boxShadow:'0 18px 40px rgba(83,74,183,0.22)',
          }}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'34px', color: T.gold}}>✦</div>
            </div>
          </div>

          {/* Back (flower + message) */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            transform:'rotateY(180deg)',
            background:'linear-gradient(180deg, #fff 0%, #fdf6e9 50%, #f5e6cf 100%)',
            border: `1px solid ${T.gold}88`,
            borderRadius:'18px',
            padding:'18px 18px 22px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
            boxShadow:'0 18px 40px rgba(201,168,76,0.22)',
          }}>
            <FlowerSprite index={card.flower_index} size={140}/>
            <div style={{
              marginTop:'8px',
              fontFamily: T.serif, fontStyle:'italic', fontSize:'13.5px',
              color: T.navy, lineHeight:1.6, textAlign:'center',
              flex:1, display:'flex', alignItems:'center',
            }}>
              {card.message_text}
            </div>
            <div style={{fontSize:'9px', letterSpacing:'2px', textTransform:'uppercase', color: T.gold, fontWeight:800, marginTop:'8px'}}>
              ✦ Yogananda ✦
            </div>
          </div>
        </div>
      </div>

      {/* Reflection prompt + CTA */}
      <div style={{
        background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
        padding:'18px', marginBottom:'14px',
        boxShadow:'0 8px 22px rgba(83,74,183,0.10)',
      }}>
        <div style={{fontFamily: T.serif, fontSize:'17px', fontWeight:600, color: T.navy, marginBottom:'10px', textAlign:'center'}}>
          What did this message stir in you?
        </div>
        <div style={{position:'relative'}}>
          <textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="A feeling, a memory, a knowing — anything that arose…"
            style={{
              width:'100%', minHeight:'110px',
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
              accent="purple"
              size={36}
              fallbackWhenUnsupported
              onTranscript={(chunk) => setReflection(v => (v + (v && !v.endsWith(' ') ? ' ' : '') + chunk).trimStart())}
            />
          </div>
        </div>

        {err && <div style={{fontSize:'12px', color:'#a02020', marginTop:'8px'}}>{err}</div>}

        <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
          <button onClick={saveReflection} disabled={savingReflection || !reflection.trim()}
            style={{
              flex:1, padding:'12px', borderRadius:'12px',
              background: `linear-gradient(135deg, ${T.purple}, ${T.navy})`,
              color:'white', border:'none', fontSize:'13px', fontWeight:800,
              cursor: (savingReflection || !reflection.trim()) ? 'default' : 'pointer',
              opacity: (savingReflection || !reflection.trim()) ? 0.55 : 1,
              fontFamily:'inherit', letterSpacing:'0.4px',
            }}>
            {savingReflection ? 'Saving…' : savedAt ? 'Saved ✓' : 'Save reflection'}
          </button>
        </div>
      </div>

      <button onClick={onBeginMeditation}
        style={{
          width:'100%', padding:'14px',
          background: `linear-gradient(135deg, ${T.gold}, #a8842c)`,
          color: T.navy, border:'none', borderRadius:'14px',
          fontSize:'14px', fontWeight:800, cursor:'pointer',
          fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase',
          boxShadow:'0 12px 28px rgba(201,168,76,0.28)',
        }}>
        ✦ Begin Meditation
      </button>

      {/* Superuser-only re-pull (for testing). Tiny link, easy to ignore. */}
      <div style={{textAlign:'center', marginTop:'18px'}}>
        <button onClick={() => { setRevealed(false); setSavedAt(null); pull(true); }}
          style={{background:'transparent', border:'none', color: T.inkSoft, fontSize:'11px', textDecoration:'underline', cursor:'pointer', fontFamily:'inherit'}}>
          Pull again (superuser test)
        </button>
      </div>
    </div>
  );
};

// Sprite cropper. The bundled flowers.png is 5 cols × 2 rows of 200×200
// crops; we scale uniformly to the requested size.
export const FlowerSprite: React.FC<{index: number; size?: number}> = ({ index, size = 200 }) => {
  const i = Math.max(0, Math.min(9, index));
  const col = i % 5;
  const row = Math.floor(i / 5);
  const scale = size / 200;
  return (
    <div aria-hidden style={{
      width: size, height: size,
      backgroundImage: `url(${flowersUrl})`,
      backgroundSize: `${1000 * scale}px ${400 * scale}px`,
      backgroundPosition: `-${col * size}px -${row * size}px`,
      backgroundRepeat: 'no-repeat',
      borderRadius: '12px',
    }}/>
  );
};

export default OracleScreen;
