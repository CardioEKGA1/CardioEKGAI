// © 2026 SoulMD, LLC. All rights reserved.
// SoulMD Concierge — patient-facing PWA.
// Phase 1a: Home + Book + Messages (stub) + Lab Vault (stub) + Account.
// Daily Oracle Card pulls on first open of the day.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ChoKuRei from './ChoKuRei';
import { ensureOracleKeyframes } from './OracleCard';
import EnergyLog from './EnergyLog';
import MeditationPlayer from './MeditationPlayer';
import CoachingModuleReader from './CoachingModuleReader';
import OracleDailyCard from './OracleDailyCard';

interface Props { API: string; token: string; onBack: () => void; isSuperuser?: boolean; }

interface PatientPayload {
  id: number;
  name: string;
  tier: 'awaken' | 'align' | 'ascend';
  tier_label: string;
  subscription_status: string;
  current_period_end: string | null;
  visits_used: number;
  visits_allowed: number;
  meditations_used: number;
  meditations_allowed: number;
}

type Tab = 'home' | 'book' | 'messages' | 'labs' | 'account';

// Soft-circle avatar icon for Account — rendered as SVG rather than emoji so
// it reads as an avatar chip regardless of platform emoji set.
const AvatarIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill={active ? 'rgba(42,191,191,0.18)' : 'rgba(107,78,124,0.12)'} stroke={active ? '#2ABFBF' : 'rgba(107,78,124,0.55)'} strokeWidth="1.4"/>
    <circle cx="12" cy="10" r="3.3" fill={active ? '#2ABFBF' : 'rgba(107,78,124,0.6)'}/>
    <path d="M5.5 19c1.5-3 4-4.2 6.5-4.2s5 1.2 6.5 4.2" fill="none" stroke={active ? '#2ABFBF' : 'rgba(107,78,124,0.6)'} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

type TabDef = { id: Tab; label: string; icon: React.ReactNode };
const TABS: TabDef[] = [
  { id: 'home',     label: 'Home',     icon: <span style={{fontSize:'19px'}}>✨</span> },
  { id: 'book',     label: 'Book',     icon: <span style={{fontSize:'19px'}}>📅</span> },
  { id: 'messages', label: 'Messages', icon: <span style={{fontSize:'19px'}}>💬</span> },
  { id: 'labs',     label: 'Labs',     icon: <span style={{fontSize:'19px'}}>🧪</span> },
  { id: 'account',  label: 'Account',  icon: null /* rendered per-button so active state flows in */ },
];

// Opal palette.
const BG_GRADIENT = 'linear-gradient(135deg, #E0F4FA 0%, #F6BFD3 100%)';
const TEAL    = '#2ABFBF';
const BLUSH   = '#F6BFD3';
const ROSE    = '#E890B0';
const DEEPP   = '#6b4e7c';
const PRIMARY = '#C5E8F4';
const CARD_BG = 'rgba(255,255,255,0.72)';
const CARD_BORDER = '1px solid rgba(255,255,255,0.9)';
const CARD_SHADOW = '0 8px 28px rgba(107,78,124,0.12)';

const ORACLE_SEEN_KEY = (patientId: number, date: string) => `concierge_oracle_seen_${patientId}_${date}`;
const todayKey = () => new Date().toISOString().slice(0,10);

interface OracleTodaySlim { pulled: boolean; card: { id:number; title:string; category_label?:string; reflection?:string; saved?:boolean } | null; }
interface PatientMeditation { id:number; title:string; category:string; duration_min:number; description:string; assigned_at:string|null; }
interface PatientCoachingModule { id:number; title:string; description:string; progress_pct:number; completed_at:string|null; exercise_count:number; assigned_at:string|null; }

