// © 2026 SoulMD, LLC. All rights reserved.
// Physician-facing wellness panel — surfaces a patient's recent energy
// log + post-meditation journal entries inside the patient profile so
// Dr. Anderson can read mood patterns at a glance before a visit.
// Flagged days (energy 1–2) get a rose chip so they don't fall through.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  API: string;
  token: string;
  patientId: number;
  accent: string;
}

interface EnergyEntry {
  id: number;
  date: string;
  energy_score: number;
  mood_label: string;
  note: string;
  session_id: number | null;
  created_at: string;
}
interface JournalEntry {
  id: number;
  date: string;
  meditation_id: number | null;
  meditation_title: string;
  mood_shift: string;
  reflection: string;
  intention: string;
  created_at: string;
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius: '16px',
  border: '1px solid rgba(122,176,240,0.2)',
  boxShadow: '0 2px 10px rgba(100,130,200,0.1)',
  padding: '16px',
};
const HEADER: React.CSSProperties = { fontSize:'13px', fontWeight:800, color:'#1a2a4a', letterSpacing:'0.5px', textTransform:'uppercase' };

const MOOD_LABELS: Record<string, string> = {
  much_better: 'Much better',
  a_little_better: 'A little better',
  same: 'About the same',
  processing: 'Still processing',
};

