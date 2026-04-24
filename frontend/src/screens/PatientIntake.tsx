// © 2026 SoulMD, LLC. All rights reserved.
// Step 3 of 3 in the /patient onboarding flow. Intake form — shown once,
// then never again. On submit, the backend saves the row and emails
// Dr. Anderson with a summary so she can review and approve.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { PATIENT_BG, NAVY, PURPLE, PURPLE_SOFT, GOLD, SERIF, SparkleLayer, ProgressIndicator } from './patient/shared';

interface Props {
  API: string;
  token: string;
  onComplete: () => void;
  onSignInRequired: () => void;
}

const SUPPORT_OPTIONS = [
  'Medical care',
  'Life coaching',
  'Spiritual wellness',
  'Integrative health',
  'Meditation guidance',
  'Habit building',
  'All of the above',
];

const TIERS: { id: string; label: string; price: string }[] = [
  { id: 'awaken',   label: 'Awaken', price: '$444/mo'   },
  { id: 'align',    label: 'Align',  price: '$888/mo'   },
  { id: 'ascend',   label: 'Ascend', price: '$1,111/mo' },
  { id: 'not_sure', label: 'Not sure yet', price: '' },
];

const INPUT_BASE: React.CSSProperties = {
  width:'100%', padding:'12px 14px', borderRadius:'12px',
  border:'1px solid rgba(83,74,183,0.18)',
  background:'rgba(255,255,255,0.9)',
  fontSize:'14px', color: NAVY, outline:'none', boxSizing:'border-box',
  fontFamily:'inherit',
};

const LABEL: React.CSSProperties = {
  display:'block', fontSize:'12px', letterSpacing:'0.3px',
  fontWeight:700, color: NAVY, marginBottom:'6px',
};

