// © 2026 SoulMD, LLC. All rights reserved.
//
// The back of the daily oracle card — drawn inline as SVG so there is NO
// network request, NO cache, NO service-worker interaction, and NO asset
// path that can break. Same bytes in every user's bundle, rendered by the
// browser directly.
//
// Flower type + palette rotate deterministically per day (UTC), so every
// new day gives a fresh-looking back without any backend coordination.
// 7 flower shapes × 6 palettes = 42 distinct daily looks on rotation.
import React from 'react';

// ─── Palettes ─────────────────────────────────────────────────────────────
// Cartoonish, soft, matching the patient-PWA opal/blush aesthetic.
type Palette = { bg1: string; bg2: string; petal: string; petalEdge: string; center: string; leaf: string };
const PALETTES: Palette[] = [
  { bg1:'#FFF5F9', bg2:'#FDE3EE', petal:'#F6BFD3', petalEdge:'#E890B0', center:'#FFD37A', leaf:'#9DC7A9' }, // rose
  { bg1:'#F5F1FF', bg2:'#E6DEF8', petal:'#C9B4F0', petalEdge:'#9B8FE8', center:'#F5CF8A', leaf:'#A8C9B0' }, // lavender
  { bg1:'#FFF3E6', bg2:'#FFE0C2', petal:'#F7C48A', petalEdge:'#E5A464', center:'#FFF0A5', leaf:'#9DC7A9' }, // peach
  { bg1:'#E9F6FB', bg2:'#C8E5F0', petal:'#9DD6E8', petalEdge:'#5BB4D0', center:'#FFD37A', leaf:'#A8D4A8' }, // sky
  { bg1:'#FFF0E8', bg2:'#FCD6C4', petal:'#F0A89E', petalEdge:'#D67767', center:'#FFE38A', leaf:'#9DC7A9' }, // coral
  { bg1:'#F0F7EE', bg2:'#D9ECD3', petal:'#B5D4C0', petalEdge:'#7FB091', center:'#FFE090', leaf:'#7FAE7F' }, // sage
];

type FlowerKind = 'daisy' | 'tulip' | 'sunflower' | 'cherry' | 'lotus' | 'marigold' | 'cosmos';
const FLOWERS: FlowerKind[] = ['daisy', 'tulip', 'sunflower', 'cherry', 'lotus', 'marigold', 'cosmos'];

// Cheap deterministic hash of a date string so same day → same flower/color.
function hashInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
const todayKey = () => new Date().toISOString().slice(0, 10);

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
  size?: number;                 // outer height in px; width derives 2:3
  seedOverride?: string;         // testing / preview — normally skip
  borderRadius?: number;
  style?: React.CSSProperties;
}

