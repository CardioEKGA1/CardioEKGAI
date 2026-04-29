// © 2026 SoulMD, LLC. All rights reserved.
//
// Slide-in panel that drafts a monthly wellness-review email for the
// selected concierge patient. Backend assembles 30-90 days of signal
// (energy log, post-meditation diary, oracle reflections, labs, secure-
// message subjects, upcoming appointments, visit usage) and hands it to
// Claude with Dr. Anderson's voice baked into the system prompt. The
// physician edits the draft inline and either copies it or sends it
// straight into the existing concierge secure-message thread.
//
// Every backend call writes a hipaa_audit_log row
// (action='DRAFT_MONTHLY_REVIEW', resource_type='patient_record').
import React, { useCallback, useEffect, useState } from 'react';

interface Props {
  API: string;
  token: string;
  patientId: number;
  patientName: string;       // for the loading copy
  accent: string;
  onClose: () => void;
}

interface DraftPayload {
  subject: string;
  body: string;
  patient_first_name: string;
}

const NAVY      = '#1a2a4a';
const NAVY_DEEP = '#0f1a30';
const INK_SOFT  = '#6B6889';
const GOLD      = '#C9A84C';
const GOLD_DEEP = '#A88830';
const GOLD_SOFT = 'rgba(201,168,76,0.16)';
const PEARL     = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)';
const SERIF     = 'Georgia, "Cormorant Garamond", "Playfair Display", "Times New Roman", serif';
const CARD_BORDER = '0.5px solid rgba(83,74,183,0.14)';

// Inject the slide-in keyframe + the draft pulse once.
if (typeof document !== 'undefined' && !document.getElementById('__mwr_keyframes')) {
  const s = document.createElement('style');
  s.id = '__mwr_keyframes';
  s.textContent = `
    @keyframes mwrSlideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes mwrPulse        { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
    @keyframes mwrShimmer      { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  `;
  document.head.appendChild(s);
}

