// © 2026 SoulMD, LLC. All rights reserved.
// Patient Energy Log — daily 1-5 self-check, weekly bar chart, AI insight,
// and a feed that interleaves energy entries with post-meditation
// reflections. Pearl + lavender + rose palette to match the patient PWA.
//
// Layout sections, top to bottom:
//   1. Weekly bar chart (Mon–Sun) with mood-tagged bars
//   2. Today's check-in (5-pill scale + free text + dictate)
//   3. Stats grid (streak / avg / total / most common mood)
//   4. AI insight (Claude pattern observation, 30-day window)
//   5. Saved Reflections — interleaved entries + post-meditation journals
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DictationButton from '../../DictationButton';
import PostMeditationJournal from './PostMeditationJournal';

interface Props { API: string; token: string; onClose: () => void; }

interface EnergyEntry {
  id: number;
  date: string;          // YYYY-MM-DD
  energy_score: number;  // 1-5
  mood_label: string;
  note: string;
  session_id: number | null;
  created_at: string;
}
interface JournalReflection {
  id: number;
  date: string;
  meditation_id: number | null;
  meditation_title: string;
  mood_shift: string;
  reflection: string;
  intention: string;
  created_at: string;
}

// Palette (exact spec values).
const BG       = '#E0F4FA';
const BLUE_GR  = 'linear-gradient(135deg, #C5E8F4, #a8d5e8)';
const PINK_GR  = 'linear-gradient(135deg, #f0c8d8, #e0a8c0)';
const CARD_BG  = 'rgba(255,255,255,0.72)';
const CARD_BR  = '0.5px solid rgba(180,210,230,0.4)';
const TEXT     = '#2a4a6a';
const SUBTLE   = '#7090a0';
const PURPLE   = '#9b8fe8';
const DEEPP    = '#6b4e7c';
const SERIF    = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

const MOOD_PILLS: {score: number; label: string}[] = [
  { score: 1, label: 'Struggling' },
  { score: 2, label: 'Low' },
  { score: 3, label: 'Okay' },
  { score: 4, label: 'Good' },
  { score: 5, label: 'Thriving' },
];

// Monday-anchored week so the chart reads Mon → Sun like the spec.
const startOfWeekMon = (d: Date): Date => {
  const out = new Date(d); out.setHours(0,0,0,0);
  const day = out.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
};
const isoDay = (d: Date) => d.toISOString().slice(0,10);
const dayShort = (d: Date) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(d.getDay() + 6) % 7];

