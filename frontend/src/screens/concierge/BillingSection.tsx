// © 2026 SoulMD, LLC. All rights reserved.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface BillingListPatient {
  id: number;
  name: string;
  email: string;
  tier: string;
  tier_label: string;
  status: string;
  current_period_end: string | null;
  total_paid_cents: number;
  has_customer: boolean;
  has_subscription: boolean;
}

interface Invoice {
  id: string;
  number: string | null;
  amount_paid_cents: number;
  amount_due_cents: number;
  status: string;
  created: string | null;
  hosted_invoice_url: string | null;
  description: string | null;
}

interface BillingDetail {
  patient_id: number;
  name: string;
  email: string;
  tier: string;
  tier_label: string;
  status: string;
  current_period_end: string | null;
  total_paid_cents: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  invoices: Invoice[];
  upcoming_invoice: { amount_due_cents: number; next_payment_attempt: string | null } | null;
  invoice_error?: string;
}

// Angel-number tiers. Prices in whole dollars for display math; the backend
// is the source of truth for cents and Stripe price IDs.
const TIERS = [
  { id: 'awaken', label: 'Awaken', monthly: 444,  yearly: 5000,  color: '#7ab0f0' },
  { id: 'align',  label: 'Align',  monthly: 888,  yearly: 10000, color: '#4a7ad0' },
  { id: 'ascend', label: 'Ascend', monthly: 1111, yearly: 13000, color: '#1a2a4a' },
];

const ALA_CARTE = [
  { slug: 'consult_30',        label: 'Medical consultation (30 min)',      cents:  30000 },
  { slug: 'extended_15',       label: "Extended visit (add'l 15 min)",       cents:  15000 },
  { slug: 'guided_meditation', label: 'Guided meditation (30 min)',         cents:   4400 },
  { slug: 'urgent_same_day',   label: 'Urgent same-day consult',            cents:  44400 },
  { slug: 'lab_review',        label: 'Lab result review + async message', cents:   7500 },
];

const STATUS_STYLES: Record<string, {bg: string; color: string; label: string}> = {
  active:     { bg: 'rgba(112,184,112,0.15)', color: '#2a7a2a', label: 'Active' },
  paused:     { bg: 'rgba(240,180,80,0.18)',  color: '#a06810', label: 'Paused' },
  canceling:  { bg: 'rgba(224,140,80,0.18)',  color: '#a85020', label: 'Canceling' },
  canceled:   { bg: 'rgba(160,160,160,0.15)', color: '#808080', label: 'Canceled' },
  past_due:   { bg: 'rgba(224,80,80,0.15)',   color: '#a02020', label: 'Past due' },
  incomplete: { bg: 'rgba(240,180,80,0.18)',  color: '#a06810', label: 'Incomplete' },
  none:       { bg: 'rgba(122,176,240,0.12)', color: '#6a8ab0', label: 'No subscription' },
};

const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', borderRadius:'16px',
  border:'1px solid rgba(122,176,240,0.2)',
  boxShadow:'0 2px 10px rgba(100,130,200,0.1)',
  padding:'16px',
};

const INPUT: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};

