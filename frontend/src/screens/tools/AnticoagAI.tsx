// © 2026 SoulMD, LLC. All rights reserved.
//
// AnticoagAI — Premium tool. Six chip-based input sections (demographics
// + indication + CHA2DS2-VASc + bleeding factors + meds + conditions).
// Backend (/tools/anticoag/analyze) returns scores + a structured rules-
// engine recommendation + a 3-4 sentence Sonnet narrative. Renders as
// score cards → animated risk bars → color-coded recommendation →
// warnings → agent cards → narrative → references → disclaimer.
import React, { useState } from 'react';
import { ToolShell, CARD, LABEL, INPUT, BTN_PRIMARY, FIELD_LABEL, WORDMARK } from './shared';
import { notifyTrialUsed } from '../../trialHelpers';

interface Props { API: string; token: string; onBack: () => void; }

interface Warning {
  type: string;
  text: string;
  severity: 'high' | 'moderate' | 'low';
}
interface Agent {
  name: string;
  dosing: string;
  notes: string;
  trial_support: string;
}
interface Recommendation {
  primary_action: 'anticoagulate' | 'caution' | 'avoid' | 'neutral';
  primary_text: string;
  warnings: Warning[];
  suggested_agents: Agent[];
  contraindications: string[];
  monitoring_parameters: string[];
  references: string[];
}
interface Scores {
  chads_vasc: number;
  has_bled: number;
  orbit: number;
  annual_stroke_pct: number;
  annual_bleed_pct: number;
  stroke_risk_label: string;
  bleed_risk_label: string;
  crcl: number | null;
}
interface AnticoagResponse {
  scores: Scores;
  recommendation: Recommendation;
  ai_narrative: string;
  case_id: number | null;
  _trial_mode?: boolean;
}

// ─── Chip catalogs ─────────────────────────────────────────────────────────
const INDICATIONS: {id: string; label: string}[] = [
  { id: 'afib',        label: 'Atrial fibrillation' },
  { id: 'dvt_pe',      label: 'DVT / PE' },
  { id: 'mech_valve',  label: 'Mechanical valve' },
  { id: 'aps',         label: 'Antiphospholipid syndrome' },
  { id: 'lvad',        label: 'LVAD' },
  { id: 'lv_thrombus', label: 'LV thrombus' },
  { id: 'stroke_2dy',  label: '2° stroke prevention' },
];
const CHADS_FACTORS: {id: string; label: string}[] = [
  { id: 'chf',        label: 'CHF / LV dysfunction' },
  { id: 'htn',        label: 'Hypertension' },
  { id: 'dm',         label: 'Diabetes' },
  { id: 'vasc',       label: 'Vascular disease' },
  { id: 'stroke_tia', label: 'Prior stroke / TIA (+2)' },
];
const BLEED_FACTORS: {id: string; label: string}[] = [
  { id: 'htn',            label: 'Uncontrolled HTN' },
  { id: 'renal',          label: 'Renal disease' },
  { id: 'hepatic',        label: 'Hepatic disease' },
  { id: 'stroke',         label: 'Prior stroke (HAS-BLED)' },
  { id: 'bleed_history',  label: 'Prior major bleed' },
  { id: 'labile_inr',     label: 'Labile INR' },
  { id: 'elderly',        label: 'Elderly (>65)' },
  { id: 'drugs',          label: 'Antiplatelet / NSAID' },
  { id: 'alcohol',        label: 'Alcohol (≥8/wk)' },
  { id: 'low_hgb',        label: 'Low Hgb (ORBIT)' },
  { id: 'low_gfr',        label: 'GFR < 60 (ORBIT)' },
  { id: 'antiplatelet',   label: 'On antiplatelet (ORBIT)' },
];
const MEDS: {id: string; label: string}[] = [
  { id: 'amiodarone',  label: 'Amiodarone' },
  { id: 'rifampin',    label: 'Rifampin' },
  { id: 'phenytoin',   label: 'Phenytoin' },
  { id: 'carbamazepine', label: 'Carbamazepine' },
  { id: 'antifungal',  label: 'Azole antifungal' },
  { id: 'aspirin',     label: 'Aspirin' },
  { id: 'p2y12',       label: 'P2Y12 inhibitor' },
  { id: 'ssri',        label: 'SSRI' },
  { id: 'warfarin',    label: 'On warfarin' },
  { id: 'apixaban',    label: 'On apixaban' },
  { id: 'rivaroxaban', label: 'On rivaroxaban' },
  { id: 'dabigatran',  label: 'On dabigatran' },
  { id: 'edoxaban',    label: 'On edoxaban' },
];
const CONDITIONS: {id: string; label: string}[] = [
  { id: 'cns_bleed',     label: 'Active CNS bleed' },
  { id: 'dic',           label: 'DIC' },
  { id: 'hit',           label: 'Heparin-induced thrombocytopenia' },
  { id: 'pregnancy',     label: 'Pregnancy' },
  { id: 'active_cancer', label: 'Active cancer' },
  { id: 'gi_gu_cancer',  label: 'GI / GU primary' },
  { id: 'cirrhosis',     label: 'Cirrhosis' },
  { id: 'ckd4',          label: 'CKD stage 4' },
  { id: 'ckd5',          label: 'CKD 5 / dialysis' },
  { id: 'recent_surgery',label: 'Recent surgery' },
];

