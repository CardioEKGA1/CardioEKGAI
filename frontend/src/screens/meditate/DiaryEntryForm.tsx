// © 2026 SoulMD, LLC. All rights reserved.
// Diary entry form for /meditate. Triggered after Mark Complete in the
// player (with meditation_id + title prefilled) OR from the Diary tab's
// "+ Entry" button (standalone — meditation_id null). Mood-before/after
// 5-emoji scales + 4 dictation-aware textareas + save → confirmation.
import React, { useEffect, useState } from 'react';
import DictationButton from '../../DictationButton';
import { MEDITATE_TOKENS as T } from './MeditateApp';

interface Props {
  API: string;
  token: string;
  meditationId: number | null;
  meditationTitle: string;
  onClose: () => void;
  onSaved: () => void;
  onPullOracle: () => void;
  onReturnLibrary: () => void;
}

const MOOD_OPTIONS: { score: number; emoji: string; label: string }[] = [
  { score: 1, emoji: '😔', label: 'Heavy' },
  { score: 2, emoji: '😐', label: 'Flat' },
  { score: 3, emoji: '🙂', label: 'Steady' },
  { score: 4, emoji: '😊', label: 'Open' },
  { score: 5, emoji: '✨', label: 'Radiant' },
];

const DiaryEntryForm: React.FC<Props> = ({ API, token, meditationId, meditationTitle, onClose, onSaved, onPullOracle, onReturnLibrary }) => {
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [body, setBody] = useState<string>('');
  const [emotions, setEmotions] = useState<string>('');
  const [visions, setVisions] = useState<string>('');
  const [reflection, setReflection] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);

  // Pick up any in-session notes the player stashed under
  // sessionStorage["meditate_session_notes"] so the user doesn't lose
  // them. Mount-only on purpose; depending on `reflection` would loop.
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('meditate_session_notes');
      if (cached) setReflection(prev => prev || cached);
      sessionStorage.removeItem('meditate_session_notes');
    } catch {}
  }, []);

  const save = async () => {
    if (saving) return;
    setErr('');
    if (!body.trim() && !emotions.trim() && !visions.trim() && !reflection.trim() && !moodBefore && !moodAfter) {
      setErr('Add at least one field before saving.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/meditate/diary`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          meditation_id: meditationId,
          meditation_title: meditationTitle || undefined,
          body_sensations: body.trim() || undefined,
          emotions_felt: emotions.trim() || undefined,
          visions_or_insights: visions.trim() || undefined,
          general_reflection: reflection.trim() || undefined,
          mood_before: moodBefore,
          mood_after: moodAfter,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not save entry.');
      setConfirmed(true);
    } catch (e: any) {
      setErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirmation screen ────────────────────────────────────────────
  if (confirmed) {
    return (
      <div style={{
        position:'fixed', inset:0, zIndex:3600, overflow:'auto',
        background: T.bg, color: T.ink,
        fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
        padding:'clamp(20px,5vw,36px) clamp(16px,5vw,28px) calc(40px + env(safe-area-inset-bottom, 0px))',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{maxWidth:'460px', textAlign:'center'}}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'84px', height:'84px', borderRadius:'50%',
            background: `linear-gradient(135deg, ${T.gold}, #a8842c)`,
            color:'white', fontSize:'40px', fontWeight:800,
            marginBottom:'18px',
            boxShadow:'0 14px 32px rgba(201,168,76,0.3)',
          }}>
            ✓
          </div>
          <div style={{fontFamily: T.serif, fontSize:'26px', fontWeight:600, color: T.navy, lineHeight:1.2, letterSpacing:'-0.3px', marginBottom:'8px'}}>
            Saved to your diary
          </div>
          <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'14px', color: T.inkSoft, lineHeight:1.65, marginBottom:'24px'}}>
            What you noticed today is already changing tomorrow. Return when you are ready.
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'8px', alignItems:'stretch'}}>
            <button onClick={() => { onSaved(); }}
              style={{
                padding:'14px',
                background: `linear-gradient(135deg, ${T.purple}, ${T.navy})`,
                color:'white', border:'none', borderRadius:'14px',
                fontSize:'13px', fontWeight:800, cursor:'pointer',
                fontFamily:'inherit', letterSpacing:'0.4px',
              }}>
              View my diary
            </button>
            <button onClick={onReturnLibrary}
              style={{
                padding:'12px',
                background:'rgba(255,255,255,0.78)', color: T.navy,
                border:`0.5px solid ${T.border}`, borderRadius:'12px',
                fontSize:'12px', fontWeight:700, cursor:'pointer',
                fontFamily:'inherit', letterSpacing:'0.3px',
              }}>
              Return to library
            </button>
            <button onClick={onPullOracle}
              style={{
                padding:'12px',
                background:'rgba(255,255,255,0.78)', color: T.gold,
                border:`0.5px solid ${T.gold}55`, borderRadius:'12px',
                fontSize:'12px', fontWeight:800, cursor:'pointer',
                fontFamily:'inherit', letterSpacing:'0.4px',
              }}>
              ✦ Pull Oracle Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3600, overflow:'auto',
      background: T.bg, color: T.ink,
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(20px,5vw,36px) clamp(16px,5vw,28px) calc(40px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{maxWidth:'520px', margin:'0 auto'}}>
        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.78)', border:`0.5px solid ${T.border}`, borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color: T.purple, cursor:'pointer', fontFamily:'inherit'}}>
            ← Close
          </button>
          {meditationTitle && (
            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.inkSoft, fontWeight:700, maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {meditationTitle}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{textAlign:'center', marginBottom:'18px'}}>
          <div style={{width:'48px', height:'2px', borderRadius:'2px', background:`linear-gradient(90deg, ${T.gold}, ${T.purple})`, margin:'0 auto 12px'}}/>
          <div style={{fontFamily: T.serif, fontSize:'clamp(24px,6vw,30px)', fontWeight:600, color: T.navy, letterSpacing:'-0.3px', lineHeight:1.2}}>
            Your Meditation Experience
          </div>
          <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.inkSoft, marginTop:'6px'}}>
            Capture what arose, gently and without filter.
          </div>
        </div>

        {/* Mood before/after */}
        <Card>
          <Label>How did you feel before?</Label>
          <MoodScale value={moodBefore} onChange={setMoodBefore}/>
          <div style={{height:'10px'}}/>
          <Label>How do you feel now?</Label>
          <MoodScale value={moodAfter} onChange={setMoodAfter}/>
        </Card>

        <DictateField
          label="What did you feel in your body?"
          placeholder="Warmth, tightness, breath, current — anything physical that arose."
          value={body} onChange={setBody}
        />
        <DictateField
          label="What emotions moved through you?"
          placeholder="Even subtle waves count — name what you can."
          value={emotions} onChange={setEmotions}
        />
        <DictateField
          label="Any visions, symbols, or insights?"
          placeholder="Images, words, or knowings that surfaced."
          value={visions} onChange={setVisions}
        />
        <DictateField
          label="General reflection or message received"
          placeholder="What does today's practice want you to remember?"
          value={reflection} onChange={setReflection}
        />

        {err && (
          <div style={{padding:'10px 14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>
            {err}
          </div>
        )}

        <button onClick={save} disabled={saving}
          style={{
            width:'100%', padding:'14px',
            background: `linear-gradient(135deg, ${T.purple}, ${T.navy})`,
            color:'white', border:'none', borderRadius:'14px',
            fontSize:'14px', fontWeight:800, cursor: saving ? 'wait' : 'pointer',
            fontFamily:'inherit', letterSpacing:'0.5px',
            boxShadow:'0 12px 28px rgba(83,74,183,0.22)',
            opacity: saving ? 0.7 : 1,
          }}>
          {saving ? 'Saving…' : 'Save entry'}
        </button>

        <div style={{textAlign:'center', fontFamily: T.serif, fontStyle:'italic', fontSize:'11px', color: T.inkSoft, opacity:0.75, marginTop:'18px'}}>
          Only you can see this entry.
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div style={{
    background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
    padding:'16px', marginBottom:'12px',
    boxShadow:'0 6px 18px rgba(83,74,183,0.08)',
  }}>{children}</div>
);

const Label: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div style={{fontFamily: T.serif, fontSize:'14px', fontWeight:600, color: T.navy, marginBottom:'8px'}}>
    {children}
  </div>
);