const PatientWellnessPanel: React.FC<Props> = ({ API, token, patientId, accent }) => {
  const [energy, setEnergy] = useState<EnergyEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true); setErr('');
    Promise.all([
      fetch(`${API}/concierge/patients/${patientId}/energy?days=30`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { entries: [] }),
      fetch(`${API}/concierge/patients/${patientId}/journal?limit=20`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : { entries: [] }),
    ])
      .then(([e, j]) => { setEnergy(e.entries || []); setJournal(j.entries || []); })
      .catch(() => setErr('Could not load wellness data.'))
      .finally(() => setLoading(false));
  }, [API, token, patientId]);

  useEffect(() => { load(); }, [load]);

  // Sparkline payload — chronological 14 days ending today, with gaps as
  // empty bars so the trend visually shows missed days too.
  const sparkBars = useMemo(() => {
    const byDate = new Map<string, number>();
    energy.forEach(e => byDate.set(e.date, e.energy_score));
    const out: {date: string; score: number; flagged: boolean}[] = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      const s = byDate.get(key) || 0;
      out.push({ date: key, score: s, flagged: s > 0 && s <= 2 });
    }
    return out;
  }, [energy]);

  const latestScore = energy[0]?.energy_score || 0;
  const avg = energy.length ? (energy.reduce((s, e) => s + e.energy_score, 0) / energy.length) : 0;
  const flaggedCount = energy.filter(e => e.energy_score <= 2).length;

  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'14px'}}>
      {/* Energy trend */}
      <div style={CARD}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <div style={HEADER}>Energy log · 14 days</div>
          {flaggedCount > 0 && (
            <span style={{fontSize:'10px', padding:'3px 9px', borderRadius:'999px', background:'rgba(232,144,176,0.18)', color:'#a02060', fontWeight:800, letterSpacing:'0.4px', textTransform:'uppercase'}}>
              {flaggedCount} flagged
            </span>
          )}
        </div>

        {loading ? (
          <div style={{padding:'18px', textAlign:'center', color:'#7090a0', fontSize:'12px'}}>Loading…</div>
        ) : err ? (
          <div style={{color:'#a02020', fontSize:'12px'}}>{err}</div>
        ) : energy.length === 0 ? (
          <div style={{padding:'18px', textAlign:'center', color:'#7090a0', fontSize:'12px', fontStyle:'italic'}}>
            No energy entries yet — patient hasn't logged a check-in.
          </div>
        ) : (
          <>
            <div style={{display:'flex', alignItems:'flex-end', gap:'4px', height:'78px', marginBottom:'10px'}}>
              {sparkBars.map(b => {
                const filled = b.score > 0;
                const heightPct = filled ? (b.score / 5) * 100 : 14;
                const bg = !filled
                  ? 'rgba(180,210,230,0.25)'
                  : b.flagged
                    ? 'linear-gradient(135deg, #f0c8d8, #e0a8c0)'
                    : 'linear-gradient(135deg, #C5E8F4, #a8d5e8)';
                return (
                  <div key={b.date} title={`${b.date} · ${b.score || 'no entry'}`} style={{
                    flex:1, height:`${Math.max(filled ? 22 : 12, heightPct)}%`,
                    minHeight: filled ? '20px' : '10px',
                    background: bg, borderRadius:'5px',
                    border: b.flagged ? '1px solid rgba(232,144,176,0.7)' : '0.5px solid rgba(180,210,230,0.4)',
                    display:'flex', alignItems:'flex-start', justifyContent:'center',
                    fontSize:'9px', color: filled ? '#1a2a4a' : 'transparent', fontWeight:800,
                    paddingTop: filled ? '2px' : 0,
                  }}>
                    {filled ? b.score : ''}
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', color:'#4a7ad0'}}>
              <span><b style={{color:'#1a2a4a'}}>Latest:</b> {latestScore || '—'}/5</span>
              <span><b style={{color:'#1a2a4a'}}>30-day avg:</b> {avg ? avg.toFixed(1) : '—'}</span>
              <span><b style={{color:'#1a2a4a'}}>Entries:</b> {energy.length}</span>
            </div>

            {/* Recent notes — last 4 with text. */}
            <div style={{marginTop:'12px', display:'flex', flexDirection:'column', gap:'8px'}}>
              {energy.filter(e => e.note).slice(0, 4).map(e => (
                <div key={e.id} style={{
                  padding:'8px 10px', borderRadius:'10px',
                  background: e.energy_score <= 2 ? 'rgba(232,144,176,0.10)' : 'rgba(197,232,244,0.18)',
                  border:'1px solid rgba(180,210,230,0.3)',
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#4a7ad0', fontWeight:700, marginBottom:'2px'}}>
                    <span>{e.date} · {e.mood_label} ({e.energy_score}/5)</span>
                    {e.session_id && <span style={{color:'#9b8fe8'}}>after meditation</span>}
                  </div>
                  <div style={{fontSize:'12px', color:'#1a2a4a', lineHeight:1.5, whiteSpace:'pre-wrap'}}>{e.note}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Journal entries */}
      <div style={CARD}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <div style={HEADER}>Post-meditation journal</div>
          <span style={{fontSize:'10px', color:'#4a7ad0', fontWeight:700}}>{journal.length} entr{journal.length === 1 ? 'y' : 'ies'}</span>
        </div>

        {loading ? (
          <div style={{padding:'18px', textAlign:'center', color:'#7090a0', fontSize:'12px'}}>Loading…</div>
        ) : journal.length === 0 ? (
          <div style={{padding:'18px', textAlign:'center', color:'#7090a0', fontSize:'12px', fontStyle:'italic'}}>
            No reflections yet. They appear here after the patient completes a meditation.
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'10px', maxHeight:'420px', overflowY:'auto'}}>
            {journal.map(j => (
              <div key={j.id} style={{
                padding:'10px 12px', borderRadius:'12px',
                background:'rgba(155,143,232,0.08)',
                border:'1px solid rgba(155,143,232,0.25)',
              }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:'8px', marginBottom:'4px'}}>
                  <div style={{fontSize:'12px', fontWeight:800, color:'#1a2a4a', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {j.meditation_title || 'Standalone reflection'}
                  </div>
                  <div style={{fontSize:'10px', color:'#7090a0', flexShrink:0}}>{j.date}</div>
                </div>
                {j.mood_shift && (
                  <div style={{display:'inline-flex', alignItems:'center', fontSize:'9px', fontWeight:800, padding:'2px 8px', borderRadius:'999px', background:'rgba(155,143,232,0.18)', color:'#6b4e7c', letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:'6px'}}>
                    {MOOD_LABELS[j.mood_shift] || j.mood_shift}
                  </div>
                )}
                {j.reflection && (
                  <div style={{fontSize:'12px', color:'#1a2a4a', lineHeight:1.55, fontStyle:'italic', whiteSpace:'pre-wrap', marginBottom: j.intention ? '6px' : 0}}>
                    “{j.reflection}”
                  </div>
                )}
                {j.intention && (
                  <div style={{fontSize:'11px', color:'#4a5e6a', lineHeight:1.5, whiteSpace:'pre-wrap'}}>
                    <b style={{color:'#6b4e7c', fontSize:'9px', letterSpacing:'1px', textTransform:'uppercase', marginRight:'6px'}}>Intention</b>
                    {j.intention}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{marginTop:'10px', fontSize:'10px', color:'#7090a0', fontStyle:'italic', borderTop:'1px solid rgba(180,210,230,0.3)', paddingTop:'8px'}}>
          Reflections help frame the next visit — read them before the call.
        </div>
      </div>
    </div>
  );
};

export default PatientWellnessPanel;
