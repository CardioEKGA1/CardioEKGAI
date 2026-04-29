// © 2026 SoulMD, LLC. All rights reserved.
// Diary feed for /meditate. Filter (all / week / month) + free-text
// search + chronological list. Tap an entry to expand inline. Add new
// entries via the parent-managed DiaryEntryForm overlay.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MEDITATE_TOKENS as T } from './MeditateApp';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Props {
  API: string;
  token: string;
  onAddEntry: () => void;
}

interface DiaryEntry {
  id: number;
  meditation_id: number | null;
  meditation_title: string;
  body_sensations: string;
  emotions_felt: string;
  visions_or_insights: string;
  general_reflection: string;
  mood_before: number | null;
  mood_after: number | null;
  gratitude_1?: string;
  gratitude_2?: string;
  gratitude_3?: string;
  created_at: string | null;
}

type Filter = 'all' | 'week' | 'month';

const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😐', 3: '🙂', 4: '😊', 5: '✨' };

const DiaryScreen: React.FC<Props> = ({ API, token, onAddEntry }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Debounced search.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    const qs = new URLSearchParams();
    qs.set('filter', filter);
    if (search) qs.set('search', search);
    fetch(`${API}/meditate/diary?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then(d => setEntries(d.entries || []))
      .catch(e => setErr(`Could not load diary: ${e.message || e}`))
      .finally(() => setLoading(false));
  }, [API, token, filter, search]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    // Bucket by YYYY-MM for a tidy section header layout.
    const out: { month: string; entries: DiaryEntry[] }[] = [];
    let cur: { month: string; entries: DiaryEntry[] } | null = null;
    for (const e of entries) {
      const m = (e.created_at || '').slice(0, 7);
      if (!cur || cur.month !== m) {
        cur = { month: m, entries: [] };
        out.push(cur);
      }
      cur.entries.push(e);
    }
    return out;
  }, [entries]);

  return (
    <div style={{padding:'4px 4px 24px'}}>
      {/* Action bar */}
      <div style={{display:'flex', gap:'8px', marginBottom:'10px', alignItems:'center'}}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search your diary…"
          style={{
            flex:1, padding:'10px 12px',
            borderRadius:'12px', border:`0.5px solid ${T.border}`,
            background:'rgba(255,255,255,0.78)',
            fontSize:'13px', color: T.ink, fontFamily:'inherit',
            outline:'none', boxSizing:'border-box',
          }}
        />
        <button onClick={onAddEntry}
          style={{
            flexShrink:0, padding:'10px 14px', borderRadius:'12px',
            background:`linear-gradient(135deg, ${T.gold}, #a8842c)`,
            color: T.navy, border:'none', fontSize:'12px', fontWeight:800,
            cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.4px',
          }}>
          + Entry
        </button>
      </div>

      {/* Mood timeline + monthly AI insight */}
      <MoodChartCard API={API} token={token}/>
      <MonthlyInsightCard API={API} token={token}/>

      {/* Filter pills */}
      <div style={{display:'flex', gap:'6px', marginBottom:'12px'}}>
        {(['all','week','month'] as Filter[]).map(f => {
          const active = filter === f;
          const label = f === 'all' ? 'All' : f === 'week' ? 'This Week' : 'This Month';
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding:'7px 14px', borderRadius:'999px',
                background: active ? `linear-gradient(135deg, ${T.purple}, ${T.navy})` : 'rgba(255,255,255,0.78)',
                color: active ? 'white' : T.ink,
                border: active ? 'none' : `0.5px solid ${T.border}`,
                fontSize:'11px', fontWeight: active ? 800 : 600, letterSpacing:'0.3px',
                cursor:'pointer', fontFamily:'inherit',
              }}>{label}</button>
          );
        })}
      </div>

      {err && (
        <div style={{padding:'12px 14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{err}</div>
      )}

      {loading ? (
        <div style={{padding:'40px', textAlign:'center', color: T.inkSoft, fontFamily: T.serif, fontStyle:'italic'}}>Loading entries…</div>
      ) : entries.length === 0 ? (
        <div style={{
          background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
          padding:'40px 20px', textAlign:'center',
        }}>
          <div style={{fontSize:'34px', marginBottom:'10px', opacity:0.55}}>📓</div>
          <div style={{fontFamily: T.serif, fontSize:'17px', color: T.navy, marginBottom:'6px'}}>
            No entries yet
          </div>
          <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.inkSoft, lineHeight:1.6, maxWidth:'320px', margin:'0 auto'}}>
            Complete a meditation, or tap "+ Entry" to write a standalone reflection.
          </div>
        </div>
      ) : (
        grouped.map(g => (
          <div key={g.month} style={{marginBottom:'18px'}}>
            <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.inkSoft, padding:'0 4px 8px', letterSpacing:'0.5px'}}>
              {monthLabel(g.month)}
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {g.entries.map(e => (
                <DiaryRow key={e.id}
                  entry={e}
                  expanded={expandedId === e.id}
                  onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const monthLabel = (m: string): string => {
  if (!m) return '';
  try {
    const d = new Date(m + '-01T00:00:00');
    return d.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  } catch { return m; }
};

const dayLabel = (iso: string | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  } catch { return iso; }
};

const DiaryRow: React.FC<{entry: DiaryEntry; expanded: boolean; onToggle: () => void}> = ({ entry, expanded, onToggle }) => {
  const before = entry.mood_before ? MOOD_EMOJI[entry.mood_before] : null;
  const after = entry.mood_after ? MOOD_EMOJI[entry.mood_after] : null;
  return (
    <button onClick={onToggle}
      style={{
        textAlign:'left', cursor:'pointer', fontFamily:'inherit',
        background: T.cardBg, border: T.cardBorder, borderRadius:'16px',
        padding:'14px 16px',
        boxShadow: expanded ? '0 12px 28px rgba(83,74,183,0.14)' : '0 4px 12px rgba(83,74,183,0.06)',
        display:'flex', flexDirection:'column', gap:'6px',
      }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:'10px'}}>
        <span style={{fontSize:'13px', fontWeight:800, color: T.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0}}>
          {entry.meditation_title || 'Standalone Entry'}
        </span>
        <span style={{fontSize:'10px', color: T.inkSoft, letterSpacing:'0.4px', flexShrink:0}}>{dayLabel(entry.created_at)}</span>
      </div>
      {(before || after) && (
        <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'15px'}}>
          {before && <span title="Mood before">{before}</span>}
          {(before && after) && <span style={{color: T.inkSoft, fontSize:'12px'}}>→</span>}
          {after && <span title="Mood after">{after}</span>}
        </div>
      )}
      {!expanded && entry.general_reflection && (
        <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.inkSoft, lineHeight:1.55, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2, overflow:'hidden'}}>
          “{entry.general_reflection}”
        </div>
      )}
      {expanded && (
        <div style={{marginTop:'10px', display:'flex', flexDirection:'column', gap:'10px'}}>
          {entry.body_sensations && <Section label="Body" text={entry.body_sensations}/>}
          {entry.emotions_felt && <Section label="Emotions" text={entry.emotions_felt}/>}
          {entry.visions_or_insights && <Section label="Visions / insights" text={entry.visions_or_insights}/>}
          {entry.general_reflection && <Section label="Reflection" text={entry.general_reflection}/>}
          {(entry.gratitude_1 || entry.gratitude_2 || entry.gratitude_3) && (
            <div>
              <div style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.gold, fontWeight:800, marginBottom:'2px'}}>
                Three Things I'm Grateful For
              </div>
              <ul style={{margin:0, paddingLeft:'18px', fontFamily: T.serif, fontSize:'13.5px', color: T.navy, lineHeight:1.65}}>
                {entry.gratitude_1 && <li>{entry.gratitude_1}</li>}
                {entry.gratitude_2 && <li>{entry.gratitude_2}</li>}
                {entry.gratitude_3 && <li>{entry.gratitude_3}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </button>
  );
};

const Section: React.FC<{label: string; text: string}> = ({ label, text }) => (
  <div>
    <div style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.purple, fontWeight:800, marginBottom:'2px'}}>
      {label}
    </div>
    <div style={{fontFamily: T.serif, fontSize:'13.5px', color: T.navy, lineHeight:1.65, whiteSpace:'pre-wrap'}}>
      {text}
    </div>
  </div>
);

