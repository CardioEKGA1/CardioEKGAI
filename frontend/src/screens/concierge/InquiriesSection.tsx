// © 2026 SoulMD, LLC. All rights reserved.
//
// Inquiries tab — physician dashboard. Lists rows from
// concierge_inquiries (the public /concierge-medicine/inquire form
// drops new entries here). The owner reviews each one and either:
//   • Approves at a chosen tier+cycle → backend creates a Stripe
//     Checkout Session and emails the payment link to the inquirer.
//     The inquiry flips to "responded" and the patient is provisioned
//     by the Stripe webhook on successful payment.
//   • Declines → inquiry row is deleted (inquirer is not notified).
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface Inquiry {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  tier_interest: string | null;       // awaken | align | ascend | unsure | null
  message: string;
  dob: string | null;
  health_history: string;
  heard_from: string | null;
  insurance_acknowledged: boolean;
  status: 'pending' | 'responded' | 'enrolled' | 'declined' | string;
  created_at: string | null;
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius:'16px',
  border: '1px solid rgba(122,176,240,0.2)',
  boxShadow: '0 2px 10px rgba(100,130,200,0.1)',
  padding:'16px',
};

const TIER_LABEL: Record<string, string> = {
  awaken: 'Awaken', align: 'Align', ascend: 'Ascend', unsure: 'Not sure',
};
const TIER_COLOR: Record<string, string> = {
  awaken: '#7ab0f0', align: '#534AB7', ascend: '#C9A84C', unsure: '#9098a8',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', responded: 'Awaiting payment', enrolled: 'Enrolled',
};

