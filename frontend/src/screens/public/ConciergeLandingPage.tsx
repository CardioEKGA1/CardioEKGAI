// © 2026 SoulMD, LLC. All rights reserved.
//
// Public landing at soulmd.us/concierge-medicine. Direct URL only — not
// linked from the dashboard for non-superusers. Hero + about + 3 tier
// cards + à la carte + inquiry form. Submission persists to the
// concierge_inquiries table and emails Dr. Anderson within seconds.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SoulMDLogo from '../../SoulMDLogo';
import ChoKuRei from '../concierge/ChoKuRei';

interface Props { API: string; onHome: () => void; }

// Palette — navy + gold premium-private-practice feel.
const NAVY        = '#1a2a4a';
const NAVY_DEEP   = '#0f1a30';
const NAVY_SOFT   = '#243652';
const GOLD        = '#C9A84C';
const GOLD_DEEP   = '#A88830';
const GOLD_BRIGHT = '#FFE4A3';
const GOLD_SOFT   = 'rgba(201,168,76,0.18)';
const PURPLE      = '#534AB7';
const PEARL       = '#E0F4FA';
const BLUSH       = '#f0c8d8';
const INK         = '#2a3a5a';
const INK_SOFT    = '#6B6889';
const SERIF       = 'Georgia, "Cormorant Garamond", "Playfair Display", "Times New Roman", serif';
const PAGE_BG     = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)';
const CARD_BG     = '#FFFFFF';
const CARD_BORDER = '0.5px solid rgba(83,74,183,0.10)';

interface Tier {
  id: 'awaken' | 'align' | 'ascend';
  label: string;
  monthly: string;
  yearly: string;
  badge?: string;
  bullets: string[];
  accent: 'pearl' | 'lavender' | 'gold';
}

const TIERS: Tier[] = [
  {
    id: 'awaken', label: 'Awaken',
    monthly: '$444/mo', yearly: '$5,000/yr',
    bullets: [
      'Up to 2 medical visits or life-coaching sessions (up to 30 min each)',
      'Up to 1 guided meditation session',
      'Secure messaging',
      'Lab result review',
    ],
    accent: 'pearl',
  },
  {
    id: 'align', label: 'Align',
    monthly: '$888/mo', yearly: '$10,000/yr',
    badge: 'Most Popular',
    bullets: [
      'Up to 3 medical visits or life-coaching sessions (up to 30 min each)',
      'Up to 2 guided meditation sessions',
      'Secure messaging',
      'Lab result review',
      'Priority scheduling',
    ],
    accent: 'lavender',
  },
  {
    id: 'ascend', label: 'Ascend',
    monthly: '$1,111/mo', yearly: '$13,000/yr',
    badge: 'Concierge Elite',
    bullets: [
      'Up to 5 medical visits or life-coaching sessions (up to 30 min each)',
      'Up to 4 guided meditation sessions',
      'Same-day scheduling',
      'Monthly integrative wellness review',
      'Secure messaging + lab vault',
    ],
    accent: 'gold',
  },
];

const ALA_CARTE: { label: string; price: string }[] = [
  { label: 'Medical or life-coaching session (up to 30 min)', price: '$300' },
  { label: 'Extended session (per additional 15 min)',         price: '$150' },
  { label: 'Guided meditation session',                        price: '$44'  },
  { label: 'Urgent same-day consult',                          price: '$444' },
  { label: 'Lab result review + async message',                price: '$75'  },
];

