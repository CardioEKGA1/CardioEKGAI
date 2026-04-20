// © 2026 SoulMD. All rights reserved.
import React, { useEffect, useState } from 'react';

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true);
    } catch {}
  }, []);

  const accept = () => {
    try { localStorage.setItem('cookie_consent', '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px', left: '16px', right: '16px',
      maxWidth: '620px', margin: '0 auto',
      background: 'rgba(255,255,255,0.96)',
      borderRadius: '16px',
      padding: '14px 16px',
      boxShadow: '0 12px 40px rgba(100,130,200,0.25)',
      border: '1px solid rgba(122,176,240,0.35)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
    }}>
      <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:'1.5', flex:1, minWidth:'200px'}}>
        SoulMD uses essential cookies only. No tracking or advertising cookies. <a href="/privacy" style={{color:'#4a7ad0', textDecoration:'underline'}}>Privacy Policy</a>.
      </div>
      <button onClick={accept} style={{
        background: 'linear-gradient(135deg,#7ab0f0,#9b8fe8)',
        border: 'none',
        borderRadius: '10px',
        padding: '10px 22px',
        fontSize: '13px',
        fontWeight: 700,
        color: 'white',
        cursor: 'pointer',
        flexShrink: 0,
      }}>Accept</button>
    </div>
  );
};

export default CookieBanner;
