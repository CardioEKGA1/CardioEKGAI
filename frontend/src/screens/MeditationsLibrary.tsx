// © 2026 SoulMD, LLC. All rights reserved.
//
// Superuser-only meditations library browser. Lives on the main SoulMD
// suite dashboard (NOT the concierge section), gated to is_superuser=true.
// Reads the 2,044-meditation library via /concierge/meditations/library
// (existing owner-only endpoint; superusers satisfy the concierge-owner
// predicate) and lets the user browse by category, search by keyword,
// and save favorites to their personal Energy Log.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SoulMDLogo from '../SoulMDLogo';
import SuperuserTabNav from './SuperuserTabNav';

interface Props {
  API: string;
  token: string;
  onBack: () => void;
  onNavigateDashboard: () => void;
  onNavigateConciergeAccess: () => void;
}

interface LibraryMeditation {
  id: number;
  title: string;
  category: string;
  description?: string;
  duration_min?: number | null;
  difficulty?: string | null;
  script?: string;
  tags?: string[];
  affirmations?: string[];
  physician_notes?: string;
}

const PAGE_BG = 'linear-gradient(135deg,#F5F1FF 0%,#E8E4FB 35%,#DFEAFC 70%,#F1E7F8 100%)';
const PURPLE  = '#534AB7';
const INK     = '#1F1B3A';
const INK_SOFT= '#6B6889';
const BORDER  = 'rgba(83,74,183,0.12)';

// Humanize any category slug not explicitly mapped. Example:
// 'stress_relief' → 'Stress Relief', 'body_scan' → 'Body Scan'.
const humanizeCategory = (slug: string): string => (slug || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const CATEGORY_LABELS: Record<string, string> = {
  self_healing:       'Self-Healing',
  energy_balance:     'Energy Balance',
  gratitude:          'Gratitude',
  inner_peace:        'Inner Peace',
  wellness:           'Wellness',
  integrative_health: 'Integrative Health',
  self_love:          'Self-Love',
  release:            'Release & Let Go',
  growth:             'Growth',
  divine_guidance:    'Divine Guidance',
  divine_light_healing: 'Divine Light Healing',
  universe_surrender:   'Universe Surrender',
  vortex_alignment:     'Vortex Alignment',
  quantum_healing:      'Quantum Healing',
  subconscious_healing: 'Subconscious Healing',
  chakra_balancing:     'Chakra Balancing',
  heart_coherence:      'Heart Coherence',
  morning_activation:   'Morning Activation',
  evening_integration:  'Evening Integration',
  sleep_healing:        'Sleep Healing',
  anxiety_release:      'Anxiety Release',
  grief_and_loss:       'Grief & Loss',
  chronic_pain:         'Chronic Pain',
  immune_boost:         'Immune Boost',
  cardiovascular:       'Cardiovascular',
  kidney_and_detox:     'Kidney & Detox',
  neurological:         'Neurological',
  oncology_support:     'Oncology Support',
  autoimmune:           'Autoimmune',
  soul_purpose:         'Soul Purpose',
};

const FAVORITES_KEY = 'soulmd_meditation_favorites_v1';
const loadFavorites = (): Set<number> => {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch { return new Set(); }
};
const saveFavorites = (favs: Set<number>) => {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs))); } catch {}
};

