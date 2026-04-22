// © 2026 SoulMD, LLC. All rights reserved.
// Physician Dashboard — Home tab. Metric cards, today's schedule,
// member roster, send-an-oracle-card flow.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props { API: string; token: string; accent: string; }

interface TodaySession {
  id: number;
  patient_id: number;
  patient_name: string;
  service_type: string;
  starts_at: string;
  duration_min: number;
  status: string;
}
interface Member {
  id: number; name: string; email: string;
  tier: string; tier_label: string; subscription_status: string;
  visits_used: number; visits_allowed: number;
  meditations_used: number; meditations_allowed: number;
}
interface DashboardPayload {
  today_sessions: TodaySession[];
  tier_counts: { awaken: number; align: number; ascend: number };
  total_active_members: number;
  pending_labs: number;
  flagged_labs: number;
  revenue_mtd_cents: number;
  revenue_lifetime_cents: number;
  members: Member[];
}
interface OracleCardLite {
  id: number; category: string; category_label?: string; category_color?: string;
  title: string; body: string;
}

const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)',
  borderRadius:'16px', border:'1px solid rgba(122,176,240,0.2)',
  boxShadow:'0 2px 10px rgba(100,130,200,0.1)', padding:'16px',
};
const LABEL: React.CSSProperties = {
  fontSize:'10px', fontWeight:800, color:'#4a7ad0',
  letterSpacing:'1.5px', textTransform:'uppercase',
};
const dollars = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

const SERVICE_META: Record<string, { label: string; icon: string; color: string }> = {
  medical_visit:      { label: 'Medical Visit',      icon: '🩺', color: '#3a7ad0' },
  guided_meditation:  { label: 'Guided Meditation',  icon: '🧘', color: '#a070c0' },
  urgent_same_day:    { label: 'Urgent Same-Day',    icon: '⚡', color: '#d86a6a' },
  life_coaching:      { label: 'Life Coaching',      icon: '🧭', color: '#4a7ad0' },
  telehealth:         { label: 'Telehealth',         icon: '💻', color: '#4a9a7a' },
  follow_up:          { label: 'Follow-up',          icon: '🔁', color: '#6a6a6a' },
};

const TIER_COLOR: Record<string, string> = {
  awaken: '#7ab0f0',
  align:  '#4a7ad0',
  ascend: '#1a2a4a',
};

