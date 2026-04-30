// © 2026 SoulMD, LLC. All rights reserved.
//
// 6-step onboarding gate rendered inside PatientApp before tabs become
// reachable. Steps: 4 consents (telehealth, GFE, comm policy, cancellation
// policy) → 1 full intake form → welcome screen with animated Cho Ku Rei.
//
// Each consent step posts to /concierge/patient/consents (signed_name +
// timestamp + IP). Intake posts to /concierge/patient/intake-full. Final
// "Enter your portal" posts /concierge/patient/onboarding-complete which
// stamps onboarding_completed_at and emails Dr. Anderson.
import React, { useState } from 'react';
import ChoKuRei from './ChoKuRei';

interface Props {
  API: string;
  token: string;
  patientName: string;
  signedConsents: string[];          // pre-existing if patient came back mid-flow
  intakeAlreadySubmitted: boolean;
  onComplete: () => void;             // called after the welcome step
}

const OPAL  = '#C5E8F4';
const BLUSH = '#F6BFD3';
const GOLD  = '#C9A84C';
const NAVY  = '#1a2a4a';
const DEEPP = '#6b4e7c';
const SERIF = 'Georgia, "Cormorant Garamond", "Times New Roman", serif';

const STEPS = [
  { id: 'telehealth_consent',     label: 'Telehealth Informed Consent' },
  { id: 'good_faith_estimate',    label: 'Good Faith Estimate' },
  { id: 'communication_policy',   label: 'Communication & Response Time' },
  { id: 'cancellation_policy',    label: 'Cancellation & No-Show Policy' },
  { id: 'intake',                 label: 'Intake / Health History' },
  { id: 'welcome',                label: 'Welcome' },
] as const;
type StepId = typeof STEPS[number]['id'];

