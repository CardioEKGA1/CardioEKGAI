// © 2026 SoulMD, LLC. All rights reserved.
import React from 'react';

// Shown at the bottom of every page footer on soulmd.us and ekgscan.com,
// directly underneath the Privacy / Terms links. Keep muted and unboxed —
// this is regulatory/compliance text, not a marketing line.
const ComplianceDisclaimer: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div style={{
    fontSize: '11px',
    color: '#a0b0c8',
    lineHeight: 1.55,
    textAlign: 'center',
    maxWidth: '640px',
    margin: '8px auto 0 auto',
    padding: '0 16px',
    ...style,
  }}>
    For informational and educational purposes only. Not FDA cleared or approved. Not a substitute for professional clinical judgment. Do not input identifiable patient information (PHI).
  </div>
);

export default ComplianceDisclaimer;