const ConciergeLandingPage: React.FC<Props> = ({ API, onHome }) => {
  useEffect(() => { document.title = 'Concierge Medicine · Dr. Anderson · SoulMD'; }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<'awaken'|'align'|'ascend'|'unsure'>('unsure');
  const [message, setMessage] = useState('');
  // New richer-intake fields, mirroring the per-tier card form.
  const [dob, setDob] = useState('');
  const [heardFrom, setHeardFrom] = useState('');
  const [insuranceAcked, setInsuranceAcked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr('');
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setErr('Please enter your name and a valid email.');
      return;
    }
    if (!dob.trim()) { setErr('Please enter your date of birth.'); return; }
    if (!message.trim()) { setErr('Please share a few words about your health.'); return; }
    if (!insuranceAcked) { setErr('Please confirm the insurance acknowledgment.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge-medicine/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          tier_interest: tier,
          // Bottom form's textarea is the patient's narrative — post it
          // as health_history so the backend stores it consistently
          // with the per-tier card form.
          health_history: message.trim() || undefined,
          dob: dob.trim(),
          heard_from: heardFrom.trim() || undefined,
          insurance_acknowledged: insuranceAcked,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Could not submit inquiry.');
      setDone(true);
      // Smooth-scroll to the form so the confirmation is visible.
      window.requestAnimationFrame(() => {
        const el = document.getElementById('concierge-inquire-card');
        if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
      });
    } catch (e: any) {
      setErr(e.message || 'Could not submit inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToTiers = () => {
    const el = document.getElementById('concierge-tiers');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: INK, fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif'}}>
      {/* HERO — soft pearl gradient (no dark sections anywhere on the
          page). Navy is reserved for headings + body text only; gold
          drives the accents. */}
      <section style={{
        position:'relative',
        padding:'clamp(40px,8vw,72px) clamp(20px,5vw,32px) clamp(48px,8vw,80px)',
        overflow:'hidden',
      }}>
        <div aria-hidden style={{position:'absolute', right:'-40px', bottom:'-40px', opacity:0.08, pointerEvents:'none'}}>
          <ChoKuRei size={300} color={GOLD} opacity={1}/>
        </div>
        <div aria-hidden style={{position:'absolute', left:'-40px', top:'-40px', opacity:0.05, pointerEvents:'none'}}>
          <ChoKuRei size={220} color={GOLD} opacity={1}/>
        </div>
        <div style={{maxWidth:'820px', margin:'0 auto', position:'relative'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'40px'}}>
            <button onClick={onHome}
              style={{background:'transparent', border:'none', padding:0, cursor:'pointer'}}
              title="SoulMD home">
              {/* Logo bumped ~40% (32 → 46) and the default
                  "AI CLINICAL SUITE" subtitle suppressed for the
                  concierge surface — the lockup speaks for itself
                  alongside the practice copy. */}
              <SoulMDLogo size={46} subtitle=""/>
            </button>
            <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }}
              style={{fontSize:'11px', color: INK_SOFT, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', textDecoration:'none'}}>
              soulmd.us
            </a>
          </div>

          {/* (Salt Lake City badge removed — practice scope is
              communicated by the membership copy below.) */}

          <h1 style={{fontFamily: SERIF, fontSize:'clamp(34px,8vw,56px)', fontWeight:600, lineHeight:1.05, letterSpacing:'-0.8px', margin:'0 0 16px', color: NAVY}}>
            Private Medicine.<br/>
            <span style={{color: GOLD_DEEP}}>Personal Care.</span>
          </h1>

          {/* Refined invitation-only signal — gold border + small caps,
              centered. Reads as exclusivity, not a warning. */}
          <div style={{display:'inline-block', marginBottom:'16px'}}>
            <span style={{
              display:'inline-block',
              fontSize:'10px', fontWeight:800, letterSpacing:'2.4px', textTransform:'uppercase',
              color: GOLD_DEEP,
              background:'rgba(201,168,76,0.06)',
              border:`1px solid ${GOLD}`,
              borderRadius:'999px',
              padding:'6px 16px',
            }}>
              ✦ By Invitation Only
            </span>
          </div>

          <p style={{fontSize:'clamp(15px,2.6vw,17px)', color: INK_SOFT, lineHeight:1.6, maxWidth:'560px', margin:'0 0 20px'}}>
            Dr. Anderson, MD — Board-Certified Internal Medicine. A concierge practice where science meets the soul.
          </p>

          {/* Soft gold divider + spiritual-downloads line. Kept narrow
              and Georgia italic so it reads as a quiet aside rather
              than a clinical claim. */}
          <div aria-hidden style={{
            width:'72px', height:'1px',
            background:`linear-gradient(90deg, transparent, ${GOLD} 50%, transparent)`,
            margin:'0 0 16px',
          }}/>
          <p style={{
            fontFamily: SERIF, fontStyle:'italic',
            fontSize:'clamp(13px,2.2vw,15px)',
            color:'#7B6EA0',
            lineHeight:1.7,
            maxWidth:'560px',
            margin:'0 0 28px',
          }}>
            Where medicine meets the sacred — members may experience profound moments of clarity, inner knowing, and spiritual awakening as part of their healing journey.
          </p>

          <button onClick={scrollToTiers}
            style={{
              padding:'14px 24px', borderRadius:'14px',
              background: GOLD,
              color:'white', border:'none',
              fontSize:'14px', fontWeight:800, letterSpacing:'0.5px',
              cursor:'pointer', fontFamily:'inherit',
              boxShadow:'0 12px 28px rgba(201,168,76,0.32)',
            }}>
            View Membership Options ↓
          </button>
        </div>
      </section>

      {/* ABOUT */}
      <section style={{maxWidth:'760px', margin:'0 auto', padding:'clamp(36px,6vw,56px) clamp(20px,5vw,32px)'}}>
        <div style={{
          background: CARD_BG, border: CARD_BORDER, borderRadius:'20px',
          padding:'clamp(22px,4vw,30px)',
          boxShadow:'0 8px 28px rgba(83,74,183,0.08)',
          textAlign:'center',
        }}>
          <p style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(16px,3vw,18px)', color: NAVY, lineHeight:1.7, margin:0}}>
            Dr. Anderson offers deeply personal, unhurried medical care to a small panel of patients. No insurance. No waiting rooms. Direct access to your physician, integrative wellness support, and guided meditation — all in one membership.
          </p>
        </div>
      </section>

      {/* TIERS */}
      <section id="concierge-tiers" style={{maxWidth:'1100px', margin:'0 auto', padding:'8px clamp(20px,5vw,32px) clamp(28px,5vw,40px)'}}>
        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: GOLD_DEEP, fontWeight:800, marginBottom:'8px'}}>
            Membership Tiers
          </div>
          <h2 style={{fontFamily: SERIF, fontSize:'clamp(24px,5vw,32px)', fontWeight:600, color: NAVY, margin:0, letterSpacing:'-0.4px'}}>
            Choose the rhythm that fits your life
          </h2>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'16px'}}>
          {TIERS.map(t => <TierCard key={t.id} tier={t} API={API}/>)}
        </div>
      </section>

      {/* À LA CARTE */}
      <section style={{maxWidth:'820px', margin:'0 auto', padding:'8px clamp(20px,5vw,32px) clamp(28px,5vw,40px)'}}>
        <div style={{
          background: CARD_BG, border: CARD_BORDER, borderRadius:'18px',
          padding:'24px',
          boxShadow:'0 4px 16px rgba(83,74,183,0.06)',
        }}>
          <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: GOLD_DEEP, fontWeight:800, marginBottom:'4px'}}>
            À la carte
          </div>
          <h3 style={{fontFamily: SERIF, fontSize:'20px', fontWeight:600, color: NAVY, margin:'0 0 14px'}}>
            Pay-as-you-go pricing
          </h3>
          <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
            {ALA_CARTE.map((item, i) => (
              <div key={item.label} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px',
                padding:'12px 0',
                borderTop: i === 0 ? 'none' : '0.5px solid rgba(83,74,183,0.10)',
              }}>
                <div style={{fontSize:'13.5px', color: INK, lineHeight:1.5}}>{item.label}</div>
                <div style={{fontSize:'14px', fontWeight:800, color: NAVY, whiteSpace:'nowrap'}}>{item.price}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:'14px', paddingTop:'12px', borderTop:'0.5px solid rgba(83,74,183,0.10)', fontFamily: SERIF, fontStyle:'italic', fontSize:'12.5px', color: INK_SOFT, lineHeight:1.65, textAlign:'center'}}>
            À la carte services are available to active members and invited guests. Contact <a href="mailto:support@soulmd.us" style={{color: GOLD_DEEP, textDecoration:'none', fontWeight:700, fontStyle:'normal'}}>support@soulmd.us</a> to inquire.
          </div>
        </div>
      </section>

      {/* REQUEST FORM */}
      <section style={{maxWidth:'620px', margin:'0 auto', padding:'8px clamp(20px,5vw,32px) clamp(48px,8vw,72px)'}}>
        <div id="concierge-inquire-card" style={{
          background: CARD_BG,
          border:`1.5px solid ${GOLD}`,
          borderRadius:'22px',
          padding:'28px 24px',
          boxShadow:`0 18px 40px rgba(201,168,76,0.18), inset 0 0 0 0.5px ${GOLD_SOFT}`,
        }}>
          {done ? (
            <div style={{padding:'10px 8px', textAlign:'center'}}>
              <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:'72px', height:'72px', borderRadius:'50%', background:`linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY_DEEP, fontSize:'34px', fontWeight:800, marginBottom:'14px', boxShadow:'0 12px 28px rgba(201,168,76,0.30)'}}>✓</div>
              <h3 style={{fontFamily: SERIF, fontSize:'22px', fontWeight:600, color: NAVY, margin:'0 0 10px'}}>
                Thank you, {name.trim().split(' ')[0] || 'friend'}.
              </h3>
              <p style={{fontSize:'14px', color: INK_SOFT, lineHeight:1.65, maxWidth:'480px', margin:'0 auto'}}>
                Your request has been received. Dr. Anderson will personally review it and reach out if there is alignment. Thank you for trusting us with your care.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{textAlign:'center', marginBottom:'22px'}}>
                <h3 style={{fontFamily: SERIF, fontSize:'24px', fontWeight:600, color: NAVY, margin:'0 0 8px', letterSpacing:'-0.3px'}}>
                  Not sure which tier is right for you?
                </h3>
                <p style={{fontSize:'13px', color: INK_SOFT, lineHeight:1.65, margin:0, maxWidth:'500px', marginInline:'auto'}}>
                  Submit a general inquiry and Dr. Anderson will guide you.
                </p>
              </div>

              <Field label="Full name">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle}/>
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle}/>
              </Field>
              <Field label="Phone (optional)">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 ..." style={inputStyle}/>
              </Field>
              <Field label="Date of birth *">
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle}/>
              </Field>
              <Field label="Membership tier interest">
                <select value={tier} onChange={e => setTier(e.target.value as any)} style={{...inputStyle, appearance:'auto'}}>
                  <option value="awaken">Awaken — $444/mo</option>
                  <option value="align">Align — $888/mo</option>
                  <option value="ascend">Ascend — $1,111/mo</option>
                  <option value="unsure">Not sure yet</option>
                </select>
              </Field>
              <Field label="Tell Dr. Anderson about your health history and why you'd like to join this practice *">
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Share as much or as little as you feel comfortable with — your current health concerns, what you're hoping to heal or transform, and what drew you to this practice."
                  style={{...inputStyle, minHeight:'130px', resize:'vertical', lineHeight:1.6}}/>
              </Field>
              <Field label="How did you hear about us?">
                <select value={heardFrom} onChange={e => setHeardFrom(e.target.value)} style={{...inputStyle, appearance:'auto'}}>
                  <option value="">— select —</option>
                  {HEARD_FROM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </Field>

              <label style={{display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'14px', cursor:'pointer'}}>
                <input type="checkbox" checked={insuranceAcked} onChange={e => setInsuranceAcked(e.target.checked)}
                  style={{marginTop:'4px', accentColor: GOLD_DEEP}}/>
                <span style={{fontSize:'12.5px', color: INK, lineHeight:1.6}}>
                  I understand this is a concierge practice that does not accept insurance and requires a membership or per-visit fee. *
                </span>
              </label>

              {err && (
                <div style={{padding:'10px 14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>
                  {err}
                </div>
              )}

              <button type="submit" disabled={submitting}
                style={{
                  width:'100%', padding:'15px 18px',
                  background: GOLD,
                  color:'white', border:'none',
                  borderRadius:'14px',
                  fontSize:'14px', fontWeight:800, cursor: submitting ? 'wait' : 'pointer',
                  fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase',
                  boxShadow:'0 12px 28px rgba(201,168,76,0.32)',
                  opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? 'Sending…' : 'Request My Invitation →'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign:'center', marginTop:'28px', fontSize:'12px', color: INK_SOFT, lineHeight:1.8}}>
          <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }} style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>soulmd.us</a>
          <span style={{margin:'0 8px', opacity:0.5}}>·</span>
          <a href="mailto:support@soulmd.us" style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>support@soulmd.us</a>
        </div>
        <div style={{textAlign:'center', marginTop:'10px', fontSize:'10px', color: INK_SOFT, opacity:0.65, fontStyle:'italic', fontFamily: SERIF, lineHeight:1.7}}>
          Direct-pay practice · Not insurance · Beta — not yet HIPAA compliant
        </div>
      </section>
    </div>
  );
};

// Flippable tier card. Front: classic pricing + features. On tap, the
// card 3D-flips to a back face holding the per-tier invitation request
// form. Submission posts to /concierge-medicine/inquire with the tier
// pre-selected, then flips back to the front showing a soft gold
// confirmation state for the rest of the session.
const TierCard: React.FC<{tier: Tier; API: string}> = ({ tier, API }) => {
  const isLavender = tier.accent === 'lavender';
  const isGold     = tier.accent === 'gold';
  const accentBg = isGold
    ? `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`
    : isLavender
      ? `linear-gradient(135deg, #b8b0f0, ${PURPLE})`
      : `linear-gradient(135deg, ${PEARL}, #a8d5e8)`;
  const accentBorder = isGold ? GOLD : isLavender ? PURPLE : 'rgba(83,74,183,0.16)';

  const [flipped, setFlipped] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedFirstName, setConfirmedFirstName] = useState<string>('');

  const flip   = () => setFlipped(true);
  const unflip = () => setFlipped(false);

  return (
    <div style={{
      position:'relative',
      perspective:'1400px',
      transform: isLavender ? 'translateY(-6px)' : 'none',
      // Reserve enough vertical space for either face so the grid
      // layout doesn't lurch when one card is flipped vs the others.
      minHeight:'520px',
    }}>
      {tier.badge && !flipped && !confirmed && (
        <div style={{
          position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)',
          padding:'4px 12px', borderRadius:'999px',
          background: accentBg, color: isGold ? NAVY_DEEP : 'white',
          fontSize:'10px', fontWeight:800, letterSpacing:'1px', textTransform:'uppercase',
          boxShadow:'0 6px 14px rgba(83,74,183,0.18)',
          whiteSpace:'nowrap', zIndex: 30,
        }}>
          {tier.badge}
        </div>
      )}
      <motion.div
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 16 }}
        style={{
          position:'relative', width:'100%', height:'100%',
          minHeight:'520px',
          transformStyle:'preserve-3d',
        }}>
        {/* FRONT FACE */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          background: CARD_BG,
          border: `1.5px solid ${accentBorder}55`,
          borderRadius:'20px',
          padding:'24px 22px 22px',
          boxShadow: isLavender || isGold
            ? '0 16px 36px rgba(83,74,183,0.14)'
            : '0 8px 22px rgba(83,74,183,0.08)',
          display:'flex', flexDirection:'column',
        }}>
          {confirmed ? (
            // Soft gold confirmation — shown once the request is in.
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', flex:1, padding:'16px 8px'}}>
              <div style={{
                width:'68px', height:'68px', borderRadius:'50%',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                background:`linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`,
                color:'white', fontSize:'30px', fontWeight:800,
                marginBottom:'14px',
                boxShadow:'0 12px 28px rgba(201,168,76,0.30)',
              }}>✓</div>
              <div style={{fontFamily: SERIF, fontSize:'18px', fontWeight:600, color: NAVY, lineHeight:1.25, marginBottom:'8px', letterSpacing:'-0.2px'}}>
                Request received{confirmedFirstName ? `, ${confirmedFirstName}` : ''}.
              </div>
              <div style={{fontSize:'13.5px', color: INK_SOFT, lineHeight:1.65, maxWidth:'320px'}}>
                Dr. Anderson will personally review your information and reach out within 48 hours.
              </div>
            </div>
          ) : (
            <>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'12px'}}>
                <div style={{fontFamily: SERIF, fontSize:'24px', fontWeight:600, color: NAVY, letterSpacing:'-0.3px'}}>{tier.label}</div>
              </div>
              <div style={{fontSize:'24px', fontWeight:800, color: NAVY, lineHeight:1, marginBottom:'4px'}}>
                {tier.monthly}
              </div>
              <div style={{fontSize:'12px', color: INK_SOFT, marginBottom:'18px'}}>or {tier.yearly}</div>

              <div style={{height:'1px', background:'rgba(83,74,183,0.10)', margin:'0 0 16px'}}/>

              <ul style={{listStyle:'none', padding:0, margin:'0 0 18px', display:'flex', flexDirection:'column', gap:'10px', flex:1}}>
                {tier.bullets.map(b => (
                  <li key={b} style={{display:'flex', alignItems:'flex-start', gap:'10px', fontSize:'13.5px', color: INK, lineHeight:1.55}}>
                    <span style={{color: GOLD, flexShrink:0, marginTop:'2px', fontWeight:800}}>✦</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <button onClick={flip}
                style={{
                  marginTop:'auto',
                  background: GOLD, color:'white', border:'none',
                  borderRadius:'12px', padding:'12px',
                  fontSize:'13px', fontWeight:800, letterSpacing:'0.4px',
                  cursor:'pointer', fontFamily:'inherit',
                  boxShadow:'0 6px 14px rgba(201,168,76,0.28)',
                }}>
                I'm Interested →
              </button>
              <div style={{textAlign:'center', fontSize:'10.5px', color: INK_SOFT, fontStyle:'italic', marginTop:'8px'}}>
                Tap to request an invitation
              </div>
            </>
          )}
        </div>

        {/* BACK FACE — invitation request form */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          background:'linear-gradient(135deg, #F5F1FF 0%, #E8E4FB 100%)',
          border: `1.5px solid ${accentBorder}66`,
          borderRadius:'20px',
          padding:'18px 18px 20px',
          boxShadow:'0 16px 36px rgba(83,74,183,0.18)',
          overflowY:'auto',
          // Gold top accent across the back face.
          borderTop:`3px solid ${GOLD}`,
        }}>
          <TierCardForm
            tier={tier}
            API={API}
            onCancel={unflip}
            onSuccess={(firstName) => {
              setConfirmed(true);
              setConfirmedFirstName(firstName);
              setFlipped(false);
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

// ───── Per-tier invitation request form (back of TierCard) ─────────────

interface TierCardFormProps {
  tier: Tier;
  API: string;
  onCancel: () => void;
  onSuccess: (firstName: string) => void;
}

const HEARD_FROM_OPTIONS = [
  'Social media',
  'Referred by a patient',
  'Search engine',
  'MaryAnn DiMarco community',
  'Gabby Bernstein community',
  'Radleigh Valentine community',
  'Other',
];

const TierCardForm: React.FC<TierCardFormProps> = ({ tier, API, onCancel, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [healthHistory, setHealthHistory] = useState('');
  const [heardFrom, setHeardFrom] = useState('');
  const [insuranceAcked, setInsuranceAcked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr('');
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setErr('Please enter your name and a valid email.'); return;
    }
    if (!dob.trim()) { setErr('Please enter your date of birth.'); return; }
    if (!healthHistory.trim()) { setErr('Please share a few words about your health.'); return; }
    if (!insuranceAcked) { setErr('Please confirm the insurance acknowledgment.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge-medicine/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(),
          phone: phone.trim() || undefined,
          tier_interest: tier.id,
          dob: dob.trim(),
          health_history: healthHistory.trim(),
          heard_from: heardFrom.trim() || undefined,
          insurance_acknowledged: insuranceAcked,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Could not submit request.');
      onSuccess(name.trim().split(/\s+/)[0] || '');
    } catch (e: any) {
      setErr(e.message || 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {/* Top bar: back link + tier marker */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
        <button type="button" onClick={onCancel}
          style={{background:'transparent', border:'none', padding:0, cursor:'pointer', fontSize:'12px', color: PURPLE, fontWeight:700, fontFamily:'inherit'}}>
          ← Back
        </button>
        <div style={{fontSize:'10px', letterSpacing:'1.6px', textTransform:'uppercase', color: GOLD_DEEP, fontWeight:800}}>
          {tier.label}
        </div>
      </div>

      <div style={{textAlign:'center', marginBottom:'14px'}}>
        <div style={{fontFamily: SERIF, fontSize:'19px', fontWeight:600, color: NAVY, lineHeight:1.2, letterSpacing:'-0.2px'}}>
          Request an Invitation
        </div>
        <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'12.5px', color: INK_SOFT, marginTop:'2px'}}>
          {tier.label} Membership · {tier.monthly} or {tier.yearly}
        </div>
      </div>

      <SoftField label="Full name *">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={softInputStyle}/>
      </SoftField>
      <SoftField label="Email *">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={softInputStyle}/>
      </SoftField>
      <SoftField label="Phone (optional)">
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 ..." style={softInputStyle}/>
      </SoftField>
      <SoftField label="Date of birth *">
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={softInputStyle}/>
      </SoftField>
      <SoftField label="Tell Dr. Anderson about your health history and why you'd like to join this practice *">
        <textarea value={healthHistory} onChange={e => setHealthHistory(e.target.value)}
          placeholder="Share as much or as little as you feel comfortable with — your current health concerns, what you're hoping to heal or transform, and what drew you to this practice."
          style={{...softInputStyle, minHeight:'130px', resize:'vertical', lineHeight:1.6, padding:'10px 0'}}/>
      </SoftField>
      <SoftField label="How did you hear about us?">
        <select value={heardFrom} onChange={e => setHeardFrom(e.target.value)} style={{...softInputStyle, appearance:'auto'}}>
          <option value="">— select —</option>
          {HEARD_FROM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </SoftField>

      <label style={{display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'12px', cursor:'pointer'}}>
        <input type="checkbox" checked={insuranceAcked} onChange={e => setInsuranceAcked(e.target.checked)}
          style={{marginTop:'3px', accentColor: GOLD_DEEP}}/>
        <span style={{fontSize:'12px', color: INK, lineHeight:1.55}}>
          I understand this is a concierge practice that does not accept insurance and requires a membership or per-visit fee.
        </span>
      </label>

      {err && (
        <div style={{padding:'8px 12px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>
          {err}
        </div>
      )}

      <button type="submit" disabled={submitting}
        style={{
          width:'100%', padding:'13px',
          background: GOLD, color:'white', border:'none',
          borderRadius:'12px',
          fontSize:'13px', fontWeight:800, cursor: submitting ? 'wait' : 'pointer',
          fontFamily:'inherit', letterSpacing:'0.4px', textTransform:'uppercase',
          boxShadow:'0 12px 24px rgba(201,168,76,0.30)',
          opacity: submitting ? 0.7 : 1,
        }}>
        {submitting ? 'Sending…' : 'Submit My Request →'}
      </button>
    </form>
  );
};

// Inline styles for the soft, underline-only form fields on the back of
// each tier card. Defined inline (not at module top level) inside the
// component file is fine — these are references to module-level color
// strings that have already initialized by the time TierCardForm is
// imported elsewhere. Keeping them adjacent to TierCardForm so the
// design intent is local.
const softInputStyle: React.CSSProperties = {
  width:'100%', padding:'8px 0',
  background:'transparent',
  border:'none',
  borderBottom:'1px solid rgba(83,74,183,0.25)',
  color: NAVY, fontSize:'13.5px',
  fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
  outline:'none', boxSizing:'border-box',
};

const SoftField: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div style={{marginBottom:'12px'}}>
    <div style={{fontSize:'9.5px', letterSpacing:'1.2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'4px'}}>
      {label}
    </div>
    {children}
  </div>
);

const Field: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div style={{marginBottom:'14px'}}>
    <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'6px'}}>
      {label}
    </div>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px',
  borderRadius:'12px', border:'0.5px solid rgba(83,74,183,0.20)',
  background:'#FAFAFE', color: NAVY, fontSize:'14px',
  fontFamily:'inherit', outline:'none', boxSizing:'border-box',
};

export default ConciergeLandingPage;