const FIELD_LABEL: React.CSSProperties = { fontSize:'11px', color:'#4a7ad0', fontWeight:600, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' };

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

const BillingSection: React.FC<Props> = ({ API, token, accent }) => {
  const [patients, setPatients] = useState<BillingListPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/billing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPatients(d.patients || []))
      .catch(() => setError('Could not load billing.'))
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => ({
    active: patients.filter(p => p.status === 'active').length,
    paused: patients.filter(p => p.status === 'paused').length,
    past_due: patients.filter(p => p.status === 'past_due').length,
    lifetime_cents: patients.reduce((sum, p) => sum + (p.total_paid_cents || 0), 0),
    mrr_cents: patients.filter(p => p.status === 'active').reduce((sum, p) => {
      const t = TIERS.find(x => x.id === p.tier);
      return sum + (t ? t.monthly * 100 : 0);
    }, 0),
  }), [patients]);

  if (selected) {
    return <BillingDetailView API={API} token={token} accent={accent} patientId={selected} onClose={() => { setSelected(null); load(); }} />;
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Billing</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>
            {patients.length} patients · {totals.active} active · {totals.paused} paused
            {totals.past_due > 0 && <span style={{color:'#a02020', fontWeight:700}}> · {totals.past_due} past due</span>}
          </div>
        </div>
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
          <MetricPill label="MRR"      value={dollars(totals.mrr_cents)} accent={accent}/>
          <MetricPill label="Lifetime" value={dollars(totals.lifetime_cents)} accent={accent}/>
        </div>
      </div>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{error}</div>}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading…</div>
      ) : patients.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.4}}>💳</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>No patients yet</div>
          <div style={{fontSize:'12px'}}>Add patients in the Patients tab first, then come back to set up billing.</div>
        </div>
      ) : (
        <div style={{...CARD, padding:'0', overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
          <div style={{minWidth:'640px'}}>
          <div style={{display:'grid', gridTemplateColumns:'minmax(140px,2fr) minmax(90px,1fr) minmax(100px,1fr) minmax(120px,1.2fr) minmax(90px,1fr)', fontSize:'10px', fontWeight:800, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase', padding:'12px 14px', borderBottom:'1px solid rgba(122,176,240,0.2)', background:'rgba(240,246,255,0.4)'}}>
            <div>Patient</div>
            <div>Tier</div>
            <div>Status</div>
            <div>Next billing</div>
            <div style={{textAlign:'right'}}>Total paid</div>
          </div>
          {patients.map(p => {
            const tier = TIERS.find(t => t.id === p.tier);
            const ss = STATUS_STYLES[p.status] || STATUS_STYLES.none;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  width:'100%', textAlign:'left', cursor:'pointer',
                  display:'grid', gridTemplateColumns:'minmax(140px,2fr) minmax(90px,1fr) minmax(100px,1fr) minmax(120px,1.2fr) minmax(90px,1fr)',
                  alignItems:'center', gap:'8px',
                  padding:'14px', borderBottom:'1px solid rgba(122,176,240,0.12)',
                  border:'none', background:'transparent', fontFamily:'inherit',
                }}
              >
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{fontSize:'11px', color:'#6a8ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.email}</div>
                </div>
                <div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background:`${tier?.color || '#6a8ab0'}1a`, color:tier?.color || '#6a8ab0', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase'}}>{p.tier_label}</span>
                </div>
                <div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background: ss.bg, color: ss.color, fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase', whiteSpace:'nowrap'}}>{ss.label}</span>
                </div>
                <div style={{fontSize:'12px', color:'#4a5e6a'}}>{p.current_period_end ? new Date(p.current_period_end).toLocaleDateString() : '—'}</div>
                <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a', textAlign:'right'}}>{dollars(p.total_paid_cents)}</div>
              </button>
            );
          })}
          </div>
          </div>
        </div>
      )}

      <div style={{...CARD, marginTop:'12px', fontSize:'11px', color:'#6a8ab0', textAlign:'center', padding:'10px 12px'}}>
        Membership tiers: Awaken $444/mo ($5,000/yr) · Align $888/mo ($10,000/yr) · Ascend $1,111/mo ($13,000/yr). Payment methods managed via Stripe Customer Portal.
      </div>
    </div>
  );
};

const MetricPill: React.FC<{label:string; value:string; accent:string}> = ({label, value, accent}) => (
  <div style={{...CARD, padding:'10px 16px', minWidth:'130px'}}>
    <div style={{fontSize:'10px', fontWeight:700, color:'#6a8ab0', letterSpacing:'0.5px', textTransform:'uppercase'}}>{label}</div>
    <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a', lineHeight:1.1, marginTop:'2px'}}>{value}</div>
  </div>
);

// ───── Detail view ────────────────────────────────────────────────────────

