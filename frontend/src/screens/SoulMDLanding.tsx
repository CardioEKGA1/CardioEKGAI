// © 2026 SoulMD. All rights reserved.
import React from 'react';
import SoulMDLogo from '../SoulMDLogo';

interface Props { onSignIn: () => void; onSignUp: () => void; onPrivacy?: () => void; onTerms?: () => void; }

interface LandingTool { slug: string; name: string; icon: React.ReactNode; desc: string; price: string; }

const TOOLS: LandingTool[] = [
  { slug: 'ekgscan',      name: 'EKGScan',         icon: '🫀', desc: '12-lead EKG interpretation in seconds',                      price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'nephroai',     name: 'NephroAI',        icon: '🫘',              desc: 'Comprehensive nephrology decision support',          price: '$24.99 / mo · $179.99 / yr' },
  { slug: 'xrayread',     name: 'XrayRead',        icon: '🩻', desc: 'Structured radiology report from any X-ray image',          price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'rxcheck',      name: 'RxCheck',         icon: '💊', desc: 'Full medication interaction safety check',                  price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'infectid',     name: 'InfectID',        icon: '🦠', desc: 'IDSA-based antibiotic recommendations',                     price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'clinicalnote', name: 'ClinicalNote AI', icon: '📝', desc: 'SOAP notes from bullet points in seconds',                  price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'cerebralai',   name: 'CerebralAI',      icon: '🧠', desc: 'Brain and spine MRI and CT interpretation',                 price: '$9.99 / mo · $89.99 / yr' },
  { slug: 'palliativemd', name: 'PalliativeMD',    icon: '🫶', desc: 'AI-guided palliative care — goals of care, prognosis, family meetings', price: '$24.99 / mo · $179.99 / yr' },
];

const ADVANTAGES = [
  { title: 'Private and secure',               body: 'Your queries never become training data. We do not retain patient information.' },
  { title: 'Built for clinicians',             body: 'Structured outputs designed for clinical workflows — not chatbot transcripts.' },
  { title: 'Powered by the most advanced AI',  body: 'Runs on Claude by Anthropic, the frontier model for nuanced clinical reasoning.' },
  { title: 'Structured input, better output',  body: 'Guided forms ensure the AI sees the right clinical context every time.' },
  { title: 'One platform, eight tools',        body: 'One login covers every specialty — cardiology, nephrology, radiology, palliative care and more.' },
  { title: 'Always improving',                 body: 'Continuously updated with the latest clinical guidelines and best practices.' },
  { title: 'Decision support, not replacement',body: 'AI-powered second opinion available 24/7 — to support your judgment, not replace it.' },
];