const PatientApp: React.FC<Props> = ({ API, token, onBack, isSuperuser }) => {
  const [tab, setTab] = useState<Tab>('home');
  const [patient, setPatient] = useState<PatientPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [todaysCard, setTodaysCard] = useState<OracleTodaySlim | null>(null);
  const [showEnergyLog, setShowEnergyLog] = useState(false);
  const [myMeditations, setMyMeditations] = useState<PatientMeditation[]>([]);
  const [myModules, setMyModules] = useState<PatientCoachingModule[]>([]);
  const [openMeditationId, setOpenMeditationId] = useState<number | null>(null);
  const [openModuleId, setOpenModuleId] = useState<number | null>(null);

  const loadToday = useCallback(() => {
    fetch(`${API}/concierge/oracle/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTodaysCard({ pulled: !!d.pulled, card: d.card || null }); })
      .catch(() => {});
  }, [API, token]);
  useEffect(() => { loadToday(); }, [loadToday]);

  const loadAssigned = useCallback(() => {
    fetch(`${API}/concierge/me/meditations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { meditations: [] })
      .then(d => setMyMeditations(d.meditations || []))
      .catch(() => {});
    fetch(`${API}/concierge/me/coaching/modules`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { modules: [] })
      .then(d => setMyModules(d.modules || []))
      .catch(() => {});
  }, [API, token]);
  useEffect(() => { loadAssigned(); }, [loadAssigned]);

  // Inject oracle animation keyframes upfront so the Home-tab CTA glow
  // works even before the oracle overlay is opened.
  useEffect(() => { ensureOracleKeyframes(); }, []);

  // Fetch role + patient info on mount. Role gating already happened upstream
  // in Concierge.tsx, so we can assume role='patient' when we land here.
  useEffect(() => {
    fetch(`${API}/concierge/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.patient) setPatient(d.patient); })
      .finally(() => setLoading(false));
  }, [API, token]);

  // The oracle lives inline on the Home tab now (OracleDailyCard flips in
  // place). No overlay auto-open, no overlay trigger anywhere. The overlay
  // plumbing below is kept disabled so we can flip it back on for a future
  // ritual-mode experience without another refactor.

  if (loading) return <LoadingShell/>;

  return (
    <div style={{position:'relative', minHeight:'100vh', background: BG_GRADIENT, fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif', paddingBottom:'calc(76px + env(safe-area-inset-bottom, 0px))'}}>
      {/* Cho Ku Rei watermark — subtle, behind everything. */}
      <Watermark/>

      <div style={{position:'relative', zIndex:1, maxWidth:'560px', margin:'0 auto', padding:'env(safe-area-inset-top, 16px) 16px 20px 16px'}}>
        {/* Top mini-header */}
        <TopHeader patient={patient} onBack={onBack}/>

        {/* Beta disclaimer — every screen. */}
        <BetaDisclaimer/>

        {/* Tab body */}
        <div style={{marginTop:'14px'}}>
          {tab === 'home'     && <HomeTab API={API} token={token} patient={patient} todaysCard={todaysCard} onTodaysCardChanged={loadToday} meditations={myMeditations} modules={myModules} isSuperuser={!!isSuperuser} onOpenEnergyLog={() => setShowEnergyLog(true)} onOpenMeditation={(id) => setOpenMeditationId(id)} onOpenModule={(id) => setOpenModuleId(id)} onGo={setTab}/>}
          {tab === 'book'     && <BookTab API={API} token={token} patient={patient}/>}
          {tab === 'messages' && <MessagesTab API={API} token={token} onOpenMeditation={(id) => setOpenMeditationId(id)}/>}
          {tab === 'labs'     && <LabsTab API={API} token={token}/>}
          {tab === 'account'  && <AccountTab API={API} token={token} patient={patient} onSignOut={onBack} onOpenEnergyLog={() => setShowEnergyLog(true)}/>}
        </div>
      </div>

      {/* Bottom tab bar — fixed, safe-area aware.
          Uses `width:0 + flexBasis:20%` on each button so any overflow shows
          up as shrunk width rather than a hidden 5th tab. Labels are
          clamped with ellipsis so an accidental long label can never push
          the next tab off-screen. */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:5,
        background:'rgba(255,255,255,0.92)',
        backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
        borderTop:'1px solid rgba(107,78,124,0.12)',
        paddingBottom:'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{display:'flex', maxWidth:'560px', margin:'0 auto', width:'100%'}}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  width:0, flex:'1 1 0',  // equal share regardless of content width
                  border:'none', background:'transparent', cursor:'pointer',
                  padding:'8px 2px 10px 2px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
                  color: active ? DEEPP : 'rgba(107,78,124,0.55)',
                  fontFamily:'inherit', minWidth:0,
                }}>
                <span style={{display:'flex', alignItems:'center', justifyContent:'center', height:'22px', opacity: active ? 1 : 0.75, transform: active ? 'scale(1.08)' : 'none', transition:'transform 180ms ease'}}>
                  {t.id === 'account' ? <AvatarIcon active={active}/> : t.icon}
                </span>
                <span style={{fontSize:'9.5px', fontWeight: active ? 800 : 600, letterSpacing:'0.2px', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.label}</span>
                {active && <span style={{width:'16px', height:'2px', borderRadius:'2px', background:TEAL, marginTop:'1px'}}/>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Energy Log overlay — timeline of saved pulls */}
      {showEnergyLog && (
        <EnergyLog API={API} token={token} onClose={() => setShowEnergyLog(false)}/>
      )}

      {/* Prescribed content readers */}
      {openMeditationId && (
        <MeditationPlayer API={API} token={token} medId={openMeditationId} onClose={() => { setOpenMeditationId(null); loadAssigned(); }}/>
      )}
      {openModuleId && (
        <CoachingModuleReader API={API} token={token} moduleId={openModuleId} onClose={() => { setOpenModuleId(null); loadAssigned(); }}/>
      )}
    </div>
  );
};

const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || '';

// ───── Shared UI bits ───────────────────────────────────────────────────────

const Watermark: React.FC = () => (
  <div aria-hidden="true" style={{position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden'}}>
    <div style={{position:'absolute', top:'6%', left:'-40px'}}><ChoKuRei size={220} color={DEEPP} opacity={0.05}/></div>
    <div style={{position:'absolute', top:'38%', right:'-30px'}}><ChoKuRei size={170} color={TEAL} opacity={0.04}/></div>
    <div style={{position:'absolute', bottom:'14%', left:'8%'}}><ChoKuRei size={180} color={ROSE} opacity={0.04}/></div>
  </div>
);

const TopHeader: React.FC<{patient: PatientPayload | null; onBack: () => void}> = ({ patient, onBack }) => (
  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px'}}>
    <button onClick={onBack} style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(107,78,124,0.15)', borderRadius:'10px', padding:'6px 10px', fontSize:'11px', fontWeight:600, color:DEEPP, cursor:'pointer'}}>←</button>
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:'13px', fontWeight:800, color:DEEPP, letterSpacing:'0.3px'}}>SoulMD Concierge</div>
      <div style={{fontSize:'9px', color:DEEPP, opacity:0.65, letterSpacing:'2px', textTransform:'uppercase', marginTop:'1px'}}>Where science meets the soul</div>
    </div>
    <div style={{width:'32px'}}/>
  </div>
);

const BETA_DISMISS_KEY = 'concierge_beta_banner_dismissed_v1';
const BetaDisclaimer: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    try { return localStorage.getItem(BETA_DISMISS_KEY) !== '1'; } catch { return true; }
  });
  if (!visible) return null;
  const dismiss = () => {
    try { localStorage.setItem(BETA_DISMISS_KEY, '1'); } catch {}
    setVisible(false);
  };
  return (
    <div style={{background:'rgba(255,255,255,0.65)', border:'1px solid rgba(232,168,64,0.4)', borderRadius:'12px', padding:'8px 10px 8px 12px', display:'flex', alignItems:'flex-start', gap:'8px'}}>
      <span style={{fontSize:'14px', flexShrink:0, lineHeight:1.4}}>⚠️</span>
      <div style={{fontSize:'10px', color:'#8a5a10', lineHeight:1.5, flex:1}}>
        <strong style={{color:'#6e4208'}}>Direct-pay · Not insurance · Not HIPAA compliant yet (beta).</strong> Do not enter identifying patient information. Emergencies — call 911.
      </div>
      <button onClick={dismiss} aria-label="Dismiss beta notice"
        style={{background:'transparent', border:'none', color:'#8a5a10', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'0 2px', marginLeft:'4px', flexShrink:0, fontFamily:'inherit'}}>×</button>
    </div>
  );
};

// ───── HOME TAB ─────────────────────────────────────────────────────────────

const HomeTab: React.FC<{
  API: string;
  token: string;
  patient: PatientPayload | null;
  todaysCard: OracleTodaySlim | null;
  onTodaysCardChanged: () => void;
  meditations: PatientMeditation[];
  modules: PatientCoachingModule[];
  isSuperuser: boolean;
  onOpenEnergyLog: () => void;
  onOpenMeditation: (id: number) => void;
  onOpenModule: (id: number) => void;
  onGo: (t: Tab) => void;
}> = ({ API, token, patient, todaysCard, onTodaysCardChanged, meditations, modules, isSuperuser, onOpenEnergyLog, onOpenMeditation, onOpenModule, onGo }) => {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const pulled = todaysCard?.pulled && todaysCard.card;
  return (
    <div>
      <div style={{padding:'24px 4px 8px 4px'}}>
        <div style={{fontSize:'26px', fontWeight:800, color:DEEPP, letterSpacing:'-0.3px', lineHeight:1.2}}>
          {greet}, {firstName(patient?.name || '')} <span style={{fontWeight:400}}>✨</span>
        </div>
        <div style={{fontSize:'13px', color:DEEPP, opacity:0.7, marginTop:'6px', lineHeight:1.6, fontStyle:'italic', fontFamily:'"Cormorant Garamond",Georgia,serif'}}>
          {pulled
            ? 'Your message is waiting for you to sit with it.'
            : 'Your message from the Universe is waiting.'}
        </div>
      </div>

      {/* TODAY'S MESSAGE — standalone tap-to-flip oracle card */}
      <OracleDailyCard
        API={API}
        token={token}
        todaysCard={todaysCard}
        isSuperuser={isSuperuser}
        onChanged={onTodaysCardChanged}
        onOpenEnergyLog={onOpenEnergyLog}
      />

      {/* Next session — placeholder until appointments API wired */}
      <Card>
        <Label>Your next session</Label>
        <div style={{marginTop:'6px', fontSize:'13px', color:DEEPP, opacity:0.8, lineHeight:1.5}}>
          No sessions booked yet. Tap <b>Book</b> to schedule your next medical visit or guided meditation.
        </div>
        <button onClick={() => onGo('book')} style={smallCtaStyle}>Open calendar →</button>
      </Card>

      {/* Visit tracker */}
      {patient && <VisitTracker patient={patient}/>}

      {/* Quick actions */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'4px'}}>
        <QuickTile icon="📅"   label="Book Session"  onClick={() => onGo('book')}      tint={PRIMARY}/>
        <QuickTile icon="🧪"   label="Upload Labs"   onClick={() => onGo('labs')}      tint={BLUSH}/>
        <QuickTile icon="💬"   label="Messages"      onClick={() => onGo('messages')}  tint="#D4C5F5"/>
        <QuickTile icon="🌙"   label="Energy Log"    onClick={onOpenEnergyLog}         tint="#FAD9A8"/>
      </div>

      {/* Daily recommendation */}
      <Card style={{marginTop:'14px'}}>
        <Label>Today's integrative tip</Label>
        <div style={{marginTop:'6px', fontSize:'13px', color:DEEPP, lineHeight:1.7}}>
          Three slow exhales before opening your first message. Your nervous system reads a long exhale as safety — and your decisions for the rest of the day will be measured against it.
        </div>
      </Card>

      {/* Prescribed meditations — horizontal scroll of cards matching the
          warm gold aesthetic of the player itself. */}
      {meditations.length > 0 && (
        <div style={{marginTop:'4px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px', padding:'0 4px'}}>
            <Label>Your meditations</Label>
            <span style={{fontSize:'11px', color:DEEPP, opacity:0.6}}>{meditations.length} prescribed</span>
          </div>
          <div style={{display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'10px', marginBottom:'6px', WebkitOverflowScrolling:'touch'}}>
            {meditations.slice(0, 12).map(m => (
              <button key={m.id} onClick={() => onOpenMeditation(m.id)}
                style={{
                  flexShrink:0, width:'200px', textAlign:'left', fontFamily:'inherit', cursor:'pointer',
                  background:'linear-gradient(180deg, #fff8ec, #f5e6cf)',
                  border:'1px solid rgba(212,168,107,0.35)', borderRadius:'16px',
                  padding:'14px', boxShadow:'0 6px 14px rgba(107,78,41,0.12)',
                }}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px'}}>
                  <ChoKuRei size={26} color="#d4a86b" opacity={0.65}/>
                  <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color:'#8a6e50', fontWeight:800}}>{m.duration_min} min</div>
                </div>
                <div style={{fontFamily:'"Cormorant Garamond",Georgia,serif', fontSize:'16px', fontWeight:600, color:'#4a3a2e', lineHeight:1.25, marginBottom:'4px', minHeight:'40px'}}>{m.title}</div>
                <div style={{fontSize:'10px', color:'#8a6e50', opacity:0.8}}>
                  {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString() : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assigned coaching modules */}
      {modules.length > 0 && (
        <div style={{marginTop:'4px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'8px', padding:'0 4px'}}>
            <Label>Your coaching</Label>
            <span style={{fontSize:'11px', color:DEEPP, opacity:0.6}}>{modules.length} assigned</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {modules.slice(0, 6).map(m => (
              <button key={m.id} onClick={() => onOpenModule(m.id)}
                style={{textAlign:'left', fontFamily:'inherit', cursor:'pointer', background: CARD_BG, backdropFilter:'blur(10px)', border: CARD_BORDER, borderRadius:'14px', padding:'12px 14px', boxShadow: CARD_SHADOW, display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{flexShrink:0, width:'40px', height:'40px', borderRadius:'10px', background:'rgba(155,143,232,0.18)', border:'1px solid rgba(155,143,232,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px'}}>🧭</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:'13px', fontWeight:800, color:DEEPP, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{m.title}</div>
                  <div style={{fontSize:'11px', color:DEEPP, opacity:0.7, marginTop:'3px'}}>
                    {m.completed_at ? 'Completed' : `${m.progress_pct}% complete`}
                    {m.exercise_count > 0 ? ` · ${m.exercise_count} reflection${m.exercise_count === 1 ? '' : 's'}` : ''}
                  </div>
                  <div style={{height:'4px', borderRadius:'999px', background:'rgba(155,143,232,0.12)', overflow:'hidden', marginTop:'6px'}}>
                    <div style={{width:`${m.progress_pct}%`, height:'100%', background:'linear-gradient(135deg,#9b8fe8,#6b4e7c)', transition:'width 0.3s'}}/>
                  </div>
                </div>
                <span style={{color: DEEPP, opacity:0.5, fontSize:'16px'}}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const VisitTracker: React.FC<{patient: PatientPayload}> = ({ patient }) => {
  const visits = Array.from({length: patient.visits_allowed}, (_, i) => i < patient.visits_used);
  const meds = Array.from({length: patient.meditations_allowed}, (_, i) => i < patient.meditations_used);
  return (
    <Card style={{marginBottom:'14px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
        <div>
          <Label>This cycle</Label>
          <div style={{fontSize:'16px', fontWeight:800, color:DEEPP, marginTop:'4px'}}>{patient.tier_label} membership</div>
        </div>
        <div style={{fontSize:'10px', color:DEEPP, opacity:0.65}}>
          {patient.current_period_end ? `Renews ${new Date(patient.current_period_end).toLocaleDateString()}` : ''}
        </div>
      </div>
      <TrackerRow icon="🩺" label="Medical visits" used={patient.visits_used} total={patient.visits_allowed} dots={visits} color={TEAL}/>
      <div style={{height:'10px'}}/>
      <TrackerRow icon="🧘" label="Guided meditations" used={patient.meditations_used} total={patient.meditations_allowed} dots={meds} color={ROSE}/>
    </Card>
  );
};

const TrackerRow: React.FC<{icon:string; label:string; used:number; total:number; dots:boolean[]; color:string}> = ({ icon, label, used, total, dots, color }) => {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:DEEPP, marginBottom:'6px'}}>
        <span style={{fontWeight:700}}>{icon} {label}</span>
        <span style={{opacity:0.75, display:'flex', alignItems:'center', gap:'8px'}}>
          <span>{used} of {total} used</span>
          <span style={{fontWeight:800, color, background:`${color}18`, padding:'2px 8px', borderRadius:'999px', fontSize:'11px', letterSpacing:'0.3px'}}>{pct}%</span>
        </span>
      </div>
      <div style={{display:'flex', gap:'6px'}}>
        {dots.map((d, i) => (
          <div key={i} style={{flex:1, height:'10px', borderRadius:'999px', background: d ? color : `${color}28`, border: d ? `1px solid ${color}` : `1px dashed ${color}66`}}/>
        ))}
      </div>
    </div>
  );
};

const QuickTile: React.FC<{icon:string; label:string; onClick:()=>void; tint:string}> = ({ icon, label, onClick, tint }) => (
  <button onClick={onClick} style={{
    border:'none', cursor:'pointer', borderRadius:'18px',
    padding:'18px 14px', textAlign:'left',
    background:`linear-gradient(135deg, ${tint}bb, rgba(255,255,255,0.85))`,
    boxShadow:CARD_SHADOW, color:DEEPP, fontFamily:'inherit',
    display:'flex', flexDirection:'column', gap:'8px', minHeight:'86px',
  }}>
    <span style={{fontSize:'24px'}}>{icon}</span>
    <span style={{fontSize:'13px', fontWeight:800}}>{label}</span>
  </button>
);

// ───── BOOK TAB ─────────────────────────────────────────────────────────────

type Service = 'medical_visit' | 'guided_meditation' | 'urgent_same_day';
const SERVICES: {id: Service; label: string; icon: string; color: string; price: string}[] = [
  { id: 'medical_visit',     label: 'Medical Visit',      icon: '🩺', color: TEAL,  price: 'Included or $300' },
  { id: 'guided_meditation', label: 'Guided Meditation',  icon: '🧘', color: ROSE,  price: 'Included or $44' },
  { id: 'urgent_same_day',   label: 'Urgent Same-Day',    icon: '⚡', color: DEEPP, price: '$444 (Ascend free)' },
];

interface Booking { id: number; service_type: string; starts_at: string; duration_min: number; status: string; notes: string; }

const BookTab: React.FC<{API:string; token:string; patient:PatientPayload|null; onChanged?:()=>void}> = ({ API, token, patient, onChanged }) => {
  const [service, setService] = useState<Service>('medical_visit');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  });
  const [activeDayIdx, setActiveDayIdx] = useState<number>(() => {
    const t = new Date(); const wd = t.getDay();
    // Snap to Mon-Fri only; if weekend, default to Monday.
    if (wd === 0 || wd === 6) return 0;
    return wd - 1;
  });
  const [pending, setPending] = useState<{day: Date; label: string; hour:number; min:number} | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);

  const weekDays = useMemo(() =>
    Array.from({length:5}).map((_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
    }), [weekStart]);

  const SLOTS = useMemo(() => {
    const arr: {label:string; hour:number; min:number}[] = [];
    for (let h = 8; h < 20; h++) for (const m of [0, 30]) {
      const hh = h % 12 === 0 ? 12 : h % 12;
      const ap = h < 12 ? 'AM' : 'PM';
      arr.push({ label: `${hh}:${m.toString().padStart(2,'0')} ${ap}`, hour: h, min: m });
    }
    return arr;
  }, []);

  const loadBookings = useCallback(() => {
    fetch(`${API}/concierge/me/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(d => setBookings(d.bookings || []))
      .catch(() => {});
  }, [API, token]);
  useEffect(() => { loadBookings(); }, [loadBookings]);

  const svcMeta = SERVICES.find(s => s.id === service)!;
  const allowanceLine =
    service === 'guided_meditation' && patient ? `${patient.meditations_used} of ${patient.meditations_allowed} meditations used` :
    service === 'medical_visit'     && patient ? `${patient.visits_used} of ${patient.visits_allowed} visits used` :
    'Urgent same-day is à la carte unless you\'re on Ascend.';

  const confirm = async () => {
    if (!pending) return;
    setError(''); setSaving(true);
    try {
      const starts = new Date(pending.day);
      starts.setHours(pending.hour, pending.min, 0, 0);
      const res = await fetch(`${API}/concierge/me/bookings`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ service_type: service, starts_at: starts.toISOString(), duration_min: 30 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Booking failed');
      setConfirmed(d); setPending(null);
      loadBookings();
      onChanged && onChanged();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{padding:'18px 4px 8px 4px'}}>
        <div style={{fontSize:'22px', fontWeight:800, color:DEEPP}}>Book a session</div>
        <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'4px'}}>Mon–Fri, 8 AM – 8 PM MST. Confirmations arrive by secure message within minutes.</div>
      </div>

      <div style={{display:'flex', gap:'8px', overflowX:'auto', padding:'2px 0 10px 0', marginBottom:'10px'}}>
        {SERVICES.map(s => {
          const active = service === s.id;
          return (
            <button key={s.id} onClick={() => setService(s.id)}
              style={{
                flexShrink:0, padding:'8px 14px', borderRadius:'999px',
                border: active ? `1px solid ${s.color}` : '1px solid rgba(107,78,124,0.18)',
                background: active ? `${s.color}1f` : 'rgba(255,255,255,0.7)',
                color: active ? s.color : DEEPP, fontSize:'12px', fontWeight: active ? 800 : 600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              {s.icon} {s.label}
            </button>
          );
        })}
      </div>

      <Card style={{marginBottom:'12px'}}>
        <Label>This cycle</Label>
        <div style={{fontSize:'13px', color:DEEPP, marginTop:'4px'}}>{allowanceLine}</div>
        <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'4px'}}>{svcMeta.price}</div>
      </Card>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }} style={navBtn}>← Prev</button>
        <div style={{fontSize:'12px', color:DEEPP, fontWeight:700}}>
          Week of {weekStart.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
        </div>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }} style={navBtn}>Next →</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px', marginBottom:'12px'}}>
        {weekDays.map((d, i) => {
          const active = activeDayIdx === i;
          return (
            <button key={d.toISOString()} onClick={() => setActiveDayIdx(i)}
              style={{
                textAlign:'center', padding:'10px 4px',
                background: active ? `linear-gradient(135deg, ${TEAL}33, ${PRIMARY})` : 'rgba(255,255,255,0.6)',
                borderRadius:'12px',
                border: active ? `1px solid ${TEAL}` : '1px solid rgba(107,78,124,0.12)',
                cursor:'pointer', fontFamily:'inherit',
              }}>
              <div style={{fontSize:'10px', color:DEEPP, opacity:0.65, letterSpacing:'1px', textTransform:'uppercase', fontWeight:700}}>{d.toLocaleDateString(undefined, {weekday:'short'})}</div>
              <div style={{fontSize:'18px', color:DEEPP, fontWeight:800, marginTop:'2px'}}>{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      <Card>
        <Label>Available slots · {weekDays[activeDayIdx]?.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})}</Label>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(86px,1fr))', gap:'6px', marginTop:'10px'}}>
          {SLOTS.map(s => (
            <button key={s.label}
              onClick={() => setPending({ day: weekDays[activeDayIdx], label: s.label, hour: s.hour, min: s.min })}
              style={{
                background: PRIMARY, border:`1px solid ${TEAL}55`, color: DEEPP,
                borderRadius:'10px', padding:'10px 6px', fontSize:'12px', fontWeight:700, cursor:'pointer',
                fontFamily:'inherit',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'12px', lineHeight:1.5, textAlign:'center'}}>
          Slots reflect the calendar — Dr. Anderson will confirm and send a secure video link before your session.
        </div>
      </Card>

      {/* Upcoming bookings */}
      {bookings.length > 0 && (
        <Card style={{marginTop:'12px'}}>
          <Label>Your upcoming sessions</Label>
          <div style={{display:'flex', flexDirection:'column', gap:'8px', marginTop:'10px'}}>
            {bookings.slice(0, 6).map(b => {
              const meta = SERVICES.find(s => s.id === b.service_type);
              return (
                <div key={b.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'rgba(255,255,255,0.65)', borderRadius:'12px', border:'1px solid rgba(107,78,124,0.1)'}}>
                  <div>
                    <div style={{fontSize:'12px', fontWeight:800, color:DEEPP}}>{meta?.icon} {meta?.label || b.service_type}</div>
                    <div style={{fontSize:'11px', color:DEEPP, opacity:0.7, marginTop:'2px'}}>{new Date(b.starts_at).toLocaleString(undefined, {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}</div>
                  </div>
                  <span style={statusPill(b.status)}>{b.status}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pending-confirm modal */}
      {pending && (
        <SheetModal onClose={() => setPending(null)}>
          <div style={{fontSize:'11px', color:DEEPP, opacity:0.7, letterSpacing:'2px', textTransform:'uppercase', fontWeight:800}}>Confirm booking</div>
          <div style={{fontSize:'20px', fontWeight:800, color:DEEPP, marginTop:'4px'}}>{svcMeta.icon} {svcMeta.label}</div>
          <div style={{fontSize:'13px', color:DEEPP, marginTop:'10px', lineHeight:1.6}}>
            {pending.day.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})} · <b>{pending.label}</b> MST · 30 min
          </div>
          <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'10px', lineHeight:1.5}}>{svcMeta.price}. Dr. Anderson will confirm and send a secure video link.</div>
          <div style={{background:'rgba(232,168,64,0.1)', border:'1px solid rgba(232,168,64,0.35)', borderRadius:'10px', padding:'8px 12px', fontSize:'11px', color:'#8a5a10', marginTop:'12px', lineHeight:1.5}}>
            ⚠️ Beta: do not share identifying patient information during booking.
          </div>
          {error && <div style={{color:'#a02020', fontSize:'12px', marginTop:'10px'}}>{error}</div>}
          <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
            <button onClick={() => setPending(null)} style={{flex:1, ...ghostBtn}}>Cancel</button>
            <button onClick={confirm} disabled={saving} style={{flex:1, ...solidBtn, opacity: saving ? 0.6 : 1}}>
              {saving ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </SheetModal>
      )}

      {/* Success modal */}
      {confirmed && (
        <SheetModal onClose={() => setConfirmed(null)}>
          <div style={{fontSize:'40px', textAlign:'center', marginBottom:'6px'}}>✨</div>
          <div style={{fontSize:'20px', fontWeight:800, color:DEEPP, textAlign:'center'}}>Session booked</div>
          <div style={{fontSize:'13px', color:DEEPP, opacity:0.75, textAlign:'center', marginTop:'6px'}}>
            {new Date(confirmed.starts_at).toLocaleString(undefined, {weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit'})}
          </div>
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.65, textAlign:'center', marginTop:'10px', lineHeight:1.6}}>
            A confirmation message from Dr. Anderson is on its way to your inbox.
          </div>
          <button onClick={() => setConfirmed(null)} style={{...solidBtn, width:'100%', marginTop:'18px'}}>Done</button>
        </SheetModal>
      )}
    </div>
  );
};

const statusPill = (status: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    scheduled: ['rgba(42,191,191,0.15)',  '#147070'],
    completed: ['rgba(112,184,112,0.15)', '#2a7a2a'],
    canceled:  ['rgba(160,160,160,0.15)', '#808080'],
    no_show:   ['rgba(224,140,80,0.18)',  '#a85020'],
  };
  const [bg, color] = map[status] || ['rgba(107,78,124,0.12)', DEEPP];
  return { fontSize:'10px', padding:'3px 10px', borderRadius:'999px', background: bg, color, fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase' };
};

// ───── ACCOUNT TAB ──────────────────────────────────────────────────────────

interface BillingInvoice { id:string; number:string|null; amount_paid_cents:number; amount_due_cents:number; status:string; created:string|null; hosted_invoice_url:string|null; description:string|null; }
interface BillingSnapshot { tier:string; tier_label:string; status:string; current_period_end:string|null; total_paid_cents:number; invoices:BillingInvoice[]; upcoming_invoice:{amount_due_cents:number; next_payment_attempt:string|null}|null; }

// Convert URL-safe base64 (VAPID key format) → Uint8Array for the Push API.
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const AccountTab: React.FC<{API:string; token:string; patient:PatientPayload|null; onSignOut:()=>void; onOpenEnergyLog:()=>void}> = ({ API, token, patient, onSignOut, onOpenEnergyLog }) => {
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [pushState, setPushState] = useState<'unknown'|'unsupported'|'prompt'|'denied'|'enabled'|'pending'>('unknown');
  const [pushMsg, setPushMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const signOut = () => {
    try { localStorage.removeItem('token'); } catch {}
    onSignOut();
  };

  useEffect(() => {
    fetch(`${API}/concierge/me/billing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBilling(d); })
      .catch(() => {});
  }, [API, token]);

  // Check current push state on mount.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushState('unsupported'); return;
    }
    if (Notification.permission === 'denied') { setPushState('denied'); return; }
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') setPushState('enabled');
      else setPushState('prompt');
    }).catch(() => setPushState('prompt'));
  }, []);

  const enablePush = async () => {
    setPushMsg(''); setPushState('pending');
    try {
      const cfg = await fetch(`${API}/config`).then(r => r.json());
      const key = cfg?.push?.vapid_public_key;
      if (!cfg?.push?.enabled || !key) {
        setPushMsg('Push not configured by the server yet.'); setPushState('prompt'); return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushState(perm === 'denied' ? 'denied' : 'prompt'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json: any = sub.toJSON();
      const res = await fetch(`${API}/concierge/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, user_agent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error('Server rejected subscription.');
      setPushState('enabled');
      setPushMsg('Notifications on. Test below anytime.');
    } catch (e: any) {
      setPushMsg(e.message || 'Could not enable notifications.');
      setPushState('prompt');
    }
  };

  const testPush = async () => {
    setPushMsg('');
    try {
      const res = await fetch(`${API}/concierge/push/test`, { method: 'POST', headers: { Authorization:`Bearer ${token}` } });
      const d = await res.json();
      setPushMsg(d.delivered > 0 ? 'Test sent — check your device.' : 'No active device subscriptions. Re-enable notifications.');
    } catch { setPushMsg('Test failed.'); }
  };

  const openPortal = async () => {
    try {
      const res = await fetch(`${API}/billing/portal`, { method:'POST', headers: { Authorization: `Bearer ${token}` }});
      const d = await res.json();
      if (d?.url) window.location.href = d.url;
    } catch {}
  };
  return (
    <div>
      <div style={{padding:'18px 4px 8px 4px'}}>
        <div style={{fontSize:'22px', fontWeight:800, color:DEEPP}}>Your account</div>
      </div>

      {patient && (
        <Card style={{marginBottom:'12px'}}>
          <Label>Membership</Label>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'6px'}}>
            <div>
              <div style={{fontSize:'20px', fontWeight:800, color:DEEPP}}>{patient.tier_label}</div>
              <div style={{fontSize:'12px', color:DEEPP, opacity:0.65, marginTop:'2px'}}>Status: {patient.subscription_status || '—'}</div>
            </div>
            <div style={{fontSize:'11px', fontWeight:800, padding:'4px 10px', borderRadius:'999px', background: `${TEAL}22`, color: TEAL, letterSpacing:'0.5px', textTransform:'uppercase'}}>Active</div>
          </div>
          {patient.current_period_end && (
            <div style={{fontSize:'11px', color:DEEPP, opacity:0.7, marginTop:'10px'}}>Renews {new Date(patient.current_period_end).toLocaleDateString()}</div>
          )}
        </Card>
      )}

      <Card style={{marginBottom:'12px'}}>
        <Label>Upgrade or change tier</Label>
        <div style={{display:'grid', gridTemplateColumns:'1fr', gap:'6px', marginTop:'10px'}}>
          <TierRow label="Awaken" monthly="$444/mo" yearly="$5,000/yr" desc="2 visits · 1 meditation"/>
          <TierRow label="Align"  monthly="$888/mo" yearly="$10,000/yr" desc="3 visits · 2 meditations"/>
          <TierRow label="Ascend" monthly="$1,111/mo" yearly="$13,000/yr" desc="5 visits · 4 meditations · same-day · integrative review"/>
        </div>
        <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'10px', textAlign:'center'}}>Changes take effect on next billing cycle unless you choose prorated upgrade.</div>
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>Billing history</Label>
        {!billing || billing.invoices.length === 0 ? (
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'8px', lineHeight:1.6}}>
            No invoices yet. Your first membership charge will appear here.
          </div>
        ) : (
          <div style={{marginTop:'10px', display:'flex', flexDirection:'column', gap:'8px'}}>
            {billing.invoices.slice(0, 8).map(inv => (
              <div key={inv.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'rgba(255,255,255,0.55)', borderRadius:'10px', border:'1px solid rgba(107,78,124,0.1)'}}>
                <div style={{minWidth:0, flex:1}}>
                  <div style={{fontSize:'12px', fontWeight:700, color:DEEPP, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{inv.description || inv.number || inv.id.slice(-8)}</div>
                  <div style={{fontSize:'10px', color:DEEPP, opacity:0.65}}>{inv.created ? new Date(inv.created).toLocaleDateString() : ''}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'12px', fontWeight:800, color:DEEPP}}>${((inv.amount_paid_cents || inv.amount_due_cents)/100).toFixed(2)}</div>
                  <div style={{fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.5px', color: inv.status === 'paid' ? TEAL : '#a02020', fontWeight:700}}>{inv.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={openPortal} style={{...smallCtaStyle, marginTop:'10px'}}>Manage payment methods & invoices →</button>
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>Notifications</Label>
        {pushState === 'unsupported' ? (
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'6px', lineHeight:1.6}}>
            Your browser doesn't support push notifications. On iPhone, add SoulMD Concierge to your Home Screen (Share → Add to Home Screen) and open it from the icon — push works from the installed app only.
          </div>
        ) : pushState === 'denied' ? (
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'6px', lineHeight:1.6}}>
            Notifications are currently blocked. Enable them in your device settings and reload.
          </div>
        ) : pushState === 'enabled' ? (
          <div>
            <div style={{fontSize:'12px', color:DEEPP, marginTop:'6px', lineHeight:1.6}}>
              🔔 Notifications are on — you'll get a ping for oracle cards, message replies, and session confirmations.
            </div>
            <button onClick={testPush} style={{...smallCtaStyle, marginTop:'10px'}}>Send test notification →</button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:'12px', color:DEEPP, marginTop:'6px', lineHeight:1.6}}>
              Want a gentle ping when Dr. Anderson replies or sends an oracle card?
            </div>
            <button onClick={enablePush} disabled={pushState === 'pending'} style={{...solidBtn, marginTop:'10px', width:'100%', opacity: pushState === 'pending' ? 0.6 : 1}}>
              {pushState === 'pending' ? 'Enabling…' : '🔔 Enable notifications'}
            </button>
          </div>
        )}
        {pushMsg && <div style={{fontSize:'11px', color:DEEPP, opacity:0.75, marginTop:'8px'}}>{pushMsg}</div>}
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>HIPAA consent</Label>
        <div style={{fontSize:'12px', color:DEEPP, lineHeight:1.6, marginTop:'6px'}}>
          Full HIPAA compliance — including Business Associate Agreements — will be implemented before clinical launch. During beta, do not enter identifying information.
        </div>
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>Your journal</Label>
        <button onClick={onOpenEnergyLog}
          style={{...linkRow, textDecoration:'none', marginTop:'10px', cursor:'pointer', width:'100%', fontFamily:'inherit'}}>
          <span>My Energy Log</span>
          <span style={{opacity:0.5}}>→</span>
        </button>
        <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'8px', lineHeight:1.5}}>
          Your oracle pulls, reflections, and monthly themes.
        </div>
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>Legal</Label>
        <div style={{display:'flex', flexDirection:'column', gap:'6px', marginTop:'10px'}}>
          <a href="/privacy" style={{...linkRow, textDecoration:'none'}}>Privacy Policy<span style={{opacity:0.5}}>↗</span></a>
          <a href="/terms"   style={{...linkRow, textDecoration:'none'}}>Terms of Service<span style={{opacity:0.5}}>↗</span></a>
        </div>
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>Session</Label>
        <button onClick={() => setShowSignOut(true)} style={{...smallCtaStyle, marginTop:'10px', width:'100%'}}>Sign out</button>
      </Card>

      <Card>
        <Label>Danger zone</Label>
        <div style={{fontSize:'11px', color:DEEPP, opacity:0.7, marginTop:'6px', lineHeight:1.6}}>
          Delete your Concierge account and all associated data. This is irreversible; your subscription will be canceled and your billing history retained per legal requirements.
        </div>
        <button onClick={() => setShowDelete(true)} style={{...smallCtaStyle, marginTop:'10px', color:'#a02020', borderColor:'rgba(224,80,80,0.3)'}}>Delete my account</button>
      </Card>

      {showSignOut && (
        <SheetModal onClose={() => setShowSignOut(false)}>
          <div style={{fontSize:'18px', fontWeight:800, color:DEEPP, marginBottom:'6px'}}>Sign out?</div>
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.75, lineHeight:1.6, marginBottom:'16px'}}>
            You'll need to sign in again with your magic link to access the app. Any push notifications on this device will continue to deliver until you disable them from Settings.
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={() => setShowSignOut(false)} style={{flex:1, ...ghostBtn}}>Cancel</button>
            <button onClick={signOut} style={{flex:1, ...solidBtn}}>Sign out</button>
          </div>
        </SheetModal>
      )}

      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} patientEmail={patient?.name || ''}/>}
    </div>
  );
};

