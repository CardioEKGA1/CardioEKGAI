// © 2026 SoulMD, LLC. All rights reserved.
//
// Daily Oracle Card — intimate ritual, not a game.
// Five slow steps: intention → intention input → card waiting → gentle
// reveal → reflection. The magic is in the slowness and the reflection,
// not in animations. Copy is warm, not exclaimed. No countdowns, no
// "pull again tomorrow", no particle explosions — only a steady golden
// glow and space for the patient to sit.
import React, { useCallback, useEffect, useState } from 'react';
import ChoKuRei from './ChoKuRei';
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

const ORACLE_STYLE_ID = 'oracle-keyframes';
export function ensureOracleKeyframes() { ensureKeyframes(); }
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ORACLE_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = ORACLE_STYLE_ID;
  // All animations are slow, soft, and breath-paced. Nothing reads as
  // gamified. The breathing circle runs ~8s cycles — closer to a held
  // inhale/exhale than a UI flourish.
  s.innerHTML = `
    @keyframes oracleBreathCircle { 0%,100% { transform: scale(0.82); opacity: 0.72 } 50% { transform: scale(1.12); opacity: 1 } }
    @keyframes oracleSoftFloat    { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
    @keyframes oracleWarmGlow     { 0%,100% { box-shadow: 0 0 0 1px rgba(212,168,107,0.45), 0 0 24px rgba(245,194,107,0.28) } 50% { box-shadow: 0 0 0 1px rgba(212,168,107,0.75), 0 0 40px rgba(245,194,107,0.55) } }
    @keyframes oracleCardFlip     { 0% { transform: rotateY(0deg) } 100% { transform: rotateY(180deg) } }
    @keyframes oracleRevealGlow   { 0% { opacity: 0; transform: scale(0.7) } 40% { opacity: 0.9 } 100% { opacity: 0; transform: scale(1.5) } }
    @keyframes oracleFadeInSlow   { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes oracleCtaGlow      { 0%,100% { box-shadow: 0 0 0 1px rgba(245,194,107,0.55), 0 0 18px rgba(245,194,107,0.35) } 50% { box-shadow: 0 0 0 1px rgba(245,194,107,0.85), 0 0 28px rgba(245,194,107,0.65) } }
  `;
  document.head.appendChild(s);
}

// Warm, intimate palette — cream, peach, dusty rose, gold. The previous
// deep-space purple reveal moved to the card surface itself so the ritual
// frame (the screen they sit in) reads as dawn, not midnight.
const WARM_BG  = 'radial-gradient(ellipse at 30% 20%, #fbeedd 0%, #f6d8c4 45%, #e9c4a4 100%)';
const GOLD     = '#d4a86b';
const GOLD_SOFT= '#f5c26b';
const INK      = '#4a3a2e';
const INK_SOFT = '#6b5646';
const SERIF    = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

