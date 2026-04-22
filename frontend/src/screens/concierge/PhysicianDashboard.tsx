// © 2026 SoulMD, LLC. All rights reserved.
// Physician dashboard — what anderson@soulmd.us sees inside /concierge.
// Body lifted from the original single-role Concierge component; role
// resolution lives upstream in Concierge.tsx.
import React, { useState } from 'react';
import SoulMDLogo from '../../SoulMDLogo';
import PatientsSection from './PatientsSection';
import MessagesSection from './MessagesSection';
import AppointmentsSection from './AppointmentsSection';
import BillingSection from './BillingSection';
import HabitsSection from './HabitsSection';
import MeditationsSection from './MeditationsSection';
import CoachingSection from './CoachingSection';
import PhysicianHome from './PhysicianHome';

interface Props { API: string; token: string; onBack: () => void; }

type Section = 'home' | 'patients' | 'messages' | 'appointments' | 'billing' | 'coaching' | 'meditations' | 'habits';

const SECTIONS: {id: Section; label: string; icon: string}[] = [
  { id: 'home',         label: 'Home',         icon: '✨' },
  { id: 'patients',     label: 'Patients',     icon: '👥' },
  { id: 'messages',     label: 'Messages',     icon: '💬' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'billing',      label: 'Billing',      icon: '💳' },
  { id: 'coaching',     label: 'Coaching',     icon: '🧭' },
  { id: 'meditations',  label: 'Meditations',  icon: '🧘' },
  { id: 'habits',       label: 'Habits',       icon: '🌱' },
];

const BG = 'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)';
const ACCENT = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';

const PhysicianDashboard: React.FC<Props> = ({ API, token, onBack }) => {
  const [section, setSection] = useState<Section>('home');

  return (
    <div style={{minHeight:'100vh', background:BG, display:'flex', flexDirection:'column', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      <header style={{padding:'14px clamp(16px,4vw,32px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', background:'rgba(255,255,255,0.65)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(122,176,240,0.3)', flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <button onClick={onBack} title="Back to SoulMD" style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'7px 10px', fontSize:'12px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>←</button>
          <SoulMDLogo size={30}/>
          <div>
            <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a', lineHeight:1.1}}>Concierge · Physician</div>
            <div style={{fontSize:'9px', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase'}}>Anderson Practice · Dashboard</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'11px', color:'#4a7ad0', fontWeight:600}}>
          <span style={{background:'rgba(122,176,240,0.15)', borderRadius:'999px', padding:'4px 10px', letterSpacing:'0.5px', textTransform:'uppercase', fontSize:'10px'}}>Confidential</span>
        </div>
      </header>

      <nav style={{padding:'12px clamp(12px,3vw,24px)', overflowX:'auto', borderBottom:'1px solid rgba(122,176,240,0.2)', background:'rgba(255,255,255,0.45)'}}>
        <div style={{display:'flex', gap:'6px', minWidth:'fit-content'}}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                display:'flex', alignItems:'center', gap:'6px',
                padding:'8px 14px', borderRadius:'999px', fontSize:'12px',
                fontWeight: section === s.id ? 700 : 600,
                border: section === s.id ? 'none' : '1px solid rgba(122,176,240,0.3)',
                background: section === s.id ? ACCENT : 'rgba(255,255,255,0.7)',
                color: section === s.id ? 'white' : '#4a7ad0',
                cursor: 'pointer', whiteSpace:'nowrap', flexShrink:0,
              }}>
              <span style={{fontSize:'14px'}}>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </nav>

      <div style={{padding:'10px clamp(12px,3vw,24px) 0'}}>
        <div style={{maxWidth:'1200px', margin:'0 auto', background:'rgba(232,168,64,0.12)', border:'1px solid rgba(232,168,64,0.45)', borderRadius:'12px', padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:'10px'}}>
          <span style={{fontSize:'16px', lineHeight:1.3, flexShrink:0}}>⚠️</span>
          <div style={{fontSize:'11px', color:'#8a5a10', lineHeight:1.55}}>
            <strong style={{color:'#6e4208'}}>Direct-pay · Not insurance · Not HIPAA compliant yet (beta).</strong> Do not enter identifying patient information during beta. For emergencies call 911.
          </div>
        </div>
      </div>

      <main style={{flex:1, padding:'clamp(16px,3vw,28px)', maxWidth:'1200px', width:'100%', margin:'0 auto', boxSizing:'border-box'}}>
        {section === 'home' && <PhysicianHome API={API} token={token} accent={ACCENT}/>}
        {section === 'patients' && <PatientsSection API={API} token={token} accent={ACCENT}/>}
        {section === 'messages' && <MessagesSection API={API} token={token} accent={ACCENT}/>}
        {section === 'appointments' && <AppointmentsSection API={API} token={token} accent={ACCENT}/>}
        {section === 'billing' && <BillingSection API={API} token={token} accent={ACCENT}/>}
        {section === 'habits' && <HabitsSection API={API} token={token} accent={ACCENT}/>}
        {section === 'meditations' && <MeditationsSection API={API} token={token} accent={ACCENT}/>}
        {section === 'coaching' && <CoachingSection API={API} token={token} accent={ACCENT}/>}
        {!['home','patients','messages','appointments','billing','habits','meditations','coaching'].includes(section) && (
          <div style={{padding:'60px 20px', textAlign:'center', color:'#4a7ad0'}}>
            <div style={{fontSize:'48px', marginBottom:'16px', opacity:0.5}}>{SECTIONS.find(s => s.id === section)?.icon}</div>
            <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a', marginBottom:'6px'}}>{SECTIONS.find(s => s.id === section)?.label}</div>
            <div style={{fontSize:'13px', color:'#4a7ad0', maxWidth:'440px', margin:'0 auto', lineHeight:1.6}}>This section is scaffolded for a later phase.</div>
          </div>
        )}
      </main>

      <footer style={{padding:'16px', textAlign:'center', fontSize:'10px', color:'#4a7ad0', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(255,255,255,0.3)'}}>
        This is confidential patient care data. Close this tab when stepping away. Protected by practice-owner authentication.
      </footer>
    </div>
  );
};

export default PhysicianDashboard;