const linkRow: React.CSSProperties = {
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'10px 12px', borderRadius:'10px',
  background:'rgba(255,255,255,0.55)', border:'1px solid rgba(107,78,124,0.1)',
  fontSize:'13px', fontWeight:700, color:DEEPP, fontFamily:'inherit',
};

// ───── Delete account — confirmation modal ────────────────────────────────
// True deletion during beta is a mailto to the physician so HIPAA review
// can happen before data is wiped. The modal requires typing DELETE to
// confirm, matching GitHub/Stripe-style destructive flows.
const DeleteAccountModal: React.FC<{onClose:()=>void; patientEmail:string}> = ({ onClose, patientEmail }) => {
  const [typed, setTyped] = useState('');
  const ready = typed.trim().toUpperCase() === 'DELETE';
  const submit = () => {
    if (!ready) return;
    const subject = encodeURIComponent('Concierge account deletion request');
    const body = encodeURIComponent(
      `Patient: ${patientEmail}\n\nI am requesting deletion of my SoulMD Concierge account. I understand this will cancel my subscription and remove my personal data from the platform.\n\nSigned.`
    );
    window.location.href = `mailto:anderson@soulmd.us?subject=${subject}&body=${body}`;
  };
  return (
    <SheetModal onClose={onClose}>
      <div style={{fontSize:'24px', marginBottom:'6px'}}>🗑️</div>
      <div style={{fontSize:'18px', fontWeight:800, color:'#a02020'}}>Delete my account</div>
      <div style={{fontSize:'12px', color:DEEPP, opacity:0.75, marginTop:'8px', lineHeight:1.6}}>
        During beta, account deletion is processed manually by Dr. Anderson so your subscription is cleanly canceled and any HIPAA-protected data is removed with verification. This will open a pre-filled email; send it to complete your request.
      </div>
      <div style={{fontSize:'11px', color:DEEPP, fontWeight:700, marginTop:'14px', marginBottom:'6px', letterSpacing:'0.3px'}}>Type DELETE to confirm</div>
      <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="DELETE" autoFocus
        style={{...msgInputStyle, letterSpacing:'2px', textTransform:'uppercase', borderColor: ready ? 'rgba(224,80,80,0.6)' : 'rgba(107,78,124,0.18)'}}/>
      <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
        <button onClick={onClose} style={{flex:1, ...ghostBtn}}>Cancel</button>
        <button onClick={submit} disabled={!ready}
          style={{flex:1, ...solidBtn, background: ready ? 'linear-gradient(135deg,#c04040,#7a1a1a)' : 'rgba(160,160,160,0.3)', color:'white', cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5}}>
          Open email to delete
        </button>
      </div>
    </SheetModal>
  );
};

