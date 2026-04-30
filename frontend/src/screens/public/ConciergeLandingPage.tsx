// © 2026 SoulMD, LLC. All rights reserved.
//
// Public landing for soulmd.us/ and soulmd.us/concierge-medicine.
// Boutique concierge-medicine surface — ultra-luxury, exclusive,
// ethereal. Every CTA routes prospective patients to /patient
// (the magic-link sign-in that gates the membership onboarding flow);
// the only exception is "View Membership Tiers" which smooth-scrolls
// to the tier section.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../../SoulMDLogo';
import ChoKuRei from '../concierge/ChoKuRei';

interface Props { API: string; onHome: () => void; }

const TIER_OPTIONS: {value: string; label: string}[] = [
  { value: 'awaken', label: 'Awaken — $444/mo' },
  { value: 'align',  label: 'Align — $888/mo' },
  { value: 'ascend', label: 'Ascend — $1,111/mo' },
  { value: 'unsure', label: 'À la carte / Not sure yet' },
];

// ───── Design tokens ──────────────────────────────────────────────────
const BG_BASE   = '#FDFBF8';
const BG_BLUSH  = '#FDF7FA';
const BLUSH     = '#F6BFD3';
const OPAL      = '#C5E8F4';
const LAVENDER  = '#F5F1FF';            // tier-card back background + disclaimer footer
const DISCLAIM_INK = '#7a6a9a';         // disclaimer body color
const GOLD      = '#C9A84C';
const NAVY      = '#1a2a4a';
const MUTED     = '#6B7280';
const HAIRLINE  = '#EDE8E3';
const SERIF     = 'Georgia, "Cormorant Garamond", "Times New Roman", serif';
const SANS      = '-apple-system, BlinkMacSystemFont, system-ui, sans-serif';

// ───── Tier data ──────────────────────────────────────────────────────
// `features` accepts ReactNode so Ascend can embed footnote markers
// (¹ ²) styled per spec without breaking the rest of the bullet's type
// scale. Awaken/Align stay as plain strings.
interface Tier {
  id: 'awaken' | 'align' | 'ascend';
  name: string;
  monthly: string;        // shown large; angel number
  annual: string;         // muted gold subtext
  features: React.ReactNode[];
  featured?: boolean;
}

// Footnote markers on Ascend benefits. Spec: gold #C9A84C, Georgia serif,
// small superscript. Inherits nothing — fully self-contained so it
// renders the same anywhere the marker appears.
const Footnote: React.FC<{n: 1 | 2}> = ({ n }) => (
  <sup style={{
    fontFamily: SERIF,
    fontSize: '0.72em',
    color: GOLD,
    fontWeight: 600,
    letterSpacing: 0,
    marginLeft: '1px',
    verticalAlign: 'super',
    lineHeight: 0,
  }}>{n === 1 ? '¹' : '²'}</sup>
);

const TIERS: Tier[] = [
  {
    id: 'awaken', name: 'Awaken',
    monthly: '$444', annual: 'or $5,000/year',
    features: [
      '2 medical visits (30 min)',
      '1 guided meditation',
      'Direct physician messaging',
    ],
  },
  {
    id: 'align', name: 'Align', featured: true,
    monthly: '$888', annual: 'or $10,000/year',
    features: [
      '3 medical visits (30 min)',
      '2 guided meditations',
      'Direct physician messaging',
    ],
  },
  {
    id: 'ascend', name: 'Ascend',
    monthly: '$1,111', annual: 'or $13,000/year',
    features: [
      '5 medical visits/month (30 min each)',
      '4 guided meditations/month',
      'Same-day scheduling',
      'Monthly integrative wellness review',
      <>Access to Annual SoulMD Retreat<Footnote n={1}/></>,
      <>Access to Mystical Features<Footnote n={2}/> (psychic/mediumship &amp; more)</>,
    ],
  },
];

// ───── Tiny shared building blocks ────────────────────────────────────

// Superscript ™ that inherits color + font and won't break the type
// scale of the surrounding word. Spec'd 0.45em superscript matches the
// SoulMDLogo wordmark treatment.
const TM: React.FC = () => (
  <span style={{
    fontSize: '0.45em',
    verticalAlign: 'super',
    color: 'inherit',
    fontFamily: 'inherit',
    letterSpacing: 0,
  }}>™</span>
);

const Eyebrow: React.FC<{children: React.ReactNode; light?: boolean}> = ({ children, light }) => (
  <div style={{
    fontFamily: SERIF,
    fontSize:'10px',
    letterSpacing:'0.25em',
    textTransform:'uppercase',
    color: light ? GOLD : GOLD,
    fontWeight: 600,
    marginBottom:'18px',
  }}>{children}</div>
);

const GoldRule: React.FC<{width?: number}> = ({ width = 40 }) => (
  <div aria-hidden style={{
    width: `${width}px`, height:'1px', background: GOLD,
    margin:'0 auto',
  }}/>
);

const PhotoPlaceholder: React.FC<{size?: number; label?: string}> = ({ size = 160, label = 'N. Anderson, MD' }) => (
  <div style={{
    width: `${size}px`, height: `${size}px`,
    borderRadius:'50%',
    border:`1.5px solid ${GOLD}`,
    padding:'6px',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 8px 40px rgba(201,168,76,0.15)',
  }}>
    <div style={{
      width:'100%', height:'100%',
      borderRadius:'50%',
      background:`linear-gradient(135deg, ${BLUSH}, ${OPAL})`,
      display:'flex', alignItems:'center', justifyContent:'center',
      color: NAVY, fontFamily: SERIF, fontSize: size >= 200 ? '18px' : '14px',
      letterSpacing:'0.04em',
    }}>
      {label}
    </div>
  </div>
);

