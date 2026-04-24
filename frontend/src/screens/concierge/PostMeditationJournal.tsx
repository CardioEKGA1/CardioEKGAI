// © 2026 SoulMD, LLC. All rights reserved.
// Post-meditation journal — three soft cards (mood shift / reflection /
// intention) shown after a patient completes a meditation. Saves to the
// patient's energy log. Also reachable from /concierge/journal/new and
// from the Energy Log "Add reflection" button.
import React, { useRef, useState } from 'react';
import DictationButton from '../../DictationButton';

interface Props {
  API: string;
  token: string;
  meditationId?: number | null;
  meditationTitle?: string;
  onClose: () => void;
  onSaved?: () => void;
}

// Pearl + lavender palette — matches PatientApp.
const BG_GRADIENT = 'linear-gradient(135deg, #E0F4FA 0%, #efe6f8 55%, #f5d8e6 100%)';
const DEEPP    = '#6b4e7c';
const PURPLE   = '#9b8fe8';
const TEXT     = '#2a4a6a';
const SUBTLE   = '#7090a0';
const GOLD     = '#d4a86b';
const CARD_BG  = 'rgba(255,255,255,0.78)';
const CARD_BORDER = '0.5px solid rgba(180,210,230,0.55)';
const SERIF    = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

const MOOD_OPTIONS: {id: string; label: string}[] = [
  { id: 'much_better',     label: 'Much better' },
  { id: 'a_little_better', label: 'A little better' },
  { id: 'same',            label: 'About the same' },
  { id: 'processing',      label: 'Still processing' },
];