const PatientIntake: React.FC<Props> = ({ API, token, onComplete, onSignInRequired }) => {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [goals, setGoals] = useState('');
  const [supports, setSupports] = useState<string[]>([]);
  const [tier, setTier] = useState<string>('');
  const [referral, setReferral] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) onSignInRequired();
  }, [token, onSignInRequired]);

  const toggleSupport = (opt: string) => {
    setSupports(prev => {
      // "All of the above" is mutually exclusive with the other options.
      if (opt === 'All of the above') {
        return prev.includes(opt) ? [] : ['All of the above'];
      }
      const next = prev.filter(x => x !== 'All of the above');
      return next.includes(opt) ? next.filter(x => x !== opt) : [...next, opt];
    });
  };

  const canSubmit = !!fullName.trim() && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/concierge/patient/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: fullName.trim(),
          date_of_birth: dob || null,
          phone: phone.trim() || null,
          reason_for_visit: reason.trim() || null,
          health_goals: goals.trim() || null,
          support_areas: supports,
          preferred_tier: tier || null,
          referral_source: referral.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not submit your intake.');
      onComplete();
    } catch (e: any) {
      setError(e.message || 'Could not submit your intake.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh', background: PATIENT_BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', position:'relative', overflow:'hidden'}}>
      <SparkleLayer count={18}/>

      <main style={{position:'relative', zIndex:1, maxWidth:'640px', margin:'0 auto', padding:'28px 18px 40px', display:'flex', flexDirection:'column', alignItems:'center'}}>
        <SoulMDLogo size={44} showText={false}/>
        <div style={{marginTop:'18px', width:'100%', display:'flex', justifyContent:'center'}}>
          <ProgressIndicator step={3}/>
        </div>

        <div style={{fontFamily: SERIF, fontSize:'clamp(26px,6vw,34px)', fontWeight:600, color: NAVY, marginTop:'14px', textAlign:'center', lineHeight:1.15}}>
          Tell Us About You
        </div>
        <div style={{fontSize:'13px', color: PURPLE_SOFT, marginTop:'8px', textAlign:'center', lineHeight:1.6, maxWidth:'500px'}}>
          Help Dr. Anderson get to know you before your first visit.
        </div>

        <div style={{marginTop:'24px', width:'100%', background:'rgba(255,255,255,0.92)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:'22px', padding:'24px 22px', boxShadow:'0 18px 36px rgba(83,74,183,0.1)', border:'0.5px solid rgba(255,255,255,0.95)'}}>

          {/* Basic info */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'16px'}}>
            <div>
              <label style={LABEL}>Full name</label>
              <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full legal name" style={INPUT_BASE}/>
            </div>
            <div>
              <label style={LABEL}>Date of birth</label>
              <input type="date" value={dob} onChange={e=>setDob(e.target.value)} style={INPUT_BASE}/>
            </div>
            <div style={{gridColumn:'1 / -1'}}>
              <label style={LABEL}>Phone number</label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 555-5555" style={INPUT_BASE}/>
            </div>
          </div>

          {/* Narrative fields */}
          <div style={{marginBottom:'16px'}}>
            <label style={LABEL}>What brought you to SoulMD Concierge?</label>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="A few sentences is plenty." style={{...INPUT_BASE, minHeight:'80px', resize:'vertical'}}/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={LABEL}>What are your main health goals?</label>
            <textarea value={goals} onChange={e=>setGoals(e.target.value)} placeholder="Physical, emotional, spiritual — any or all." style={{...INPUT_BASE, minHeight:'80px', resize:'vertical'}}/>
          </div>

          {/* Support areas */}
          <div style={{marginBottom:'16px'}}>
            <label style={LABEL}>What would you like support with?</label>
            <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
              {SUPPORT_OPTIONS.map(opt => {
                const on = supports.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleSupport(opt)}
                    style={{
                      background: on ? PURPLE : 'rgba(255,255,255,0.8)',
                      color: on ? 'white' : NAVY,
                      border: on ? `1px solid ${PURPLE}` : `1px solid rgba(83,74,183,0.2)`,
                      borderRadius:'999px', padding:'8px 14px', fontSize:'12.5px', fontWeight:700,
                      cursor:'pointer', fontFamily:'inherit',
                    }}
                  >
                    {on && <span style={{marginRight:'6px'}}>✓</span>}{opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred tier */}
          <div style={{marginBottom:'16px'}}>
            <label style={LABEL}>Preferred membership tier</label>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'8px'}}>
              {TIERS.map(t => {
                const on = tier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(on ? '' : t.id)}
                    style={{
                      background: on ? 'rgba(83,74,183,0.08)' : 'rgba(255,255,255,0.8)',
                      border: on ? `1.5px solid ${PURPLE}` : '1px solid rgba(83,74,183,0.2)',
                      borderRadius:'14px', padding:'12px 10px', cursor:'pointer',
                      textAlign:'center', fontFamily:'inherit',
                    }}
                  >
                    <div style={{fontSize:'13px', fontWeight:800, color: NAVY}}>{t.label}</div>
                    {t.price && <div style={{fontSize:'11px', color: PURPLE_SOFT, marginTop:'2px'}}>{t.price}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Referral + notes */}
          <div style={{marginBottom:'16px'}}>
            <label style={LABEL}>How did you hear about us?</label>
            <input type="text" value={referral} onChange={e=>setReferral(e.target.value)} placeholder="Word of mouth, Instagram, a friend's referral…" style={INPUT_BASE}/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={LABEL}>Anything else you'd like Dr. Anderson to know?</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional — any details that would help." style={{...INPUT_BASE, minHeight:'80px', resize:'vertical'}}/>
          </div>

          {error && (
            <div style={{marginTop:'8px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.25)', borderRadius:'10px', padding:'10px 12px', fontSize:'12.5px', color:'#a02020', textAlign:'center'}}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              width:'100%', padding:'14px 18px', borderRadius:'14px',
              background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)',
              color:'white', border:'none',
              fontSize:'15px', fontWeight:800, letterSpacing:'0.2px',
              cursor: canSubmit ? 'pointer' : 'default',
              opacity: canSubmit ? 1 : 0.55,
              boxShadow:'0 10px 26px rgba(83,74,183,0.28)',
              marginTop:'10px', fontFamily:'inherit',
            }}
          >
            {loading ? 'Submitting…' : 'Submit & Enter My Portal'}
          </button>

          <div style={{marginTop:'12px', textAlign:'center', fontSize:'11px', color: PURPLE_SOFT, fontStyle:'italic', letterSpacing:'0.3px'}}>
            <span style={{color: GOLD, marginRight:'4px'}}>✦</span>
            Dr. Anderson personally reviews every intake.
          </div>
        </div>

        <div style={{marginTop:'22px', fontFamily: SERIF, fontStyle:'italic', fontSize:'12.5px', color: PURPLE_SOFT, textAlign:'center', opacity:0.8}}>
          Your journey. Your healing. Your space.
        </div>
      </main>
    </div>
  );
};

export default PatientIntake;
