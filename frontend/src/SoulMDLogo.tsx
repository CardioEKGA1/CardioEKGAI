import React from 'react';

interface Props { size?: number; style?: React.CSSProperties; }

const SoulMDLogo: React.FC<Props> = ({ size = 80, style }) => (
  <svg width={size} height={Math.round(size * (160/120))} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="SoulMD">
    <defs>
      <linearGradient id="soulGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7ab0f0"/>
        <stop offset="100%" stopColor="#9b8fe8"/>
      </linearGradient>
    </defs>
    <path d="M 60 22 C 50 14 28 10 16 22 C 36 20 48 24 58 32" stroke="url(#soulGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M 60 22 C 70 14 92 10 104 22 C 84 20 72 24 62 32" stroke="url(#soulGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="60" y1="28" x2="60" y2="152" stroke="url(#soulGrad)" strokeWidth="4.5" strokeLinecap="round"/>
    <path d="M 60 34 Q 38 43 60 52 Q 82 61 60 70 Q 38 79 60 88 Q 82 97 60 106 Q 38 115 60 124 Q 82 133 60 142" stroke="url(#soulGrad)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.55" fill="none"/>
    <path d="M 60 34 Q 82 43 60 52 Q 38 61 60 70 Q 82 79 60 88 Q 38 97 60 106 Q 82 115 60 124 Q 38 133 60 142" stroke="url(#soulGrad)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.55" fill="none"/>
    <circle cx="60" cy="34" r="6" fill="url(#soulGrad)"/>
    <circle cx="60" cy="52" r="5.5" fill="url(#soulGrad)"/>
    <circle cx="60" cy="70" r="5.5" fill="url(#soulGrad)"/>
    <circle cx="60" cy="88" r="6.5" fill="url(#soulGrad)"/>
    <circle cx="60" cy="106" r="5.5" fill="url(#soulGrad)"/>
    <circle cx="60" cy="124" r="5.5" fill="url(#soulGrad)"/>
    <circle cx="60" cy="142" r="6" fill="url(#soulGrad)"/>
    <line x1="48" y1="152" x2="72" y2="152" stroke="url(#soulGrad)" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
);

export default SoulMDLogo;
