// © 2026 SoulMD. All rights reserved.
import React, { useEffect, useState, useCallback } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { User } from '../App';

interface Props {
  API: string;
  token: string;
  user: User;
  onLogout: () => void;
  onOpenEkgscan: () => void;
  onOpenTool: (slug: string) => void;
  checkoutResult: string | null;
}

const TEXT_TOOLS = new Set(['nephroai', 'rxcheck', 'infectid', 'clinicalnote']);

const TOOLS = [
  { slug: 'ekgscan',      name: 'EKGScan',         icon: '🫀', desc: '12-lead EKG interpretation in seconds',                      monthly: 4.99,  yearly: 44.44 },
  { slug: 'nephroai',     name: 'NephroAI',        icon: '🫘', desc: 'Comprehensive AI nephrology — 10 conditions, one platform', monthly: 9.99,  yearly: 88.88 },
  { slug: 'xrayread',     name: 'XrayRead',        icon: '🩻', desc: 'Structured radiology report from any X-ray image',          monthly: 4.99,  yearly: 44.44 },
  { slug: 'rxcheck',      name: 'RxCheck',         icon: '💊', desc: 'Full medication interaction safety check',                  monthly: 4.99,  yearly: 44.44 },
  { slug: 'infectid',     name: 'InfectID',        icon: '🦠', desc: 'IDSA-based antibiotic recommendations',                     monthly: 4.99,  yearly: 44.44 },
  { slug: 'clinicalnote', name: 'ClinicalNote AI', icon: '📝', desc: 'SOAP notes from bullet points in seconds',                  monthly: 29.99, yearly: 222.00 },
  { slug: 'cerebralai',   name: 'CerebralAI',      icon: '🧠', desc: 'Brain and spine MRI and CT interpretation',                 monthly: 4.99,  yearly: 44.44 },
];

const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)', borderRadius:'20px', padding:'20px', boxShadow:'0 4px 20px rgba(100,130,200,0.1)', border:'1px solid rgba(255,255,255,0.9)'};
const BTN: React.CSSProperties = {border:'1px solid rgba(122,176,240,0.3)',borderRadius:'10px',padding:'6px 10px',fontSize:'11px',fontWeight:'700',cursor:'pointer',background:'rgba(255,255,255,0.85)',color:'#4a7ad0',flex:1};

const money = (n: number) => n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;

interface AccessResp {
  is_superuser: boolean;
  access: Record<string, boolean>;
  budget: number | null;
  spent: number;
  note_style_preference: string;
}