const EnergyLog: React.FC<Props> = ({ API, token, onClose }) => {
  const [entries, setEntries] = useState<EnergyEntry[]>([]);
  const [reflections, setReflections] = useState<JournalReflection[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showJournal, setShowJournal] = useState(false);

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeekMon(today), [today]);
  const weekDates = useMemo(() => Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/concierge/me/energy?days=60`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { entries: [], reflections: [] })
      .then(d => {
        setEntries(d.entries || []);
        setReflections(d.reflections || []);
      })
      .finally(() => setLoading(false));
  }, [API, token]);

  useEffect(() => { load(); }, [load]);

  // AI insight — fetched lazily after the first list load so the panel
  // appears only when there's data worth summarizing.
  useEffect(() => {
    if (entries.length < 3) { setInsight(''); return; }
    fetch(`${API}/concierge/me/energy/insight`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { insight: '' })
      .then(d => setInsight(d.insight || ''))
      .catch(() => {});
  }, [API, token, entries.length]);

  const todayKey = useMemo(() => isoDay(today), [today]);
  const todayEntry = useMemo(() => entries.find(e => e.date === todayKey) || null, [entries, todayKey]);

  // Build the weekly bar payload — each slot knows whether the day was an
  // energy entry, a meditation-tagged entry, or empty.
  const weekBars = useMemo(() => {
    const meditationDateSet = new Set(reflections.map(r => r.date));
    return weekDates.map(d => {
      const key = isoDay(d);
      const e = entries.find(x => x.date === key);
      const isMed = !!e?.session_id || meditationDateSet.has(key);
      const kind: 'med' | 'energy' | 'empty' = e ? (isMed ? 'med' : 'energy') : 'empty';
      return {
        date: key,
        label: dayShort(d),
        score: e?.energy_score || 0,
        kind,
        isToday: key === todayKey,
      };
    });
  }, [entries, reflections, weekDates, todayKey]);

  // Stats — computed across all loaded entries (last ~60 days).
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return { streak: 0, avg: 0, total: 0, topMood: '—' };
    }
    const total = entries.length;
    const avg = entries.reduce((s, e) => s + e.energy_score, 0) / total;
    const counts = new Map<number, number>();
    entries.forEach(e => counts.set(e.energy_score, (counts.get(e.energy_score) || 0) + 1));
    let topScore = 0, topCount = 0;
    counts.forEach((c, s) => { if (c > topCount) { topScore = s; topCount = c; } });
    const topMoodLabel = MOOD_PILLS.find(p => p.score === topScore)?.label || '—';

    // Streak: consecutive days ending today (or yesterday if no entry today).
    const dateSet = new Set(entries.map(e => e.date));
    let streak = 0;
    let cursor = new Date(today); cursor.setHours(0,0,0,0);
    if (!dateSet.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(isoDay(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { streak, avg, total, topMood: topMoodLabel };
  }, [entries, today]);

  // Recent feed — interleave energy entries + reflections, last 7.
  const recent = useMemo(() => {
    type Row = { kind: 'energy'; e: EnergyEntry } | { kind: 'reflection'; r: JournalReflection };
    const rows: Row[] = [
      ...entries.map(e => ({ kind: 'energy' as const, e })),
      ...reflections.map(r => ({ kind: 'reflection' as const, r })),
    ];
    rows.sort((a, b) => {
      const ad = a.kind === 'energy' ? a.e.created_at : a.r.created_at;
      const bd = b.kind === 'energy' ? b.e.created_at : b.r.created_at;
      return bd.localeCompare(ad);
    });
    return rows.slice(0, 8);
  }, [entries, reflections]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3200, overflow:'auto',
      background: BG, color: TEXT,
      fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(16px,5vw,28px) clamp(14px,5vw,22px) calc(40px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{maxWidth:'560px', margin:'0 auto'}}>
        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px'}}>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.78)', border:'1px solid rgba(107,78,124,0.15)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:DEEPP, cursor:'pointer', fontFamily:'inherit'}}>
            ← Back
          </button>
          <div style={{fontSize:'11px', color:SUBTLE, letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:700}}>
            Energy Log
          </div>
          <button onClick={() => setShowJournal(true)}
            style={{background:`linear-gradient(135deg, ${PURPLE}, ${DEEPP})`, color:'white', border:'none', borderRadius:'10px', padding:'7px 12px', fontSize:'11px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px'}}>
            + Add reflection
          </button>
        </div>

        {/* Title */}
        <div style={{marginBottom:'18px'}}>
          <div style={{fontFamily:SERIF, fontSize:'28px', fontWeight:600, color:TEXT, letterSpacing:'-0.3px'}}>
            Your Energy Log
          </div>
          <div style={{fontFamily:SERIF, fontStyle:'italic', fontSize:'13px', color:SUBTLE, marginTop:'4px'}}>
            A quiet record of how each day felt.
          </div>
        </div>

        {/* 1. Weekly bar chart */}
        <Section title="This week">
          <WeeklyChart bars={weekBars}/>
          <ChartLegend/>
        </Section>

        {/* 2. Today's check-in */}
        <TodayCheckIn
          API={API} token={token}
          today={today}
          existing={todayEntry}
          onSaved={load}
        />

        {/* 3. Stats grid */}
        <StatsGrid streak={stats.streak} avg={stats.avg} total={stats.total} topMood={stats.topMood}/>

        {/* 4. AI insight */}
        {insight && (
          <div style={{
            background:'rgba(255,255,255,0.78)', border: CARD_BR,
            borderLeft:`3px solid ${PURPLE}`,
            borderRadius:'18px', padding:'14px 16px', marginBottom:'16px',
            boxShadow:'0 6px 18px rgba(155,143,232,0.12)',
          }}>
            <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:DEEPP, fontWeight:800, marginBottom:'6px'}}>
              Pattern noticed
            </div>
            <div style={{fontFamily:SERIF, fontStyle:'italic', fontSize:'14px', color:TEXT, lineHeight:1.65}}>
              {insight}
            </div>
          </div>
        )}

        {/* 5. Recent entries */}
        <Section title="Saved reflections">
          {loading ? (
            <div style={{textAlign:'center', padding:'24px', color:SUBTLE, fontSize:'13px'}}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={{
              background: CARD_BG, border: CARD_BR, borderRadius:'18px',
              padding:'28px 18px', textAlign:'center', color:SUBTLE, fontSize:'13px',
            }}>
              <div style={{fontFamily:SERIF, fontSize:'16px', color:TEXT, marginBottom:'6px'}}>Nothing yet</div>
              <div style={{fontFamily:SERIF, fontStyle:'italic'}}>Log today's energy or add a reflection above.</div>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {recent.map((row, i) => row.kind === 'energy'
                ? <EnergyRow key={`e-${row.e.id}-${i}`} entry={row.e}/>
                : <ReflectionRow key={`r-${row.r.id}-${i}`} entry={row.r}/>
              )}
            </div>
          )}
        </Section>

        <div style={{textAlign:'center', fontFamily:SERIF, fontStyle:'italic', fontSize:'11px', color:SUBTLE, opacity:0.75, marginTop:'18px'}}>
          Only you and Dr. Anderson can see this log.
        </div>
      </div>

      {showJournal && (
        <PostMeditationJournal
          API={API} token={token}
          meditationId={null}
          onClose={() => setShowJournal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

// ───── Weekly bar chart ───────────────────────────────────────────────────

const WeeklyChart: React.FC<{bars: {date:string; label:string; score:number; kind:'energy'|'med'|'empty'; isToday:boolean}[]}> = ({ bars }) => {
  const max = 5;
  return (
    <div style={{
      background: CARD_BG, border: CARD_BR, borderRadius:'20px',
      padding:'18px 14px 14px', boxShadow:'0 6px 18px rgba(165,200,220,0.18)',
    }}>
      <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', height:'130px', gap:'6px'}}>
        {bars.map(b => {
          const filled = b.kind !== 'empty';
          const bg = b.kind === 'med' ? PINK_GR : b.kind === 'energy' ? BLUE_GR : 'rgba(180,210,230,0.18)';
          const heightPct = filled ? (b.score / max) * 100 : 12;
          return (
            <div key={b.date} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', position:'relative'}}>
              <div style={{
                width:'100%', borderRadius:'10px',
                background: bg,
                height:`${Math.max(filled ? 28 : 14, heightPct)}%`,
                minHeight: filled ? '28px' : '14px',
                display:'flex', alignItems:'flex-start', justifyContent:'center',
                paddingTop: filled ? '6px' : 0,
                color: filled ? TEXT : 'transparent',
                fontSize:'13px', fontWeight:800,
                border: b.isToday ? `1px solid ${PURPLE}` : '0.5px solid rgba(180,210,230,0.45)',
                boxShadow: filled ? '0 3px 8px rgba(165,200,220,0.25)' : 'none',
                position:'relative',
              }}>
                {filled ? b.score : ''}
                {filled && (
                  <span aria-hidden style={{position:'absolute', top:4, right:6, fontSize:'10px', color:'rgba(255,255,255,0.85)'}}>✦</span>
                )}
              </div>
              <div style={{fontSize:'10px', letterSpacing:'1px', color: b.isToday ? DEEPP : SUBTLE, fontWeight: b.isToday ? 800 : 700}}>
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChartLegend: React.FC = () => (
  <div style={{display:'flex', justifyContent:'center', gap:'14px', marginTop:'10px', fontSize:'10px', color:SUBTLE, fontWeight:700, letterSpacing:'0.3px'}}>
    <Swatch gradient={BLUE_GR} label="Energy"/>
    <Swatch gradient={PINK_GR} label="Reiki / meditation"/>
    <Swatch gradient="rgba(180,210,230,0.45)" label="No entry"/>
  </div>
);
const Swatch: React.FC<{gradient: string; label: string}> = ({ gradient, label }) => (
  <span style={{display:'inline-flex', alignItems:'center', gap:'6px'}}>
    <span style={{width:'10px', height:'10px', borderRadius:'3px', background: gradient, border:'0.5px solid rgba(180,210,230,0.5)'}}/>
    {label}
  </span>
);

// ───── Today's check-in ────────────────────────────────────────────────────

const TodayCheckIn: React.FC<{
  API: string; token: string;
  today: Date;
  existing: EnergyEntry | null;
  onSaved: () => void;
}> = ({ API, token, today, existing, onSaved }) => {
  const [score, setScore] = useState<number>(existing?.energy_score || 0);
  const [note,  setNote]  = useState<string>(existing?.note || '');
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');

  // Re-sync when the upstream load swaps in a new "today" row.
  useEffect(() => {
    setScore(existing?.energy_score || 0);
    setNote(existing?.note || '');
  }, [existing?.id, existing?.energy_score, existing?.note]);

  const dictate = (chunk: string) =>
    setNote(v => (v + (v && !v.endsWith(' ') ? ' ' : '') + chunk).trimStart());

  const save = async () => {
    if (!score) { setError('Pick how today feels first.'); return; }
    setError(''); setSaving(true);
    try {
      const res = await fetch(`${API}/concierge/me/energy`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ energy_score: score, note: note.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Could not save.');
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: PINK_GR, borderRadius:'20px',
      padding:'18px 18px 20px', marginBottom:'16px',
      border:'0.5px solid rgba(224,168,192,0.45)',
      boxShadow:'0 12px 28px rgba(224,168,192,0.22)',
      position:'relative', overflow:'hidden',
    }}>
      <span aria-hidden style={{position:'absolute', top:10, right:14, fontSize:'14px', color:'rgba(255,255,255,0.85)'}}>✦</span>
      <span aria-hidden style={{position:'absolute', bottom:14, right:30, fontSize:'10px', color:'rgba(255,255,255,0.65)'}}>✦</span>

      <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:DEEPP, fontWeight:800, marginBottom:'4px'}}>
        Today's energy · {today.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'})}
      </div>
      <div style={{fontFamily:SERIF, fontSize:'18px', color:TEXT, marginBottom:'12px', fontStyle: existing ? 'normal' : 'italic'}}>
        {existing ? 'Your check-in for today' : 'How does this moment feel?'}
      </div>

      {/* 1-5 pills */}
      <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px'}}>
        {MOOD_PILLS.map(p => {
          const active = score === p.score;
          return (
            <button key={p.score} type="button" onClick={() => setScore(p.score)}
              style={{
                flex:'1 1 calc(20% - 6px)', minWidth:'70px',
                padding:'9px 10px', borderRadius:'14px',
                border: active ? '1px solid rgba(255,255,255,0.95)' : '0.5px solid rgba(255,255,255,0.55)',
                background: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
                color: active ? DEEPP : TEXT,
                fontSize:'12px', fontWeight: active ? 800 : 700,
                cursor:'pointer', fontFamily:'inherit',
                boxShadow: active ? '0 6px 14px rgba(107,78,124,0.18)' : 'none',
              }}>
              <div style={{fontSize:'14px', marginBottom:'2px'}}>{p.score}</div>
              <div style={{fontSize:'10px', letterSpacing:'0.3px'}}>{p.label}</div>
            </button>
          );
        })}
      </div>

      {/* Note + dictation */}
      <div style={{position:'relative'}}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What's on your mind today? (optional)"
          style={{
            width:'100%', minHeight:'82px',
            padding:'12px 56px 12px 14px',
            borderRadius:'14px',
            border:'0.5px solid rgba(255,255,255,0.6)',
            background:'rgba(255,255,255,0.85)',
            color:TEXT, fontSize:'13px', lineHeight:1.55,
            fontFamily:'inherit', resize:'vertical', outline:'none',
            boxSizing:'border-box',
          }}
        />
        <div style={{position:'absolute', right:10, bottom:10}}>
          <DictationButton accent="purple" size={36} fallbackWhenUnsupported onTranscript={dictate}/>
        </div>
      </div>

      {error && <div style={{color:'#7a1a1a', fontSize:'12px', marginTop:'8px', fontWeight:700}}>{error}</div>}

      <button onClick={save} disabled={saving}
        style={{
          width:'100%', marginTop:'14px',
          padding:'13px 16px', borderRadius:'999px',
          border:'none', cursor: saving ? 'wait' : 'pointer',
          background: `linear-gradient(135deg, #C5E8F4, ${PURPLE} 65%, ${DEEPP})`,
          color:'white', fontSize:'13px', fontWeight:800,
          letterSpacing:'0.5px', fontFamily:'inherit',
          boxShadow:'0 10px 22px rgba(107,78,124,0.22)',
          opacity: saving ? 0.7 : 1,
        }}>
        {saving ? 'Saving…' : savedTick ? 'Saved ✓' : (existing ? 'Update today\'s check-in' : 'Save today\'s check-in')}
      </button>
    </div>
  );
};