const CardBackFlower: React.FC<Props> = ({ size = 450, seedOverride, borderRadius = 16, style }) => {
  const seed = hashInt(seedOverride || todayKey());
  const flower = FLOWERS[seed % FLOWERS.length];
  const palette = PALETTES[Math.floor(seed / FLOWERS.length) % PALETTES.length];
  const width = Math.round(size * (2 / 3));
  return (
    <div style={{
      width:'100%', height:'100%',
      borderRadius,
      overflow:'hidden',
      ...style,
    }}>
      <svg viewBox="0 0 200 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Daily oracle card back">
        <defs>
          <linearGradient id={`cb-bg-${seed}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.bg1}/>
            <stop offset="100%" stopColor={palette.bg2}/>
          </linearGradient>
          <radialGradient id={`cb-glow-${seed}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%"  stopColor={palette.petal} stopOpacity="0.35"/>
            <stop offset="60%" stopColor={palette.petal} stopOpacity="0.08"/>
            <stop offset="100%" stopColor={palette.petal} stopOpacity="0"/>
          </radialGradient>
        </defs>
        {/* Background */}
        <rect width="200" height="300" fill={`url(#cb-bg-${seed})`}/>
        <rect width="200" height="300" fill={`url(#cb-glow-${seed})`}/>

        {/* Sparkle dots scattered — deterministic positions */}
        {Array.from({ length: 12 }).map((_, i) => {
          const r = (((seed >> (i + 3)) & 0x3f) / 63);
          const x = 12 + ((i * 47 + (seed % 19)) % 176);
          const y = 18 + ((i * 31 + (seed % 23)) % 264);
          const sz = 1 + (r * 1.8);
          return <circle key={i} cx={x} cy={y} r={sz} fill={palette.petalEdge} opacity={0.18 + r * 0.18}/>;
        })}

        {/* Frame */}
        <rect x="6" y="6" width="188" height="288" rx="12" fill="none"
          stroke={palette.petalEdge} strokeWidth="1.5" strokeOpacity="0.35"/>
        <rect x="10" y="10" width="180" height="280" rx="10" fill="none"
          stroke={palette.petalEdge} strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="2 3"/>

        {/* Stem + leaves */}
        <path d="M 100 155 Q 98 200, 100 250 Q 102 270, 100 282" stroke={palette.leaf} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <ellipse cx="84" cy="210" rx="16" ry="7" fill={palette.leaf} transform="rotate(-30 84 210)"/>
        <ellipse cx="116" cy="230" rx="16" ry="7" fill={palette.leaf} transform="rotate(25 116 230)"/>

        {/* Flower head */}
        <g transform="translate(100 120)">
          <Flower kind={flower} palette={palette}/>
        </g>

        {/* Label at bottom */}
        <text x="100" y="288" fontFamily="'Playfair Display', Georgia, serif" fontStyle="italic"
          fontSize="9" letterSpacing="2" textAnchor="middle" fill={palette.petalEdge} opacity="0.85">
          SoulMD · {new Date().toLocaleDateString(undefined, { month:'long', day:'numeric' })}
        </text>
      </svg>
    </div>
  );
};

// ─── Flower shapes ────────────────────────────────────────────────────────

const Flower: React.FC<{kind: FlowerKind; palette: Palette}> = ({ kind, palette }) => {
  const { petal, petalEdge, center } = palette;
  switch (kind) {
    case 'daisy':     return <Daisy     petal={petal} edge={petalEdge} center={center} count={8}  petalRx={16} petalRy={28}/>;
    case 'tulip':     return <Tulip     petal={petal} edge={petalEdge} center={center}/>;
    case 'sunflower': return <Daisy     petal={petal} edge={petalEdge} center={center} count={14} petalRx={10} petalRy={32}/>;
    case 'cherry':    return <Cherry    petal={petal} edge={petalEdge} center={center}/>;
    case 'lotus':     return <Lotus     petal={petal} edge={petalEdge} center={center}/>;
    case 'marigold':  return <Marigold  petal={petal} edge={petalEdge} center={center}/>;
    case 'cosmos':    return <Daisy     petal={petal} edge={petalEdge} center={center} count={6}  petalRx={18} petalRy={30}/>;
  }
};

const Daisy: React.FC<{petal:string; edge:string; center:string; count:number; petalRx:number; petalRy:number}> = ({ petal, edge, center, count, petalRx, petalRy }) => (
  <>
    {Array.from({ length: count }).map((_, i) => {
      const angle = (i * 360) / count;
      return (
        <ellipse key={i} cx="0" cy={-petalRy * 0.7} rx={petalRx} ry={petalRy}
          fill={petal} stroke={edge} strokeWidth="1.2" strokeOpacity="0.55"
          transform={`rotate(${angle})`}/>
      );
    })}
    <circle cx="0" cy="0" r="12" fill={center} stroke={edge} strokeWidth="1.2" strokeOpacity="0.5"/>
    <circle cx="0" cy="0" r="6"  fill={edge} opacity="0.35"/>
  </>
);

const Tulip: React.FC<{petal:string; edge:string; center:string}> = ({ petal, edge }) => (
  <>
    <path d="M -26 8 Q -30 -40, 0 -42 Q 30 -40, 26 8 Q 18 16, 0 14 Q -18 16, -26 8 Z"
      fill={petal} stroke={edge} strokeWidth="1.4" strokeOpacity="0.6"/>
    <path d="M -14 10 Q -18 -28, 0 -36 Q 18 -28, 14 10 Z"
      fill={edge} opacity="0.22"/>
  </>
);

const Cherry: React.FC<{petal:string; edge:string; center:string}> = ({ petal, edge, center }) => (
  <>
    {Array.from({ length: 5 }).map((_, i) => {
      const angle = (i * 72) - 90;
      return (
        <g key={i} transform={`rotate(${angle})`}>
          <path d="M 0 -10 Q -18 -38, -4 -48 Q 0 -52, 4 -48 Q 18 -38, 0 -10 Z"
            fill={petal} stroke={edge} strokeWidth="1.2" strokeOpacity="0.55"/>
        </g>
      );
    })}
    <circle cx="0" cy="0" r="8" fill={center} stroke={edge} strokeWidth="1" strokeOpacity="0.5"/>
    {Array.from({ length: 6 }).map((_, i) => {
      const a = (i * 60) * Math.PI / 180;
      return <circle key={i} cx={Math.cos(a) * 6} cy={Math.sin(a) * 6} r="1.4" fill={edge} opacity="0.7"/>;
    })}
  </>
);

const Lotus: React.FC<{petal:string; edge:string; center:string}> = ({ petal, edge, center }) => (
  <>
    {[-60, -30, 0, 30, 60].map((angle, i) => (
      <path key={i} transform={`rotate(${angle})`}
        d="M 0 0 Q -14 -32, 0 -54 Q 14 -32, 0 0 Z"
        fill={petal} stroke={edge} strokeWidth="1.2" strokeOpacity="0.55"/>
    ))}
    {[-90, -60, -30, 0, 30, 60, 90].map((angle, i) => (
      <path key={i} transform={`rotate(${angle}) translate(0, 6)`}
        d="M 0 0 Q -10 -20, 0 -36 Q 10 -20, 0 0 Z"
        fill={petal} opacity="0.75" stroke={edge} strokeWidth="1" strokeOpacity="0.4"/>
    ))}
    <ellipse cx="0" cy="4" rx="20" ry="5" fill={center} stroke={edge} strokeWidth="1" strokeOpacity="0.5"/>
  </>
);

const Marigold: React.FC<{petal:string; edge:string; center:string}> = ({ petal, edge, center }) => (
  <>
    {/* Outer ring */}
    {Array.from({ length: 12 }).map((_, i) => (
      <circle key={`o${i}`} cx="0" cy={-36} r={10}
        transform={`rotate(${i * 30})`}
        fill={petal} stroke={edge} strokeWidth="1" strokeOpacity="0.45"/>
    ))}
    {/* Inner ring */}
    {Array.from({ length: 10 }).map((_, i) => (
      <circle key={`i${i}`} cx="0" cy={-20} r={8}
        transform={`rotate(${i * 36 + 18})`}
        fill={petal} opacity="0.85" stroke={edge} strokeWidth="1" strokeOpacity="0.4"/>
    ))}
    <circle cx="0" cy="0" r="10" fill={center} stroke={edge} strokeWidth="1.2" strokeOpacity="0.5"/>
  </>
);

export default CardBackFlower;
