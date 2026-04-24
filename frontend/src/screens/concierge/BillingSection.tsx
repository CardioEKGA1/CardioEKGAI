// © 2026 SoulMD, LLC. All rights reserved.
// Physician-side Billing tab — practice revenue at a glance.
//
// Sections:
//   1. Revenue stats (2x2): MRR · Active members · ARR · Retention
//   2. Revenue by tier — horizontal bars, gradient per tier (Awaken blue,
//      Align lavender, Ascend gold)
//   3. Patient list with avatar / next billing / visits / tier badge /
//      monthly amount / status dot, filterable by tier or "Overdue"
//   4. Patient detail slide-in panel — billing history, visits, energy
//      log + journal counts, quick actions (Send message · Book session ·
//      Change tier)
//
// Test patients (the owner's own ?view=patient row) are excluded from
// revenue / retention math but still rendered in the list with a soft tag
// so they're discoverable.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface BillingPatient {
  id: number;
  name: string;
  email: string;
  tier: 'awaken' | 'align' | 'ascend' | string;
  tier_label: string;
  monthly_cents: number;
  status: string;
  current_period_end: string | null;
  created_at: string | null;
  total_paid_cents: number;
  visits_used: number;
  visits_allowed: number;
  meditations_used: number;
  meditations_allowed: number;
  has_customer: boolean;
  has_subscription: boolean;
  test_account: boolean;
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

interface EnergyEntry { id:number; date:string; energy_score:number; mood_label:string; note:string; session_id:number|null; created_at:string; }
interface JournalEntry { id:number; date:string; meditation_id:number|null; meditation_title:string; mood_shift:string; reflection:string; intention:string; created_at:string; }

// ───── Tokens ─────────────────────────────────────────────────────────────

const PURPLE     = '#534AB7';
const PURPLE_SOFT= '#EEEBFA';
const INK        = '#1F1B3A';
const INK_SOFT   = '#6B6889';
const BORDER     = 'rgba(83,74,183,0.12)';
const PAGE_BG    = '#FAF9FD';

const TIER_META = {
  awaken: {
    label: 'Awaken', monthly: 444, yearly: 5000,
    barGradient: 'linear-gradient(135deg, #C5E8F4, #a8d5e8)',
    badgeBg: '#E6F1FB', badgeText: '#185FA5',
  },
  align: {
    label: 'Align', monthly: 888, yearly: 10000,
    barGradient: 'linear-gradient(135deg, #b8b0f0, #9890e0)',
    badgeBg: '#EEEDFE', badgeText: '#534AB7',
  },
  ascend: {
    label: 'Ascend', monthly: 1111, yearly: 13000,
    barGradient: 'linear-gradient(135deg, #fde8b0, #f8c870)',
    badgeBg: 'linear-gradient(135deg, #fde8b0, #f8c870)', badgeText: '#7a5a10',
  },
} as const;
type TierId = keyof typeof TIER_META;
const TIER_IDS: TierId[] = ['awaken', 'align', 'ascend'];

const FilterId = ['all', 'awaken', 'align', 'ascend', 'overdue'] as const;
type FilterId = typeof FilterId[number];

const dollars = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
const initialsFor = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86400000);
};

const CARD: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: '16px',
  border: `0.5px solid ${BORDER}`,
  boxShadow: '0 2px 10px rgba(83,74,183,0.05)',
  padding: '18px',
};

// ───── Section root ───────────────────────────────────────────────────────