// ───── Stats grid ──────────────────────────────────────────────────────────

const StatsGrid: React.FC<{streak:number; avg:number; total:number; topMood:string}> = ({ streak, avg, total, topMood }) => {
  // Alternating blue/pink so the 2x2 has visual rhythm. Sparkle in top-right.
  const tiles: {label:string; value:string; gradient:string}[] = [
    { label: 'Day streak',       value: `${streak}`,           gradient: BLUE_GR },
    { label: 'Avg energy',       value: avg ? avg.toFixed(1) : '—', gradient: PINK_GR },
    { label: 'Total entries',    value: `${total}`,            gradient: PINK_GR },
    { label: 'Most common mood', value: topMood,               gradient: BLUE_GR },
  ];
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px'}}>
      {tiles.map(t => (
        <div key={t.label} style={{
          background: t.gradient, borderRadius:'20px',
          border:'0.5px solid rgba(255,255,255,0.7)',
          padding:'16px 14px', position:'relative', overflow:'hidden',
          boxShadow:'0 8px 18px rgba(165,200,220,0.18)',
          minHeight:'92px',
        }}>
          <span aria-hidden style={{position:'absolute', top:8, right:10, fontSize:'14px', color:'rgba(255,255,255,0.85)'}}>✦</span>
          <span aria-hidden style={{position:'absolute', bottom:6, right:18, fontSize:'10px', color:'rgba(255,255,255,0.6)'}}>✦</span>
          <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color:DEEPP, fontWeight:800}}>
            {t.label}
          </div>
          <div style={{fontFamily:SERIF, fontSize:'26px', color:TEXT, fontWeight:600, marginTop:'8px', lineHeight:1.1}}>
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
};

// ───── Recent feed rows ────────────────────────────────────────────────────

const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
  <div style={{marginBottom:'18px'}}>
    <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:DEEPP, fontWeight:800, padding:'0 4px 8px'}}>
      {title}
    </div>
    {children}
  </div>
);

