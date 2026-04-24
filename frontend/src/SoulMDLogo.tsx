// © 2026 SoulMD, LLC. All rights reserved.
// Inline-SVG brand lockup: DNA double helix + seven-chakra staff, Soul/MD
// wordmark, small-caps subtitle. No raster assets — every placement
// renders at arbitrary size with the same file.
import React from 'react';

interface Props {
  size?: number;         // pixel height of the helix icon; text scales from it.
  dark?: boolean;        // true → "Soul" rendered in light ink for dark backgrounds.
  showText?: boolean;    // false → icon only (favicon/compact placements).
  subtitle?: string;     // small-caps label beneath the wordmark.
  style?: React.CSSProperties;
}

const CHAKRAS: { y: number; c: string }[] = [
  { y:  8, c: '#c8a8f0' },  // Crown
  { y: 24, c: '#8898e8' },  // Third eye
  { y: 40, c: '#60b8f0' },  // Throat
  { y: 56, c: '#68c888' },  // Heart
  { y: 72, c: '#e8d040' },  // Solar plexus
  { y: 84, c: '#f09848' },  // Sacral
  { y: 96, c: '#e05858' },  // Root
];

const SoulMDLogo: React.FC<Props> = ({
  size = 32,
  dark = false,
  showText = true,
  subtitle = 'AI CLINICAL SUITE',
  style,
}) => {
  const iconW = Math.round(size * 0.64);
  // Text proportions ride on `size` so the lockup stays balanced whether
  // the logo is rendered at 24px (favicon) or 80px (auth hero).
  const wordSize = Math.max(14, Math.round(size * 0.56));
  const subSize  = Math.max(8,  Math.round(size * 0.22));
  const gap      = Math.max(6,  Math.round(size * 0.26));
  const subletter = subSize >= 10 ? '3px' : '2.2px';

  return (
    <div style={{display:'inline-flex', alignItems:'center', gap, lineHeight:1, ...style}}>
      <svg
        width={iconW}
        height={size}
        viewBox="0 0 64 100"
        role="img"
        aria-label="SoulMD"
        style={{flexShrink:0}}
      >
        {/* Center staff — the caduceus spine the chakras sit on. */}
        <line x1="32" y1="2" x2="32" y2="98"
              stroke="#b0b0e8" strokeWidth="2" opacity="0.5"/>

        {/* Horizontal rungs — evoke DNA base pairs where the strands cross. */}
        {[16, 32, 48, 64, 80].map(y => (
          <line
            key={y}
            x1="22" x2="42" y1={y} y2={y}
            stroke="#b0b0e8" strokeWidth="1.3" opacity="0.35"
            strokeLinecap="round"
          />
        ))}

        {/* Lavender strand — opens to the left, crosses through mid. */}
        <path
          d="M32,8 C22,18 22,30 32,40 C42,50 42,62 32,72 C22,82 22,90 32,96"
          fill="none" stroke="#a0a0e8" strokeWidth="3.5"
          strokeLinecap="round" opacity="0.78"
        />
        {/* Blue strand — mirror phase, opens to the right. */}
        <path
          d="M32,8 C42,18 42,30 32,40 C22,50 22,62 32,72 C42,82 42,90 32,96"
          fill="none" stroke="#88b8f0" strokeWidth="3.5"
          strokeLinecap="round" opacity="0.78"
        />

        {/* Seven chakra beads stacked along the center staff. */}
        {CHAKRAS.map(({ y, c }) => (
          <g key={y} transform={`translate(32,${y})`}>
            <circle r="5"   fill={c}     opacity="0.92"/>
            <circle r="1.8" fill="#fff" opacity="0.85"/>
          </g>
        ))}
      </svg>

      {showText && (
        <div style={{display:'flex', flexDirection:'column', gap: Math.max(2, Math.round(size * 0.06))}}>
          <div style={{
            fontSize: wordSize,
            fontWeight: 500,
            letterSpacing: '1.5px',
            lineHeight: 1,
            fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
          }}>
            <span style={{color: dark ? '#e8f0fc' : '#1a2a4a'}}>Soul</span>
            <span style={{color: '#7ab0f0'}}>MD</span>
          </div>
          {subtitle && (
            <div style={{
              fontSize: subSize,
              letterSpacing: subletter,
              textTransform: 'uppercase',
              color: dark ? 'rgba(232,240,252,0.7)' : '#8aa0c0',
              fontWeight: 600,
              lineHeight: 1,
            }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SoulMDLogo;