const PatientOnboarding: React.FC<Props> = ({ API, token, patientName, signedConsents, intakeAlreadySubmitted, onComplete }) => {
  // Resume where the patient left off if they came back mid-flow.
  const initial: number = (() => {
    const consentIds = STEPS.slice(0, 4).map(s => s.id);
    let i = 0;
    while (i < consentIds.length && signedConsents.includes(consentIds[i])) i++;
    if (i < 4) return i;
    if (!intakeAlreadySubmitted) return 4;
    return 5;
  })();
  const [stepIdx, setStepIdx] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const step = STEPS[stepIdx];
  const total = STEPS.length;

  const advance = () => { setErr(''); setStepIdx(i => Math.min(i + 1, total - 1)); };
  const back = () => { setErr(''); setStepIdx(i => Math.max(i - 1, 0)); };

  const submitConsent = async (signedName: string) => {
    setErr(''); setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge/patient/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_type: step.id, signed_name: signedName, document_version: '1.0' }),
      });
      const d = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(d.detail || 'Could not record signature.');
      advance();
    } catch (e: any) { setErr(e.message || 'Could not record signature.'); }
    finally { setSubmitting(false); }
  };

  const submitIntake = async (intake: any) => {
    setErr(''); setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge/patient/intake-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(intake),
      });
      const d = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(d.detail || 'Could not save intake.');
      advance();
    } catch (e: any) { setErr(e.message || 'Could not save intake.'); }
    finally { setSubmitting(false); }
  };

  const finish = async () => {
    setErr(''); setSubmitting(true);
    try {
      await fetch(`${API}/concierge/patient/onboarding-complete`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      onComplete();
    } catch (e: any) { setErr('Could not finalize onboarding.'); setSubmitting(false); }
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:`linear-gradient(140deg, ${OPAL} 0%, ${BLUSH} 100%)`,
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'env(safe-area-inset-top, 16px) 16px 32px 16px',
      position:'relative', overflow:'hidden',
    }}>
      {/* Cho Ku Rei watermark */}
      <div aria-hidden style={{position:'fixed', top:'40%', left:'50%', transform:'translate(-50%,-50%)', opacity:0.05, pointerEvents:'none'}}>
        <ChoKuRei size={420} color={DEEPP} opacity={1}/>
      </div>

      <div style={{position:'relative', zIndex:1, maxWidth:'520px', margin:'0 auto'}}>
        {/* Stepper */}
        <div style={{display:'flex', alignItems:'center', gap:'4px', marginBottom:'18px', padding:'8px 0'}}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.id} style={{flex:1, height:'4px', borderRadius:'999px', background: done ? GOLD : active ? NAVY : 'rgba(107,78,124,0.18)'}}/>
            );
          })}
        </div>
        <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: DEEPP, fontWeight:800, marginBottom:'4px'}}>
          Step {stepIdx + 1} of {total}
        </div>
        <div style={{fontFamily: SERIF, fontSize:'24px', color: NAVY, fontWeight:600, letterSpacing:'-0.2px', marginBottom:'14px'}}>
          {step.label}
        </div>

        {err && (
          <div style={{background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 14px', color:'#a02020', fontSize:'12.5px', marginBottom:'14px'}}>
            {err}
          </div>
        )}

        {step.id === 'telehealth_consent' && (
          <ConsentStep
            patientName={patientName}
            body={TELEHEALTH_BODY}
            checkboxLabel="I have read and understand this Telehealth Informed Consent."
            submitting={submitting}
            onSubmit={submitConsent}
            onBack={stepIdx > 0 ? back : undefined}
          />
        )}
        {step.id === 'good_faith_estimate' && (
          <ConsentStep
            patientName={patientName}
            body={GFE_BODY}
            checkboxLabel="I acknowledge receipt of the Good Faith Estimate as required by federal law (No Surprises Act)."
            submitting={submitting}
            onSubmit={submitConsent}
            onBack={back}
          />
        )}
        {step.id === 'communication_policy' && (
          <ConsentStep
            patientName={patientName}
            body={COMM_BODY}
            checkboxLabel="I understand the communication channels and response-time expectations."
            submitting={submitting}
            onSubmit={submitConsent}
            onBack={back}
          />
        )}
        {step.id === 'cancellation_policy' && (
          <ConsentStep
            patientName={patientName}
            body={CANCEL_BODY}
            checkboxLabel="I understand the 48-hour cancellation policy and the consequences of late cancellation or no-show."
            submitting={submitting}
            onSubmit={submitConsent}
            onBack={back}
          />
        )}
        {step.id === 'intake' && (
          <IntakeStep
            patientName={patientName}
            submitting={submitting}
            onSubmit={submitIntake}
            onBack={back}
          />
        )}
        {step.id === 'welcome' && (
          <WelcomeStep
            patientName={patientName}
            submitting={submitting}
            onEnter={finish}
          />
        )}
      </div>
    </div>
  );
};

// ───── Consent step ───────────────────────────────────────────────────
const ConsentStep: React.FC<{
  patientName: string;
  body: React.ReactNode;
  checkboxLabel: string;
  submitting: boolean;
  onSubmit: (signedName: string) => void;
  onBack?: () => void;
}> = ({ patientName, body, checkboxLabel, submitting, onSubmit, onBack }) => {
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState(patientName || '');
  const today = new Date().toLocaleDateString();
  const canSign = agree && name.trim().length >= 2;
  return (
    <div style={cardStyle}>
      <div style={{maxHeight:'42vh', overflowY:'auto', padding:'4px 4px 12px', fontSize:'13.5px', color: NAVY, lineHeight:1.7, borderBottom:'1px solid rgba(107,78,124,0.12)', marginBottom:'14px'}}>
        {body}
      </div>
      <label style={{display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'14px', cursor:'pointer'}}>
        <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} style={{marginTop:'4px', accentColor: GOLD, width:'18px', height:'18px'}}/>
        <span style={{fontSize:'13px', color: NAVY, lineHeight:1.6}}>{checkboxLabel}</span>
      </label>
      <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', marginBottom:'14px'}}>
        <div>
          <div style={miniLabel}>Typed signature *</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Type your full legal name" style={inputStyle}/>
        </div>
        <div>
          <div style={miniLabel}>Date</div>
          <div style={{...inputStyle, paddingTop:'12px', background:'rgba(255,255,255,0.5)', color: DEEPP}}>{today}</div>
        </div>
      </div>
      <div style={{display:'flex', gap:'8px'}}>
        {onBack && <button onClick={onBack} disabled={submitting} style={ghostBtnStyle}>← Back</button>}
        <button onClick={()=>onSubmit(name.trim())} disabled={submitting || !canSign} style={{...primaryBtnStyle, flex:1, opacity:(submitting||!canSign)?0.55:1}}>
          {submitting ? 'Saving…' : 'Sign & Continue'}
        </button>
      </div>
    </div>
  );
};

