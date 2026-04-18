// © 2026 SoulMD. All rights reserved.
import React from 'react';

interface Props { onSignIn: () => void; onSignUp: () => void; onTerms: () => void; }

const Landing: React.FC<Props> = ({ onSignIn, onSignUp, onTerms }) => (
  <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
    <nav style={{padding:'16px 40px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(10px)',borderBottom:'1px solid rgba(122,176,240,0.2)'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="20" height="14" viewBox="0 0 20 14"><polyline points="0,7 3,7 5,1 7,13 9,4 11,10 13,7 20,7" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{fontSize:'16px',fontWeight:'800',color:'#1a2a4a'}}>EKGScan</div>
          <div style={{fontSize:'9px',color:'#8aa0c0',letterSpacing:'1px',textTransform:'uppercase'}}>by SoulMD</div>
        </div>
      </div>
      <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
        <button onClick={onSignIn} style={{background:'transparent',border:'1px solid rgba(122,176,240,0.4)',borderRadius:'10px',padding:'8px 20px',fontSize:'13px',fontWeight:'600',color:'#4a7ad0',cursor:'pointer'}}>Sign In</button>
        <button onClick={onSignUp} style={{background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'10px',padding:'8px 20px',fontSize:'13px',fontWeight:'700',color:'white',cursor:'pointer'}}>Sign Up Free</button>
      </div>
    </nav>

    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 40px',textAlign:'center'}}>
      <div style={{fontSize:'11px',fontWeight:'600',color:'#4a7ad0',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'16px',background:'rgba(122,176,240,0.12)',padding:'6px 16px',borderRadius:'20px',display:'inline-block'}}>AI-Powered EKG Analysis</div>
      <h1 style={{fontSize:'52px',fontWeight:'900',color:'#1a2a4a',lineHeight:'1.1',marginBottom:'20px',maxWidth:'700px'}}>
        Cardiac Interpretation<br/>
        <span style={{background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Powered by AI</span>
      </h1>
      <p style={{fontSize:'18px',color:'#6a8ab0',lineHeight:'1.7',maxWidth:'560px',marginBottom:'40px'}}>
        Upload any EKG image and receive instant structured interpretation. Rhythm, intervals, axis, and clinical impression — in seconds.
      </p>
      <div style={{display:'flex',gap:'14px',marginBottom:'60px',flexWrap:'wrap',justifyContent:'center'}}>
        <button onClick={onSignUp} style={{background:'linear-gradient(135deg,#7ab0f0,#9b8fe8)',border:'none',borderRadius:'16px',padding:'16px 36px',fontSize:'16px',fontWeight:'700',color:'white',cursor:'pointer'}}>Start Free — Sign Up</button>
        <button onClick={onSignIn} style={{background:'rgba(255,255,255,0.8)',border:'1px solid rgba(122,176,240,0.3)',borderRadius:'16px',padding:'16px 36px',fontSize:'16px',fontWeight:'600',color:'#4a7ad0',cursor:'pointer'}}>Sign In</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px',maxWidth:'800px',width:'100%'}}>
        {[
          {icon:'🫀',title:'EKG Interpretation',body:'Rhythm, rate, intervals, axis and full clinical impression in structured format'},
          {icon:'💬',title:'AI Cardiology Chat',body:'Ask Dr. SoulMD follow-up questions about the findings with full EKG context'},
          {icon:'⚡',title:'Instant Results',body:'Claude AI analyzes your EKG in seconds — no waiting, no manual entry'},
        ].map(card => (
          <div key={card.title} style={{background:'rgba(255,255,255,0.7)',borderRadius:'20px',padding:'24px',textAlign:'left',border:'1px solid rgba(255,255,255,0.9)'}}>
            <div style={{fontSize:'28px',marginBottom:'12px'}}>{card.icon}</div>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1a2a4a',marginBottom:'8px'}}>{card.title}</div>
            <div style={{fontSize:'13px',color:'#8aa0c0',lineHeight:'1.6'}}>{card.body}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:'40px',display:'flex',gap:'16px',flexWrap:'wrap',justifyContent:'center'}}>
        <div style={{background:'rgba(255,255,255,0.6)',borderRadius:'20px',padding:'8px 16px',fontSize:'12px',color:'#4a7ad0',fontWeight:'500'}}>1 free scan included</div>
        <div style={{background:'rgba(255,255,255,0.6)',borderRadius:'20px',padding:'8px 16px',fontSize:'12px',color:'#4a7ad0',fontWeight:'500'}}>$4.99/month after</div>
        <div style={{background:'rgba(255,255,255,0.6)',borderRadius:'20px',padding:'8px 16px',fontSize:'12px',color:'#4a7ad0',fontWeight:'500'}}>Cancel anytime</div>
      </div>
    </div>

    <div style={{padding:'20px 40px',textAlign:'center',fontSize:'11px',color:'#a0b0c8',borderTop:'1px solid rgba(122,176,240,0.15)',background:'rgba(255,255,255,0.4)'}}>
      For clinical decision support only. AI interpretation must be reviewed by a qualified clinician before clinical use.
    </div>
  </div>
);
export default Landing;