const OracleCard: React.FC<Props> = ({ API, token, userName, initialStep, onClose, onBookMeditation }) => {
  const [step, setStep] = useState<'intention'|'input'|'card'|'revealing'|'reflection'>(initialStep === 'card' ? 'card' : initialStep === 'reflection' ? 'reflection' : 'intention');
  const [intention, setIntention] = useState('');
  const [data, setData] = useState<OracleCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { ensureKeyframes(); }, []);

  // When opened via the home-screen thumbnail (initialStep != 'intention'),
  // fetch today's pull so we can jump into reflection with the card
  // already in hand.
  useEffect(() => {
    if (initialStep !== 'card' && initialStep !== 'reflection') return;
    (async () => {
      try {
        const res = await fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } });
        const d: TodayPayload = await res.json();
        if (d.pulled && d.card) setData(d.card);
      } catch {}
    })();
  }, [API, token, initialStep]);

  const createPull = useCallback(async (withIntention: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/concierge/oracle/today`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ intention: withIntention.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not draw today\'s card.');
      if (!d.card) throw new Error('No card returned.');
      return d.card as OracleCardData;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  const goToCard = async () => {
    // Create the pull BEFORE the card-waiting screen — so the Universe has
    // already chosen by the time the patient sees the face-down card.
    const card = await createPull(intention);
    if (card) { setData(card); setStep('card'); }
  };
  const skipInput = async () => {
    const card = await createPull('');
    if (card) { setData(card); setStep('card'); }
  };

  const tapCard = () => {
    setStep('revealing');
    // The reveal animation runs via CSS; we flip to reflection after the
    // flip completes (1.2s) + a short settle (0.3s).
    setTimeout(() => setStep('reflection'), 1500);
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3000, overflow:'auto',
      background: WARM_BG, color: INK,
      fontFamily: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'clamp(24px,6vw,40px) clamp(20px,5vw,32px)',
    }}>
      {/* Close affordance — small, unobtrusive, top-right. No "X" on
          step 5 so the patient feels the reflection button is the exit. */}
      {step !== 'revealing' && (
        <button onClick={onClose}
          style={{position:'absolute', top:'14px', right:'14px', background:'rgba(255,255,255,0.35)', border:'1px solid rgba(107,86,70,0.2)', borderRadius:'999px', padding:'6px 12px', fontSize:'11px', fontWeight:700, color:INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>
          {step === 'reflection' ? 'Done' : 'Close'}
        </button>
      )}

      {step === 'intention'    && <IntentionStep userName={userName} onReady={() => setStep('input')}/>}
      {step === 'input'        && <InputStep intention={intention} setIntention={setIntention} loading={loading} error={error} onSubmit={goToCard} onSkip={skipInput}/>}
      {step === 'card'         && <CardWaitingStep onTap={tapCard}/>}
      {step === 'revealing'    && <RevealingStep card={data}/>}
      {step === 'reflection'   && data && (
        <ReflectionStep
          API={API} token={token}
          card={data}
          onSaved={(updated) => setData(updated)}
          onBookMeditation={onBookMeditation}
        />
      )}
    </div>
  );
};

// ───── Step 1 · Intention setting ─────────────────────────────────────────

const IntentionStep: React.FC<{userName: string; onReady: () => void}> = ({ userName, onReady }) => (
  <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', maxWidth:'460px', textAlign:'center', padding:'40px 0'}}>
    <div style={{animation:'oracleFadeInSlow 1s ease'}}>
      <div style={{fontFamily: SERIF, fontSize:'clamp(26px,6vw,34px)', fontWeight:500, color: INK, lineHeight:1.2, letterSpacing:'-0.3px'}}>
        Your daily message from the Universe
      </div>
      <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(15px,3.8vw,17px)', color: INK_SOFT, marginTop:'14px', lineHeight:1.6}}>
        Take a breath. Set your intention. <br/>The Universe is ready to speak.
      </div>
    </div>

    {/* Breathing circle — runs indefinitely. The patient watches until ready.
        Opacity + scale move together so it reads like an actual breath. */}
    <div style={{position:'relative', width:'clamp(200px,55vw,260px)', height:'clamp(200px,55vw,260px)', margin:'clamp(40px,8vw,64px) 0 clamp(28px,6vw,40px) 0', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{position:'absolute', inset:0, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,235,200,0.7) 0%, rgba(245,194,107,0.25) 55%, transparent 80%)', animation:'oracleBreathCircle 8s ease-in-out infinite'}}/>
      <div style={{position:'absolute', inset:'18%', borderRadius:'50%', background:'rgba(255,255,255,0.25)', border:'1px solid rgba(212,168,107,0.35)', animation:'oracleBreathCircle 8s ease-in-out infinite'}}/>
      <div style={{opacity:0.4}}><ChoKuRei size={80} color={GOLD} opacity={0.85}/></div>
    </div>

    <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK_SOFT, opacity:0.9, marginBottom:'clamp(28px,6vw,40px)'}}>
      Breathe in… breathe out…
    </div>

    <button onClick={onReady}
      style={{
        background:`linear-gradient(135deg, ${GOLD_SOFT}, ${GOLD})`,
        border:'none', color:'white',
        borderRadius:'999px', padding:'14px 36px',
        fontSize:'14px', fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase',
        cursor:'pointer', fontFamily:'inherit',
        boxShadow:'0 12px 28px rgba(212,168,107,0.35)',
        animation:'oracleCtaGlow 4s ease-in-out infinite',
      }}>
      I am ready
    </button>
  </div>
);

// ───── Step 2 · Intention input ───────────────────────────────────────────

const InputStep: React.FC<{intention: string; setIntention: (v: string) => void; loading: boolean; error: string; onSubmit: () => void; onSkip: () => void}> = ({ intention, setIntention, loading, error, onSubmit, onSkip }) => (
  <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', maxWidth:'460px', width:'100%', textAlign:'center', padding:'40px 0', animation:'oracleFadeInSlow 1s ease'}}>
    <div style={{fontFamily: SERIF, fontSize:'clamp(22px,5vw,28px)', fontWeight:500, color: INK, lineHeight:1.3}}>
      What do you need guidance on today?
    </div>
    <div style={{fontSize:'12px', color: INK_SOFT, marginTop:'8px', letterSpacing:'0.3px'}}>Optional — but powerful.</div>

    <textarea
      value={intention}
      onChange={e => setIntention(e.target.value)}
      placeholder="my health, my relationships, my purpose…"
      rows={3}
      style={{
        width:'100%', marginTop:'clamp(24px,5vw,32px)',
        background:'rgba(255,255,255,0.65)',
        border:'1px solid rgba(107,86,70,0.2)',
        borderRadius:'14px',
        padding:'14px 16px',
        fontFamily: SERIF, fontStyle:'italic',
        fontSize:'15px', color: INK,
        lineHeight:1.6, resize:'vertical',
        outline:'none', boxSizing:'border-box',
        boxShadow:'inset 0 1px 2px rgba(107,86,70,0.06)',
      }}
    />

    <div style={{fontSize:'11px', color: INK_SOFT, marginTop:'10px', opacity:0.75}}>
      What you share shapes the message. It is never seen by anyone else.
    </div>

    {error && <div style={{fontSize:'12px', color:'#a85020', marginTop:'10px'}}>{error}</div>}

    <button onClick={onSubmit} disabled={loading}
      style={{
        marginTop:'clamp(28px,6vw,40px)',
        background:`linear-gradient(135deg, ${GOLD_SOFT}, ${GOLD})`,
        border:'none', color:'white',
        borderRadius:'999px', padding:'14px 36px',
        fontSize:'14px', fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase',
        cursor: loading ? 'wait' : 'pointer', fontFamily:'inherit',
        boxShadow:'0 12px 28px rgba(212,168,107,0.35)',
        opacity: loading ? 0.6 : 1,
      }}>
      {loading ? 'Drawing…' : 'Send it to the Universe'}
    </button>

    <button onClick={onSkip} disabled={loading}
      style={{marginTop:'14px', background:'transparent', border:'none', color: INK_SOFT, fontSize:'13px', fontFamily: SERIF, fontStyle:'italic', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:'4px'}}>
      Let the Universe decide
    </button>
  </div>
);

// ───── Step 3 · Card waiting (face down) ──────────────────────────────────

const CardWaitingStep: React.FC<{onTap: () => void}> = ({ onTap }) => (
  <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', maxWidth:'420px', textAlign:'center', padding:'30px 0', animation:'oracleFadeInSlow 1s ease'}}>
    <div style={{fontFamily: SERIF, fontSize:'clamp(20px,4.5vw,24px)', fontWeight:500, color: INK, marginBottom:'clamp(32px,7vw,44px)', lineHeight:1.3}}>
      Your card is waiting for you.
    </div>

    {/* Single face-down card — soft warm glow, gentle float. */}
    <button onClick={onTap}
      style={{
        position:'relative',
        width:'clamp(220px,62vw,280px)',
        height:'clamp(310px,86vw,390px)',
        border:'none', padding:0,
        background:`linear-gradient(145deg, #d4a86b 0%, #b88148 45%, #8e5d2e 100%)`,
        borderRadius:'20px',
        boxShadow:'0 22px 46px rgba(107,78,41,0.45), inset 0 0 60px rgba(255,224,168,0.25)',
        animation:'oracleSoftFloat 5s ease-in-out infinite, oracleWarmGlow 5s ease-in-out infinite',
        cursor:'pointer', fontFamily:'inherit',
        overflow:'hidden',
      }}>
      {/* Cardback pattern: soft gold lattice with centered Cho Ku Rei. */}
      <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse at center, rgba(255,234,180,0.35) 0%, transparent 70%)'}}/>
      <div style={{position:'absolute', inset:'14px', border:'1px solid rgba(255,240,210,0.45)', borderRadius:'14px'}}/>
      <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
        <ChoKuRei size={120} color="#fff1d3" opacity={0.85} glow/>
      </div>
    </button>

    <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK_SOFT, marginTop:'clamp(28px,6vw,36px)', lineHeight:1.6}}>
      When you feel ready, tap the card.
    </div>
  </div>
);

