// © 2026 SoulMD. All rights reserved.
import React from 'react';

interface Props { size?: number; style?: React.CSSProperties; }

const NephroIcon: React.FC<Props> = ({ size = 32, style }) => {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `nephroGrad-${uid}`;
  const maskId = `nephroMask-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Kidney">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ab0f0"/>
          <stop offset="100%" stopColor="#9b8fe8"/>
        </linearGradient>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white"/>
          <circle cx="9" cy="16" r="4.5" fill="black"/>
        </mask>
      </defs>
      <ellipse cx="17" cy="16" rx="11" ry="13" fill={`url(#${gradId})`} mask={`url(#${maskId})`}/>
    </svg>
  );
};

export default NephroIcon;