const PostMeditationJournal: React.FC<Props> = ({ API, token, meditationId, meditationTitle, onClose, onSaved }) => {
  const [mood, setMood] = useState<string>('');
  const [reflection, setReflection] = useState('');
  const [intention, setIntention] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const reflectionRef = useRef<HTMLTextAreaElement | null>(null);
  const intentionRef  = useRef<HTMLTextAreaElement | null>(null);

  const dictateInto = (setter: (v: string) => void, current: string) => (chunk: string) => {
    setter((current + (current && !current.endsWith(' ') ? ' ' : '') + chunk).trimStart());
  };

  const save = async () => {
    if (saving) return;
    setError('');
    if (!mood && !reflection.trim() && !intention.trim()) {
      setError('Add at least one answer before saving.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/me/journal`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          meditation_id: meditationId || undefined,
          mood_shift: mood || undefined,
          reflection: reflection.trim() || undefined,
          intention:  intention.trim()  || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not save reflection.');
      setSavedAt(Date.now());
      onSaved && onSaved();
      // Hold the confirmation a beat so the patient sees it land before we
      // unmount the overlay. 1.6s feels intentional but not slow.
      setTimeout(() => onClose(), 1600);
    } catch (e: any) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3500, overflow:'auto',
      background: BG_GRADIENT, color: TEXT,
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(20px,5vw,36px) clamp(16px,5vw,28px) calc(40px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{maxWidth:'520px', margin:'0 auto'}}>
        {/* Top bar — quiet exit affordance, no gold border on the back chip. */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px'}}>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(107,78,124,0.15)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:DEEPP, cursor:'pointer', fontFamily:'inherit'}}>
            ← Close
          </button>
          {meditationTitle && (
            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color:SUBTLE, fontWeight:700, maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {meditationTitle}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <div style={{width:'48px', height:'2px', borderRadius:'2px', background:`linear-gradient(90deg, ${GOLD}, ${PURPLE})`, margin:'0 auto 16px'}}/>
          <div style={{fontFamily:SERIF, fontSize:'clamp(26px,6vw,32px)', fontWeight:600, color:TEXT, lineHeight:1.2, letterSpacing:'-0.3px'}}>
            After your meditation
          </div>
          <div style={{fontFamily:SERIF, fontStyle:'italic', fontSize:'14px', color:SUBTLE, marginTop:'8px'}}>
            A quiet moment to reflect.
          </div>
        </div>

        {/* Question 1 — mood shift pills */}
        <Card label="01" question="How do you feel right now, compared to before?">
          <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'12px'}}>
            {MOOD_OPTIONS.map(opt => {
              const active = mood === opt.id;
              return (
                <button key={opt.id} type="button" onClick={() => setMood(active ? '' : opt.id)}
                  style={{
                    flex:'1 1 calc(50% - 4px)', minWidth:'130px',
                    padding:'10px 14px', borderRadius:'14px',
                    border: active ? `1px solid ${PURPLE}` : '1px solid rgba(155,143,232,0.25)',
                    background: active ? 'linear-gradient(135deg, rgba(155,143,232,0.22), rgba(155,143,232,0.10))' : 'rgba(255,255,255,0.6)',
                    color: active ? DEEPP : TEXT,
                    fontSize:'13px', fontWeight: active ? 800 : 600,
                    cursor:'pointer', fontFamily:'inherit',
                    transition:'background 180ms ease, border 180ms ease',
                    boxShadow: active ? '0 4px 12px rgba(155,143,232,0.18)' : 'none',
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Question 2 — free text */}
        <Card label="02" question="What came up for you during the meditation?">
          <DictateField
            value={reflection}
            onChange={setReflection}
            onTranscript={dictateInto(setReflection, reflection)}
            placeholder="A thought, a feeling, an image — anything that surfaced…"
            inputRef={reflectionRef}
          />
        </Card>

        {/* Question 3 — intention */}
        <Card label="03" question="What is one intention you want to carry into the rest of your day?">
          <DictateField
            value={intention}
            onChange={setIntention}
            onTranscript={dictateInto(setIntention, intention)}
            placeholder="I intend to…"
            inputRef={intentionRef}
            minHeight={92}
          />
        </Card>

        {error && (
          <div style={{background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', padding:'10px 14px', color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>
            {error}
          </div>
        )}

        {savedAt ? (
          <div style={{textAlign:'center', padding:'14px 16px', background:'rgba(155,143,232,0.10)', border:`1px solid ${PURPLE}55`, borderRadius:'14px', color:DEEPP, fontWeight:800, fontSize:'13px', letterSpacing:'0.4px'}}>
            Saved to your energy log ✓
          </div>
        ) : (
          <button onClick={save} disabled={saving}
            style={{
              width:'100%', padding:'14px 18px', borderRadius:'14px',
              border:'none', cursor: saving ? 'wait' : 'pointer',
              background: `linear-gradient(135deg, ${PURPLE}, ${DEEPP})`,
              color:'white', fontSize:'14px', fontWeight:800,
              letterSpacing:'0.5px', fontFamily:'inherit',
              boxShadow:'0 12px 28px rgba(107,78,124,0.22)',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Saving…' : 'Save to my journal'}
          </button>
        )}

        <div style={{textAlign:'center', fontFamily:SERIF, fontStyle:'italic', fontSize:'11px', color:SUBTLE, opacity:0.75, marginTop:'18px'}}>
          Only you and Dr. Anderson can see this reflection.
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{label: string; question: string; children: React.ReactNode}> = ({ label, question, children }) => (
  <div style={{
    background: CARD_BG, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
    border: CARD_BORDER, borderRadius:'20px',
    padding:'18px 18px 20px', marginBottom:'14px',
    boxShadow:'0 8px 22px rgba(107,78,124,0.10)',
  }}>
    <div style={{display:'flex', alignItems:'baseline', gap:'10px', marginBottom:'4px'}}>
      <span style={{fontFamily:SERIF, fontStyle:'italic', fontSize:'12px', color:GOLD, letterSpacing:'1px'}}>
        {label}
      </span>
      <div style={{fontFamily:SERIF, fontSize:'17px', fontWeight:600, color:TEXT, lineHeight:1.35}}>
        {question}
      </div>
    </div>
    {children}
  </div>
);

const DictateField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onTranscript: (chunk: string) => void;
  placeholder: string;
  minHeight?: number;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ value, onChange, onTranscript, placeholder, minHeight = 110, inputRef }) => (
  <div style={{position:'relative', marginTop:'12px'}}>
    <textarea
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width:'100%', minHeight:`${minHeight}px`,
        padding:'14px 56px 14px 14px',
        borderRadius:'14px',
        border:'1px solid rgba(180,210,230,0.6)',
        background:'rgba(255,255,255,0.6)',
        color:TEXT, fontSize:'14px', lineHeight:1.6,
        fontFamily:'inherit', resize:'vertical', outline:'none',
        boxSizing:'border-box',
      }}
    />
    <div style={{position:'absolute', right:10, bottom:10}}>
      <DictationButton accent="purple" size={36} fallbackWhenUnsupported onTranscript={onTranscript}/>
    </div>
  </div>
);

export default PostMeditationJournal;