const TierRow: React.FC<{label:string; monthly:string; yearly:string; desc:string}> = ({ label, monthly, yearly, desc }) => (
  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'rgba(255,255,255,0.55)', borderRadius:'12px', border:'1px solid rgba(107,78,124,0.1)'}}>
    <div>
      <div style={{fontSize:'13px', fontWeight:800, color:DEEPP}}>{label}</div>
      <div style={{fontSize:'11px', color:DEEPP, opacity:0.7, marginTop:'2px'}}>{desc}</div>
    </div>
    <div style={{textAlign:'right'}}>
      <div style={{fontSize:'12px', fontWeight:700, color:DEEPP}}>{monthly}</div>
      <div style={{fontSize:'10px', color:DEEPP, opacity:0.65}}>{yearly}</div>
    </div>
  </div>
);

// ───── MESSAGES TAB ─────────────────────────────────────────────────────────

interface PatientMessage { id:number; direction:'outbound'|'inbound'; subject:string; body:string; category:string; read_at:string|null; created_at:string; related_id?:number|null; related_kind?:string|null; }

const MSG_CATEGORIES: {id: string; label: string; color: string}[] = [
  { id: 'general',    label: 'General',    color: DEEPP },
  { id: 'medical',    label: 'Medical',    color: TEAL },
  { id: 'lab_review', label: 'Lab Review', color: '#E890B0' },
  { id: 'meditation', label: 'Meditation', color: '#9E7BD4' },
  { id: 'billing',    label: 'Billing',    color: '#D4A659' },
];

