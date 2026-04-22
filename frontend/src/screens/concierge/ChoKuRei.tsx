// © 2026 SoulMD, LLC. All rights reserved.
// Cho Ku Rei — Reiki "power symbol" rendered as SVG for use both as a subtle
// page watermark and as the glowing centerpiece of the oracle card.
import React from 'react';

interface Props {
  size?: number;
  color?: string;
  opacity?: number;
  glow?: boolean;
}

/**
 * Cho Ku Rei is a stylized spiral crossed by a horizontal + vertical line.
 * The drawing here is a simplified vector rendering — recognizable and
 * aesthetic without claiming to be a sacred/traditional reproduction.
 */
const ChoKuRei: React.FC<Props> = ({ size = 120, color = '#6b4e7c', opacity = 0.08, glow = false }) => {
  const stroke = glow ? 3 : 2;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{opacity, filter: glow ? `drop-shadow(0 0 12px ${color})` : undefined}} aria-hidden="true">
      {/* Vertical staff */}
      <line x1="60" y1="6"  x2="60" y2="114" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
      {/* Horizontal cross — three tiers, going from top-left down */}
      <line x1="16" y1="22" x2="104" y2="22" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
      {/* Descending spiral: square-ish inward winding */}
      <path
        d="M 104 22
           L 104 62
           L 16  62
           L 16  78
           L 90  78
           L 90  92
           L 30  92
           L 30  104
           L 76  104"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
};

export default ChoKuRei;
