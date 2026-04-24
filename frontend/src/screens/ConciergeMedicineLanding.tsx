// © 2026 SoulMD, LLC. All rights reserved.
// /concierge-medicine — production-quality public landing for the
// concierge practice. Currently gated to superusers in App.tsx; designed
// to go fully public without further design work. Prices are pulled from
// the same constants the billing code already uses, so tier copy can never
// drift from what Stripe actually charges.
import React from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { PATIENT_BG, NAVY, PURPLE, PURPLE_SOFT, GOLD, GOLD_SOFT, SERIF, SparkleLayer, SparkleDivider } from './patient/shared';

interface Props { onBack?: () => void; }

interface Tier {
  id: 'awaken' | 'align' | 'ascend';
  label: string;
  tagline: string;
  monthly: number;      // USD / month (matches backend CONCIERGE_TIER_PRICE)
  yearly: number;       // USD / year
  visits: number;
  meditations: number;
  included: string[];
  featured?: boolean;
  accent: string;
}

// Source of truth for tier copy — kept in sync with
// `CONCIERGE_TIER_PRICE` in backend/main.py and the allowances block in
// /concierge/me. Do not edit prices here; change them in the backend and
// mirror here.
const TIERS: Tier[] = [
  {
    id: 'awaken',
    label: 'Awaken',
    tagline: 'Begin the practice',
    monthly: 444,
    yearly: 5000,
    visits: 2,
    meditations: 1,
    included: [
      '2 medical visits / month (up to 30 min each)',
      '1 guided meditation / month',
      'Secure direct messaging with Dr. Anderson',
      'Daily oracle card and energy log',
      'Access to the meditation & coaching library',
    ],
    accent: '#7ab0f0',
  },
  {
    id: 'align',
    label: 'Align',
    tagline: 'Deepen the work',
    monthly: 888,
    yearly: 10000,
    visits: 3,
    meditations: 2,
    included: [
      '3 medical visits / month (up to 30 min each)',
      '2 guided meditations / month',
      'Lab-review turnaround within 48 hours',
      'Priority messaging',
      'Everything in Awaken',
    ],
    featured: true,
    accent: '#9b8fe8',
  },
  {
    id: 'ascend',
    label: 'Ascend',
    tagline: 'Fully integrated care',
    monthly: 1111,
    yearly: 13000,
    visits: 5,
    meditations: 4,
    included: [
      '5 medical visits / month (up to 30 min each)',
      '4 guided meditations / month',
      'Same-day scheduling',
      'Monthly integrative review with Dr. Anderson',
      'Urgent same-day consult included (normally $444)',
      'Everything in Align',
    ],
    accent: '#C9A84C',
  },
];

// Mirror of `CONCIERGE_ALA_CARTE` in backend/main.py. À la carte items
// are available to non-members and as overflow for members.
const ALA_CARTE: { label: string; price: string }[] = [
  { label: 'Medical consultation (30 min)',           price: '$300' },
  { label: 'Extended visit (additional 15 min)',      price: '$150' },
  { label: 'Guided meditation (30 min)',              price: '$44'  },
  { label: 'Urgent same-day consult',                 price: '$444' },
  { label: 'Lab result review + async message',       price: '$75'  },
];

const money = (n: number) => `$${n.toLocaleString()}`;

