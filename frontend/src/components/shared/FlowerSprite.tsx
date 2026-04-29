// © 2026 SoulMD, LLC. All rights reserved.
//
// Single source of truth for cropping frontend/src/assets/flowers.png.
// The sprite is a 5-column × 2-row grid of 200×200 watercolor flowers.
// The bottom ~16% of every cell is a baked-in text label (flower name,
// e.g. "SUNFLOWER"). We almost always want to hide that strip — both
// the concierge oracle card and the /meditate oracle render it as art,
// not as a flashcard.
//
// Two render modes:
//   FlowerSprite — square illustration, fixed pixel size, label clipped
//                  by an overflow:hidden wrapper (cleanest for flexible
//                  layouts).
//   FlowerSpriteFill — fills the parent (any aspect ratio), label
//                      clipped via clip-path. Used for the concierge
//                      card-back where the sprite has to stretch into
//                      a non-square card area.
import React from 'react';
import flowersImg from '../../assets/flowers.png';

const COLS = 5;
const ROWS = 2;
// Bottom of each cell is the flower-name label. Hide it by default —
// callers that genuinely want the label can pass `showLabel`.
export const SPRITE_LABEL_RATIO = 0.16;
const ILLUSTRATION_RATIO = 1 - SPRITE_LABEL_RATIO; // 0.84

export interface FlowerCell { name: string; col: number; row: number; }

// Stable left→right, top→bottom order. Callers pick by index 0-9.
export const SPRITE_FLOWERS: FlowerCell[] = [
  { name: 'Rose',           col: 0, row: 0 },
  { name: 'Lotus',          col: 1, row: 0 },
  { name: 'Sunflower',      col: 2, row: 0 },
  { name: 'Cherry Blossom', col: 3, row: 0 },
  { name: 'Iris',           col: 4, row: 0 },
  { name: 'Peony',          col: 0, row: 1 },
  { name: 'Lily',           col: 1, row: 1 },
  { name: 'Dahlia',         col: 2, row: 1 },
  { name: 'Lavender',       col: 3, row: 1 },
  { name: 'Hibiscus',       col: 4, row: 1 },
];

const cellAt = (index: number): FlowerCell => {
  const safe = ((index % SPRITE_FLOWERS.length) + SPRITE_FLOWERS.length) % SPRITE_FLOWERS.length;
  return SPRITE_FLOWERS[safe];
};

// CSS sprite math: backgroundSize at COLS×100% / ROWS×100% means each
// cell occupies the full background container. Position uses the
// (col / (COLS-1)) × 100% trick so col 0 → 0%, col 4 → 100%.
const spriteBgFor = (cell: FlowerCell): React.CSSProperties => ({
  backgroundImage: `url(${flowersImg})`,
  backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
  backgroundPosition: `${cell.col * (100 / (COLS - 1))}% ${cell.row * 100}%`,
  backgroundRepeat: 'no-repeat',
});

interface FlowerSpriteProps {
  index: number;
  size?: number;                     // pixel width of one square cell
  borderRadius?: number | string;
  showLabel?: boolean;               // default false — label clipped
  style?: React.CSSProperties;
}

// Square illustration, fixed pixel size. Wrapper is `size × visibleH`
// with overflow hidden; inner sprite div renders the full square cell so
// the label sits below the wrapper's clip line.
export const FlowerSprite: React.FC<FlowerSpriteProps> = ({
  index, size = 200, borderRadius = 0, showLabel = false, style,
}) => {
  const cell = cellAt(index);
  const visibleH = showLabel ? size : Math.round(size * ILLUSTRATION_RATIO);
  return (
    <div
      aria-label={`${cell.name} watercolor`}
      style={{
        width: size, height: visibleH,
        overflow: 'hidden',
        borderRadius,
        position: 'relative',
        ...style,
      }}>
      <div style={{ width: size, height: size, ...spriteBgFor(cell) }}/>
    </div>
  );
};

interface FlowerSpriteFillProps {
  index: number;
  borderRadius?: number | string;
  showLabel?: boolean;
  style?: React.CSSProperties;
}

// Fills the parent container (used inside the concierge card-back where
// the sprite stretches into a tall rectangle). Label is hidden via
// clip-path so the math doesn't depend on container dimensions.
export const FlowerSpriteFill: React.FC<FlowerSpriteFillProps> = ({
  index, borderRadius = 0, showLabel = false, style,
}) => {
  const cell = cellAt(index);
  const clip = `inset(0 0 ${SPRITE_LABEL_RATIO * 100}% 0)`;
  return (
    <div style={{
      width: '100%', height: '100%',
      borderRadius,
      ...spriteBgFor(cell),
      clipPath: showLabel ? undefined : clip,
      WebkitClipPath: showLabel ? undefined : clip,
      ...style,
    }}/>
  );
};

export default FlowerSprite;