const MonthlyReviewDraft: React.FC<Props> = ({ API, token, patientId, patientName, accent, onClose }) => {
  const firstName = (patientName || '').trim().split(/\s+/)[0] || 'patient';
  const [phase, setPhase] = useState<'gather' | 'draft' | 'ready' | 'error'>('gather');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [err, setErr] = useState<string>('');
  // Send + copy state.
  const [sending, setSending] = useState(false);
  const [sentTickAt, setSentTickAt] = useState<number | null>(null);
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  // Stage the loading copy through "gather" → "draft" so the doctor
  // sees we're doing real work even if the API call lands in <2s.
  const generate = useCallback(async () => {
    setPhase('gather'); setErr('');
    setSubject(''); setBody('');
    // After a beat, swap copy to indicate Claude is composing.
    const stageTimer = window.setTimeout(() => {
      setPhase(prev => prev === 'gather' ? 'draft' : prev);
    }, 800);
    try {
      const res = await fetch(`${API}/concierge/physician/patients/${patientId}/draft-review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let parsed: any = null;
      try { parsed = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) {
        const detail = parsed?.detail || text || `Generation failed (${res.status})`;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      const d = parsed as DraftPayload;
      setSubject(d.subject || '');
      setBody(d.body || '');
      setPhase('ready');
    } catch (e: any) {
      setErr(e.message || 'Could not draft the review.');
      setPhase('error');
    } finally {
      window.clearTimeout(stageTimer);
    }
  }, [API, token, patientId]);

  useEffect(() => { generate(); }, [generate]);

  // Lock background scroll while the panel is open (matches the billing
  // detail panel pattern).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const copyDraft = async () => {
    const payload = `${subject}\n\n${body}`.trim();
    if (!payload) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload);
      else {
        const ta = document.createElement('textarea');
        ta.value = payload; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
      }
      setCopiedAt(Date.now());
      window.setTimeout(() => setCopiedAt(null), 1800);
    } catch { /* clipboard denial is benign */ }
  };

  const sendSecure = async () => {
    if (sending) return;
    setSending(true); setErr('');
    try {
      const res = await fetch(`${API}/concierge/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patient_id: patientId,
          subject: subject.trim() || `Your Monthly Wellness Review`,
          body: body.trim(),
          category: 'medical',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || `Send failed (${res.status})`);
      setSentTickAt(Date.now());
      window.setTimeout(() => onClose(), 1500);
    } catch (e: any) {
      setErr(e.message || 'Could not send the review.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:2000,
      background:'rgba(31,27,58,0.45)', backdropFilter:'blur(4px)',
      display:'flex', justifyContent:'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'min(100%, 620px)', height:'100%',
        background: PEARL, color: NAVY,
        overflowY:'auto',
        boxShadow:'-20px 0 60px rgba(31,27,58,0.25)',
        animation:'mwrSlideInRight 280ms ease',
        display:'flex', flexDirection:'column',
      }}>
        {/* Top bar */}
        <div style={{
          position:'sticky', top:0, zIndex:5,
          background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)',
          borderBottom:'0.5px solid rgba(83,74,183,0.12)',
          padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px',
        }}>
          <div>
            <div style={{fontSize:'10px', letterSpacing:'1.6px', textTransform:'uppercase', color: GOLD_DEEP, fontWeight:800}}>
              ✦ Monthly Wellness Review
            </div>
            <div style={{fontFamily: SERIF, fontSize:'17px', fontWeight:600, color: NAVY, marginTop:'2px', letterSpacing:'-0.2px'}}>
              Drafted by AI for {firstName}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:'transparent', border:'0.5px solid rgba(83,74,183,0.20)', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:700, color: INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>
            Close ✕
          </button>
        </div>

        {/* Body */}
        <div style={{flex:1, padding:'20px', display:'flex', flexDirection:'column', gap:'14px'}}>

          {(phase === 'gather' || phase === 'draft') && (
            <LoadingPanel firstName={firstName} phase={phase}/>
          )}

          {phase === 'error' && (
            <div style={{padding:'16px 18px', borderRadius:'14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', color:'#a02020', fontSize:'13px'}}>
              {err}
              <div style={{marginTop:'10px'}}>
                <button onClick={generate}
                  style={{background: GOLD, color:'white', border:'none', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px'}}>
                  Retry
                </button>
              </div>
            </div>
          )}

          {phase === 'ready' && (
            <>
              {/* Subject */}
              <div style={{background:'#FFFFFF', border: CARD_BORDER, borderRadius:'14px', padding:'14px 16px', boxShadow:'0 4px 14px rgba(83,74,183,0.06)'}}>
                <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'6px'}}>Subject</div>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{
                    width:'100%', padding:'10px 12px', borderRadius:'10px',
                    border:'0.5px solid rgba(83,74,183,0.20)',
                    background:'#FAFAFE', color: NAVY, fontSize:'14px', fontWeight:600,
                    fontFamily:'inherit', outline:'none', boxSizing:'border-box',
                  }}
                />
              </div>

              {/* Body — Georgia serif preview */}
              <div style={{background:'#FFFFFF', border: CARD_BORDER, borderRadius:'14px', padding:'14px 16px', boxShadow:'0 4px 14px rgba(83,74,183,0.06)', display:'flex', flexDirection:'column', flex:1, minHeight:'420px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px'}}>
                  <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800}}>Email body</div>
                  <div style={{fontSize:'10px', color: INK_SOFT, fontStyle:'italic'}}>Editable</div>
                </div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  spellCheck
                  style={{
                    flex:1, minHeight:'420px',
                    padding:'18px 20px',
                    borderRadius:'10px',
                    border:'0.5px solid rgba(83,74,183,0.18)',
                    background:'#FFFEFA',
                    color: NAVY,
                    fontFamily: SERIF,
                    fontSize:'14.5px', lineHeight:1.75,
                    resize:'vertical', outline:'none',
                    boxSizing:'border-box', whiteSpace:'pre-wrap',
                  }}
                />
              </div>

              {err && (
                <div style={{padding:'10px 14px', borderRadius:'12px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', color:'#a02020', fontSize:'12px'}}>
                  {err}
                </div>
              )}

              {/* Action row */}
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                <button onClick={generate}
                  style={{flex:'0 0 auto', padding:'12px 16px', borderRadius:'12px', background:'#FFFFFF', border:'0.5px solid rgba(83,74,183,0.25)', color: NAVY, fontSize:'12px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px'}}>
                  ↻ Regenerate
                </button>
                <button onClick={copyDraft}
                  style={{flex:1, padding:'12px 16px', borderRadius:'12px', background: copiedAt ? GOLD_DEEP : '#FFFFFF', color: copiedAt ? 'white' : NAVY, border:'0.5px solid rgba(83,74,183,0.25)', fontSize:'12.5px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px'}}>
                  {copiedAt ? '✓ Copied' : 'Copy to Clipboard'}
                </button>
                <button onClick={sendSecure} disabled={sending || !body.trim()}
                  style={{
                    flex:1, padding:'12px 16px', borderRadius:'12px',
                    background: sentTickAt ? GOLD_DEEP : GOLD,
                    color:'white', border:'none',
                    fontSize:'12.5px', fontWeight:800, cursor: (sending || !body.trim()) ? 'wait' : 'pointer',
                    fontFamily:'inherit', letterSpacing:'0.4px',
                    boxShadow:'0 8px 18px rgba(201,168,76,0.30)',
                    opacity: (sending || !body.trim()) ? 0.7 : 1,
                  }}>
                  {sentTickAt ? 'Sent ✓' : sending ? 'Sending…' : 'Send via Secure Message →'}
                </button>
              </div>

              <div style={{fontSize:'11px', color: INK_SOFT, fontStyle:'italic', textAlign:'center', padding:'4px 8px'}}>
                Edits stay private until you send. Send routes through the existing concierge secure-message thread for {firstName}.
              </div>
            </>
          )}
        </div>
      </div>
      {/* Suppress unused-token warning while keeping NAVY_DEEP available
          for future tuning. */}
      <span style={{display:'none'}} aria-hidden>{NAVY_DEEP}{accent}</span>
    </div>
  );
};