// ───── Intake step ────────────────────────────────────────────────────
const CONDITIONS = [
  'Hypertension', 'Diabetes', 'Heart disease', 'Stroke or TIA',
  'Asthma or COPD', 'Cancer (any history)', 'Anxiety / Depression',
  'Thyroid disorder', 'Autoimmune disease', 'Chronic pain',
  'Migraines', 'Pregnancy or postpartum',
];

// Years between an ISO date (YYYY-MM-DD) and today. Mirrors the
// backend's _age_from_iso_dob so the over/under-18 verdict is the
// same on both sides; keeps under-18 patients from ever submitting.
const ageFromIsoDob = (iso: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

const IntakeStep: React.FC<{
  patientName: string;
  submitting: boolean;
  onSubmit: (intake: any) => void;
  onBack: () => void;
}> = ({ patientName, submitting, onSubmit, onBack }) => {
  const [form, setForm] = useState({
    full_name: patientName || '', dob: '', phone: '', address: '', emergency_contact: '',
    medical_conditions: [] as string[],
    surgeries: '', medications: '', allergies: '', family_history: '',
    exercise: '', diet: '', sleep: '', stress: '', substance_use: '',
    spiritual_practice: '', healing_goals: '',
  });
  const [age18, setAge18] = useState(false);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({...f, [k]: v}));
  const toggleCondition = (c: string) => setForm(f => ({...f, medical_conditions: f.medical_conditions.includes(c) ? f.medical_conditions.filter(x => x !== c) : [...f.medical_conditions, c]}));

  const computedAge = form.dob ? ageFromIsoDob(form.dob) : null;
  const isUnder18 = computedAge !== null && computedAge < 18;

  // Submit gate: name + DOB filled, the explicit checkbox is checked,
  // AND the DOB-derived age is at least 18. Server re-validates all
  // three before stamping age_verified — this is just for UX.
  const required = !!form.full_name.trim() && !!form.dob.trim() && age18 && !isUnder18;

  if (isUnder18) {
    return (
      <div style={{...cardStyle, textAlign:'center', padding:'40px 24px'}}>
        <div style={{fontFamily: SERIF, fontSize:'20px', color: NAVY, fontWeight:600, marginBottom:'14px'}}>
          We're sorry.
        </div>
        <p style={{fontSize:'14px', color: NAVY, lineHeight:1.7, marginBottom:'20px'}}>
          SoulMD Concierge is available to patients <b>18 years of age and older</b>. Please contact{' '}
          <a href="mailto:support@soulmd.us" style={{color: DEEPP, fontWeight:700}}>support@soulmd.us</a>{' '}
          if you have questions.
        </p>
        <button onClick={() => set('dob', '')} style={{...ghostBtnStyle, padding:'10px 18px'}}>← Edit date of birth</button>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{maxHeight:'58vh', overflowY:'auto', paddingRight:'4px'}}>

        <Section title="Personal">
          <Field label="Full legal name *"><input value={form.full_name} onChange={e=>set('full_name', e.target.value)} style={inputStyle}/></Field>
          <Field label="Date of birth *"><input type="date" value={form.dob} onChange={e=>set('dob', e.target.value)} style={inputStyle}/></Field>
          <Field label="Phone"><input type="tel" value={form.phone} onChange={e=>set('phone', e.target.value)} style={inputStyle}/></Field>
          <Field label="Address"><input value={form.address} onChange={e=>set('address', e.target.value)} style={inputStyle}/></Field>
          <Field label="Emergency contact (name, relationship, phone)"><input value={form.emergency_contact} onChange={e=>set('emergency_contact', e.target.value)} style={inputStyle}/></Field>
        </Section>

        <Section title="Medical history">
          <div style={miniLabel}>Conditions (check all that apply)</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'12px'}}>
            {CONDITIONS.map(c => (
              <label key={c} style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'12.5px', color: NAVY, cursor:'pointer', padding:'6px 4px'}}>
                <input type="checkbox" checked={form.medical_conditions.includes(c)} onChange={()=>toggleCondition(c)} style={{accentColor: GOLD}}/>
                {c}
              </label>
            ))}
          </div>
          <Field label="Past surgeries"><textarea value={form.surgeries} onChange={e=>set('surgeries', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="Current medications + dosage"><textarea value={form.medications} onChange={e=>set('medications', e.target.value)} rows={3} style={textareaStyle}/></Field>
          <Field label="Allergies (medication, food, environmental)"><textarea value={form.allergies} onChange={e=>set('allergies', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="Family history (notable conditions)"><textarea value={form.family_history} onChange={e=>set('family_history', e.target.value)} rows={2} style={textareaStyle}/></Field>
        </Section>

        <Section title="Lifestyle">
          <Field label="Exercise (frequency + type)"><textarea value={form.exercise} onChange={e=>set('exercise', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="Diet"><textarea value={form.diet} onChange={e=>set('diet', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="Sleep"><textarea value={form.sleep} onChange={e=>set('sleep', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="Stress"><textarea value={form.stress} onChange={e=>set('stress', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="Substance use (alcohol, tobacco, recreational)"><textarea value={form.substance_use} onChange={e=>set('substance_use', e.target.value)} rows={2} style={textareaStyle}/></Field>
        </Section>

        <Section title="Spiritual & integrative">
          <Field label="Current practice (meditation, prayer, energy work, etc.)"><textarea value={form.spiritual_practice} onChange={e=>set('spiritual_practice', e.target.value)} rows={2} style={textareaStyle}/></Field>
          <Field label="What you're hoping to heal or transform"><textarea value={form.healing_goals} onChange={e=>set('healing_goals', e.target.value)} rows={3} style={textareaStyle}/></Field>
        </Section>

        <Section title="Age verification">
          <label style={{display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', padding:'4px 0'}}>
            <input
              type="checkbox"
              checked={age18}
              onChange={e=>setAge18(e.target.checked)}
              style={{marginTop:'4px', accentColor: GOLD, width:'18px', height:'18px', flexShrink:0}}
            />
            <span style={{fontSize:'13px', color: NAVY, lineHeight:1.6}}>
              I confirm I am 18 years of age or older.
            </span>
          </label>
        </Section>
      </div>

      <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
        <button onClick={onBack} disabled={submitting} style={ghostBtnStyle}>← Back</button>
        <button
          onClick={()=>onSubmit({ ...form, age_18_or_older: true })}
          disabled={submitting || !required}
          style={{...primaryBtnStyle, flex:1, opacity:(submitting||!required)?0.55:1}}
        >
          {submitting ? 'Saving…' : 'Submit Intake'}
        </button>
      </div>
    </div>
  );
};

// ───── Welcome step ───────────────────────────────────────────────────
const WelcomeStep: React.FC<{
  patientName: string;
  submitting: boolean;
  onEnter: () => void;
}> = ({ patientName, submitting, onEnter }) => {
  const first = (patientName || '').trim().split(/\s+/)[0] || 'friend';
  return (
    <div style={{...cardStyle, textAlign:'center', padding:'48px 24px'}}>
      <div style={{
        display:'inline-block', marginBottom:'24px',
        animation: 'pcOnboardSpin 18s linear infinite',
      }}>
        <ChoKuRei size={120} color={GOLD} opacity={0.85} glow/>
      </div>
      <style>{`@keyframes pcOnboardSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
      <div style={{fontFamily: SERIF, fontSize:'26px', color: NAVY, fontWeight:600, letterSpacing:'-0.2px', marginBottom:'12px'}}>
        Welcome, {first}.
      </div>
      <p style={{fontSize:'14px', color: NAVY, lineHeight:1.8, opacity:0.85, maxWidth:'380px', margin:'0 auto 28px'}}>
        Your portal is ready. Dr. Anderson has been notified that you've completed onboarding and will reach out personally within 48 hours.
      </p>
      <button onClick={onEnter} disabled={submitting} style={{...primaryBtnStyle, padding:'16px 32px', fontSize:'13.5px', opacity: submitting ? 0.6 : 1}}>
        {submitting ? 'Opening…' : 'Enter Your Portal →'}
      </button>
    </div>
  );
};

// ───── Helpers ────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background:'rgba(255,255,255,0.86)',
  backdropFilter:'blur(12px)',
  borderRadius:'18px',
  padding:'22px 20px',
  boxShadow:'0 16px 36px rgba(83,74,183,0.10)',
  border:'0.5px solid rgba(255,255,255,0.9)',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(107,78,124,0.20)',
  background:'rgba(255,255,255,0.85)',
  fontSize:'13.5px', color: NAVY, outline:'none', boxSizing:'border-box',
  fontFamily:'-apple-system, sans-serif',
};
const textareaStyle: React.CSSProperties = { ...inputStyle, resize:'vertical', minHeight:'52px', lineHeight:1.5, fontFamily:'inherit' };
const miniLabel: React.CSSProperties = { fontSize:'10px', fontWeight:800, color: DEEPP, opacity:0.75, letterSpacing:'1.4px', textTransform:'uppercase', marginBottom:'4px' };
const primaryBtnStyle: React.CSSProperties = {
  background:`linear-gradient(135deg, ${OPAL}, ${DEEPP})`,
  color:'white', border:'none', borderRadius:'12px',
  padding:'14px 18px', fontSize:'13px', fontWeight:800, letterSpacing:'0.4px',
  cursor:'pointer', fontFamily:'inherit',
  boxShadow:'0 8px 20px rgba(107,78,124,0.25)',
};
const ghostBtnStyle: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)',
  border:'1px solid rgba(107,78,124,0.20)',
  color: DEEPP, borderRadius:'12px',
  padding:'14px 18px', fontSize:'13px', fontWeight:700,
  cursor:'pointer', fontFamily:'inherit',
};

const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
  <div style={{marginBottom:'18px'}}>
    <div style={{fontFamily: SERIF, fontSize:'14px', fontWeight:700, color: NAVY, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:'10px'}}>{title}</div>
    {children}
  </div>
);
const Field: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div style={{marginBottom:'10px'}}>
    <div style={miniLabel}>{label}</div>
    {children}
  </div>
);

// ───── Consent document bodies ────────────────────────────────────────
// Plain-text bodies. Wording is intentionally conservative and matches
// industry-standard direct-pay concierge boilerplate. Versioned via the
// document_version field on the consent record (currently "1.0").

const TELEHEALTH_BODY = (
  <>
    <p>Telehealth involves the use of secure video and audio technology to deliver health care services from a remote location. SoulMD Concierge uses Zoom for Healthcare, an end-to-end encrypted platform that meets HIPAA security standards.</p>
    <p><b>What to expect:</b> visits last up to 30 minutes (or longer for extended visits). You should join from a private, well-lit space with a stable internet connection.</p>
    <p><b>Limitations:</b> telehealth is not appropriate for medical emergencies. If you are experiencing chest pain, shortness of breath, suicidal thoughts, or any life-threatening symptom, call 911 immediately.</p>
    <p><b>Confidentiality:</b> sessions are not recorded. Information shared during a telehealth session is treated with the same confidentiality as in-person care.</p>
    <p><b>Risks:</b> as with any technology, there is a small risk of disruption (lost connection, audio issues). If a session is interrupted, Dr. Anderson will reconnect or call you directly.</p>
    <p><b>Right to refuse:</b> you may decline or end a telehealth session at any time without affecting your care.</p>
    <p>By signing below, you acknowledge that you have read this consent and agree to receive care via telehealth.</p>
  </>
);

const GFE_BODY = (
  <>
    <p>Under the federal No Surprises Act (effective January 2022), health care providers are required to give uninsured or self-pay patients a Good Faith Estimate of expected charges before scheduled care.</p>
    <p><b>Your Good Faith Estimate:</b></p>
    <ul style={{paddingLeft:'18px', margin:'6px 0 12px'}}>
      <li>Awaken membership: <b>$444 / month</b> ($5,000 / year if billed annually)</li>
      <li>Align membership: <b>$888 / month</b> ($10,000 / year)</li>
      <li>Ascend membership: <b>$1,111 / month</b> ($13,000 / year)</li>
      <li>À la carte session: $300 (medical / coaching, 30 min)</li>
      <li>Extended visit (per add'l 15 min): $150</li>
      <li>Guided meditation (30 min): $44</li>
      <li>Urgent same-day consult: $444</li>
      <li>Lab result review + async message: $75</li>
    </ul>
    <p>This estimate covers the recurring membership fee and per-service rates for 12 months. Actual charges may vary if you upgrade or downgrade your membership tier.</p>
    <p><b>Right to dispute:</b> if you receive a bill that is at least $400 more than this estimate, you may dispute the bill through the federal patient-provider dispute resolution process. Visit <a href="https://www.cms.gov/nosurprises" target="_blank" rel="noopener noreferrer" style={{color:'#534AB7'}}>cms.gov/nosurprises</a> for details.</p>
    <p>By signing below, you acknowledge receipt of this Good Faith Estimate.</p>
  </>
);

const COMM_BODY = (
  <>
    <p><b>Secure messaging</b> is the primary communication channel between you and Dr. Anderson. Messages sent through the patient portal are typically responded to within <b>one business day</b> (Monday–Friday).</p>
    <p><b>Email:</b> support@soulmd.us is monitored Monday–Friday for non-clinical questions (billing, scheduling, technical issues). Do not send clinical information by email.</p>
    <p><b>Urgent matters:</b> Ascend members may request a same-day consult through the Book tab. For all other tiers, urgent same-day requests are accommodated based on availability and billed à la carte.</p>
    <p><b>After hours:</b> SoulMD Concierge does not provide 24/7 coverage. For any after-hours emergency, call 911 or proceed to the nearest emergency department.</p>
    <p><b>Vacation coverage:</b> when Dr. Anderson is unavailable for more than 48 hours, you will receive advance notice in the portal with backup-care guidance.</p>
    <p>By signing below, you acknowledge that you understand these communication channels and response-time expectations.</p>
  </>
);

const CANCEL_BODY = (
  <>
    <p><b>48-hour cancellation policy.</b> Sessions may be cancelled or rescheduled cleanly up to 48 hours before the scheduled start time. The visit credit will be returned to your monthly allocation.</p>
    <p><b>Within 48 hours.</b> Cancellations made less than 48 hours before the scheduled session will forfeit the session credit (no refund or credit return). À la carte payers will be charged the full session fee.</p>
    <p><b>No-show.</b> Failure to appear within 10 minutes of the scheduled start time without prior notice will be treated as a no-show. The session credit is forfeited and à la carte payers are charged the full fee.</p>
    <p><b>Late starts.</b> Sessions begin and end at their scheduled time. If you arrive late, the session will still end at the original scheduled end time (no extension).</p>
    <p><b>Emergencies.</b> True medical emergencies are reviewed case by case and may receive a credit return at Dr. Anderson's discretion.</p>
    <p>By signing below, you acknowledge that you understand the 48-hour cancellation policy and the consequences of late cancellation or no-show.</p>
  </>
);

export default PatientOnboarding;