const BillingDetailView: React.FC<{API:string; token:string; accent:string; patientId:number; onClose:()=>void}> = ({API, token, accent, patientId, onClose}) => {
  const [data, setData] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);  // action in-flight key
  const [banner, setBanner] = useState<{ok:boolean; text:string} | null>(null);
  const [confirm, setConfirm] = useState<{action:string; text:string; onYes:()=>void} | null>(null);
  const [showTierChange, setShowTierChange] = useState(false);
  const [showManualCharge, setShowManualCharge] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/patients/${patientId}/billing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setBanner({ok:false, text:'Could not load billing detail.'}))
      .finally(() => setLoading(false));
  }, [API, token, patientId]);

  useEffect(() => { load(); }, [load]);

  const action = async (key: string, path: string, method: string = 'POST', body?: any) => {
    setBusy(key); setBanner(null);
    try {
      const res = await fetch(`${API}/concierge/patients/${patientId}/billing/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`);
      if (path === 'portal' && json.url) {
        window.open(json.url, '_blank');
        setBanner({ok:true, text:'Opened Stripe Customer Portal in a new tab.'});
      } else {
        setData(json);
        setBanner({ok:true, text:'Updated.'});
      }
      setTimeout(()=>setBanner(null), 3000);
    } catch (e: any) {
      setBanner({ok:false, text:e.message});
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0'}}>Loading billing…</div>;
  if (!data) return <div style={{padding:'40px', textAlign:'center', color:'#a02020'}}>No billing data.</div>;

  const tier = TIERS.find(t => t.id === data.tier);
  const ss = STATUS_STYLES[data.status] || STATUS_STYLES.none;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'14px'}}>
        <button onClick={onClose} style={{background:'transparent', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>← All billing</button>
        <button onClick={() => action('portal', 'portal')} disabled={busy === 'portal'} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.35)', borderRadius:'10px', padding:'7px 14px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>
          {busy === 'portal' ? 'Opening…' : 'Add payment method (Stripe Portal) →'}
        </button>
      </div>

      {banner && (
        <div style={{marginBottom:'12px', padding:'10px 12px', borderRadius:'10px', fontSize:'12px', background: banner.ok ? 'rgba(112,184,112,0.12)' : 'rgba(224,80,80,0.1)', color: banner.ok ? '#2a7a2a' : '#a02020', border:`1px solid ${banner.ok ? 'rgba(112,184,112,0.3)' : 'rgba(224,80,80,0.3)'}`}}>{banner.text}</div>
      )}

      {/* Header card */}
      <div style={{...CARD, marginBottom:'14px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap'}}>
          <div style={{minWidth:0, flex:1}}>
            <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>{data.name}</div>
            <div style={{fontSize:'12px', color:'#6a8ab0', wordBreak:'break-all'}}>{data.email}</div>
            <div style={{display:'flex', gap:'8px', marginTop:'10px', flexWrap:'wrap'}}>
              <span style={{fontSize:'11px', padding:'4px 10px', borderRadius:'999px', background:`${tier?.color || '#6a8ab0'}1a`, color:tier?.color || '#6a8ab0', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase'}}>
                {data.tier_label}{tier ? ` · $${tier.monthly.toLocaleString()}/mo` : ''}
              </span>
              <span style={{fontSize:'11px', padding:'4px 10px', borderRadius:'999px', background: ss.bg, color: ss.color, fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase'}}>{ss.label}</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'10px', color:'#6a8ab0', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase'}}>Lifetime</div>
            <div style={{fontSize:'22px', fontWeight:800, color:'#1a2a4a'}}>{dollars(data.total_paid_cents)}</div>
            {data.current_period_end && <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'4px'}}>Next billing: {new Date(data.current_period_end).toLocaleDateString()}</div>}
            {data.upcoming_invoice && <div style={{fontSize:'11px', color:'#4a7ad0', marginTop:'2px', fontWeight:600}}>Upcoming: {dollars(data.upcoming_invoice.amount_due_cents)}</div>}
          </div>
        </div>
      </div>

      {/* Action grid */}
      <div style={{...CARD, marginBottom:'14px'}}>
        <div style={{fontSize:'11px', fontWeight:800, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'12px'}}>Subscription actions</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'8px'}}>
          {!data.stripe_subscription_id ? (
            <>
              {TIERS.flatMap(t => ([
                <button key={`${t.id}_m`}
                  onClick={() => action(`subscribe_${t.id}_m`, 'subscribe', 'POST', {tier:t.id, cycle:'monthly'})}
                  disabled={!!busy}
                  style={{background:accent, color:'white', border:'none', borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity: busy ? 0.6 : 1, lineHeight:1.3}}>
                  Start {t.label}<br/><span style={{fontSize:'11px', opacity:0.9}}>${t.monthly.toLocaleString()}/mo</span>
                </button>,
                <button key={`${t.id}_y`}
                  onClick={() => action(`subscribe_${t.id}_y`, 'subscribe', 'POST', {tier:t.id, cycle:'yearly'})}
                  disabled={!!busy}
                  style={{background:'rgba(255,255,255,0.85)', color: t.color, border:`1px solid ${t.color}`, borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity: busy ? 0.6 : 1, lineHeight:1.3}}>
                  {t.label} annual<br/><span style={{fontSize:'11px', opacity:0.85}}>${t.yearly.toLocaleString()}/yr</span>
                </button>,
              ]))}
            </>
          ) : (
            <>
              <button onClick={() => setShowTierChange(true)} disabled={!!busy} style={{background:'rgba(255,255,255,0.85)', color:'#4a7ad0', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer'}}>Change tier</button>
              {data.status === 'paused' ? (
                <button onClick={() => action('resume','resume')} disabled={!!busy} style={{background:accent, color:'white', border:'none', borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', opacity: busy ? 0.6 : 1}}>▶ Resume</button>
              ) : (
                <button onClick={() => setConfirm({action:'pause', text:'Pause subscription? No charges will be created until you resume.', onYes:() => action('pause','pause')})} disabled={!!busy} style={{background:'rgba(255,255,255,0.85)', color:'#a06810', border:'1px solid rgba(240,180,80,0.45)', borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer'}}>⏸ Pause</button>
              )}
              <button onClick={() => setShowManualCharge(true)} disabled={!!busy} style={{background:'rgba(255,255,255,0.85)', color:'#4a7ad0', border:'1px solid rgba(122,176,240,0.4)', borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer'}}>+ Manual charge</button>
              <button onClick={() => setConfirm({action:'cancel', text:'Cancel at period end? Patient keeps access until their next billing date, then subscription ends.', onYes:() => action('cancel','cancel?at_period_end=true')})} disabled={!!busy} style={{background:'rgba(255,255,255,0.85)', color:'#c04040', border:'1px solid rgba(224,80,80,0.4)', borderRadius:'10px', padding:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer'}}>Cancel subscription</button>
            </>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div style={{...CARD}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <div style={{fontSize:'11px', fontWeight:800, color:'#4a7ad0', letterSpacing:'0.5px', textTransform:'uppercase'}}>Invoices</div>
          <div style={{fontSize:'11px', color:'#6a8ab0'}}>{data.invoices.length} invoice{data.invoices.length === 1 ? '' : 's'}</div>
        </div>
        {data.invoices.length === 0 ? (
          <div style={{padding:'20px', textAlign:'center', color:'#6a8ab0', fontSize:'12px'}}>
            {data.stripe_customer_id ? 'No invoices yet — first charge creates the first invoice.' : 'No Stripe customer created yet.'}
          </div>
        ) : (
          <div>
            {data.invoices.map(inv => (
              <div key={inv.id} style={{display:'grid', gridTemplateColumns:'minmax(100px,2fr) minmax(80px,1fr) minmax(80px,1fr) auto', gap:'12px', alignItems:'center', padding:'10px 0', borderTop:'1px solid rgba(122,176,240,0.12)'}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'12px', fontWeight:700, color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{inv.description || `Invoice ${inv.number || inv.id.slice(-8)}`}</div>
                  <div style={{fontSize:'11px', color:'#6a8ab0'}}>{inv.created ? new Date(inv.created).toLocaleDateString() : '—'} · {inv.number || inv.id.slice(-8)}</div>
                </div>
                <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a'}}>{dollars(inv.amount_paid_cents || inv.amount_due_cents)}</div>
                <div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background: inv.status === 'paid' ? 'rgba(112,184,112,0.15)' : 'rgba(224,80,80,0.1)', color: inv.status === 'paid' ? '#2a7a2a' : '#a02020', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase'}}>{inv.status}</span>
                </div>
                <div>
                  {inv.hosted_invoice_url && <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" style={{fontSize:'11px', color:'#4a7ad0', textDecoration:'none', fontWeight:600}}>View ↗</a>}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.invoice_error && <div style={{fontSize:'11px', color:'#a02020', marginTop:'8px'}}>Invoice fetch: {data.invoice_error}</div>}
      </div>

      {/* Modals */}
      {showTierChange && (
        <Modal title="Change tier" onClose={() => setShowTierChange(false)}>
          <div style={{fontSize:'12px', color:'#4a5e6a', marginBottom:'12px', lineHeight:1.5}}>Change will be prorated for the current billing period.</div>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {TIERS.flatMap(t => (['monthly','yearly'] as const).map(cyc => {
              const amount = cyc === 'monthly' ? t.monthly : t.yearly;
              const current = t.id === data.tier;
              return (
                <button key={`${t.id}_${cyc}`}
                  onClick={() => { setShowTierChange(false); action(`change_${t.id}_${cyc}`, 'change-tier', 'POST', {tier:t.id, cycle:cyc}); }}
                  disabled={!!busy}
                  style={{background: current ? 'rgba(240,246,255,0.5)' : 'white', border:`1px solid ${current ? 'rgba(122,176,240,0.3)' : 'rgba(122,176,240,0.45)'}`, borderRadius:'10px', padding:'12px 14px', fontSize:'13px', fontWeight:700, color: '#1a2a4a', cursor: 'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span>{t.label} · {cyc === 'monthly' ? 'Monthly' : 'Annual'} {current && <span style={{fontSize:'10px', fontWeight:600, color:'#6a8ab0', marginLeft:'6px'}}>· current tier</span>}</span>
                  <span style={{color: t.color}}>${amount.toLocaleString()}{cyc === 'monthly' ? '/mo' : '/yr'}</span>
                </button>
              );
            }))}
          </div>
        </Modal>
      )}

      {showManualCharge && <ManualChargeModal onClose={() => setShowManualCharge(false)} onCharge={(cents, desc) => { setShowManualCharge(false); action('manual', 'manual-charge', 'POST', {amount_cents: cents, description: desc}); }} accent={accent}/>}

      {confirm && (
        <Modal title={confirm.action === 'cancel' ? 'Cancel subscription?' : 'Pause subscription?'} onClose={() => setConfirm(null)}>
          <div style={{fontSize:'13px', color:'#4a5e6a', marginBottom:'16px', lineHeight:1.6}}>{confirm.text}</div>
          <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
            <button onClick={() => setConfirm(null)} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'10px 16px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Keep it</button>
            <button onClick={confirm.onYes} style={{background: confirm.action === 'cancel' ? '#c04040' : accent, border:'none', borderRadius:'10px', padding:'10px 16px', fontSize:'12px', fontWeight:700, color:'white', cursor:'pointer'}}>Yes, {confirm.action}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Modal: React.FC<{title:string; onClose:()=>void; children:React.ReactNode}> = ({title, onClose, children}) => (
  <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
    <div style={{background:'white', borderRadius:'20px', padding:'24px', maxWidth:'460px', width:'100%', boxShadow:'0 20px 60px rgba(26,42,74,0.3)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
        <div style={{fontSize:'17px', fontWeight:800, color:'#1a2a4a'}}>{title}</div>
        <button onClick={onClose} style={{background:'transparent', border:'none', fontSize:'20px', color:'#6a8ab0', cursor:'pointer'}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const ManualChargeModal: React.FC<{onClose:()=>void; onCharge:(cents:number, desc:string)=>void; accent:string}> = ({onClose, onCharge, accent}) => {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const cents = Math.round(parseFloat(amount || '0') * 100);
  const pickPreset = (p: typeof ALA_CARTE[number]) => {
    setAmount((p.cents / 100).toFixed(2));
    setDesc(p.label);
  };
  return (
    <Modal title="Manual charge" onClose={onClose}>
      <div style={{fontSize:'12px', color:'#4a5e6a', marginBottom:'12px', lineHeight:1.5}}>One-time charge outside the membership. Pick a preset below or enter a custom amount. Uses the patient's default payment method.</div>

      <div style={FIELD_LABEL}>À la carte presets</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'6px', marginBottom:'14px'}}>
        {ALA_CARTE.map(p => (
          <button key={p.slug} onClick={() => pickPreset(p)}
            style={{background:'rgba(240,246,255,0.6)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'8px 10px', fontSize:'11px', fontWeight:700, color:'#1a2a4a', cursor:'pointer', textAlign:'left', lineHeight:1.3}}>
            {p.label}<br/><span style={{color:'#4a7ad0', fontWeight:600}}>${(p.cents/100).toFixed(p.cents % 100 === 0 ? 0 : 2)}</span>
          </button>
        ))}
      </div>

      <div style={{marginBottom:'10px'}}>
        <div style={FIELD_LABEL}>Amount (USD) *</div>
        <input type="number" step="0.01" min="0.5" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300.00" style={INPUT}/>
      </div>
      <div style={{marginBottom:'14px'}}>
        <div style={FIELD_LABEL}>Description *</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Medical consultation (30 min) — Tuesday evening" style={INPUT}/>
      </div>
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'10px 16px', fontSize:'12px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
        <button onClick={() => onCharge(cents, desc)} disabled={cents < 50 || !desc.trim()} style={{background:accent, border:'none', borderRadius:'10px', padding:'10px 18px', fontSize:'12px', fontWeight:700, color:'white', cursor:'pointer', opacity: (cents < 50 || !desc.trim()) ? 0.6 : 1}}>Charge ${(cents/100).toFixed(2)}</button>
      </div>
    </Modal>
  );
};

export default BillingSection;
