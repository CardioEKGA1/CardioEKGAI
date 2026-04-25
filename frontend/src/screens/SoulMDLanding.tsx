// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import SoulMDLogo from '../SoulMDLogo';
import ComplianceDisclaimer from '../ComplianceDisclaimer';

interface Props { onSignIn: () => void; onSignUp: () => void; onPrivacy?: () => void; onTerms?: () => void; }

interface LandingTool { slug: string; name: string; icon: React.ReactNode; desc: string; price: string; }

// Locked discovery tiles — invitation-only surfaces (Guided Meditations,
// Concierge Medicine). Rendered after TOOLS as preview cards so visitors
// see the full SoulMD universe without exposing a click-through. Lives on
// the landing AND the authed dashboard (non-superuser only); superusers
// keep their existing accessible tiles (separate `concierge`/`meditations`
// entries in SuiteDashboard's TOOLS list).
const LOCKED_PREVIEWS: { slug: string; name: string; icon: React.ReactNode; desc: string; label: string }[] = [
  { slug: 'guided_meditations', name: 'Guided Meditations', icon: '🕯️',
    desc: 'Personalized guided meditations curated by Dr. Anderson',
    label: 'By Invitation Only' },
  { slug: 'concierge_medicine', name: 'Concierge Medicine', icon: '✦',
    desc: "Where science meets the soul — Dr. Anderson's integrative practice. Direct access, deeply personal care.",
    label: 'By Invitation Only' },
];

const TOOLS: LandingTool[] = [
  { slug: 'ekgscan',      name: 'EKGScan',         icon: '🫀', desc: '12-lead EKG interpretation in seconds',                                  price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'rxcheck',      name: 'RxCheck',         icon: '💊', desc: 'Full medication interaction safety check',                               price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'antibioticai',     name: 'AntibioticAI',        icon: '🦠', desc: 'IDSA-based antibiotic recommendations',                                  price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'nephroai',     name: 'NephroAI',        icon: '🫘', desc: 'Comprehensive nephrology decision support',                              price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'labread',      name: 'LabRead',         icon: '🧪', desc: 'AI lab-panel interpretation — paste, dictate, or upload',                price: 'Free · 5 / day · Suite = unlimited' },
  { slug: 'cliniscore',     name: 'CliniScore',        icon: '📊', desc: 'Clinical risk calculators with AI interpretation',                        price: 'Free · 5 / day · Suite = unlimited' },
  { slug: 'clinicalnote', name: 'ClinicalNote AI', icon: '📝', desc: 'Clinical notes in your voice — SOAP, H&P, discharge, consult, procedure, with AI style learning',            price: '$24.99 / mo · $179.99 / yr' },
  { slug: 'cerebralai',   name: 'CerebralAI',      icon: '🧠', desc: 'Brain and spine MRI and CT interpretation',                              price: '$24.99 / mo · $179.99 / yr' },
  { slug: 'xrayread',     name: 'XrayRead',        icon: '🩻', desc: 'Structured radiology report from any X-ray image',                      price: '$24.99 / mo · $179.99 / yr' },
  { slug: 'palliativemd', name: 'PalliativeMD',    icon: '🫶', desc: 'AI-guided palliative care — goals of care, prognosis, family meetings', price: '$24.99 / mo · $179.99 / yr' },
];

const ADVANTAGES = [
  { title: 'Private and secure',               body: 'Your queries never become training data. We do not retain patient information.' },
  { title: 'Built for clinicians',             body: 'Structured outputs designed for clinical workflows — not chatbot transcripts.' },
  { title: 'Powered by the most advanced AI',  body: 'Runs on Claude by Anthropic, the frontier model for nuanced clinical reasoning.' },
  { title: 'Structured input, better output',  body: 'Guided forms ensure the AI sees the right clinical context every time.' },
  { title: 'One platform, ten tools',          body: 'One login covers every specialty — cardiology, nephrology, radiology, palliative care, labs, risk scoring, and more.' },
  { title: 'Always improving',                 body: 'Continuously updated with the latest clinical guidelines and best practices.' },
  { title: 'Decision support, not replacement',body: 'AI-powered second opinion available 24/7 — to support your judgment, not replace it.' },
];