const dayLabel = (iso: string) => {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}); }
  catch { return iso; }
};

const EnergyRow: React.FC<{entry: EnergyEntry}> = ({ entry }) => (
  <div style={{
    background: CARD_BG, border: CARD_BR, borderRadius:'18px',
    padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:'12px',
    boxShadow:'0 4px 12px rgba(165,200,220,0.12)',
  }}>
    <Avatar gradient={BLUE_GR} score={entry.energy_score}/>
    <div style={{flex:1, minWidth:0}}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px'}}>
        <span style={{fontSize:'12px', fontWeight:800, color:TEXT}}>{entry.mood_label || `Energy ${entry.energy_score}/5`}</span>
        <span style={{fontSize:'10px', color:SUBTLE, letterSpacing:'0.4px'}}>{dayLabel(entry.date)}</span>
      </div>
      {entry.note && (
        <div style={{fontFamily:SERIF, fontStyle:'italic', fontSize:'13px', color:TEXT, marginTop:'4px', lineHeight:1.55, whiteSpace:'pre-wrap'}}>
          “{entry.note}”
        </div>
      )}
    </div>
  </div>
);

const ReflectionRow: React.FC<{entry: JournalReflection}> = ({ entry }) => {
  const moodMap: Record<string, string> = {
    much_better: 'Much better',
    a_little_better: 'A little better',
    same: 'About the same',
    processing: 'Still processing',
  };
  const mood = entry.mood_shift ? moodMap[entry.mood_shift] || entry.mood_shift : '';
  return (
    <div style={{
      background: CARD_BG, border: CARD_BR, borderRadius:'18px',
      padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:'12px',
      boxShadow:'0 4px 12px rgba(224,168,192,0.18)',
    }}>
      <Avatar gradient={PINK_GR} sparkle/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px'}}>
          <span style={{fontSize:'12px', fontWeight:800, color:TEXT}}>
            {entry.meditation_title || 'Post-meditation'}
          </span>
          <span style={{fontSize:'10px', color:SUBTLE, letterSpacing:'0.4px'}}>{dayLabel(entry.date)}</span>
        </div>
        <div style={{display:'inline-flex', gap:'6px', alignItems:'center', marginTop:'4px'}}>
          <span style={{fontSize:'9px', fontWeight:800, padding:'2px 8px', borderRadius:'999px', background:'rgba(155,143,232,0.18)', color:DEEPP, letterSpacing:'0.5px', textTransform:'uppercase'}}>
            After meditation
          </span>
          {mood && <span style={{fontSize:'10px', color:SUBTLE, fontWeight:700}}>· {mood}</span>}
        </div>
        {entry.reflection && (
          <div style={{fontFamily:SERIF, fontStyle:'italic', fontSize:'13px', color:TEXT, marginTop:'6px', lineHeight:1.55, whiteSpace:'pre-wrap'}}>
            “{entry.reflection}”
          </div>
        )}
        {entry.intention && (
          <div style={{fontSize:'12px', color:SUBTLE, marginTop:'6px', lineHeight:1.5, whiteSpace:'pre-wrap'}}>
            <b style={{color:DEEPP, fontSize:'10px', letterSpacing:'1px', textTransform:'uppercase', marginRight:'6px'}}>Intention</b>
            {entry.intention}
          </div>
        )}
      </div>
    </div>
  );
};

const Avatar: React.FC<{gradient: string; score?: number; sparkle?: boolean}> = ({ gradient, score, sparkle }) => (
  <div style={{
    flexShrink:0, width:'36px', height:'36px', borderRadius:'50%',
    background: gradient, border:'0.5px solid rgba(255,255,255,0.7)',
    display:'flex', alignItems:'center', justifyContent:'center',
    color:TEXT, fontWeight:800, fontSize:'13px',
    boxShadow:'0 3px 8px rgba(165,200,220,0.18)',
    position:'relative',
  }}>
    {score ? score : sparkle ? <span aria-hidden style={{color:'white', fontSize:'12px'}}>✦</span> : ''}
  </div>
);

export default EnergyLog;