const InquiriesSection: React.FC<Props> = ({ API, token, accent }) => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all'|'pending'|'responded'|'enrolled'>('pending');
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingMsg, setActingMsg] = useState('');
  const [approveTarget, setApproveTarget] = useState<Inquiry | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Inquiry | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/inquiries`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setInquiries(data.inquiries || []); setErr(''); })
      .catch(() => setErr('Could not load inquiries.'))
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return inquiries;
    return inquiries.filter(i => (i.status || 'pending') === filter);
  }, [inquiries, filter]);

  const counts = useMemo(() => ({
    all: inquiries.length,
    pending:   inquiries.filter(i => (i.status || 'pending') === 'pending').length,
    responded: inquiries.filter(i => i.status === 'responded').length,
    enrolled:  inquiries.filter(i => i.status === 'enrolled').length,
  }), [inquiries]);

  const flash = (msg: string) => {
    setActingMsg(msg);
    setTimeout(() => setActingMsg(''), 3000);
  };

  const approve = async (inquiry: Inquiry, tier: string, cycle: 'monthly'|'yearly') => {
    setActingId(inquiry.id);
    try {
      const res = await fetch(`${API}/concierge/inquiries/${inquiry.id}/approve-and-checkout`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ tier, cycle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Approve failed');
      flash(`✓ Approved ${inquiry.name || inquiry.email} — payment link emailed.`);
      setApproveTarget(null);
      load();
    } catch (e: any) {
      alert(e.message || 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const decline = async (inquiry: Inquiry) => {
    setActingId(inquiry.id);
    try {
      const res = await fetch(`${API}/concierge/inquiries/${inquiry.id}`, {
        method:'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || 'Decline failed');
      flash(`Declined ${inquiry.name || inquiry.email}.`);
      setDeclineTarget(null);
      load();
    } catch (e: any) {
      alert(e.message || 'Decline failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap', marginBottom:'14px'}}>
        <div>
          <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a'}}>Inquiries</div>
          <div style={{fontSize:'12px', color:'#4a7ad0'}}>{counts.pending} pending · {counts.responded} awaiting payment · {counts.enrolled} enrolled</div>
        </div>
        <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
          {(['pending','responded','enrolled','all'] as const).map(f => {
            const active = filter === f;
            return (
              <button key={f} onClick={()=>setFilter(f)} style={{
                background: active ? accent : 'rgba(255,255,255,0.85)',
                color: active ? 'white' : '#4a7ad0',
                border: '1px solid rgba(122,176,240,0.3)',
                borderRadius:'10px', padding:'7px 12px',
                fontSize:'12px', fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                textTransform:'capitalize',
              }}>
                {f} <span style={{opacity:0.7, marginLeft:'4px'}}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {err && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'10px', padding:'10px 12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{err}</div>}
      {actingMsg && <div style={{background:'rgba(201,168,76,0.10)', border:'1px solid rgba(201,168,76,0.4)', borderRadius:'10px', padding:'10px 14px', color:'#7a5a10', fontSize:'12.5px', marginBottom:'12px', fontWeight:700}}>{actingMsg}</div>}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0', fontSize:'13px'}}>Loading inquiries…</div>
      ) : filtered.length === 0 ? (
        <div style={{...CARD, textAlign:'center', padding:'40px 20px', color:'#4a7ad0'}}>
          <div style={{fontSize:'36px', marginBottom:'10px', opacity:0.4}}>✉︎</div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#1a2a4a', marginBottom:'4px'}}>
            {filter === 'pending' ? 'No pending inquiries.' : `No ${filter} inquiries.`}
          </div>
          <div style={{fontSize:'12px'}}>Inquiries from the /concierge-medicine landing page will appear here.</div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          {filtered.map(i => {
            const tierKey = (i.tier_interest || 'unsure').toLowerCase();
            const tierLabel = TIER_LABEL[tierKey] || tierKey;
            const tierColor = TIER_COLOR[tierKey] || '#9098a8';
            const status = (i.status || 'pending');
            const created = i.created_at ? new Date(i.created_at) : null;
            const busy = actingId === i.id;
            const isExpanded = !!expanded[i.id];
            return (
              <div key={i.id} style={{
                ...CARD,
                background: status === 'pending' ? 'linear-gradient(180deg, rgba(255,250,236,0.85), rgba(255,255,255,0.85))' : CARD.background,
                borderColor: status === 'pending' ? 'rgba(201,168,76,0.45)' : 'rgba(122,176,240,0.2)',
              }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'8px', flexWrap:'wrap'}}>
                  <div style={{minWidth:0, flex:1}}>
                    <div style={{fontSize:'15px', fontWeight:800, color:'#1a2a4a', marginBottom:'2px'}}>{i.name || <span style={{color:'#A88830', fontStyle:'italic'}}>(no name)</span>}</div>
                    <div style={{fontSize:'12px', color:'#4a5e6a', wordBreak:'break-all'}}>
                      {i.email}{i.phone ? ` · ${i.phone}` : ''}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap'}}>
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background:`${tierColor}1a`, color:tierColor, fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase', whiteSpace:'nowrap'}}>{tierLabel}</span>
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'999px', background: status === 'enrolled' ? 'rgba(88,196,142,0.15)' : status === 'responded' ? 'rgba(83,74,183,0.12)' : 'rgba(201,168,76,0.15)', color: status === 'enrolled' ? '#1d7a4a' : status === 'responded' ? '#534AB7' : '#7a5a10', fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase', whiteSpace:'nowrap'}}>
                      {STATUS_LABEL[status] || status}
                    </span>
                  </div>
                </div>

                {created && <div style={{fontSize:'11px', color:'#7090a8', marginBottom:'10px'}}>Received {created.toLocaleString()}</div>}

                {(i.health_history || i.message) && (
                  <div style={{marginBottom:'10px'}}>
                    <button onClick={()=>setExpanded(s => ({...s, [i.id]: !s[i.id]}))}
                      style={{background:'transparent', border:'none', padding:0, fontSize:'11.5px', color:'#4a7ad0', fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
                      {isExpanded ? '▾ Hide details' : '▸ Show details'}
                    </button>
                    {isExpanded && (
                      <div style={{marginTop:'8px', padding:'12px 14px', background:'rgba(247,244,254,0.7)', border:'1px solid rgba(83,74,183,0.12)', borderRadius:'10px', fontSize:'12.5px', color:'#1a2a4a', lineHeight:1.65, whiteSpace:'pre-wrap'}}>
                        {i.health_history || i.message}
                        {i.dob && <div style={{marginTop:'8px', fontSize:'11px', color:'#6B6889'}}><b>DOB:</b> {i.dob}</div>}
                        {i.heard_from && <div style={{marginTop:'4px', fontSize:'11px', color:'#6B6889'}}><b>Heard from:</b> {i.heard_from}</div>}
                        {i.insurance_acknowledged && <div style={{marginTop:'4px', fontSize:'11px', color:'#6B6889'}}><b>Insurance acknowledgment:</b> ✓</div>}
                      </div>
                    )}
                  </div>
                )}

                {status === 'pending' && (
                  <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                    <button disabled={busy} onClick={()=>setApproveTarget(i)} style={{
                      background:'#C9A84C', border:'none', color:'white',
                      borderRadius:'10px', padding:'8px 16px',
                      fontSize:'12.5px', fontWeight:800, letterSpacing:'0.4px',
                      cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                      fontFamily:'inherit', boxShadow:'0 4px 12px rgba(201,168,76,0.28)',
                    }}>
                      Approve & send payment link
                    </button>
                    <button disabled={busy} onClick={()=>setDeclineTarget(i)} style={{
                      background:'transparent', border:'1px solid rgba(192,64,64,0.4)',
                      color:'#c04040', borderRadius:'10px', padding:'8px 14px',
                      fontSize:'12.5px', fontWeight:700, cursor: busy ? 'wait' : 'pointer',
                      fontFamily:'inherit',
                    }}>
                      Decline
                    </button>
                  </div>
                )}
                {status === 'responded' && (
                  <div style={{fontSize:'11.5px', color:'#534AB7', fontStyle:'italic'}}>
                    Stripe checkout link sent. Patient will be activated automatically when payment lands.
                  </div>
                )}
                {status === 'enrolled' && (
                  <div style={{fontSize:'11.5px', color:'#1d7a4a', fontStyle:'italic'}}>
                    Patient enrolled. Their record now appears in the Members tab.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {approveTarget && (
        <ApproveModal
          inquiry={approveTarget}
          busy={actingId === approveTarget.id}
          onCancel={()=>setApproveTarget(null)}
          onConfirm={(tier, cycle)=>approve(approveTarget, tier, cycle)}
        />
      )}

      {declineTarget && (
        <ConfirmModal
          title="Decline this inquiry?"
          body={<>This permanently removes the inquiry from <b>{declineTarget.email}</b>. They will not be notified.</>}
          confirmLabel={actingId === declineTarget.id ? 'Declining…' : 'Decline & remove'}
          confirmStyle={{background:'#c04040'}}
          onCancel={()=>setDeclineTarget(null)}
          onConfirm={()=>decline(declineTarget)}
          busy={actingId === declineTarget.id}
        />
      )}
    </div>
  );
};

// ───── Approve modal ─────────────────────────────────────────────────
const ApproveModal: React.FC<{
  inquiry: Inquiry;
  busy: boolean;
  onCancel: ()=>void;
  onConfirm: (tier: string, cycle: 'monthly'|'yearly')=>void;
}> = ({ inquiry, busy, onCancel, onConfirm }) => {
  const fallbackTier = (inquiry.tier_interest && ['awaken','align','ascend'].includes(inquiry.tier_interest))
    ? inquiry.tier_interest
    : 'awaken';
  const [tier, setTier] = useState<string>(fallbackTier);
  const [cycle, setCycle] = useState<'monthly'|'yearly'>('monthly');
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
      <div style={{background:'white', borderRadius:'18px', padding:'24px', maxWidth:'460px', width:'100%', boxShadow:'0 16px 50px rgba(26,42,74,0.3)'}}>
        <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a', marginBottom:'4px'}}>Approve inquiry</div>
        <div style={{fontSize:'12.5px', color:'#4a5e6a', marginBottom:'18px', lineHeight:1.6}}>
          A Stripe Checkout link will be emailed to <b>{inquiry.email}</b> for the selected tier. Patient is provisioned automatically when payment completes.
        </div>

        <label style={{display:'block', fontSize:'11px', fontWeight:800, color:'#4a7ad0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px'}}>Tier</label>
        <select value={tier} onChange={e=>setTier(e.target.value)} style={{width:'100%', padding:'10px 12px', borderRadius:'10px', border:'1px solid rgba(122,176,240,0.3)', fontSize:'13px', background:'rgba(240,246,255,0.5)', color:'#1a2a4a', marginBottom:'14px', boxSizing:'border-box', appearance:'auto'}}>
          <option value="awaken">Awaken — $444/mo · $5,000/yr</option>
          <option value="align">Align — $888/mo · $10,000/yr</option>
          <option value="ascend">Ascend — $1,111/mo · $13,000/yr</option>
        </select>

        <label style={{display:'block', fontSize:'11px', fontWeight:800, color:'#4a7ad0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px'}}>Billing cycle</label>
        <div style={{display:'flex', gap:'8px', marginBottom:'18px'}}>
          {(['monthly','yearly'] as const).map(c => (
            <button key={c} onClick={()=>setCycle(c)} style={{
              flex:1, background: cycle === c ? '#534AB7' : 'rgba(255,255,255,0.85)',
              color: cycle === c ? 'white' : '#4a7ad0',
              border:'1px solid rgba(122,176,240,0.3)',
              borderRadius:'10px', padding:'10px',
              fontSize:'13px', fontWeight:700, cursor:'pointer',
              fontFamily:'inherit', textTransform:'capitalize',
            }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
          <button onClick={onCancel} disabled={busy} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onConfirm(tier, cycle)} disabled={busy} style={{background:'#C9A84C', border:'none', color:'white', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', fontWeight:800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, boxShadow:'0 6px 14px rgba(201,168,76,0.28)'}}>
            {busy ? 'Sending…' : 'Send payment link'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmModal: React.FC<{
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmStyle?: React.CSSProperties;
  onCancel: ()=>void;
  onConfirm: ()=>void;
  busy?: boolean;
}> = ({ title, body, confirmLabel, confirmStyle, onCancel, onConfirm, busy }) => (
  <div style={{position:'fixed', inset:0, background:'rgba(26,42,74,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:1500}}>
    <div style={{background:'white', borderRadius:'18px', padding:'24px', maxWidth:'420px', width:'100%', boxShadow:'0 16px 50px rgba(26,42,74,0.3)'}}>
      <div style={{fontSize:'16px', fontWeight:800, color:'#1a2a4a', marginBottom:'8px'}}>{title}</div>
      <div style={{fontSize:'13px', color:'#4a5e6a', marginBottom:'18px', lineHeight:1.6}}>{body}</div>
      <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
        <button onClick={onCancel} disabled={busy} style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
        <button onClick={onConfirm} disabled={busy} style={{border:'none', borderRadius:'10px', padding:'9px 16px', fontSize:'13px', fontWeight:700, color:'white', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, ...confirmStyle}}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export default InquiriesSection;
