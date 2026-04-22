// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import ComplianceDisclaimer from '../ComplianceDisclaimer';

interface Props {
  onAnalyze: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onTerms: () => void;
  onPrivacy?: () => void;
}

const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';

const SUITE_TOOLS: {icon: string; name: string; desc: string}[] = [
  { icon: '🫀', name: 'EKGScan',         desc: '12-lead EKG interpretation in seconds' },
  { icon: '🫘', name: 'NephroAI',        desc: 'Comprehensive nephrology decision support' },
  { icon: '🩻', name: 'XrayRead',        desc: 'Structured radiology report from any X-ray' },
  { icon: '💊', name: 'RxCheck',         desc: 'Medication interaction safety check' },
  { icon: '🦠', name: 'AntibioticAI',        desc: 'IDSA-based antibiotic recommendations' },
  { icon: '📝', name: 'ClinicalNote AI', desc: 'Clinical notes in your voice — SOAP, H&P, discharge, consult, procedure + AI style learning' },
  { icon: '🧠', name: 'CerebralAI',      desc: 'Brain and spine MRI/CT interpretation' },
  { icon: '🫶', name: 'PalliativeMD',    desc: 'Goals of care, prognosis, family meetings' },
  { icon: '🧪', name: 'LabRead',         desc: 'AI lab-panel interpretation with flagged values' },
  { icon: '📊', name: 'CliniScore',        desc: 'Clinical risk calculators with AI interpretation' },
];

const VALUE_PROPS: {icon: string; title: string; body: string}[] = [
  { icon: '⚡', title: 'AI-powered',        body: 'Powered by Claude — structured clinical output in seconds, not minutes.' },
  { icon: '🩺', title: 'Physician-built',   body: 'Designed by practicing clinicians for the way you actually read EKGs at bedside.' },
  { icon: '📋', title: 'Structured output', body: 'Rhythm, rate, intervals, axis, impression, and urgent flags — every time, in the same format.' },
];

