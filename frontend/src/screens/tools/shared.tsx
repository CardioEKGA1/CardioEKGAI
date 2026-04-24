// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import SoulMDLogo from '../../SoulMDLogo';
import ComplianceDisclaimer from '../../ComplianceDisclaimer';

export const WORDMARK = 'linear-gradient(135deg,#7ab0f0,#9b8fe8)';
export const CARD: React.CSSProperties = {background:'rgba(255,255,255,0.85)', borderRadius:'20px', padding:'20px', boxShadow:'0 4px 20px rgba(100,130,200,0.1)', border:'1px solid rgba(255,255,255,0.9)', marginBottom:'14px'};
export const LABEL: React.CSSProperties = {fontSize:'11px', fontWeight:'700', color:'#8aa0c0', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'8px'};
export const INPUT: React.CSSProperties = {width:'100%', padding:'10px 12px', borderRadius:'10px', border:'1px solid rgba(122,176,240,0.3)', fontSize:'13px', color:'#1a2a4a', background:'rgba(240,246,255,0.5)', outline:'none', boxSizing:'border-box'};
export const BTN_PRIMARY: React.CSSProperties = {background:WORDMARK, border:'none', borderRadius:'12px', padding:'12px 18px', fontSize:'14px', fontWeight:'700', color:'white', cursor:'pointer'};
export const FIELD_LABEL: React.CSSProperties = {fontSize:'11px', color:'#6a8ab0', fontWeight:'600', marginBottom:'4px'};

interface ShellProps { name: string; subtitle?: string; badge?: string; icon?: React.ReactNode; onBack: () => void; children: React.ReactNode; }

export const ToolShell: React.FC<ShellProps> = ({ name, subtitle, badge, icon, onBack, children }) => (
  <div style={{minHeight:'100vh', background:'linear-gradient(135deg, #dce8fb 0%, #ede8fb 100%)', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif'}}>
  <div style={{padding:'20px 16px', maxWidth:'880px', margin:'0 auto'}}>
    <nav style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', flexWrap:'wrap'}}>
      <button onClick={onBack} style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(122,176,240,0.3)', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:'#4a7ad0', cursor:'pointer'}}>← Back</button>
      <SoulMDLogo size={28}/>
      <div style={{fontSize:'12px', color:'#c0d4f0', marginLeft:'4px'}}>/</div>
      {icon && <span style={{display:'inline-flex', alignItems:'center'}}>{icon}</span>}
      <div style={{fontSize:'14px', color:'#1a2a4a', fontWeight:'800'}}>{name}</div>
      {badge && <span style={{fontSize:'10px', fontWeight:'700', background:WORDMARK, color:'white', borderRadius:'8px', padding:'2px 8px'}}>{badge}</span>}
    </nav>
    {subtitle && <div style={{fontSize:'13px', color:'#6a8ab0', marginBottom:'16px'}}>{subtitle}</div>}
    {children}
    <div style={{marginTop:'20px', padding:'14px', background:'rgba(122,176,240,0.08)', borderRadius:'12px', fontSize:'11px', color:'#6a8ab0', lineHeight:'1.6', textAlign:'center'}}>
      For clinical decision support only. AI interpretation must be independently reviewed by a licensed clinician. In emergencies, call 911.
      <div style={{marginTop:'8px'}}>Feedback on this tool? <a href="mailto:feedback@soulmd.us" style={{color:'#4a7ad0', textDecoration:'none', fontWeight:'600'}}>feedback@soulmd.us</a> · Support? <a href="mailto:support@soulmd.us" style={{color:'#4a7ad0', textDecoration:'none', fontWeight:'600'}}>support@soulmd.us</a></div>
    </div>
    <ComplianceDisclaimer style={{marginTop: '12px', marginBottom: '8px'}}/>
  </div>
  </div>
);

export const RenderValue: React.FC<{value: any}> = ({value}) => {
  if (value === null || value === undefined || value === '') return <span style={{color:'#a0b0c8', fontStyle:'italic'}}>—</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{color:'#a0b0c8', fontStyle:'italic'}}>none</span>;
    return (
      <ul style={{margin:'4px 0 4px 0', paddingLeft:'20px'}}>
        {value.map((item, i) => <li key={i} style={{marginBottom:'4px', fontSize:'13px', color:'#1a2a4a', lineHeight:'1.65'}}><RenderValue value={item}/></li>)}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <div style={{marginTop:'4px'}}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} style={{marginBottom:'4px'}}>
            <span style={{fontSize:'11px', color:'#8aa0c0', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.4px'}}>{k.replace(/_/g, ' ')}:</span>{' '}
            <span style={{fontSize:'13px', color:'#1a2a4a'}}><RenderValue value={v}/></span>
          </div>
        ))}
      </div>
    );
  }
  return <>{String(value)}</>;
};

export const ToolResult: React.FC<{data: any}> = ({data}) => {
  if (!data) return null;
  const { urgent_flags = [], clinical_pearls, when_to_consult, disclaimer, ...rest } = data;
  const hasBody = Object.keys(rest).length > 0;
  return (
    <div>
      {urgent_flags && urgent_flags.length > 0 && (
        <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'14px', padding:'14px', marginBottom:'12px'}}>
          <div style={{fontSize:'13px', fontWeight:'700', color:'#c04040', marginBottom:'6px'}}>⚠ Urgent findings</div>
          {urgent_flags.map((f: any, i: number) => <div key={i} style={{fontSize:'13px', color:'#c04040', marginBottom:'3px'}}>• {typeof f === 'string' ? f : JSON.stringify(f)}</div>)}
        </div>
      )}
      {hasBody && (
        <div style={CARD}>
          <div style={LABEL}>Findings</div>
          {Object.entries(rest).map(([k, v]) => (
            <div key={k} style={{paddingTop:'10px', paddingBottom:'10px', borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
              <div style={{fontSize:'11px', fontWeight:'700', color:'#4a7ad0', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'4px'}}>{k.replace(/_/g, ' ')}</div>
              <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:'1.65'}}><RenderValue value={v}/></div>
            </div>
          ))}
        </div>
      )}
      {clinical_pearls && clinical_pearls.length > 0 && (
        <div style={CARD}>
          <div style={LABEL}>Clinical pearls</div>
          {clinical_pearls.map((p: any, i: number) => <div key={i} style={{fontSize:'13px', color:'#1a2a4a', lineHeight:'1.7', marginBottom:'6px'}}>• {String(p)}</div>)}
        </div>
      )}
      {when_to_consult && (
        <div style={{...CARD, background:'linear-gradient(135deg,rgba(122,176,240,0.15),rgba(155,143,232,0.15))'}}>
          <div style={LABEL}>When to consult</div>
          <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:'1.7'}}>{String(when_to_consult)}</div>
        </div>
      )}
      {disclaimer && <div style={{fontSize:'11px', color:'#a0b0c8', textAlign:'center', padding:'6px'}}>{String(disclaimer)}</div>}
    </div>
  );
};
