// © 2026 SoulMD, LLC. All rights reserved.
//
// "Past Messages" feed shown below the daily oracle ritual. Lists prior
// pulls with the cropped flower thumb + first message line; tap to
// expand the full message + saved reflection. A small "Favorites" pill
// flips the list to favorites-only. Heart icon toggles favorite per row.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MEDITATE_TOKENS as T } from './MeditateApp';
import { FlowerSprite } from '../../components/shared/FlowerSprite';

interface Props { API: string; token: string; }

interface OraclePull {
  id: number;
  date: string;
  message_id: number;
  message_text: string;
  flower_index: number;
  reflection: string;
  reflected_at: string | null;
  created_at: string;
  favorited?: boolean;
}

const OracleHistory: React.FC<Props> = ({ API, token }) => {
  const [pulls, setPulls] = useState<OraclePull[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('limit', '30');
    if (filter === 'favorites') qs.set('favorites_only', 'true');
    fetch(`${API}/meditate/oracle/history?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { pulls: [] })
      .then(d => setPulls(d.pulls || []))
      .finally(() => setLoading(false));
  }, [API, token, filter]);
  useEffect(() => { load(); }, [load]);

  const toggleFav = useCallback((p: OraclePull) => {
    fetch(`${API}/meditate/oracle/${p.id}/favorite`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setPulls(prev => prev.map(x => x.id === p.id ? { ...x, favorited: d.favorited } : x)
          .filter(x => filter !== 'favorites' || x.favorited));
      })
      .catch(() => {});
  }, [API, token, filter]);

  const empty = !loading && pulls.length === 0;

  return (
    <div style={{marginTop:'14px', padding:'4px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'10px'}}>
        <div style={{fontFamily: T.serif, fontSize:'18px', fontWeight:600, color: T.gold, letterSpacing:'-0.2px'}}>
          Past Messages
        </div>
        <div style={{display:'flex', gap:'6px'}}>
          {(['all', 'favorites'] as const).map(f => {
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding:'5px 12px', borderRadius:'999px',
                  background: active ? `linear-gradient(135deg, ${T.purple}, ${T.navy})` : 'rgba(255,255,255,0.78)',
                  color: active ? 'white' : T.ink,
                  border: active ? 'none' : T.cardBorder,
                  fontSize:'10px', fontWeight: active ? 800 : 600, letterSpacing:'0.4px',
                  cursor:'pointer', fontFamily:'inherit', textTransform:'uppercase',
                }}>
                {f === 'all' ? 'All' : '♥ Favorites'}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{padding:'24px', textAlign:'center', color: T.inkSoft, fontFamily: T.serif, fontStyle:'italic', fontSize:'13px'}}>Loading…</div>
      ) : empty ? (
        <div style={{
          background: T.cardBg, border: T.cardBorder, borderRadius:'14px',
          padding:'24px 18px', textAlign:'center',
        }}>
          <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.inkSoft}}>
            {filter === 'favorites' ? 'No favorites yet — heart a message above.' : 'Your oracle journey begins today.'}
          </div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {pulls.map(p => {
            const isOpen = expandedId === p.id;
            const fav = !!p.favorited;
            return (
              <div key={p.id} style={{
                background: T.cardBg, border: T.cardBorder, borderRadius:'14px',
                padding:'12px', boxShadow:'0 4px 12px rgba(83,74,183,0.06)',
              }}>
                <div onClick={() => setExpandedId(isOpen ? null : p.id)}
                  style={{display:'flex', alignItems:'center', gap:'12px', cursor:'pointer'}}>
                  <div style={{flexShrink:0, borderRadius:'10px', overflow:'hidden', boxShadow:'0 2px 8px rgba(83,74,183,0.10)'}}>
                    <FlowerSprite index={p.flower_index} size={56} borderRadius={10}/>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'10px', letterSpacing:'1px', color: T.inkSoft, fontWeight:700, textTransform:'uppercase'}}>
                      {dayLabel(p.date)}
                    </div>
                    <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13.5px', color: T.navy, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {firstSentence(p.message_text)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFav(p); }}
                    aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                    style={{background:'transparent', border:'none', cursor:'pointer', fontSize:'18px', color: fav ? '#E06A6A' : T.inkSoft, padding:'4px'}}>
                    {fav ? '♥' : '♡'}
                  </button>
                  <span style={{fontSize:'14px', color: T.inkSoft, opacity:0.5}}>{isOpen ? '−' : '›'}</span>
                </div>
                {isOpen && (
                  <div style={{marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(83,74,183,0.10)'}}>
                    <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13.5px', color: T.navy, lineHeight:1.65, whiteSpace:'pre-wrap'}}>
                      “{p.message_text}”
                    </div>
                    {p.reflection && (
                      <div style={{marginTop:'10px', padding:'10px 12px', background:'rgba(155,143,232,0.08)', borderRadius:'10px'}}>
                        <div style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.purple, fontWeight:800, marginBottom:'4px'}}>Your reflection</div>
                        <div style={{fontFamily: T.serif, fontStyle:'italic', fontSize:'13px', color: T.navy, lineHeight:1.55, whiteSpace:'pre-wrap'}}>{p.reflection}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const firstSentence = (text: string): string => {
  if (!text) return '';
  const cut = text.split(/(?<=[.?!])\s/, 1)[0];
  return (cut || text).slice(0, 110);
};
const dayLabel = (iso: string): string => {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }); }
  catch { return iso; }
};
void useMemo;

export default OracleHistory;