// Per-section accent palette — chip color when active.
const ACCENTS = {
  indication: { bg: 'rgba(122,176,240,0.18)', fg: '#1a2a4a', border: '#7ab0f0' },
  chads:      { bg: 'rgba(122,176,240,0.18)', fg: '#1a2a4a', border: '#7ab0f0' },
  bleed:      { bg: 'rgba(220,80,80,0.14)',   fg: '#7a1f1f', border: '#dc5050' },
  meds:       { bg: 'rgba(220,160,30,0.16)',  fg: '#7a5a10', border: '#daa820' },
  conditions: { bg: 'rgba(140,90,200,0.14)',  fg: '#3e2a78', border: '#9b6dc8' },
};

const ACTION_PALETTE = {
  anticoagulate: { bg:'#E8F8EE', border:'#56B07A', fg:'#1F5A3A', label:'Anticoagulate' },
  caution:       { bg:'#FFF5DC', border:'#D4A02C', fg:'#7A5A10', label:'Proceed with caution' },
  avoid:         { bg:'#FCE9E9', border:'#C44A4A', fg:'#7A1F1F', label:'Hold / avoid anticoagulation' },
  neutral:       { bg:'#EEF2F8', border:'#7ab0f0', fg:'#1a2a4a', label:'No specific action' },
} as const;

const SEVERITY_PALETTE = {
  high:     { bg:'rgba(196,74,74,0.10)', fg:'#7A1F1F', border:'#C44A4A' },
  moderate: { bg:'rgba(212,160,44,0.12)', fg:'#7A5A10', border:'#D4A02C' },
  low:      { bg:'rgba(122,176,240,0.10)', fg:'#1a2a4a', border:'#7ab0f0' },
};

