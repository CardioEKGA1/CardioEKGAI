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
  const [category, setCategory] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Debounce the search input — typing is faster than the backend can
  // round-trip 60 rows.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 280);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true); setErr('');
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

  const allCount = useMemo(() => categories.reduce((s, c) => s + c.count, 0), [categories]);

  return (
    <div style={{padding:'4px 4px 24px'}}>
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

      {/* Category pills — horizontal scroll. */}
      <div style={{display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'8px', marginBottom:'10px', WebkitOverflowScrolling:'touch'}}>
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

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px'}}>
        {meds.map(m => (
          <button key={m.id} onClick={() => onOpenMeditation(m.id)}
            style={{
              textAlign:'left', cursor:'pointer', fontFamily:'inherit',
              background: T.cardBg, border: T.cardBorder, borderRadius:'16px',
              padding:'14px',
              display:'flex', flexDirection:'column', gap:'8px',
              boxShadow:'0 6px 16px rgba(83,74,183,0.10)',
            }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
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
