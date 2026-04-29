// © 2026 SoulMD, LLC. All rights reserved.
//
// Public landing at soulmd.us/concierge-medicine. Direct URL only — not
// linked from the dashboard for non-superusers. Hero + about + 3 tier
// cards + à la carte + inquiry form. Submission persists to the
// concierge_inquiries table and emails Dr. Anderson within seconds.
import React, { useEffect, useState } from 'react';
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
const PAGE_BG     = 'linear-gradient(180deg, #FAF9FD 0%, #F1ECF8 100%)';
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
          message: message.trim() || undefined,
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
      {/* HERO — dark navy with gold accents and faint Cho Ku Rei */}
      <section style={{
        position:'relative',
        background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 55%, ${NAVY_SOFT} 100%)`,
        color: 'white',
        padding:'clamp(40px,8vw,72px) clamp(20px,5vw,32px) clamp(48px,8vw,80px)',
        overflow:'hidden',
      }}>
        <div aria-hidden style={{position:'absolute', right:'-40px', bottom:'-40px', opacity:0.10, pointerEvents:'none'}}>
          <ChoKuRei size={300} color={GOLD_BRIGHT} opacity={1}/>
        </div>
        <div aria-hidden style={{position:'absolute', left:'-40px', top:'-40px', opacity:0.06, pointerEvents:'none'}}>
          <ChoKuRei size={220} color={GOLD_BRIGHT} opacity={1}/>
        </div>
        <div style={{maxWidth:'820px', margin:'0 auto', position:'relative'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'40px'}}>
            <button onClick={onHome}
              style={{background:'transparent', border:'none', padding:0, cursor:'pointer'}}
              title="SoulMD home">
              <SoulMDLogo size={32}/>
            </button>
            <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }}
              style={{fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', textDecoration:'none'}}>
              soulmd.us
            </a>
          </div>

          <div style={{display:'inline-flex', padding:'5px 14px', borderRadius:'999px', background: GOLD_SOFT, color: GOLD_BRIGHT, fontSize:'10px', fontWeight:800, letterSpacing:'1.8px', textTransform:'uppercase', marginBottom:'18px'}}>
            ✦ Salt Lake City, UT
          </div>

          <h1 style={{fontFamily: SERIF, fontSize:'clamp(34px,8vw,56px)', fontWeight:600, lineHeight:1.05, letterSpacing:'-0.8px', margin:'0 0 16px', color:'white'}}>
            Private Medicine.<br/>
            <span style={{color: GOLD}}>Personal Care.</span>
          </h1>
          <p style={{fontSize:'clamp(15px,2.6vw,17px)', color:'rgba(255,255,255,0.78)', lineHeight:1.6, maxWidth:'560px', margin:'0 0 28px'}}>
            Dr. Neysi Anderson, MD — Board-Certified Internal Medicine. A concierge practice where science meets the soul.
          </p>

          <button onClick={scrollToTiers}
            style={{
              padding:'14px 24px', borderRadius:'14px',
              background:`linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`,
              color: NAVY_DEEP, border:'none',
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
          {TIERS.map(t => <TierCard key={t.id} tier={t}/>)}
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
              <p style={{fontSize:'14px', color: INK_SOFT, lineHeight:1.65, maxWidth:'420px', margin:'0 auto'}}>
                Dr. Anderson will be in touch within 48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{textAlign:'center', marginBottom:'22px'}}>
                <h3 style={{fontFamily: SERIF, fontSize:'24px', fontWeight:600, color: NAVY, margin:'0 0 8px', letterSpacing:'-0.3px'}}>
                  Apply for Membership
                </h3>
                <p style={{fontSize:'13px', color: INK_SOFT, lineHeight:1.6, margin:0, maxWidth:'480px', marginInline:'auto'}}>
                  Dr. Anderson accepts a limited number of patients. Inquire below and she will personally respond within 48 hours.
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
              <Field label="Membership tier interest">
                <select value={tier} onChange={e => setTier(e.target.value as any)} style={{...inputStyle, appearance:'auto'}}>
                  <option value="awaken">Awaken — $444/mo</option>
                  <option value="align">Align — $888/mo</option>
                  <option value="ascend">Ascend — $1,111/mo</option>
                  <option value="unsure">Not sure yet</option>
                </select>
              </Field>
              <Field label="Tell Dr. Anderson about yourself and your health goals">
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="What led you to consider concierge medicine? What would you like to focus on?"
                  style={{...inputStyle, minHeight:'130px', resize:'vertical', lineHeight:1.6}}/>
              </Field>

              {err && (
                <div style={{padding:'10px 14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>
                  {err}
                </div>
              )}

              <button type="submit" disabled={submitting}
                style={{
                  width:'100%', padding:'15px 18px',
                  background:`linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 100%)`,
                  color:'white', border:`1px solid ${GOLD}`,
                  borderRadius:'14px',
                  fontSize:'14px', fontWeight:800, cursor: submitting ? 'wait' : 'pointer',
                  fontFamily:'inherit', letterSpacing:'0.5px', textTransform:'uppercase',
                  boxShadow:'0 12px 28px rgba(26,42,74,0.32)',
                  opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? 'Sending…' : 'Submit Inquiry →'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign:'center', marginTop:'28px', fontSize:'12px', color: INK_SOFT, lineHeight:1.8}}>
          <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }} style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>soulmd.us</a>
          <span style={{margin:'0 8px', opacity:0.5}}>·</span>
          <a href="mailto:anderson@soulmd.us" style={{color: PURPLE, textDecoration:'none', fontWeight:700}}>anderson@soulmd.us</a>
        </div>
        <div style={{textAlign:'center', marginTop:'10px', fontSize:'10px', color: INK_SOFT, opacity:0.65, fontStyle:'italic', fontFamily: SERIF, lineHeight:1.7}}>
          Direct-pay practice · Not insurance · Beta — not yet HIPAA compliant
        </div>
      </section>
    </div>
  );
};

const TierCard: React.FC<{tier: Tier}> = ({ tier }) => {
  const isLavender = tier.accent === 'lavender';
  const isGold     = tier.accent === 'gold';
  const accentBg = isGold
    ? `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`
    : isLavender
      ? `linear-gradient(135deg, #b8b0f0, ${PURPLE})`
      : `linear-gradient(135deg, ${PEARL}, #a8d5e8)`;
  const accentBorder = isGold ? GOLD : isLavender ? PURPLE : 'rgba(83,74,183,0.16)';
  return (
    <div style={{
      position:'relative',
      background: CARD_BG,
      border: `1.5px solid ${accentBorder}55`,
      borderRadius:'20px',
      padding:'24px 22px 22px',
      boxShadow: isLavender || isGold
        ? '0 16px 36px rgba(83,74,183,0.14)'
        : '0 8px 22px rgba(83,74,183,0.08)',
      transform: isLavender ? 'translateY(-6px)' : 'none',
      display:'flex', flexDirection:'column',
    }}>
      {tier.badge && (
        <div style={{
          position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)',
          padding:'4px 12px', borderRadius:'999px',
          background: accentBg, color: isGold ? NAVY_DEEP : 'white',
          fontSize:'10px', fontWeight:800, letterSpacing:'1px', textTransform:'uppercase',
          boxShadow:'0 6px 14px rgba(83,74,183,0.18)',
          whiteSpace:'nowrap',
        }}>
          {tier.badge}
        </div>
      )}
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'12px'}}>
        <div style={{fontFamily: SERIF, fontSize:'24px', fontWeight:600, color: NAVY, letterSpacing:'-0.3px'}}>{tier.label}</div>
      </div>
      <div style={{fontSize:'24px', fontWeight:800, color: NAVY, lineHeight:1, marginBottom:'4px'}}>
        {tier.monthly}
      </div>
      <div style={{fontSize:'12px', color: INK_SOFT, marginBottom:'18px'}}>or {tier.yearly}</div>

      <div style={{height:'1px', background:'rgba(83,74,183,0.10)', margin:'0 0 16px'}}/>

      <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'10px'}}>
        {tier.bullets.map(b => (
          <li key={b} style={{display:'flex', alignItems:'flex-start', gap:'10px', fontSize:'13.5px', color: INK, lineHeight:1.55}}>
            <span style={{color: GOLD, flexShrink:0, marginTop:'2px', fontWeight:800}}>✦</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

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