const AnticoagAI: React.FC<Props> = ({ API, token, onBack }) => {
  // ─── Form state ──────────────────────────────────────────────────────
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [weightKg, setWeightKg] = useState<string>('');
  const [creatinine, setCreatinine] = useState<string>('');
  const [platelets, setPlatelets] = useState<string>('');
  const [inr, setInr] = useState<string>('');
  const [indications, setIndications] = useState<Set<string>>(new Set());
  const [chadsFactors, setChadsFactors] = useState<Set<string>>(new Set());
  const [bleedFactors, setBleedFactors] = useState<Set<string>>(new Set());
  const [meds, setMeds] = useState<Set<string>>(new Set());
  const [conditions, setConditions] = useState<Set<string>>(new Set());

  const [results, setResults] = useState<AnticoagResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const submit = async () => {
    setError(null);
    if (!age) { setError('Age is required.'); return; }
    setLoading(true);
    try {
      const body = {
        age: parseInt(age, 10),
        sex,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        creatinine: creatinine ? parseFloat(creatinine) : null,
        platelets: platelets ? parseInt(platelets, 10) : null,
        inr: inr ? parseFloat(inr) : null,
        indications: Array.from(indications),
        chads_factors: Array.from(chadsFactors),
        bleed_factors: Array.from(bleedFactors),
        medications: Array.from(meds),
        conditions: Array.from(conditions),
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(`${API}/tools/anticoag/analyze`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (r.status === 402) {
        const j = await r.json().catch(() => ({}));
        setError(j.detail || 'Subscribe to AnticoagAI or SoulMD Suite to use this tool.');
        return;
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detail || `Request failed (${r.status})`);
      }
      const d = await r.json() as AnticoagResponse;
      setResults(d);
      if (d._trial_mode) notifyTrialUsed('anticoag');
      // Smooth scroll into the results panel.
      setTimeout(() => {
        document.getElementById('anticoag-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      name="AnticoagAI"
      subtitle="Evidence-based anticoagulation decision support"
      icon="💉"
      onBack={onBack}
    >
      {/* ─── Patient demographics ─────────────────────────────────── */}
      <div style={CARD}>
        <div style={LABEL}>Patient demographics</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'10px'}}>
          <Field label="Age (years)">
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 78" style={INPUT}/>
          </Field>
          <Field label="Sex">
            <div style={{display:'flex', gap:'6px'}}>
              {(['M','F'] as const).map(s => (
                <button key={s} type="button" onClick={() => setSex(s)} style={{
                  flex:1, padding:'9px 10px', borderRadius:'10px',
                  background: sex === s ? WORDMARK : 'rgba(240,246,255,0.5)',
                  color: sex === s ? 'white' : '#1a2a4a',
                  border: sex === s ? 'none' : '1px solid rgba(122,176,240,0.3)',
                  fontWeight: 700, fontSize:'13px', cursor:'pointer',
                }}>{s === 'M' ? 'Male' : 'Female'}</button>
              ))}
            </div>
          </Field>
          <Field label="Weight (kg)">
            <input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="e.g. 72" style={INPUT}/>
          </Field>
          <Field label="Creatinine (mg/dL)">
            <input type="number" step="0.01" value={creatinine} onChange={e => setCreatinine(e.target.value)} placeholder="e.g. 1.1" style={INPUT}/>
          </Field>
          <Field label="Platelets (×10⁹/L)">
            <input type="number" value={platelets} onChange={e => setPlatelets(e.target.value)} placeholder="e.g. 220" style={INPUT}/>
          </Field>
          <Field label="INR (if on warfarin)">
            <input type="number" step="0.1" value={inr} onChange={e => setInr(e.target.value)} placeholder="e.g. 2.4" style={INPUT}/>
          </Field>
        </div>
      </div>

      <ChipSection
        label="Indication"
        customNoun="indication"
        accent={ACCENTS.indication}
        options={INDICATIONS}
        selected={indications}
        onToggle={toggle(indications, setIndications)}
      />
      <ChipSection
        label="CHA₂DS₂-VASc factors (age + sex auto-included)"
        customNoun="risk factor"
        accent={ACCENTS.chads}
        options={CHADS_FACTORS}
        selected={chadsFactors}
        onToggle={toggle(chadsFactors, setChadsFactors)}
      />
      <ChipSection
        label="Bleeding risk factors (HAS-BLED + ORBIT)"
        customNoun="bleeding factor"
        accent={ACCENTS.bleed}
        options={BLEED_FACTORS}
        selected={bleedFactors}
        onToggle={toggle(bleedFactors, setBleedFactors)}
      />
      <ChipSection
        label="Current medications"
        customNoun="medication"
        accent={ACCENTS.meds}
        options={MEDS}
        selected={meds}
        onToggle={toggle(meds, setMeds)}
      />
      <ChipSection
        label="Active conditions"
        customNoun="condition"
        accent={ACCENTS.conditions}
        options={CONDITIONS}
        selected={conditions}
        onToggle={toggle(conditions, setConditions)}
      />

      {error && (
        <div style={{
          background:'rgba(196,74,74,0.10)', color:'#7A1F1F',
          border:'1px solid rgba(196,74,74,0.25)', borderRadius:'14px',
          padding:'12px 16px', marginBottom:'14px', fontSize:'13px', fontWeight:600,
        }}>{error}</div>
      )}

      <button onClick={submit} disabled={loading} style={{
        ...BTN_PRIMARY, width:'100%', marginBottom:'18px',
        opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer',
      }}>
        {loading ? 'Analyzing…' : 'Analyze patient'}
      </button>

      {results && <Results data={results} />}

      {/* Disclaimer */}
      <div style={{
        marginTop:'24px', padding:'12px 14px',
        background:'rgba(240,246,255,0.6)',
        border:'1px solid rgba(122,176,240,0.25)',
        borderRadius:'12px', fontSize:'11px', color:'#6a8ab0', lineHeight:1.6,
      }}>
        Clinical decision support only. Not a substitute for physician judgment.
        Beta — not HIPAA compliant. Verify dosing against current FDA labeling
        and institutional guidelines before prescribing.
      </div>
    </ToolShell>
  );
};

const Field: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (
  <div>
    <div style={FIELD_LABEL}>{label}</div>
    {children}
  </div>
);

const ChipSection: React.FC<{
  label: string;
  customNoun: string;  // singular noun for placeholder copy ("medication", "indication", ...)
  accent: { bg: string; fg: string; border: string };
  options: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}> = ({ label, customNoun, accent, options, selected, onToggle }) => {
  const [input, setInput] = useState('');
  const presetIds = React.useMemo(() => new Set(options.map(o => o.id)), [options]);
  // Anything in `selected` that isn't a preset id is a user-added custom chip.
  // Rendered after the preset row with an × so it's obvious how to remove —
  // clicking the chip body also removes (it's a normal toggle).
  const customSelected = React.useMemo(
    () => Array.from(selected).filter(id => !presetIds.has(id)),
    [selected, presetIds],
  );

  const addCustom = () => {
    const v = input.trim();
    if (!v) return;
    if (selected.has(v)) { setInput(''); return; }
    onToggle(v);
    setInput('');
  };

  return (
    <div style={CARD}>
      <div style={LABEL}>{label}</div>
      <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
        {options.map(o => {
          const on = selected.has(o.id);
          return (
            <button key={o.id} type="button" onClick={() => onToggle(o.id)} style={{
              padding:'7px 12px', borderRadius:'999px',
              border: `1px solid ${on ? accent.border : 'rgba(122,176,240,0.25)'}`,
              background: on ? accent.bg : 'rgba(255,255,255,0.6)',
              color: on ? accent.fg : '#6a8ab0',
              fontSize:'12px', fontWeight: on ? 700 : 600, cursor:'pointer',
              fontFamily:'inherit',
            }}>{o.label}</button>
          );
        })}
        {customSelected.map(v => (
          <button
            key={`custom:${v}`}
            type="button"
            onClick={() => onToggle(v)}
            title="Click to remove"
            style={{
              display:'inline-flex', alignItems:'center', gap:'5px',
              padding:'7px 8px 7px 12px', borderRadius:'999px',
              border: `1px solid ${accent.border}`,
              background: accent.bg, color: accent.fg,
              fontSize:'12px', fontWeight: 700, cursor:'pointer',
              fontFamily:'inherit',
            }}
          >
            <span>{v}</span>
            <span aria-hidden style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width:'16px', height:'16px', borderRadius:'50%',
              background: 'rgba(255,255,255,0.55)',
              fontSize:'12px', lineHeight:1, fontWeight: 700,
            }}>×</span>
          </button>
        ))}
      </div>
      <div style={{display:'flex', gap:'6px', marginTop:'10px', alignItems:'center'}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={`Type to add custom ${customNoun}…`}
          style={{
            ...INPUT, fontSize:'12px', padding:'8px 10px',
            background:'rgba(255,255,255,0.7)',
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!input.trim()}
          style={{
            padding:'8px 14px', borderRadius:'10px',
            border:`1px solid ${accent.border}`,
            background: input.trim() ? accent.bg : 'rgba(255,255,255,0.5)',
            color: input.trim() ? accent.fg : '#aab7cf',
            fontSize:'12px', fontWeight:700,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontFamily:'inherit', whiteSpace:'nowrap',
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
};

// ─── Results ─────────────────────────────────────────────────────────────
const Results: React.FC<{data: AnticoagResponse}> = ({ data }) => {
  const palette = ACTION_PALETTE[data.recommendation.primary_action];
  return (
    <div id="anticoag-results">
      {/* Score cards */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',
        gap:'10px', marginBottom:'14px',
      }}>
        <ScoreCard
          label="CHA₂DS₂-VASc"
          value={data.scores.chads_vasc}
          riskLabel={data.scores.stroke_risk_label}
          accent="#7ab0f0"
        />
        <ScoreCard
          label="HAS-BLED"
          value={data.scores.has_bled}
          riskLabel={data.scores.bleed_risk_label}
          accent="#dc5050"
        />
        <ScoreCard
          label="ORBIT"
          value={data.scores.orbit}
          riskLabel={data.scores.orbit >= 4 ? 'High' : data.scores.orbit >= 3 ? 'Medium' : 'Low'}
          accent="#9b6dc8"
        />
      </div>

      {/* Animated risk bars */}
      <div style={{...CARD, marginBottom:'14px'}}>
        <div style={LABEL}>Annual risk (estimated, untreated)</div>
        <RiskBar label="Stroke" pct={data.scores.annual_stroke_pct} color="#dc5050"/>
        <RiskBar label="Major bleed (on therapy)" pct={data.scores.annual_bleed_pct} color="#daa820"/>
        {data.scores.crcl != null && (
          <div style={{fontSize:'11px', color:'#6a8ab0', marginTop:'8px'}}>
            Estimated CrCl (Cockcroft-Gault): <strong style={{color:'#1a2a4a'}}>{data.scores.crcl} mL/min</strong>
          </div>
        )}
      </div>

      {/* Primary recommendation */}
      <div style={{
        background: palette.bg, border:`1.5px solid ${palette.border}`,
        borderRadius:'18px', padding:'18px 20px', marginBottom:'14px',
      }}>
        <div style={{
          fontSize:'10px', letterSpacing:'1.6px', textTransform:'uppercase',
          fontWeight:800, color: palette.fg, marginBottom:'4px',
        }}>Primary recommendation</div>
        <div style={{fontSize:'17px', fontWeight:700, color: palette.fg, marginBottom:'8px'}}>
          {palette.label}
        </div>
        <div style={{fontSize:'13.5px', color: palette.fg, lineHeight:1.6}}>
          {data.recommendation.primary_text}
        </div>
      </div>

      {/* Warnings */}
      {data.recommendation.warnings.length > 0 && (
        <div style={{...CARD, marginBottom:'14px'}}>
          <div style={LABEL}>Warnings</div>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {data.recommendation.warnings.map((w, i) => {
              const sev = SEVERITY_PALETTE[w.severity] || SEVERITY_PALETTE.low;
              return (
                <div key={i} style={{
                  background: sev.bg, color: sev.fg,
                  border: `1px solid ${sev.border}`, borderRadius:'12px',
                  padding:'10px 14px', fontSize:'13px', lineHeight:1.5,
                }}>
                  <div style={{
                    fontSize:'9px', letterSpacing:'1.4px', textTransform:'uppercase',
                    fontWeight:800, marginBottom:'2px',
                  }}>{w.severity} · {w.type.replace(/_/g, ' ')}</div>
                  {w.text}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested agents */}
      {data.recommendation.suggested_agents.length > 0 && (
        <div style={{...CARD, marginBottom:'14px'}}>
          <div style={LABEL}>Suggested agents</div>
          <div style={{display:'grid', gap:'10px'}}>
            {data.recommendation.suggested_agents.map((a, i) => (
              <div key={i} style={{
                background:'rgba(240,246,255,0.5)', borderRadius:'14px',
                border:'1px solid rgba(122,176,240,0.25)', padding:'12px 14px',
              }}>
                <div style={{display:'flex', alignItems:'baseline', gap:'8px', flexWrap:'wrap'}}>
                  <div style={{fontSize:'15px', fontWeight:700, color:'#1a2a4a'}}>{a.name}</div>
                  <div style={{fontSize:'11px', color:'#6a8ab0'}}>{a.trial_support}</div>
                </div>
                <div style={{fontSize:'12.5px', color:'#1a2a4a', marginTop:'4px', fontFamily:'ui-monospace, monospace'}}>{a.dosing}</div>
                {a.notes && <div style={{fontSize:'12px', color:'#6a8ab0', marginTop:'4px', lineHeight:1.5}}>{a.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contraindications */}
      {data.recommendation.contraindications.length > 0 && (
        <div style={{...CARD, marginBottom:'14px'}}>
          <div style={LABEL}>Contraindications</div>
          <ul style={{margin:0, paddingLeft:'18px', color:'#7A1F1F', fontSize:'13px', lineHeight:1.7}}>
            {data.recommendation.contraindications.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Monitoring */}
      {data.recommendation.monitoring_parameters.length > 0 && (
        <div style={{...CARD, marginBottom:'14px'}}>
          <div style={LABEL}>Monitoring parameters</div>
          <ul style={{margin:0, paddingLeft:'18px', color:'#1a2a4a', fontSize:'13px', lineHeight:1.7}}>
            {data.recommendation.monitoring_parameters.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* AI narrative */}
      {data.ai_narrative && (
        <div style={{
          background:'linear-gradient(135deg, rgba(122,176,240,0.10), rgba(155,143,232,0.10))',
          border:'1px solid rgba(122,176,240,0.30)', borderRadius:'18px',
          padding:'16px 18px', marginBottom:'14px',
        }}>
          <div style={{
            fontSize:'10px', letterSpacing:'1.6px', textTransform:'uppercase',
            fontWeight:800, color:'#534AB7', marginBottom:'6px',
          }}>AI clinical narrative · Claude Sonnet</div>
          <div style={{fontSize:'13.5px', color:'#1a2a4a', lineHeight:1.7, whiteSpace:'pre-wrap'}}>
            {data.ai_narrative}
          </div>
        </div>
      )}

      {/* References */}
      {data.recommendation.references.length > 0 && (
        <div style={{...CARD, marginBottom:'14px'}}>
          <div style={LABEL}>Evidence references</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
            {data.recommendation.references.map((r, i) => (
              <span key={i} style={{
                fontSize:'11px', padding:'5px 10px', borderRadius:'999px',
                background:'rgba(122,176,240,0.12)', color:'#1a2a4a',
                border:'1px solid rgba(122,176,240,0.25)',
              }}>{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreCard: React.FC<{label: string; value: number; riskLabel: string; accent: string}> = ({ label, value, riskLabel, accent }) => (
  <div style={{
    background:'rgba(255,255,255,0.85)', borderRadius:'16px',
    padding:'14px 16px', border:`1px solid ${accent}40`,
    boxShadow:'0 4px 16px rgba(100,130,200,0.08)',
  }}>
    <div style={{fontSize:'10px', letterSpacing:'1.4px', textTransform:'uppercase', color:'#6a8ab0', fontWeight:700}}>{label}</div>
    <div style={{
      fontSize:'34px', fontWeight:800, color:'#1a2a4a',
      fontFamily:'Georgia, serif', lineHeight:1.1, marginTop:'4px',
    }}>{value}</div>
    <div style={{
      display:'inline-block', marginTop:'6px',
      fontSize:'10px', letterSpacing:'1px', fontWeight:700,
      padding:'2px 8px', borderRadius:'8px',
      color: accent, background: `${accent}18`,
    }}>{riskLabel.toUpperCase()}</div>
  </div>
);

const RiskBar: React.FC<{label: string; pct: number; color: string}> = ({ label, pct, color }) => {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setW(Math.min(100, pct * 4)), 50);  // 25% → full bar
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{margin:'10px 0'}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'4px'}}>
        <span style={{color:'#1a2a4a', fontWeight:600}}>{label}</span>
        <span style={{color, fontWeight:800}}>{pct.toFixed(1)}% / yr</span>
      </div>
      <div style={{height:'8px', background:'rgba(122,176,240,0.15)', borderRadius:'4px', overflow:'hidden'}}>
        <div style={{
          height:'100%', width:`${w}%`, background: color,
          borderRadius:'4px', transition:'width 600ms ease-out',
        }}/>
      </div>
    </div>
  );
};

export default AnticoagAI;