const PhysicianHome: React.FC<Props> = ({ API, token, accent }) => {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOracleSender, setShowOracleSender] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/physician/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setError('Could not load the dashboard.'))
      .finally(() => setLoading(false));
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{padding:'40px', textAlign:'center', color:'#4a7ad0'}}>Loading dashboard…</div>;
  if (error || !data) return <div style={{padding:'40px', textAlign:'center', color:'#a02020'}}>{error || 'No data.'}</div>;

  const now = new Date();
  const nextSession = data.today_sessions.find(s => new Date(s.starts_at) >= now) || data.today_sessions[0];

  return (
    <div>
      {/* Greeting + Quick Start */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'14px', marginBottom:'16px', flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:'22px', fontWeight:800, color:'#1a2a4a', letterSpacing:'-0.3px'}}>Today, {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div style={{fontSize:'13px', color:'#4a7ad0', marginTop:'4px'}}>
            {data.today_sessions.length === 0 ? 'No sessions scheduled today.' :
              data.today_sessions.length === 1 ? '1 session on the books.' :
              `${data.today_sessions.length} sessions on the books.`}
          </div>
        </div>
        {nextSession && (
          <button onClick={() => alert('Phase 2 will open the secure video room for this session.')}
            style={{background: accent, color:'white', border:'none', borderRadius:'12px', padding:'10px 18px', fontSize:'13px', fontWeight:800, cursor:'pointer', boxShadow:'0 8px 20px rgba(122,176,240,0.35)'}}>
            ▶ Quick Start Session
          </button>
        )}
      </div>

      {/* 4 metric cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px', marginBottom:'14px'}}>
        <Metric title="Active members" value={String(data.total_active_members)} detail={`${data.tier_counts.ascend} Ascend · ${data.tier_counts.align} Align · ${data.tier_counts.awaken} Awaken`} accent={accent}/>
        <Metric title="Today" value={String(data.today_sessions.length)} detail="sessions" accent={accent}/>
        <Metric title="Labs to review" value={String(data.pending_labs)} detail={data.flagged_labs > 0 ? `${data.flagged_labs} flagged` : 'all clear'} accent={accent} alarm={data.pending_labs > 0}/>
        <Metric title="MTD revenue" value={dollars(data.revenue_mtd_cents)} detail={`${dollars(data.revenue_lifetime_cents)} lifetime`} accent={accent}/>
      </div>

      {/* Today's schedule */}
      <div style={{...CARD, marginBottom:'12px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <span style={LABEL}>Today's schedule</span>
          {data.today_sessions.length > 0 && <span style={{fontSize:'11px', color:'#6a8ab0'}}>MST</span>}
        </div>
        {data.today_sessions.length === 0 ? (
          <div style={{padding:'18px', textAlign:'center', color:'#6a8ab0', fontSize:'13px'}}>
            A quiet day. Room for deep work, a long walk, or reaching out to a member.
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {data.today_sessions.map(s => {
              const meta = SERVICE_META[s.service_type] || { label: s.service_type, icon: '📅', color: '#6a8ab0' };
              const when = new Date(s.starts_at);
              return (
                <div key={s.id} style={{display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.65)', borderRadius:'12px', border:'1px solid rgba(122,176,240,0.15)'}}>
                  <div style={{width:'60px', textAlign:'center'}}>
                    <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a'}}>{when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
                    <div style={{fontSize:'10px', color:'#6a8ab0'}}>{s.duration_min} min</div>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.patient_name}</div>
                    <div style={{fontSize:'11px', color: meta.color, fontWeight:600, marginTop:'2px'}}>{meta.icon} {meta.label}</div>
                  </div>
                  <span style={statusPill(s.status)}>{s.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send oracle card CTA */}
      <button onClick={() => setShowOracleSender(true)}
        style={{
          width:'100%', background:'linear-gradient(135deg, #1a0d35 0%, #4a2d6b 60%, #9e7bd4 100%)',
          color:'white', border:'none', borderRadius:'16px', padding:'14px 18px',
          cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px',
          boxShadow:'0 10px 24px rgba(74,45,107,0.32)', marginBottom:'14px', textAlign:'left',
        }}>
        <span>
          <span style={{display:'block', fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', opacity:0.75, fontWeight:700}}>Send an oracle card</span>
          <span style={{display:'block', fontSize:'14px', fontWeight:800, marginTop:'3px'}}>Drop a message into a patient's inbox ✨</span>
        </span>
        <span style={{fontSize:'20px'}}>→</span>
      </button>

      {/* Member roster */}
      <div style={CARD}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <span style={LABEL}>Members</span>
          <span style={{fontSize:'11px', color:'#6a8ab0'}}>{data.members.length} showing · {data.total_active_members} active</span>
        </div>
        {data.members.length === 0 ? (
          <div style={{padding:'18px', textAlign:'center', color:'#6a8ab0', fontSize:'13px'}}>No members yet. Add one from the Patients tab.</div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {data.members.map(m => <MemberRow key={m.id} m={m}/>)}
          </div>
        )}
      </div>

      {showOracleSender && (
        <SendOracleModal
          API={API} token={token} accent={accent}
          members={data.members}
          onClose={() => setShowOracleSender(false)}
          onSent={() => setShowOracleSender(false)}
        />
      )}
    </div>
  );
};

const Metric: React.FC<{title: string; value: string; detail?: string; accent: string; alarm?: boolean}> = ({ title, value, detail, accent, alarm }) => (
  <div style={{...CARD, padding:'14px', borderColor: alarm ? 'rgba(224,80,80,0.35)' : 'rgba(122,176,240,0.2)'}}>
    <div style={LABEL}>{title}</div>
    <div style={{fontSize:'22px', fontWeight:800, color: alarm ? '#a02020' : '#1a2a4a', marginTop:'4px', lineHeight:1.1}}>{value}</div>
    {detail && <div style={{fontSize:'10px', color:'#6a8ab0', marginTop:'6px'}}>{detail}</div>}
  </div>
);

const statusPill = (status: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    scheduled: ['rgba(122,176,240,0.15)', '#4a7ad0'],
    completed: ['rgba(112,184,112,0.15)', '#2a7a2a'],
    canceled:  ['rgba(160,160,160,0.15)', '#808080'],
    no_show:   ['rgba(224,140,80,0.18)',  '#a85020'],
  };
  const [bg, color] = map[status] || ['rgba(122,176,240,0.15)', '#4a7ad0'];
  return { fontSize:'10px', padding:'3px 10px', borderRadius:'999px', background: bg, color, fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase', whiteSpace:'nowrap' };
};

const MemberRow: React.FC<{m: Member}> = ({ m }) => {
  const color = TIER_COLOR[m.tier] || '#6a8ab0';
  const active = (m.subscription_status || '').toLowerCase() === 'active';
  const vPct = m.visits_allowed > 0 ? Math.round((m.visits_used / m.visits_allowed) * 100) : 0;
  return (
    <div style={{display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.65)', borderRadius:'12px', border:'1px solid rgba(122,176,240,0.12)', opacity: active ? 1 : 0.55}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:'13px', fontWeight:700, color:'#1a2a4a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{m.name}</div>
        <div style={{fontSize:'11px', color:'#6a8ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{m.email}</div>
      </div>
      <span style={{fontSize:'10px', fontWeight:800, padding:'3px 10px', borderRadius:'999px', background:`${color}1f`, color, letterSpacing:'0.4px', textTransform:'uppercase'}}>{m.tier_label || m.tier}</span>
      <div style={{textAlign:'right', minWidth:'80px'}}>
        <div style={{fontSize:'11px', fontWeight:700, color:'#1a2a4a'}}>{m.visits_used}/{m.visits_allowed} visits</div>
        <div style={{fontSize:'10px', color:'#6a8ab0'}}>{m.meditations_used}/{m.meditations_allowed} meds · {vPct}%</div>
      </div>
    </div>
  );
};

// ───── Send oracle modal ───────────────────────────────────────────────────

const SendOracleModal: React.FC<{API:string; token:string; accent:string; members: Member[]; onClose:()=>void; onSent:()=>void}> = ({ API, token, accent, members, onClose, onSent }) => {
  const [cards, setCards] = useState<OracleCardLite[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${API}/concierge/oracle/library`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { cards: [] })
      .then(d => setCards(d.cards || []))
      .finally(() => setLoadingCards(false));
  }, [API, token]);

  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; color: string }>();
    cards.forEach(c => { if (!seen.has(c.category)) seen.set(c.category, { id: c.category, label: c.category_label || c.category, color: c.category_color || '#6a8ab0' }); });
    return Array.from(seen.values());
  }, [cards]);

  const filtered = useMemo(() => categoryFilter ? cards.filter(c => c.category === categoryFilter) : cards, [cards, categoryFilter]);
  const chosenCard = cards.find(c => c.id === selectedCard);
  const chosenPatient = members.find(m => m.id === selectedPatient);

  const send = async () => {
    if (!selectedPatient || !selectedCard) return;
    setErr(''); setSending(true);
    try {
      const res = await fetch(`${API}/concierge/patients/${selectedPatient}/oracle/send`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ message_id: selectedCard }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Send failed');
      setSent(true);
      setTimeout(() => onSent(), 1200);
    } catch (e: any) { setErr(e.message); }
    finally { setSending(false); }
  };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2500, background:'rgba(26,13,53,0.5)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'20px', width:'100%', maxWidth:'620px', maxHeight:'88vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.25)'}}>
        <div style={{padding:'18px 20px 14px', borderBottom:'1px solid rgba(122,176,240,0.18)'}}>
          <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:'#6b4e7c', opacity:0.7, fontWeight:800}}>Send an oracle card</div>
          <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a', marginTop:'2px'}}>Drop a message into a patient's inbox</div>
        </div>

        <div style={{overflow:'auto', padding:'16px 20px', flex:1}}>
          {/* Patient picker */}
          <div style={LABEL}>Who is this for?</div>
          <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'8px', marginBottom:'16px'}}>
            {members.filter(m => (m.subscription_status || '').toLowerCase() === 'active').map(m => {
              const active = selectedPatient === m.id;
              const color = TIER_COLOR[m.tier] || '#6a8ab0';
              return (
                <button key={m.id} onClick={() => setSelectedPatient(m.id)}
                  style={{
                    padding:'7px 12px', borderRadius:'999px', fontSize:'12px', fontWeight: active ? 800 : 600,
                    border: active ? `1px solid ${color}` : '1px solid rgba(122,176,240,0.25)',
                    background: active ? `${color}18` : 'rgba(255,255,255,0.8)',
                    color: active ? color : '#1a2a4a', cursor:'pointer', fontFamily:'inherit',
                  }}>
                  {m.name}
                </button>
              );
            })}
            {members.filter(m => (m.subscription_status || '').toLowerCase() === 'active').length === 0 && (
              <div style={{fontSize:'12px', color:'#6a8ab0'}}>No active members yet.</div>
            )}
          </div>

          {/* Category filter */}
          <div style={LABEL}>Filter by theme</div>
          <div style={{display:'flex', gap:'6px', overflowX:'auto', marginTop:'8px', marginBottom:'12px', paddingBottom:'2px'}}>
            <button onClick={() => setCategoryFilter('')}
              style={{flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: !categoryFilter ? 800 : 600, border: !categoryFilter ? '1px solid #6b4e7c' : '1px solid rgba(122,176,240,0.25)', background: !categoryFilter ? 'rgba(107,78,124,0.12)' : 'rgba(255,255,255,0.8)', color:'#1a2a4a', cursor:'pointer', fontFamily:'inherit'}}>
              All
            </button>
            {categories.map(c => {
              const active = categoryFilter === c.id;
              return (
                <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                  style={{flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: active ? 800 : 600, border: active ? `1px solid ${c.color}` : '1px solid rgba(122,176,240,0.25)', background: active ? `${c.color}18` : 'rgba(255,255,255,0.8)', color: active ? c.color : '#1a2a4a', cursor:'pointer', fontFamily:'inherit'}}>
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Card grid */}
          <div style={LABEL}>Pick a card ({filtered.length})</div>
          {loadingCards ? (
            <div style={{padding:'30px', textAlign:'center', color:'#6a8ab0', fontSize:'13px'}}>Loading library…</div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'8px', marginTop:'8px'}}>
              {filtered.map(c => {
                const active = selectedCard === c.id;
                const color = c.category_color || '#6a8ab0';
                return (
                  <button key={c.id} onClick={() => setSelectedCard(c.id)}
                    style={{
                      textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                      border: active ? `2px solid ${color}` : '1px solid rgba(122,176,240,0.18)',
                      background: active ? `${color}10` : 'rgba(255,255,255,0.7)',
                      borderRadius:'14px', padding:'12px 14px',
                    }}>
                    <div style={{fontSize:'10px', fontWeight:800, color, letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'4px'}}>{c.category_label}</div>
                    <div style={{fontSize:'13px', fontWeight:800, color:'#1a2a4a', marginBottom:'4px'}}>{c.title}</div>
                    <div style={{fontSize:'11px', color:'#6a8ab0', lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:3, overflow:'hidden'}}>{c.body}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{padding:'14px 20px', borderTop:'1px solid rgba(122,176,240,0.18)', background:'rgba(240,246,255,0.5)'}}>
          {err && <div style={{fontSize:'12px', color:'#a02020', marginBottom:'8px'}}>{err}</div>}
          {chosenPatient && chosenCard && (
            <div style={{fontSize:'11px', color:'#6a8ab0', marginBottom:'10px'}}>
              Will send <b style={{color:'#1a2a4a'}}>{chosenCard.title}</b> to <b style={{color:'#1a2a4a'}}>{chosenPatient.name}</b> as a message in the Oracle category.
            </div>
          )}
          <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.9)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color:'#4a7ad0', cursor:'pointer'}}>Cancel</button>
            <button onClick={send} disabled={!selectedPatient || !selectedCard || sending || sent}
              style={{background: accent, border:'none', borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:800, color:'white', cursor: (!selectedPatient || !selectedCard || sending) ? 'default' : 'pointer', opacity: (!selectedPatient || !selectedCard || sending) ? 0.5 : 1}}>
              {sent ? '✓ Sent' : sending ? 'Sending…' : 'Send oracle card ✨'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicianHome;