const LoadingPanel: React.FC<{firstName: string; phase: 'gather' | 'draft'}> = ({ firstName, phase }) => (
  <div style={{padding:'60px 20px', background:'#FFFFFF', border: CARD_BORDER, borderRadius:'16px', textAlign:'center', boxShadow:'0 4px 18px rgba(83,74,183,0.06)'}}>
    <div style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'72px', height:'72px', borderRadius:'50%',
      background:`linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`,
      color:'white', fontSize:'30px', fontWeight:800,
      marginBottom:'18px',
      animation:'mwrPulse 1.6s ease-in-out infinite',
      boxShadow:'0 12px 28px rgba(201,168,76,0.28)',
    }}>✦</div>
    <div style={{fontFamily: SERIF, fontSize:'19px', fontWeight:600, color: NAVY, marginBottom:'4px'}}>
      {phase === 'gather'
        ? `Gathering ${firstName}'s wellness data…`
        : `Drafting your review…`}
    </div>
    <div style={{fontSize:'12px', color: INK_SOFT}}>
      {phase === 'gather'
        ? 'Energy log · diary · oracle · labs · messages'
        : 'Claude is composing in your voice'}
    </div>
    <div style={{
      height:'4px', borderRadius:'4px', marginTop:'20px', maxWidth:'240px', margin:'20px auto 0',
      background:`linear-gradient(90deg, ${GOLD_SOFT} 25%, ${GOLD} 50%, ${GOLD_SOFT} 75%)`,
      backgroundSize:'200% 100%',
      animation:'mwrShimmer 1.8s linear infinite',
    }}/>
  </div>
);

export default MonthlyReviewDraft;
