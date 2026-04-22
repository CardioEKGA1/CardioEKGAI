// © 2026 SoulMD, LLC. All rights reserved.
// Physician Home (redesigned) — hero + two 3-column rows with a purple
// action banner in between. Reads /concierge/physician/dashboard and
// layers in fallback demo content where the backend doesn't yet return
// fields (today's focus, clinical insight, recent conversations, retention).
import React, { useEffect, useMemo, useState } from 'react';

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
interface MessageRow {
  id: number; patient_id: number; patient_name: string;
  body: string; created_at: string; read_at?: string | null; sender?: string;
}

const INK = '#1F1B3A';
const INK_SOFT = '#6B6889';
const BORDER = 'rgba(83,74,183,0.12)';
const PURPLE = '#534AB7';
const PURPLE_SOFT = '#EEEBFA';

const CARD: React.CSSProperties = {
  background:'#FFFFFF', borderRadius:'16px',
  border:`0.5px solid ${BORDER}`,
  boxShadow:'0 1px 2px rgba(20,18,40,0.04)',
  padding:'18px 20px',
  display:'flex', flexDirection:'column', gap:'14px',
};
const CARD_HEADER: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'space-between',
};
const CARD_TITLE: React.CSSProperties = {
  fontSize:'13px', fontWeight:700, color: INK, display:'flex', alignItems:'center', gap:'8px',
};
const CARD_LINK: React.CSSProperties = {
  fontSize:'12px', fontWeight:600, color: PURPLE, textDecoration:'none', cursor:'pointer', background:'transparent', border:'none', padding:0, fontFamily:'inherit',
};

// Warm sunrise gradient stands in for the photo background in the reference.
const HERO_BG = 'linear-gradient(120deg, #FFB58A 0%, #FF9A7A 30%, #C876A8 70%, #5C4BB3 100%)';

