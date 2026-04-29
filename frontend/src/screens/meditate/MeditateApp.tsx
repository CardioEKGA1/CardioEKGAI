// © 2026 SoulMD, LLC. All rights reserved.
//
// /meditate — standalone Yogananda oracle + meditation library + diary.
// Separate from the concierge PWA: own bottom-tab shell, own backend
// surface (/meditate/*). Superuser-gated upstream in App.tsx.
//
// Layout: lavender-pearl gradient, gold serif wordmark, Cho Ku Rei
// watermark fixed bottom-right at low opacity, beta banner top, bottom
// tab nav. Each tab is a child screen rendered inline.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ChoKuRei from '../concierge/ChoKuRei';
import OracleScreen from './OracleScreen';
import LibraryScreen from './LibraryScreen';
import MeditationPlayer from './MeditationPlayer';
import DiaryScreen from './DiaryScreen';
import DiaryEntryForm from './DiaryEntryForm';

interface Props { API: string; token: string; onBack: () => void; }

export type MeditateTab = 'oracle' | 'library' | 'diary' | 'account';

export const MEDITATE_TOKENS = {
  bg:       'linear-gradient(160deg, #F5F1FF 0%, #E8E4FB 35%, #DFEAFC 70%, #F1E7F8 100%)',
  blue:     '#C5E8F4',
  pink:     '#f0c8d8',
  pearl:    '#E0F4FA',
  gold:     '#C9A84C',
  goldSoft: 'rgba(201,168,76,0.16)',
  navy:     '#1a2a4a',
  navySoft: '#3a4a6a',
  purple:   '#534AB7',
  ink:      '#2a3a5a',
  inkSoft:  '#6B6889',
  border:   'rgba(83,74,183,0.12)',
  serif:    'Georgia, "Cormorant Garamond", "Playfair Display", "Times New Roman", serif',
  cardBg:   'rgba(255,255,255,0.78)',
  cardBorder: '0.5px solid rgba(180,210,230,0.55)',
};

const T = MEDITATE_TOKENS;