const BillingSection: React.FC<Props> = ({ API, token, accent }) => {
  const [patients, setPatients] = useState<BillingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [selected, setSelected] = useState<BillingPatient | null>(null);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    fetch(`${API}/concierge/billing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPatients(d.patients || []))
      .catch(() => setErr('Could not load billing.'))
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  // Real-money cohort: paying members only. Test accounts (the owner's own
  // ?view=patient row) are filtered out so MRR/retention reflect the actual
  // panel.
  const realPatients = useMemo(() => patients.filter(p => !p.test_account), [patients]);

  const stats = useMemo(() => {
    const active = realPatients.filter(p => p.status === 'active');
    const mrrCents = active.reduce((s, p) => s + (p.monthly_cents || 0), 0);
    const arrCents = mrrCents * 12;
    const totalEver = realPatients.length;
    const retention = totalEver > 0 ? Math.round((active.length / totalEver) * 100) : 0;
    const tierBreakdown: Record<TierId, number> = { awaken: 0, align: 0, ascend: 0 };
    active.forEach(p => { if (p.tier in tierBreakdown) tierBreakdown[p.tier as TierId] += 1; });
    return { mrrCents, arrCents, active: active.length, totalEver, retention, tierBreakdown };
  }, [realPatients]);

  const tierRevenue = useMemo(() => {
    const out: Record<TierId, number> = { awaken: 0, align: 0, ascend: 0 };
    realPatients.filter(p => p.status === 'active').forEach(p => {
      if (p.tier in out) out[p.tier as TierId] += (p.monthly_cents || 0);
    });
    return out;
  }, [realPatients]);

  const filtered = useMemo(() => {
    if (filter === 'all') return patients;
    if (filter === 'overdue') return patients.filter(p => p.status === 'past_due' || p.status === 'incomplete');
    return patients.filter(p => p.tier === filter);
  }, [patients, filter]);

  const overdueCount = useMemo(() => realPatients.filter(p => p.status === 'past_due' || p.status === 'incomplete').length, [realPatients]);

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'18px'}}>

      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px', flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:'22px', fontWeight:800, color: INK, letterSpacing:'-0.3px'}}>Billing</div>
          <div style={{fontSize:'12px', color: INK_SOFT, marginTop:'2px'}}>
            {realPatients.length} paying member{realPatients.length === 1 ? '' : 's'} · {stats.active} active
            {overdueCount > 0 && <span style={{color:'#a02020', fontWeight:700}}> · {overdueCount} need{overdueCount === 1 ? 's' : ''} attention</span>}
          </div>
        </div>
        <div style={{fontSize:'11px', color: INK_SOFT}}>
          Live data · refreshed on load
        </div>
      </div>

      {err && (
        <div style={{background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', padding:'10px 14px', color:'#a02020', fontSize:'12px'}}>{err}</div>
      )}

      {/* SECTION 1 — Revenue stats */}
      <RevenueStatsGrid stats={stats}/>

      {/* SECTION 2 — Revenue by tier */}
      <RevenueByTierChart tierRevenue={tierRevenue} tierBreakdown={stats.tierBreakdown}/>

      {/* SECTION 3 — Patient list */}
      <div style={{...CARD, padding:'0', overflow:'hidden'}}>
        <div style={{padding:'16px 18px 10px', borderBottom:`0.5px solid ${BORDER}`}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
            <div style={{fontSize:'14px', fontWeight:800, color: INK}}>Members</div>
            <FilterPills filter={filter} onChange={setFilter} overdueCount={overdueCount}/>
          </div>
        </div>

        {loading ? (
          <div style={{padding:'40px', textAlign:'center', color: INK_SOFT, fontSize:'13px'}}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} totalCount={patients.length}/>
        ) : (
          <PatientTable patients={filtered} onSelect={setSelected}/>
        )}
      </div>

      {/* Footnote */}
      <div style={{fontSize:'11px', color: INK_SOFT, textAlign:'center', padding:'4px 8px 12px', lineHeight:1.6}}>
        Awaken $444/mo · Align $888/mo · Ascend $1,111/mo. Source: Stripe + concierge_patients. Test accounts excluded from totals.
      </div>

      {selected && (
        <DetailPanel
          API={API} token={token} accent={accent} patient={selected}
          onClose={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
};

// ───── Revenue stats ──────────────────────────────────────────────────────

const RevenueStatsGrid: React.FC<{stats: {mrrCents:number; arrCents:number; active:number; totalEver:number; retention:number; tierBreakdown: Record<TierId, number>}}> = ({ stats }) => {
  const tiles: {label: string; value: string; sub?: string; accent?: 'purple'|'gold'|'rose'|'teal'}[] = [
    { label: 'Monthly revenue', value: dollars(stats.mrrCents), sub: 'Sum of active subscriptions', accent: 'purple' },
    { label: 'Active members',  value: `${stats.active}`,        sub: `${stats.tierBreakdown.awaken} Awaken · ${stats.tierBreakdown.align} Align · ${stats.tierBreakdown.ascend} Ascend`, accent: 'teal' },
    { label: 'ARR',             value: dollars(stats.arrCents),  sub: 'Monthly × 12', accent: 'gold' },
    { label: 'Retention',       value: `${stats.retention}%`,    sub: `${stats.active} of ${stats.totalEver} ever enrolled`, accent: 'rose' },
  ];
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px'}}>
      {tiles.map(t => (
        <div key={t.label} style={{
          ...CARD, padding:'18px',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800}}>
            {t.label}
          </div>
          <div style={{fontSize:'28px', fontWeight:800, color: INK, marginTop:'8px', letterSpacing:'-0.5px', lineHeight:1.1}}>
            {t.value}
          </div>
          {t.sub && (
            <div style={{fontSize:'11px', color: INK_SOFT, marginTop:'6px', lineHeight:1.5}}>
              {t.sub}
            </div>
          )}
          <div aria-hidden style={{
            position:'absolute', bottom:0, left:0, right:0, height:'3px',
            background: t.accent === 'gold' ? 'linear-gradient(90deg,#fde8b0,#f8c870)'
                      : t.accent === 'rose' ? 'linear-gradient(90deg,#f0c8d8,#e0a8c0)'
                      : t.accent === 'teal' ? 'linear-gradient(90deg,#C5E8F4,#a8d5e8)'
                      : 'linear-gradient(90deg,#b8b0f0,#9890e0)',
            opacity:0.85,
          }}/>
        </div>
      ))}
    </div>
  );
};

// ───── Revenue by tier — horizontal bars ──────────────────────────────────

const RevenueByTierChart: React.FC<{tierRevenue: Record<TierId, number>; tierBreakdown: Record<TierId, number>}> = ({ tierRevenue, tierBreakdown }) => {
  const max = Math.max(1, tierRevenue.awaken, tierRevenue.align, tierRevenue.ascend);
  const total = tierRevenue.awaken + tierRevenue.align + tierRevenue.ascend;
  return (
    <div style={CARD}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <div style={{fontSize:'14px', fontWeight:800, color: INK}}>Revenue by tier</div>
        <div style={{fontSize:'11px', color: INK_SOFT}}>{dollars(total)} / mo</div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
        {TIER_IDS.map(t => {
          const meta = TIER_META[t];
          const cents = tierRevenue[t];
          const share = (cents / max) * 100;
          const count = tierBreakdown[t];
          return (
            <div key={t}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'6px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{fontSize:'13px', fontWeight:800, color: INK}}>{meta.label}</span>
                  <span style={{fontSize:'10px', color: INK_SOFT, fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase'}}>{count} member{count === 1 ? '' : 's'}</span>
                </div>
                <div style={{fontSize:'13px', fontWeight:800, color: INK}}>{dollars(cents)}<span style={{fontSize:'10px', color: INK_SOFT, fontWeight:600, marginLeft:'4px'}}>/mo</span></div>
              </div>
              <div style={{height:'14px', borderRadius:'8px', background:'rgba(83,74,183,0.06)', overflow:'hidden'}}>
                <div style={{
                  width: `${cents > 0 ? Math.max(2, share) : 0}%`,
                  height:'100%',
                  background: meta.barGradient,
                  borderRadius:'8px',
                  transition:'width 360ms ease',
                  boxShadow: cents > 0 ? '0 2px 6px rgba(83,74,183,0.15)' : 'none',
                }}/>
              </div>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <div style={{marginTop:'12px', fontSize:'11px', color: INK_SOFT, fontStyle:'italic', textAlign:'center'}}>
          No active subscriptions yet. Start a subscription on a member's row to populate this chart.
        </div>
      )}
    </div>
  );
};

// ───── Filters ────────────────────────────────────────────────────────────

const FilterPills: React.FC<{filter: FilterId; onChange: (f: FilterId) => void; overdueCount: number}> = ({ filter, onChange, overdueCount }) => {
  const items: {id: FilterId; label: string}[] = [
    { id: 'all',    label: 'All' },
    { id: 'awaken', label: 'Awaken' },
    { id: 'align',  label: 'Align' },
    { id: 'ascend', label: 'Ascend' },
    { id: 'overdue', label: overdueCount > 0 ? `Overdue · ${overdueCount}` : 'Overdue' },
  ];
  return (
    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
      {items.map(it => {
        const active = filter === it.id;
        const isOverdue = it.id === 'overdue';
        return (
          <button key={it.id} onClick={() => onChange(it.id)}
            style={{
              padding:'6px 12px', borderRadius:'999px',
              border: active ? `1px solid ${isOverdue ? '#a02020' : PURPLE}` : `1px solid ${BORDER}`,
              background: active
                ? (isOverdue ? 'rgba(224,80,80,0.1)' : PURPLE_SOFT)
                : 'rgba(255,255,255,0.85)',
              color: active ? (isOverdue ? '#a02020' : PURPLE) : INK_SOFT,
              fontSize:'11px', fontWeight: active ? 800 : 600,
              letterSpacing:'0.3px',
              cursor:'pointer', fontFamily:'inherit',
            }}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
};

// ───── Patient list ───────────────────────────────────────────────────────

const PatientTable: React.FC<{patients: BillingPatient[]; onSelect: (p: BillingPatient) => void}> = ({ patients, onSelect }) => {
  return (
    <div>
      {patients.map((p, idx) => (
        <PatientRow key={p.id} p={p} onSelect={() => onSelect(p)} isLast={idx === patients.length - 1}/>
      ))}
    </div>
  );
};

const PatientRow: React.FC<{p: BillingPatient; onSelect: () => void; isLast: boolean}> = ({ p, onSelect, isLast }) => {
  const meta = (TIER_META as any)[p.tier] as typeof TIER_META[TierId] | undefined;
  const dot = statusDot(p.status, p.current_period_end);
  const days = daysUntil(p.current_period_end);
  const nextBilling = p.current_period_end
    ? new Date(p.current_period_end).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })
    : '—';
  return (
    <button onClick={onSelect}
      style={{
        width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
        display:'grid',
        gridTemplateColumns: 'minmax(40px,40px) minmax(160px,2.2fr) minmax(110px,1fr) minmax(90px,1fr) minmax(110px,1fr) minmax(90px,1fr) minmax(20px,20px)',
        alignItems:'center', gap:'12px',
        padding:'14px 18px',
        border:'none', background:'transparent',
        borderBottom: isLast ? 'none' : `0.5px solid ${BORDER}`,
      }}>
      <Avatar initials={initialsFor(p.name)} tier={(p.tier as TierId)}/>

      <div style={{minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <div style={{fontSize:'13.5px', fontWeight:800, color: INK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.name}</div>
          {p.test_account && (
            <span style={{fontSize:'9px', padding:'1px 6px', borderRadius:'999px', background:'#FFF3DA', color:'#7a5a10', fontWeight:700, letterSpacing:'0.3px', textTransform:'uppercase', flexShrink:0}}>Test</span>
          )}
        </div>
        <div style={{fontSize:'11px', color: INK_SOFT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.email}</div>
      </div>

      <div style={{fontSize:'12px', color: INK, fontWeight:600}}>
        {nextBilling}
        {days !== null && days >= 0 && days <= 3 && (
          <div style={{fontSize:'10px', color:'#a06810', fontWeight:700, marginTop:'2px'}}>in {days === 0 ? 'today' : `${days}d`}</div>
        )}
      </div>

      <div>
        <VisitsPill used={p.visits_used} allowed={p.visits_allowed}/>
      </div>

      <div>
        {meta && <TierBadge tier={p.tier as TierId}/>}
      </div>

      <div style={{fontSize:'13px', fontWeight:800, color: INK, textAlign:'right'}}>
        ${(p.monthly_cents / 100).toLocaleString()}<span style={{fontSize:'10px', color: INK_SOFT, fontWeight:600, marginLeft:'2px'}}>/mo</span>
      </div>

      <div title={dot.label} aria-label={dot.label} style={{
        width:'10px', height:'10px', borderRadius:'50%', background: dot.color,
        boxShadow: `0 0 0 3px ${dot.halo}`, justifySelf:'end',
      }}/>
    </button>
  );
};

const Avatar: React.FC<{initials: string; tier: TierId | string}> = ({ initials, tier }) => {
  const meta = (TIER_META as any)[tier] as typeof TIER_META[TierId] | undefined;
  return (
    <div style={{
      width:'36px', height:'36px', borderRadius:'50%',
      background: meta?.barGradient || 'linear-gradient(135deg,#EEEBFA,#d8d2f4)',
      color: INK, fontWeight:800, fontSize:'12px',
      display:'flex', alignItems:'center', justifyContent:'center',
      letterSpacing:'-0.3px',
      border:'1px solid rgba(255,255,255,0.7)',
      boxShadow:'0 2px 6px rgba(83,74,183,0.12)',
    }}>{initials}</div>
  );
};

const TierBadge: React.FC<{tier: TierId}> = ({ tier }) => {
  const meta = TIER_META[tier];
  const isAscend = tier === 'ascend';
  return (
    <span style={{
      display:'inline-block',
      fontSize:'10px', fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase',
      padding:'4px 10px', borderRadius:'999px',
      background: meta.badgeBg,
      color: meta.badgeText,
      boxShadow: isAscend ? '0 2px 6px rgba(248,200,112,0.35)' : 'none',
      border: isAscend ? '0.5px solid rgba(218,164,68,0.4)' : 'none',
    }}>{meta.label}</span>
  );
};

const VisitsPill: React.FC<{used: number; allowed: number}> = ({ used, allowed }) => {
  const pct = allowed > 0 ? (used / allowed) : 0;
  const tight = pct >= 1;
  return (
    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
      <div style={{
        fontSize:'11px', fontWeight:800,
        color: tight ? '#a02020' : INK,
      }}>
        {used}<span style={{color: INK_SOFT, fontWeight:600}}>/{allowed}</span>
      </div>
      <div style={{flex:1, maxWidth:'42px', height:'4px', borderRadius:'4px', background:'rgba(83,74,183,0.08)', overflow:'hidden'}}>
        <div style={{
          width: `${Math.min(100, pct * 100)}%`,
          height:'100%',
          background: tight ? 'linear-gradient(90deg,#e89090,#a02020)' : 'linear-gradient(90deg,#b8b0f0,#9890e0)',
        }}/>
      </div>
    </div>
  );
};

function statusDot(status: string, periodEnd: string | null): {color: string; halo: string; label: string} {
  if (status === 'past_due' || status === 'incomplete' || status === 'unpaid') {
    return { color: '#dc4040', halo: 'rgba(220,64,64,0.18)', label: 'Payment failed' };
  }
  if (status === 'active') {
    const d = daysUntil(periodEnd);
    if (d !== null && d >= 0 && d <= 3) {
      return { color: '#e2a73a', halo: 'rgba(226,167,58,0.20)', label: `Billing due in ${d}d` };
    }
    return { color: '#52a96b', halo: 'rgba(82,169,107,0.18)', label: 'Active · payment current' };
  }
  if (status === 'paused') return { color: '#9b8fe8', halo: 'rgba(155,143,232,0.20)', label: 'Paused' };
  if (status === 'canceled') return { color: '#aaaaaa', halo: 'rgba(170,170,170,0.18)', label: 'Canceled' };
  return { color: '#bbbbbb', halo: 'rgba(180,180,180,0.18)', label: 'No subscription' };
}

const EmptyState: React.FC<{filter: FilterId; totalCount: number}> = ({ filter, totalCount }) => (
  <div style={{padding:'42px 20px', textAlign:'center', color: INK_SOFT}}>
    <div style={{fontSize:'34px', marginBottom:'10px', opacity:0.4}}>◯</div>
    <div style={{fontSize:'14px', fontWeight:800, color: INK, marginBottom:'6px'}}>
      {totalCount === 0 ? 'No paying members yet' : 'No matches for this filter'}
    </div>
    <div style={{fontSize:'12px'}}>
      {totalCount === 0
        ? 'Add a patient and start a subscription to populate billing.'
        : filter === 'overdue'
          ? 'Nothing flagged — every active subscription is paid up.'
          : 'Try a different tier or "All".'}
    </div>
  </div>
);

// ───── Detail panel (slide-in) ────────────────────────────────────────────

const DetailPanel: React.FC<{API:string; token:string; accent:string; patient:BillingPatient; onClose:()=>void}> = ({ API, token, accent, patient, onClose }) => {
  const [billing, setBilling] = useState<BillingDetail | null>(null);
  const [energy, setEnergy] = useState<EnergyEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ok:boolean; text:string} | null>(null);
  const [showTierChange, setShowTierChange] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/patients/${patient.id}/billing`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/concierge/patients/${patient.id}/energy?days=30`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { entries: [] }),
      fetch(`${API}/concierge/patients/${patient.id}/journal?limit=50`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { entries: [] }),
    ])
      .then(([b, e, j]) => { setBilling(b); setEnergy(e.entries || []); setJournal(j.entries || []); })
      .finally(() => setLoading(false));
  }, [API, token, patient.id]);

  useEffect(() => { load(); }, [load]);

  // Lock background scroll while the panel is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const action = async (key: string, path: string, body?: any) => {
    setBusy(key); setBanner(null);
    try {
      const res = await fetch(`${API}/concierge/patients/${patient.id}/billing/${path}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`);
      setBilling(json);
      setBanner({ok:true, text:'Updated.'});
      setTimeout(() => setBanner(null), 2400);
    } catch (e: any) {
      setBanner({ok:false, text: e.message || 'Action failed'});
    } finally {
      setBusy(null);
    }
  };

  const recentInvoices = (billing?.invoices || []).slice(0, 3);
  const avgEnergy = energy.length ? (energy.reduce((s, e) => s + e.energy_score, 0) / energy.length) : 0;
  const flaggedDays = energy.filter(e => e.energy_score <= 2).length;
  const meta = (TIER_META as any)[patient.tier] as typeof TIER_META[TierId] | undefined;
  const joined = patient.created_at ? new Date(patient.created_at).toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'}) : '—';

  return (
    <div onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:2000,
        background:'rgba(31,27,58,0.45)',
        backdropFilter:'blur(4px)',
        display:'flex', justifyContent:'flex-end',
      }}>
      <div ref={panelRef} onClick={e => e.stopPropagation()}
        style={{
          width:'min(100%, 520px)', height:'100%',
          background: PAGE_BG, color: INK,
          overflowY:'auto',
          boxShadow:'-20px 0 60px rgba(31,27,58,0.25)',
          animation:'soulmdSlideInRight 280ms ease',
        }}>
        <style>{`@keyframes soulmdSlideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Top bar */}
        <div style={{position:'sticky', top:0, zIndex:5, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)', borderBottom:`0.5px solid ${BORDER}`, padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'11px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800}}>Member detail</div>
          <button onClick={onClose}
            style={{background:'transparent', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'6px 12px', fontSize:'12px', fontWeight:700, color: INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>
            Close ✕
          </button>
        </div>

        <div style={{padding:'20px 18px 60px', display:'flex', flexDirection:'column', gap:'14px'}}>

          {/* Header card */}
          <div style={{...CARD, display:'flex', gap:'14px', alignItems:'center'}}>
            <div style={{
              width:'56px', height:'56px', borderRadius:'50%',
              background: meta?.barGradient || PURPLE_SOFT,
              color: INK, fontSize:'18px', fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center',
              letterSpacing:'-0.3px',
              border:'1px solid rgba(255,255,255,0.6)',
              boxShadow:'0 4px 12px rgba(83,74,183,0.18)',
            }}>{initialsFor(patient.name)}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:'18px', fontWeight:800, color: INK, letterSpacing:'-0.3px'}}>{patient.name}</div>
              <div style={{fontSize:'12px', color: INK_SOFT, wordBreak:'break-all'}}>{patient.email}</div>
              <div style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'8px', flexWrap:'wrap'}}>
                {meta && <TierBadge tier={patient.tier as TierId}/>}
                <span style={{fontSize:'11px', color: INK_SOFT}}>· ${(patient.monthly_cents/100).toLocaleString()}/mo</span>
                <span style={{fontSize:'11px', color: INK_SOFT}}>· joined {joined}</span>
              </div>
            </div>
          </div>

          {banner && (
            <div style={{padding:'10px 14px', borderRadius:'12px', fontSize:'12px',
              background: banner.ok ? 'rgba(82,169,107,0.10)' : 'rgba(220,64,64,0.10)',
              color:    banner.ok ? '#1f6633' : '#a02020',
              border: `1px solid ${banner.ok ? 'rgba(82,169,107,0.3)' : 'rgba(220,64,64,0.3)'}`,
            }}>{banner.text}</div>
          )}

          {/* Quick actions */}
          <div style={{...CARD}}>
            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'10px'}}>Quick actions</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px'}}>
              <ActionButton label="Send message" icon="◌" onClick={() => { window.location.hash = `#messages-${patient.id}`; onClose(); }}/>
              <ActionButton label="Book session" icon="◱" onClick={() => { window.location.hash = `#book-${patient.id}`; onClose(); }}/>
              <ActionButton label="Change tier"  icon="↕" onClick={() => setShowTierChange(true)} disabled={!billing?.stripe_subscription_id}/>
            </div>
            {!billing?.stripe_subscription_id && (
              <div style={{fontSize:'10px', color: INK_SOFT, marginTop:'8px', fontStyle:'italic'}}>
                No active subscription — start one from the Members tab.
              </div>
            )}
          </div>

          {/* Visits */}
          <div style={{...CARD}}>
            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'10px'}}>This cycle</div>
            <UsageRow label="Medical visits"     used={patient.visits_used}      allowed={patient.visits_allowed}/>
            <div style={{height:'10px'}}/>
            <UsageRow label="Guided meditations" used={patient.meditations_used} allowed={patient.meditations_allowed}/>
            {patient.current_period_end && (
              <div style={{fontSize:'11px', color: INK_SOFT, marginTop:'10px'}}>
                Resets {new Date(patient.current_period_end).toLocaleDateString(undefined, {month:'short', day:'numeric'})} (no rollover)
              </div>
            )}
          </div>

          {/* Wellness summary */}
          <div style={{...CARD}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'10px'}}>
              <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800}}>Wellness · last 30 days</div>
              {flaggedDays > 0 && (
                <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'999px', background:'rgba(232,144,176,0.18)', color:'#a02060', fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase'}}>
                  {flaggedDays} flagged day{flaggedDays === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
              <Mini label="Avg energy" value={avgEnergy ? avgEnergy.toFixed(1) : '—'}/>
              <Mini label="Entries"    value={`${energy.length}`}/>
              <Mini label="Reflections" value={`${journal.length}`}/>
            </div>
            {energy.length === 0 && journal.length === 0 && (
              <div style={{fontSize:'11px', color: INK_SOFT, marginTop:'10px', fontStyle:'italic'}}>
                No energy entries or reflections yet — patient hasn't logged a check-in.
              </div>
            )}
          </div>

          {/* Billing history */}
          <div style={{...CARD}}>
            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800, marginBottom:'10px'}}>Billing history · last 3 months</div>
            {loading ? (
              <div style={{padding:'14px', textAlign:'center', fontSize:'12px', color: INK_SOFT}}>Loading…</div>
            ) : recentInvoices.length === 0 ? (
              <div style={{padding:'14px', textAlign:'center', fontSize:'12px', color: INK_SOFT, fontStyle:'italic'}}>
                No invoices yet — first charge creates the first invoice.
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {recentInvoices.map(inv => (
                  <div key={inv.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background: PAGE_BG, borderRadius:'10px', border:`0.5px solid ${BORDER}`}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:'12px', fontWeight:700, color: INK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{inv.description || `Invoice ${inv.number || inv.id.slice(-8)}`}</div>
                      <div style={{fontSize:'10px', color: INK_SOFT}}>{inv.created ? new Date(inv.created).toLocaleDateString() : '—'}</div>
                    </div>
                    <div style={{textAlign:'right', flexShrink:0}}>
                      <div style={{fontSize:'13px', fontWeight:800, color: INK}}>{dollars(inv.amount_paid_cents || inv.amount_due_cents)}</div>
                      <div style={{fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.5px', color: inv.status === 'paid' ? '#1f6633' : '#a02020', fontWeight:800}}>{inv.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {billing?.upcoming_invoice && (
              <div style={{marginTop:'10px', fontSize:'11px', color: PURPLE, fontWeight:700}}>
                Upcoming: {dollars(billing.upcoming_invoice.amount_due_cents)}
                {billing.upcoming_invoice.next_payment_attempt && ` · ${new Date(billing.upcoming_invoice.next_payment_attempt).toLocaleDateString()}`}
              </div>
            )}
          </div>

        </div>
      </div>

      {showTierChange && billing && (
        <TierChangeModal
          currentTier={billing.tier}
          accent={accent}
          busy={!!busy}
          onClose={() => setShowTierChange(false)}
          onPick={(tier, cycle) => { setShowTierChange(false); action(`change_${tier}_${cycle}`, 'change-tier', {tier, cycle}); }}
        />
      )}
    </div>
  );
};

const ActionButton: React.FC<{label:string; icon:string; onClick:()=>void; disabled?:boolean}> = ({ label, icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      background: disabled ? 'rgba(83,74,183,0.05)' : '#FFFFFF',
      border: `0.5px solid ${BORDER}`,
      borderRadius:'12px', padding:'12px 8px',
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily:'inherit',
      display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
      color: disabled ? INK_SOFT : INK,
      opacity: disabled ? 0.55 : 1,
      transition:'background 180ms ease',
    }}>
    <span style={{fontSize:'18px', color: PURPLE}}>{icon}</span>
    <span style={{fontSize:'11px', fontWeight:800, letterSpacing:'0.3px', textAlign:'center'}}>{label}</span>
  </button>
);

const UsageRow: React.FC<{label:string; used:number; allowed:number}> = ({ label, used, allowed }) => {
  const pct = allowed > 0 ? Math.min(100, (used / allowed) * 100) : 0;
  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'4px'}}>
        <span style={{fontSize:'12px', color: INK, fontWeight:700}}>{label}</span>
        <span style={{fontSize:'12px', color: INK_SOFT, fontWeight:600}}><b style={{color: INK}}>{used}</b>/{allowed}</span>
      </div>
      <div style={{height:'6px', borderRadius:'4px', background:'rgba(83,74,183,0.06)', overflow:'hidden'}}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: pct >= 100 ? 'linear-gradient(90deg,#e89090,#a02020)' : 'linear-gradient(90deg,#b8b0f0,#9890e0)',
        }}/>
      </div>
    </div>
  );
};

