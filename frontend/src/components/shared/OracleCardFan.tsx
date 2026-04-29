// © 2026 SoulMD, LLC. All rights reserved.
//
// Pure-presentation oracle card stage. 7 cards in a fanned arc, the
// centermost gently breathing, gold ring + shine sweep on every card.
// Click any card → it isolates, scales up, slides to center, and flips
// 180° to reveal its front face. Other cards fade out behind it.
//
// Both the concierge OracleDailyCard and the /meditate OracleScreen
// render through this component so the choreography stays canonical
// across both apps. State (phase / picked / flipped / data fetch) is
// owned by the parent — this file is animation + layout only. Each
// parent supplies the back/front face content via render-prop callbacks.
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export type OraclePhase = 'deck' | 'picking' | 'revealed';

// Card geometry — matches the original concierge layout exactly so a
// refactor doesn't shift pixels.
export const CARD_W_SIDE   = 200;
export const CARD_H_SIDE   = 310;
export const CARD_W_CENTER = 220;
export const CARD_H_CENTER = 340;
export const STAGE_H       = 440;

// Spring-ish ease used everywhere in the choreography. Re-exported so
// callers can match motion timings on chrome around the stage.
export const EASE = [0.22, 1, 0.36, 1] as const;

interface FanPos { x: number; rot: number; scale: number; isCenter: boolean; }

// 7-card arc. Far-left/right intentionally clip off-screen on narrow
// mobile viewports — gives the "endless deck" feel from the spec.
export const FAN: FanPos[] = [
  { x: -195, rot: -20, scale: 0.75, isCenter: false },
  { x: -105, rot: -12, scale: 0.85, isCenter: false },
  { x:  -48, rot:  -6, scale: 0.95, isCenter: false },
  { x:    0, rot:   0, scale: 1.00, isCenter: true  },
  { x:   48, rot:   6, scale: 0.95, isCenter: false },
  { x:  105, rot:  12, scale: 0.85, isCenter: false },
  { x:  195, rot:  20, scale: 0.75, isCenter: false },
];
export const CENTER_INDEX = 3;