// ───── Mood timeline + AI insight cards ──────────────────────────────────

interface MoodPoint { date: string | null; mood_before: number | null; mood_after: number | null; }

const MoodChartCard: React.FC<{API: string; token: string}> = ({ API, token }) => {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [series, setSeries] = useState<MoodPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API}/meditate/diary/mood-chart?range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setSeries(d?.series || []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [API, token, range]);

  const isEmpty = !loading && series.length === 0;

  return (
    <div style={{
      background: T.cardBg, border: T.cardBorder, borderRadius:'14px',
      padding:'14px', marginBottom:'10px',
      boxShadow:'0 4px 14px rgba(83,74,183,0.06)',
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
        <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800}}>
          Mood Timeline
        </div>
        <div style={{display:'flex', gap:'4px'}}>
          {(['week', 'month'] as const).map(r => {
            const active = range === r;
            return (
              <button key={r} onClick={() => setRange(r)}
                style={{
                  padding:'4px 10px', borderRadius:'999px',
                  background: active ? T.gold : 'transparent',
                  color: active ? 'white' : T.inkSoft,
                  border: active ? 'none' : `0.5px solid ${T.border}`,
                  fontSize:'10px', fontWeight: active ? 800 : 700, letterSpacing:'0.4px',
                  cursor:'pointer', fontFamily:'inherit', textTransform:'uppercase',
                }}>{r}</button>
            );
          })}
        </div>
      </div>
      {isEmpty ? (
        <div style={{padding:'18px 8px', textAlign:'center', color: T.inkSoft, fontFamily: T.serif, fontStyle:'italic', fontSize:'13px'}}>
          Log a few entries with mood-before / mood-after to see the timeline.
        </div>
      ) : (
        <div style={{width:'100%', height:'160px'}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{top:8, right:8, bottom:0, left:-12}}>
              <CartesianGrid stroke="rgba(83,74,183,0.08)" strokeDasharray="3 3"/>
              <XAxis dataKey="date" tick={{fontSize:10, fill: T.inkSoft}} tickFormatter={(d: string) => d ? d.slice(5) : ''}/>
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{fontSize:10, fill: T.inkSoft}}/>
              <Tooltip contentStyle={{borderRadius:10, border:`0.5px solid ${T.border}`, fontFamily:'inherit', fontSize:12}}/>
              <Legend wrapperStyle={{fontSize:10, paddingTop:4}}/>
              <Line type="monotone" dataKey="mood_before" name="Before" stroke="#9bb6e0" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="mood_after"  name="After"  stroke="#e0a8c0" strokeWidth={2} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const MonthlyInsightCard: React.FC<{API: string; token: string}> = ({ API, token }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/meditate/diary/insight`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setInsight(d?.insight || ''); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [API, token]);

  if (loading || !insight) return null;
  return (
    <div style={{
      background:'rgba(255,255,255,0.85)',
      border:`0.5px solid ${T.gold}66`,
      borderLeft:`3px solid ${T.gold}`,
      borderRadius:'14px',
      padding:'14px 16px',
      marginBottom:'14px',
      boxShadow:'0 4px 14px rgba(201,168,76,0.10)',
    }}>
      <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.gold, fontWeight:800, marginBottom:'6px'}}>
        ✦ Your Monthly Pattern
      </div>
      <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'14px', color: T.navy, lineHeight:1.65}}>
        {insight}
      </div>
    </div>
  );
};

void useMemo;

export default DiaryScreen;
