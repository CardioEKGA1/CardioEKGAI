// © 2026 SoulMD, LLC. All rights reserved.
//
// Superuser-only Concierge quick-access portal on the main SoulMD suite
// dashboard. Shortcut links into the concierge PWA (patient + physician
// views), today's pulled oracle card thumbnail, today's sessions, and
// recent message preview.
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import SuperuserTabNav from './SuperuserTabNav';

interface Props {
  API: string;
  token: string;
  onBack: () => void;
  onNavigateDashboard: () => void;
  onNavigateMeditations: () => void;
  onOpenConcierge: () => void;
}

interface TodaySession {
  id: number; patient_id: number; patient_name: string;
  service_type: string; starts_at: string; duration_min: number; status: string;
}
interface MessageRow {
  id: number; patient_name: string; body: string; created_at: string; read_at?: string | null;
}
interface OracleTodayPayload {
  date: string; pulled: boolean;
  card: { id: number; title: string; body: string; category_label?: string } | null;
}

const PAGE_BG = 'linear-gradient(135deg,#F5F1FF 0%,#E8E4FB 35%,#DFEAFC 70%,#F1E7F8 100%)';
const PURPLE  = '#534AB7';
const INK     = '#1F1B3A';
const INK_SOFT= '#6B6889';
const BORDER  = 'rgba(83,74,183,0.12)';

