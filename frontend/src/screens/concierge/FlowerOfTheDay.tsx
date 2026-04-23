// © 2026 SoulMD, LLC. All rights reserved.
//
// Inline SVG flower of the day — 365 unique looks per year, algorithmically
// generated. Zero image dependencies. Every card on a given day shows the
// same flower (deterministic by dayOfYear).
//
// The variation space is larger than 365: 20 flower types × 30 palettes ×
// 9 petal counts × 3 shape variants = ~16,200 combos. We seed all params
// from dayOfYear so each day of the year produces a distinct, reproducible
// flower — and next year, same day, same flower.
import React from 'react';

// ─── Types & palette ──────────────────────────────────────────────────────

export type FlowerType =
  | 'rose' | 'lotus' | 'sunflower' | 'cherry' | 'iris' | 'peony' | 'lily'
  | 'dahlia' | 'marigold' | 'lavender' | 'orchid' | 'poppy' | 'magnolia'
  | 'jasmine' | 'hibiscus' | 'cosmos' | 'anemone' | 'ranunculus' | 'protea' | 'tulip';

const FLOWERS: FlowerType[] = [
  'rose','lotus','sunflower','cherry','iris','peony','lily','dahlia',
  'marigold','lavender','orchid','poppy','magnolia','jasmine','hibiscus',
  'cosmos','anemone','ranunculus','protea','tulip',
];

// 30 curated soft botanical colors. Each entry is [primary, secondary] where
// secondary is a complementary centre/stamen shade.
const PALETTES: [string, string][] = [
  ['#E8748A', '#C85A6E'], // rose pink
  ['#9B8FD4', '#6E5EB0'], // lavender
  ['#F5C842', '#B88A1E'], // gold
  ['#FFB7C5', '#D48896'], // blush
  ['#7B68C8', '#4F3E9B'], // iris purple
  ['#F4A8B8', '#C47A8E'], // peony
  ['#F8E8A0', '#C9A84C'], // ivory-gold
  ['#A8D8A8', '#679A67'], // sage
  ['#F7B267', '#C78231'], // marigold
  ['#C8A2C8', '#8E6D8E'], // lilac
  ['#87CEEB', '#4F8FAE'], // sky blue
  ['#DDA0DD', '#A569A5'], // plum
  ['#98D8C8', '#5EA596'], // mint
  ['#F0A500', '#B37300'], // amber
  ['#E8A0BF', '#B4708F'], // dusty rose
  ['#B8D4E8', '#7AA0B8'], // periwinkle
  ['#F5B591', '#C7805C'], // peach
  ['#D4B5F0', '#9E8FC0'], // pale orchid
  ['#B5E48C', '#7AAE52'], // tea green
  ['#FFC6A5', '#D09370'], // apricot
  ['#E0BBE4', '#B087B4'], // wisteria
  ['#FFCAD4', '#CE97A3'], // cotton candy
  ['#C4E3DE', '#7CB2AB'], // seafoam
  ['#F6E6BE', '#C7B178'], // champagne
  ['#EAC4D5', '#B78FA0'], // mauve
  ['#BEE3DB', '#7DAEA7'], // aqua mist
  ['#F5D0C5', '#C69C8E'], // salmon cream
  ['#D8E2DC', '#9CA9A4'], // fog
  ['#FFC6B4', '#C99287'], // coral cream
  ['#DDD6F3', '#8E85BE'], // soft lilac
];

const GOLD = '#C9A84C';
const GOLD_SOFT = '#E6C97A';
const LEAF = '#9DC7A9';

// ─── Seed math ────────────────────────────────────────────────────────────

const dayOfYearToday = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now.getTime() - start.getTime());
  return Math.floor(diff / 86400000);
};

interface FlowerParams {
  type: FlowerType;
  palette: [string, string];
  petalCount: number;         // 4-12
  shape: 'rounded' | 'pointed' | 'wavy';
  rotation: number;           // 0-360 — slight rotational variation
  bgTint: string;             // very soft tint of primary
  dayOfYear: number;
}

export function flowerForDay(dayOfYear: number): FlowerParams {
  // Mix bits of dayOfYear to derive each parameter deterministically.
  const d = dayOfYear | 0;
  const type    = FLOWERS[d % FLOWERS.length];
  const palette = PALETTES[(d * 7) % PALETTES.length];
  const petalCount = 4 + (Math.floor(d * 1.7) % 9);   // 4..12
  const shapeIdx = Math.floor(d / 3) % 3;
  const shape = (['rounded','pointed','wavy'] as const)[shapeIdx];
  const rotation = (d * 23) % 360;
  // Very soft tint of the primary at ~8% saturation.
  const bgTint = `${palette[0]}14`;   // CSS 8-digit hex: last 2 hex = alpha 0x14 ≈ 8%
  return { type, palette, petalCount, shape, rotation, bgTint, dayOfYear: d };
}

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
  seed?: number;                  // override dayOfYear for preview
  size?: number;                  // outer height in px
  borderRadius?: number;
  style?: React.CSSProperties;
}

