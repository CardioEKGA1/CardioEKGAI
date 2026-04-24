// © 2026 SoulMD, LLC. All rights reserved.
// Custom SoulMD logo — imported as an ES module so webpack content-hashes it
// into /static/media/soulmd-logo.<hash>.png. That path sits under the SW's
// cache-first /static/ rule (safe because the hash changes when the image
// changes), so no stale-cache risk.
import React from 'react';
import logoImg from './assets/soulmd-logo.png';

interface Props {
  size?: number;
  style?: React.CSSProperties;
}

const SoulMDLogo: React.FC<Props> = ({ size = 40, style }) => (
  <img
    src={logoImg}
    alt="SoulMD"
    style={{
      height: size,
      width: 'auto',
      objectFit: 'contain',
      display: 'inline-block',
      flexShrink: 0,
      userSelect: 'none',
      // The PNG ships with a light background. `multiply` erases it on any
      // lighter-than-logo surface (pearl/lavender/white headers, card tiles),
      // so the logo reads as foreground only. No-op on pure white.
      mixBlendMode: 'multiply',
      ...style,
    }}
  />
);

export default SoulMDLogo;