const ConciergeAccess: React.FC<Props> = ({ API, token, onBack, onNavigateDashboard, onNavigateMeditations, onOpenConcierge }) => {
  const [sessions, setSessions] = useState<TodaySession[] | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [oracle, setOracle] = useState<OracleTodayPayload | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    // Physician endpoints: owner-only, so a superuser hitting these may 404
    // unless their email is the CONCIERGE_OWNER. Oracle/today works for any
    // authed user with a concierge patient row.
    Promise.all([
      fetch(`${API}/concierge/physician/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/concierge/physician/messages?limit=3`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { messages: [] }).catch(() => ({ messages: [] })),
      fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([dash, msgs, today]) => {
      if (dash) setSessions(dash.today_sessions || []);
      if (msgs) setMessages(msgs.messages || []);
      if (today) setOracle(today);
    }).catch(e => setErr(`Could not load data: ${e.message || e}`));
  }, [API, token]);

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: INK, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif'}}>
      <header style={{padding:'16px clamp(14px,3vw,28px)', display:'flex', alignItems:'center', gap:'12px', borderBottom:`0.5px solid ${BORDER}`, background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)'}}>
        <button onClick={onBack} title="Back"
          style={{background:'transparent', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'7px 10px', fontSize:'13px', color: INK_SOFT, cursor:'pointer'}}>←</button>
        <SoulMDLogo size={28} showText={false}/>
        <div style={{flex:1}}>
          <div style={{fontSize:'16px', fontWeight:800, color: INK}}>Concierge Portal</div>
          <div style={{fontSize:'11px', color: INK_SOFT}}>Quick access to the SoulMD Concierge practice</div>
        </div>
      </header>

      <SuperuserTabNav active="concierge" onDashboard={onNavigateDashboard} onMeditations={onNavigateMeditations} onConcierge={() => {}} onMarketing={() => { window.location.href = '/admin/marketing'; }}/>

      <main style={{padding:'clamp(16px,3vw,28px)', maxWidth:'1000px', margin:'0 auto'}}>
        {err && <div style={{padding:'14px 16px', background:'rgba(224,106,106,0.1)', color:'#a02020', borderRadius:'10px', fontSize:'13px', marginBottom:'14px'}}>{err}</div>}

        {/* PORTAL SHORTCUTS */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'14px', marginBottom:'20px'}}>
          <button onClick={onOpenConcierge}
            style={{textAlign:'left', background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)', color:'white', border:'none', borderRadius:'18px', padding:'20px 22px', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 10px 30px rgba(83,74,183,0.3)'}}>
            <div style={{fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', opacity:0.85, fontWeight:700}}>Physician Dashboard</div>
            <div style={{fontSize:'18px', fontWeight:800, marginTop:'6px'}}>Open /concierge →</div>
            <div style={{fontSize:'12px', opacity:0.85, marginTop:'4px'}}>Members · Conversations · Appointments · Insights</div>
          </button>
          <a href="/concierge?view=patient"
            style={{textDecoration:'none', background:'#FFFFFF', color: INK, border:`0.5px solid ${BORDER}`, borderRadius:'18px', padding:'20px 22px', display:'block', boxShadow:'0 4px 14px rgba(20,18,40,0.05)'}}>
            <div style={{fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color: PURPLE, fontWeight:800}}>Patient PWA</div>
            <div style={{fontSize:'18px', fontWeight:800, marginTop:'6px'}}>View as test patient →</div>
            <div style={{fontSize:'12px', color: INK_SOFT, marginTop:'4px'}}>Oracle card · Habits · Meditations · Book sessions</div>
          </a>
        </div>

        {/* TODAY'S ORACLE SNAPSHOT */}
        <Card>
          <Label>Today's Oracle Message</Label>
          {oracle?.pulled && oracle.card ? (
            <div style={{marginTop:'10px'}}>
              <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: PURPLE, fontWeight:700}}>
                {oracle.card.category_label || '—'}
              </div>
              <div style={{fontFamily:'"Playfair Display",Georgia,serif', fontStyle:'italic', fontSize:'18px', color: PURPLE, fontWeight:500, marginTop:'6px'}}>
                {oracle.card.title}
              </div>
              <div style={{fontSize:'14px', color: INK, lineHeight:1.6, marginTop:'8px'}}>
                {oracle.card.body}
              </div>
            </div>
          ) : (
            <div style={{marginTop:'8px', fontSize:'13px', color: INK_SOFT, fontStyle:'italic'}}>
              No card pulled today yet. <a href="/concierge?view=patient" style={{color: PURPLE, fontWeight:700}}>Pull today's card →</a>
            </div>
          )}
        </Card>

        {/* TODAY'S SESSIONS */}
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <Label>Today's Sessions</Label>
            <button onClick={onOpenConcierge} style={linkBtn}>View all →</button>
          </div>
          {sessions === null ? (
            <div style={{padding:'14px 0', fontSize:'12px', color: INK_SOFT}}>Loading…</div>
          ) : sessions.length === 0 ? (
            <div style={{padding:'14px 0', fontSize:'13px', color: INK_SOFT, fontStyle:'italic'}}>No sessions scheduled today.</div>
          ) : (
            <div style={{marginTop:'8px', display:'flex', flexDirection:'column', gap:'8px'}}>
              {sessions.slice(0, 4).map(s => (
                <div key={s.id} style={{display:'flex', alignItems:'center', gap:'12px', padding:'8px 0', borderTop:`0.5px solid ${BORDER}`}}>
                  <div style={{minWidth:'62px', fontSize:'12px', fontWeight:700, color: INK}}>
                    {new Date(s.starts_at).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' })}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:700, color: INK}}>{s.patient_name}</div>
                    <div style={{fontSize:'11px', color: INK_SOFT}}>{humanize(s.service_type)} · {s.duration_min} min</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* RECENT MESSAGES */}
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <Label>Recent Messages</Label>
            <button onClick={onOpenConcierge} style={linkBtn}>View all →</button>
          </div>
          {messages === null ? (
            <div style={{padding:'14px 0', fontSize:'12px', color: INK_SOFT}}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{padding:'14px 0', fontSize:'13px', color: INK_SOFT, fontStyle:'italic'}}>No recent messages.</div>
          ) : (
            <div style={{marginTop:'8px', display:'flex', flexDirection:'column', gap:'8px'}}>
              {messages.slice(0, 3).map(m => (
                <div key={m.id} style={{padding:'8px 0', borderTop:`0.5px solid ${BORDER}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:'10px'}}>
                    <div style={{fontSize:'13px', fontWeight:700, color: INK}}>{m.patient_name}</div>
                    {!m.read_at && <span style={{width:'8px', height:'8px', borderRadius:'50%', background: PURPLE, flexShrink:0}}/>}
                  </div>
                  <div style={{fontSize:'12px', color: INK_SOFT, marginTop:'3px', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2}}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

const Card: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={{background:'#FFFFFF', border:`0.5px solid ${BORDER}`, borderRadius:'16px', padding:'16px 18px', marginBottom:'14px', boxShadow:'0 2px 10px rgba(20,18,40,0.04)'}}>
    {children}
  </div>
);

const Label: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: PURPLE, fontWeight:800}}>
    {children}
  </div>
);

const linkBtn: React.CSSProperties = {
  background:'transparent', border:'none', color: PURPLE, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0,
};

const humanize = (s: string): string => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default ConciergeAccess;