const TierCard: React.FC<{ t: Tier }> = ({ t }) => (
  <div style={{
    position:'relative',
    background:'rgba(255,255,255,0.88)',
    backdropFilter:'blur(14px)',
    WebkitBackdropFilter:'blur(14px)',
    borderRadius:'22px',
    padding:'28px 22px',
    border: t.featured ? `2px solid ${t.accent}` : `1px solid ${GOLD_SOFT}`,
    boxShadow: t.featured
      ? `0 24px 48px ${t.accent}2e, 0 0 0 6px rgba(255,255,255,0.6)`
      : '0 18px 36px rgba(83,74,183,0.1)',
    display:'flex', flexDirection:'column', gap:'12px',
    minHeight:'560px',
  }}>
    {t.featured && (
      <div style={{
        position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)',
        background: t.accent, color:'white',
        fontSize:'10px', fontWeight:800, letterSpacing:'1.8px', textTransform:'uppercase',
        padding:'5px 14px', borderRadius:'999px', whiteSpace:'nowrap',
        boxShadow: `0 8px 16px ${t.accent}55`,
      }}>Most chosen</div>
    )}
    <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
      <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color: t.accent, fontWeight:800}}>
        {t.label}
      </div>
      <span style={{color: GOLD, fontSize:'11px', letterSpacing:'1px'}}>✦</span>
    </div>
    <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'16px', color: PURPLE_SOFT, marginTop:'-4px'}}>
      {t.tagline}
    </div>
    <div style={{display:'flex', alignItems:'baseline', gap:'6px', marginTop:'6px'}}>
      <div style={{fontSize:'38px', fontWeight:800, color: NAVY, lineHeight:1, letterSpacing:'-1px'}}>
        {money(t.monthly)}
      </div>
      <div style={{fontSize:'14px', color: PURPLE_SOFT, fontWeight:600}}>/ month</div>
    </div>
    <div style={{fontSize:'12px', color: PURPLE_SOFT}}>
      or <b style={{color: NAVY, fontWeight:700}}>{money(t.yearly)}</b> / year
    </div>
    <div style={{height:'0.5px', background:`linear-gradient(90deg, transparent, ${GOLD}66, transparent)`, margin:'4px 0 6px'}}/>
    <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
      <span style={{fontSize:'11px', letterSpacing:'1.5px', textTransform:'uppercase', color: NAVY, fontWeight:800}}>
        {t.visits}
      </span>
      <span style={{fontSize:'12px', color: PURPLE_SOFT}}>visits / mo</span>
      <span style={{color: GOLD}}>·</span>
      <span style={{fontSize:'11px', letterSpacing:'1.5px', textTransform:'uppercase', color: NAVY, fontWeight:800}}>
        {t.meditations}
      </span>
      <span style={{fontSize:'12px', color: PURPLE_SOFT}}>meditation{t.meditations === 1 ? '' : 's'} / mo</span>
    </div>
    <ul style={{listStyle:'none', padding:0, margin:'10px 0 0', display:'flex', flexDirection:'column', gap:'8px'}}>
      {t.included.map(line => (
        <li key={line} style={{fontSize:'13px', color: NAVY, display:'flex', gap:'8px', alignItems:'flex-start', lineHeight:1.5}}>
          <span style={{color: t.accent, flexShrink:0, fontWeight:800, fontSize:'13px'}}>✓</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  </div>
);

const ConciergeMedicineLanding: React.FC<Props> = ({ onBack }) => {
  return (
    <div style={{minHeight:'100vh', background: PATIENT_BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', position:'relative', overflow:'hidden'}}>
      <SparkleLayer count={24}/>

      <main style={{position:'relative', zIndex:1, maxWidth:'1080px', margin:'0 auto', padding:'28px clamp(14px,3vw,28px) 60px'}}>

        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'10px'}}>
          {onBack ? (
            <button onClick={onBack} style={{background:'rgba(255,255,255,0.7)', border:`0.5px solid rgba(83,74,183,0.2)`, borderRadius:'12px', padding:'8px 12px', fontSize:'12px', fontWeight:700, color: PURPLE, cursor:'pointer', fontFamily:'inherit'}}>
              ← SoulMD
            </button>
          ) : <span/>}
          <SoulMDLogo size={32} subtitle="CONCIERGE MEDICINE"/>
        </div>

        {/* Hero */}
        <section style={{textAlign:'center', padding:'24px 0 8px'}}>
          <div style={{display:'inline-flex', alignItems:'center', gap:'10px', padding:'6px 14px', border:`1px solid ${GOLD}66`, borderRadius:'999px', background:'rgba(255,255,255,0.6)', marginBottom:'18px'}}>
            <span style={{color: GOLD, fontSize:'11px'}}>✦</span>
            <span style={{fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase', color: NAVY, fontWeight:800}}>
              By Invitation Only
            </span>
            <span style={{color: GOLD, fontSize:'11px'}}>✦</span>
          </div>
          <h1 style={{fontFamily: SERIF, fontSize:'clamp(36px,7vw,56px)', fontWeight:600, color: NAVY, lineHeight:1.1, letterSpacing:'-1px', margin:0}}>
            SoulMD Concierge Medicine
          </h1>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'clamp(17px,3vw,21px)', color: PURPLE, marginTop:'12px', letterSpacing:'0.2px'}}>
            Where Science Meets the Soul
          </div>
          <p style={{fontSize:'clamp(14px,2.4vw,16px)', color: NAVY, lineHeight:1.7, maxWidth:'620px', margin:'22px auto 0', opacity:0.9}}>
            A private integrative medicine practice blending evidence-based care with life coaching, guided meditations, and daily messages from the Universe. Unhurried visits, direct access to your physician, and a digital companion that walks with you between appointments.
          </p>
        </section>

        <SparkleDivider/>

        {/* Tiers */}
        <section style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'18px', marginTop:'8px'}}>
          {TIERS.map(t => <TierCard key={t.id} t={t}/>)}
        </section>

        {/* À la carte */}
        <section style={{marginTop:'36px', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderRadius:'22px', padding:'24px 24px', border:`1px solid ${GOLD_SOFT}`}}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase', color: GOLD, fontWeight:800}}>À la carte</div>
              <div style={{fontFamily: SERIF, fontSize:'22px', color: NAVY, marginTop:'4px'}}>Available to non-members</div>
            </div>
            <div style={{fontSize:'11px', color: PURPLE_SOFT, fontStyle:'italic'}}>
              Members overflow pricing at the same rates.
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
            {ALA_CARTE.map(({label, price}) => (
              <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'10px 0', borderBottom:'1px dashed rgba(83,74,183,0.12)', fontSize:'14px', color: NAVY}}>
                <span>{label}</span>
                <span style={{fontWeight:800, letterSpacing:'0.3px'}}>{price}</span>
              </div>
            ))}
          </div>
        </section>

        <SparkleDivider/>

        {/* Invitation */}
        <section style={{textAlign:'center', marginTop:'12px', padding:'24px 20px', background:'linear-gradient(135deg, rgba(245,241,255,0.75), rgba(246,191,211,0.15))', borderRadius:'22px', border:`1px solid ${GOLD}33`}}>
          <div style={{fontFamily: SERIF, fontSize:'clamp(22px,4vw,28px)', color: NAVY, fontWeight:600, lineHeight:1.25, maxWidth:'520px', margin:'0 auto'}}>
            This practice accepts new members by invitation only.
          </div>
          <div style={{fontSize:'14px', color: NAVY, lineHeight:1.7, marginTop:'14px', maxWidth:'520px', margin:'14px auto 0', opacity:0.88}}>
            If you received an invitation, contact{' '}
            <a href="mailto:anderson@soulmd.us?subject=Concierge%20invitation" style={{color: PURPLE, textDecoration:'none', fontWeight:800}}>
              anderson@soulmd.us
            </a>{' '}
            to begin your journey.
          </div>
        </section>

        {/* Footer disclaimer */}
        <div style={{marginTop:'28px', fontSize:'11px', color: PURPLE_SOFT, textAlign:'center', lineHeight:1.7, maxWidth:'620px', margin:'28px auto 0', opacity:0.8}}>
          Direct-pay medical practice. Not insurance. Currently in beta and not yet HIPAA compliant — do not enter identifying patient information during beta. For emergencies, call 911.
        </div>
      </main>
    </div>
  );
};

export default ConciergeMedicineLanding;
