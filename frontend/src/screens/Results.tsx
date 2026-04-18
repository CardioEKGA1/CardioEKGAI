// © 2026 SoulMD. All rights reserved.
import React from 'react';
import { EkgResult } from '../App';

interface Props { result: EkgResult; imageUrl: string; onChat: () => void; onBack: () => void; }

const Row = ({label,value,alert}:{label:string;value:string;alert?:boolean}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
    <span style={{fontSize:'13px',color:'#8aa0c0'}}>{label}</span>
    <span style={{fontSize:'13px',fontWeight:'700',color:alert?'#e05050':'#1a2a4a'}}>{value}{alert?' ⚠':''}</span>
  </div>
);

const Results: React.FC<Props> = ({ result, imageUrl, onChat, onBack }) => {
  const qtcNum = parseInt(result.qtc);
  const qtcAlert = qtcNum > 500;
  return (
    <div style={{minHeight:'100vh',padding:'20px',display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{maxWidth:'600px',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',paddingTop:'10px'}}>
          <button onClick={onBack} style={{background:'rgba(255,255,255,0.7)',border:'none',borderRadius:'10px',padding:'8px 14px',fontSize:'13px',color:'#4a7ad0',cursor:'pointer',fontWeight:'600'}}>← Back</button>
          <div style={{fontSize:'18px',fontWeight:'800',color:'#1a2a4a'}}>EKG Analysis</div>
        </div>

        {result.urgent_flags.length > 0 && (
          <div style={{background:'#fde8e8',border:'1px solid #f0b0b0',borderRadius:'16px',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#e05050',marginBottom:'8px'}}>⚠ Urgent Findings</div>
            {result.urgent_flags.map((f,i) => <div key={i} style={{fontSize:'13px',color:'#c04040',marginBottom:'4px'}}>• {f}</div>)}
          </div>
        )}

        <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'20px',padding:'20px',marginBottom:'16px',boxShadow:'0 4px 20px rgba(100,130,200,0.1)'}}>
          <div style={{fontSize:'12px',fontWeight:'700',color:'#8aa0c0',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'12px'}}>Measurements</div>
          <Row label="Rhythm" value={result.rhythm}/>
          <Row label="Heart Rate" value={result.rate}/>
          <Row label="PR Interval" value={result.pr_interval}/>
          <Row label="QRS Duration" value={result.qrs_duration}/>
          <Row label="QT Interval" value={result.qt_interval}/>
          <Row label="QTc (Bazett)" value={result.qtc} alert={qtcAlert}/>
          <Row label="Axis" value={result.axis}/>
        </div>

        <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'20px',padding:'20px',marginBottom:'16px',boxShadow:'0 4px 20px rgba(100,130,200,0.1)'}}>
          <div style={{fontSize:'12px',fontWeight:'700',color:'#8aa0c0',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'12px'}}>AI Impression</div>
          <p style={{fontSize:'14px',color:'#1a2a4a',lineHeight:'1.7',margin:'0 0 16px'}}>{result.impression}</p>
          <div style={{background:'rgba(122,176,240,0.12)',borderRadius:'12px',padding:'12px'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#4a7ad0',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Recommendation</div>
            <p style={{fontSize:'13px',color:'#1a2a4a',margin:'0',lineHeight:'1.6'}}>{result.recommendation}</p>
          </div>
        </div>

        {imageUrl && (
          <div style={{background:'rgba(255,255,255,0.85)',borderRadius:'20px',padding:'20px',marginBottom:'16px',boxShadow:'0 4px 20px rgba(100,130,200,0.1)'}}>
            <div style={{fontSize:'12px',fontWeight:'700',color:'#8aa0c0',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'12px'}}>Uploaded EKG</div>
            <img src={imageUrl} alt="EKG" style={{width:'100%',borderRadius:'12px',border:'1px solid rgba(122,176,240,0.2)'}}/>
          </div>
        )}

        <div style={{display:'flex',gap:'12px',marginBottom:'20px'}}>
          <button onClick={onBack} style={{flex:1,background:'rgba(255,255,255,0.8)',border:'1px solid rgba(122,176,240,0.3)',borderRadius:'14px',padding:'14px',fontSize:'14px',fontWeight:'600',color:'#4a7ad0',cursor:'pointer'}}>New Analysis</button>
          <button onClick={onChat} style={{flex:2,background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'14px',padding:'14px',fontSize:'14px',fontWeight:'700',color:'white',cursor:'pointer'}}>Ask Dr. CardioEKGAI →</button>
        </div>

        <div style={{fontSize:'11px',color:'#8aa0c0',textAlign:'center',lineHeight:'1.6'}}>
          For decision support only. Must be reviewed by a qualified clinician before clinical use.
        </div>
      </div>
    </div>
  );
};
export default Results;