const FlowerOfTheDay: React.FC<Props> = ({ seed, size = 255, borderRadius = 14, style }) => {
  const params = flowerForDay(seed ?? dayOfYearToday());
  const [primary, secondary] = params.palette;
  const width = Math.round(size * (2 / 3));
  // A very faint tint from the flower primary becomes the card background.
  const bg = `linear-gradient(180deg, #FFFBF4 0%, ${params.bgTint} 100%)`;
  return (
    <div style={{
      width:'100%', height:'100%',
      borderRadius,
      background: bg,
      overflow:'hidden',
      boxShadow:`
        inset 0 0 0 2px ${GOLD},
        inset 0 0 0 4px rgba(201,168,76,0.25),
        0 0 22px ${primary}33`,
      position:'relative',
      ...style,
    }}>
      {/* Decorative inner rule border */}
      <div style={{
        position:'absolute', inset:'10px',
        border:`1px solid ${GOLD_SOFT}80`,
        borderRadius: `${Math.max(0, borderRadius - 4)}px`,
        pointerEvents:'none',
      }}/>

      <svg viewBox="0 0 170 255" width="100%" height="100%"
        xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
        role="img" aria-label={`Daily flower: ${params.type}`}>
        {/* Stem */}
        <path d="M 85 155 Q 83 195, 85 245 Q 86 252, 85 254" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85"/>
        {/* Leaves — count and size vary by shape */}
        {params.shape !== 'pointed' && (
          <ellipse cx="72" cy="200" rx="14" ry="6" fill={LEAF} opacity="0.8" transform="rotate(-30 72 200)"/>
        )}
        {params.shape === 'wavy' && (
          <ellipse cx="98" cy="220" rx="14" ry="6" fill={LEAF} opacity="0.75" transform="rotate(30 98 220)"/>
        )}
        {params.type === 'lavender' || params.shape === 'rounded' ? (
          <ellipse cx="96" cy="210" rx="12" ry="5" fill={LEAF} opacity="0.75" transform="rotate(28 96 210)"/>
        ) : null}

        {/* Flower head */}
        <g transform={`translate(85 115) rotate(${params.rotation})`}>
          <Flower params={params} primary={primary} secondary={secondary}/>
        </g>

        {/* Little signature at bottom */}
        <text x="85" y="232" fontFamily="'Playfair Display',Georgia,serif" fontStyle="italic"
          fontSize="8" letterSpacing="2" textAnchor="middle" fill={GOLD} opacity="0.7">
          soulmd · day {params.dayOfYear}
        </text>
      </svg>
    </div>
  );
};

// ─── Flower renderers ─────────────────────────────────────────────────────

const Flower: React.FC<{params: FlowerParams; primary: string; secondary: string}> = ({ params, primary, secondary }) => {
  const { type } = params;
  switch (type) {
    // Layered rounded (rose / peony / dahlia / ranunculus)
    case 'rose':       return <Layered params={params} primary={primary} secondary={secondary} layers={3} tightness={0.55}/>;
    case 'peony':      return <Layered params={params} primary={primary} secondary={secondary} layers={4} tightness={0.6}/>;
    case 'dahlia':     return <Layered params={params} primary={primary} secondary={secondary} layers={3} tightness={0.5} pointy/>;
    case 'ranunculus': return <Layered params={params} primary={primary} secondary={secondary} layers={4} tightness={0.7}/>;

    // Upright pointed (lotus / magnolia / protea)
    case 'lotus':      return <Upright params={params} primary={primary} secondary={secondary} variant="lotus"/>;
    case 'magnolia':   return <Upright params={params} primary={primary} secondary={secondary} variant="magnolia"/>;
    case 'protea':     return <Upright params={params} primary={primary} secondary={secondary} variant="protea"/>;

    // Dense radial (sunflower / marigold)
    case 'sunflower':  return <DenseRadial params={params} primary={primary} secondary={secondary} rays={24} longRay={38}/>;
    case 'marigold':   return <DenseRadial params={params} primary={primary} secondary={secondary} rays={16} longRay={30}/>;

    // Round 5-petal (cherry / jasmine / cosmos / anemone / hibiscus / poppy)
    case 'cherry':     return <RoundFive params={params} primary={primary} secondary={secondary} petalRy={34} notched/>;
    case 'jasmine':    return <RoundFive params={params} primary={primary} secondary={secondary} petalRy={30}/>;
    case 'cosmos':     return <RoundFive params={params} primary={primary} secondary={secondary} petalRy={36} count={6}/>;
    case 'anemone':    return <RoundFive params={params} primary={primary} secondary={secondary} petalRy={32} count={6} darkCenter/>;
    case 'hibiscus':   return <RoundFive params={params} primary={primary} secondary={secondary} petalRy={38} count={5}/>;
    case 'poppy':      return <RoundFive params={params} primary={primary} secondary={secondary} petalRy={34} count={4} darkCenter/>;

    // Star / pointed (iris / lily / orchid)
    case 'iris':       return <StarPetals params={params} primary={primary} secondary={secondary} count={6}/>;
    case 'lily':       return <StarPetals params={params} primary={primary} secondary={secondary} count={6} sharper/>;
    case 'orchid':     return <StarPetals params={params} primary={primary} secondary={secondary} count={5} wideOuter/>;

    // Spike (lavender)
    case 'lavender':   return <Spike params={params} primary={primary} secondary={secondary}/>;

    // Closed teardrop (tulip)
    case 'tulip':      return <Tulip params={params} primary={primary} secondary={secondary}/>;
  }
};