const Mini: React.FC<{label:string; value:string}> = ({ label, value }) => (
  <div style={{padding:'12px 10px', background: PAGE_BG, borderRadius:'12px', border:`0.5px solid ${BORDER}`, textAlign:'center'}}>
    <div style={{fontSize:'9px', letterSpacing:'1.2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:800}}>{label}</div>
    <div style={{fontSize:'20px', fontWeight:800, color: INK, marginTop:'4px', letterSpacing:'-0.3px'}}>{value}</div>
  </div>
);

// ───── Tier change modal ──────────────────────────────────────────────────

const TierChangeModal: React.FC<{
  currentTier: string;
  accent: string;
  busy: boolean;
  onClose: () => void;
  onPick: (tier: TierId, cycle: 'monthly' | 'yearly') => void;
}> = ({ currentTier, accent, busy, onClose, onPick }) => {
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2100, background:'rgba(31,27,58,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'20px', padding:'22px', maxWidth:'460px', width:'100%', boxShadow:'0 20px 60px rgba(31,27,58,0.3)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
          <div style={{fontSize:'17px', fontWeight:800, color: INK}}>Change tier</div>
          <button onClick={onClose} style={{background:'transparent', border:'none', fontSize:'20px', color: INK_SOFT, cursor:'pointer'}}>×</button>
        </div>
        <div style={{fontSize:'12px', color: INK_SOFT, marginBottom:'14px', lineHeight:1.5}}>Prorated for the current billing period.</div>
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {TIER_IDS.flatMap(t => (['monthly','yearly'] as const).map(cyc => {
            const meta = TIER_META[t];
            const amt = cyc === 'monthly' ? meta.monthly : meta.yearly;
            const current = t === currentTier;
            return (
              <button key={`${t}_${cyc}`} disabled={busy}
                onClick={() => onPick(t, cyc)}
                style={{
                  background: current ? PURPLE_SOFT : 'white',
                  border: `0.5px solid ${current ? PURPLE : BORDER}`,
                  borderRadius:'12px', padding:'12px 14px',
                  fontSize:'13px', fontWeight:700, color: INK, cursor: busy ? 'wait' : 'pointer',
                  textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center',
                  fontFamily:'inherit',
                }}>
                <span>{meta.label} · {cyc === 'monthly' ? 'Monthly' : 'Annual'}{current && <span style={{fontSize:'10px', color: INK_SOFT, marginLeft:'6px'}}>· current</span>}</span>
                <span style={{color: PURPLE}}>${amt.toLocaleString()}{cyc === 'monthly' ? '/mo' : '/yr'}</span>
              </button>
            );
          }))}
        </div>
      </div>
    </div>
  );
};

export default BillingSection;