const SuiteDashboard: React.FC<Props> = ({ API, token, user, onLogout, onOpenEkgscan, onOpenTool, checkoutResult }) => {
  const [access, setAccess] = useState<AccessResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<string>('');

  const loadAccess = useCallback(() => {
    fetch(`${API}/tools/access`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setAccess(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { loadAccess(); }, [loadAccess]);

  useEffect(() => {
    if (checkoutResult === 'success') {
      setBanner('Subscription activated. Your access will appear below within a few seconds.');
      const retry = setTimeout(loadAccess, 4000);
      return () => clearTimeout(retry);
    }
    if (checkoutResult === 'cancel') {
      setBanner('Checkout canceled. No charge was made.');
    }
  }, [checkoutResult, loadAccess]);

  const subscribe = async (tool_slug: string, tier: 'monthly' | 'yearly') => {
    setCheckoutLoading(`${tool_slug}_${tier}`);
    try {
      const res = await fetch(`${API}/billing/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tool_slug, tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.detail || 'Could not start checkout');
      window.location.href = data.url;
    } catch (e: any) {
      setBanner(`Checkout failed: ${e.message}`);
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    try {
      const res = await fetch(`${API}/billing/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.detail || 'No billing account on file yet.');
      window.location.href = data.url;
    } catch (e: any) {
      setBanner(`${e.message}`);
    }
  };

  const isSuper = !!access?.is_superuser;
  const hasAccess = (slug: string) => isSuper || !!access?.access?.[slug];
  const tierLabel = isSuper ? 'Superuser · Unlimited' : (user.is_subscribed ? 'Subscribed' : 'Free tier');
  const budgetLine = access && access.budget !== null
    ? `$${access.spent.toFixed(2)} / $${access.budget.toFixed(2)} this month`
    : null;
  const hasAnyPaidSub = access && !isSuper && access.budget !== null && access.budget > 0;

  return (
    <div style={{minHeight:'100vh', background:'linear-gradient(135deg, #dce8fb 0%, #ede8fb 100%)', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif'}}>
    <div style={{padding:'20px 16px', maxWidth:'1200px', margin:'0 auto'}}>
      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <SoulMDLogo size={40}/>
          <div>
            <div style={{fontSize:'20px', fontWeight:'800', lineHeight:'1.1'}}><span style={{color:'#1a2a4a'}}>Soul</span><span style={{color:'#7ab0f0'}}>MD</span></div>
            <div style={{fontSize:'9px', color:'#8aa0c0', letterSpacing:'4px'}}>AI CLINICAL SUITE</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', fontSize:'11px', color:'#6a8ab0'}}>
            <span style={{fontWeight:'600', color:'#1a2a4a', fontSize:'12px', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.email}</span>
            <span style={{background: isSuper ? WORDMARK : 'rgba(122,176,240,0.12)', color: isSuper ? 'white' : '#4a7ad0', borderRadius:'10px', padding:'3px 9px', fontWeight:'700', marginTop:'3px'}}>{tierLabel}</span>
            {budgetLine && <span style={{marginTop:'3px', color:'#8aa0c0', fontSize:'10px'}}>{budgetLine}</span>}
          </div>
          {hasAnyPaidSub && <button onClick={openPortal} style={{...BTN, flex:'none'}}>Manage billing</button>}
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Sign Out</button>
        </div>
      </nav>

      {banner && (
        <div style={{...CARD, padding:'14px', marginBottom:'16px', background: banner.startsWith('Subscription activated') ? 'rgba(112,184,112,0.14)' : banner.startsWith('Checkout canceled') ? 'rgba(255,255,255,0.85)' : 'rgba(240,180,80,0.14)'}}>
          <div style={{fontSize:'13px', color:'#1a2a4a'}}>{banner}</div>
        </div>
      )}

      <div style={{marginBottom:'20px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'6px'}}>Dashboard</div>
        <div style={{fontSize:'24px', fontWeight:'900', color:'#1a2a4a'}}>Welcome back</div>
        <div style={{fontSize:'13px', color:'#6a8ab0', marginTop:'4px'}}>Pick a tool, or unlock more below.</div>
      </div>

      {loading && <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>Loading access…</div>}

      {!loading && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'14px'}}>
          {TOOLS.map(t => {
            const active = hasAccess(t.slug);
            const mLoading = checkoutLoading === `${t.slug}_monthly`;
            const yLoading = checkoutLoading === `${t.slug}_yearly`;
            return (
              <div key={t.slug} style={{...CARD, display:'flex', flexDirection:'column', gap:'10px', opacity: active ? 1 : 0.8}}>
                <div style={{fontSize:'32px', filter: active ? 'none' : 'grayscale(0.5)'}}>{t.icon}</div>
                <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap'}}>
                  <div style={{fontSize:'16px', fontWeight:'800', color:'#1a2a4a'}}>{t.name}</div>
                  {t.slug === 'nephroai' && <span style={{fontSize:'10px', fontWeight:'700', background:WORDMARK, color:'white', borderRadius:'8px', padding:'2px 8px'}}>10 conditions</span>}
                  {!active && <span style={{fontSize:'10px', color:'#8aa0c0'}}>🔒</span>}
                </div>
                <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.55', flex:1}}>{t.desc}</div>
                {active ? (
                  t.slug === 'ekgscan' ? (
                    <button onClick={onOpenEkgscan} style={{background:WORDMARK, border:'none', borderRadius:'12px', padding:'10px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer'}}>Open →</button>
                  ) : TEXT_TOOLS.has(t.slug) ? (
                    <button onClick={()=>onOpenTool(t.slug)} style={{background:WORDMARK, border:'none', borderRadius:'12px', padding:'10px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer'}}>Open →</button>
                  ) : (
                    <button disabled style={{background:'rgba(240,246,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px', fontSize:'12px', fontWeight:'700', color:'#8aa0c0', cursor:'default'}}>UI launching soon</button>
                  )
                ) : (
                  <div style={{display:'flex', gap:'6px', marginTop:'auto'}}>
                    <button onClick={()=>subscribe(t.slug,'monthly')} disabled={mLoading} style={{...BTN, opacity: mLoading ? 0.6 : 1}}>{mLoading ? '...' : `Monthly ${money(t.monthly)}`}</button>
                    <button onClick={()=>subscribe(t.slug,'yearly')} disabled={yLoading} style={{...BTN, background:WORDMARK, border:'none', color:'white', opacity: yLoading ? 0.6 : 1}}>{yLoading ? '...' : `Yearly ${money(t.yearly)}`}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !isSuper && (
        <div style={{...CARD, marginTop:'20px', padding:'24px', background:'linear-gradient(135deg,rgba(122,176,240,0.15),rgba(155,143,232,0.15))', border:'2px solid rgba(122,176,240,0.35)', textAlign:'center'}}>
          <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'8px'}}>Best value</div>
          <div style={{fontSize:'20px', fontWeight:'900', color:'#1a2a4a', marginBottom:'6px'}}>SoulMD Suite — all 7 tools</div>
          <div style={{fontSize:'13px', color:'#6a8ab0', marginBottom:'14px'}}>$35 / month AI budget · one login · cancel anytime</div>
          <div style={{display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap'}}>
            <button onClick={()=>subscribe('suite','monthly')} disabled={checkoutLoading==='suite_monthly'} style={{...BTN, flex:'none', padding:'10px 20px', fontSize:'13px'}}>{checkoutLoading==='suite_monthly' ? '...' : 'Monthly $88.88'}</button>
            <button onClick={()=>subscribe('suite','yearly')} disabled={checkoutLoading==='suite_yearly'} style={{...BTN, flex:'none', padding:'10px 20px', fontSize:'13px', background:WORDMARK, border:'none', color:'white'}}>{checkoutLoading==='suite_yearly' ? '...' : 'Yearly $888'}</button>
          </div>
        </div>
      )}

      <div style={{marginTop:'28px', padding:'16px', background:'rgba(122,176,240,0.08)', borderRadius:'14px', fontSize:'12px', color:'#6a8ab0', lineHeight:'1.6', textAlign:'center'}}>
        For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. In emergencies, call 911.
      </div>
    </div>
    </div>
  );
};

export default SuiteDashboard;