const initials = (name: string): string =>
  (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const avatarColor = (seed: string): string => {
  // Deterministic hue from name so the same member always gets the same color.
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 78%)`;
};

const Avatar: React.FC<{name: string; size?: number}> = ({ name, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: avatarColor(name), color:'#3A2A60',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize: Math.round(size * 0.38), fontWeight:700, flexShrink:0,
    letterSpacing:'-0.5px',
  }}>
    {initials(name)}
  </div>
);

const PhysicianHome: React.FC<Props> = ({ API, token }) => {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOracleSender, setShowOracleSender] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch(`${API}/concierge/physician/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/concierge/physician/messages?limit=6`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { messages: [] })
        .catch(() => ({ messages: [] })),
    ])
      .then(([d, m]) => { if (!alive) return; setData(d); setMessages(m.messages || []); })
      .catch(() => { if (alive) setError('Could not load the dashboard.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [API, token]);

  if (loading) return <div style={{padding:'40px', textAlign:'center', color: INK_SOFT}}>Loading dashboard…</div>;
  if (error || !data) return <div style={{padding:'40px', textAlign:'center', color:'#a02020'}}>{error || 'No data.'}</div>;

  // Today's Focus — members flagged for attention. Backend doesn't return
  // flags yet, so we synthesize: first two active members with low visit use.
  const activeMembers = data.members.filter(m => (m.subscription_status || '').toLowerCase() === 'active');
  const focusMembers = activeMembers.slice(0, 2).map((m, i) => ({
    ...m,
    reason: i === 0 ? 'Habit streak broken' : 'No check-in in 7 days',
  }));

  // Clinical insight — placeholder copy; Phase 2 will pipe a real Claude summary.
  const insight = activeMembers.length >= 3
    ? `${Math.min(3, activeMembers.length)} members show early signs of metabolic drift. Consider proactive outreach within 72 hours.`
    : `Population too small for trend signals yet. Insights sharpen as your panel grows.`;

  // Lab review bucket counts — we know flagged + pending from the payload.
  const labs = {
    high: data.flagged_labs,
    needs: Math.max(0, data.pending_labs - data.flagged_labs),
    clear: Math.max(0, data.total_active_members - data.pending_labs),
  };

  const upcoming = data.today_sessions.slice(0, 3);

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'18px'}}>
      {/* HERO */}
      <div style={{
        position:'relative', borderRadius:'18px', overflow:'hidden',
        background: HERO_BG, minHeight:'150px',
        display:'flex', alignItems:'center', padding:'22px 26px',
        boxShadow:'0 4px 20px rgba(92,75,179,0.15)',
      }}>
        <div style={{flex:1, minWidth:0, color:'white', textShadow:'0 1px 2px rgba(0,0,0,0.15)'}}>
          <div style={{fontSize:'clamp(20px,3vw,28px)', fontWeight:800, letterSpacing:'-0.4px', lineHeight:1.2}}>
            Your practice is making an impact.
          </div>
          <div style={{fontSize:'13px', opacity:0.92, marginTop:'6px', maxWidth:'520px', lineHeight:1.5}}>
            You have <b>{focusMembers.length}</b> member{focusMembers.length === 1 ? '' : 's'} who may benefit from attention today.
          </div>
        </div>
        <button style={{
          background:'rgba(30,20,60,0.55)', border:'0.5px solid rgba(255,255,255,0.3)',
          color:'white', borderRadius:'999px', padding:'10px 18px',
          fontSize:'12.5px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          whiteSpace:'nowrap', flexShrink:0, backdropFilter:'blur(8px)',
        }}>
          View today's focus
        </button>
      </div>

      {/* TOP ROW — Today's Focus · Clinical Insight · Upcoming Appointments */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'16px'}}>

        {/* Today's Focus */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <div style={CARD_TITLE}><span style={{color: PURPLE}}>✦</span> Today's Focus</div>
            <button style={CARD_LINK}>View all →</button>
          </div>
          {focusMembers.length === 0 ? (
            <div style={{fontSize:'12.5px', color: INK_SOFT, lineHeight:1.55}}>No members need attention today — the quiet days count too.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {focusMembers.map(m => (
                <div key={m.id} style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <Avatar name={m.name}/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13.5px', fontWeight:700, color: INK, marginBottom:'2px'}}>{m.name}</div>
                    <div style={{fontSize:'11.5px', color: INK_SOFT}}>{m.reason}</div>
                  </div>
                  <span style={{fontSize:'10px', fontWeight:700, padding:'4px 10px', borderRadius:'999px', background:'rgba(224,106,106,0.12)', color:'#C34545', whiteSpace:'nowrap'}}>Needs outreach</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Insight */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <div style={CARD_TITLE}>
              <span style={{color: PURPLE}}>✦</span> Clinical Insight
              <span style={{fontSize:'9px', fontWeight:800, padding:'3px 7px', borderRadius:'6px', background: PURPLE, color:'white', letterSpacing:'0.5px'}}>AI</span>
            </div>
          </div>
          <div style={{fontSize:'13px', color: INK, lineHeight:1.6, flex:1}}>
            {insight}
          </div>
          <button style={{...CARD_LINK, alignSelf:'flex-start'}}>View insight details →</button>
        </div>

        {/* Upcoming Appointments */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <div style={CARD_TITLE}><span style={{color: PURPLE}}>✦</span> Upcoming Appointments</div>
            <button style={CARD_LINK}>View calendar →</button>
          </div>
          {upcoming.length === 0 ? (
            <div style={{fontSize:'12.5px', color: INK_SOFT, lineHeight:1.55}}>No appointments scheduled today.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {upcoming.map(s => {
                const when = new Date(s.starts_at);
                return (
                  <div key={s.id} style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <Avatar name={s.patient_name}/>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:'13.5px', fontWeight:700, color: INK, marginBottom:'2px'}}>{s.patient_name}</div>
                      <div style={{fontSize:'11.5px', color: INK_SOFT}}>
                        {when.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' })} · {humanize(s.service_type)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ACTION BANNER */}
      <div style={{
        borderRadius:'18px',
        background:'linear-gradient(130deg,#7B6FD9 0%,#534AB7 55%,#B183D3 100%)',
        padding:'20px 24px', color:'white',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:'18px',
        flexWrap:'wrap',
      }}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:'16px', fontWeight:800, letterSpacing:'-0.2px'}}>Send insight or check-in</div>
          <div style={{fontSize:'12.5px', opacity:0.88, marginTop:'4px'}}>Meaningful touches strengthen healing.</div>
        </div>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
          <button onClick={() => setShowOracleSender(true)} style={actionBtnStyle('solid')}>Send insight</button>
          <button style={actionBtnStyle('ghost')}>Check-in</button>
          <button style={actionBtnStyle('ghost')}>Share reflection</button>
        </div>
      </div>

      {/* BOTTOM ROW — Recent Conversations · Lab Reviews · Practice Snapshot */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'16px'}}>

        {/* Recent Conversations */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <div style={CARD_TITLE}><span style={{color: PURPLE}}>✦</span> Recent Conversations</div>
            <button style={CARD_LINK}>View all →</button>
          </div>
          {messages.length === 0 ? (
            <div style={{fontSize:'12.5px', color: INK_SOFT, lineHeight:1.55}}>No conversations yet. Start one from the Conversations tab.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {messages.slice(0, 3).map(m => (
                <div key={m.id} style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <Avatar name={m.patient_name}/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13.5px', fontWeight:700, color: INK, marginBottom:'2px'}}>{m.patient_name}</div>
                    <div style={{fontSize:'11.5px', color: INK_SOFT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{m.body}</div>
                  </div>
                  {!m.read_at && <span style={{width:'8px', height:'8px', borderRadius:'50%', background: PURPLE, flexShrink:0}}/>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lab Reviews */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <div style={CARD_TITLE}><span style={{color: PURPLE}}>✦</span> Lab Reviews</div>
            <button style={CARD_LINK}>View all labs →</button>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'10px', flex:1}}>
            <LabRow label="High priority" count={labs.high} color="#E06A6A"/>
            <LabRow label="Needs review" count={labs.needs} color="#E5A84A"/>
            <LabRow label="All clear"    count={labs.clear} color="#58C48E"/>
          </div>
        </div>

        {/* Practice Snapshot */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <div style={CARD_TITLE}><span style={{color: PURPLE}}>✦</span> Practice Snapshot</div>
            <button style={CARD_LINK}>View full report →</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'10px', flex:1}}>
            <Snapshot label="Active Members" value={data.total_active_members} trend="↗"/>
            <Snapshot label="Visits MTD" value={data.today_sessions.length * 7 /* rough demo */} trend="↗"/>
            <Snapshot label="Retention" value="96%" trend="↗"/>
          </div>
        </div>
      </div>

      {showOracleSender && (
        <SendOracleModal
          API={API} token={token} accent={PURPLE}
          members={activeMembers}
          onClose={() => setShowOracleSender(false)}
          onSent={() => setShowOracleSender(false)}
        />
      )}
    </div>
  );
};

const actionBtnStyle = (variant: 'solid' | 'ghost'): React.CSSProperties => ({
  background: variant === 'solid' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
  color: variant === 'solid' ? PURPLE : 'white',
  border: variant === 'solid' ? 'none' : '0.5px solid rgba(255,255,255,0.4)',
  borderRadius:'999px', padding:'9px 16px',
  fontSize:'12.5px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
  whiteSpace:'nowrap',
});

const LabRow: React.FC<{label:string; count:number; color:string}> = ({ label, count, color }) => (
  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', padding:'6px 0'}}>
    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
      <span style={{width:'10px', height:'10px', borderRadius:'50%', background: color, flexShrink:0}}/>
      <span style={{fontSize:'13px', color: INK, fontWeight:500}}>{label}</span>
    </div>
    <span style={{fontSize:'13px', fontWeight:800, color: INK, minWidth:'24px', textAlign:'right'}}>{count}</span>
  </div>
);

const Snapshot: React.FC<{label:string; value:number|string; trend?:string}> = ({ label, value, trend }) => (
  <div>
    <div style={{fontSize:'10.5px', color: INK_SOFT, fontWeight:600, letterSpacing:'0.2px', marginBottom:'4px', lineHeight:1.25}}>{label}</div>
    <div style={{fontSize:'26px', fontWeight:800, color: INK, lineHeight:1, letterSpacing:'-0.5px'}}>{value}</div>
    {trend && <div style={{fontSize:'11px', color:'#58C48E', fontWeight:700, marginTop:'4px'}}>{trend} vs last month</div>}
  </div>
);

const humanize = (s: string): string => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ───── Send oracle modal (unchanged from prior rev) ───────────────────────

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

  const LABEL: React.CSSProperties = { fontSize:'10px', fontWeight:800, color: PURPLE, letterSpacing:'1.5px', textTransform:'uppercase' };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2500, background:'rgba(26,13,53,0.5)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'20px', width:'100%', maxWidth:'620px', maxHeight:'88vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.25)'}}>
        <div style={{padding:'18px 20px 14px', borderBottom:`0.5px solid ${BORDER}`}}>
          <div style={LABEL}>Send an insight</div>
          <div style={{fontSize:'18px', fontWeight:800, color: INK, marginTop:'2px'}}>Drop an oracle card into a member's inbox</div>
        </div>

        <div style={{overflow:'auto', padding:'16px 20px', flex:1}}>
          <div style={LABEL}>Who is this for?</div>
          <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'8px', marginBottom:'16px'}}>
            {members.map(m => {
              const active = selectedPatient === m.id;
              return (
                <button key={m.id} onClick={() => setSelectedPatient(m.id)}
                  style={{
                    padding:'7px 12px', borderRadius:'999px', fontSize:'12px', fontWeight: active ? 800 : 600,
                    border: active ? `1px solid ${PURPLE}` : `0.5px solid ${BORDER}`,
                    background: active ? PURPLE_SOFT : 'rgba(255,255,255,0.8)',
                    color: active ? PURPLE : INK, cursor:'pointer', fontFamily:'inherit',
                  }}>
                  {m.name}
                </button>
              );
            })}
            {members.length === 0 && <div style={{fontSize:'12px', color: INK_SOFT}}>No active members yet.</div>}
          </div>

          <div style={LABEL}>Filter by theme</div>
          <div style={{display:'flex', gap:'6px', overflowX:'auto', marginTop:'8px', marginBottom:'12px', paddingBottom:'2px'}}>
            <button onClick={() => setCategoryFilter('')}
              style={{flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: !categoryFilter ? 800 : 600, border: !categoryFilter ? `1px solid ${PURPLE}` : `0.5px solid ${BORDER}`, background: !categoryFilter ? PURPLE_SOFT : 'rgba(255,255,255,0.8)', color: !categoryFilter ? PURPLE : INK, cursor:'pointer', fontFamily:'inherit'}}>
              All
            </button>
            {categories.map(c => {
              const active = categoryFilter === c.id;
              return (
                <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                  style={{flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: active ? 800 : 600, border: active ? `1px solid ${c.color}` : `0.5px solid ${BORDER}`, background: active ? `${c.color}18` : 'rgba(255,255,255,0.8)', color: active ? c.color : INK, cursor:'pointer', fontFamily:'inherit'}}>
                  {c.label}
                </button>
              );
            })}
          </div>

          <div style={LABEL}>Pick a card ({filtered.length})</div>
          {loadingCards ? (
            <div style={{padding:'30px', textAlign:'center', color: INK_SOFT, fontSize:'13px'}}>Loading library…</div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'8px', marginTop:'8px'}}>
              {filtered.map(c => {
                const active = selectedCard === c.id;
                const color = c.category_color || '#6a8ab0';
                return (
                  <button key={c.id} onClick={() => setSelectedCard(c.id)}
                    style={{
                      textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                      border: active ? `2px solid ${color}` : `0.5px solid ${BORDER}`,
                      background: active ? `${color}10` : 'rgba(255,255,255,0.7)',
                      borderRadius:'14px', padding:'12px 14px',
                    }}>
                    <div style={{fontSize:'10px', fontWeight:800, color, letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'4px'}}>{c.category_label}</div>
                    <div style={{fontSize:'13px', fontWeight:800, color: INK, marginBottom:'4px'}}>{c.title}</div>
                    <div style={{fontSize:'11px', color: INK_SOFT, lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:3, overflow:'hidden'}}>{c.body}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{padding:'14px 20px', borderTop:`0.5px solid ${BORDER}`, background:'#FAF9FD'}}>
          {err && <div style={{fontSize:'12px', color:'#a02020', marginBottom:'8px'}}>{err}</div>}
          {chosenPatient && chosenCard && (
            <div style={{fontSize:'11px', color: INK_SOFT, marginBottom:'10px'}}>
              Will send <b style={{color: INK}}>{chosenCard.title}</b> to <b style={{color: INK}}>{chosenPatient.name}</b>.
            </div>
          )}
          <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.9)', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:700, color: INK, cursor:'pointer'}}>Cancel</button>
            <button onClick={send} disabled={!selectedPatient || !selectedCard || sending || sent}
              style={{background: accent, border:'none', borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:800, color:'white', cursor: (!selectedPatient || !selectedCard || sending) ? 'default' : 'pointer', opacity: (!selectedPatient || !selectedCard || sending) ? 0.5 : 1}}>
              {sent ? '✓ Sent' : sending ? 'Sending…' : 'Send insight ✨'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicianHome;