const NavyButton: React.FC<{
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  full?: boolean;
}> = ({ href, onClick, children, full }) => {
  const baseStyle: React.CSSProperties = {
    display: full ? 'block' : 'inline-block',
    width: full ? '100%' : 'auto',
    padding:'16px 40px',
    background: NAVY,
    color:'#FFFFFF',
    fontFamily: SERIF,
    fontSize:'14px',
    letterSpacing:'0.08em',
    textTransform:'uppercase',
    textDecoration:'none',
    borderRadius:'2px',
    textAlign:'center',
    border:'none',
    cursor:'pointer',
    transition:'opacity 220ms ease',
  };
  const enter = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.opacity = '0.86'; };
  const leave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.opacity = '1'; };
  if (href) {
    return <a href={href} style={baseStyle} onMouseEnter={enter} onMouseLeave={leave}>{children}</a>;
  }
  return <button type="button" onClick={onClick} style={baseStyle} onMouseEnter={enter} onMouseLeave={leave}>{children}</button>;
};

const GoldOutlineButton: React.FC<{onClick?: () => void; href?: string; children: React.ReactNode}> = ({ onClick, href, children }) => {
  const baseStyle: React.CSSProperties = {
    display:'inline-block',
    padding:'16px 40px',
    background:'transparent',
    border:`1px solid ${GOLD}`,
    color: GOLD,
    fontFamily: SERIF,
    fontSize:'14px',
    letterSpacing:'0.08em',
    textTransform:'uppercase',
    textDecoration:'none',
    borderRadius:'2px',
    cursor:'pointer',
    textAlign:'center',
    transition:'background-color 220ms ease, color 220ms ease',
  };
  if (href) {
    return <a href={href} style={baseStyle}>{children}</a>;
  }
  return <button onClick={onClick} style={baseStyle}>{children}</button>;
};

