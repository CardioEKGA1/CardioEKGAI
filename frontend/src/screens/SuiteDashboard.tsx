// © 2026 SoulMD. All rights reserved.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import DictationButton from '../DictationButton';
import { User } from '../App';

interface Props {
  API: string;
  token: string;
  user: User;
  onLogout: () => void;
  onOpenEkgscan: () => void;
  onOpenTool: (slug: string) => void;
  onPrivacy: () => void;
  onTerms: () => void;
  checkoutResult: string | null;
}

interface Tool { slug: string; name: string; icon: React.ReactNode; desc: string; monthly: number; yearly: number; keywords: string; }

const TOOLS: Tool[] = [
  { slug:'ekgscan',      name:'EKGScan',         icon:'🫀',              desc:'12-lead EKG interpretation in seconds',                                  monthly:9.99,  yearly:89.99,  keywords:'ekg ecg cardiac rhythm heart 12-lead cardiology arrhythmia atrial ventricular qtc' },
  { slug:'nephroai',     name:'NephroAI',        icon:'🫘',              desc:'Comprehensive nephrology decision support',                              monthly:24.99, yearly:179.99, keywords:'aki ckd kdigo electrolytes sodium potassium calcium magnesium phosphorus acid-base abg dialysis transplant glomerulonephritis nephrotic hypertension htn kidney stones creatinine egfr nephrology' },
  { slug:'xrayread',     name:'XrayRead',        icon:'🩻',              desc:'Structured radiology report from any X-ray image',                       monthly:9.99,  yearly:89.99,  keywords:'x-ray xray chest cxr radiology radiograph axr pneumonia pneumothorax fracture abdominal bone' },
  { slug:'rxcheck',      name:'RxCheck',         icon:'💊',              desc:'Full medication interaction safety check',                               monthly:9.99,  yearly:89.99,  keywords:'medications drug interactions pharmacy pharmacology polypharmacy drug-drug rxnorm' },
  { slug:'infectid',     name:'InfectID',        icon:'🦠',              desc:'IDSA-based antibiotic recommendations',                                  monthly:9.99,  yearly:89.99,  keywords:'infectious disease antibiotics idsa uti cellulitis pneumonia cap hap sepsis bacteremia organism' },
  { slug:'clinicalnote', name:'ClinicalNote AI', icon:'📝',              desc:'SOAP notes from bullet points in seconds',                               monthly:9.99,  yearly:89.99,  keywords:'soap h&p note documentation discharge summary progress consult hpi' },
  { slug:'cerebralai',   name:'CerebralAI',      icon:'🧠',              desc:'Brain and spine MRI and CT interpretation',                              monthly:9.99,  yearly:89.99,  keywords:'brain spine mri ct neuroimaging stroke hemorrhage head radiology neurology cord' },
  { slug:'palliativemd', name:'PalliativeMD',    icon:'🫶',              desc:'AI-guided palliative care — goals of care, prognosis, family meetings', monthly:24.99, yearly:179.99, keywords:'palliative goals of care prognosis hospice family meeting dnr dni code status end of life comfort' },
];

const OPEN_TOOLS = new Set(['nephroai','rxcheck','infectid','clinicalnote','xrayread','cerebralai','palliativemd']);

const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)', borderRadius:'20px', padding:'20px', boxShadow:'0 4px 20px rgba(100,130,200,0.1)', border:'1px solid rgba(255,255,255,0.9)'};
const BTN: React.CSSProperties = {border:'1px solid rgba(122,176,240,0.3)',borderRadius:'10px',padding:'6px 10px',fontSize:'11px',fontWeight:'700',cursor:'pointer',background:'rgba(255,255,255,0.85)',color:'#4a7ad0',flex:1};

const money = (n: number) => n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;

const timeAgo = (iso: string | null): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

