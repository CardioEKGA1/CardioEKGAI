// © 2026 SoulMD, LLC. All rights reserved.
// Meditation library for /meditate. Reads from the shared
// concierge_meditations table via /meditate/meditations so the same
// 2k+ scripts power both the concierge PWA and this app.
//
// Layout: horizontal-scrolling category pills + search input + grid of
// cards. Tap a card to open MeditationPlayer (parent-managed overlay).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MEDITATE_TOKENS as T } from './MeditateApp';

interface Props {
  API: string;
  token: string;
  onOpenMeditation: (id: number) => void;
}

interface Meditation {
  id: number;
  title: string;
  category: string;
  duration_min: number;
  description: string;
  difficulty: string | null;
  script_preview: string;
}

interface Category {
  slug: string;
  count: number;
}

// Soft humanize for category slugs the backend hasn't been given a label
// for. The concierge MeditationsLibrary has a richer mapping; we mirror
// the most common ones here so the pills feel polished without pulling
// in the whole table.
const CATEGORY_LABELS: Record<string, string> = {
  self_healing: 'Self-Healing',
  energy_balance: 'Energy Balance',
  gratitude: 'Gratitude',
  inner_peace: 'Inner Peace',
  wellness: 'Wellness',
  integrative_health: 'Integrative Health',
  self_love: 'Self-Love',
  release: 'Release',
  growth: 'Growth',
  divine_guidance: 'Divine Guidance',
  divine_light_healing: 'Divine Light',
  universe_surrender: 'Surrender',
  vortex_alignment: 'Vortex',
  quantum_healing: 'Quantum',
  subconscious_healing: 'Subconscious',
  chakra_balancing: 'Chakra Balancing',
  heart_coherence: 'Heart Coherence',
  morning_activation: 'Morning',
  evening_integration: 'Evening',
  sleep_healing: 'Sleep',
  anxiety_release: 'Anxiety Release',
  grief_and_loss: 'Grief & Loss',
  chronic_pain: 'Chronic Pain',
  immune_boost: 'Immune Boost',
  cardiovascular: 'Cardiovascular',
  kidney_and_detox: 'Kidney & Detox',
  neurological: 'Neurological',
  oncology_support: 'Oncology',
  autoimmune: 'Autoimmune',
  soul_purpose: 'Soul Purpose',
};
const labelFor = (slug: string) => CATEGORY_LABELS[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const LibraryScreen: React.FC<Props> = ({ API, token, onOpenMeditation }) => {
  const [meds, setMeds] = useState<Meditation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  // 'favorites' is a synthetic category — handled separately from the
  // real category filter, calls /meditate/meditations/favorites.
  const [category, setCategory] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Bookmark state — fetched once; toggled per card.
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // Recently played + recommendations rows.
  const [recent, setRecent] = useState<Meditation[]>([]);
  const [recommended, setRecommended] = useState<Meditation[]>([]);

  // Debounce the search input — typing is faster than the backend can
  // round-trip 60 rows.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    if (category === 'favorites') {
      // Favorites use a dedicated endpoint that returns full row data.
      fetch(`${API}/meditate/meditations/favorites`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
        .then(d => {
          setMeds(d.meditations || []);
          setTotal((d.meditations || []).length);
          setFavoriteIds(new Set<number>(d.favorite_ids || []));
        })
        .catch((e) => setErr(`Could not load favorites: ${e.message || e}`))
        .finally(() => setLoading(false));
      return;
    }
    const qs = new URLSearchParams();
    if (category && category !== 'all') qs.set('category', category);
    if (search) qs.set('search', search);
    qs.set('limit', '60');
    fetch(`${API}/meditate/meditations?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then(d => {
        setMeds(d.meditations || []);
        setCategories(d.categories || []);
        setTotal(d.total || 0);
      })
      .catch((e) => setErr(`Could not load meditations: ${e.message || e}`))
      .finally(() => setLoading(false));
  }, [API, token, category, search]);

  useEffect(() => { load(); }, [load]);

  // Fire-and-forget mount loads for favorite ids + recent + recommended.
  useEffect(() => {
    fetch(`${API}/meditate/meditations/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.favorite_ids) setFavoriteIds(new Set<number>(d.favorite_ids)); })
      .catch(() => {});
    fetch(`${API}/meditate/meditations/recent?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setRecent(d?.meditations || []))
      .catch(() => {});
    fetch(`${API}/meditate/meditations/recommended`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setRecommended(d?.meditations || []))
      .catch(() => {});
  }, [API, token]);

  const toggleFavorite = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/meditate/meditations/${id}/favorite`, {
        method:'POST', headers:{ Authorization:`Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) return;
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (d.favorited) next.add(id); else next.delete(id);
        return next;
      });
      // If we're on the favorites filter, drop the card from view.
      if (category === 'favorites' && !d.favorited) {
        setMeds(prev => prev.filter(m => m.id !== id));
      }
    } catch {}
  }, [API, token, category]);

  const allCount = useMemo(() => categories.reduce((s, c) => s + c.count, 0), [categories]);

  return (
    <div style={{padding:'4px 4px 24px'}}>
      {/* RECENTLY PLAYED — horizontal scroll above search; hidden when
          there's no play history yet. */}
      {recent.length > 0 && (
        <div style={{marginBottom:'14px'}}>
          <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.inkSoft, fontWeight:800, marginBottom:'8px', padding:'0 4px'}}>
            Recently Played
          </div>
          <div style={{display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'4px', WebkitOverflowScrolling:'touch'}}>
            {recent.map(m => (
              <button key={m.id} onClick={() => onOpenMeditation(m.id)}
                style={{
                  flexShrink:0, width:'200px', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  background: T.cardBg, border: T.cardBorder, borderRadius:'14px',
                  padding:'12px',
                  display:'flex', flexDirection:'column', gap:'6px',
                  boxShadow:'0 4px 12px rgba(83,74,183,0.06)',
                }}>
                <span style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.purple, fontWeight:800}}>
                  {labelFor(m.category)}
                </span>
                <div style={{fontFamily: T.serif, fontSize:'14px', fontWeight:600, color: T.navy, lineHeight:1.3, minHeight:'36px', overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2}}>
                  {m.title}
                </div>
                <div style={{fontSize:'10px', color: T.inkSoft, fontWeight:700}}>
                  ▶ {m.duration_min || 10} min
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{marginBottom:'12px'}}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by title or keyword…"
          style={{
            width:'100%', padding:'12px 14px',
            borderRadius:'12px', border:`0.5px solid ${T.border}`,
            background:'rgba(255,255,255,0.78)',
            fontSize:'13.5px', color: T.ink, fontFamily:'inherit',
            outline:'none', boxSizing:'border-box',
          }}
        />
      </div>

      {/* Category pills — horizontal scroll. Favorites pill comes first
          so the bookmark UX is one tap away. */}
      <div style={{display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'8px', marginBottom:'10px', WebkitOverflowScrolling:'touch'}}>
        <Pill active={category === 'favorites'} label={`♥ Favorites${favoriteIds.size ? ` · ${favoriteIds.size}` : ''}`} onClick={() => setCategory('favorites')}/>
        <Pill active={category === 'all'} label={`All${allCount ? ` · ${allCount}` : ''}`} onClick={() => setCategory('all')}/>
        {categories.slice(0, 30).map(c => (
          <Pill key={c.slug}
            active={category === c.slug}
            label={`${labelFor(c.slug)} · ${c.count}`}
            onClick={() => setCategory(c.slug)}/>
        ))}
      </div>

      {err && (
        <div style={{padding:'12px 14px', background:'rgba(224,80,80,0.08)', border:'1px solid rgba(224,80,80,0.3)', borderRadius:'12px', color:'#a02020', fontSize:'12px', marginBottom:'12px'}}>{err}</div>
      )}

      <div style={{fontSize:'11px', color: T.inkSoft, marginBottom:'8px', padding:'0 4px'}}>
        {loading ? 'Loading…' : (
          <>Showing {meds.length} of {total.toLocaleString()}{search ? ` matching "${search}"` : ''}</>
        )}
      </div>

      {/* RECOMMENDED FOR YOU — Claude-picked categories. Hidden when no
          recommendations are available yet. */}
      {category === 'all' && !search && recommended.length > 0 && (
        <div style={{marginBottom:'18px'}}>
          <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.gold, fontWeight:800, marginBottom:'8px', padding:'0 4px'}}>
            Recommended for You ✦
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'10px'}}>
            {recommended.map(m => (
              <button key={m.id} onClick={() => onOpenMeditation(m.id)}
                style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  background:'rgba(255,255,255,0.85)', border:`0.5px solid ${T.gold}55`, borderRadius:'14px',
                  padding:'12px',
                  display:'flex', flexDirection:'column', gap:'6px',
                  boxShadow:'0 4px 12px rgba(201,168,76,0.12)',
                }}>
                <span style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.purple, fontWeight:800}}>
                  {labelFor(m.category)}
                </span>
                <div style={{fontFamily: T.serif, fontSize:'14px', fontWeight:600, color: T.navy, lineHeight:1.3, minHeight:'36px'}}>
                  {m.title}
                </div>
                <div style={{fontSize:'10px', color: T.gold, fontWeight:800, letterSpacing:'0.4px'}}>
                  ▶ {m.duration_min || 10} min
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px'}}>
        {meds.map(m => (
          <button key={m.id} onClick={() => onOpenMeditation(m.id)}
            style={{
              textAlign:'left', cursor:'pointer', fontFamily:'inherit',
              background: T.cardBg, border: T.cardBorder, borderRadius:'16px',
              padding:'14px',
              display:'flex', flexDirection:'column', gap:'8px',
              boxShadow:'0 6px 16px rgba(83,74,183,0.10)',
              position:'relative',
            }}>
            {/* Bookmark heart — top-right, click stops propagation. */}
            <span
              role="button"
              tabIndex={0}
              aria-label={favoriteIds.has(m.id) ? 'Remove favorite' : 'Add favorite'}
              onClick={(e) => toggleFavorite(m.id, e)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFavorite(m.id, e as any); }}
              style={{position:'absolute', top:'10px', right:'12px', fontSize:'16px', color: favoriteIds.has(m.id) ? T.gold : T.inkSoft, cursor:'pointer', lineHeight:1, padding:'2px 4px'}}>
              {favoriteIds.has(m.id) ? '♥' : '♡'}
            </span>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingRight:'24px'}}>
              <span style={{fontSize:'9px', letterSpacing:'1.5px', textTransform:'uppercase', color: T.purple, fontWeight:800}}>
                {labelFor(m.category)}
              </span>
              <span style={{fontSize:'10px', color: T.inkSoft, fontWeight:700}}>
                {m.duration_min || 10} min
              </span>
            </div>
            <div style={{fontFamily: T.serif, fontSize:'15px', fontWeight:600, color: T.navy, lineHeight:1.3, minHeight:'40px'}}>
              {m.title}
            </div>
            {m.script_preview && (
              <div style={{fontSize:'12px', color: T.inkSoft, lineHeight:1.55, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:3, overflow:'hidden'}}>
                {m.script_preview}
              </div>
            )}
            <div style={{
              marginTop:'auto', display:'inline-flex', alignSelf:'flex-start',
              padding:'6px 12px', borderRadius:'999px',
              background:`linear-gradient(135deg, ${T.purple}, ${T.navy})`,
              color:'white', fontSize:'11px', fontWeight:800, letterSpacing:'0.4px',
            }}>
              Begin →
            </div>
          </button>
        ))}
      </div>

      {!loading && meds.length === 0 && !err && (
        <div style={{
          background: T.cardBg, border: T.cardBorder, borderRadius:'18px',
          padding:'30px 20px', textAlign:'center', color: T.inkSoft,
          fontFamily: T.serif, fontStyle:'italic', marginTop:'8px',
        }}>
          No meditations match this filter. Try clearing the search or picking a different category.
        </div>
      )}
    </div>
  );
};

const Pill: React.FC<{active: boolean; label: string; onClick: () => void}> = ({ active, label, onClick }) => (
  <button onClick={onClick}
    style={{
      flexShrink:0, padding:'7px 14px', borderRadius:'999px',
      background: active ? `linear-gradient(135deg, ${T.purple}, ${T.navy})` : 'rgba(255,255,255,0.78)',
      color: active ? 'white' : T.ink,
      border: active ? 'none' : `0.5px solid ${T.border}`,
      fontSize:'11px', fontWeight: active ? 800 : 600,
      letterSpacing:'0.3px',
      cursor:'pointer', fontFamily:'inherit',
      whiteSpace:'nowrap',
    }}>
    {label}
  </button>
);

export default LibraryScreen;
