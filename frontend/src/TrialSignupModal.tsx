// © 2026 SoulMD, LLC. All rights reserved.
// Warm opal signup modal that fires after a patient's first free tool use.
// Listens globally for `soulmd:trial-used`; the tool's result stays rendered
// behind the modal (dimmed + blurred) so the user can see the value.
import React, { useEffect, useState } from 'react';

interface Props {
  onSignUp: () => void;
  onSeePricing: () => void;
  userAuthenticated: boolean;
}

const TOOL_NAMES: Record<string, string> = {
  ekgscan: 'EKGScan',
  nephroai: 'NephroAI',
  xrayread: 'XrayRead',
  rxcheck: 'RxCheck',
  antibioticai: 'AntibioticAI',
  clinicalnote: 'ClinicalNote AI',
  cerebralai: 'CerebralAI',
  palliativemd: 'PalliativeMD',
};

const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
const OPAL_BG  = 'linear-gradient(135deg, #E0F4FA 0%, #F6BFD3 100%)';

const TrialSignupModal: React.FC<Props> = ({ onSignUp, onSeePricing, userAuthenticated }) => {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    // Don't nag subscribers — if they're authed, let the backend decide and
    // skip the modal entirely (authed subscriber flows never return
    // _trial_mode:true).
    if (userAuthenticated) return;
    const onUsed = (e: Event) => {
      const ce = e as CustomEvent<{slug: string}>;
      if (ce.detail?.slug) {
        setActiveSlug(ce.detail.slug);
        // Allow the tool's result to paint first so the modal overlays a
        // meaningful backdrop, not a blank card.
      }
    };
    window.addEventListener('soulmd:trial-used', onUsed as EventListener);
    return () => window.removeEventListener('soulmd:trial-used', onUsed as EventListener);
  }, [userAuthenticated]);

  if (!activeSlug) return null;
  const toolName = TOOL_NAMES[activeSlug] || 'SoulMD';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:5000,
      background:'rgba(26,42,74,0.45)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px',
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
    }}>
      <div style={{
        background: OPAL_BG, borderRadius:'22px', padding:'28px 24px',
        maxWidth:'440px', width:'100%', maxHeight:'92vh', overflow:'auto',
        boxShadow:'0 30px 70px rgba(26,42,74,0.35)',
        border:'1px solid rgba(255,255,255,0.9)',
        position:'relative',
      }}>
        <button onClick={() => setActiveSlug(null)} aria-label="Dismiss"
          style={{position:'absolute', top:'12px', right:'12px', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(107,78,124,0.15)', borderRadius:'999px', width:'28px', height:'28px', fontSize:'16px', lineHeight:1, color:'#6b4e7c', cursor:'pointer', padding:0, fontFamily:'inherit'}}>×</button>

        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px'}}>
          <div style={{width:'40px', height:'40px', borderRadius:'12px', background: WORDMARK, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'14px'}}>SMD</div>
          <div>
            <div style={{fontSize:'11px', letterSpacing:'2.5px', textTransform:'uppercase', color:'#6b4e7c', fontWeight:700}}>SoulMD</div>
            <div style={{fontSize:'11px', color:'#6b4e7c', opacity:0.7}}>AI Clinical Suite</div>
          </div>
        </div>

        <div style={{fontSize:'22px', fontWeight:800, color:'#1a2a4a', lineHeight:1.2, marginBottom:'6px'}}>
          You just experienced {toolName} <span style={{fontWeight:400}}>✨</span>
        </div>
        <div style={{fontSize:'13px', color:'#4a5e6a', lineHeight:1.6}}>
          Join thousands of clinicians using AI-powered clinical decision support.
        </div>

        <ul style={{listStyle:'none', padding:0, margin:'18px 0', display:'flex', flexDirection:'column', gap:'8px'}}>
          {[
            'Unlimited analyses across every tool',
            'All 8 clinical tools, plus LabRead + CliniScore',
            'Voice dictation on every input',
            'Recent cases saved automatically',
            'Cancel anytime — no commitment',
          ].map((line) => (
            <li key={line} style={{display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'13px', color:'#1a2a4a'}}>
              <span style={{color:'#4a9a4a', fontWeight:800, marginTop:'1px'}}>✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          <button onClick={onSignUp}
            style={{background: WORDMARK, border:'none', borderRadius:'14px', padding:'13px 20px', fontSize:'14px', fontWeight:800, color:'white', cursor:'pointer', boxShadow:'0 10px 22px rgba(122,176,240,0.35)'}}>
            Start free — Sign up with email
          </button>
          <button onClick={onSeePricing}
            style={{background:'rgba(255,255,255,0.8)', border:'1px solid rgba(107,78,124,0.2)', borderRadius:'14px', padding:'12px 20px', fontSize:'13px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>
            See pricing
          </button>
        </div>

        <div style={{fontSize:'11px', color:'#6b4e7c', opacity:0.75, marginTop:'14px', textAlign:'center'}}>
          Your free trial result is shown below.
        </div>
      </div>
    </div>
  );
};

export default TrialSignupModal;
