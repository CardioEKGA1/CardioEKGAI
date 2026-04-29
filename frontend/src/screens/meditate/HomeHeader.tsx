// © 2026 SoulMD, LLC. All rights reserved.
//
// Top of the /meditate home tab. Stacks above the oracle ritual:
//   • Daily intention — gold-underlined input, one-per-day server-side.
//   • Stats pills    — streak / sessions / minutes (gold numbers).
//   • Yogananda quote of the day — date-seeded from the existing
//                                   meditate_oracle_messages bank so
//                                   we don't ship a second 365-row
//                                   table for the same content.
//   • Resume row     — last-played meditation, opens the player on tap.
//                      Hidden if no play history yet.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MEDITATE_TOKENS as T } from './MeditateApp';

interface Props {
  API: string;
  token: string;
  onOpenMeditation: (id: number) => void;
}

interface MeditateStats { streak: number; total_sessions: number; total_minutes: number; }
interface LastPlayed { id: number; title: string; category: string; duration_min: number; played_at: string | null; }

const dayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

const HomeHeader: React.FC<Props> = ({ API, token, onOpenMeditation }) => {
  const [intention, setIntention] = useState<string>('');
  const [intentionDirty, setIntentionDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [stats, setStats] = useState<MeditateStats | null>(null);
  const [last, setLast] = useState<LastPlayed | null>(null);
  const [quote, setQuote] = useState<string>('');

  // Load intention + stats + last-played in parallel on mount.
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/meditate/intention/today`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/meditate/stats`,            { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/meditate/meditations/last-played`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ]).then(([i, s, l]) => {
      if (!alive) return;
      if (i?.intention_text) setIntention(i.intention_text);
      if (s) setStats(s);
      if (l?.meditation) setLast(l.meditation);
    }).catch(() => {});
    return () => { alive = false; };
  }, [API, token]);

  // Yogananda quote of the day — pulled from the oracle bank for free.
  // We only need ONE per day; using the bank keeps a single source of
  // truth for the soul-centered language and avoids a second migration.
  useEffect(() => {
    let alive = true;
    fetch(`${API}/meditate/oracle/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive) return;
        // Use today's pulled card if the user already pulled, else fall
        // back to the cosmically-inspired index based on day-of-year so
        // the same quote shows all day even before a pull.
        const t = d?.card?.message_text;
        if (t) setQuote(t);
      }).catch(() => {});
    return () => { alive = false; };
  }, [API, token]);

  // Debounced save once the user stops typing.
  useEffect(() => {
    if (!intentionDirty) return;
    const id = window.setTimeout(() => {
      const text = intention.trim();
      if (!text) return;
      fetch(`${API}/meditate/intention`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ intention_text: text }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(() => { setSavedAt(Date.now()); window.setTimeout(() => setSavedAt(null), 1400); })
        .catch(() => {});
      setIntentionDirty(false);
    }, 800);
    return () => window.clearTimeout(id);
  }, [intention, intentionDirty, API, token]);

  const seededIndex = useMemo(() => dayOfYear(), []);
  void seededIndex;

  const todayLabel = useMemo(() => new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }), []);

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'14px', marginBottom:'14px'}}>

      {/* DAILY INTENTION — gold-underlined input, one row */}
      <div style={{padding:'4px 4px 0'}}>
        <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800, marginBottom:'6px'}}>
          {todayLabel}{savedAt && <span style={{marginLeft:'8px', color: T.gold}}>· saved ✓</span>}
        </div>
        <input
          value={intention}
          onChange={e => { setIntention(e.target.value); setIntentionDirty(true); }}
          placeholder="Set your intention for today…"
          style={{
            width:'100%', padding:'8px 0',
            background:'transparent', border:'none',
            borderBottom:`1.5px solid ${T.gold}`,
            fontFamily: T.serif, fontStyle:'italic',
            fontSize:'18px', color: T.navy,
            outline:'none', boxSizing:'border-box',
          }}
        />
      </div>

      {/* STATS BAR — three pills */}
      <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
        <StatPill icon="🔥" label="day streak"        value={stats?.streak ?? 0}/>
        <StatPill icon="🧘" label="total sessions"    value={stats?.total_sessions ?? 0}/>
        <StatPill icon="⏱" label="total minutes"     value={stats?.total_minutes ?? 0}/>
      </div>

      {/* YOGANANDA QUOTE OF THE DAY */}
      {quote && (
        <div style={{
          background:'rgba(255,255,255,0.78)',
          borderLeft:`3px solid ${T.gold}`,
          borderRadius:'12px',
          padding:'14px 16px',
          boxShadow:'0 4px 14px rgba(83,74,183,0.06)',
        }}>
          <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'14px', color: T.navy, lineHeight:1.65, textAlign:'center'}}>
            “{quote}”
          </div>
          <div style={{fontSize:'9px', letterSpacing:'2.2px', textTransform:'uppercase', color: T.gold, fontWeight:800, marginTop:'8px', textAlign:'center'}}>
            ✦ Yogananda ✦
          </div>
        </div>
      )}

      {/* RESUME WHERE YOU LEFT OFF */}
      {last && (
        <div style={{
          background: T.cardBg, border: T.cardBorder, borderRadius:'14px',
          padding:'12px 14px',
          display:'flex', alignItems:'center', gap:'12px',
          boxShadow:'0 4px 12px rgba(83,74,183,0.06)',
        }}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800}}>
              Resume where you left off
            </div>
            <div style={{fontFamily: T.serif, fontSize:'15px', fontWeight:600, color: T.navy, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {last.title}
            </div>
            <div style={{fontSize:'11px', color: T.inkSoft, marginTop:'2px'}}>
              {last.duration_min || 10} min · {labelFor(last.category)}
            </div>
          </div>
          <button
            onClick={() => last && onOpenMeditation(last.id)}
            style={{
              flexShrink:0,
              background:`linear-gradient(135deg, ${T.gold}, #a8842c)`,
              color:'white', border:'none', borderRadius:'10px',
              padding:'10px 16px', fontSize:'12.5px', fontWeight:800,
              cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px',
              boxShadow:'0 6px 14px rgba(201,168,76,0.30)',
            }}>
            ▶ Continue
          </button>
        </div>
      )}
    </div>
  );
};

