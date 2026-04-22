// © 2026 SoulMD, LLC. All rights reserved.
// Physician dashboard (redesigned) — sidebar + top bar + card-grid home.
// Access: anderson@soulmd.us only (upstream role check in Concierge.tsx).
import React, { useEffect, useState } from 'react';
import SoulMDLogo from '../../SoulMDLogo';
import PatientsSection from './PatientsSection';
import MessagesSection from './MessagesSection';
import AppointmentsSection from './AppointmentsSection';
import MeditationsSection from './MeditationsSection';
import CoachingSection from './CoachingSection';
import LabReviewSection from './LabReviewSection';
import PhysicianHome from './PhysicianHome';

interface Props { API: string; token: string; onBack: () => void; }

type Section =
  | 'home' | 'members' | 'conversations' | 'appointments'
  | 'insights' | 'protocols' | 'coaching' | 'resources' | 'practice';

const PURPLE = '#534AB7';
const PURPLE_SOFT = '#EEEBFA';
const BORDER = 'rgba(83,74,183,0.12)';
const INK = '#1F1B3A';
const INK_SOFT = '#6B6889';
const PAGE_BG = '#FAF9FD';
const SIDEBAR_BG = '#FFFFFF';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'home',          label: 'Home',          icon: '✦' },
  { id: 'members',       label: 'Members',       icon: '◉' },
  { id: 'conversations', label: 'Conversations', icon: '◌' },
  { id: 'appointments',  label: 'Appointments',  icon: '◱' },
  { id: 'insights',      label: 'Insights',      icon: '✧' },
  { id: 'protocols',     label: 'Protocols',     icon: '◈' },
  { id: 'coaching',      label: 'Coaching',      icon: '◎' },
  { id: 'resources',     label: 'Resources',     icon: '◐' },
  { id: 'practice',      label: 'Practice',      icon: '◇' },
];

const greetingFor = (d: Date): string => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const INTENTIONS = [
  'Lead with presence. Care with clarity.',
  'Listen first. Heal second.',
  'Meet each member where they are.',
  'Small touches. Steady healing.',
  'Curiosity over certainty.',
];
const todaysIntention = (): string => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return INTENTIONS[dayOfYear % INTENTIONS.length];
};

