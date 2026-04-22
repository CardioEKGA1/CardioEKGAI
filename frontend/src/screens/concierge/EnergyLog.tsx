// © 2026 SoulMD, LLC. All rights reserved.
// Energy Log — a soft timeline of past oracle pulls + reflections.
// Matches the Gabby-style ritual aesthetic: serif typography, warm opal
// palette, no gamification. Streak + monthly theme shown gently.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ChoKuRei from './ChoKuRei';

interface Card {
  id: number; category: string; category_label?: string; category_color?: string;
  title: string; body: string;
}
interface Pull {
  date: string;           // YYYY-MM-DD
  saved: boolean;
  intention: string;
  reflection: string;
  reflected_at: string | null;
  card: Card;
}
interface Summary {
  streak_days: number;
  this_month_count: number;
  this_month_top_category: string | null;
  this_month_top_category_label: string | null;
  this_month_top_category_color: string | null;
  month: string;          // YYYY-MM
}

interface Props { API: string; token: string; onClose: () => void; }

const WARM_BG   = 'radial-gradient(ellipse at 30% 20%, #fbeedd 0%, #f6d8c4 45%, #e9c4a4 100%)';
const GOLD      = '#d4a86b';
const INK       = '#4a3a2e';
const INK_SOFT  = '#6b5646';
const SERIF     = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