const BG: React.CSSProperties = {minHeight:'100vh', background:'linear-gradient(135deg, #dce8fb 0%, #ede8fb 100%)', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif'};
const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
const GRAD_TEXT: React.CSSProperties = {background: WORDMARK, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'};
const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)', borderRadius:'20px', padding:'24px', boxShadow:'0 4px 20px rgba(100,130,200,0.1)', border:'1px solid rgba(255,255,255,0.9)'};

export const SoulMDBrand: React.FC<{size?: number}> = ({ size = 40 }) => (
  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
    <SoulMDLogo size={size}/>
    <div>
      <div style={{fontSize:'20px', fontWeight:'800', lineHeight:'1.1'}}><span style={{color:'#1a2a4a'}}>Soul</span><span style={{color:'#7ab0f0'}}>MD</span></div>
      <div style={{fontSize:'9px', color:'#8aa0c0', letterSpacing:'4px'}}>AI CLINICAL SUITE</div>
    </div>
  </div>
);

const SoulMDLanding: React.FC<Props> = ({ onSignIn, onSignUp, onPrivacy, onTerms }) => (
  <div style={{...BG, display:'flex', flexDirection:'column'}}>
    <nav style={{padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(122,176,240,0.2)', flexWrap:'wrap', gap:'10px'}}>
      <SoulMDBrand/>
      <div style={{display:'flex', gap:'8px'}}>
        <button onClick={onSignIn} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'10px', padding:'8px 18px', fontSize:'13px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Sign In</button>
        <button onClick={onSignUp} style={{background:WORDMARK, border:'none', borderRadius:'10px', padding:'8px 18px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer'}}>Sign Up Free</button>
      </div>
    </nav>

    <section style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px 40px', textAlign:'center'}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', marginBottom:'28px'}}>
        <SoulMDLogo size={72}/>
        <div style={{fontSize:'36px', fontWeight:'800', lineHeight:'1.1', letterSpacing:'-0.5px'}}><span style={{color:'#1a2a4a'}}>Soul</span><span style={{color:'#7ab0f0'}}>MD</span></div>
        <div style={{fontSize:'9px', color:'#8aa0c0', letterSpacing:'4px'}}>AI CLINICAL SUITE</div>
      </div>
      <h1 style={{fontSize:'44px', fontWeight:'900', color:'#1a2a4a', lineHeight:'1.1', marginBottom:'14px', maxWidth:'720px', letterSpacing:'-1.2px'}}>
        Specialist-grade AI<br/>
        <span style={GRAD_TEXT}>for every decision</span>
      </h1>
      <p style={{fontSize:'16px', color:'#6a8ab0', lineHeight:'1.7', maxWidth:'560px', marginBottom:'28px'}}>Eight clinical tools, one login. Structured outputs, built for clinicians — powered by Claude.</p>
      <div style={{display:'flex', gap:'12px', flexWrap:'wrap', justifyContent:'center', marginBottom:'10px'}}>
        <button onClick={onSignUp} style={{background:WORDMARK, border:'none', borderRadius:'14px', padding:'14px 32px', fontSize:'15px', fontWeight:'700', color:'white', cursor:'pointer'}}>Sign Up Free</button>
        <button onClick={onSignIn} style={{background:'rgba(255,255,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'14px', padding:'14px 32px', fontSize:'15px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Sign In</button>
      </div>
    </section>

    <section style={{padding:'40px 20px', maxWidth:'1100px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
      <div style={{textAlign:'center', marginBottom:'28px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px'}}>Eight clinical tools</div>
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
        <PriceCard title="Any single tool"       subtitle="EKGScan · XrayRead · RxCheck · InfectID · ClinicalNote AI · CerebralAI" monthly="$9.99"  yearly="$89.99"  cta="Start single tool" onCta={onSignUp}/>
        <PriceCard title="Premium specialty"     subtitle="NephroAI · PalliativeMD"           monthly="$24.99" yearly="$179.99" cta="Start premium tool" onCta={onSignUp}/>
        <PriceCard title="SoulMD Suite"          subtitle="All 8 tools · one login"           monthly="$88.88" yearly="$888"    cta="Start Suite" onCta={onSignUp} highlighted/>
      </div>
      <div style={{textAlign:'center', fontSize:'12px', color:'#8aa0c0', marginTop:'18px'}}>All plans include a monthly AI budget. Additional calls beyond the budget are $0.10 each. Cancel anytime.</div>
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
      <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'10px', fontSize:'11px', color:'#8aa0c0'}}>
        <a href="https://soulmd.us" style={{color:'#8aa0c0', textDecoration:'none'}}>soulmd.us</a>
        <span>·</span>
        <a href="https://ekgscan.com" style={{color:'#8aa0c0', textDecoration:'none'}}>ekgscan.com</a>
        <span>·</span>
        <span>Data stored in United States</span>
      </div>
      <div style={{fontSize:'11px', lineHeight:'1.8'}}>For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. Not FDA-cleared. In emergencies, call 911.</div>
      <div style={{marginTop:'10px', fontSize:'11px', color:'#a0b0c8'}}>© {new Date().getFullYear()} SoulMD Inc. All rights reserved.</div>
    </footer>
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