const MoodScale: React.FC<{value: number | null; onChange: (n: number) => void}> = ({ value, onChange }) => (
  <div style={{display:'flex', gap:'6px', justifyContent:'space-between'}}>
    {MOOD_OPTIONS.map(o => {
      const active = value === o.score;
      return (
        <button key={o.score} onClick={() => onChange(o.score)} type="button"
          style={{
            flex:1, padding:'8px 4px', borderRadius:'12px',
            background: active ? `linear-gradient(135deg, rgba(155,143,232,0.22), rgba(155,143,232,0.08))` : 'rgba(255,255,255,0.6)',
            border: active ? `1px solid ${T.purple}` : `0.5px solid ${T.border}`,
            cursor:'pointer', fontFamily:'inherit',
            display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
          }}>
          <span style={{fontSize:'20px'}}>{o.emoji}</span>
          <span style={{fontSize:'9px', color: active ? T.purple : T.inkSoft, fontWeight: active ? 800 : 600, letterSpacing:'0.3px'}}>{o.label}</span>
        </button>
      );
    })}
  </div>
);

const DictateField: React.FC<{label: string; placeholder: string; value: string; onChange: (v: string) => void}> = ({ label, placeholder, value, onChange }) => (
  <div style={{
    background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
    padding:'14px 16px', marginBottom:'12px',
    boxShadow:'0 6px 18px rgba(83,74,183,0.08)',
  }}>
    <Label>{label}</Label>
    <div style={{position:'relative'}}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', minHeight:'90px',
          padding:'12px 56px 12px 14px',
          borderRadius:'12px',
          border:'1px solid rgba(180,210,230,0.6)',
          background:'rgba(255,255,255,0.6)',
          color: T.ink, fontSize:'13.5px', lineHeight:1.6,
          fontFamily:'inherit', resize:'vertical', outline:'none',
          boxSizing:'border-box',
        }}
      />
      <div style={{position:'absolute', right:10, bottom:10}}>
        <DictationButton
          accent="purple" size={34} fallbackWhenUnsupported
          onTranscript={(chunk) => onChange((value + (value && !value.endsWith(' ') ? ' ' : '') + chunk).trimStart())}
        />
      </div>
    </div>
  </div>
);

export default DiaryEntryForm;