const BG: React.CSSProperties = {minHeight:'100vh', background:'linear-gradient(135deg, #dce8fb 0%, #ede8fb 100%)', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif'};
const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
const GRAD_TEXT: React.CSSProperties = {background: WORDMARK, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'};
const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)', borderRadius:'20px', padding:'24px', boxShadow:'0 4px 20px rgba(100,130,200,0.1)', border:'1px solid rgba(255,255,255,0.9)'};

export const SoulMDBrand: React.FC<{size?: number}> = ({ size = 32 }) => (
  <SoulMDLogo size={size}/>
);

const SoulMDLanding: React.FC<Props> = ({ onSignIn, onSignUp, onPrivacy, onTerms }) => (
  <div style={{...BG, display:'flex', flexDirection:'column'}}>
    <nav style={{padding:'14px clamp(16px,4vw,24px)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(122,176,240,0.2)', flexWrap:'wrap', gap:'10px'}}>
      <SoulMDBrand/>
      <div style={{display:'flex', gap:'6px', flexShrink:0}}>
        <button onClick={onSignIn} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer', whiteSpace:'nowrap'}}>Sign In</button>
        <button onClick={onSignUp} style={{background:WORDMARK, border:'none', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:'700', color:'white', cursor:'pointer', whiteSpace:'nowrap'}}>Sign Up Free</button>
      </div>
    </nav>

    <section style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px 40px', textAlign:'center'}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', marginBottom:'28px'}}>
        <SoulMDLogo size={48}/>
      </div>
      <h1 style={{fontSize:'clamp(30px,7vw,44px)', fontWeight:'900', color:'#1a2a4a', lineHeight:'1.1', marginBottom:'14px', maxWidth:'720px', letterSpacing:'-1.2px', padding:'0 16px', wordBreak:'break-word'}}>
        Specialist-grade AI<br/>
        <span style={GRAD_TEXT}>for every decision</span>
      </h1>
      <p style={{fontSize:'16px', color:'#6a8ab0', lineHeight:'1.7', maxWidth:'560px', marginBottom:'28px'}}>Ten clinical tools, one login. Structured outputs, built for clinicians — powered by Claude.</p>
      <div style={{display:'flex', gap:'12px', flexWrap:'wrap', justifyContent:'center', marginBottom:'10px'}}>
        <button onClick={onSignUp} style={{background:WORDMARK, border:'none', borderRadius:'14px', padding:'14px 32px', fontSize:'15px', fontWeight:'700', color:'white', cursor:'pointer'}}>Sign Up Free</button>
        <button onClick={onSignIn} style={{background:'rgba(255,255,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'14px', padding:'14px 32px', fontSize:'15px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Sign In</button>
      </div>
    </section>

    <section style={{padding:'40px 20px', maxWidth:'1100px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
      <div style={{textAlign:'center', marginBottom:'28px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px'}}>Ten clinical tools</div>
        <div style={{fontSize:'28px', fontWeight:'900', color:'#1a2a4a'}}>Specialist-grade AI for every decision</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'14px'}}>
        {TOOLS.map(t => (
          <div key={t.slug} style={{...CARD, padding:'20px', display:'flex', flexDirection:'column', gap:'10px'}}>
            <div style={{fontSize:'32px'}}>{t.icon}</div>
            <div style={{fontSize:'16px', fontWeight:'800', color:'#1a2a4a'}}>{t.name}</div>
            <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.55', flex:1}}>{t.desc}</div>
            <div style={{fontSize:'11px', color:'#4a7ad0', fontWeight:'700', marginTop:'4px'}}>{t.price}</div>
          </div>
        ))}
        {LOCKED_PREVIEWS.map(p => (
          <LockedPreviewCard key={p.slug} icon={p.icon} name={p.name} desc={p.desc} label={p.label}/>
        ))}
      </div>
    </section>

    <section style={{padding:'60px 20px', maxWidth:'1000px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
      <div style={{textAlign:'center', marginBottom:'28px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px'}}>Why SoulMD</div>
        <div style={{fontSize:'28px', fontWeight:'900', color:'#1a2a4a'}}>Beats using AI chatbots directly</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'14px'}}>
        {ADVANTAGES.map(a => (
          <div key={a.title} style={{...CARD, padding:'20px'}}>
            <div style={{fontSize:'14px', fontWeight:'800', color:'#1a2a4a', marginBottom:'8px'}}>{a.title}</div>
            <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.6'}}>{a.body}</div>
          </div>
        ))}
      </div>
    </section>

    <section style={{padding:'60px 20px', maxWidth:'1000px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
      <div style={{textAlign:'center', marginBottom:'28px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px'}}>Pricing</div>
        <div style={{fontSize:'28px', fontWeight:'900', color:'#1a2a4a'}}>Simple, transparent, clinician-fair</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'14px'}}>
        <PriceCard title="Standard tool"     subtitle="EKGScan · RxCheck · AntibioticAI · NephroAI"              monthly="$9.99"   yearly="$89.99"  cta="Start standard" onCta={onSignUp}/>
        <PriceCard title="Premium tool"      subtitle="ClinicalNote AI · CerebralAI · XrayRead · PalliativeMD"   monthly="$24.99"  yearly="$179.99" cta="Start premium"  onCta={onSignUp}/>
        <PriceCard title="Free tools"        subtitle="LabRead · CliniScore · 5/day each, unlimited with Suite"  monthly="$0"      yearly="$0"      cta="Try free"       onCta={onSignUp}/>
        <PriceCard title="SoulMD Suite"      subtitle="All 10 tools · unlimited LabRead &amp; CliniScore · one login"        monthly="$111.11" yearly="$1,199"  cta="Start Suite"    onCta={onSignUp} highlighted/>
      </div>
      <div style={{textAlign:'center', fontSize:'13px', color:'#4a7ad0', marginTop:'18px', fontWeight:600, lineHeight:1.6, maxWidth:'560px', marginLeft:'auto', marginRight:'auto'}}>
        All 8 paid tools à la carte = <b>$1,079.92/yr</b>. Suite gives you all 10 for <b>$1,199/yr</b> plus unlimited LabRead &amp; CliniScore.
      </div>
      <div style={{textAlign:'center', fontSize:'12px', color:'#8aa0c0', marginTop:'10px'}}>Cancel anytime.</div>
    </section>

    <section style={{padding:'40px 20px 60px', maxWidth:'800px', margin:'0 auto', width:'100%', boxSizing:'border-box', textAlign:'center'}}>
      <div style={{...CARD, padding:'36px 24px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px'}}>Testimonials</div>
        <div style={{fontSize:'24px', fontWeight:'900', color:'#1a2a4a', marginBottom:'10px'}}>Join thousands of clinicians</div>
        <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.7', fontStyle:'italic'}}>Early-access feedback coming soon. Be among the first clinicians to ship your workflow with SoulMD.</div>
      </div>
    </section>

    <footer style={{padding:'28px 24px 40px', textAlign:'center', fontSize:'12px', color:'#6a8ab0', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(255,255,255,0.4)'}}>
      <div style={{display:'flex', gap:'18px', justifyContent:'center', flexWrap:'wrap', marginBottom:'10px'}}>
        <a href="/privacy" onClick={onPrivacy ? (e => { e.preventDefault(); onPrivacy(); }) : undefined} style={{color:'#4a7ad0', textDecoration:'none', fontWeight:'600', cursor:'pointer'}}>Privacy Policy</a>
        <a href="/terms" onClick={onTerms ? (e => { e.preventDefault(); onTerms(); }) : undefined} style={{color:'#4a7ad0', textDecoration:'none', fontWeight:'600', cursor:'pointer'}}>Terms of Service</a>
        <a href="mailto:support@soulmd.us" style={{color:'#4a7ad0', textDecoration:'none', fontWeight:'600'}}>Contact</a>
      </div>
      <ComplianceDisclaimer/>
      <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginTop:'10px', marginBottom:'10px', fontSize:'11px', color:'#8aa0c0'}}>
        <a href="https://soulmd.us" style={{color:'#8aa0c0', textDecoration:'none'}}>soulmd.us</a>
        <span>·</span>
        <a href="https://ekgscan.com" style={{color:'#8aa0c0', textDecoration:'none'}}>ekgscan.com</a>
        <span>·</span>
        <span>Data stored in United States</span>
      </div>
      <div style={{fontSize:'11px', lineHeight:'1.8'}}>For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. In emergencies, call 911.</div>
      <div style={{marginTop:'10px', fontSize:'11px', color:'#a0b0c8'}}>© {new Date().getFullYear()} SoulMD, LLC. All rights reserved.</div>
    </footer>
  </div>
);

// Locked / invitation-only tile. Visually echoes the standard tool card
// but with a lock chip and a soft dashed border so it reads as preview
// rather than a paywall the visitor can act on. No click handler — the
// card has nowhere to go yet. Exported so SuiteDashboard can render the
// same component for non-superusers.
export const LockedPreviewCard: React.FC<{icon: React.ReactNode; name: string; desc: string; label: string}> = ({ icon, name, desc, label }) => (
  <div style={{
    ...CARD,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1px dashed rgba(122,176,240,0.45)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(240,246,255,0.85))',
    position: 'relative',
  }}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div style={{fontSize:'32px', filter:'grayscale(0.35)'}}>{icon}</div>
      <span aria-label="Locked" title="By Invitation Only" style={{fontSize:'15px', opacity:0.7}}>🔒</span>
    </div>
    <div style={{fontSize:'16px', fontWeight:'800', color:'#1a2a4a'}}>{name}</div>
    <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.55', flex:1}}>{desc}</div>
    <div style={{
      fontSize:'10px', fontWeight:'800', letterSpacing:'0.6px', textTransform:'uppercase',
      color:'#8a7040',
      background:'linear-gradient(135deg,rgba(232,168,64,0.18),rgba(155,143,232,0.14))',
      padding:'5px 12px', borderRadius:'999px',
      alignSelf:'flex-start',
      border:'0.5px solid rgba(232,168,64,0.35)',
      marginTop:'4px',
    }}>{label}</div>
  </div>
);

