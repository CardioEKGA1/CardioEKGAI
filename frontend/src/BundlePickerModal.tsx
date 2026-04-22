// © 2026 SoulMD, LLC. All rights reserved.
// Bundle picker — Starter (1 premium + all 4 basic auto-included) or
// Clinical (2 basic + 2 premium). Selections are sent to the backend on
// checkout and stored in subscription metadata.
import React, { useMemo, useState } from 'react';

export const BUNDLE_BASIC_TOOLS = [
  { slug: 'ekgscan',      name: 'EKGScan',      desc: '12-lead EKG interpretation' },
  { slug: 'nephroai',     name: 'NephroAI',     desc: 'Nephrology decision support' },
  { slug: 'rxcheck',      name: 'RxCheck',      desc: 'Medication interaction safety' },
  { slug: 'antibioticai', name: 'AntibioticAI', desc: 'IDSA-based antibiotics' },
];
export const BUNDLE_PREMIUM_TOOLS = [
  { slug: 'clinicalnote', name: 'ClinicalNote AI', desc: 'AI notes in your voice' },
  { slug: 'cerebralai',   name: 'CerebralAI',      desc: 'Brain & spine imaging' },
  { slug: 'xrayread',     name: 'XrayRead',        desc: 'Structured X-ray reports' },
  { slug: 'palliativemd', name: 'PalliativeMD',    desc: 'Palliative conversations' },
];

interface BundleSpec {
  slug: 'bundle_starter' | 'bundle_clinical';
  label: string;
  monthly: number;
  yearly: number;
  aiBudget: number;
  basicPicks: number;   // how many basic tools to pick
  premiumPicks: number; // how many premium
  autoAllBasic: boolean; // Starter auto-includes all 4 basic
}

export const BUNDLE_SPECS: Record<string, BundleSpec> = {
  bundle_starter:  { slug: 'bundle_starter',  label: 'Starter Bundle',  monthly: 58.88, yearly: 499, aiBudget: 15, basicPicks: 0, premiumPicks: 1, autoAllBasic: true },
  bundle_clinical: { slug: 'bundle_clinical', label: 'Clinical Bundle', monthly: 55.55, yearly: 444, aiBudget: 20, basicPicks: 2, premiumPicks: 2, autoAllBasic: false },
};

interface Props {
  bundleSlug: 'bundle_starter' | 'bundle_clinical';
  onClose: () => void;
  onConfirm: (tier: 'monthly' | 'yearly', selectedTools: string[]) => void;
  loading?: boolean;
}

const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';