// Inject the keyframe pack once. Kept module-local so importing the
// component is enough to wire everything up.
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('shared-oracle-fan-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'shared-oracle-fan-keyframes';
  s.innerHTML = `
    @keyframes oracleFanCenterBreathe {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes oracleFanGoldRing {
      0%, 100% { box-shadow: 0 0 12px rgba(201,168,76,0.25), 0 0 28px rgba(230,201,122,0.15), inset 0 0 14px rgba(255,228,163,0.12); }
      50%      { box-shadow: 0 0 20px rgba(201,168,76,0.55), 0 0 44px rgba(230,201,122,0.28), inset 0 0 22px rgba(255,228,163,0.25); }
    }
    @keyframes oracleFanShine {
      0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
      35%  { opacity: 0.28; }
      65%  { opacity: 0.28; }
      100% { transform: translateX(120%)  skewX(-18deg); opacity: 0; }
    }
    @keyframes oracleFanParticleDrift {
      0%   { transform: translate3d(0, 0, 0); opacity: 0; }
      15%  { opacity: 0.85; }
      85%  { opacity: 0.5; }
      100% { transform: translate3d(calc(var(--drift, 16px)), -110vh, 0); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}

export interface OracleCardFaceProps {
  index: number;        // which fan slot (0-6)
  isPicked: boolean;    // is this the picked card?
  isCenter: boolean;    // is this the center slot in the fan?
  show: boolean;        // for the front face: true once the flip lands
}

export interface OracleCardFanProps {
  phase: OraclePhase;
  pickedIndex: number | null;
  flipped: boolean;
  locked: boolean;
  onPick: (i: number) => void;
  // Each card gets its own back + front. The parent decides whether to
  // render different content per slot or the same on all (most common).
  renderBack:  (face: OracleCardFaceProps) => React.ReactNode;
  renderFront: (face: OracleCardFaceProps) => React.ReactNode;
  // Override the per-card overlay shine animation (defaults true).
  withShine?: boolean;
}

export const OracleCardFan: React.FC<OracleCardFanProps> = ({
  phase, pickedIndex, flipped, locked, onPick, renderBack, renderFront, withShine = true,
}) => {
  useEffect(ensureKeyframes, []);
  return (
    <div style={{
      position:'relative', width:'100%', height:`${STAGE_H}px`,
      display:'flex', alignItems:'center', justifyContent:'center',
      perspective:'1400px', zIndex: 2,
    }}>
      {FAN.map((pos, i) => (
        <FanCard key={i}
          index={i} pos={pos}
          phase={phase} pickedIndex={pickedIndex} flipped={flipped} locked={locked}
          onPick={onPick}
          renderBack={renderBack}
          renderFront={renderFront}
          withShine={withShine}
        />
      ))}
    </div>
  );
};

interface FanCardProps {
  index: number;
  pos: FanPos;
  phase: OraclePhase;
  pickedIndex: number | null;
  flipped: boolean;
  locked: boolean;
  onPick: (i: number) => void;
  renderBack:  (face: OracleCardFaceProps) => React.ReactNode;
  renderFront: (face: OracleCardFaceProps) => React.ReactNode;
  withShine: boolean;
}

const FanCard: React.FC<FanCardProps> = ({
  index, pos, phase, pickedIndex, flipped, locked, onPick, renderBack, renderFront, withShine,
}) => {
  const isPicked = pickedIndex === index;
  const isOther  = pickedIndex !== null && !isPicked;
  const isCenter = pos.isCenter;
  const baseW = isCenter ? CARD_W_CENTER : CARD_W_SIDE;
  const baseH = isCenter ? CARD_H_CENTER : CARD_H_SIDE;

  let x = pos.x, y = 0, rotate = pos.rot, scale = pos.scale, opacity = 1;
  if (phase === 'deck') {
    opacity = locked ? 0.6 : 1;
  } else if (phase === 'picking' || phase === 'revealed') {
    if (isPicked) {
      x = 0; y = -25; rotate = 0; scale = 1.15; opacity = 1;
    } else if (isOther) {
      opacity = 0.18;
    }
  }

  const showFront = phase === 'revealed' && isPicked;
  const faceProps: OracleCardFaceProps = { index, isPicked, isCenter, show: showFront };

  return (
    <motion.div
      initial={false}
      animate={{ x, y, rotate, scale, opacity }}
      transition={{ duration: 1.0, ease: EASE }}
      whileHover={phase === 'deck' && !locked ? { y: -8, scale: pos.scale * 1.04, transition: { duration: 0.25, ease: EASE } } : undefined}
      onClick={() => onPick(index)}
      style={{
        position:'absolute',
        width:`${baseW}px`, height:`${baseH}px`,
        cursor: phase === 'deck' && !locked ? 'pointer' : 'default',
        transformStyle:'preserve-3d',
        zIndex: isPicked ? 20 : (10 - Math.abs(index - CENTER_INDEX)),
      }}>
      <div style={{
        position:'absolute', inset:'-4px',
        borderRadius:'14px',
        pointerEvents:'none',
        animation: phase === 'deck' && !locked ? 'oracleFanGoldRing 3.4s ease-in-out infinite' : undefined,
        animationDelay: `${-index * 0.4}s`,
      }}/>
      <div style={{
        width:'100%', height:'100%',
        animation: phase === 'deck' && isCenter && !locked ? 'oracleFanCenterBreathe 4.5s ease-in-out infinite' : undefined,
      }}>
        <motion.div
          initial={false}
          animate={{ rotateY: flipped && isPicked ? 180 : 0 }}
          transition={{ duration: 1.0, ease: EASE }}
          style={{ width:'100%', height:'100%', position:'relative', transformStyle:'preserve-3d' }}>
          {/* BACK face — visible pre-flip */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            borderRadius:'12px', overflow:'hidden',
          }}>
            {renderBack(faceProps)}
            {withShine && (
              <div style={{
                position:'absolute', top:0, bottom:0, left:0, width:'50%',
                background:'linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)',
                animation:'oracleFanShine 5s ease-in-out infinite',
                mixBlendMode:'screen', pointerEvents:'none',
              }}/>
            )}
          </div>
          {/* FRONT face — visible post-flip */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            transform:'rotateY(180deg)',
            borderRadius:'12px', overflow:'hidden',
          }}>
            {renderFront(faceProps)}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Floating gold particles overlay — used as ambient sparkle behind the
// stage. Kept here so both apps can opt in; doesn't auto-render.
export const OracleGoldParticles: React.FC<{count?: number}> = ({ count = 28 }) => (
  <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:1 }}>
    {Array.from({ length: count }).map((_, i) => {
      const size = 2 + ((i * 13) % 4);
      const dur = 14 + (i % 12);
      const delay = -(i * 0.7);
      const drift = ((i % 5) - 2) * 12;
      return (
        <div key={i} style={{
          position:'absolute',
          left: `${(i * 41) % 100}%`,
          bottom: `-${10 + (i % 20)}px`,
          width: `${size}px`, height: `${size}px`, borderRadius:'50%',
          background: `radial-gradient(circle, #FFE4A3 0%, rgba(245,207,138,0) 70%)`,
          boxShadow: `0 0 ${size * 3}px #E6C97A`,
          opacity: 0.45 + ((i * 17) % 50) / 100,
          // @ts-expect-error CSS custom property
          '--drift': `${drift}px`,
          animation: `oracleFanParticleDrift ${dur}s linear ${delay}s infinite`,
        }}/>
      );
    })}
  </div>
);

export default OracleCardFan;