const MessagesTab: React.FC<{API:string; token:string; onOpenMeditation: (id: number) => void}> = ({ API, token, onOpenMeditation }) => {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/me/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setMessages(d.messages || []))
      .finally(() => setLoading(false));
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    setError('');
    if (!body.trim()) { setError('Type a message first.'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/concierge/me/messages`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim() || undefined, body: body.trim(), category }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Send failed');
      setBody(''); setSubject(''); setCategory('general');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  };

  return (
    <div>
      <div style={{padding:'18px 4px 8px 4px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'12px'}}>
        <div>
          <div style={{fontSize:'22px', fontWeight:800, color:DEEPP}}>Messages</div>
          <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'4px'}}>Physician responds within 24 hours.</div>
        </div>
        <span style={{fontSize:'10px', fontWeight:800, color: TEAL, background:`${TEAL}18`, padding:'4px 10px', borderRadius:'999px', border:`1px solid ${TEAL}55`, letterSpacing:'0.4px', display:'inline-flex', alignItems:'center', gap:'4px'}}>
          🔒 End-to-end
        </span>
      </div>

      {/* Compose */}
      <Card style={{marginBottom:'12px'}}>
        <Label>New message</Label>
        <div style={{display:'flex', gap:'6px', overflowX:'auto', marginTop:'8px', paddingBottom:'2px'}}>
          {MSG_CATEGORIES.map(c => {
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{
                  flexShrink:0, padding:'6px 12px', borderRadius:'999px', fontSize:'11px', fontWeight: active ? 800 : 600,
                  border: active ? `1px solid ${c.color}` : '1px solid rgba(107,78,124,0.15)',
                  background: active ? `${c.color}1a` : 'rgba(255,255,255,0.7)',
                  color: active ? c.color : DEEPP, cursor:'pointer', fontFamily:'inherit',
                }}>{c.label}</button>
            );
          })}
        </div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)"
          style={{...msgInputStyle, marginTop:'10px'}}/>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="What's on your mind? (avoid identifying info during beta)"
          style={{...msgInputStyle, minHeight:'80px', resize:'vertical', marginTop:'8px', fontFamily:'inherit'}}/>
        {error && <div style={{color:'#a02020', fontSize:'12px', marginTop:'8px'}}>{error}</div>}
        <button onClick={send} disabled={sending} style={{...solidBtn, width:'100%', marginTop:'10px', opacity: sending ? 0.6 : 1}}>
          {sending ? 'Sending…' : 'Send securely 🔒'}
        </button>
      </Card>

      {/* Thread */}
      {loading ? (
        <Card style={{textAlign:'center', color:DEEPP, opacity:0.7, fontSize:'13px', padding:'28px'}}>Loading…</Card>
      ) : messages.length === 0 ? (
        <Card style={{textAlign:'center', color:DEEPP, opacity:0.7, padding:'28px'}}>
          <div style={{fontSize:'32px', marginBottom:'6px'}}>💬</div>
          <div style={{fontSize:'13px'}}>No messages yet. Send one above to start the conversation.</div>
        </Card>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {messages.map(m => {
            const cat = MSG_CATEGORIES.find(c => c.id === m.category) || MSG_CATEGORIES[0];
            const fromPhysician = m.direction === 'outbound';
            const isMeditation = m.category === 'meditation' && m.related_kind === 'meditation' && !!m.related_id;
            // For meditation prescriptions, show only the header lines of
            // the body (title + duration) — the reader opens in its own
            // distraction-free view. Splits at the first double-newline.
            const split = m.body.split(/\n\s*\n/);
            const meditationPreview = isMeditation ? split[0] : '';
            return (
              <div key={m.id} style={{
                maxWidth:'86%', alignSelf: fromPhysician ? 'flex-start' : 'flex-end',
                background: fromPhysician ? 'rgba(255,255,255,0.85)' : `linear-gradient(135deg, ${BLUSH}aa, ${ROSE}aa)`,
                color: fromPhysician ? DEEPP : 'white',
                borderRadius:'18px',
                borderTopLeftRadius: fromPhysician ? '4px' : '18px',
                borderTopRightRadius: fromPhysician ? '18px' : '4px',
                padding:'12px 14px',
                boxShadow: CARD_SHADOW,
                border: fromPhysician ? '1px solid rgba(107,78,124,0.12)' : 'none',
              }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
                  <span style={{
                    fontSize:'9px', fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase',
                    padding:'2px 8px', borderRadius:'999px',
                    background: fromPhysician ? `${cat.color}18` : 'rgba(255,255,255,0.25)',
                    color: fromPhysician ? cat.color : 'white',
                  }}>{cat.label}</span>
                  <span style={{fontSize:'10px', opacity:0.7}}>
                    {fromPhysician ? 'Dr. Anderson' : 'You'} · {new Date(m.created_at).toLocaleString(undefined,{month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}
                  </span>
                </div>
                {m.subject && <div style={{fontSize:'13px', fontWeight:800, marginBottom:'4px'}}>{m.subject}</div>}
                {isMeditation ? (
                  <>
                    <div style={{fontSize:'13px', lineHeight:1.55, whiteSpace:'pre-wrap', fontStyle:'italic', color: DEEPP, opacity:0.9}}>{meditationPreview}</div>
                    <button onClick={() => m.related_id && onOpenMeditation(m.related_id)}
                      style={{marginTop:'10px', background:'linear-gradient(135deg,#d4a86b,#9b8fe8)', border:'none', borderRadius:'10px', padding:'9px 14px', fontSize:'12px', fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px'}}>
                      🕊️ Open in meditation view
                    </button>
                  </>
                ) : (
                  <div style={{fontSize:'13px', lineHeight:1.55, whiteSpace:'pre-wrap'}}>{m.body}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───── LABS TAB ─────────────────────────────────────────────────────────────

interface LabRecord { id:number; filename:string; size_bytes:number; status:'pending'|'reviewed'|'flagged'; flagged:boolean; physician_note:string; uploaded_at:string; reviewed_at:string|null; }

const LabsTab: React.FC<{API:string; token:string}> = ({ API, token }) => {
  const [labs, setLabs] = useState<LabRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/me/labs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { labs: [] })
      .then(d => setLabs(d.labs || []))
      .finally(() => setLoading(false));
  }, [API, token]);
  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setError('');
    if (file.size > 25 * 1024 * 1024) { setError('File exceeds 25MB.'); return; }
    const form = new FormData(); form.append('file', file);
    setUploading(true);
    try {
      const res = await fetch(`${API}/concierge/me/labs`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}` },
        body: form,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Upload failed');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div>
      <div style={{padding:'18px 4px 8px 4px'}}>
        <div style={{fontSize:'22px', fontWeight:800, color:DEEPP}}>Lab Vault</div>
        <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'4px'}}>
          PDF, JPG, or PNG — up to 25MB per file. Dr. Anderson reviews and messages you with results.
        </div>
      </div>

      {/* Upload tile */}
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        style={{
          width:'100%', background:`linear-gradient(135deg, ${PRIMARY}, rgba(255,255,255,0.9))`,
          border:`2px dashed ${TEAL}66`, borderRadius:'18px', padding:'22px 14px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
          color:DEEPP, cursor: uploading ? 'wait' : 'pointer', fontFamily:'inherit', marginBottom:'12px', boxShadow: CARD_SHADOW,
          opacity: uploading ? 0.6 : 1,
        }}>
        <span style={{fontSize:'28px'}}>📤</span>
        <span style={{fontSize:'13px', fontWeight:800}}>{uploading ? 'Uploading…' : 'Upload a lab result'}</span>
        <span style={{fontSize:'11px', opacity:0.65}}>Every file is stored behind the HIPAA lock at launch.</span>
      </button>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        style={{display:'none'}} onChange={e => e.target.files && e.target.files[0] && upload(e.target.files[0])}/>

      {error && <div style={{background:'rgba(224,80,80,0.1)', border:'1px solid rgba(224,80,80,0.35)', borderRadius:'10px', padding:'8px 12px', color:'#a02020', fontSize:'12px', marginBottom:'10px'}}>{error}</div>}

      {/* List */}
      {loading ? (
        <Card style={{textAlign:'center', color:DEEPP, opacity:0.7, fontSize:'13px', padding:'28px'}}>Loading…</Card>
      ) : labs.length === 0 ? (
        <Card style={{textAlign:'center', color:DEEPP, opacity:0.7, padding:'28px'}}>
          <div style={{fontSize:'32px', marginBottom:'6px'}}>🧪</div>
          <div style={{fontSize:'13px'}}>No labs uploaded yet.</div>
        </Card>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {labs.map(lab => <LabRow key={lab.id} lab={lab}/>)}
        </div>
      )}

      <div style={{fontSize:'10px', color:DEEPP, opacity:0.6, marginTop:'14px', textAlign:'center', lineHeight:1.5}}>
        🔒 HIPAA lock — full BAA infrastructure lands before clinical launch. Normal values are shown in teal, flagged values in blush pink once reviewed.
      </div>
    </div>
  );
};

