// © 2026 SoulMD. All rights reserved.
import React from 'react';

interface Props { size?: number; style?: React.CSSProperties; }

const NephroIcon: React.FC<Props> = ({ size = 32, style }) => {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `kg-${uid}`;
  const maskId = `km-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Kidney">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ab0f0"/>
          <stop offset="100%" stopColor="#9b8fe8"/>
        </linearGradient>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white"/>
          <ellipse cx="9" cy="16" rx="4" ry="5" fill="black"/>
        </mask>
      </defs>
      {/* Kidney parenchyma */}
      <ellipse cx="18" cy="16" rx="10" ry="13" fill={`url(#${gradId})`} mask={`url(#${maskId})`}/>
      {/* Renal pelvis — interior curve */}
      <path d="M 15 10 C 22 13 22 19 15 22" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeOpacity="0.55"/>
      {/* Hilar vessel dot */}
      <circle cx="11" cy="16" r="1.1" fill="white" fillOpacity="0.7"/>
    </svg>
  );
};

export default NephroIcon;
