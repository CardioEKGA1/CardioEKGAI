// © 2026 SoulMD, LLC. All rights reserved.
//
// Shared sub-nav bar shown at the top of SuiteDashboard, MeditationsLibrary,
// ConciergeAccess, and MarketingAgent — visible only to superusers so the
// admin/discovery surfaces switch with one tap regardless of which one is
// active. Renders nothing when `show` is false so the regular (non-
// superuser) dashboard is untouched.
import React from 'react';

interface Props {
  active: 'dashboard' | 'meditations' | 'concierge' | 'marketing';
  onDashboard: () => void;
  onMeditations: () => void;
  onConcierge: () => void;
  onMarketing?: () => void;  // optional so existing callers don't break
  show?: boolean;
}

const PURPLE     = '#534AB7';
const PURPLE_BG  = '#EEEBFA';
const INK_SOFT   = '#6B6889';
const BORDER     = 'rgba(83,74,183,0.14)';
const GOLD       = '#C9A84C';
const GOLD_BG    = 'rgba(201,168,76,0.14)';

const SuperuserTabNav: React.FC<Props> = ({ active, onDashboard, onMeditations, onConcierge, onMarketing, show = true }) => {
  if (!show) return null;
  return (
    <nav style={{
      display:'flex', gap:'4px', padding:'10px clamp(14px,3vw,28px)',
      background:'rgba(255,255,255,0.5)', borderBottom:`0.5px solid ${BORDER}`,
      overflowX:'auto',
    }}>
      <Tab label="Tools"       isActive={active === 'dashboard'}   onClick={onDashboard}/>
      <Tab label="Meditations" isActive={active === 'meditations'} onClick={onMeditations}/>
      <Tab label="Concierge"   isActive={active === 'concierge'}   onClick={onConcierge}/>
      {onMarketing && (
        <Tab label="Marketing" isActive={active === 'marketing'} onClick={onMarketing} accent="gold"/>
      )}
      <span style={{marginLeft:'auto', alignSelf:'center', fontSize:'10px', color: INK_SOFT, letterSpacing:'1.2px', textTransform:'uppercase', fontWeight:700, whiteSpace:'nowrap', paddingLeft:'10px'}}>Superuser</span>
    </nav>
  );
};

const Tab: React.FC<{label: string; isActive: boolean; onClick: () => void; accent?: 'purple' | 'gold'}> = ({ label, isActive, onClick, accent = 'purple' }) => {
  const isGold = accent === 'gold';
  const activeBg   = isGold ? GOLD_BG : PURPLE_BG;
  const activeColor= isGold ? GOLD    : PURPLE;
  return (
    <button onClick={onClick}
      style={{
        background: isActive ? activeBg : 'transparent',
        color: isActive ? activeColor : INK_SOFT,
        border: 'none',
        borderRadius: '10px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: isActive ? 700 : 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
      {label}
    </button>
  );
};

export default SuperuserTabNav;
