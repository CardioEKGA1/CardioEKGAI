// © 2026 SoulMD. All rights reserved.
import React from 'react';

interface Props { size?: number; style?: React.CSSProperties; }

const CHAKRAS = [
  { y: 34,  color: '#9b8fe8' },  // Crown
  { y: 52,  color: '#b8a8f0' },  // Third Eye
  { y: 70,  color: '#7ab0f0' },  // Throat
  { y: 88,  color: '#88c8a8' },  // Heart
  { y: 106, color: '#c8b870' },  // Solar Plexus
  { y: 124, color: '#e0a888' },  // Sacral
  { y: 142, color: '#e89898' },  // Root
];

const SoulMDLogo: React.FC<Props> = ({ size = 80, style }) => (
  <svg width={size} height={Math.round(size * (160 / 120))} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="SoulMD">
    {/* Wings */}
    <path d="M 60 22 C 48 14 26 10 14 22 C 34 20 48 24 58 32" stroke="#7ab0f0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M 60 22 C 72 14 94 10 106 22 C 86 20 72 24 62 32" stroke="#7ab0f0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Central staff */}
    <line x1="60" y1="28" x2="60" y2="152" stroke="#7ab0f0" strokeWidth="5" strokeLinecap="round"/>
    {/* Left serpent */}
    <path d="M 60 34 Q 36 43 60 52 Q 36 61 60 70 Q 36 79 60 88 Q 36 97 60 106 Q 36 115 60 124 Q 36 133 60 142" stroke="#9b8fe8" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.9"/>
    {/* Right serpent */}
    <path d="M 60 34 Q 84 43 60 52 Q 84 61 60 70 Q 84 79 60 88 Q 84 97 60 106 Q 84 115 60 124 Q 84 133 60 142" stroke="#7ab0f0" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.9"/>
    {/* Base */}
    <line x1="46" y1="152" x2="74" y2="152" stroke="#7ab0f0" strokeWidth="4" strokeLinecap="round"/>
    {/* 7 chakra dots: white glassmorphism halo + colored center */}
    {CHAKRAS.map((c, i) => (
      <g key={i}>
        <circle cx="60" cy={c.y} r="8" fill="white" opacity="0.92"/>
        <circle cx="60" cy={c.y} r="8" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1"/>
        <circle cx="60" cy={c.y} r="5" fill={c.color}/>
      </g>
    ))}
  </svg>
);

export default SoulMDLogo;