const PhysicianDashboard: React.FC<Props> = ({ API, token, onBack }) => {
  const [section, setSection] = useState<Section>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [systemOk, setSystemOk] = useState<boolean | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/health`).then(r => r.ok)
      .then(ok => { if (alive) setSystemOk(ok); })
      .catch(() => { if (alive) setSystemOk(false); });
    return () => { alive = false; };
  }, [API]);

  const activeLabel = NAV.find(n => n.id === section)?.label || 'Home';

  return (
    <div style={{minHeight:'100vh', display:'flex', background: PAGE_BG, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif', color: INK}}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{position:'fixed', inset:0, background:'rgba(20,18,40,0.4)', zIndex:40, display:'none'}} className="soulmd-sidebar-backdrop"/>
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          width:'260px', background: SIDEBAR_BG, borderRight:`0.5px solid ${BORDER}`,
          display:'flex', flexDirection:'column', position:'sticky', top:0, alignSelf:'flex-start',
          height:'100vh', zIndex:50,
        }}>
        <div style={{padding:'22px 22px 12px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <SoulMDLogo size={34}/>
            <div>
              <div style={{fontSize:'15px', fontWeight:800, letterSpacing:'-0.2px', color: INK}}>SoulMD</div>
              <div style={{fontSize:'10px', color: INK_SOFT, letterSpacing:'1.6px', textTransform:'uppercase', marginTop:'1px'}}>Concierge Medicine</div>
            </div>
          </div>
        </div>

        <nav style={{padding:'6px 10px', flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px'}}>
          {NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }}
                style={{
                  display:'flex', alignItems:'center', gap:'12px',
                  padding:'11px 14px', borderRadius:'10px', textAlign:'left',
                  background: active ? PURPLE_SOFT : 'transparent',
                  color: active ? PURPLE : INK,
                  fontWeight: active ? 700 : 500,
                  fontSize:'13.5px', border:'none', cursor:'pointer', fontFamily:'inherit',
                  transition:'background 120ms ease',
                }}>
                <span style={{width:'18px', fontSize:'14px', textAlign:'center', opacity: active ? 1 : 0.55, color: active ? PURPLE : INK_SOFT}}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Today's Intention */}
        <div style={{padding:'14px', margin:'10px', borderRadius:'14px', background:'linear-gradient(135deg,#F7F4FE 0%,#EEF0FB 100%)', border:`0.5px solid ${BORDER}`}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
            <span style={{fontSize:'16px'}}>🪷</span>
            <span style={{fontSize:'10px', fontWeight:800, color: PURPLE, letterSpacing:'1.4px', textTransform:'uppercase'}}>Today's Intention</span>
          </div>
          <div style={{fontSize:'13px', color: INK, lineHeight:1.5, fontWeight:500}}>
            {todaysIntention()}
          </div>
          <button onClick={() => alert('Custom intention coming soon.')}
            style={{marginTop:'10px', background:'transparent', border:'none', padding:0, fontSize:'11px', color: PURPLE, fontWeight:700, cursor:'pointer'}}>
            Set intention →
          </button>
        </div>

        <div style={{padding:'12px 18px 16px', borderTop:`0.5px solid ${BORDER}`, display:'flex', alignItems:'center', gap:'8px', fontSize:'11px', color: INK_SOFT}}>
          <span style={{width:'8px', height:'8px', borderRadius:'50%', background: systemOk === null ? '#d0cfe0' : systemOk ? '#58C48E' : '#E06A6A', boxShadow: systemOk ? '0 0 0 3px rgba(88,196,142,0.15)' : undefined}}/>
          <span>{systemOk === null ? 'Checking system…' : systemOk ? 'All systems healthy' : 'System degraded'}</span>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
        <TopBar
          greeting={greetingFor(now)}
          date={now}
          sectionLabel={activeLabel}
          onBack={onBack}
        />

        {/* Beta disclaimer */}
        <div style={{padding:'10px clamp(18px,3vw,28px) 0'}}>
          <div style={{maxWidth:'1280px', margin:'0 auto', background:'rgba(232,168,64,0.1)', border:'1px solid rgba(232,168,64,0.35)', borderRadius:'10px', padding:'8px 12px', display:'flex', alignItems:'flex-start', gap:'8px'}}>
            <span style={{fontSize:'13px', lineHeight:1.3, flexShrink:0}}>⚠️</span>
            <div style={{fontSize:'11px', color:'#8a5a10', lineHeight:1.55}}>
              <strong style={{color:'#6e4208'}}>Direct-pay · Not insurance · Not HIPAA compliant yet (beta).</strong> Do not enter identifying patient information during beta. For emergencies call 911.
            </div>
          </div>
        </div>

        <main style={{flex:1, padding:'clamp(18px,3vw,28px)', maxWidth:'1280px', width:'100%', margin:'0 auto', boxSizing:'border-box'}}>
          {section === 'home'          && <PhysicianHome API={API} token={token} accent={PURPLE}/>}
          {section === 'members'       && <PatientsSection API={API} token={token} accent={PURPLE}/>}
          {section === 'conversations' && <MessagesSection API={API} token={token} accent={PURPLE}/>}
          {section === 'appointments'  && <AppointmentsSection API={API} token={token} accent={PURPLE}/>}
          {section === 'protocols'     && <LabReviewSection API={API} token={token} accent={PURPLE}/>}
          {section === 'coaching'      && <CoachingSection API={API} token={token} accent={PURPLE}/>}
          {section === 'resources'     && <MeditationsSection API={API} token={token} accent={PURPLE}/>}
          {section === 'practice'      && <PracticePlaceholder/>}
          {section === 'insights'      && <InsightsPlaceholder/>}
        </main>
      </div>
    </div>
  );
};

const TopBar: React.FC<{greeting:string; date:Date; sectionLabel:string; onBack:()=>void}> = ({ greeting, date, sectionLabel, onBack }) => {
  const [q, setQ] = useState('');
  const dateStr = date.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  return (
    <header style={{padding:'16px clamp(18px,3vw,28px)', display:'flex', alignItems:'center', gap:'14px', borderBottom:`0.5px solid ${BORDER}`, background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)'}}>
      <button onClick={onBack} title="Back to SoulMD"
        style={{background:'transparent', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'8px 10px', fontSize:'13px', color: INK_SOFT, cursor:'pointer', flexShrink:0}}>←</button>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:'17px', fontWeight:800, color: INK, letterSpacing:'-0.2px'}}>{greeting}, Dr. Anderson</div>
        <div style={{fontSize:'12px', color: INK_SOFT, marginTop:'2px'}}>{dateStr} · {sectionLabel}</div>
      </div>
      <div style={{position:'relative', maxWidth:'320px', flex:1, minWidth:'140px'}}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search members, notes, labs…"
          style={{width:'100%', boxSizing:'border-box', padding:'9px 14px 9px 36px', borderRadius:'10px', border:`0.5px solid ${BORDER}`, background:'#FAF9FD', fontSize:'13px', color: INK, outline:'none', fontFamily:'inherit'}}/>
        <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color: INK_SOFT, fontSize:'14px'}}>⌕</span>
      </div>
      <button title="Notifications"
        style={{position:'relative', background:'transparent', border:`0.5px solid ${BORDER}`, width:'38px', height:'38px', borderRadius:'10px', cursor:'pointer', color: INK_SOFT, fontSize:'14px', flexShrink:0}}>
        🔔
        <span style={{position:'absolute', top:'4px', right:'4px', minWidth:'16px', height:'16px', borderRadius:'8px', background:'#E06A6A', color:'white', fontSize:'9px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px'}}>3</span>
      </button>
      <div title="Dr. Anderson"
        style={{width:'38px', height:'38px', borderRadius:'50%', background:'linear-gradient(135deg,#7B6FD9,#534AB7)', color:'white', fontSize:'13px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', letterSpacing:'-0.5px', flexShrink:0}}>
        DA
      </div>
    </header>
  );
};

const InsightsPlaceholder: React.FC = () => (
  <div style={{padding:'56px 20px', textAlign:'center', background:'#FFFFFF', borderRadius:'16px', border:`0.5px solid ${BORDER}`}}>
    <div style={{fontSize:'40px', marginBottom:'10px', opacity:0.6}}>✧</div>
    <div style={{fontSize:'18px', fontWeight:800, color: INK, marginBottom:'6px'}}>Insights</div>
    <div style={{fontSize:'13px', color: INK_SOFT, maxWidth:'460px', margin:'0 auto', lineHeight:1.6}}>Population-level AI insights across your members — metabolic trends, habit adherence, retention signals. Coming in Phase 2.</div>
  </div>
);

const PracticePlaceholder: React.FC = () => (
  <div style={{padding:'56px 20px', textAlign:'center', background:'#FFFFFF', borderRadius:'16px', border:`0.5px solid ${BORDER}`}}>
    <div style={{fontSize:'40px', marginBottom:'10px', opacity:0.6}}>◇</div>
    <div style={{fontSize:'18px', fontWeight:800, color: INK, marginBottom:'6px'}}>Practice</div>
    <div style={{fontSize:'13px', color: INK_SOFT, maxWidth:'460px', margin:'0 auto', lineHeight:1.6}}>Practice-wide reporting: billing, habits tracking, retention cohorts. Launches alongside Insights in Phase 2.</div>
  </div>
);

export default PhysicianDashboard;
