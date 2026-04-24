// © 2026 SoulMD, LLC. All rights reserved.
// Step 2 of 3 in the /patient onboarding flow. Terms acceptance gate —
// shown once, then never again.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { PATIENT_BG, NAVY, PURPLE, PURPLE_SOFT, GOLD, SERIF, SparkleLayer, ProgressIndicator } from './patient/shared';

interface Props {
  API: string;
  token: string;
  onComplete: () => void;
  onSignInRequired: () => void;
}

const TERMS: { title: string; body: string }[] = [
  {
    title: 'Direct-pay concierge practice',
    body: 'SoulMD Concierge is a membership-based, direct-pay medical practice. We do not bill insurance. Membership fees are month-to-month and you may cancel at any time.',
  },
  {
    title: 'Not a substitute for emergency care',
    body: 'This platform is not appropriate for medical emergencies. If you are experiencing chest pain, stroke symptoms, severe bleeding, thoughts of self-harm, or any other emergency, call 911 or go to your nearest emergency department.',
  },
  {
    title: 'Beta — not HIPAA compliant yet',
    body: 'SoulMD Concierge is in beta. Our platform is not yet HIPAA compliant. Please do not share identifying patient information (names, SSNs, dates, photos) in messages or intake fields until we announce full HIPAA compliance.',
  },
  {
    title: 'AI-generated content is for wellness guidance only',
    body: 'The oracle cards, meditations, coaching modules, and any other AI-generated content on this platform are intended for wellness support. They are not medical diagnoses, and they do not replace the judgment of a licensed clinician.',
  },
  {
    title: 'Your concierge physician',
    body: 'Dr. Anderson, MD, is your concierge physician. Messages, lab reviews, and appointments are coordinated through the physician panel. Response times are typically within 1 business day; this platform is not for real-time emergencies.',
  },
  {
    title: 'Communications are not for emergencies',
    body: 'Messages sent through the patient app, email, or any other channel within SoulMD are not monitored in real time. Do not rely on them for urgent or emergency needs.',
  },
  {
    title: 'Terms of Service and Privacy Policy',
    body: 'By proceeding you agree to the SoulMD Terms of Service and Privacy Policy. You can review the full texts at any time from the footer of the app.',
  },
];

const PatientTerms: React.FC<Props> = ({ API, token, onComplete, onSignInRequired }) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) onSignInRequired();
  }, [token, onSignInRequired]);

  const submit = async () => {
    if (!agreed || loading) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/concierge/patient/accept-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not save your acceptance.');
      onComplete();
    } catch (e: any) {
      setError(e.message || 'Could not save your acceptance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh', background: PATIENT_BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', position:'relative', overflow:'hidden'}}>
      <SparkleLayer count={18}/>

      <main style={{position:'relative', zIndex:1, maxWidth:'640px', margin:'0 auto', padding:'28px 18px 40px', display:'flex', flexDirection:'column', alignItems:'center'}}>
        <SoulMDLogo size={56}/>
        <div style={{marginTop:'18px', width:'100%', display:'flex', justifyContent:'center'}}>
          <ProgressIndicator step={2}/>
        </div>

        <div style={{fontFamily: SERIF, fontSize:'clamp(26px,6vw,34px)', fontWeight:600, color: NAVY, marginTop:'14px', textAlign:'center', lineHeight:1.15}}>
          Before We Begin
        </div>
        <div style={{fontSize:'13px', color: PURPLE_SOFT, marginTop:'8px', textAlign:'center', lineHeight:1.6, maxWidth:'460px'}}>
          Please read and accept the following before accessing your portal.
        </div>

        <div style={{marginTop:'24px', width:'100%', background:'rgba(255,255,255,0.92)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:'22px', padding:'24px 22px', boxShadow:'0 18px 36px rgba(83,74,183,0.1)', border:'0.5px solid rgba(255,255,255,0.95)'}}>
          <div style={{maxHeight:'52vh', overflowY:'auto', paddingRight:'6px', display:'flex', flexDirection:'column', gap:'16px'}}>
            {TERMS.map((t, i) => (
              <div key={t.title} style={{paddingBottom:'14px', borderBottom: i < TERMS.length - 1 ? `0.5px solid rgba(83,74,183,0.12)` : 'none'}}>
                <div style={{display:'flex', gap:'10px', alignItems:'flex-start'}}>
                  <span style={{color: GOLD, fontSize:'12px', marginTop:'2px'}}>✦</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily: SERIF, fontSize:'16px', fontWeight:700, color: NAVY, marginBottom:'4px'}}>
                      {t.title}
                    </div>
                    <div style={{fontSize:'13px', color:'#3a3558', lineHeight:1.6}}>
                      {t.body}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <label style={{display:'flex', gap:'10px', alignItems:'flex-start', marginTop:'18px', padding:'12px 14px', background:'rgba(83,74,183,0.06)', borderRadius:'12px', cursor:'pointer', border:'0.5px solid rgba(83,74,183,0.15)'}}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{marginTop:'2px', flexShrink:0, accentColor: PURPLE, transform:'scale(1.1)'}}
            />
            <span style={{fontSize:'13px', color: NAVY, lineHeight:1.55, fontWeight:600}}>
              I have read and agree to the Terms &amp; Conditions.
            </span>
          </label>

          {error && (
            <div style={{marginTop:'12px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.25)', borderRadius:'10px', padding:'10px 12px', fontSize:'12.5px', color:'#a02020', textAlign:'center'}}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!agreed || loading}
            style={{
              width:'100%', padding:'14px 18px', borderRadius:'14px',
              background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)',
              color:'white', border:'none',
              fontSize:'15px', fontWeight:800, letterSpacing:'0.2px',
              cursor: (!agreed || loading) ? 'default' : 'pointer',
              opacity: (!agreed || loading) ? 0.55 : 1,
              boxShadow:'0 10px 26px rgba(83,74,183,0.28)',
              marginTop:'18px', fontFamily:'inherit',
            }}
          >
            {loading ? 'Saving…' : 'Continue to My Portal'}
          </button>
        </div>

        <div style={{marginTop:'22px', fontFamily: SERIF, fontStyle:'italic', fontSize:'12.5px', color: PURPLE_SOFT, textAlign:'center', opacity:0.8}}>
          Your journey. Your healing. Your space.
        </div>
      </main>
    </div>
  );
};

export default PatientTerms;
