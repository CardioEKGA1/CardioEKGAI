// © 2026 SoulMD, LLC. All rights reserved.
import React, { useMemo, useState } from 'react';
import { ToolShell, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';
import DictationButton from '../../DictationButton';
import { CALCULATORS, SPECIALTIES, PHASE_2_CALCULATORS, Calculator, CalcResult, CategoryColor } from '../../cliniscore/calculators';

interface Props { API: string; token: string; onBack: () => void; }

interface InterpretResponse {
  interpretation?: string;
  risk_category?: string;
  next_steps?: string[];
  guideline_context?: string;
  urgent_flags?: string[];
  free_tier_remaining?: number;
  disclaimer?: string;
  score?: number;
  calculator_name?: string;
}

const COLOR_MAP: Record<CategoryColor, {bg: string; border: string; text: string}> = {
  green:  { bg: 'rgba(112,184,112,0.15)', border: 'rgba(112,184,112,0.45)', text: '#2a7a2a' },
  yellow: { bg: 'rgba(240,180,80,0.18)',  border: 'rgba(240,180,80,0.45)',  text: '#a06810' },
  orange: { bg: 'rgba(224,140,80,0.18)',  border: 'rgba(224,140,80,0.45)',  text: '#a85020' },
  red:    { bg: 'rgba(224,80,80,0.15)',   border: 'rgba(224,80,80,0.45)',   text: '#a02020' },
};

const CliniScoreTool: React.FC<Props> = ({ API, token, onBack }) => {
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [selected, setSelected] = useState<Calculator | null>(null);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [clinicalContext, setClinicalContext] = useState('');
  const [localResult, setLocalResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState<InterpretResponse | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CALCULATORS.filter(c => {
      if (specialty !== 'All' && c.specialty !== specialty) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q)
        || c.shortDesc.toLowerCase().includes(q)
        || c.specialty.toLowerCase().includes(q)
        || c.id.includes(q);
    });
  }, [search, specialty]);

  const phase2Filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PHASE_2_CALCULATORS.filter(c => {
      if (specialty !== 'All' && c.specialty !== specialty) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q);
    });
  }, [search, specialty]);

  const open = (c: Calculator) => {
    setSelected(c);
    setInputs({});
    setLocalResult(null);
    setAiResult(null);
    setError('');
    setClinicalContext('');
  };

  const close = () => {
    setSelected(null);
    setInputs({});
    setLocalResult(null);
    setAiResult(null);
    setError('');
  };

  const setVal = (id: string, value: number) => setInputs(prev => ({ ...prev, [id]: value }));

  const compute = () => {
    if (!selected) return;
    setError('');
    // Validate required numeric inputs are filled (selects default to 0 which is valid)
    for (const v of selected.variables) {
      if (v.type === 'number' && (inputs[v.id] === undefined || isNaN(inputs[v.id]))) {
        setError(`Please enter ${v.label}.`);
        return;
      }
    }
    try {
      const r = selected.compute(inputs);
      setLocalResult(r);
      setAiResult(null);
    } catch (e: any) {
      setError(`Calculation error: ${e.message}`);
    }
  };

  const getInterpretation = async () => {
    if (!selected || !localResult) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/tools/cliniscore/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          calculator_id: selected.id,
          calculator_name: selected.name,
          specialty: selected.specialty,
          inputs,
          score: localResult.score,
          category: localResult.category,
          clinical_context: clinicalContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Interpretation failed');
      setAiResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Calculator detail view ────────────────────────────────────────────────
  if (selected) {
    const colorStyle = localResult ? COLOR_MAP[localResult.color] : null;
    return (
      <ToolShell name="CliniScore" subtitle={selected.name} onBack={close} icon={<span style={{fontSize:'20px', lineHeight:1}}>📊</span>}>
        <div style={CARD}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
            <div>
              <div style={{fontSize:'18px', fontWeight:800, color:'#1a2a4a'}}>{selected.name}</div>
              <div style={{fontSize:'12px', color:'#6a8ab0', marginTop:'2px'}}>{selected.specialty} · {selected.shortDesc}</div>
            </div>
            {selected.references && (
              <div style={{fontSize:'10px', color:'#8aa0c0', textAlign:'right', maxWidth:'200px'}}>
                {selected.references.map((r, i) => <div key={i}>{r}</div>)}
              </div>
            )}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'10px', marginTop:'14px'}}>
            {selected.variables.map(v => (
              <div key={v.id}>
                <div style={FIELD_LABEL}>{v.label}{v.unit ? ` (${v.unit})` : ''}</div>
                {v.type === 'number' ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputs[v.id] ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === '') { setInputs(p => { const c = {...p}; delete c[v.id]; return c; }); return; }
                      const n = parseFloat(raw);
                      if (!isNaN(n)) setVal(v.id, n);
                    }}
                    placeholder={v.placeholder || ''}
                    style={INPUT}
                  />
                ) : (
                  <select
                    value={inputs[v.id] ?? ''}
                    onChange={e => setVal(v.id, parseFloat(e.target.value))}
                    style={{...INPUT, appearance:'auto'}}
                  >
                    <option value="" disabled>Select…</option>
                    {(v.options || []).map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {v.helpText && <div style={{fontSize:'10px', color:'#8aa0c0', marginTop:'4px'}}>{v.helpText}</div>}
              </div>
            ))}
          </div>
          <button onClick={compute} style={{...BTN_PRIMARY, width:'100%', marginTop:'14px'}}>Calculate score</button>
        </div>

        {localResult && colorStyle && (
          <div style={{...CARD, background: colorStyle.bg, border: `1px solid ${colorStyle.border}`}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'11px', fontWeight:700, color: colorStyle.text, letterSpacing:'1px', textTransform:'uppercase'}}>Score</div>
                <div style={{fontSize:'36px', fontWeight:900, color:'#1a2a4a', lineHeight:1}}>
                  {localResult.displayScore ?? localResult.score}
                  {localResult.extras?.unit && <span style={{fontSize:'14px', color:'#8aa0c0', fontWeight:600, marginLeft:'6px'}}>{String(localResult.extras.unit)}</span>}
                </div>
              </div>
              <div style={{padding:'6px 14px', borderRadius:'999px', background:'white', fontSize:'13px', fontWeight:800, color: colorStyle.text, border: `1px solid ${colorStyle.border}`}}>
                {localResult.category}
              </div>
            </div>
            <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:1.65, marginTop:'10px'}}>{localResult.summary}</div>
            {localResult.extras && Object.entries(localResult.extras).filter(([k]) => k !== 'unit').length > 0 && (
              <div style={{marginTop:'10px', fontSize:'12px', color:'#4a5e6a'}}>
                {Object.entries(localResult.extras).filter(([k]) => k !== 'unit').map(([k, val]) => (
                  <div key={k}><b>{k.replace(/_/g, ' ')}:</b> {String(val)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {localResult && !aiResult && (
          <div style={CARD}>
            <div style={LABEL}>AI interpretation + next steps</div>
            <div style={{fontSize:'12px', color:'#6a8ab0', marginBottom:'10px', lineHeight:1.55}}>
              Layer AI clinical reasoning on top of the computed score. Optionally add patient context for a more tailored interpretation.
            </div>
            <div style={{display:'flex', gap:'8px', alignItems:'flex-start', marginBottom:'10px'}}>
              <textarea
                value={clinicalContext}
                onChange={e => setClinicalContext(e.target.value)}
                placeholder="Optional: comorbidities, current therapy, allergies, competing risks, patient preferences…"
                style={{...INPUT, minHeight:'70px', resize:'vertical', flex:1}}
              />
              <DictationButton onTranscript={t => setClinicalContext(prev => prev ? prev.trimEnd() + ' ' + t : t)}/>
            </div>
            <button onClick={getInterpretation} disabled={loading} style={{...BTN_PRIMARY, width:'100%', opacity: loading ? 0.6 : 1}}>
              {loading ? 'Generating interpretation…' : 'Get AI interpretation'}
            </button>
          </div>
        )}

        {aiResult && (
          <>
            {aiResult.urgent_flags && aiResult.urgent_flags.length > 0 && (
              <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'14px', padding:'14px', marginBottom:'12px'}}>
                <div style={{fontSize:'13px', fontWeight:700, color:'#c04040', marginBottom:'6px'}}>⚠ Beyond-the-score flags</div>
                {aiResult.urgent_flags.map((f, i) => <div key={i} style={{fontSize:'13px', color:'#c04040', marginBottom:'3px'}}>• {f}</div>)}
              </div>
            )}
            {aiResult.interpretation && (
              <div style={CARD}>
                <div style={LABEL}>Interpretation</div>
                <div style={{fontSize:'13px', color:'#1a2a4a', lineHeight:1.7}}>{aiResult.interpretation}</div>
              </div>
            )}
            {aiResult.next_steps && aiResult.next_steps.length > 0 && (
              <div style={{...CARD, background:'linear-gradient(135deg, rgba(122,176,240,0.12), rgba(155,143,232,0.12))'}}>
                <div style={LABEL}>Recommended next steps</div>
                <ul style={{margin:0, paddingLeft:'20px', fontSize:'13px', color:'#1a2a4a', lineHeight:1.7}}>
                  {aiResult.next_steps.map((s, i) => <li key={i} style={{marginBottom:'6px'}}>{s}</li>)}
                </ul>
              </div>
            )}
            {aiResult.guideline_context && (
              <div style={CARD}>
                <div style={LABEL}>Guideline context</div>
                <div style={{fontSize:'13px', color:'#4a5e6a', lineHeight:1.7}}>{aiResult.guideline_context}</div>
              </div>
            )}
            {typeof aiResult.free_tier_remaining === 'number' && (
              <div style={{textAlign:'center', fontSize:'11px', color:'#8aa0c0', padding:'6px'}}>{aiResult.free_tier_remaining} free interpretations left today</div>
            )}
            {aiResult.disclaimer && <div style={{fontSize:'11px', color:'#a0b0c8', textAlign:'center', padding:'6px'}}>{aiResult.disclaimer}</div>}
          </>
        )}

        {error && <div style={{background:'#fde8e8', border:'1px solid #f0b0b0', borderRadius:'12px', padding:'12px', fontSize:'13px', color:'#c04040', marginBottom:'14px'}}>{error}</div>}
      </ToolShell>
    );
  }

  // ── Calculator browse view ────────────────────────────────────────────────
  return (
    <ToolShell name="CliniScore" subtitle={`${CALCULATORS.length} calculators with AI interpretation and guideline-aligned next steps.`} onBack={onBack} icon={<span style={{fontSize:'20px', lineHeight:1}}>📊</span>}>
      <div style={CARD}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, specialty, or keyword…"
          style={{...INPUT, fontSize:'14px', padding:'12px 14px'}}
        />
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'12px'}}>
          {SPECIALTIES.map(s => (
            <button
              key={s}
              onClick={() => setSpecialty(s)}
              style={{
                padding:'6px 12px', fontSize:'12px', borderRadius:'999px', cursor:'pointer',
                fontWeight: specialty === s ? 700 : 600,
                border: specialty === s ? 'none' : '1px solid rgba(122,176,240,0.35)',
                background: specialty === s ? WORDMARK : 'rgba(255,255,255,0.7)',
                color: specialty === s ? 'white' : '#4a7ad0',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'12px', marginBottom:'16px'}}>
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => open(c)}
            style={{textAlign:'left', cursor:'pointer', border:'1px solid rgba(255,255,255,0.9)', background:'rgba(255,255,255,0.85)', borderRadius:'16px', padding:'16px', boxShadow:'0 2px 10px rgba(100,130,200,0.06)'}}
          >
            <div style={{fontSize:'11px', color:'#4a7ad0', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'4px'}}>{c.specialty}</div>
            <div style={{fontSize:'14px', fontWeight:800, color:'#1a2a4a', marginBottom:'4px'}}>{c.name}</div>
            <div style={{fontSize:'12px', color:'#6a8ab0', lineHeight:1.5}}>{c.shortDesc}</div>
          </button>
        ))}
        {filtered.length === 0 && <div style={{gridColumn:'1/-1', padding:'20px', textAlign:'center', fontSize:'13px', color:'#8aa0c0'}}>No calculators match. Try a different search or specialty.</div>}
      </div>

      {phase2Filtered.length > 0 && (
        <div style={{...CARD, opacity:0.65, background:'rgba(240,240,240,0.5)'}}>
          <div style={LABEL}>Coming soon</div>
          <div style={{fontSize:'11px', color:'#8aa0c0', marginBottom:'10px'}}>These calculators are on the roadmap. Email <a href="mailto:feedback@soulmd.us" style={{color:'#4a7ad0'}}>feedback@soulmd.us</a> to vote on which we build next.</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
            {phase2Filtered.map(p => (
              <span key={p.id} style={{fontSize:'11px', padding:'4px 10px', borderRadius:'999px', background:'rgba(255,255,255,0.7)', border:'1px solid rgba(200,210,220,0.6)', color:'#6a8ab0'}}>
                {p.name} <span style={{color:'#a0b0c0'}}>· {p.specialty}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </ToolShell>
  );
};

export default CliniScoreTool;