const Landing: React.FC<Props> = ({ onAnalyze, onSignIn, onSignUp, onTerms, onPrivacy }) => {
  const openSoulMD = () => { window.location.href = 'https://soulmd.us'; };
  return (
    <div style={{minHeight:'100vh', display:'flex', flexDirection:'column', background:'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', overflowX:'hidden'}}>

      {/* NAV */}
      <nav style={{padding:'14px clamp(16px,4vw,40px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(122,176,240,0.2)', flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', minWidth:0}}>
          <div style={{width:'36px', height:'36px', borderRadius:'10px', background:WORDMARK, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
            <svg width="20" height="14" viewBox="0 0 20 14"><polyline points="0,7 3,7 5,1 7,13 9,4 11,10 13,7 20,7" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a'}}>EKGScan</div>
            <div style={{fontSize:'9px', color:'#8aa0c0', letterSpacing:'1px', textTransform:'uppercase'}}>by SoulMD</div>
          </div>
        </div>
        <div style={{display:'flex', gap:'6px', alignItems:'center', flexShrink:0}}>
          <button onClick={onSignIn} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:600, color:'#4a7ad0', cursor:'pointer', whiteSpace:'nowrap'}}>Sign In</button>
          <button onClick={onSignUp} style={{background:WORDMARK, border:'none', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:'white', cursor:'pointer', whiteSpace:'nowrap'}}>Sign Up Free</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{padding:'clamp(40px,10vw,80px) clamp(16px,5vw,24px) clamp(40px,7vw,60px)', textAlign:'center', maxWidth:'800px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
        <div style={{fontSize:'11px', fontWeight:600, color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'18px', background:'rgba(122,176,240,0.12)', padding:'6px 16px', borderRadius:'20px', display:'inline-block'}}>AI-Powered EKG Analysis</div>
        <h1 style={{fontSize:'clamp(28px,7.5vw,56px)', fontWeight:900, color:'#1a2a4a', lineHeight:1.1, margin:'0 0 20px 0', letterSpacing:'-0.5px', overflowWrap:'break-word'}}>
          <span style={{display:'block'}}>12-lead EKG interpretation</span>
          <span style={{display:'block', background:WORDMARK, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>in seconds</span>
        </h1>
        <p style={{fontSize:'clamp(15px,1.8vw,19px)', color:'#6a8ab0', lineHeight:1.6, margin:'0 auto 36px auto', maxWidth:'580px'}}>
          Upload any 12-lead tracing. Get back rhythm, rate, intervals, axis, impression, and urgent flags — in the same structured format every time.
        </p>
        <div style={{display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap'}}>
          <button onClick={onAnalyze} style={{background:WORDMARK, border:'none', borderRadius:'16px', padding:'16px 36px', fontSize:'16px', fontWeight:700, color:'white', cursor:'pointer', boxShadow:'0 8px 24px rgba(122,176,240,0.35)'}}>Analyze an EKG →</button>
          <button onClick={onSignIn} style={{background:'rgba(255,255,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'16px', padding:'16px 32px', fontSize:'16px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Sign In</button>
        </div>
        <div style={{marginTop:'28px', display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap', fontSize:'12px', color:'#4a7ad0', fontWeight:500}}>
          <span style={{background:'rgba(255,255,255,0.6)', borderRadius:'20px', padding:'6px 14px'}}>1 free scan included</span>
          <span style={{background:'rgba(255,255,255,0.6)', borderRadius:'20px', padding:'6px 14px'}}>No credit card for first scan</span>
          <span style={{background:'rgba(255,255,255,0.6)', borderRadius:'20px', padding:'6px 14px'}}>Cancel anytime</span>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section style={{padding:'20px 24px 80px', maxWidth:'1000px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'18px'}}>
          {VALUE_PROPS.map(v => (
            <div key={v.title} style={{background:'rgba(255,255,255,0.75)', borderRadius:'20px', padding:'28px 24px', border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 4px 20px rgba(100,130,200,0.08)'}}>
              <div style={{fontSize:'32px', marginBottom:'12px'}}>{v.icon}</div>
              <div style={{fontSize:'15px', fontWeight:800, color:'#1a2a4a', marginBottom:'6px'}}>{v.title}</div>
              <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:1.65}}>{v.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MEET THE SUITE */}
      <section style={{padding:'60px 24px', background:'rgba(255,255,255,0.5)', borderTop:'1px solid rgba(122,176,240,0.18)', borderBottom:'1px solid rgba(122,176,240,0.18)'}}>
        <div style={{maxWidth:'1040px', margin:'0 auto', textAlign:'center'}}>
          <div style={{fontSize:'11px', fontWeight:700, color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'14px'}}>Meet the Suite</div>
          <h2 style={{fontSize:'clamp(26px,5.5vw,34px)', fontWeight:900, color:'#1a2a4a', margin:'0 0 10px 0', letterSpacing:'-0.5px'}}>EKGScan is one of ten.</h2>
          <p style={{fontSize:'15px', color:'#6a8ab0', lineHeight:1.65, maxWidth:'620px', margin:'0 auto 40px auto'}}>
            Love EKGScan? You'll love the rest. SoulMD is a full clinical-AI suite covering cardiology, nephrology, radiology, pharmacology, infectious disease, documentation, neurology, and palliative care.
          </p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'14px', marginBottom:'36px'}}>
            {SUITE_TOOLS.map(t => (
              <div key={t.name} style={{background:'rgba(255,255,255,0.9)', borderRadius:'16px', padding:'20px', textAlign:'left', border:'1px solid rgba(255,255,255,0.95)', boxShadow:'0 2px 10px rgba(100,130,200,0.06)'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                  <span style={{fontSize:'22px', lineHeight:1}}>{t.icon}</span>
                  <span style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a'}}>{t.name}</span>
                </div>
                <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.55}}>{t.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={openSoulMD} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'14px', padding:'14px 28px', fontSize:'14px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Explore SoulMD Suite →</button>
        </div>
      </section>

      {/* PRICING */}
      <section style={{padding:'80px 24px', maxWidth:'1000px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <div style={{fontSize:'11px', fontWeight:700, color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'12px'}}>Pricing</div>
          <h2 style={{fontSize:'clamp(24px,5vw,34px)', fontWeight:900, color:'#1a2a4a', margin:'0 0 10px 0', letterSpacing:'-0.5px'}}>Start free. Scale when you need to.</h2>
          <p style={{fontSize:'15px', color:'#6a8ab0', lineHeight:1.65, maxWidth:'580px', margin:'0 auto'}}>
            EKGScan alone is $9.99/month. But most clinicians get more from the full Suite — every tool, one subscription.
          </p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'20px', alignItems:'stretch'}}>

          {/* EKGScan single-tool card */}
          <div style={{background:'rgba(255,255,255,0.85)', borderRadius:'22px', padding:'32px 28px', border:'1px solid rgba(255,255,255,0.95)', boxShadow:'0 4px 20px rgba(100,130,200,0.08)', display:'flex', flexDirection:'column'}}>
            <div style={{fontSize:'13px', fontWeight:700, color:'#8aa0c0', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px'}}>EKGScan only</div>
            <div style={{fontSize:'40px', fontWeight:900, color:'#1a2a4a', lineHeight:1, marginBottom:'4px'}}>$9.99<span style={{fontSize:'16px', color:'#8aa0c0', fontWeight:600}}>/mo</span></div>
            <div style={{fontSize:'13px', color:'#6a8ab0', marginBottom:'20px'}}>or $89.99/year — save ~$30/yr</div>
            <ul style={{listStyle:'none', padding:0, margin:'0 0 24px 0', fontSize:'13px', color:'#4a5e6a', lineHeight:1.9}}>
              <li>✓ Unlimited 12-lead EKG analyses</li>
              <li>✓ AI cardiology chat follow-ups</li>
              <li>✓ Structured output every time</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <button onClick={onAnalyze} style={{marginTop:'auto', background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'14px', padding:'14px', fontSize:'14px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Start with EKGScan →</button>
          </div>

          {/* Suite featured card */}
          <div style={{background:WORDMARK, borderRadius:'22px', padding:'32px 28px', boxShadow:'0 12px 40px rgba(122,176,240,0.35)', color:'white', display:'flex', flexDirection:'column', position:'relative'}}>
            <div style={{position:'absolute', top:'16px', right:'16px', fontSize:'11px', fontWeight:700, background:'rgba(255,255,255,0.25)', padding:'4px 10px', borderRadius:'999px', letterSpacing:'0.5px'}}>BEST VALUE</div>
            <div style={{fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.85)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px'}}>SoulMD Suite</div>
            <div style={{fontSize:'40px', fontWeight:900, lineHeight:1, marginBottom:'4px'}}>$88.88<span style={{fontSize:'16px', fontWeight:600, opacity:0.8}}>/mo</span></div>
            <div style={{fontSize:'13px', opacity:0.85, marginBottom:'20px'}}>or $888/year — save ~$179/yr</div>
            <ul style={{listStyle:'none', padding:0, margin:'0 0 24px 0', fontSize:'13px', lineHeight:1.9}}>
              <li>✓ All 10 clinical-AI tools</li>
              <li>✓ EKGScan · NephroAI · XrayRead · RxCheck</li>
              <li>✓ AntibioticAI · ClinicalNote · CerebralAI</li>
              <li>✓ PalliativeMD · LabRead · CliniScore</li>
              <li>✓ One subscription, one login</li>
            </ul>
            <button onClick={openSoulMD} style={{marginTop:'auto', background:'white', border:'none', borderRadius:'14px', padding:'14px', fontSize:'14px', fontWeight:800, color:'#4a7ad0', cursor:'pointer', boxShadow:'0 4px 14px rgba(0,0,0,0.08)'}}>Get the Suite at soulmd.us →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'32px 24px 40px', textAlign:'center', fontSize:'12px', color:'#6a8ab0', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(255,255,255,0.5)'}}>
        <div style={{display:'flex', gap:'18px', justifyContent:'center', flexWrap:'wrap', marginBottom:'12px', fontWeight:600}}>
          <a href="https://soulmd.us" style={{color:'#4a7ad0', textDecoration:'none'}}>soulmd.us</a>
          <a href="mailto:support@soulmd.us" style={{color:'#4a7ad0', textDecoration:'none'}}>support@soulmd.us</a>
          {onPrivacy && <a href="/privacy" onClick={e=>{e.preventDefault(); onPrivacy();}} style={{color:'#4a7ad0', textDecoration:'none', cursor:'pointer'}}>Privacy Policy</a>}
          <a href="/terms" onClick={e=>{e.preventDefault(); onTerms();}} style={{color:'#4a7ad0', textDecoration:'none', cursor:'pointer'}}>Terms of Service</a>
        </div>
        <ComplianceDisclaimer/>
        <div style={{fontSize:'11px', color:'#a0b0c8', lineHeight:1.7, maxWidth:'640px', margin:'10px auto 0 auto'}}>
          For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. Not FDA-cleared. In emergencies, call 911.
        </div>
        <div style={{fontSize:'11px', color:'#a0b0c8', marginTop:'10px'}}>© 2026 SoulMD, LLC. All rights reserved.</div>
      </footer>
    </div>
  );
};
export default Landing;