// Layered overlapping petals — rose/peony/dahlia/ranunculus.
const Layered: React.FC<{params: FlowerParams; primary: string; secondary: string; layers: number; tightness: number; pointy?: boolean}> = ({ params, primary, secondary, layers, tightness, pointy }) => {
  const base = params.petalCount;
  const rings = [];
  for (let L = layers - 1; L >= 0; L--) {
    const count = Math.max(5, base - L * 2);
    const r = 40 - L * (40 / layers) * tightness;
    const petalRx = pointy ? 6 : 10 - L * 1.5;
    const petalRy = r;
    rings.push(
      <g key={L} opacity={0.85 - L * 0.1}>
        {Array.from({ length: count }).map((_, i) => {
          const angle = (i * 360) / count + (L * 8);
          return (
            <ellipse key={i} cx="0" cy={-r * 0.65} rx={petalRx} ry={petalRy * 0.65}
              fill={primary} stroke={secondary} strokeWidth="0.8" strokeOpacity="0.55"
              transform={`rotate(${angle})`}/>
          );
        })}
      </g>
    );
  }
  return (
    <>
      {rings}
      <circle r="7" fill={GOLD} stroke={secondary} strokeWidth="0.8" opacity="0.9"/>
      {Array.from({length: 8}).map((_, i) => {
        const a = (i * 45) * Math.PI / 180;
        return <circle key={i} cx={Math.cos(a) * 4} cy={Math.sin(a) * 4} r="0.8" fill={secondary} opacity="0.85"/>;
      })}
    </>
  );
};

// Upright petals spreading upward — lotus/magnolia/protea.
const Upright: React.FC<{params: FlowerParams; primary: string; secondary: string; variant: 'lotus'|'magnolia'|'protea'}> = ({ primary, secondary, variant }) => {
  const angles = variant === 'protea' ? [-75,-45,-15,15,45,75] : [-60,-30,0,30,60];
  const d = variant === 'magnolia'
    ? "M 0 0 Q -16 -40, 0 -56 Q 16 -40, 0 0 Z"
    : variant === 'protea'
      ? "M 0 0 Q -10 -32, 0 -54 Q 10 -32, 0 0 Z"
      : "M 0 0 Q -14 -38, 0 -56 Q 14 -38, 0 0 Z";
  return (
    <>
      {angles.map((a, i) => (
        <path key={i} transform={`rotate(${a})`} d={d}
          fill={primary} stroke={secondary} strokeWidth="1.1" strokeOpacity="0.55"/>
      ))}
      {/* Inner smaller row */}
      {angles.map((a, i) => (
        <path key={`i${i}`} transform={`rotate(${a}) translate(0, 5)`}
          d="M 0 0 Q -10 -22, 0 -38 Q 10 -22, 0 0 Z"
          fill={primary} opacity="0.8" stroke={secondary} strokeWidth="0.8" strokeOpacity="0.45"/>
      ))}
      <ellipse cx="0" cy="2" rx="16" ry="4" fill={GOLD} stroke={secondary} strokeWidth="0.8" opacity="0.9"/>
    </>
  );
};

// Dense radial rays (sunflower / marigold).
const DenseRadial: React.FC<{params: FlowerParams; primary: string; secondary: string; rays: number; longRay: number}> = ({ primary, secondary, rays, longRay }) => (
  <>
    {Array.from({length: rays}).map((_, i) => {
      const a = (i * 360) / rays;
      const long = i % 2 === 0;
      const ry = long ? longRay : longRay * 0.8;
      return (
        <ellipse key={i} cx="0" cy={-ry * 0.62} rx="7" ry={ry}
          fill={primary} stroke={secondary} strokeWidth="0.8" strokeOpacity="0.55"
          transform={`rotate(${a})`} opacity={long ? 1 : 0.85}/>
      );
    })}
    <circle r="12" fill={secondary} stroke={GOLD} strokeWidth="1.2" opacity="0.95"/>
    <circle r="8" fill={primary} opacity="0.4"/>
  </>
);

