// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';
import logoImg from './assets/soulmd-logo-clean.svg';

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
      ...style,
    }}
  />
);

export default SoulMDLogo;
