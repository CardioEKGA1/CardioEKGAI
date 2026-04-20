// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';

interface Props { size?: number; style?: React.CSSProperties; }

const SoulMDLogo: React.FC<Props> = ({ size = 40, style }) => {
  const radius = Math.round(size * 0.3);
  const inner = Math.round(size * 0.62);
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: 'linear-gradient(135deg, #7ab0f0, #9b8fe8)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}>
      <svg width={inner} height={inner} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="SoulMD">
        {/* Wing tips */}
        <path d="M 16 6 L 10 9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M 16 6 L 22 9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M 13 8 L 10 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.75"/>
        <path d="M 19 8 L 22 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.75"/>
        {/* Staff (soft, central) */}
        <line x1="16" y1="7" x2="16" y2="27" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.45"/>
        {/* Double helix — two intertwining curves */}
        <path d="M 16 10 Q 8 13 16 16 Q 24 19 16 22 Q 10 24 13 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M 16 10 Q 24 13 16 16 Q 8 19 16 22 Q 22 24 19 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* Crossing node dots */}
        <circle cx="16" cy="16" r="1.2" fill="white"/>
        <circle cx="16" cy="22" r="1" fill="white" fillOpacity="0.85"/>
      </svg>
    </div>
  );
};

export default SoulMDLogo;