const PriceCard: React.FC<{title: string; subtitle: string; monthly: string; yearly: string; cta: string; onCta: () => void; highlighted?: boolean}> = ({title, subtitle, monthly, yearly, cta, onCta, highlighted}) => (
  <div style={{...CARD, padding:'24px', display:'flex', flexDirection:'column', gap:'10px', border: highlighted ? '2px solid rgba(122,176,240,0.5)' : CARD.border, background: highlighted ? 'linear-gradient(135deg,rgba(122,176,240,0.18),rgba(155,143,232,0.18))' : CARD.background}}>
    <div style={{fontSize:'18px', fontWeight:'800', color:'#1a2a4a'}}>{title}</div>
    <div style={{fontSize:'12px', color:'#6a8ab0'}}>{subtitle}</div>
    <div style={{display:'flex', alignItems:'baseline', gap:'6px', marginTop:'8px'}}>
      <span style={{fontSize:'28px', fontWeight:'900', color:'#1a2a4a'}}>{monthly}</span>
      <span style={{fontSize:'12px', color:'#8aa0c0'}}>/ mo</span>
    </div>
    <div style={{fontSize:'12px', color:'#6a8ab0'}}>or {yearly} / year</div>
    <button onClick={onCta} style={{marginTop:'14px', background: highlighted ? WORDMARK : 'rgba(255,255,255,0.85)', border: highlighted ? 'none' : '1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'12px', fontSize:'13px', fontWeight:'700', color: highlighted ? 'white' : '#4a7ad0', cursor:'pointer'}}>{cta}</button>
  </div>
);

export default SoulMDLanding;
