// © 2026 SoulMD, LLC. All rights reserved.
// Concierge Medicine — private practice management, owner-only.
import React, { useEffect, useMemo, useState } from 'react';
import SoulMDLogo from '../../SoulMDLogo';
import PatientsSection from './PatientsSection';
import MessagesSection from './MessagesSection';
import AppointmentsSection from './AppointmentsSection';

interface Props { API: string; token: string; onBack: () => void; }

type Section = 'patients' | 'messages' | 'appointments' | 'billing' | 'coaching' | 'meditations' | 'habits';

const SECTIONS: {id: Section; label: string; icon: string}[] = [
  { id: 'patients',     label: 'Patients',     icon: '👥' },
  { id: 'messages',     label: 'Messages',     icon: '💬' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'billing',      label: 'Billing',      icon: '💳' },
  { id: 'coaching',     label: 'Coaching',     icon: '🧭' },
  { id: 'meditations',  label: 'Meditations',  icon: '🧘' },
  { id: 'habits',       label: 'Habits',       icon: '🌱' },
];

const BG = 'linear-gradient(135deg,#dce8fb 0%,#ede8fb 100%)';  // SoulMD standard palette — seamless extension of the main suite
const ACCENT = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';

const Concierge: React.FC<Props> = ({ API, token, onBack }) => {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>('patients');

  useEffect(() => {
    // Soft auth gate: hit /concierge/ping. 404 means not owner → kick out.
    fetch(`${API}/concierge/ping`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.ok) setAuthed(true);
        else setAuthed(false);
      })
      .catch(() => setAuthed(false));
  }, [API, token]);

  useEffect(() => {
    if (authed === false) {
      // Silently redirect non-owners. No toast, no message — section shouldn't exist to them.
      onBack();
    }
  }, [authed, onBack]);

  if (authed === null) {
    return (
      <div style={{minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', color:'#4a5e6a'}}>
        <div style={{fontSize:'14px'}}>Loading…</div>
      </div>
    );
  }
  if (authed === false) return null;

  return (
    <div style={{minHeight:'100vh', background:BG, display:'flex', flexDirection:'column', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      {/* Top header */}
      <header style={{padding:'14px clamp(16px,4vw,32px)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', background:'rgba(255,255,255,0.65)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(122,176,240,0.3)', flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <button onClick={onBack} title="Back to SoulMD" style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'7px 10px', fontSize:'12px', fontWeight:600, color:'#4a7ad0', cursor:'pointer'}}>←</button>
          <SoulMDLogo size={30}/>
          <div>
            <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a', lineHeight:1.1}}>Concierge Medicine</div>
            <div style={{fontSize:'9px', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase'}}>Anderson Practice · Private</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'11px', color:'#4a7ad0', fontWeight:600}}>
          <span style={{background:'rgba(122,176,240,0.15)', borderRadius:'999px', padding:'4px 10px', letterSpacing:'0.5px', textTransform:'uppercase', fontSize:'10px'}}>Confidential</span>
        </div>
      </header>

      {/* Section tabs — scrollable horizontal on mobile */}
      <nav style={{padding:'12px clamp(12px,3vw,24px)', overflowX:'auto', borderBottom:'1px solid rgba(122,176,240,0.2)', background:'rgba(255,255,255,0.45)'}}>
        <div style={{display:'flex', gap:'6px', minWidth:'fit-content'}}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display:'flex', alignItems:'center', gap:'6px',
                padding:'8px 14px', borderRadius:'999px', fontSize:'12px',
                fontWeight: section === s.id ? 700 : 600,
                border: section === s.id ? 'none' : '1px solid rgba(122,176,240,0.3)',
                background: section === s.id ? ACCENT : 'rgba(255,255,255,0.7)',
                color: section === s.id ? 'white' : '#4a7ad0',
                cursor: 'pointer', whiteSpace:'nowrap', flexShrink:0,
              }}
            >
              <span style={{fontSize:'14px'}}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Section content */}
      <main style={{flex:1, padding:'clamp(16px,3vw,28px)', maxWidth:'1200px', width:'100%', margin:'0 auto', boxSizing:'border-box'}}>
        {section === 'patients' && <PatientsSection API={API} token={token} accent={ACCENT}/>}
        {section === 'messages' && <MessagesSection API={API} token={token} accent={ACCENT}/>}
        {section === 'appointments' && <AppointmentsSection API={API} token={token} accent={ACCENT}/>}
        {!['patients','messages','appointments'].includes(section) && <PlaceholderSection section={section} />}
      </main>

      <footer style={{padding:'16px', textAlign:'center', fontSize:'10px', color:'#4a7ad0', borderTop:'1px solid rgba(122,176,240,0.2)', background:'rgba(255,255,255,0.3)'}}>
        This is confidential patient care data. Close this tab when stepping away. Protected by practice-owner authentication.
      </footer>
    </div>
  );
};

const PlaceholderSection: React.FC<{section: Section}> = ({section}) => (
  <div style={{padding:'60px 20px', textAlign:'center', color:'#4a7ad0'}}>
    <div style={{fontSize:'48px', marginBottom:'16px', opacity:0.5}}>
      {SECTIONS.find(s => s.id === section)?.icon}
    </div>
    <div style={{fontSize:'20px', fontWeight:800, color:'#1a2a4a', marginBottom:'6px'}}>
      {SECTIONS.find(s => s.id === section)?.label}
    </div>
    <div style={{fontSize:'13px', color:'#4a7ad0', maxWidth:'440px', margin:'0 auto', lineHeight:1.6}}>
      This section is scaffolded but not yet built out. After Patients is approved, the next phase will implement this section.
    </div>
  </div>
);

export default Concierge;