// Round 5/6 petals (cherry blossom etc.).
const RoundFive: React.FC<{params: FlowerParams; primary: string; secondary: string; petalRy: number; count?: number; notched?: boolean; darkCenter?: boolean}> = ({ primary, secondary, petalRy, count = 5, notched, darkCenter }) => (
  <>
    {Array.from({length: count}).map((_, i) => {
      const a = (i * 360) / count - 90;
      return (
        <g key={i} transform={`rotate(${a})`}>
          <path d={notched
            ? `M 0 -10 Q -18 -${petalRy + 4}, -4 -${petalRy + 12} Q 0 -${petalRy + 14}, 4 -${petalRy + 12} Q 18 -${petalRy + 4}, 0 -10 Z`
            : `M 0 -6 Q -16 -${petalRy}, 0 -${petalRy + 10} Q 16 -${petalRy}, 0 -6 Z`}
            fill={primary} stroke={secondary} strokeWidth="1" strokeOpacity="0.5"/>
        </g>
      );
    })}
    <circle r="8" fill={darkCenter ? secondary : GOLD} stroke={secondary} strokeWidth="1" opacity="0.95"/>
    {!darkCenter && Array.from({length: 8}).map((_, i) => {
      const a = (i * 45) * Math.PI / 180;
      return <circle key={i} cx={Math.cos(a) * 5} cy={Math.sin(a) * 5} r="1.2" fill={secondary} opacity="0.8"/>;
    })}
  </>
);

// 5-6 pointed star petals (iris/lily/orchid).
const StarPetals: React.FC<{params: FlowerParams; primary: string; secondary: string; count: number; sharper?: boolean; wideOuter?: boolean}> = ({ primary, secondary, count, sharper, wideOuter }) => (
  <>
    {Array.from({length: count}).map((_, i) => {
      const a = (i * 360) / count - 90;
      const w = wideOuter ? 16 : 10;
      const h = sharper ? 54 : 46;
      return (
        <path key={i} transform={`rotate(${a})`}
          d={`M 0 0 Q -${w} -${h * 0.55}, 0 -${h} Q ${w} -${h * 0.55}, 0 0 Z`}
          fill={primary} stroke={secondary} strokeWidth="1.1" strokeOpacity="0.5"/>
      );
    })}
    <circle r="6" fill={GOLD} stroke={secondary} strokeWidth="0.8" opacity="0.95"/>
    {/* Radiating stamen threads */}
    {Array.from({length: 6}).map((_, i) => {
      const a = (i * 60) * Math.PI / 180;
      return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 10} y2={Math.sin(a) * 10} stroke={secondary} strokeWidth="0.6" opacity="0.7"/>;
    })}
  </>
);

// Lavender — vertical spike of small buds.
const Spike: React.FC<{params: FlowerParams; primary: string; secondary: string}> = ({ primary, secondary }) => (
  <>
    {Array.from({length: 7}).map((_, i) => {
      const y = -10 - i * 9;
      const x = (i % 2 === 0 ? 1 : -1) * (2 + (i % 3));
      return (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="-5" cy="0" rx="5" ry="7" fill={primary} opacity="0.9" stroke={secondary} strokeWidth="0.7" strokeOpacity="0.5"/>
          <ellipse cx="5"  cy="0" rx="5" ry="7" fill={primary} opacity="0.9" stroke={secondary} strokeWidth="0.7" strokeOpacity="0.5"/>
          <ellipse cx="0"  cy="-2" rx="4" ry="6" fill={primary} stroke={secondary} strokeWidth="0.6" strokeOpacity="0.5"/>
        </g>
      );
    })}
  </>
);

// Tulip — closed teardrop shape.
const Tulip: React.FC<{params: FlowerParams; primary: string; secondary: string}> = ({ primary, secondary }) => (
  <>
    <path d="M -24 10 Q -28 -38, 0 -40 Q 28 -38, 24 10 Q 16 16, 0 12 Q -16 16, -24 10 Z"
      fill={primary} stroke={secondary} strokeWidth="1.3" strokeOpacity="0.6"/>
    <path d="M -13 12 Q -17 -26, 0 -34 Q 17 -26, 13 12 Z"
      fill={secondary} opacity="0.3"/>
    <path d="M -6 12 Q -8 -20, 0 -28 Q 8 -20, 6 12 Z"
      fill={GOLD} opacity="0.45"/>
  </>
);

export default FlowerOfTheDay;
