// © 2026 SoulMD, LLC. All rights reserved.
// SoulMD Concierge — patient-facing PWA.
// Phase 1a: Home + Book + Messages (stub) + Lab Vault (stub) + Account.
// Daily Oracle Card pulls on first open of the day.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ChoKuRei from './ChoKuRei';
import OracleCard from './OracleCard';

interface Props { API: string; token: string; onBack: () => void; }

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

const TABS: {id: Tab; label: string; icon: string}[] = [
  { id: 'home',     label: 'Home',     icon: '✨' },
  { id: 'book',     label: 'Book',     icon: '📅' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'labs',     label: 'Labs',     icon: '🧪' },
  { id: 'account',  label: 'Account',  icon: '🌙' },
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

const PatientApp: React.FC<Props> = ({ API, token, onBack }) => {
  const [tab, setTab] = useState<Tab>('home');
  const [patient, setPatient] = useState<PatientPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOracle, setShowOracle] = useState(false);

  // Fetch role + patient info on mount. Role gating already happened upstream
  // in Concierge.tsx, so we can assume role='patient' when we land here.
  useEffect(() => {
    fetch(`${API}/concierge/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.patient) setPatient(d.patient); })
      .finally(() => setLoading(false));
  }, [API, token]);

  // Auto-open oracle card once per day.
  useEffect(() => {
    if (!patient) return;
    try {
      const key = ORACLE_SEEN_KEY(patient.id, todayKey());
      if (!localStorage.getItem(key)) {
        setShowOracle(true);
        localStorage.setItem(key, '1');
      }
    } catch {}
  }, [patient]);

  const bookMeditation = useCallback(() => {
    setShowOracle(false);
    setTab('book');
  }, []);

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
          {tab === 'home'     && <HomeTab patient={patient} onOracle={() => setShowOracle(true)} onGo={setTab}/>}
          {tab === 'book'     && <BookTab API={API} token={token} patient={patient}/>}
          {tab === 'messages' && <StubTab title="Messages" icon="💬" blurb="Your secure encrypted thread with Dr. Anderson. Lab reviews, visit follow-ups, and general questions. Physician responds within 24 hours."/>}
          {tab === 'labs'     && <StubTab title="Lab Vault" icon="🧪" blurb="Upload labs (PDF/JPG/PNG, up to 25MB). Every record is HIPAA-tagged and reviewed by Dr. Anderson. Normal values in teal; flagged in blush pink."/>}
          {tab === 'account'  && <AccountTab API={API} token={token} patient={patient}/>}
        </div>
      </div>

      {/* Bottom tab bar — fixed, safe-area aware. */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:5,
        background:'rgba(255,255,255,0.85)',
        backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
        borderTop:'1px solid rgba(107,78,124,0.12)',
        paddingBottom:'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{display:'flex', maxWidth:'560px', margin:'0 auto'}}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex:1, border:'none', background:'transparent', cursor:'pointer',
                  padding:'10px 6px 12px 6px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
                  color: active ? DEEPP : 'rgba(107,78,124,0.55)',
                  fontFamily:'inherit',
                }}>
                <span style={{fontSize:'19px', opacity: active ? 1 : 0.75, transform: active ? 'scale(1.08)' : 'none', transition:'transform 180ms ease'}}>{t.icon}</span>
                <span style={{fontSize:'10px', fontWeight: active ? 800 : 600, letterSpacing:'0.4px'}}>{t.label}</span>
                {active && <span style={{width:'18px', height:'2px', borderRadius:'2px', background:TEAL, marginTop:'2px'}}/>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Oracle card overlay */}
      {showOracle && patient && (
        <OracleCard API={API} token={token} userName={firstName(patient.name)} onClose={() => setShowOracle(false)} onBookMeditation={bookMeditation}/>
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

const BetaDisclaimer: React.FC = () => (
  <div style={{background:'rgba(255,255,255,0.65)', border:'1px solid rgba(232,168,64,0.4)', borderRadius:'12px', padding:'8px 12px', display:'flex', alignItems:'flex-start', gap:'8px'}}>
    <span style={{fontSize:'14px', flexShrink:0}}>⚠️</span>
    <div style={{fontSize:'10px', color:'#8a5a10', lineHeight:1.5}}>
      <strong style={{color:'#6e4208'}}>Direct-pay · Not insurance · Not HIPAA compliant yet (beta).</strong> Do not enter identifying patient information. Emergencies — call 911.
    </div>
  </div>
);

// ───── HOME TAB ─────────────────────────────────────────────────────────────

const HomeTab: React.FC<{patient: PatientPayload | null; onOracle: () => void; onGo: (t: Tab) => void}> = ({ patient, onOracle, onGo }) => {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div>
      <div style={{padding:'24px 4px 8px 4px'}}>
        <div style={{fontSize:'26px', fontWeight:800, color:DEEPP, letterSpacing:'-0.3px', lineHeight:1.2}}>
          {greet}, {firstName(patient?.name || '')} <span style={{fontWeight:400}}>✨</span>
        </div>
        <div style={{fontSize:'13px', color:DEEPP, opacity:0.7, marginTop:'6px', lineHeight:1.6}}>
          Your care is personal, integrative, and always one tap away.
        </div>
      </div>

      {/* Daily Oracle teaser */}
      <button onClick={onOracle} style={{
        width:'100%', background:'linear-gradient(135deg, #1a0d35 0%, #4a2d6b 60%, #9e7bd4 100%)',
        border:'none', borderRadius:'20px', padding:'20px', color:'white', cursor:'pointer',
        textAlign:'left', boxShadow:'0 12px 30px rgba(107,78,124,0.28)', marginBottom:'14px',
        fontFamily:'inherit', position:'relative', overflow:'hidden',
      }}>
        <div style={{position:'absolute', top:'-6px', right:'-6px', opacity:0.25}}><ChoKuRei size={120} color="white" opacity={1}/></div>
        <div style={{fontSize:'10px', letterSpacing:'2.5px', textTransform:'uppercase', opacity:0.75, fontWeight:700}}>Daily Oracle Card</div>
        <div style={{fontSize:'18px', fontWeight:800, marginTop:'6px', lineHeight:1.3}}>Your card for today is ready</div>
        <div style={{fontSize:'12px', opacity:0.85, marginTop:'4px', fontStyle:'italic'}}>The Universe has a message for you ✨</div>
        <div style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:700, marginTop:'14px'}}>Pull today's card →</div>
      </button>

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
        <QuickTile icon="🌙"   label="Energy Log"    onClick={onOracle}                tint="#FAD9A8"/>
      </div>

      {/* Daily recommendation */}
      <Card style={{marginTop:'14px'}}>
        <Label>Today's integrative tip</Label>
        <div style={{marginTop:'6px', fontSize:'13px', color:DEEPP, lineHeight:1.7}}>
          Three slow exhales before opening your first message. Your nervous system reads a long exhale as safety — and your decisions for the rest of the day will be measured against it.
        </div>
      </Card>
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

const TrackerRow: React.FC<{icon:string; label:string; used:number; total:number; dots:boolean[]; color:string}> = ({ icon, label, used, total, dots, color }) => (
  <div>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:DEEPP, marginBottom:'6px'}}>
      <span style={{fontWeight:700}}>{icon} {label}</span>
      <span style={{opacity:0.75}}>{used} of {total} used</span>
    </div>
    <div style={{display:'flex', gap:'6px'}}>
      {dots.map((d, i) => (
        <div key={i} style={{flex:1, height:'10px', borderRadius:'999px', background: d ? color : `${color}28`, border: d ? `1px solid ${color}` : `1px dashed ${color}66`}}/>
      ))}
    </div>
  </div>
);

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

const BookTab: React.FC<{API:string; token:string; patient:PatientPayload|null}> = ({ API, token, patient }) => {
  const [service, setService] = useState<Service>('medical_visit');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;  // Mon-anchored
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  });
  const weekDays = useMemo(() => {
    return Array.from({length:5}).map((_, i) => {  // Mon-Fri only
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);
  // 8am to 8pm, 30-min slots.
  const SLOTS = useMemo(() => {
    const arr: {label:string; hour:number; min:number}[] = [];
    for (let h = 8; h < 20; h++) {
      for (const m of [0, 30]) {
        const hh = h % 12 === 0 ? 12 : h % 12;
        const ap = h < 12 ? 'AM' : 'PM';
        arr.push({ label: `${hh}:${m.toString().padStart(2,'0')} ${ap}`, hour: h, min: m });
      }
    }
    return arr;
  }, []);

  return (
    <div>
      <div style={{padding:'18px 4px 8px 4px'}}>
        <div style={{fontSize:'22px', fontWeight:800, color:DEEPP}}>Book a session</div>
        <div style={{fontSize:'12px', color:DEEPP, opacity:0.7, marginTop:'4px'}}>Mon–Fri, 8 AM – 8 PM MST. Confirmations sent by Dr. Anderson.</div>
      </div>

      {/* Service filter */}
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

      {patient && (
        <Card style={{marginBottom:'12px'}}>
          <Label>Your allowance this cycle</Label>
          <div style={{fontSize:'13px', color:DEEPP, marginTop:'4px'}}>
            {SERVICES.find(s => s.id === service)?.label === 'Guided Meditation'
              ? `${patient.meditations_used} of ${patient.meditations_allowed} used`
              : SERVICES.find(s => s.id === service)?.label === 'Medical Visit'
                ? `${patient.visits_used} of ${patient.visits_allowed} used`
                : 'Urgent same-day is à la carte unless you\'re on Ascend.'}
          </div>
        </Card>
      )}

      {/* Week navigator */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
          style={navBtn}>← Prev</button>
        <div style={{fontSize:'12px', color:DEEPP, fontWeight:700}}>
          Week of {weekStart.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
        </div>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
          style={navBtn}>Next →</button>
      </div>

      {/* Day grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px', marginBottom:'12px'}}>
        {weekDays.map(d => (
          <div key={d.toISOString()} style={{textAlign:'center', padding:'10px 4px', background:'rgba(255,255,255,0.6)', borderRadius:'12px', border:'1px solid rgba(107,78,124,0.12)'}}>
            <div style={{fontSize:'10px', color:DEEPP, opacity:0.65, letterSpacing:'1px', textTransform:'uppercase', fontWeight:700}}>{d.toLocaleDateString(undefined, {weekday:'short'})}</div>
            <div style={{fontSize:'18px', color:DEEPP, fontWeight:800, marginTop:'2px'}}>{d.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Slots — Phase 1a stub: show grid of slots, clicking one opens an
          intent confirmation. Backend POST to existing /concierge/appointments
          is Phase 1b so the patient side uses the right auth scope. */}
      <Card>
        <Label>Available slots</Label>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px,1fr))', gap:'6px', marginTop:'10px'}}>
          {SLOTS.slice(0, 16).map(s => (
            <button key={s.label} style={{
              background: PRIMARY, border:`1px solid ${TEAL}55`, color: DEEPP,
              borderRadius:'10px', padding:'10px 6px', fontSize:'12px', fontWeight:700, cursor:'pointer',
              fontFamily:'inherit',
            }} onClick={() => alert('Phase 1b will wire this to /concierge/appointments with the patient auth scope.')}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{fontSize:'11px', color:DEEPP, opacity:0.65, marginTop:'12px', lineHeight:1.5, textAlign:'center'}}>
          Booking confirmations arrive by secure message within minutes. HIPAA notice will appear at confirmation.
        </div>
      </Card>
    </div>
  );
};

// ───── ACCOUNT TAB ──────────────────────────────────────────────────────────

const AccountTab: React.FC<{API:string; token:string; patient:PatientPayload|null}> = ({ API, token, patient }) => {
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
        <Label>Billing & invoices</Label>
        <button onClick={openPortal} style={{...smallCtaStyle, marginTop:'10px'}}>Manage payment methods & invoices →</button>
      </Card>

      <Card style={{marginBottom:'12px'}}>
        <Label>HIPAA consent</Label>
        <div style={{fontSize:'12px', color:DEEPP, lineHeight:1.6, marginTop:'6px'}}>
          Full HIPAA compliance — including Business Associate Agreements — will be implemented before clinical launch. During beta, do not enter identifying information.
        </div>
      </Card>

      <Card>
        <Label>Danger zone</Label>
        <button style={{...smallCtaStyle, marginTop:'10px', color:'#a02020', borderColor:'rgba(224,80,80,0.3)'}} onClick={() => alert('Phase 1b: account-delete flow + grace period.')}>Delete account</button>
      </Card>
    </div>
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

// ───── STUB TAB ─────────────────────────────────────────────────────────────

const StubTab: React.FC<{title:string; icon:string; blurb:string}> = ({ title, icon, blurb }) => (
  <div style={{padding:'40px 20px', textAlign:'center'}}>
    <div style={{fontSize:'46px', marginBottom:'12px', opacity:0.8}}>{icon}</div>
    <div style={{fontSize:'22px', fontWeight:800, color:DEEPP, marginBottom:'6px'}}>{title}</div>
    <div style={{fontSize:'13px', color:DEEPP, opacity:0.75, lineHeight:1.7, maxWidth:'420px', margin:'0 auto'}}>{blurb}</div>
    <div style={{marginTop:'18px', display:'inline-block', padding:'6px 14px', borderRadius:'999px', background:`${TEAL}18`, color: TEAL, fontSize:'10px', fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase'}}>Live in Phase 1b</div>
  </div>
);

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

const LoadingShell: React.FC = () => (
  <div style={{minHeight:'100vh', background: BG_GRADIENT, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui'}}>
    <div style={{textAlign:'center', color:DEEPP}}>
      <div style={{fontSize:'36px', marginBottom:'8px'}}>✨</div>
      <div style={{fontSize:'13px', opacity:0.75}}>Opening your Concierge…</div>
    </div>
  </div>
);

export default PatientApp;
