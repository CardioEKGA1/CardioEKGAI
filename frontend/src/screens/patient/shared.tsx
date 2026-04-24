// © 2026 SoulMD, LLC. All rights reserved.
// Shared aesthetic primitives for the /patient onboarding flow.
import React, { useState } from 'react';

export const PATIENT_BG = 'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 50%, #DFEAFC 100%)';
export const NAVY = '#1F1B3A';
export const PURPLE = '#534AB7';
export const PURPLE_SOFT = '#6B6889';
export const GOLD = '#C9A84C';
export const GOLD_SOFT = 'rgba(201,168,76,0.6)';
export const SERIF = '"Cormorant Garamond","Playfair Display",Georgia,serif';

// Inject keyframes once. Keyed by element id so multiple components
// mounting this module don't duplicate the style tag.
if (typeof document !== 'undefined' && !document.getElementById('__soulmd_patient_sparkles')) {
  const s = document.createElement('style');
  s.id = '__soulmd_patient_sparkles';
  s.textContent = `
    @keyframes soulmdSparkleDrift {
      0%   { transform: translate3d(0, 8vh, 0)  scale(0.6); opacity: 0; }
      10%  { opacity: 0.9; }
      60%  { opacity: 0.85; }
      100% { transform: translate3d(6px, -110vh, 0) scale(1.05); opacity: 0; }
    }
    @keyframes soulmdSparkleTwinkle {
      0%,100% { filter: brightness(1); }
      50%     { filter: brightness(1.6); }
    }
  `;
  document.head.appendChild(s);
}

interface Sparkle { id: number; left: number; size: number; duration: number; delay: number; opacity: number; }

const makeSparkles = (n: number): Sparkle[] => {
  const out: Sparkle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: i,
      left: Math.random() * 100,
      size: 4 + Math.random() * 7,
      duration: 14 + Math.random() * 14,
      delay: -Math.random() * 20,
      opacity: 0.4 + Math.random() * 0.5,
    });
  }
  return out;
};

export const SparkleLayer: React.FC<{ count?: number }> = ({ count = 22 }) => {
  const [sparkles] = useState(() => makeSparkles(count));
  return (
    <div aria-hidden="true" style={{position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden'}}>
      {sparkles.map(sp => (
        <span
          key={sp.id}
          style={{
            position:'absolute',
            left: `${sp.left}vw`,
            bottom: '-6vh',
            width: `${sp.size}px`,
            height: `${sp.size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${GOLD} 0%, ${GOLD_SOFT} 45%, transparent 72%)`,
            boxShadow: `0 0 ${Math.round(sp.size * 1.2)}px rgba(201,168,76,0.35)`,
            opacity: sp.opacity,
            animation: `soulmdSparkleDrift ${sp.duration}s linear ${sp.delay}s infinite, soulmdSparkleTwinkle ${sp.duration * 0.37}s ease-in-out ${sp.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

// Progress indicator — three dots with an active state. Steps run 1..3.
export const ProgressIndicator: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => (
  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px'}}>
    <span style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', color: PURPLE, fontWeight:800}}>
      Step {step} of 3
    </span>
    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
      {[1, 2, 3].map(n => (
        <span
          key={n}
          style={{
            width: n === step ? '22px' : '8px',
            height: '8px',
            borderRadius: '999px',
            background: n < step ? GOLD : n === step ? PURPLE : 'rgba(83,74,183,0.18)',
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      ))}
    </div>
  </div>
);

// Gold-sparkle divider used across the screens.
export const SparkleDivider: React.FC<{ width?: string }> = ({ width = '60%' }) => (
  <div style={{display:'flex', alignItems:'center', gap:'12px', width, margin:'18px auto 22px', opacity:0.75}}>
    <div style={{flex:1, height:'0.5px', background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)`}}/>
    <span style={{color: GOLD, fontSize:'12px', letterSpacing:'1px'}}>✦</span>
    <div style={{flex:1, height:'0.5px', background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)`}}/>
  </div>
);