const LabRow: React.FC<{lab: LabRecord}> = ({ lab }) => {
  const [expanded, setExpanded] = useState(false);
  const bytes = lab.size_bytes > 1024*1024 ? `${(lab.size_bytes/1024/1024).toFixed(1)} MB` : `${Math.round(lab.size_bytes/1024)} KB`;
  const pill = (() => {
    if (lab.status === 'flagged') return { bg: `${ROSE}22`, color: '#a02060', label: 'Flagged' };
    if (lab.status === 'reviewed') return { bg: `${TEAL}22`, color: TEAL, label: 'Reviewed' };
    return { bg: 'rgba(232,168,64,0.18)', color: '#a06810', label: 'Pending' };
  })();
  return (
    <button onClick={() => setExpanded(v => !v)} style={{
      width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
      background: CARD_BG, backdropFilter:'blur(12px)', border: CARD_BORDER, borderRadius:'16px',
      padding:'14px', boxShadow: CARD_SHADOW,
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px'}}>
        <div style={{minWidth:0, flex:1}}>
          <div style={{fontSize:'13px', fontWeight:800, color:DEEPP, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lab.filename}</div>
          <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'2px'}}>
            {new Date(lab.uploaded_at).toLocaleDateString()} · {bytes} <span style={{marginLeft:'6px'}}>🔒</span>
          </div>
        </div>
        <span style={{fontSize:'10px', padding:'4px 10px', borderRadius:'999px', background: pill.bg, color: pill.color, fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase'}}>{pill.label}</span>
      </div>
      {expanded && lab.physician_note && (
        <div style={{marginTop:'12px', padding:'10px 12px', background:`${TEAL}12`, borderRadius:'10px', fontSize:'12px', color:DEEPP, lineHeight:1.6, whiteSpace:'pre-wrap'}}>
          <div style={{fontSize:'10px', fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase', color: TEAL, marginBottom:'4px'}}>Dr. Anderson's note</div>
          {lab.physician_note}
        </div>
      )}
    </button>
  );
};

// ───── Utility components ──────────────────────────────────────────────────

const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({ children, style }) => (
  <div style={{background: CARD_BG, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border: CARD_BORDER, borderRadius:'18px', padding:'16px', boxShadow: CARD_SHADOW, marginBottom:'12px', ...style}}>
    {children}
  </div>
);

const Label: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div style={{fontSize:'10px', fontWeight:800, color:DEEPP, opacity:0.7, letterSpacing:'1.8px', textTransform:'uppercase'}}>{children}</div>
);

const smallCtaStyle: React.CSSProperties = {
  marginTop:'10px', display:'inline-block', padding:'8px 14px', borderRadius:'10px',
  background:'rgba(255,255,255,0.85)', border:`1px solid ${TEAL}55`, color:TEAL,
  fontSize:'12px', fontWeight:800, cursor:'pointer', fontFamily:'inherit',
};
const navBtn: React.CSSProperties = {
  background:'rgba(255,255,255,0.7)', border:'1px solid rgba(107,78,124,0.15)',
  borderRadius:'10px', padding:'6px 10px', fontSize:'11px', fontWeight:700,
  color:DEEPP, cursor:'pointer', fontFamily:'inherit',
};
const ghostBtn: React.CSSProperties = {
  background:'rgba(255,255,255,0.85)', border:'1px solid rgba(107,78,124,0.2)',
  borderRadius:'12px', padding:'12px 16px', fontSize:'13px', fontWeight:700,
  color:DEEPP, cursor:'pointer', fontFamily:'inherit',
};
const solidBtn: React.CSSProperties = {
  background:`linear-gradient(135deg, ${TEAL}, ${DEEPP})`, border:'none',
  borderRadius:'12px', padding:'12px 16px', fontSize:'13px', fontWeight:800,
  color:'white', cursor:'pointer', fontFamily:'inherit',
};
const msgInputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(107,78,124,0.18)',
  fontSize:'13px', color: DEEPP, background:'rgba(255,255,255,0.7)',
  outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};

// Bottom-sheet style modal used by the Book tab's confirm + success flows.
const SheetModal: React.FC<{onClose:()=>void; children: React.ReactNode}> = ({ onClose, children }) => (
  <div onClick={onClose} style={{position:'fixed', inset:0, zIndex:2500, background:'rgba(26,13,53,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0'}}>
    <div onClick={e => e.stopPropagation()}
      style={{background:'white', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:'560px', padding:'24px 20px calc(28px + env(safe-area-inset-bottom, 0px)) 20px', boxShadow:'0 -16px 40px rgba(0,0,0,0.18)'}}>
      {children}
    </div>
  </div>
);

const LoadingShell: React.FC = () => (
  <div style={{minHeight:'100vh', background: BG_GRADIENT, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui'}}>
    <div style={{textAlign:'center', color:DEEPP}}>
      <div style={{fontSize:'36px', marginBottom:'8px'}}>✨</div>
      <div style={{fontSize:'13px', opacity:0.75}}>Opening your Concierge…</div>
    </div>
  </div>
);

export default PatientApp;
