import React from 'react';
import SoulMDLogo from '../SoulMDLogo';
import { User } from '../App';

interface Props { user: User; onLogout: () => void; onOpenEkgscan: () => void; }

const TOOLS = [
  { slug: 'ekgscan',      name: 'EKGScan',         icon: '🫀', desc: '12-lead EKG interpretation in seconds',                      price: '$4.99 / mo' },
  { slug: 'nephroai',     name: 'NephroAI',        icon: '🫘', desc: 'Comprehensive AI nephrology — 10 conditions, one platform', price: '$9.99 / mo' },
  { slug: 'xrayread',     name: 'XrayRead',        icon: '🩻', desc: 'Structured radiology report from any X-ray image',          price: '$4.99 / mo' },
  { slug: 'rxcheck',      name: 'RxCheck',         icon: '💊', desc: 'Full medication interaction safety check',                  price: '$4.99 / mo' },
  { slug: 'infectid',     name: 'InfectID',        icon: '🦠', desc: 'IDSA-based antibiotic recommendations',                     price: '$4.99 / mo' },
  { slug: 'clinicalnote', name: 'ClinicalNote AI', icon: '📝', desc: 'SOAP notes from bullet points in seconds',                  price: '$29.99 / mo' },
  { slug: 'cerebralai',   name: 'CerebralAI',      icon: '🧠', desc: 'Brain and spine MRI and CT interpretation',                 price: '$4.99 / mo' },
];

const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)', borderRadius:'20px', padding:'20px', boxShadow:'0 4px 20px rgba(100,130,200,0.1)', border:'1px solid rgba(255,255,255,0.9)'};

const SuiteDashboard: React.FC<Props> = ({ user, onLogout, onOpenEkgscan }) => {
  const hasEkgscan = true;
  const tierLabel = user.is_subscribed ? (user.scan_count >= 0 ? 'EKGScan · Active' : 'Active') : 'Free tier';

  return (
    <div style={{minHeight:'100vh', padding:'20px 16px', maxWidth:'1200px', margin:'0 auto'}}>
      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <SoulMDLogo size={32}/>
          <div style={{fontSize:'18px', fontWeight:'900', color:'#1a2a4a'}}>SoulMD</div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', fontSize:'11px', color:'#6a8ab0'}}>
            <span style={{fontWeight:'600', color:'#1a2a4a', fontSize:'12px', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.email}</span>
            <span style={{background:'rgba(122,176,240,0.12)', borderRadius:'10px', padding:'3px 9px', fontWeight:'700', color:'#4a7ad0', marginTop:'3px'}}>{tierLabel}</span>
          </div>
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>Sign Out</button>
        </div>
      </nav>

      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'6px'}}>Dashboard</div>
        <div style={{fontSize:'24px', fontWeight:'900', color:'#1a2a4a'}}>Welcome back</div>
        <div style={{fontSize:'13px', color:'#6a8ab0', marginTop:'4px'}}>Pick a tool to get started. More tools launching soon.</div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'14px'}}>
        {TOOLS.map(t => {
          const active = t.slug === 'ekgscan' && hasEkgscan;
          const comingSoon = t.slug !== 'ekgscan';
          return (
            <div key={t.slug} style={{...CARD, display:'flex', flexDirection:'column', gap:'10px', opacity: active ? 1 : 0.65, position:'relative'}}>
              <div style={{fontSize:'32px', filter: active ? 'none' : 'grayscale(0.5)'}}>{t.icon}</div>
              <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap'}}>
                <div style={{fontSize:'16px', fontWeight:'800', color:'#1a2a4a'}}>{t.name}</div>
                {t.slug === 'nephroai' && <span style={{fontSize:'10px', fontWeight:'700', background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)', color:'white', borderRadius:'8px', padding:'2px 8px'}}>10 conditions</span>}
                {!active && <span style={{fontSize:'10px', color:'#8aa0c0'}}>🔒</span>}
              </div>
              <div style={{fontSize:'13px', color:'#6a8ab0', lineHeight:'1.55', flex:1}}>{t.desc}</div>
              {active ? (
                <button onClick={onOpenEkgscan} style={{background:WORDMARK, border:'none', borderRadius:'12px', padding:'10px', fontSize:'13px', fontWeight:'700', color:'white', cursor:'pointer'}}>Open →</button>
              ) : comingSoon ? (
                <button disabled style={{background:'rgba(240,246,255,0.8)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px', fontSize:'12px', fontWeight:'700', color:'#8aa0c0', cursor:'default'}}>Launching soon</button>
              ) : (
                <button style={{background:'rgba(255,255,255,0.85)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'12px', padding:'10px', fontSize:'12px', fontWeight:'700', color:'#4a7ad0', cursor:'pointer'}}>Upgrade · {t.price}</button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{marginTop:'28px', padding:'16px', background:'rgba(122,176,240,0.08)', borderRadius:'14px', fontSize:'12px', color:'#6a8ab0', lineHeight:'1.6', textAlign:'center'}}>
        For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. In emergencies, call 911.
      </div>
    </div>
  );
};

export default SuiteDashboard;