interface AccessResp {
  is_superuser: boolean;
  access: Record<string, boolean>;
  tiers: Record<string, string>;
  budget: number | null;
  spent: number;
  overage: number;
  pct: number;
  overage_per_call: number;
  note_style_preference: string;
}
interface UsageStats {
  per_tool_count: Record<string, number>;
  recent_tools: { tool_slug: string; last_used: string | null }[];
}
interface ClinicalCase {
  id: number; tool_slug: string; title: string; created_at: string;
  inputs: any; result: any;
}
interface CasesResp {
  cases: ClinicalCase[];
  counts: Record<string, number>;
  total: number;
  max_total: number;
  max_per_tool: number;
  retention_days: number;
}

const SuiteDashboard: React.FC<Props> = ({ API, token, user, onLogout, onOpenEkgscan, onOpenTool, onPrivacy, onTerms, checkoutResult }) => {
  const [access, setAccess] = useState<AccessResp | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [cases, setCases] = useState<CasesResp | null>(null);
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<string>('');
  const [search, setSearch] = useState('');
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [feedbackTool, setFeedbackTool] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(() => {
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/tools/access`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/tools/usage-stats`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/cases`, { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([a, u, c]) => { if (a) setAccess(a); if (u) setUsage(u); if (c) setCases(c); }).catch(()=>{}).finally(()=>setLoading(false));
  }, [API, token]);

  const deleteCase = async (id: number) => {
    try {
      await fetch(`${API}/cases/${id}`, { method:'DELETE', headers: { Authorization:`Bearer ${token}` } });
      setCases(c => c ? { ...c, cases: c.cases.filter(x => x.id !== id), total: Math.max(0, c.total - 1), counts: {...c.counts, [c.cases.find(x=>x.id===id)?.tool_slug || '']: Math.max(0, (c.counts[c.cases.find(x=>x.id===id)?.tool_slug || ''] || 1) - 1)} } : c);
    } catch {}
  };

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (checkoutResult === 'success') {
      setBanner('Subscription activated. Your access will appear below within a few seconds.');
      const t = setTimeout(loadAll, 4000);
      return () => clearTimeout(t);
    }
    if (checkoutResult === 'cancel') setBanner('Checkout canceled. No charge was made.');
  }, [checkoutResult, loadAll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const subscribe = async (tool_slug: string, tier: 'monthly'|'yearly') => {
    setCheckoutLoading(`${tool_slug}_${tier}`);
    try {
      const res = await fetch(`${API}/billing/checkout-session`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ tool_slug, tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.detail || 'Could not start checkout');
      window.location.href = data.url;
    } catch (e: any) { setBanner(`Checkout failed: ${e.message}`); setCheckoutLoading(null); }
  };

  const openPortal = async () => {
    try {
      const res = await fetch(`${API}/billing/portal`, { method:'POST', headers: { Authorization:`Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.detail || 'No billing account on file yet.');
      window.location.href = data.url;
    } catch (e: any) { setBanner(e.message); }
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const deleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/auth/delete-account`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Deletion failed');
      localStorage.removeItem('token');
      window.location.href = 'https://soulmd.us/';
    } catch (e: any) {
      setBanner(`Could not delete account: ${e.message}`);
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const openFeedback = (slug: string) => {
    setFeedbackTool(slug); setFeedbackText(''); setFeedbackError('');
  };
  const closeFeedback = () => {
    setFeedbackTool(null); setFeedbackText(''); setFeedbackError(''); setFeedbackLoading(false);
  };
  const submitFeedback = async () => {
    if (!feedbackTool) return;
    const comment = feedbackText.trim();
    if (!comment) { setFeedbackError('Enter feedback before submitting.'); return; }
    setFeedbackLoading(true); setFeedbackError('');
    try {
      const res = await fetch(`${API}/tools/feedback`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ tool_slug: feedbackTool, comment }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Could not submit feedback');
      }
      setFeedbackSent(f => ({ ...f, [feedbackTool]: true }));
      closeFeedback();
    } catch (e: any) {
      setFeedbackError(e.message); setFeedbackLoading(false);
    }
  };

  const isSuper = !!access?.is_superuser;
  const hasAccess = (slug: string) => isSuper || !!access?.access?.[slug];
  const tierLabel = isSuper ? 'Superuser · Unlimited' : (user.is_subscribed ? 'Subscribed' : 'Free tier');
  const hasBudget = !!access && access.budget !== null && access.budget > 0;
  const pct = access?.pct ?? 0;
  const spent = access?.spent ?? 0;
  const budget = access?.budget ?? 0;
  const overage = access?.overage ?? 0;
  const atOver = hasBudget && pct >= 100;
  const atWarn = hasBudget && pct >= 80 && pct < 100;
  const meterColor = atOver ? '#c04040' : atWarn ? '#d89030' : '#4a7ad0';
  const hasAnyPaidSub = access && !isSuper && access.budget !== null && access.budget > 0;
  const suiteActive = hasAccess('suite');
  const suiteMonthly = access?.tiers?.suite === 'monthly';
  const lockedCount = TOOLS.filter(t => !hasAccess(t.slug)).length;

  const q = search.trim().toLowerCase();
  const visibleTools = q
    ? TOOLS.filter(t => (t.name + ' ' + t.desc + ' ' + t.keywords).toLowerCase().includes(q))
    : TOOLS;

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
          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', fontSize:'11px', color:'#6a8ab0', gap:'3px'}}>
            <span style={{fontWeight:'600', color:'#1a2a4a', fontSize:'12px', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.email}</span>
            <span style={{background: isSuper ? WORDMARK : 'rgba(122,176,240,0.12)', color: isSuper ? 'white' : '#4a7ad0', borderRadius:'10px', padding:'3px 9px', fontWeight:'700'}}>{tierLabel}</span>
            {hasBudget && (
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px', minWidth:'150px'}}>
                <div style={{fontSize:'10px', color: meterColor, fontWeight:'600'}}>${spent.toFixed(2)} / ${budget.toFixed(2)} · {pct.toFixed(0)}%</div>
                <div style={{width:'140px', height:'4px', background:'rgba(122,176,240,0.15)', borderRadius:'3px', overflow:'hidden'}}>
                  <div style={{width: `${Math.min(100, pct)}%`, height:'100%', background: meterColor, transition:'width 0.3s'}}/>
                </div>
                {overage > 0 && <div style={{fontSize:'10px', color:'#c04040', fontWeight:'700'}}>Overage: ${overage.toFixed(2)}</div>}
              </div>
            )}
          </div>
          {hasAnyPaidSub && <button onClick={openPortal} style={{...BTN, flex:'none'}}>Manage billing</button>}
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Sign Out</button>
        </div>
      </nav>

      {suiteMonthly && (
        <div style={{...CARD, padding:'12px 14px', marginBottom:'14px', background:'linear-gradient(135deg,rgba(122,176,240,0.15),rgba(155,143,232,0.15))', border:'1px solid rgba(122,176,240,0.3)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px'}}>
          <div style={{fontSize:'13px', color:'#1a2a4a', fontWeight:'600'}}>Save ~$179/year — switch to yearly Suite for $888.</div>
          <button onClick={()=>subscribe('suite','yearly')} disabled={checkoutLoading==='suite_yearly'} style={{...BTN, flex:'none', padding:'7px 14px', background:WORDMARK, border:'none', color:'white'}}>{checkoutLoading==='suite_yearly' ? '…' : 'Upgrade to yearly'}</button>
        </div>
      )}

      {banner && (
        <div style={{...CARD, padding:'14px', marginBottom:'16px', background: banner.startsWith('Subscription activated') ? 'rgba(112,184,112,0.14)' : banner.startsWith('Checkout canceled') ? 'rgba(255,255,255,0.85)' : 'rgba(240,180,80,0.14)'}}>
          <div style={{fontSize:'13px', color:'#1a2a4a'}}>{banner}</div>
        </div>
      )}
      {atOver && (
        <div style={{...CARD, padding:'14px', marginBottom:'16px', background:'rgba(224,168,136,0.18)', border:'1px solid rgba(224,168,136,0.45)'}}>
          <div style={{fontSize:'13px', color:'#1a2a4a', fontWeight:'600'}}>You have reached your monthly AI budget — additional calls are ${(access?.overage_per_call ?? 0.10).toFixed(2)} each.</div>
          <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'4px'}}>Overage is added to your next Stripe invoice. Budget resets on the 1st.</div>
        </div>
      )}
      {atWarn && (
        <div style={{...CARD, padding:'12px 14px', marginBottom:'16px', background:'rgba(240,180,80,0.12)', border:'1px solid rgba(240,180,80,0.35)'}}>
          <div style={{fontSize:'12px', color:'#1a2a4a'}}>You're at {pct.toFixed(0)}% of your monthly AI budget. Calls above ${budget.toFixed(2)} will bill at ${(access?.overage_per_call ?? 0.10).toFixed(2)} each.</div>
        </div>
      )}

      <div style={{maxWidth:'560px', margin:'0 auto 14px'}}>
        <input
          ref={searchRef}
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Search tools... (e.g. AKI, chest x-ray, antibiotics)"
          style={{width:'100%', padding:'14px 18px', borderRadius:'16px', border:'1px solid rgba(122,176,240,0.3)', background:'rgba(255,255,255,0.85)', fontSize:'14px', color:'#1a2a4a', outline:'none', boxSizing:'border-box', boxShadow:'0 2px 12px rgba(100,130,200,0.08)'}}
        />
        <div style={{fontSize:'10px', color:'#a0b0c8', textAlign:'center', marginTop:'4px'}}>Press ⌘K or Ctrl+K to focus · {TOOLS.length} tools</div>
      </div>

      {usage && usage.recent_tools.length > 0 && !q && (
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'11px', fontWeight:'700', color:'#8aa0c0', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'8px'}}>Recently used</div>
          <div style={{display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px', WebkitOverflowScrolling:'touch'}}>
            {usage.recent_tools.map(r => {
              const t = TOOLS.find(x => x.slug === r.tool_slug);
              if (!t) return null;
              return (
                <button key={r.tool_slug} onClick={()=>r.tool_slug === 'ekgscan' ? onOpenEkgscan() : onOpenTool(r.tool_slug)} style={{flexShrink:0, display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'999px', cursor:'pointer', fontSize:'12px', fontWeight:'600', color:'#1a2a4a'}}>
                  <span style={{fontSize:'16px', display:'inline-flex', alignItems:'center'}}>{t.icon}</span>
                  <span>{t.name}</span>
                  <span style={{color:'#8aa0c0', fontSize:'11px', fontWeight:'500'}}>· {timeAgo(r.last_used)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{marginBottom:'20px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'6px'}}>Dashboard</div>
        <div style={{fontSize:'24px', fontWeight:'900', color:'#1a2a4a'}}>Welcome back</div>
        <div style={{fontSize:'13px', color:'#6a8ab0', marginTop:'4px'}}>Pick a tool, or unlock more below.</div>
      </div>

      {!isSuper && !suiteActive && lockedCount > 0 && (
        <div style={{...CARD, padding:'12px 14px', marginBottom:'16px', background:'linear-gradient(135deg,rgba(122,176,240,0.12),rgba(155,143,232,0.12))', border:'1px solid rgba(122,176,240,0.3)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px'}}>
          <div style={{fontSize:'13px', color:'#1a2a4a'}}>You have {lockedCount} tool{lockedCount===1?'':'s'} locked. Upgrade to Suite for $88.88/month and unlock everything.</div>
          <button onClick={()=>subscribe('suite','monthly')} disabled={checkoutLoading==='suite_monthly'} style={{...BTN, flex:'none', padding:'7px 14px', background:WORDMARK, border:'none', color:'white'}}>{checkoutLoading==='suite_monthly' ? '…' : 'Unlock all 8'}</button>
        </div>
      )}

      {cases && cases.total > 0 && (
        <div style={{...CARD, marginBottom:'16px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px', marginBottom:'10px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              <div style={{fontSize:'14px', fontWeight:'800', color:'#1a2a4a'}}>Recent Cases</div>
              <div title={`SoulMD saves your ${cases.max_per_tool} most recent cases per tool — ${cases.max_total} total`} style={{fontSize:'11px', color:'#4a7ad0', fontWeight:'700', background:'rgba(122,176,240,0.12)', padding:'2px 8px', borderRadius:'10px', cursor:'help'}}>
                {cases.total} / {cases.max_total}
              </div>
            </div>
            <div style={{fontSize:'10px', color:'#8aa0c0'}}>Private · auto-deleted after {cases.retention_days} days</div>
          </div>
          <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px'}}>
            <button onClick={()=>setCaseFilter('all')} style={{background: caseFilter==='all' ? WORDMARK : 'rgba(255,255,255,0.75)', color: caseFilter==='all' ? 'white' : '#4a7ad0', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'5px 12px', fontSize:'11px', fontWeight:'700', cursor:'pointer'}}>All ({cases.total})</button>
            {TOOLS.map(t => {
              const n = cases.counts[t.slug] || 0;
              if (n === 0) return null;
              const active = caseFilter === t.slug;
              return (
                <button key={t.slug} onClick={()=>setCaseFilter(t.slug)} style={{background: active ? WORDMARK : 'rgba(255,255,255,0.75)', color: active ? 'white' : '#4a7ad0', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'5px 12px', fontSize:'11px', fontWeight:'700', cursor:'pointer'}}>{t.name} ({n})</button>
              );
            })}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'8px'}}>
            {(caseFilter === 'all' ? cases.cases.slice(0, 3) : cases.cases.filter(c => c.tool_slug === caseFilter).slice(0, 3)).map(c => {
              const t = TOOLS.find(x => x.slug === c.tool_slug);
              return (
                <div key={c.id} style={{background:'rgba(240,246,255,0.5)', border:'1px solid rgba(122,176,240,0.2)', borderRadius:'12px', padding:'12px', display:'flex', alignItems:'flex-start', gap:'8px'}}>
                  <div style={{fontSize:'20px', display:'inline-flex', alignItems:'center', flexShrink:0}}>{t?.icon ?? '📋'}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'12px', fontWeight:'700', color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.title}</div>
                    <div style={{fontSize:'10px', color:'#8aa0c0', marginTop:'2px'}}>{t?.name ?? c.tool_slug} · {timeAgo(c.created_at)}</div>
                  </div>
                  <button onClick={()=>deleteCase(c.id)} title="Delete case" style={{background:'transparent', border:'none', cursor:'pointer', color:'#c04040', fontSize:'14px', padding:'2px 4px', flexShrink:0}} aria-label="Delete">🗑</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && <div style={{...CARD, textAlign:'center', color:'#8aa0c0'}}>Loading…</div>}

      {!loading && visibleTools.length === 0 && (
        <div style={{...CARD, textAlign:'center', color:'#8aa0c0', padding:'40px 20px'}}>No tools found — try searching for a condition or specialty.</div>
      )}

      {!loading && visibleTools.length > 0 && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'14px'}}>
          {visibleTools.map(t => {
            const active = hasAccess(t.slug);
            const mLoading = checkoutLoading === `${t.slug}_monthly`;
            const yLoading = checkoutLoading === `${t.slug}_yearly`;
            const usedCount = usage?.per_tool_count?.[t.slug] ?? 0;
            const fb = feedbackSent[t.slug];
            return (
              <div key={t.slug} style={{...CARD, display:'flex', flexDirection:'column', gap:'8px', opacity: active ? 1 : 0.92, position:'relative'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div style={{fontSize:'32px', filter: active ? 'none' : 'grayscale(0.5)'}}>{t.icon}</div>
                  {!active && <span style={{fontSize:'16px', opacity:0.7}} aria-label="locked">🔒</span>}
                </div>
                <div style={{fontSize:'16px', fontWeight:'800', color:'#1a2a4a'}}>{t.name}</div>
                <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.55', flex:1}}>{t.desc}</div>
                {active && usedCount > 0 && (
                  <div style={{fontSize:'11px', color:'#8aa0c0'}}>Used {usedCount} time{usedCount===1?'':'s'} this month</div>
                )}
                {active ? (
                  t.slug === 'ekgscan' ? (
                    <button onClick={onOpenEkgscan} style={{background:WORDMARK, border:'none', borderRadius:'12px', padding:'10px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer'}}>Open →</button>
                  ) : OPEN_TOOLS.has(t.slug) ? (
                    <button onClick={()=>onOpenTool(t.slug)} style={{background:WORDMARK, border:'none', borderRadius:'12px', padding:'10px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer'}}>Open →</button>
                  ) : (
                    <button disabled style={{background:'rgba(240,246,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px', fontSize:'12px', fontWeight:'700', color:'#8aa0c0', cursor:'default'}}>UI launching soon</button>
                  )
                ) : (
                  <div style={{display:'flex', gap:'6px', marginTop:'auto'}}>
                    <button onClick={()=>subscribe(t.slug,'monthly')} disabled={mLoading} style={{...BTN, opacity: mLoading ? 0.6 : 1}}>{mLoading ? '...' : `Try Monthly — ${money(t.monthly)}/mo`}</button>
                    <button onClick={()=>subscribe(t.slug,'yearly')} disabled={yLoading} style={{...BTN, background:WORDMARK, border:'none', color:'white', opacity: yLoading ? 0.6 : 1}}>{yLoading ? '...' : `Best Value — ${money(t.yearly)}/yr`}</button>
                  </div>
                )}
                {active && (
                  <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'6px', fontSize:'11px', color:'#8aa0c0', paddingTop:'4px', borderTop:'0.5px solid rgba(0,0,0,0.05)', marginTop:'4px'}}>
                    {fb ? (
                      <span style={{color:'#70b870', fontWeight:'600'}}>Thanks for your feedback!</span>
                    ) : (
                      <button onClick={()=>openFeedback(t.slug)} style={{background:'transparent', border:'none', cursor:'pointer', fontSize:'11px', color:'#4a7ad0', fontWeight:'600', padding:'2px 4px', textDecoration:'underline'}}>Leave feedback</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !isSuper && !suiteActive && (
        <div style={{...CARD, marginTop:'20px', padding:'24px', background:'linear-gradient(135deg,rgba(122,176,240,0.15),rgba(155,143,232,0.15))', border:'2px solid rgba(122,176,240,0.35)', textAlign:'center'}}>
          <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'8px'}}>Best value</div>
          <div style={{fontSize:'20px', fontWeight:'900', color:'#1a2a4a', marginBottom:'6px'}}>SoulMD Suite — all 8 tools</div>
          <div style={{fontSize:'13px', color:'#6a8ab0', marginBottom:'14px'}}>$60 / month AI budget · one login · cancel anytime</div>
          <div style={{display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap'}}>
            <button onClick={()=>subscribe('suite','monthly')} disabled={checkoutLoading==='suite_monthly'} style={{...BTN, flex:'none', padding:'10px 20px', fontSize:'13px'}}>{checkoutLoading==='suite_monthly' ? '...' : 'Monthly $88.88'}</button>
            <button onClick={()=>subscribe('suite','yearly')} disabled={checkoutLoading==='suite_yearly'} style={{...BTN, flex:'none', padding:'10px 20px', fontSize:'13px', background:WORDMARK, border:'none', color:'white'}}>{checkoutLoading==='suite_yearly' ? '...' : 'Yearly $888'}</button>
          </div>
        </div>
      )}

      <div style={{marginTop:'28px', padding:'16px', background:'rgba(122,176,240,0.08)', borderRadius:'14px', fontSize:'12px', color:'#6a8ab0', lineHeight:'1.6', textAlign:'center'}}>
        For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. In emergencies, call 911.
      </div>

      <div style={{marginTop:'16px', padding:'10px', textAlign:'center', fontSize:'11px', color:'#a0b0c8'}}>
        <a href="/privacy" onClick={e=>{e.preventDefault(); onPrivacy();}} style={{color:'#4a7ad0', textDecoration:'none', margin:'0 8px', cursor:'pointer'}}>Privacy Policy</a>
        <span>·</span>
        <a href="/terms" onClick={e=>{e.preventDefault(); onTerms();}} style={{color:'#4a7ad0', textDecoration:'none', margin:'0 8px', cursor:'pointer'}}>Terms of Service</a>
        <span>·</span>
        <button onClick={()=>setDeleteConfirmOpen(true)} style={{background:'none', border:'none', color:'#c04040', cursor:'pointer', fontSize:'11px', margin:'0 8px', padding:0, textDecoration:'underline'}}>Delete my account</button>
      </div>

      {feedbackTool && (
        <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
          <div style={{background:'white', borderRadius:'20px', padding:'24px', maxWidth:'520px', width:'100%', boxShadow:'0 20px 60px rgba(26,42,74,0.3)'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px'}}>
              <span style={{fontSize:'22px'}}>{TOOLS.find(t => t.slug === feedbackTool)?.icon as React.ReactNode ?? '💬'}</span>
              <div style={{fontSize:'16px', fontWeight:'800', color:'#1a2a4a'}}>Feedback on {TOOLS.find(t => t.slug === feedbackTool)?.name || feedbackTool}</div>
            </div>
            <div style={{fontSize:'12px', color:'#6a8ab0', marginBottom:'14px', lineHeight:'1.6'}}>What could be better? What did you like? Any clinical detail we got wrong? Type or dictate — all feedback goes directly to the team. Prefer email? <a href="mailto:feedback@soulmd.us" style={{color:'#4a7ad0', textDecoration:'none', fontWeight:'600'}}>feedback@soulmd.us</a></div>
            <div style={{display:'flex', gap:'8px', alignItems:'flex-start', marginBottom:'12px'}}>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value.slice(0, 2000))}
                placeholder="Your feedback…"
                style={{flex:1, minHeight:'140px', padding:'12px 14px', borderRadius:'12px', border:'1px solid rgba(122,176,240,0.3)', background:'rgba(240,246,255,0.5)', fontSize:'13px', color:'#1a2a4a', lineHeight:'1.6', outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit'}}
              />
              <DictationButton onTranscript={t => setFeedbackText(prev => (prev ? prev.trimEnd() + ' ' : '') + t)}/>
            </div>
            {feedbackError && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#c04040', marginBottom:'10px'}}>{feedbackError}</div>}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px'}}>
              <span style={{fontSize:'11px', color:'#a0b0c8'}}>{feedbackText.length} / 2000</span>
              <div style={{display:'flex', gap:'8px'}}>
                <button onClick={closeFeedback} disabled={feedbackLoading} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
                <button onClick={submitFeedback} disabled={feedbackLoading || !feedbackText.trim()} style={{background:WORDMARK, border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer', opacity: (feedbackLoading || !feedbackText.trim()) ? 0.6 : 1}}>
                  {feedbackLoading ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
          <div style={{background:'white', borderRadius:'20px', padding:'28px', maxWidth:'440px', width:'100%', boxShadow:'0 20px 60px rgba(26,42,74,0.3)'}}>
            <div style={{fontSize:'18px', fontWeight:'800', color:'#1a2a4a', marginBottom:'10px'}}>Delete your account?</div>
            <div style={{fontSize:'13px', color:'#4a5e6a', lineHeight:'1.7', marginBottom:'16px'}}>
              This permanently deletes your account, all saved clinical cases, usage history, and feedback, and cancels any active Stripe subscription. This action <b>cannot</b> be undone.
            </div>
            <div style={{fontSize:'12px', color:'#6a8ab0', marginBottom:'20px'}}>A confirmation email will be sent to {user.email}.</div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
              <button onClick={()=>setDeleteConfirmOpen(false)} disabled={deleteLoading} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
              <button onClick={deleteAccount} disabled={deleteLoading} style={{background:'#c04040', border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer', opacity: deleteLoading ? 0.6 : 1}}>
                {deleteLoading ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default SuiteDashboard;