const MeditationsLibrary: React.FC<Props> = ({ API, token, onBack, onNavigateDashboard, onNavigateConciergeAccess }) => {
  const [meds, setMeds] = useState<LibraryMeditation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [openId, setOpenId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(() => loadFavorites());
  // Inline edit state. editingId === m.id swaps that single card into an
  // editor — no modal — that spans the full grid row so there's room to
  // actually rewrite a script. Save PATCHes /concierge/meditations/{id}
  // and merges the response back into `meds` so the change is visible
  // without a refetch.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editScript, setEditScript] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    // Default limit on the server was 60 — we need ALL 2,044 rows client-side
    // so search/filter work without round-tripping. Server caps at 5,000 now.
    fetch(`${API}/concierge/meditations/library?limit=5000`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then(d => setMeds(Array.isArray(d) ? d : (d.meditations || [])))
      .catch(e => setErr(`Could not load meditations: ${e.message || e}`))
      .finally(() => setLoading(false));
  }, [API, token]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    meds.forEach(x => { const c = x.category || 'uncategorized'; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [meds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return meds.filter(m => {
      if (category !== 'all' && m.category !== category) return false;
      if (!q) return true;
      return (m.title || '').toLowerCase().includes(q)
          || (m.script || '').toLowerCase().includes(q)
          || (m.tags || []).some(t => t.toLowerCase().includes(q));
    });
  }, [meds, category, search]);

  const toggleFav = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const startEdit = useCallback((m: LibraryMeditation) => {
    setEditingId(m.id);
    setEditTitle(m.title || '');
    setEditScript(m.script || '');
    setSaveErr('');
    setOpenId(null); // close the read modal if it's somehow up
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle('');
    setEditScript('');
    setSaveErr('');
  }, []);

  const saveEdit = useCallback(async (id: number) => {
    if (saving) return;
    setSaving(true); setSaveErr('');
    try {
      const res = await fetch(`${API}/concierge/meditations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle.trim(), script: editScript }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Save failed (${res.status})`);
      setMeds(prev => prev.map(x => x.id === id ? { ...x, ...d } : x));
      setEditingId(null);
      setEditTitle('');
      setEditScript('');
    } catch (e: any) {
      setSaveErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [API, token, editTitle, editScript, saving]);

  const open = filtered.find(m => m.id === openId) || null;

  return (
    <div style={{minHeight:'100vh', background: PAGE_BG, color: INK, fontFamily:'-apple-system,BlinkMacSystemFont,Inter,sans-serif'}}>
      <header style={{padding:'16px clamp(14px,3vw,28px)', display:'flex', alignItems:'center', gap:'12px', borderBottom:`0.5px solid ${BORDER}`, background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)'}}>
        <button onClick={onBack} title="Back"
          style={{background:'transparent', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'7px 10px', fontSize:'13px', color: INK_SOFT, cursor:'pointer'}}>←</button>
        <SoulMDLogo size={28} showText={false}/>
        <div style={{flex:1}}>
          <div style={{fontSize:'16px', fontWeight:800, color: INK}}>Meditations Library</div>
          <div style={{fontSize:'11px', color: INK_SOFT}}>{meds.length.toLocaleString()} scripts across {Object.keys(categoryCounts).length} categories</div>
        </div>
      </header>

      <SuperuserTabNav active="meditations" onDashboard={onNavigateDashboard} onMeditations={() => {}} onConcierge={onNavigateConciergeAccess}/>

      <main style={{padding:'clamp(16px,3vw,28px)', maxWidth:'1120px', margin:'0 auto'}}>
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'16px'}}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles, scripts, tags…"
            style={{flex:1, minWidth:'220px', padding:'10px 14px', borderRadius:'10px', border:`0.5px solid ${BORDER}`, background:'#FFFFFF', fontSize:'13px', outline:'none', fontFamily:'inherit'}}/>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{padding:'10px 12px', borderRadius:'10px', border:`0.5px solid ${BORDER}`, background:'#FFFFFF', fontSize:'13px', color: INK, cursor:'pointer'}}>
            <option value="all">All categories ({meds.length})</option>
            {Object.entries(categoryCounts).sort().map(([cat, n]) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || humanizeCategory(cat)} ({n})</option>
            ))}
          </select>
        </div>

        {loading && <div style={{padding:'40px', textAlign:'center', color: INK_SOFT}}>Loading library…</div>}
        {err && <div style={{padding:'14px 16px', background:'rgba(224,106,106,0.1)', color:'#a02020', borderRadius:'10px', fontSize:'13px'}}>{err}</div>}

        {!loading && !err && (
          <>
            <div style={{fontSize:'12px', color: INK_SOFT, marginBottom:'10px'}}>
              Showing {filtered.length} of {meds.length}{favorites.size > 0 && ` · ${favorites.size} favorited`}
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'12px'}}>
              {filtered.slice(0, 300).map(m => {
                if (editingId === m.id) {
                  // Inline editor — spans the full grid row so there's room
                  // to actually rewrite a script without a popup overlay.
                  return (
                    <div key={m.id} style={{
                      gridColumn: '1 / -1',
                      background:'#FFFFFF',
                      border:`1px solid ${PURPLE}`,
                      borderRadius:'14px',
                      padding:'18px',
                      display:'flex', flexDirection:'column', gap:'12px',
                      boxShadow:'0 8px 24px rgba(83,74,183,0.14)',
                    }}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px'}}>
                        <div style={{fontSize:'9px', letterSpacing:'2px', textTransform:'uppercase', color: PURPLE, fontWeight:800}}>
                          Editing · {CATEGORY_LABELS[m.category] || humanizeCategory(m.category)}
                        </div>
                        {m.duration_min && (
                          <div style={{fontSize:'11px', color: INK_SOFT}}>{m.duration_min} min · {m.difficulty || 'All levels'}</div>
                        )}
                      </div>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Title"
                        style={{
                          width:'100%',
                          fontSize:'18px', fontWeight:700, color: INK,
                          border:'none', borderBottom:`1px solid ${BORDER}`,
                          padding:'6px 0',
                          background:'transparent', outline:'none',
                          fontFamily:'inherit',
                          boxSizing:'border-box',
                        }}
                      />
                      <textarea
                        value={editScript}
                        onChange={e => setEditScript(e.target.value)}
                        placeholder="Meditation script…"
                        style={{
                          width:'100%', minHeight:'360px',
                          padding:'14px',
                          borderRadius:'10px',
                          border:`1px solid ${BORDER}`,
                          background:'#FAFAFE',
                          fontSize:'14px', color: INK, lineHeight:1.7,
                          outline:'none', resize:'vertical',
                          fontFamily:'inherit',
                          boxSizing:'border-box',
                        }}
                      />
                      {saveErr && (
                        <div style={{fontSize:'12px', color:'#a02020', background:'rgba(224,106,106,0.08)', border:'1px solid rgba(224,106,106,0.3)', borderRadius:'8px', padding:'8px 12px'}}>
                          {saveErr}
                        </div>
                      )}
                      <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          style={{background:'transparent', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:600, color: INK_SOFT, cursor: saving ? 'default' : 'pointer', fontFamily:'inherit'}}>
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(m.id)}
                          disabled={saving || !editTitle.trim()}
                          style={{background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)', border:'none', borderRadius:'10px', padding:'10px 22px', fontSize:'13px', fontWeight:700, color:'white', cursor: (saving || !editTitle.trim()) ? 'default' : 'pointer', fontFamily:'inherit', opacity: (saving || !editTitle.trim()) ? 0.6 : 1}}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button key={m.id} onClick={() => setOpenId(m.id)}
                    style={{textAlign:'left', background:'#FFFFFF', border:`0.5px solid ${BORDER}`, borderRadius:'14px', padding:'14px', cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', gap:'6px', position:'relative'}}>
                    <div style={{position:'absolute', top:'10px', right:'12px', display:'flex', alignItems:'center', gap:'10px'}}>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Edit meditation"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); startEdit(m); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); startEdit(m); } }}
                        style={{fontSize:'10px', fontWeight:700, letterSpacing:'0.6px', textTransform:'uppercase', color: PURPLE, padding:'4px 10px', borderRadius:'999px', background:'rgba(83,74,183,0.08)', border:`0.5px solid ${BORDER}`, cursor:'pointer'}}>
                        ✎ Edit
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); toggleFav(m.id); }}
                        style={{fontSize:'18px', color: favorites.has(m.id) ? '#E06A6A' : INK_SOFT, cursor:'pointer', lineHeight:1}}>
                        {favorites.has(m.id) ? '♥' : '♡'}
                      </span>
                    </div>
                    <div style={{fontSize:'9px', letterSpacing:'2px', textTransform:'uppercase', color: PURPLE, fontWeight:800, paddingRight:'120px'}}>
                      {CATEGORY_LABELS[m.category] || humanizeCategory(m.category)}
                    </div>
                    <div style={{fontSize:'14px', fontWeight:700, color: INK, lineHeight:1.3, paddingRight:'24px'}}>{m.title}</div>
                    {m.duration_min && <div style={{fontSize:'11px', color: INK_SOFT}}>{m.duration_min} min · {m.difficulty || 'All levels'}</div>}
                    <div style={{fontSize:'12px', color: INK_SOFT, lineHeight:1.5, display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:3, overflow:'hidden'}}>
                      {m.script || m.description || ''}
                    </div>
                  </button>
                );
              })}
            </div>
            {filtered.length > 300 && (
              <div style={{textAlign:'center', color: INK_SOFT, fontSize:'12px', marginTop:'20px'}}>
                Showing first 300 of {filtered.length}. Narrow your search to see more.
              </div>
            )}
          </>
        )}
      </main>

      {open && (
        <div onClick={() => setOpenId(null)} style={{position:'fixed', inset:0, zIndex:100, background:'rgba(20,18,40,0.4)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
          <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'20px', maxWidth:'620px', width:'100%', maxHeight:'86vh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
            <div style={{padding:'18px 22px', borderBottom:`0.5px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'14px'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:'9px', letterSpacing:'2px', textTransform:'uppercase', color: PURPLE, fontWeight:800}}>{CATEGORY_LABELS[open.category] || open.category}</div>
                <div style={{fontSize:'18px', fontWeight:800, color: INK, marginTop:'4px'}}>{open.title}</div>
                {open.duration_min && <div style={{fontSize:'11px', color: INK_SOFT, marginTop:'3px'}}>{open.duration_min} min · {open.difficulty || 'All levels'}</div>}
              </div>
              <button onClick={() => setOpenId(null)}
                style={{background:'transparent', border:'none', fontSize:'22px', color: INK_SOFT, cursor:'pointer', padding:0, lineHeight:1}}>×</button>
            </div>
            <div style={{overflow:'auto', padding:'20px 22px', flex:1, fontSize:'14px', color: INK, lineHeight:1.7, whiteSpace:'pre-wrap'}}>
              {open.script || '(no script available)'}
              {open.affirmations && open.affirmations.length > 0 && (
                <div style={{marginTop:'20px', padding:'14px', background:'rgba(83,74,183,0.05)', borderRadius:'10px'}}>
                  <div style={{fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:800, color: PURPLE, marginBottom:'8px'}}>Affirmations</div>
                  {open.affirmations.map((a, i) => <div key={i} style={{fontSize:'13px', marginBottom:'4px'}}>· {a}</div>)}
                </div>
              )}
            </div>
            <div style={{padding:'14px 22px', borderTop:`0.5px solid ${BORDER}`, display:'flex', gap:'10px', justifyContent:'flex-end'}}>
              <button onClick={() => toggleFav(open.id)}
                style={{background:'transparent', border:`0.5px solid ${BORDER}`, borderRadius:'10px', padding:'9px 16px', fontSize:'13px', color: favorites.has(open.id) ? '#E06A6A' : INK, cursor:'pointer', fontFamily:'inherit'}}>
                {favorites.has(open.id) ? '♥ Favorited' : '♡ Favorite'}
              </button>
              <button onClick={() => setOpenId(null)}
                style={{background:'linear-gradient(135deg,#7ab0f0 0%,#9b8fe8 55%,#534AB7 100%)', border:'none', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', color:'white', fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeditationsLibrary;
