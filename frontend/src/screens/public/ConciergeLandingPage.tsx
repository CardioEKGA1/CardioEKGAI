// © 2026 SoulMD, LLC. All rights reserved.
//
// Public landing for soulmd.us/ and soulmd.us/concierge-medicine.
// Boutique concierge-medicine surface — ultra-luxury, exclusive,
// ethereal. Every CTA routes prospective patients to /patient
// (the magic-link sign-in that gates the membership onboarding flow);
// the only exception is "View Membership Tiers" which smooth-scrolls
// to the tier section.
import React, { useEffect } from 'react';
import SoulMDLogo from '../../SoulMDLogo';
import ChoKuRei from '../concierge/ChoKuRei';

interface Props { API: string; onHome: () => void; }

// ───── Design tokens ──────────────────────────────────────────────────
const BG_BASE   = '#FDFBF8';
const BG_BLUSH  = '#FDF7FA';
const BLUSH     = '#F6BFD3';
const OPAL      = '#C5E8F4';
const GOLD      = '#C9A84C';
const NAVY      = '#1a2a4a';
const MUTED     = '#6B7280';
const HAIRLINE  = '#EDE8E3';
const SERIF     = 'Georgia, "Cormorant Garamond", "Times New Roman", serif';
const SANS      = '-apple-system, BlinkMacSystemFont, system-ui, sans-serif';

// ───── Tier data ──────────────────────────────────────────────────────
interface Tier {
  id: 'awaken' | 'align' | 'ascend';
  name: string;
  monthly: string;        // shown large; angel number
  annual: string;         // muted gold subtext
  features: string[];
  featured?: boolean;
}
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
      '5 medical visits (30 min)',
      '4 guided meditations',
      'Direct physician messaging',
      'Same-day scheduling',
      'Monthly integrative review',
    ],
  },
];

// ───── Tiny shared building blocks ────────────────────────────────────
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

const PhotoPlaceholder: React.FC<{size?: number; label?: string}> = ({ size = 160, label = 'Dr. Anderson' }) => (
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

const NavyButton: React.FC<{href: string; children: React.ReactNode; full?: boolean}> = ({ href, children, full }) => (
  <a href={href} style={{
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
    transition:'opacity 220ms ease',
  }}
  onMouseEnter={e => (e.currentTarget.style.opacity = '0.86')}
  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
    {children}
  </a>
);

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
const ConciergeLandingPage: React.FC<Props> = (_props) => {
  useEffect(() => {
    document.title = 'SoulMD — Concierge Medicine by Dr. Neysi Anderson';
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
          <Eyebrow>Salt Lake City, Utah  ·  By Invitation</Eyebrow>

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
            Private concierge medicine by Dr. Neysi Anderson, board-certified Internal Medicine physician. Unhurried visits. Integrative care. Direct access to your doctor.
          </p>

          <div style={{
            marginTop:'48px',
            display:'flex', flexWrap:'wrap', gap:'14px',
            justifyContent:'center', alignItems:'center',
          }}>
            <NavyButton href="/patient">Request Membership</NavyButton>
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
              SoulMD integrates evidence-based Internal Medicine with integrative wellness — guided meditation, energy practices, and whole-person care — because healing is never just physical.
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
            {TIERS.map(t => <TierCard key={t.id} tier={t}/>)}
          </div>

          <div style={{
            textAlign:'center', marginTop:'56px',
            fontFamily: SANS, fontSize:'13px',
            color: MUTED, fontStyle:'italic',
          }}>
            À la carte consultations available from $75. No long-term commitment required.
          </div>
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
            <PhotoPlaceholder size={200}/>
          </div>
          <div>
            <Eyebrow light>Your Physician</Eyebrow>
            <h2 style={{
              fontFamily: SERIF, fontSize:'clamp(26px, 4.5vw, 36px)',
              fontWeight: 400, letterSpacing:'0.02em', color:'#FFFFFF',
              margin:'0 0 12px', lineHeight:1.25,
            }}>
              Dr. Neysi Anderson, MD
            </h2>
            <div style={{
              fontFamily: SERIF, fontSize:'12px',
              letterSpacing:'0.15em', textTransform:'uppercase',
              color: GOLD, marginBottom:'28px',
            }}>
              Board-Certified · Internal Medicine · Salt Lake City
            </div>
            <p style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'clamp(15px, 2vw, 17px)', lineHeight:1.9,
              color:'rgba(255,255,255,0.85)', margin:'0 0 18px',
            }}>
              I built SoulMD because I believe medicine can be both rigorous and sacred. After years in traditional practice, I chose a different path — one where I know my patients deeply, have time to think clearly, and can integrate the full spectrum of healing.
            </p>
            <p style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'clamp(15px, 2vw, 17px)', lineHeight:1.9,
              color:'rgba(255,255,255,0.85)', margin:'0 0 28px',
            }}>
              This is not a clinic. It is a relationship.
            </p>
            <div style={{
              fontFamily: SERIF, fontStyle:'italic',
              fontSize:'18px', color: GOLD, letterSpacing:'0.02em',
            }}>
              — Neysi Anderson, MD
            </div>
          </div>
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
          <NavyButton href="/patient">Request Your Membership</NavyButton>
          <div style={{marginTop:'24px'}}>
            <a href="/patient" style={{
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
            © 2026 SoulMD, LLC · Salt Lake City, UT
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
    </div>
  );
};

// ───── Tier card (Section 4) ──────────────────────────────────────────
const TierCard: React.FC<{tier: Tier}> = ({ tier }) => {
  const featured = !!tier.featured;
  return (
    <div style={{position:'relative', display:'flex', flexDirection:'column'}}>
      {featured && (
        <div style={{
          position:'absolute', top:'-26px', left:'50%',
          transform:'translateX(-50%)',
          fontFamily: SERIF, fontSize:'9px',
          letterSpacing:'0.2em', textTransform:'uppercase',
          color: GOLD, fontWeight: 700,
        }}>
          Most Popular
        </div>
      )}
      <div style={{
        background:'#FFFFFF',
        border:`1px solid ${HAIRLINE}`,
        borderTop: featured ? `3px solid ${GOLD}` : `1px solid ${HAIRLINE}`,
        borderRadius:'4px',
        padding:'48px 36px',
        boxShadow:'0 2px 24px rgba(26,42,74,0.06)',
        display:'flex', flexDirection:'column',
        flex:1,
      }}>
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
          listStyle:'none', padding:0, margin:'0 0 36px',
          display:'flex', flexDirection:'column', gap:'14px',
          flex:1,
        }}>
          {tier.features.map(f => (
            <li key={f} style={{
              display:'flex', alignItems:'flex-start', gap:'12px',
              fontFamily: SANS, fontSize:'14px', color: NAVY,
              lineHeight: 1.65,
            }}>
              <span aria-hidden style={{color: GOLD, fontSize:'14px', lineHeight: 1.65, flexShrink:0}}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <NavyButton href="/patient" full>
          Begin with {tier.name}
        </NavyButton>
      </div>
    </div>
  );
};

export default ConciergeLandingPage;