const MeditateApp: React.FC<Props> = ({ API, token, onBack }) => {
  const [tab, setTab] = useState<MeditateTab>('oracle');
  const [openMeditationId, setOpenMeditationId] = useState<number | null>(null);
  // After completing a meditation we slide the diary entry form on top of
  // whatever tab is showing, prefilled with the meditation's id+title so
  // the entry attaches to the session.
  const [diaryFormFor, setDiaryFormFor] = useState<{ medId: number | null; title: string } | null>(null);

  const goLibrary = useCallback(() => setTab('library'), []);
  const goOracle  = useCallback(() => setTab('oracle'), []);

  return (
    <div style={{
      position:'relative', minHeight:'100vh',
      background: T.bg, color: T.ink,
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      paddingBottom:'calc(82px + env(safe-area-inset-bottom, 0px))',
      overflowX:'hidden',
    }}>
      {/* Cho Ku Rei watermark — fixed bottom-right, faint. */}
      <div aria-hidden style={{position:'fixed', right:'-30px', bottom:'80px', zIndex:0, pointerEvents:'none', opacity:0.10}}>
        <ChoKuRei size={220} color={T.gold} opacity={1}/>
      </div>

      <div style={{position:'relative', zIndex:1, maxWidth:'620px', margin:'0 auto', padding:'env(safe-area-inset-top, 16px) 16px 8px 16px'}}>
        {/* Wordmark */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px'}}>
          <button onClick={onBack}
            style={{background:'rgba(255,255,255,0.7)', border:`0.5px solid ${T.border}`, borderRadius:'10px', padding:'6px 10px', fontSize:'11px', fontWeight:700, color: T.purple, cursor:'pointer', fontFamily:'inherit'}}>
            ←
          </button>
          <div style={{textAlign:'center', flex:1, minWidth:0}}>
            <div style={{fontFamily: T.serif, fontSize:'20px', fontWeight:700, color: T.navy, letterSpacing:'-0.3px', lineHeight:1.1}}>
              SoulMD <span style={{color: T.gold}}>Meditate</span>
            </div>
            <div style={{fontSize:'9px', color: T.inkSoft, opacity:0.75, letterSpacing:'2px', textTransform:'uppercase', marginTop:'2px'}}>
              Where the soul remembers
            </div>
          </div>
          <div style={{width:'34px'}}/>
        </div>

        {/* Beta disclaimer */}
        <div style={{background:'rgba(232,168,64,0.10)', border:'1px solid rgba(232,168,64,0.32)', borderRadius:'10px', padding:'7px 10px', display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'12px'}}>
          <span style={{fontSize:'12px', flexShrink:0, lineHeight:1.4}}>⚠️</span>
          <div style={{fontSize:'10px', color:'#8a5a10', lineHeight:1.5, flex:1}}>
            <strong style={{color:'#6e4208'}}>This app is in beta and not HIPAA compliant.</strong> Avoid sharing identifying patient information here.
          </div>
        </div>

        {/* Tab body */}
        <div style={{marginTop:'8px'}}>
          {tab === 'oracle' && (
            <OracleScreen API={API} token={token} onBeginMeditation={goLibrary}/>
          )}
          {tab === 'library' && (
            <LibraryScreen API={API} token={token} onOpenMeditation={(id) => setOpenMeditationId(id)}/>
          )}
          {tab === 'diary' && (
            <DiaryScreen
              API={API} token={token}
              onAddEntry={() => setDiaryFormFor({ medId: null, title: '' })}
            />
          )}
          {tab === 'account' && (
            <AccountTab onBack={onBack}/>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:5,
        background:'rgba(255,255,255,0.93)',
        backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
        borderTop:`0.5px solid ${T.border}`,
        paddingBottom:'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{display:'flex', maxWidth:'620px', margin:'0 auto', width:'100%'}}>
          <TabButton active={tab === 'oracle'}  label="Oracle"   icon="🌸" onClick={() => setTab('oracle')}/>
          <TabButton active={tab === 'library'} label="Meditate" icon="🧘" onClick={() => setTab('library')}/>
          <TabButton active={tab === 'diary'}   label="Diary"    icon="📓" onClick={() => setTab('diary')}/>
          <TabButton active={tab === 'account'} label="Account"  icon="👤" onClick={() => setTab('account')}/>
        </div>
      </nav>

      {/* Player overlay — fullscreen reader + timer for the chosen script. */}
      {openMeditationId && (
        <MeditationPlayer
          API={API} token={token}
          medId={openMeditationId}
          onClose={() => setOpenMeditationId(null)}
          onComplete={(id, title) => {
            setOpenMeditationId(null);
            setDiaryFormFor({ medId: id, title });
          }}
        />
      )}

      {/* Diary entry overlay — same component for both "after meditation"
          and standalone tap-from-Diary. */}
      {diaryFormFor && (
        <DiaryEntryForm
          API={API} token={token}
          meditationId={diaryFormFor.medId}
          meditationTitle={diaryFormFor.title}
          onClose={() => setDiaryFormFor(null)}
          onSaved={() => {
            setDiaryFormFor(null);
            setTab('diary');
          }}
          onPullOracle={() => {
            setDiaryFormFor(null);
            setTab('oracle');
          }}
          onReturnLibrary={() => {
            setDiaryFormFor(null);
            setTab('library');
          }}
        />
      )}
    </div>
  );
};

const TabButton: React.FC<{active: boolean; label: string; icon: string; onClick: () => void}> = ({ active, label, icon, onClick }) => (
  <button onClick={onClick}
    style={{
      flex:1, border:'none', background:'transparent', cursor:'pointer',
      padding:'10px 4px 12px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
      color: active ? T.purple : T.inkSoft,
      fontFamily:'inherit',
    }}>
    <span style={{fontSize:'19px', opacity: active ? 1 : 0.65, transform: active ? 'scale(1.08)' : 'none', transition:'transform 180ms ease'}}>{icon}</span>
    <span style={{fontSize:'10px', fontWeight: active ? 800 : 600, letterSpacing:'0.3px'}}>{label}</span>
    {active && <span style={{width:'14px', height:'2px', borderRadius:'2px', background: T.gold, marginTop:'1px'}}/>}
  </button>
);

const AccountTab: React.FC<{onBack: () => void}> = ({ onBack }) => (
  <div style={{
    background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
    padding:'20px', marginTop:'10px',
    boxShadow:'0 6px 18px rgba(83,74,183,0.08)',
  }}>
    <div style={{fontSize:'10px', letterSpacing:'1.8px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800, marginBottom:'10px'}}>
      Account
    </div>
    <div style={{fontFamily: T.serif, fontSize:'18px', color: T.navy, marginBottom:'8px'}}>
      You are signed in to SoulMD Meditate
    </div>
    <div style={{fontSize:'13px', color: T.inkSoft, lineHeight:1.7}}>
      Your daily Oracle pull, meditation sessions, and diary entries are private to your account.
    </div>
    <button onClick={onBack}
      style={{
        marginTop:'14px', padding:'10px 16px', borderRadius:'12px',
        background:`linear-gradient(135deg, ${T.purple}, ${T.navy})`,
        color:'white', border:'none', fontSize:'13px', fontWeight:800,
        cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px',
      }}>
      Back to SoulMD
    </button>
  </div>
);

// Re-export so child screens can pull tokens without circular imports.
// Suppress the unused-import warning for useMemo/useEffect/useCallback by
// using them in this no-op assertion.
void useMemo; void useEffect; void useCallback;

export default MeditateApp;
