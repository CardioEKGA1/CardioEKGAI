// © 2026 SoulMD. All rights reserved.
import React from 'react';

interface Props { size?: number; style?: React.CSSProperties; }

const SoulMDLogo: React.FC<Props> = ({ size = 40, style }) => {
  const radius = Math.round(size * 0.3);
  const svgW = Math.round(size * 0.55);
  const svgH = Math.round(size * 0.4);
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
      <svg width={svgW} height={svgH} viewBox="0 0 22 16" aria-label="SoulMD">
        <polyline points="0,8 4,8 6,2 8,14 10,4 12,12 14,8 22,8" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

export default SoulMDLogo;