// ───── Step 4 · Gentle reveal ─────────────────────────────────────────────

const RevealingStep: React.FC<{card: OracleCardData | null}> = ({ card }) => (
  <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px 0'}}>
    <div style={{position:'relative', width:'clamp(220px,62vw,280px)', height:'clamp(310px,86vw,390px)', transformStyle:'preserve-3d', animation:'oracleCardFlip 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards'}}>
      {/* Warm golden glow spreading outward — no particles. */}
      <div style={{position:'absolute', inset:'-40px', borderRadius:'50%', background:'radial-gradient(circle, rgba(245,194,107,0.6) 0%, transparent 65%)', animation:'oracleRevealGlow 1.6s ease-out forwards'}}/>
      {/* Back face (visible at animation start) */}
      <div style={{
        position:'absolute', inset:0, backfaceVisibility:'hidden',
        background:`linear-gradient(145deg, #d4a86b, #8e5d2e)`,
        borderRadius:'20px', boxShadow:'0 22px 46px rgba(107,78,41,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <ChoKuRei size={120} color="#fff1d3" opacity={0.85} glow/>
      </div>
      {/* Front face (revealed after 180deg flip) */}
      <div style={{
        position:'absolute', inset:0, backfaceVisibility:'hidden',
        transform:'rotateY(180deg)',
        background:'linear-gradient(180deg, #fff8ec 0%, #f5e6cf 100%)',
        borderRadius:'20px',
        boxShadow:'0 22px 46px rgba(107,78,41,0.35), inset 0 0 60px rgba(255,224,168,0.3)',
        padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center',
      }}>
        {card && (
          <>
            <ChoKuRei size={50} color={GOLD} opacity={0.55}/>
            <div style={{fontFamily: SERIF, fontSize:'18px', fontWeight:600, color: INK, marginTop:'14px', lineHeight:1.3}}>{card.title}</div>
          </>
        )}
      </div>
    </div>
  </div>
);

// ───── Step 5 · Reflection ────────────────────────────────────────────────

const REFLECTION_PROMPTS = [
  'How does this land for you today?',
  'What in your life does this speak to?',
  'What is one small action this card is calling you toward?',
];

const ReflectionStep: React.FC<{API:string; token:string; card: OracleCardData; onSaved: (updated: OracleCardData) => void; onBookMeditation?: () => void}> = ({ API, token, card, onSaved, onBookMeditation }) => {
  const [reflection, setReflection] = useState(card.reflection || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(!!card.reflection);
  const [promptIdx]         = useState(() => Math.floor(Math.random() * REFLECTION_PROMPTS.length));
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  const share = async () => {
    setShareMsg(''); setSharing(true);
    const res = await shareOracleCard({
      title: card.title,
      body: card.body,
      category_label: card.category_label,
      date: new Date().toLocaleDateString(undefined, { month:'long', day:'numeric', year:'numeric' }),
    });
    setSharing(false);
    if (res.error === 'canceled') return;
    if (!res.ok) setShareMsg('Could not prepare the image. Try again in a moment.');
    else if (res.mode === 'download') setShareMsg('Saved to your downloads — share from there.');
  };

  const save = async () => {
    if (!reflection.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/oracle/today/reflect`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ reflection }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved({ ...card, reflection, saved: true });
      }
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', width:'100%', maxWidth:'500px', padding:'30px 0', animation:'oracleFadeInSlow 1s ease'}}>
      {/* Small card thumbnail at top */}
      <div style={{
        width:'96px', height:'134px',
        background:'linear-gradient(180deg, #fff8ec, #f5e6cf)',
        border:'1px solid rgba(212,168,107,0.35)', borderRadius:'14px',
        boxShadow:'0 10px 20px rgba(107,78,41,0.2)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'10px',
        marginBottom:'clamp(20px,5vw,28px)',
      }}>
        <ChoKuRei size={30} color={GOLD} opacity={0.55}/>
        <div style={{fontFamily: SERIF, fontSize:'10px', fontWeight:600, color: INK, marginTop:'6px', textAlign:'center', lineHeight:1.2}}>{card.title}</div>
      </div>

      {/* The message itself */}
      <div style={{textAlign:'center', maxWidth:'420px', marginBottom:'clamp(28px,6vw,36px)'}}>
        <div style={{fontSize:'10px', color: INK_SOFT, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px'}}>{card.category_label || card.category}</div>
        <div style={{fontFamily: SERIF, fontSize:'clamp(19px,4.5vw,23px)', fontWeight:500, color: INK, lineHeight:1.45, marginBottom:'14px'}}>{card.title}</div>
        <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(15px,3.8vw,17px)', color: INK_SOFT, lineHeight:1.7}}>
          {card.body}
        </div>
      </div>

      {/* Sit with this message */}
      <div style={{width:'100%', maxWidth:'460px', borderTop:'1px solid rgba(107,86,70,0.15)', paddingTop:'clamp(22px,5vw,28px)'}}>
        <div style={{textAlign:'center', fontFamily: SERIF, fontSize:'13px', color: INK_SOFT, letterSpacing:'1.2px', textTransform:'uppercase', fontWeight:600, marginBottom:'14px'}}>
          Sit with this message
        </div>
        <div style={{textAlign:'center', fontFamily: SERIF, fontStyle:'italic', fontSize:'16px', color: INK, lineHeight:1.5, marginBottom:'16px'}}>
          {REFLECTION_PROMPTS[promptIdx]}
        </div>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="Write what comes. There is no wrong answer."
          rows={4}
          style={{
            width:'100%', background:'rgba(255,255,255,0.7)',
            border:'1px solid rgba(107,86,70,0.2)', borderRadius:'14px',
            padding:'14px 16px',
            fontFamily: SERIF, fontSize:'15px', color: INK, lineHeight:1.6,
            resize:'vertical', outline:'none', boxSizing:'border-box',
          }}
        />
        <div style={{fontSize:'11px', color: INK_SOFT, opacity:0.7, marginTop:'6px', textAlign:'center'}}>
          Saved to your Energy Log — only you can see it.
        </div>
      </div>

      {/* Actions */}
      <div style={{width:'100%', maxWidth:'460px', display:'flex', flexDirection:'column', gap:'8px', marginTop:'clamp(24px,6vw,32px)'}}>
        <button onClick={save} disabled={!reflection.trim() || saving}
          style={{
            background: saved ? 'rgba(212,168,107,0.25)' : `linear-gradient(135deg, ${GOLD_SOFT}, ${GOLD})`,
            border:'none', color: saved ? INK : 'white',
            borderRadius:'999px', padding:'14px 20px',
            fontSize:'13px', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase',
            cursor: (!reflection.trim() || saving) ? 'default' : 'pointer', fontFamily:'inherit',
            boxShadow: saved ? 'none' : '0 10px 22px rgba(212,168,107,0.3)',
            opacity: (!reflection.trim() || saving) ? 0.5 : 1,
          }}>
          {saved ? '✓ Reflection saved' : saving ? 'Saving…' : 'Save reflection'}
        </button>
        {onBookMeditation && (
          <button onClick={onBookMeditation}
            style={{background:'rgba(255,255,255,0.55)', border:'1px solid rgba(107,86,70,0.2)', color: INK, borderRadius:'999px', padding:'12px 20px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit'}}>
            Book a meditation session
          </button>
        )}
        <button onClick={share} disabled={sharing}
          style={{background:'transparent', border:'none', color: INK_SOFT, fontSize:'12px', fontFamily: SERIF, fontStyle:'italic', cursor: sharing ? 'wait' : 'pointer', marginTop:'4px', textDecoration:'underline', textUnderlineOffset:'3px', opacity: sharing ? 0.6 : 1}}>
          {sharing ? 'Preparing image…' : 'Share this message'}
        </button>
        {shareMsg && <div style={{fontSize:'11px', color: INK_SOFT, opacity:0.8, textAlign:'center', marginTop:'6px'}}>{shareMsg}</div>}
      </div>

      <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'12px', color: INK_SOFT, opacity:0.7, marginTop:'clamp(20px,5vw,28px)', textAlign:'center', maxWidth:'380px', lineHeight:1.6}}>
        There are no accidents in what you received today. Carry it with you.
      </div>
    </div>
  );
};

export default OracleCard;