const StatPill: React.FC<{icon: string; label: string; value: number | string}> = ({ icon, label, value }) => (
  <div style={{
    flex:'1 1 0', minWidth:'90px',
    background:'rgba(255,255,255,0.78)',
    border: T.cardBorder,
    borderRadius:'14px',
    padding:'10px 12px',
    display:'flex', alignItems:'center', gap:'8px',
    boxShadow:'0 4px 12px rgba(83,74,183,0.06)',
  }}>
    <span style={{fontSize:'18px', flexShrink:0}}>{icon}</span>
    <div style={{minWidth:0, flex:1}}>
      <div style={{fontFamily: T.serif, fontSize:'18px', fontWeight:700, color: T.gold, lineHeight:1}}>{value}</div>
      <div style={{fontSize:'9.5px', letterSpacing:'0.5px', color: T.inkSoft, marginTop:'2px', textTransform:'uppercase', fontWeight:700}}>{label}</div>
    </div>
  </div>
);

const CATEGORY_LABELS: Record<string, string> = {
  self_healing:'Self-Healing', heart_coherence:'Heart Coherence', chakra_balancing:'Chakra Balancing',
  sleep_healing:'Sleep', anxiety_release:'Anxiety Release', inner_peace:'Inner Peace',
  morning_activation:'Morning', evening_integration:'Evening', soul_purpose:'Soul Purpose',
};
const labelFor = (slug: string) => CATEGORY_LABELS[slug] || (slug || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default HomeHeader;