const monthLabel = (monthStr: string) => {
  // "2026-04" → "April 2026"
  try {
    const d = new Date(monthStr + '-01T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } catch { return monthStr; }
};
const dayLabel = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
};

const EnergyLog: React.FC<Props> = ({ API, token, onClose }) => {
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    const qs = filter === 'saved' ? '?saved_only=true' : '';
    fetch(`${API}/concierge/oracle/history${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setPulls(d.pulls || []); setSummary(d.summary || null); })
      .catch(() => setErr('Could not load your Energy Log.'))
      .finally(() => setLoading(false));
  }, [API, token, filter]);
  useEffect(() => { load(); }, [load]);

  // Group pulls by month for the timeline heading.
  const byMonth = useMemo(() => {
    const groups: Record<string, Pull[]> = {};
    for (const p of pulls) {
      const m = p.date.slice(0, 7);
      (groups[m] = groups[m] || []).push(p);
    }
    // Preserve newest-first insertion order; keys ordered by first appearance.
    return Object.entries(groups);
  }, [pulls]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:3200, overflow:'auto',
      background: WARM_BG, color: INK,
      fontFamily: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      padding:'clamp(24px,5vw,40px) clamp(20px,5vw,32px)',
    }}>
      {/* Soft watermarks */}
      <div aria-hidden style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0}}>
        <div style={{position:'absolute', top:'6%',  left:'-30px'}}><ChoKuRei size={210} color={GOLD} opacity={0.06}/></div>
        <div style={{position:'absolute', bottom:'8%', right:'-30px'}}><ChoKuRei size={180} color={GOLD} opacity={0.05}/></div>
      </div>

      <div style={{position:'relative', zIndex:1, maxWidth:'560px', margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px'}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.6)', border:'1px solid rgba(107,86,70,0.2)', borderRadius:'10px', padding:'7px 12px', fontSize:'12px', fontWeight:700, color:INK_SOFT, cursor:'pointer', fontFamily:'inherit'}}>← Back</button>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK_SOFT}}>Your journal</div>
        </div>

        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <div style={{fontFamily: SERIF, fontSize:'clamp(26px,6vw,34px)', fontWeight:600, color: INK, lineHeight:1.15, letterSpacing:'-0.3px'}}>
            Your Energy Log
          </div>
          <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: INK_SOFT, marginTop:'6px', lineHeight:1.6}}>
            A quiet record of the guidance you've received.
          </div>
        </div>

        {/* Summary card — streak + monthly theme */}
        {summary && pulls.length > 0 && (
          <div style={{
            background:'rgba(255,255,255,0.7)', borderRadius:'18px',
            border:'1px solid rgba(212,168,107,0.3)',
            padding:'18px 20px', marginBottom:'20px',
            boxShadow:'0 10px 26px rgba(212,168,107,0.15)',
            display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'14px',
          }}>
            <div>
              <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700}}>Streak</div>
              <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'17px', color: INK, marginTop:'4px', lineHeight:1.3}}>
                {summary.streak_days === 0 ? 'Begin again today' : `${summary.streak_days} day${summary.streak_days === 1 ? '' : 's'} of receiving guidance`}
              </div>
            </div>
            {summary.this_month_top_category_label && (
              <div style={{textAlign:'right', maxWidth:'60%'}}>
                <div style={{fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700}}>{monthLabel(summary.month)}</div>
                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK, marginTop:'4px', lineHeight:1.45}}>
                  This month the Universe spoke to you most about
                </div>
                <div style={{fontSize:'14px', fontWeight:700, color: summary.this_month_top_category_color || INK, marginTop:'2px', letterSpacing:'0.3px'}}>
                  {summary.this_month_top_category_label}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        {pulls.length > 0 && (
          <div style={{display:'flex', gap:'6px', marginBottom:'18px'}}>
            {(['all','saved'] as const).map(f => {
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    flex:1, background: active ? 'rgba(212,168,107,0.35)' : 'rgba(255,255,255,0.55)',
                    border: active ? '1px solid rgba(212,168,107,0.65)' : '1px solid rgba(107,86,70,0.15)',
                    borderRadius:'999px', padding:'9px 14px',
                    fontSize:'11px', fontWeight: active ? 800 : 600,
                    color: INK, cursor:'pointer', fontFamily:'inherit',
                    letterSpacing:'0.4px', textTransform:'uppercase',
                  }}>
                  {f === 'all' ? 'All days' : 'Saved reflections'}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div style={{textAlign:'center', padding:'40px', color: INK_SOFT, fontSize:'13px', fontFamily: SERIF, fontStyle:'italic'}}>Gathering your pulls…</div>
        ) : err ? (
          <div style={{textAlign:'center', padding:'40px', color:'#a85020', fontSize:'13px'}}>{err}</div>
        ) : pulls.length === 0 ? (
          <EmptyState filter={filter}/>
        ) : (
          <div>
            {byMonth.map(([month, list]) => (
              <div key={month} style={{marginBottom:'24px'}}>
                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'15px', color: INK_SOFT, letterSpacing:'0.5px', marginBottom:'12px', paddingLeft:'4px'}}>
                  {monthLabel(month)} · {list.length} pull{list.length === 1 ? '' : 's'}
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                  {list.map(p => {
                    const key = p.date;
                    const isOpen = expanded === key;
                    const catColor = p.card.category_color || GOLD;
                    return (
                      <button key={key} onClick={() => setExpanded(isOpen ? null : key)}
                        style={{
                          textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                          background:'rgba(255,255,255,0.78)',
                          border:'1px solid rgba(212,168,107,0.25)',
                          borderRadius:'16px', padding:'14px 16px',
                          boxShadow: isOpen ? '0 12px 28px rgba(212,168,107,0.2)' : '0 4px 12px rgba(212,168,107,0.08)',
                        }}>
                        <div style={{display:'flex', alignItems:'flex-start', gap:'12px'}}>
                          {/* Mini card */}
                          <div style={{
                            flexShrink:0, width:'48px', height:'62px',
                            background:'linear-gradient(180deg, #fff8ec, #f5e6cf)',
                            border:'1px solid rgba(212,168,107,0.35)', borderRadius:'8px',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow:'0 3px 8px rgba(107,78,41,0.12)',
                          }}>
                            <ChoKuRei size={22} color={GOLD} opacity={0.55}/>
                          </div>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: catColor, fontWeight:800}}>
                              {dayLabel(p.date)}
                            </div>
                            <div style={{fontFamily: SERIF, fontSize:'16px', fontWeight:600, color: INK, marginTop:'2px', lineHeight:1.3}}>{p.card.title}</div>
                            <div style={{fontSize:'11px', color: INK_SOFT, opacity:0.85, marginTop:'3px', letterSpacing:'0.3px'}}>{p.card.category_label}</div>
                            {p.saved && p.reflection && !isOpen && (
                              <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'12px', color: INK_SOFT, marginTop:'8px', lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2, overflow:'hidden'}}>
                                “{p.reflection}”
                              </div>
                            )}
                          </div>
                          <span style={{fontSize:'14px', color: INK_SOFT, opacity:0.55, marginTop:'4px'}}>{isOpen ? '–' : '+'}</span>
                        </div>

                        {isOpen && (
                          <div style={{marginTop:'14px', paddingTop:'14px', borderTop:'1px solid rgba(212,168,107,0.2)'}}>
                            {p.intention && (
                              <div style={{marginBottom:'12px'}}>
                                <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700}}>You asked about</div>
                                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', color: INK, marginTop:'3px', lineHeight:1.55}}>{p.intention}</div>
                              </div>
                            )}
                            <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700}}>Message</div>
                            <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK, marginTop:'4px', lineHeight:1.6}}>{p.card.body}</div>

                            {p.reflection ? (
                              <div style={{marginTop:'14px'}}>
                                <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: INK_SOFT, fontWeight:700}}>Your reflection</div>
                                <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'14px', color: INK, marginTop:'4px', lineHeight:1.65, whiteSpace:'pre-wrap'}}>{p.reflection}</div>
                              </div>
                            ) : (
                              <div style={{fontSize:'11px', color: INK_SOFT, opacity:0.7, marginTop:'12px', fontFamily: SERIF, fontStyle:'italic'}}>
                                You did not journal this day.
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{textAlign:'center', fontFamily: SERIF, fontStyle:'italic', fontSize:'11px', color: INK_SOFT, opacity:0.7, marginTop:'20px', padding:'8px 0 20px'}}>
          Only you can see this log.
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{filter: 'all' | 'saved'}> = ({ filter }) => (
  <div style={{textAlign:'center', padding:'60px 20px', color: INK_SOFT}}>
    <div style={{fontSize:'36px', marginBottom:'14px', opacity:0.7}}>🌙</div>
    <div style={{fontFamily: SERIF, fontSize:'19px', fontWeight:600, color: INK, marginBottom:'8px'}}>
      {filter === 'saved' ? 'No saved reflections yet' : 'Your log is waiting to be filled'}
    </div>
    <div style={{fontFamily: SERIF, fontStyle:'italic', fontSize:'13px', lineHeight:1.6, maxWidth:'340px', margin:'0 auto'}}>
      {filter === 'saved'
        ? 'Save a reflection after your next daily pull and it will appear here — tender, private, yours.'
        : 'Open today\'s card, sit with the message, and begin the practice.'}
    </div>
  </div>
);

export default EnergyLog;