// ───── Page ───────────────────────────────────────────────────────────
const ConciergeLandingPage: React.FC<Props> = ({ API }) => {
  useEffect(() => {
    document.title = 'SoulMD™ — Concierge Medicine by N. Anderson, MD';
    // Smooth scroll for in-page anchors. Reset on unmount so other
    // screens (which may not opt-in) keep their default behavior.
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = prev; };
  }, []);

  const scrollToTiers = () => {
    const el = document.getElementById('membership');
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  };
  const scrollToInquire = (tier?: string) => {
    if (tier) setForm(f => ({ ...f, tier }));
    const el = document.getElementById('inquire');
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  // Inquiry form state.
  const [form, setForm] = useState({
    name: '', email: '', phone: '', tier: 'unsure', message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState('');

  const submitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr('');
    if (!form.name.trim() || !form.email.trim() || !form.email.includes('@')) {
      setErr('Please enter your name and a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge-medicine/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          tier_interest: form.tier,
          // Backend persists this into health_history (its primary
          // narrative column); legacy `message` is also kept.
          health_history: form.message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as any));
        throw new Error(d.detail || 'Could not submit inquiry.');
      }
      setSubmitted(true);
    } catch (e: any) {
      setErr(e.message || 'Could not submit inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{background: BG_BASE, color: NAVY, fontFamily: SANS, lineHeight: 1.8}}>
      {/* ───── SECTION 1 — HERO ────────────────────────────────────── */}
      <section style={{
        position:'relative',
        minHeight:'100vh',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'80px clamp(20px,5vw,32px)',
        background:'radial-gradient(circle at center, #F6EEF8 0%, #FDFBF8 70%)',
        overflow:'hidden',
      }}>
        {/* Faint Cho Ku Rei watermark — non-interactive, sits behind content. */}
        <div aria-hidden style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%, -50%)',
          opacity:0.04, pointerEvents:'none', zIndex:0,
        }}>
          <ChoKuRei size={600} color={NAVY} opacity={1}/>
        </div>

        <div style={{position:'relative', zIndex:1, textAlign:'center', maxWidth:'720px'}}>
          <Eyebrow>By Invitation</Eyebrow>

          <div style={{marginTop:'8px', marginBottom:'40px'}}>
            <PhotoPlaceholder size={160}/>
          </div>

          <h1 style={{
            fontFamily: SERIF,
            fontSize:'clamp(36px, 6vw, 52px)',
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing:'0.02em',
            color: NAVY,
            margin:'0 auto',
            maxWidth:'600px',
          }}>
            Medicine That Honors<br/>The Whole of You
          </h1>

          <p style={{
            fontFamily: SANS,
            fontSize:'clamp(15px, 2vw, 18px)',
            lineHeight: 1.8,
            color: MUTED,
            maxWidth:'480px',
            margin:'24px auto 0',
          }}>
            Private concierge medicine by N. Anderson, MD, board-certified Internal Medicine physician. Unhurried visits. Integrative care. Direct access to your doctor.
          </p>

          <div style={{
            marginTop:'48px',
            display:'flex', flexWrap:'wrap', gap:'14px',
            justifyContent:'center', alignItems:'center',
          }}>
            <NavyButton onClick={() => scrollToInquire()}>Request Membership</NavyButton>
            <GoldOutlineButton onClick={scrollToTiers}>View Membership Tiers</GoldOutlineButton>
          </div>

          <div style={{marginTop:'48px'}}>
            <GoldRule/>
          </div>
        </div>
      </section>

      {/* ───── SECTION 2 — PHILOSOPHY ──────────────────────────────── */}
      <section style={{
        background: BG_BASE,
        padding:'clamp(80px, 12vw, 120px) clamp(20px,5vw,32px)',
        textAlign:'center',
      }}>
        <div style={{maxWidth:'720px', margin:'0 auto'}}>
          <Eyebrow>The Philosophy</Eyebrow>
          <h2 style={{
            fontFamily: SERIF,
            fontSize:'clamp(28px, 5vw, 40px)',
            fontWeight: 400,
            letterSpacing:'0.02em',
            color: NAVY,
            margin:'0 0 36px',
            lineHeight: 1.25,
          }}>
            You Deserve More Than 7 Minutes
          </h2>
          <div style={{maxWidth:'560px', margin:'0 auto'}}>
            <p style={{
              fontFamily: SANS, fontSize:'clamp(15px, 2vw, 17px)',
              lineHeight: 1.9, color: MUTED, margin:'0 0 24px',
            }}>
              Most physicians see 25 patients a day. I see a fraction of that — by design. Your membership includes unhurried visits, same-day access when it matters, and a physician who actually knows your story.
            </p>
            <p style={{
              fontFamily: SANS, fontSize:'clamp(15px, 2vw, 17px)',
              lineHeight: 1.9, color: MUTED, margin:0,
            }}>
              SoulMD<TM/> integrates evidence-based Internal Medicine with integrative wellness — guided meditation, energy practices, and whole-person care — because healing is never just physical.
            </p>
          </div>
        </div>
      </section>

      {/* ───── SECTION 3 — THREE PILLARS ───────────────────────────── */}
      <section style={{
        background: BG_BLUSH,
        padding:'clamp(80px, 10vw, 100px) clamp(20px,5vw,32px)',
      }}>
        <div style={{maxWidth:'1080px', margin:'0 auto'}}>
          <div style={{textAlign:'center', marginBottom:'56px'}}>
            <Eyebrow>What Sets This Apart</Eyebrow>
          </div>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',
            gap:'48px',
          }}>
            {[
              {
                title:'Direct Access',
                body:'Text or call your physician directly. No gatekeepers, no phone trees, no waiting weeks for an appointment.',
              },
              {
                title:'Whole-Person Care',
                body:'Evidence-based Internal Medicine woven with guided meditation, integrative review, and personalized wellness protocols.',
              },
              {
                title:'Radical Unhurriedness',
                body:'Every visit is 30 minutes, minimum. Your story gets told. Your questions get answered. Completely.',
              },
            ].map(p => (
              <div key={p.title}>
                <div aria-hidden style={{width:'32px', height:'2px', background: GOLD, marginBottom:'24px'}}/>
                <div aria-hidden style={{
                  color: GOLD, fontSize:'24px', lineHeight:1, marginBottom:'18px',
                  fontFamily: SERIF, letterSpacing:0,
                }}>✦</div>
                <h3 style={{
                  fontFamily: SERIF, fontSize:'20px', fontWeight: 400,
                  letterSpacing:'0.02em', color: NAVY, margin:'0 0 14px',
                }}>{p.title}</h3>
                <p style={{
                  fontFamily: SANS, fontSize:'15px', lineHeight: 1.8,
                  color: MUTED, margin:0,
                }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── SECTION 4 — MEMBERSHIP TIERS ────────────────────────── */}
      <section id="membership" style={{
        background: BG_BASE,
        padding:'clamp(80px, 12vw, 120px) clamp(20px,5vw,32px)',
      }}>
        <div style={{maxWidth:'1180px', margin:'0 auto'}}>
          <div style={{textAlign:'center', marginBottom:'64px'}}>
            <Eyebrow>Membership</Eyebrow>
            <h2 style={{
              fontFamily: SERIF, fontSize:'clamp(28px, 5vw, 40px)',
              fontWeight: 400, letterSpacing:'0.02em', color: NAVY,
              margin:0, lineHeight:1.25,
            }}>
              Choose Your Level of Care
            </h2>
          </div>

          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',
            gap:'24px',
            alignItems:'stretch',
          }}>
            {TIERS.map(t => <TierCard key={t.id} tier={t} API={API}/>)}
          </div>

          <div style={{
            textAlign:'center', marginTop:'56px',
            fontFamily: SANS, fontSize:'13px',
            color: MUTED, fontStyle:'italic',
          }}>
            À la carte consultations available from $888. No long-term commitment required.
          </div>

          {/* Disclaimers — footnote bodies for the ¹ ² markers on the
              Ascend tier card. Lavender wash + opal hairline above per
              spec; serif italic in #7a6a9a for the legal voice. */}
          <AscendDisclaimers/>
        </div>
      </section>

      {/* ───── SECTION 5 — DR. ANDERSON CREDIBILITY ───────────────── */}
      <section style={{
        background: NAVY,
        color:'#FFFFFF',
        padding:'clamp(80px, 12vw, 120px) clamp(20px,5vw,32px)',
      }}>
        <div style={{
          maxWidth:'1080px', margin:'0 auto',
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',
          gap:'56px',
          alignItems:'center',
        }}>
          <div style={{textAlign:'center'}}>
            <img
              src="/images/dr-anderson.jpeg"
              alt="N. Anderson, MD"
              style={{
                width:'280px',
                height:'340px',
                minWidth:'280px',
                minHeight:'340px',
                objectFit:'cover',
                objectPosition:'center top',
                borderRadius:'12px',
                border:`1.5px solid ${GOLD}`,
                // Double-ring gold effect: inner navy band (matching the
                // section background), then a thin gold outer ring.
                boxShadow:`0 0 0 6px ${NAVY}, 0 0 0 7.5px ${GOLD}`,
                display:'block',
              }}
            />
          </div>
          <div>
            <Eyebrow light>Your Physician</Eyebrow>
            <h2 style={{
              fontFamily: SERIF, fontSize:'clamp(26px, 4.5vw, 36px)',
              fontWeight: 400, letterSpacing:'0.02em', color:'#FFFFFF',
              margin:'0 0 12px', lineHeight:1.25,
            }}>
              N. Anderson, MD
            </h2>
            <div style={{
              fontFamily: SERIF, fontSize:'12px',
              letterSpacing:'0.15em', textTransform:'uppercase',
              color: GOLD, marginBottom:'28px',
            }}>
              Board-Certified · Internal Medicine
            </div>

            {/* Pull quote — sets the emotional register before the bio. */}
            <blockquote style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'18px', color: GOLD,
              lineHeight:1.5, margin:'0 0 28px',
              padding:0, borderLeft:'none',
            }}>
              Rooted in evidence. Guided by the Universe.
            </blockquote>

            <p style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'clamp(15px, 2vw, 17px)', lineHeight:1.9,
              color:'rgba(255,255,255,0.85)', margin:'0 0 18px',
            }}>
              Trained at the University of Utah and UC San Diego, N. Anderson, MD has practiced across more than ten states as a hospitalist physician — from academic medical centers to critical access hospitals. She currently practices inpatient medicine with Intermountain Health.
            </p>
            <p style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'clamp(15px, 2vw, 17px)', lineHeight:1.9,
              color:'rgba(255,255,255,0.85)', margin:'0 0 28px',
            }}>
              With Divine Guidance, she opened SoulMD<TM/> — a private practice where board-certified medicine meets life coaching, energy healing, and the truth that everything is energy, and we have the power to heal ourselves.
            </p>
            <p style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'19px', color: GOLD,
              lineHeight:1.5, margin:'0 0 32px',
              letterSpacing:'0.02em',
            }}>
              Sometimes, we just need a nudge.
            </p>
            <div style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'18px', color: GOLD, letterSpacing:'0.02em',
              marginTop:'32px',
            }}>
              — N. Anderson, MD
            </div>
          </div>
        </div>
      </section>

      {/* ───── SECTION 5b — ABOUT ──────────────────────────────────── */}
      <section style={{
        background: BG_BASE,
        padding:'clamp(80px, 12vw, 120px) clamp(20px,5vw,32px)',
      }}>
        <div style={{maxWidth:'720px', margin:'0 auto'}}>
          <div style={{textAlign:'center', marginBottom:'48px'}}>
            <Eyebrow>About</Eyebrow>
            <h2 style={{
              fontFamily: SERIF,
              fontSize:'clamp(28px, 5vw, 38px)',
              fontWeight: 400,
              letterSpacing:'0.02em',
              color: NAVY,
              margin:'0 0 48px',
              lineHeight: 1.25,
            }}>
              The Physician Behind SoulMD<TM/>
            </h2>
            <div aria-hidden style={{
              width:'40px', height:'1px',
              background: GOLD, margin:'0 auto',
            }}/>
          </div>

          {/* Body — left-aligned for readability at narrative length. */}
          <div style={{
            fontFamily: SERIF,
            fontSize:'clamp(15px, 2vw, 17px)',
            lineHeight: 1.95,
            color:'#4a5568',
          }}>
            <p style={{margin:'0 0 24px'}}>
              N. Anderson, MD is a board-certified Internal Medicine physician whose path has been anything but ordinary.
            </p>
            <p style={{margin:'0 0 24px'}}>
              She completed medical school at UNAN Managua prior to moving to the USA, where she had to start from scratch, eventually training for a second time at the University of Utah and her residency at the University of California, San Diego. She began her career as a hospitalist with UCHealth in Colorado, then expanded her practice across more than ten states through CompHealth, delivering acute inpatient care wherever she was called.
            </p>
            <p style={{margin:'0 0 24px'}}>
              She currently continues that work with Intermountain Health — one of the nation's most respected health systems — where she practices acute medicine at the bedside every day.
            </p>

            {/* Pivot line — italic + serif + centered, signals the
                turn from CV to calling. */}
            <p style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'clamp(17px, 2.4vw, 20px)',
              color: NAVY, textAlign:'center',
              margin:'40px 0',
              letterSpacing:'0.01em',
            }}>
              And then there is the other calling.
            </p>

            <p style={{margin:'0 0 24px'}}>
              With Divine Guidance, N. Anderson, MD was led to open SoulMD<TM/> Concierge — a private practice built on a belief she has carried her entire career: that healing is never purely physical. That the body, the mind, and the energy field are inseparable. That a physician who sees only the chart is missing the whole person in front of them.
            </p>
            <p style={{margin:'0 0 24px'}}>
              SoulMD<TM/> is where those two worlds finally meet — evidence-based Internal Medicine, life coaching, and energy healing, held together by the conviction that everything is energy, and we have the power to heal ourselves.
            </p>
          </div>

          {/* Closing pull quote — gold italic, gold left rule, faint
              gold gradient wash. Caps the section. */}
          <blockquote style={{
            fontFamily: SERIF, fontStyle:'italic',
            fontSize:'clamp(17px, 2.4vw, 20px)',
            color: GOLD,
            lineHeight: 1.6,
            margin:'48px auto 0',
            padding:'32px',
            borderLeft:`2px solid ${GOLD}`,
            background:`linear-gradient(to right, rgba(201,168,76,0.04), transparent)`,
            textAlign:'left',
            maxWidth:'560px',
          }}>
            Sometimes, we just need a nudge. And a doctor who believes that too.
          </blockquote>
        </div>
      </section>

      {/* ───── SECTION 6 — FINAL CTA ───────────────────────────────── */}
      <section style={{
        background:'linear-gradient(160deg, #F6EEF8, #F0E8F5, #FDFBF8)',
        padding:'clamp(96px, 14vw, 140px) clamp(20px,5vw,32px)',
        textAlign:'center',
      }}>
        <div style={{maxWidth:'720px', margin:'0 auto'}}>
          <h2 style={{
            fontFamily: SERIF,
            fontSize:'clamp(30px, 5vw, 44px)',
            fontWeight: 400, letterSpacing:'0.02em',
            color: NAVY, margin:'0 0 18px', lineHeight: 1.2,
          }}>
            A Different Kind of Medicine<br/>Is Waiting for You
          </h2>
          <div style={{
            fontFamily: SERIF, fontStyle:'italic',
            fontSize:'16px', color: GOLD, marginBottom:'40px',
          }}>
            Limited memberships available.
          </div>
          <NavyButton onClick={() => scrollToInquire()}>Request Your Membership</NavyButton>
          <div style={{marginTop:'24px'}}>
            <a href="mailto:support@soulmd.us?subject=Complimentary%20concierge%20call" style={{
              fontFamily: SANS, fontSize:'13px',
              color: NAVY, opacity: 0.7,
              textDecoration:'none',
              transition:'opacity 220ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
              or schedule a complimentary 15-min call →
            </a>
          </div>
        </div>
      </section>

      {/* ───── SECTION 6b — INQUIRY FORM ───────────────────────────── */}
      <section id="inquire" style={{
        background: BG_BASE,
        padding:'clamp(80px, 12vw, 120px) clamp(20px,5vw,32px)',
      }}>
        <div style={{maxWidth:'620px', margin:'0 auto'}}>
          <div style={{textAlign:'center', marginBottom:'40px'}}>
            <Eyebrow>Membership Inquiry</Eyebrow>
            <h2 style={{
              fontFamily: SERIF, fontSize:'clamp(26px, 4.5vw, 36px)',
              fontWeight: 400, letterSpacing:'0.02em',
              color: NAVY, margin:'0 0 16px', lineHeight: 1.25,
            }}>
              Begin Your Inquiry
            </h2>
            <p style={{
              fontFamily: SANS, fontSize:'15px',
              color: MUTED, margin:0, lineHeight: 1.7,
              maxWidth:'480px', marginInline:'auto',
            }}>
              Share a few details. Dr. Anderson personally reviews every request and, when there is alignment, will reach out with an enrollment link for the tier she recommends.
            </p>
          </div>

          {submitted ? (
            <div style={{
              background:'#FFFFFF',
              border:`1px solid ${GOLD}`,
              borderRadius:'4px',
              padding:'40px 32px',
              textAlign:'center',
              boxShadow:'0 2px 24px rgba(26,42,74,0.06)',
            }}>
              <div style={{fontFamily: SERIF, fontSize:'28px', color: GOLD, marginBottom:'12px'}}>✦</div>
              <div style={{fontFamily: SERIF, fontSize:'22px', color: NAVY, marginBottom:'14px', letterSpacing:'0.02em'}}>
                Thank you, {form.name.trim().split(/\s+/)[0] || 'friend'}.
              </div>
              <p style={{fontFamily: SANS, fontSize:'14px', color: MUTED, lineHeight:1.8, margin:0, maxWidth:'420px', marginInline:'auto'}}>
                Your inquiry has been received. Dr. Anderson will review it personally and reach out by email with next steps.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submitInquiry}
              style={{
                background:'#FFFFFF',
                border:`1px solid ${HAIRLINE}`,
                borderRadius:'4px',
                padding:'36px 32px',
                boxShadow:'0 2px 24px rgba(26,42,74,0.06)',
              }}>
              <FormField label="Full name *">
                <input
                  type="text" autoComplete="name" required
                  value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  style={inquireInputStyle} placeholder="Your name"
                />
              </FormField>
              <FormField label="Email *">
                <input
                  type="email" autoComplete="email" required
                  value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  style={inquireInputStyle} placeholder="you@example.com"
                />
              </FormField>
              <FormField label="Phone (optional)">
                <input
                  type="tel" autoComplete="tel"
                  value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                  style={inquireInputStyle} placeholder="+1 ..."
                />
              </FormField>
              <FormField label="Tier interest">
                <select
                  value={form.tier} onChange={e => setForm(f => ({...f, tier: e.target.value}))}
                  style={{...inquireInputStyle, appearance:'auto'}}>
                  {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <FormField label="Tell Dr. Anderson about your health and why you'd like to join">
                <textarea
                  value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
                  rows={6} placeholder="Share as much or as little as you feel comfortable with."
                  style={{...inquireInputStyle, minHeight:'140px', resize:'vertical', lineHeight:1.6, fontFamily:'inherit'}}
                />
              </FormField>

              {err && (
                <div style={{
                  background:'rgba(224,80,80,0.08)',
                  border:'1px solid rgba(224,80,80,0.3)',
                  borderRadius:'4px', padding:'10px 14px',
                  color:'#a02020', fontSize:'12.5px',
                  marginBottom:'16px',
                }}>{err}</div>
              )}

              <button type="submit" disabled={submitting} style={{
                width:'100%', padding:'16px 40px',
                background: NAVY, color:'#FFFFFF',
                fontFamily: SERIF, fontSize:'14px',
                letterSpacing:'0.08em', textTransform:'uppercase',
                border:'none', borderRadius:'2px',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Sending…' : 'Submit Inquiry'}
              </button>
              <div style={{
                marginTop:'18px', fontSize:'11.5px', color: MUTED,
                textAlign:'center', fontStyle:'italic', lineHeight:1.7,
              }}>
                Direct-pay practice · Not insurance
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ───── SECTION 7 — FOOTER ──────────────────────────────────── */}
      <footer style={{
        background: BG_BASE,
        padding:'40px clamp(20px,5vw,32px) 32px',
        borderTop:`1px solid ${HAIRLINE}`,
      }}>
        <div style={{
          maxWidth:'1180px', margin:'0 auto',
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',
          alignItems:'center', gap:'20px',
        }}>
          <div style={{justifySelf:'start'}}>
            <SoulMDLogo size={28} subtitle=""/>
          </div>
          <div style={{
            justifySelf:'center', textAlign:'center',
            fontFamily: SERIF, fontSize:'12px', color: MUTED,
            letterSpacing:'0.04em',
          }}>
            © 2026 SoulMD<TM/>, LLC
          </div>
          <div style={{justifySelf:'end'}}>
            <a href="/dashboard" style={{
              fontFamily: SERIF, fontSize:'12px',
              color: MUTED, opacity: 0.7,
              textDecoration:'none',
              letterSpacing:'0.04em',
              transition:'opacity 220ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
              For Clinicians →
            </a>
          </div>
        </div>
        <div style={{
          maxWidth:'1180px', margin:'18px auto 0',
          textAlign:'center',
          fontFamily: SANS, fontSize:'11px',
          color: MUTED, opacity:0.7, letterSpacing:'0.04em',
        }}>
          <a href="/privacy" style={{color: MUTED, textDecoration:'none'}}>Privacy Policy</a>
          <span style={{margin:'0 10px', opacity:0.5}}>·</span>
          <a href="/terms" style={{color: MUTED, textDecoration:'none'}}>Terms</a>
          <span style={{margin:'0 10px', opacity:0.5}}>·</span>
          <a href="/privacy" style={{color: MUTED, textDecoration:'none'}}>Notice of Privacy Practices</a>
        </div>
      </footer>

      <BottomDisclaimers/>
    </div>
  );
};

// ───── Inquiry form helpers ──────────────────────────────────────────
const inquireInputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px',
  background:'#FAFAFE',
  border:`1px solid ${HAIRLINE}`,
  borderRadius:'2px',
  fontFamily: SANS, fontSize:'14px',
  color: NAVY,
  outline:'none', boxSizing:'border-box',
};

const FormField: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div style={{marginBottom:'16px'}}>
    <div style={{
      fontFamily: SERIF, fontSize:'10px',
      letterSpacing:'0.18em', textTransform:'uppercase',
      color: MUTED, fontWeight: 600, marginBottom:'6px',
    }}>{label}</div>
    {children}
  </div>
);

// ───── Tier card (Section 4) ──────────────────────────────────────────
// Flippable: front shows tier copy + price + benefits, back shows a mini
// inquiry form. Desktop hovers peek the back; clicking the front (or the
// "Learn More →" button, or focusing any form field) locks the card to
// the back face so the user doesn't lose their typing. Mobile (no hover)
// reveals the back via tap. "← Back" un-locks.
const TierCard: React.FC<{tier: Tier; API: string}> = ({ tier, API }) => {
  const featured = !!tier.featured;

  // lockedBack = explicit click/tap or focus-in-form intent.
  // hovering   = desktop-only mouse hover peek.
  // Either drives the rotation; lockedBack wins so a hover-leave doesn't
  // snap a mid-form user back to the front and erase context.
  const [lockedBack, setLockedBack] = useState(false);
  const [hovering, setHovering] = useState(false);

  // matchMedia is only meaningful in the browser. We snapshot once on
  // mount so the value is stable across renders. Touch devices report
  // (hover: none) so this returns false on iOS/Android — preventing the
  // CSS-style "tap-then-stuck-hover" bug entirely.
  const [hoverCapable] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  const showBack = lockedBack || (hoverCapable && hovering);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', why: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr('');
    if (!form.name.trim() || !form.email.trim() || !form.email.includes('@')) {
      setErr('Please enter your name and a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/concierge-medicine/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          tier_interest: tier.id,
          // Backend persists the narrative into health_history.
          health_history: form.why.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({} as any));
        throw new Error(d.detail || 'Could not submit request.');
      }
      setSubmitted(true);
    } catch (ex: any) {
      setErr(ex.message || 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Front and back share the exact same shell footprint so the rotated
  // face still fills the card. Card body padding intentionally smaller
  // on the back to fit the form fields without a scrollbar.
  const cardShellStyle: React.CSSProperties = {
    background:'#FFFFFF',
    border:`1px solid ${HAIRLINE}`,
    borderTop: featured ? `3px solid ${GOLD}` : `1px solid ${HAIRLINE}`,
    borderRadius:'4px',
    padding:'48px 36px',
    boxShadow:'0 2px 24px rgba(26,42,74,0.06)',
    display:'flex', flexDirection:'column',
    flex:1,
    boxSizing:'border-box',
    height:'100%',
  };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position:'relative', display:'flex', flexDirection:'column',
        minHeight: tier.id === 'ascend' ? '600px' : '560px',
        perspective: '1400px',
        WebkitPerspective: '1400px',
      }}
    >
      {featured && (
        <div style={{
          position:'absolute', top:'-26px', left:'50%',
          transform:'translateX(-50%)',
          fontFamily: SERIF, fontSize:'9px',
          letterSpacing:'0.2em', textTransform:'uppercase',
          color: GOLD, fontWeight: 700,
          zIndex: 2,
        }}>
          Most Popular
        </div>
      )}

      <div style={{
        flex: 1, position: 'relative',
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d' as any,
        transition: 'transform 0.6s ease',
        transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
        WebkitTransform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)' as any,
        willChange: 'transform',
      }}>
        {/* ─── Front face ─── */}
        <div
          onClick={() => setLockedBack(true)}
          style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden',
            WebkitBackfaceVisibility:'hidden',
            display:'flex', flexDirection:'column',
            cursor:'pointer',
          }}
        >
          <div style={cardShellStyle}>
            <h3 style={{
              fontFamily: SERIF, fontSize:'24px', fontWeight: 400,
              letterSpacing:'0.02em', color: NAVY, margin:'0 0 18px',
            }}>
              {tier.name}
            </h3>

            <div style={{display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'4px'}}>
              <div style={{
                fontFamily: SERIF, fontSize:'48px', fontWeight: 400,
                color: NAVY, lineHeight: 1, letterSpacing:'0.01em',
              }}>
                {tier.monthly}
              </div>
              <div style={{
                fontFamily: SANS, fontSize:'16px', color: MUTED,
              }}>
                /month
              </div>
            </div>
            <div style={{
              fontFamily: SANS, fontSize:'13px', color: GOLD,
              opacity: 0.9, marginBottom:'24px', letterSpacing:'0.02em',
            }}>
              {tier.annual}
            </div>

            <div style={{height:'1px', background: HAIRLINE, margin:'0 0 24px'}}/>

            <ul style={{
              listStyle:'none', padding:0, margin:'0 0 28px',
              display:'flex', flexDirection:'column', gap:'14px',
              flex:1,
            }}>
              {tier.features.map((f, i) => (
                <li key={i} style={{
                  display:'flex', alignItems:'flex-start', gap:'12px',
                  fontFamily: SANS, fontSize:'14px', color: NAVY,
                  lineHeight: 1.65,
                }}>
                  <span aria-hidden style={{color: GOLD, fontSize:'14px', lineHeight: 1.65, flexShrink:0}}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setLockedBack(true)}
              aria-label={`Learn more about ${tier.name} and request access`}
              style={{
                width:'100%', padding:'16px 24px',
                background: NAVY, color:'#FFFFFF',
                fontFamily: SERIF, fontSize:'14px',
                letterSpacing:'0.08em', textTransform:'uppercase',
                border:'none', borderRadius:'2px',
                cursor:'pointer',
                transition:'opacity 220ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.86')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Learn More →
            </button>
          </div>
        </div>

        {/* ─── Back face ─── */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          WebkitBackfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          WebkitTransform:'rotateY(180deg)' as any,
          display:'flex', flexDirection:'column',
        }}>
          <div style={{
            ...cardShellStyle,
            background: LAVENDER,
            border: `1px solid ${OPAL}`,
            borderTop: featured ? `3px solid ${BLUSH}` : `1px solid ${OPAL}`,
            padding:'32px 28px',
          }}>
            {submitted ? (
              <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', padding:'12px 8px'}}>
                <div style={{fontFamily: SERIF, fontSize:'28px', color: GOLD, marginBottom:'14px'}}>✦</div>
                <div style={{
                  fontFamily: SERIF, fontSize:'17px', color: NAVY,
                  lineHeight: 1.5, letterSpacing:'0.01em',
                }}>
                  Your request has been received.<br/>
                  Dr. Anderson will be in touch personally.
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLockedBack(false);
                    setHovering(false);
                  }}
                  style={{
                    marginTop:'24px',
                    background:'transparent', border:'none',
                    fontFamily: SERIF, fontSize:'12px',
                    color: NAVY, cursor:'pointer',
                    letterSpacing:'0.08em', textTransform:'uppercase',
                  }}
                >
                  ← Back
                </button>
              </div>
            ) : (
              <form
                onSubmit={submit}
                onFocus={() => { if (!lockedBack) setLockedBack(true); }}
                style={{display:'flex', flexDirection:'column', flex:1, gap:'10px'}}
              >
                <div style={{
                  fontFamily: SERIF, fontSize:'18px', fontWeight: 400,
                  color: NAVY, letterSpacing:'0.02em',
                  marginBottom:'4px',
                }}>
                  Request Access
                </div>
                <div style={{
                  fontFamily: SANS, fontSize:'11px', color: MUTED,
                  letterSpacing:'0.04em', marginBottom:'8px',
                }}>
                  {tier.name} · {tier.monthly}/month
                </div>

                <FlipInput
                  label="Full name"
                  value={form.name}
                  onChange={v => setForm(f => ({...f, name: v}))}
                  type="text" autoComplete="name" required
                />
                <FlipInput
                  label="Email"
                  value={form.email}
                  onChange={v => setForm(f => ({...f, email: v}))}
                  type="email" autoComplete="email" required
                />
                <FlipInput
                  label="Phone"
                  value={form.phone}
                  onChange={v => setForm(f => ({...f, phone: v}))}
                  type="tel" autoComplete="tel"
                />

                <label style={flipLabelStyle}>
                  Why this tier resonates with you
                  <textarea
                    value={form.why}
                    onChange={e => setForm(f => ({...f, why: e.target.value}))}
                    rows={3}
                    style={{...flipInputStyle, resize:'vertical', minHeight:'62px', fontFamily:'inherit'}}
                    placeholder="Optional"
                  />
                </label>

                {err && (
                  <div style={{
                    background:'rgba(224,80,80,0.08)',
                    border:'1px solid rgba(224,80,80,0.3)',
                    borderRadius:'2px', padding:'8px 10px',
                    color:'#a02020', fontSize:'11.5px',
                    margin:'2px 0',
                  }}>{err}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop:'8px',
                    width:'100%', padding:'13px 18px',
                    background: NAVY, color:'#FFFFFF',
                    fontFamily: SERIF, fontSize:'12px',
                    letterSpacing:'0.1em', textTransform:'uppercase',
                    border:'none', borderRadius:'2px',
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Sending…' : 'Request Invitation'}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLockedBack(false);
                    setHovering(false);
                  }}
                  style={{
                    marginTop:'4px',
                    background:'transparent', border:'none',
                    fontFamily: SERIF, fontSize:'11px',
                    color: NAVY, cursor:'pointer',
                    letterSpacing:'0.08em', textTransform:'uppercase',
                    alignSelf:'center', padding:'4px 8px',
                  }}
                >
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact labeled input used on the back face of the flip card.
const flipLabelStyle: React.CSSProperties = {
  display:'flex', flexDirection:'column', gap:'4px',
  fontFamily: SERIF, fontSize:'10px',
  letterSpacing:'0.16em', textTransform:'uppercase',
  color: '#5a5070', fontWeight: 600,
};

const flipInputStyle: React.CSSProperties = {
  width:'100%', padding:'9px 11px',
  background:'#FFFFFF',
  border:`1px solid ${OPAL}`,
  borderRadius:'2px',
  fontFamily: SANS, fontSize:'13px',
  color: NAVY,
  outline:'none', boxSizing:'border-box',
  letterSpacing:0,
  textTransform:'none',
  fontWeight: 400,
};

const FlipInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}> = ({ label, value, onChange, type='text', autoComplete, required }) => (
  <label style={flipLabelStyle}>
    {label}{required ? ' *' : ''}
    <input
      type={type}
      autoComplete={autoComplete}
      required={required}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={flipInputStyle}
    />
  </label>
);

// ───── Disclaimer footer (Ascend ¹ ²) ─────────────────────────────────
// Placed below the membership tier grid. Lavender wash + opal hairline
// above per spec. Body copy is long-form legal text, locked verbatim.
const AscendDisclaimers: React.FC = () => (
  <div style={{
    marginTop:'56px',
    background: LAVENDER,
    borderTop:`1px solid ${OPAL}`,
    padding:'28px clamp(20px, 4vw, 36px)',
    borderRadius:'2px',
  }}>
    <p style={disclaimerParaStyle}>
      <sup style={disclaimerSupStyle}>¹</sup> The Annual SoulMD Retreat is an exclusive, invitation-only experience held once per year at a curated destination worldwide — locations rotate annually and may include places such as Japan, Costa Rica, and Patagonia. Each retreat is thoughtfully designed to immerse members in healing, consciousness, and transformation within some of the world's most extraordinary natural and cultural landscapes. Retreat attendance fees including travel, accommodations, and event programming are separate from and not included in membership pricing, and are the sole responsibility of the member. Retreat access is exclusive to Ascend members in active good standing at the time of the event.
    </p>
    <p style={{...disclaimerParaStyle, marginTop:'16px', marginBottom: 0}}>
      <sup style={disclaimerSupStyle}>²</sup> Mystical Features include access to psychic and mediumship experiences and other consciousness-expanding offerings curated by Dr. Anderson. Features are introduced over time and are exclusive to active Ascend members. Specific offerings may vary and are subject to availability.
    </p>
  </div>
);

const disclaimerParaStyle: React.CSSProperties = {
  fontFamily: SERIF,
  fontStyle:'italic',
  fontSize:'12.5px',
  color: DISCLAIM_INK,
  lineHeight: 1.75,
  margin: 0,
  letterSpacing:'0.01em',
};

const disclaimerSupStyle: React.CSSProperties = {
  fontFamily: SERIF,
  color: GOLD,
  fontStyle:'normal',
  fontWeight: 600,
  fontSize:'0.9em',
  marginRight:'4px',
};

// ───── Bottom-of-page disclaimers ─────────────────────────────────────
// Last block on the page, below the legal footer. Quiet legal/footnote
// rail at 11px Georgia italic in muted lavender (#a89fc0) — distinct
// from the inline AscendDisclaimers that lives directly under the tier
// grid. Spec is locked verbatim by the practice owner.
const BottomDisclaimers: React.FC = () => {
  const para: React.CSSProperties = {
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    fontSize: '11px',
    color: '#a89fc0',
    textAlign: 'center',
    lineHeight: 1.75,
    margin: 0,
    letterSpacing: '0.01em',
  };
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px 60px',
      borderTop: '1px solid #e8d8f8',
      background: 'transparent',
    }}>
      <p style={para}>
        ¹ The Annual SoulMD Retreat is an exclusive, invitation-only experience held once per year at a curated destination worldwide — locations rotate annually and may include places such as Japan, Costa Rica, and Patagonia. Each retreat is thoughtfully designed to immerse members in healing, consciousness, and transformation within some of the world's most extraordinary natural and cultural landscapes. Retreat attendance fees including travel, accommodations, and event programming are separate from and not included in membership pricing, and are the sole responsibility of the member. Retreat access is exclusive to Ascend members in active good standing at the time of the event.
      </p>
      <p style={{...para, marginTop: '16px'}}>
        ² Mystical Features include access to psychic and mediumship experiences and other consciousness-expanding offerings curated by Dr. Anderson. Features are introduced over time and are exclusive to active Ascend members. Specific offerings may vary and are subject to availability.
      </p>
    </div>
  );
};

export default ConciergeLandingPage;