const BundlePickerModal: React.FC<Props> = ({ bundleSlug, onClose, onConfirm, loading }) => {
  const spec = BUNDLE_SPECS[bundleSlug];
  const [tier, setTier] = useState<'monthly' | 'yearly'>('monthly');
  const [basic, setBasic] = useState<string[]>([]);
  const [premium, setPremium] = useState<string[]>([]);

  const toggle = (list: string[], slug: string, max: number): string[] => {
    if (list.includes(slug)) return list.filter(s => s !== slug);
    if (list.length >= max) return list;   // ignore beyond limit
    return [...list, slug];
  };

  const valid = useMemo(() => {
    if (spec.autoAllBasic) return premium.length === spec.premiumPicks;
    return basic.length === spec.basicPicks && premium.length === spec.premiumPicks;
  }, [spec, basic, premium]);

  const confirm = () => {
    if (!valid) return;
    const selected = spec.autoAllBasic
      ? [...BUNDLE_BASIC_TOOLS.map(t => t.slug), ...premium]
      : [...basic, ...premium];
    onConfirm(tier, selected);
  };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:5000, background:'rgba(26,42,74,0.55)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'22px', maxWidth:'540px', width:'100%', maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 30px 70px rgba(26,42,74,0.35)', fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif'}}>
        {/* Header */}
        <div style={{padding:'20px 22px 14px', borderBottom:'1px solid rgba(122,176,240,0.2)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color:'#4a7ad0', fontWeight:800}}>{spec.label}</div>
            <button onClick={onClose} aria-label="Close" style={{background:'transparent', border:'none', fontSize:'20px', color:'#6a8ab0', cursor:'pointer', padding:'4px 8px', lineHeight:1}}>×</button>
          </div>
          <div style={{fontSize:'22px', fontWeight:800, color:'#1a2a4a', marginTop:'4px'}}>Choose your tools</div>
          <div style={{fontSize:'12px', color:'#6a8ab0', marginTop:'4px', lineHeight:1.5}}>
            {spec.autoAllBasic
              ? <>All 4 basic tools (EKGScan, NephroAI, RxCheck, AntibioticAI) are included. Pick <b>{spec.premiumPicks}</b> premium tool to round it out.</>
              : <>Pick <b>{spec.basicPicks}</b> basic tools and <b>{spec.premiumPicks}</b> premium tools. Total: 4 tools.</>}
          </div>
        </div>

        {/* Tier toggle */}
        <div style={{padding:'14px 22px 0', display:'flex', gap:'8px'}}>
          {(['monthly', 'yearly'] as const).map(t => {
            const active = tier === t;
            const amount = t === 'monthly' ? spec.monthly : spec.yearly;
            const suffix = t === 'monthly' ? '/mo' : '/yr';
            return (
              <button key={t} onClick={() => setTier(t)}
                style={{flex:1, background: active ? WORDMARK : 'rgba(240,246,255,0.7)', color: active ? 'white' : '#4a7ad0', border: active ? 'none' : '1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px', fontSize:'13px', fontWeight:800, cursor:'pointer', fontFamily:'inherit'}}>
                {t === 'monthly' ? 'Monthly' : 'Annual'} · ${amount.toLocaleString(undefined, {minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2})}{suffix}
              </button>
            );
          })}
        </div>

        {/* Picker body */}
        <div style={{padding:'14px 22px', overflow:'auto', flex:1}}>
          {/* Basic section */}
          <div style={{marginTop:'8px', marginBottom:'16px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px'}}>
              <div style={{fontSize:'11px', fontWeight:800, color:'#4a7ad0', letterSpacing:'1.5px', textTransform:'uppercase'}}>Basic tools</div>
              <div style={{fontSize:'11px', color:'#6a8ab0'}}>
                {spec.autoAllBasic ? 'All 4 included' : `${basic.length} / ${spec.basicPicks} selected`}
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
              {BUNDLE_BASIC_TOOLS.map(t => {
                const included = spec.autoAllBasic || basic.includes(t.slug);
                const atMax = !spec.autoAllBasic && basic.length >= spec.basicPicks && !basic.includes(t.slug);
                const interactive = !spec.autoAllBasic && !atMax;
                return (
                  <button key={t.slug}
                    disabled={spec.autoAllBasic || atMax}
                    onClick={() => !spec.autoAllBasic && setBasic(b => toggle(b, t.slug, spec.basicPicks))}
                    style={{
                      textAlign:'left', cursor: spec.autoAllBasic ? 'default' : atMax ? 'not-allowed' : 'pointer', fontFamily:'inherit',
                      border: included ? '2px solid #4a7ad0' : '1px solid rgba(122,176,240,0.2)',
                      background: included ? 'rgba(122,176,240,0.08)' : atMax ? 'rgba(240,246,255,0.35)' : 'white',
                      opacity: atMax ? 0.5 : 1,
                      borderRadius:'12px', padding:'10px 12px',
                    }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2px'}}>
                      <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a'}}>{t.name}</div>
                      {included && <span style={{fontSize:'14px', color:'#4a7ad0'}}>✓</span>}
                    </div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', lineHeight:1.4}}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Premium section */}
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px'}}>
              <div style={{fontSize:'11px', fontWeight:800, color:'#9b8fe8', letterSpacing:'1.5px', textTransform:'uppercase'}}>Premium tools</div>
              <div style={{fontSize:'11px', color:'#6a8ab0'}}>{premium.length} / {spec.premiumPicks} selected</div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
              {BUNDLE_PREMIUM_TOOLS.map(t => {
                const included = premium.includes(t.slug);
                const atMax = premium.length >= spec.premiumPicks && !included;
                return (
                  <button key={t.slug}
                    disabled={atMax}
                    onClick={() => setPremium(p => toggle(p, t.slug, spec.premiumPicks))}
                    style={{
                      textAlign:'left', cursor: atMax ? 'not-allowed' : 'pointer', fontFamily:'inherit',
                      border: included ? '2px solid #9b8fe8' : '1px solid rgba(155,143,232,0.25)',
                      background: included ? 'rgba(155,143,232,0.1)' : atMax ? 'rgba(240,240,250,0.4)' : 'white',
                      opacity: atMax ? 0.5 : 1,
                      borderRadius:'12px', padding:'10px 12px',
                    }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2px'}}>
                      <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a'}}>{t.name}</div>
                      {included && <span style={{fontSize:'14px', color:'#9b8fe8'}}>✓</span>}
                    </div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', lineHeight:1.4}}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'16px', lineHeight:1.5, textAlign:'center'}}>
            AI budget included in this bundle: <b>${spec.aiBudget}/month</b>. Overage billed at $0.10/call.
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'14px 22px', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(240,246,255,0.5)', display:'flex', gap:'8px', justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{background:'white', border:'1px solid rgba(122,176,240,0.3)', color:'#4a7ad0', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>Cancel</button>
          <button onClick={confirm} disabled={!valid || !!loading}
            style={{background: valid ? WORDMARK : 'rgba(200,200,200,0.35)', border:'none', color:'white', borderRadius:'10px', padding:'10px 22px', fontSize:'13px', fontWeight:800, cursor: (!valid || loading) ? 'default' : 'pointer', opacity: (!valid || loading) ? 0.65 : 1, fontFamily:'inherit'}}>
            {loading ? 'Opening Stripe…' : `Continue to checkout →`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BundlePickerModal;
