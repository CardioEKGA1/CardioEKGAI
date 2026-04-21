// © 2026 SoulMD, LLC. All rights reserved.
//
// RiskRead calculator library.
// All formulas run client-side and are deterministic — AI is layered on top
// for interpretation + guideline-aligned next steps only. Never let AI
// "recompute" these scores; the formula here is the source of truth.
//
// Phase-1 coverage (this commit): ~30 calculators across 12 specialties,
// all with validated formulas and standard-of-care thresholds. The user's
// aspirational list (70+) is tracked in PHASE_2_CALCULATORS below so we
// can see what's outstanding.
//
// References in each calculator are the primary guideline or derivation
// paper; they're surfaced in the AI interpretation layer via citation tags.

export type CalcVarType = 'number' | 'boolean' | 'select';

export interface CalcOption { label: string; value: number; }

export interface CalcVariable {
  id: string;
  label: string;
  type: CalcVarType;
  options?: CalcOption[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helpText?: string;
}

export type CategoryColor = 'green' | 'yellow' | 'orange' | 'red';

export interface CalcResult {
  score: number;
  displayScore?: string;          // override the rendered score (for fractional/percent outputs)
  unit?: string;
  category: string;
  color: CategoryColor;
  summary: string;                // one-line plain-language meaning
  extras?: Record<string, string | number>; // secondary computed values
}

export interface Calculator {
  id: string;
  name: string;
  specialty: string;
  shortDesc: string;
  variables: CalcVariable[];
  compute: (v: Record<string, number>) => CalcResult;
  references?: string[];
}

const ln = Math.log;

// Convenience for yes/no booleans represented as 0/1.
const YN = (ptsYes: number) => ({
  type: 'select' as const,
  options: [{ label: 'No', value: 0 }, { label: 'Yes', value: ptsYes }],
});

// Helpers for rendering a one-liner
const cat = (score: number, category: string, color: CategoryColor, summary: string, extras?: Record<string, string|number>): CalcResult =>
  ({ score, category, color, summary, extras });

export const CALCULATORS: Calculator[] = [

  // ── CARDIOLOGY ────────────────────────────────────────────────────────────
  {
    id: 'chadsvasc',
    name: 'CHA₂DS₂-VASc',
    specialty: 'Cardiology',
    shortDesc: 'Stroke risk in non-valvular AFib',
    references: ['ESC 2020 AF', 'AHA/ACC/HRS 2019'],
    variables: [
      { id: 'chf', label: 'Congestive heart failure', ...YN(1) },
      { id: 'htn', label: 'Hypertension', ...YN(1) },
      { id: 'age75', label: 'Age ≥75', ...YN(2) },
      { id: 'age6574', label: 'Age 65–74', ...YN(1) },
      { id: 'dm', label: 'Diabetes mellitus', ...YN(1) },
      { id: 'stroke', label: 'Prior stroke / TIA / thromboembolism', ...YN(2) },
      { id: 'vasc', label: 'Vascular disease (MI, PAD, aortic plaque)', ...YN(1) },
      { id: 'female', label: 'Female sex', ...YN(1) },
    ],
    compute: (v) => {
      const score = (v.chf||0)+(v.htn||0)+(v.age75||0)+(v.age6574||0)+(v.dm||0)+(v.stroke||0)+(v.vasc||0)+(v.female||0);
      if (score === 0) return cat(score, 'Low risk', 'green', 'Annual stroke risk ~0.2%. Anticoagulation generally not recommended.');
      if (score === 1) return cat(score, 'Low–moderate', 'yellow', 'Annual stroke risk ~0.6%. Consider anticoagulation (strength depends on the single risk factor).');
      return cat(score, 'High risk', 'red', 'Annual stroke risk ≥2.2%. Anticoagulation recommended unless contraindicated.');
    },
  },
  {
    id: 'hasbled',
    name: 'HAS-BLED',
    specialty: 'Cardiology',
    shortDesc: 'Major bleeding risk on anticoagulation',
    references: ['ESC 2020 AF'],
    variables: [
      { id: 'htn', label: 'Uncontrolled hypertension (SBP >160)', ...YN(1) },
      { id: 'renal', label: 'Abnormal renal function (Cr >2.26 mg/dL or dialysis)', ...YN(1) },
      { id: 'liver', label: 'Abnormal liver function (cirrhosis / bili 2× ULN / AST 3× ULN)', ...YN(1) },
      { id: 'stroke', label: 'Prior stroke', ...YN(1) },
      { id: 'bleeding', label: 'Prior major bleeding or predisposition', ...YN(1) },
      { id: 'labile_inr', label: 'Labile INR (on warfarin, TTR <60%)', ...YN(1) },
      { id: 'elderly', label: 'Age >65', ...YN(1) },
      { id: 'drugs', label: 'Concomitant antiplatelet / NSAID', ...YN(1) },
      { id: 'alcohol', label: 'Alcohol ≥8 drinks/week', ...YN(1) },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b) => a + (b||0), 0);
      if (score <= 1) return cat(score, 'Low bleeding risk', 'green', 'Annual major bleeding risk ~1%. Anticoagulation generally appropriate.');
      if (score <= 2) return cat(score, 'Moderate', 'yellow', 'Annual major bleeding ~1.9–3.7%. Address modifiable risk factors; proceed with anticoagulation and monitoring.');
      return cat(score, 'High bleeding risk', 'red', 'Annual major bleeding ≥5.8%. Reassess reversible factors; does NOT preclude anticoagulation on its own.');
    },
  },
  {
    id: 'heart',
    name: 'HEART Score',
    specialty: 'Cardiology',
    shortDesc: '6-week MACE risk in ED chest pain',
    references: ['Backus 2013', 'ACC 2022 Chest Pain'],
    variables: [
      { id: 'history', label: 'History', type: 'select', options: [
        { label: 'Slightly suspicious (0)', value: 0 },
        { label: 'Moderately suspicious (1)', value: 1 },
        { label: 'Highly suspicious (2)', value: 2 },
      ]},
      { id: 'ekg', label: 'EKG', type: 'select', options: [
        { label: 'Normal (0)', value: 0 },
        { label: 'Non-specific repolarization (1)', value: 1 },
        { label: 'Significant ST deviation (2)', value: 2 },
      ]},
      { id: 'age', label: 'Age', type: 'select', options: [
        { label: '<45 (0)', value: 0 },
        { label: '45–64 (1)', value: 1 },
        { label: '≥65 (2)', value: 2 },
      ]},
      { id: 'risk', label: 'Risk factors (HTN, hyperlipid, DM, smoking, obesity, FHx)', type: 'select', options: [
        { label: 'None (0)', value: 0 },
        { label: '1–2 (1)', value: 1 },
        { label: '≥3 or established atherosclerosis (2)', value: 2 },
      ]},
      { id: 'troponin', label: 'Initial troponin', type: 'select', options: [
        { label: '≤ normal limit (0)', value: 0 },
        { label: '1–3× normal (1)', value: 1 },
        { label: '>3× normal (2)', value: 2 },
      ]},
    ],
    compute: (v) => {
      const score = (v.history||0)+(v.ekg||0)+(v.age||0)+(v.risk||0)+(v.troponin||0);
      if (score <= 3) return cat(score, 'Low risk', 'green', '6-week MACE ~1.7%. Most can be discharged with close follow-up.');
      if (score <= 6) return cat(score, 'Moderate', 'yellow', '6-week MACE ~16.6%. Admit / observe with serial biomarkers and workup.');
      return cat(score, 'High risk', 'red', '6-week MACE ~50.1%. Early invasive strategy; cardiology consultation.');
    },
  },
  {
    id: 'timi_ua',
    name: 'TIMI (UA / NSTEMI)',
    specialty: 'Cardiology',
    shortDesc: '14-day death, MI, urgent revasc',
    references: ['Antman 2000'],
    variables: [
      { id: 'age65', label: 'Age ≥65', ...YN(1) },
      { id: 'riskf', label: '≥3 CAD risk factors', ...YN(1) },
      { id: 'cad', label: 'Known CAD (stenosis ≥50%)', ...YN(1) },
      { id: 'asa', label: 'ASA use in past 7 days', ...YN(1) },
      { id: 'angina', label: 'Severe angina (≥2 episodes in 24h)', ...YN(1) },
      { id: 'st', label: 'ST deviation ≥0.5 mm', ...YN(1) },
      { id: 'trop', label: 'Positive cardiac marker', ...YN(1) },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0), 0);
      if (score <= 2) return cat(score, 'Low risk', 'green', '14-day event rate ~4.7–8.3%.');
      if (score <= 4) return cat(score, 'Intermediate', 'yellow', '14-day event rate ~13.2–19.9%. Consider early invasive.');
      return cat(score, 'High risk', 'red', '14-day event rate ~26.2–40.9%. Early invasive strategy.');
    },
  },
  {
    id: 'map',
    name: 'Mean Arterial Pressure',
    specialty: 'Cardiology',
    shortDesc: 'MAP from SBP/DBP',
    variables: [
      { id: 'sbp', label: 'Systolic BP', type: 'number', unit: 'mmHg', min: 40, max: 260 },
      { id: 'dbp', label: 'Diastolic BP', type: 'number', unit: 'mmHg', min: 20, max: 160 },
    ],
    compute: (v) => {
      const map = (2*(v.dbp||0) + (v.sbp||0)) / 3;
      const score = Math.round(map * 10) / 10;
      if (map >= 65 && map <= 100) return cat(score, 'Adequate perfusion', 'green', 'MAP ≥65 mmHg is the standard vasopressor target in septic shock.');
      if (map < 65) return cat(score, 'Low MAP', 'red', 'MAP <65 mmHg — under-perfusion risk. Consider fluids / vasopressors.');
      return cat(score, 'Elevated MAP', 'yellow', 'MAP >100 mmHg — consider HTN context.');
    },
  },
  {
    id: 'shock_index',
    name: 'Shock Index',
    specialty: 'Cardiology',
    shortDesc: 'HR ÷ SBP early-shock marker',
    variables: [
      { id: 'hr', label: 'Heart rate', type: 'number', unit: 'bpm', min: 20, max: 250 },
      { id: 'sbp', label: 'Systolic BP', type: 'number', unit: 'mmHg', min: 40, max: 260 },
    ],
    compute: (v) => {
      const si = (v.hr||0) / Math.max(1, v.sbp||1);
      const score = Math.round(si * 100) / 100;
      if (si < 0.7) return cat(score, 'Normal', 'green', 'SI <0.7 is normal.');
      if (si < 1.0) return cat(score, 'Borderline', 'yellow', 'SI 0.7–1.0 may precede overt shock — reassess.');
      return cat(score, 'Shock range', 'red', 'SI ≥1.0 associated with significantly higher mortality.');
    },
  },
  {
    id: 'qtc_bazett',
    name: 'Corrected QT (Bazett)',
    specialty: 'Cardiology',
    shortDesc: 'QTc via Bazett formula',
    variables: [
      { id: 'qt', label: 'Measured QT', type: 'number', unit: 'ms', min: 200, max: 700 },
      { id: 'hr', label: 'Heart rate', type: 'number', unit: 'bpm', min: 30, max: 220 },
    ],
    compute: (v) => {
      const rr = 60 / Math.max(1, v.hr||1); // seconds
      const qtc = (v.qt||0) / Math.sqrt(rr);
      const score = Math.round(qtc);
      if (qtc < 440) return cat(score, 'Normal', 'green', 'QTc <440 ms. Note Bazett over-corrects at high HR — prefer Fridericia when HR >90.', {unit:'ms'});
      if (qtc < 470) return cat(score, 'Borderline prolonged', 'yellow', 'QTc 440–470 ms — review QT-prolonging drugs.', {unit:'ms'});
      if (qtc < 500) return cat(score, 'Prolonged', 'orange', 'QTc ≥470 ms — moderate TdP risk.', {unit:'ms'});
      return cat(score, 'Markedly prolonged', 'red', 'QTc ≥500 ms — high TdP risk. Stop offending drugs; correct K, Mg.', {unit:'ms'});
    },
  },

  // ── PULMONOLOGY ───────────────────────────────────────────────────────────
  {
    id: 'wells_pe',
    name: 'Wells Score (PE)',
    specialty: 'Pulmonology',
    shortDesc: 'Pre-test probability of PE',
    references: ['Wells 2000'],
    variables: [
      { id: 'dvt_signs', label: 'Clinical signs/symptoms of DVT', ...YN(3) },
      { id: 'alt_dx', label: 'PE is most likely dx (other dx less likely)', ...YN(3) },
      { id: 'tachy', label: 'HR >100', ...YN(1.5) },
      { id: 'immob', label: 'Immobilization ≥3 d or surgery within 4 wk', ...YN(1.5) },
      { id: 'prior', label: 'Previous PE/DVT', ...YN(1.5) },
      { id: 'hemoptysis', label: 'Hemoptysis', ...YN(1) },
      { id: 'ca', label: 'Active malignancy', ...YN(1) },
    ],
    compute: (v) => {
      const score = Math.round((Object.values(v).reduce((a,b)=>a+(b||0),0)) * 10) / 10;
      if (score < 2) return cat(score, 'Low probability', 'green', '~1.3% PE. If PERC-negative, no workup needed.');
      if (score <= 6) return cat(score, 'Moderate', 'yellow', '~16.2% PE. Obtain D-dimer; if positive, image.');
      return cat(score, 'High probability', 'red', '~40.6% PE. Proceed directly to CTPA / V/Q imaging.');
    },
  },
  {
    id: 'curb65',
    name: 'CURB-65',
    specialty: 'Pulmonology',
    shortDesc: 'CAP severity / disposition',
    references: ['Lim 2003', 'IDSA/ATS 2019'],
    variables: [
      { id: 'confusion', label: 'Confusion (new disorientation)', ...YN(1) },
      { id: 'urea', label: 'BUN >19 mg/dL (urea >7 mmol/L)', ...YN(1) },
      { id: 'rr', label: 'RR ≥30', ...YN(1) },
      { id: 'bp', label: 'SBP <90 or DBP ≤60', ...YN(1) },
      { id: 'age', label: 'Age ≥65', ...YN(1) },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score <= 1) return cat(score, 'Low mortality', 'green', '30-day mortality ~1.5%. Outpatient treatment typically safe.');
      if (score === 2) return cat(score, 'Moderate', 'yellow', '30-day mortality ~9.2%. Short-stay or hospital ward.');
      return cat(score, 'Severe', 'red', '30-day mortality ~22–40%. Inpatient — consider ICU if ≥3.');
    },
  },
  {
    id: 'stopbang',
    name: 'STOP-BANG',
    specialty: 'Pulmonology',
    shortDesc: 'Obstructive sleep apnea screen',
    references: ['Chung 2008'],
    variables: [
      { id: 'snore', label: 'Snoring loudly', ...YN(1) },
      { id: 'tired', label: 'Daytime tiredness / sleepiness', ...YN(1) },
      { id: 'observed', label: 'Observed apnea / gasping', ...YN(1) },
      { id: 'bp', label: 'Hypertension (treated or untreated)', ...YN(1) },
      { id: 'bmi', label: 'BMI >35', ...YN(1) },
      { id: 'age', label: 'Age >50', ...YN(1) },
      { id: 'neck', label: 'Neck circumference >40 cm', ...YN(1) },
      { id: 'male', label: 'Male sex', ...YN(1) },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score <= 2) return cat(score, 'Low OSA risk', 'green', 'Low probability — OSA unlikely.');
      if (score <= 4) return cat(score, 'Intermediate', 'yellow', 'Intermediate risk — consider sleep study.');
      return cat(score, 'High OSA risk', 'red', 'High probability — recommend sleep study, especially preoperatively.');
    },
  },
  {
    id: 'qsofa',
    name: 'qSOFA',
    specialty: 'Infectious Disease',
    shortDesc: 'Early sepsis screen outside ICU',
    references: ['Sepsis-3 2016'],
    variables: [
      { id: 'rr', label: 'RR ≥22', ...YN(1) },
      { id: 'sbp', label: 'SBP ≤100 mmHg', ...YN(1) },
      { id: 'ams', label: 'Altered mental status (GCS <15)', ...YN(1) },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score < 2) return cat(score, 'Low', 'green', 'Does not rule out sepsis — repeat if clinical concern persists.');
      return cat(score, 'Concerning', 'red', 'qSOFA ≥2 — high mortality risk. Aggressive sepsis workup and management.');
    },
  },
  {
    id: 'centor',
    name: 'Centor (McIsaac-modified)',
    specialty: 'Infectious Disease',
    shortDesc: 'Strep pharyngitis probability',
    variables: [
      { id: 'tonsil', label: 'Tonsillar exudate', ...YN(1) },
      { id: 'lymph', label: 'Tender anterior cervical nodes', ...YN(1) },
      { id: 'fever', label: 'Fever (>38°C)', ...YN(1) },
      { id: 'cough', label: 'Absence of cough', ...YN(1) },
      { id: 'age', label: 'Age', type: 'select', options: [
        { label: '3–14 (+1)', value: 1 },
        { label: '15–44 (0)', value: 0 },
        { label: '≥45 (−1)', value: -1 },
      ]},
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score <= 0) return cat(score, 'Very low', 'green', '<2.5% GAS probability — no testing.');
      if (score === 1) return cat(score, 'Low', 'green', '~5–10% — no testing.');
      if (score <= 3) return cat(score, 'Intermediate', 'yellow', '~15–35% — rapid strep testing.');
      return cat(score, 'High', 'red', '≥50% — treat empirically or test-and-treat.');
    },
  },

  // ── NEPHROLOGY ────────────────────────────────────────────────────────────
  {
    id: 'cockcroft_gault',
    name: 'Cockcroft-Gault CrCl',
    specialty: 'Nephrology',
    shortDesc: 'Creatinine clearance estimate',
    references: ['Cockcroft 1976'],
    variables: [
      { id: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120 },
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg', min: 20, max: 250 },
      { id: 'cr', label: 'Serum creatinine', type: 'number', unit: 'mg/dL', min: 0.2, max: 15, step: 0.01 },
      { id: 'female', label: 'Female', ...YN(1) },
    ],
    compute: (v) => {
      const base = ((140 - (v.age||0)) * (v.weight||0)) / (72 * Math.max(0.1, v.cr||1));
      const crcl = base * (v.female ? 0.85 : 1);
      const score = Math.round(crcl);
      if (crcl >= 90) return cat(score, 'Normal / stage 1', 'green', 'CrCl ≥90 mL/min.', {unit:'mL/min'});
      if (crcl >= 60) return cat(score, 'Mildly decreased', 'green', 'CrCl 60–89 mL/min — consistent with CKD stage 2 if chronic.', {unit:'mL/min'});
      if (crcl >= 45) return cat(score, 'Moderate (3a)', 'yellow', 'CrCl 45–59 mL/min — renal-dose many drugs.', {unit:'mL/min'});
      if (crcl >= 30) return cat(score, 'Moderate (3b)', 'orange', 'CrCl 30–44 mL/min — significant dose adjustments needed.', {unit:'mL/min'});
      if (crcl >= 15) return cat(score, 'Severe (4)', 'red', 'CrCl 15–29 mL/min — many drugs contraindicated.', {unit:'mL/min'});
      return cat(score, 'Kidney failure (5)', 'red', 'CrCl <15 mL/min — dialysis candidate.', {unit:'mL/min'});
    },
  },
  {
    id: 'ckd_epi',
    name: 'CKD-EPI 2021 (race-free)',
    specialty: 'Nephrology',
    shortDesc: 'eGFR — adult, race-free',
    references: ['Inker 2021 NEJM', 'KDIGO 2024 CKD'],
    variables: [
      { id: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120 },
      { id: 'cr', label: 'Serum creatinine', type: 'number', unit: 'mg/dL', min: 0.2, max: 15, step: 0.01 },
      { id: 'female', label: 'Female', ...YN(1) },
    ],
    compute: (v) => {
      const female = !!v.female;
      const kappa = female ? 0.7 : 0.9;
      const alpha = female ? -0.241 : -0.302;
      const femFactor = female ? 1.012 : 1.0;
      const scrK = Math.max(0.1, v.cr||1) / kappa;
      const egfr = 142 * Math.pow(Math.min(scrK, 1), alpha) * Math.pow(Math.max(scrK, 1), -1.200) * Math.pow(0.9938, v.age||0) * femFactor;
      const score = Math.round(egfr);
      if (egfr >= 90) return cat(score, 'G1 — normal', 'green', 'eGFR ≥90. CKD label requires albuminuria or structural abnormality.', {unit:'mL/min/1.73m²'});
      if (egfr >= 60) return cat(score, 'G2 — mild', 'green', 'eGFR 60–89.', {unit:'mL/min/1.73m²'});
      if (egfr >= 45) return cat(score, 'G3a — mild-moderate', 'yellow', 'eGFR 45–59.', {unit:'mL/min/1.73m²'});
      if (egfr >= 30) return cat(score, 'G3b — moderate-severe', 'orange', 'eGFR 30–44.', {unit:'mL/min/1.73m²'});
      if (egfr >= 15) return cat(score, 'G4 — severe', 'red', 'eGFR 15–29. Nephrology referral. Prepare RRT.', {unit:'mL/min/1.73m²'});
      return cat(score, 'G5 — kidney failure', 'red', 'eGFR <15. Dialysis candidate.', {unit:'mL/min/1.73m²'});
    },
  },
  {
    id: 'fena',
    name: 'Fractional Excretion of Sodium (FENa)',
    specialty: 'Nephrology',
    shortDesc: 'Prerenal vs intrinsic AKI',
    variables: [
      { id: 'u_na', label: 'Urine sodium', type: 'number', unit: 'mEq/L' },
      { id: 'u_cr', label: 'Urine creatinine', type: 'number', unit: 'mg/dL' },
      { id: 'p_na', label: 'Plasma sodium', type: 'number', unit: 'mEq/L', min: 100, max: 180 },
      { id: 'p_cr', label: 'Plasma creatinine', type: 'number', unit: 'mg/dL', min: 0.2, max: 15, step: 0.01 },
    ],
    compute: (v) => {
      const fena = ((v.u_na||0) * (v.p_cr||0)) / Math.max(0.01, (v.p_na||1) * (v.u_cr||1)) * 100;
      const score = Math.round(fena * 100) / 100;
      if (fena < 1) return cat(score, 'Prerenal', 'yellow', 'FENa <1% suggests prerenal AKI (hypovolemia, cardiorenal). Caveat: misleading on diuretics — use FEUrea.', {unit:'%'});
      if (fena < 2) return cat(score, 'Indeterminate', 'yellow', 'FENa 1–2% — non-diagnostic zone.', {unit:'%'});
      return cat(score, 'Intrinsic / ATN', 'orange', 'FENa >2% suggests intrinsic AKI (ATN most common).', {unit:'%'});
    },
  },
  {
    id: 'corrected_na',
    name: 'Corrected Na for hyperglycemia',
    specialty: 'Nephrology',
    shortDesc: 'Katz correction — true Na in DKA/HHS',
    variables: [
      { id: 'na', label: 'Measured sodium', type: 'number', unit: 'mEq/L', min: 100, max: 180 },
      { id: 'glucose', label: 'Glucose', type: 'number', unit: 'mg/dL', min: 80, max: 1500 },
    ],
    compute: (v) => {
      const corrected = (v.na||0) + 1.6 * ((v.glucose||0) - 100) / 100;
      const score = Math.round(corrected * 10) / 10;
      if (corrected < 135) return cat(score, 'Hyponatremia', 'orange', 'True Na <135 after correction. Address underlying cause.', {unit:'mEq/L'});
      if (corrected <= 145) return cat(score, 'Normonatremic', 'green', 'Corrected Na within normal range.', {unit:'mEq/L'});
      return cat(score, 'Hypernatremia', 'orange', 'True Na >145 after correction — free water deficit.', {unit:'mEq/L'});
    },
  },

  // ── HEPATOLOGY ────────────────────────────────────────────────────────────
  {
    id: 'meld_na',
    name: 'MELD-Na',
    specialty: 'Hepatology',
    shortDesc: '3-month mortality in cirrhosis (adult)',
    references: ['Kim 2008', 'OPTN policy'],
    variables: [
      { id: 'bili', label: 'Bilirubin', type: 'number', unit: 'mg/dL', min: 0.1, max: 60, step: 0.1 },
      { id: 'cr', label: 'Creatinine (use 4.0 if on HD)', type: 'number', unit: 'mg/dL', min: 0.1, max: 15, step: 0.01 },
      { id: 'inr', label: 'INR', type: 'number', min: 0.7, max: 15, step: 0.1 },
      { id: 'na', label: 'Sodium', type: 'number', unit: 'mEq/L', min: 110, max: 160 },
      { id: 'dialysis', label: 'Dialysis ≥2× in past week', ...YN(1) },
    ],
    compute: (v) => {
      let cr = v.dialysis ? 4.0 : Math.max(1.0, Math.min(v.cr||1, 4.0));
      const bili = Math.max(1.0, v.bili||1);
      const inr  = Math.max(1.0, v.inr||1);
      const meld = Math.round(3.78*ln(bili) + 11.2*ln(inr) + 9.57*ln(cr) + 6.43);
      let na = v.na||137;
      if (na > 137) na = 137; if (na < 125) na = 125;
      const meldNa = meld <= 11 ? meld : Math.round(meld + 1.32*(137 - na) - (0.033 * meld * (137 - na)));
      const score = meldNa;
      if (meldNa < 10) return cat(score, '3-mo mortality ~1.9%', 'green', 'Low short-term mortality.');
      if (meldNa < 20) return cat(score, '3-mo mortality ~6%', 'yellow', 'Moderate — refer to transplant center if not already listed.');
      if (meldNa < 30) return cat(score, '3-mo mortality ~19.6%', 'orange', 'High — active transplant evaluation.');
      return cat(score, '3-mo mortality ~52.6%', 'red', 'Very high — prioritize transplant listing / SOS interventions.');
    },
  },
  {
    id: 'child_pugh',
    name: 'Child-Pugh',
    specialty: 'Hepatology',
    shortDesc: 'Cirrhosis severity classification',
    variables: [
      { id: 'bili', label: 'Bilirubin', type: 'select', options: [
        { label: '<2 (1)', value: 1 },{ label: '2–3 (2)', value: 2 },{ label: '>3 (3)', value: 3 },
      ]},
      { id: 'alb', label: 'Albumin (g/dL)', type: 'select', options: [
        { label: '>3.5 (1)', value: 1 },{ label: '2.8–3.5 (2)', value: 2 },{ label: '<2.8 (3)', value: 3 },
      ]},
      { id: 'inr', label: 'INR', type: 'select', options: [
        { label: '<1.7 (1)', value: 1 },{ label: '1.7–2.3 (2)', value: 2 },{ label: '>2.3 (3)', value: 3 },
      ]},
      { id: 'ascites', label: 'Ascites', type: 'select', options: [
        { label: 'None (1)', value: 1 },{ label: 'Mild / diuretic-responsive (2)', value: 2 },{ label: 'Moderate-severe / refractory (3)', value: 3 },
      ]},
      { id: 'enceph', label: 'Encephalopathy', type: 'select', options: [
        { label: 'None (1)', value: 1 },{ label: 'Grade 1–2 (2)', value: 2 },{ label: 'Grade 3–4 (3)', value: 3 },
      ]},
    ],
    compute: (v) => {
      const score = (v.bili||0)+(v.alb||0)+(v.inr||0)+(v.ascites||0)+(v.enceph||0);
      if (score <= 6) return cat(score, 'Class A', 'green', '1-yr survival ~100%, 2-yr ~85%. Well-compensated.');
      if (score <= 9) return cat(score, 'Class B', 'yellow', '1-yr survival ~81%, 2-yr ~57%. Significant functional compromise.');
      return cat(score, 'Class C', 'red', '1-yr survival ~45%, 2-yr ~35%. Decompensated — transplant evaluation.');
    },
  },
  {
    id: 'fib4',
    name: 'FIB-4',
    specialty: 'Hepatology',
    shortDesc: 'Noninvasive hepatic fibrosis score',
    references: ['AASLD 2023'],
    variables: [
      { id: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120 },
      { id: 'ast', label: 'AST', type: 'number', unit: 'U/L', min: 5, max: 5000 },
      { id: 'alt', label: 'ALT', type: 'number', unit: 'U/L', min: 5, max: 5000 },
      { id: 'plt', label: 'Platelets', type: 'number', unit: '×10⁹/L', min: 5, max: 1000 },
    ],
    compute: (v) => {
      const fib4 = ((v.age||0) * (v.ast||0)) / (Math.max(1, v.plt||1) * Math.sqrt(Math.max(1, v.alt||1)));
      const score = Math.round(fib4 * 100) / 100;
      if (fib4 < 1.45) return cat(score, 'Low — F0-F1', 'green', 'Advanced fibrosis unlikely. NPV ~90%.');
      if (fib4 <= 3.25) return cat(score, 'Indeterminate', 'yellow', 'Consider elastography or specialist referral.');
      return cat(score, 'High — F3-F4', 'red', 'Advanced fibrosis likely (PPV ~65%). Refer to hepatology.');
    },
  },

  // ── NEUROLOGY ─────────────────────────────────────────────────────────────
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale',
    specialty: 'Neurology',
    shortDesc: 'Consciousness assessment',
    variables: [
      { id: 'eye', label: 'Eye response', type: 'select', options: [
        { label: 'Spontaneous (4)', value: 4 },{ label: 'To voice (3)', value: 3 },
        { label: 'To pain (2)', value: 2 },{ label: 'None (1)', value: 1 },
      ]},
      { id: 'verbal', label: 'Verbal response', type: 'select', options: [
        { label: 'Oriented (5)', value: 5 },{ label: 'Confused (4)', value: 4 },
        { label: 'Inappropriate (3)', value: 3 },{ label: 'Incomprehensible (2)', value: 2 },{ label: 'None (1)', value: 1 },
      ]},
      { id: 'motor', label: 'Motor response', type: 'select', options: [
        { label: 'Obeys commands (6)', value: 6 },{ label: 'Localizes pain (5)', value: 5 },
        { label: 'Withdraws from pain (4)', value: 4 },{ label: 'Flexion (decorticate) (3)', value: 3 },
        { label: 'Extension (decerebrate) (2)', value: 2 },{ label: 'None (1)', value: 1 },
      ]},
    ],
    compute: (v) => {
      const score = (v.eye||0) + (v.verbal||0) + (v.motor||0);
      if (score >= 13) return cat(score, 'Mild', 'green', 'GCS 13–15 — mild brain injury.');
      if (score >= 9) return cat(score, 'Moderate', 'yellow', 'GCS 9–12 — moderate injury. Frequent neuro checks.');
      return cat(score, 'Severe', 'red', 'GCS ≤8 — severe injury. Airway protection; likely intubation.');
    },
  },
  {
    id: 'abcd2',
    name: 'ABCD²',
    specialty: 'Neurology',
    shortDesc: 'Stroke risk after TIA',
    references: ['Johnston 2007'],
    variables: [
      { id: 'age', label: 'Age ≥60', ...YN(1) },
      { id: 'bp', label: 'BP ≥140/90 at evaluation', ...YN(1) },
      { id: 'clinical', label: 'Clinical features', type: 'select', options: [
        { label: 'None (0)', value: 0 },{ label: 'Speech disturbance w/o weakness (1)', value: 1 },{ label: 'Unilateral weakness (2)', value: 2 },
      ]},
      { id: 'duration', label: 'Duration', type: 'select', options: [
        { label: '<10 min (0)', value: 0 },{ label: '10–59 min (1)', value: 1 },{ label: '≥60 min (2)', value: 2 },
      ]},
      { id: 'dm', label: 'Diabetes', ...YN(1) },
    ],
    compute: (v) => {
      const score = (v.age||0)+(v.bp||0)+(v.clinical||0)+(v.duration||0)+(v.dm||0);
      if (score <= 3) return cat(score, 'Low', 'green', '2-day stroke risk ~1.0%. Outpatient workup acceptable.');
      if (score <= 5) return cat(score, 'Moderate', 'yellow', '2-day stroke risk ~4.1%. Hospitalize or urgent clinic.');
      return cat(score, 'High', 'red', '2-day stroke risk ~8.1%. Admit for expedited workup.');
    },
  },

  // ── HEMATOLOGY / GI / ONCOLOGY ───────────────────────────────────────────
  {
    id: '4ts',
    name: '4Ts Score (HIT)',
    specialty: 'Hematology',
    shortDesc: 'Pre-test probability of HIT',
    references: ['Lo 2006', 'ASH 2018'],
    variables: [
      { id: 'thrombocyt', label: 'Thrombocytopenia severity', type: 'select', options: [
        { label: 'Platelet fall <30% or nadir <10 (0)', value: 0 },
        { label: 'Fall 30–50% or nadir 10–19 (1)', value: 1 },
        { label: 'Fall >50% and nadir ≥20 (2)', value: 2 },
      ]},
      { id: 'timing', label: 'Timing of fall', type: 'select', options: [
        { label: '<4 days (no prior heparin) (0)', value: 0 },
        { label: 'Consistent with days 5–10 but unclear (1)', value: 1 },
        { label: 'Clear onset days 5–10 or ≤1 d w/ prior heparin in 30 d (2)', value: 2 },
      ]},
      { id: 'thrombosis', label: 'Thrombosis / sequelae', type: 'select', options: [
        { label: 'None (0)', value: 0 },
        { label: 'Progressive/recurrent thrombosis, skin lesions (1)', value: 1 },
        { label: 'Confirmed new thrombosis, skin necrosis, post-heparin bolus anaphylaxis (2)', value: 2 },
      ]},
      { id: 'other', label: 'Other causes of thrombocytopenia', type: 'select', options: [
        { label: 'Definite other cause (0)', value: 0 },
        { label: 'Possible other cause (1)', value: 1 },
        { label: 'No other cause apparent (2)', value: 2 },
      ]},
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score <= 3) return cat(score, 'Low probability', 'green', 'HIT unlikely (<5%). Heparin-PF4 testing typically not needed.');
      if (score <= 5) return cat(score, 'Intermediate', 'yellow', '~10–30% HIT probability. Stop heparin; send PF4 ELISA; bridge with non-heparin AC if thrombosis risk.');
      return cat(score, 'High probability', 'red', '~20–80% HIT probability. Stop heparin immediately; start non-heparin anticoagulant; confirm with PF4/serotonin release assay.');
    },
  },
  {
    id: 'blatchford',
    name: 'Glasgow-Blatchford',
    specialty: 'Gastroenterology',
    shortDesc: 'Upper GI bleed disposition',
    references: ['Blatchford 2000'],
    variables: [
      { id: 'bun', label: 'BUN (mg/dL)', type: 'select', options: [
        { label: '<18.2 (0)', value: 0 },{ label: '18.2–22.3 (2)', value: 2 },
        { label: '22.4–27.9 (3)', value: 3 },{ label: '28.0–69.9 (4)', value: 4 },{ label: '≥70.0 (6)', value: 6 },
      ]},
      { id: 'hgb_m', label: 'Hemoglobin (male) g/dL', type: 'select', options: [
        { label: 'N/A female or ≥13 (0)', value: 0 },{ label: '12–12.9 (1)', value: 1 },
        { label: '10–11.9 (3)', value: 3 },{ label: '<10 (6)', value: 6 },
      ]},
      { id: 'hgb_f', label: 'Hemoglobin (female) g/dL', type: 'select', options: [
        { label: 'N/A male or ≥12 (0)', value: 0 },{ label: '10–11.9 (1)', value: 1 },{ label: '<10 (6)', value: 6 },
      ]},
      { id: 'sbp', label: 'Systolic BP', type: 'select', options: [
        { label: '≥110 (0)', value: 0 },{ label: '100–109 (1)', value: 1 },{ label: '90–99 (2)', value: 2 },{ label: '<90 (3)', value: 3 },
      ]},
      { id: 'other', label: 'Other: HR≥100 / melena / syncope / hepatic dz / CHF', type: 'select', options: [
        { label: 'None (0)', value: 0 },{ label: 'HR ≥100 (1)', value: 1 },{ label: 'Melena (1)', value: 1 },
        { label: 'Syncope (2)', value: 2 },{ label: 'Hepatic disease (2)', value: 2 },{ label: 'Heart failure (2)', value: 2 },
      ]},
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score === 0) return cat(score, 'Very low risk', 'green', 'Score 0 — outpatient management possible (no intervention needed).');
      if (score <= 5) return cat(score, 'Low', 'yellow', 'Score 1–5 — low intervention need but close monitoring.');
      return cat(score, 'High', 'red', 'Score ≥6 — admit; high likelihood of transfusion/endoscopic intervention.');
    },
  },

  // ── PSYCHIATRY ────────────────────────────────────────────────────────────
  {
    id: 'phq9',
    name: 'PHQ-9',
    specialty: 'Psychiatry',
    shortDesc: 'Depression severity screen',
    references: ['Kroenke 2001'],
    variables: [
      { id: 'q1', label: 'Little interest or pleasure', type: 'select', options: rangePhq() },
      { id: 'q2', label: 'Feeling down/depressed/hopeless', type: 'select', options: rangePhq() },
      { id: 'q3', label: 'Sleep problems', type: 'select', options: rangePhq() },
      { id: 'q4', label: 'Feeling tired', type: 'select', options: rangePhq() },
      { id: 'q5', label: 'Appetite changes', type: 'select', options: rangePhq() },
      { id: 'q6', label: 'Feeling bad about self', type: 'select', options: rangePhq() },
      { id: 'q7', label: 'Trouble concentrating', type: 'select', options: rangePhq() },
      { id: 'q8', label: 'Moving/speaking slow or restless', type: 'select', options: rangePhq() },
      { id: 'q9', label: 'Thoughts of self-harm', type: 'select', options: rangePhq() },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      const q9 = v.q9 || 0;
      let red = q9 > 0 ? ' Positive ideation question — screen for suicide risk.' : '';
      if (score < 5) return cat(score, 'Minimal', 'green', 'Score 0–4. Minimal depressive symptoms.' + red);
      if (score < 10) return cat(score, 'Mild', 'green', 'Score 5–9. Mild — watchful waiting / repeat.' + red);
      if (score < 15) return cat(score, 'Moderate', 'yellow', 'Score 10–14. Moderate — consider treatment.' + red);
      if (score < 20) return cat(score, 'Moderately severe', 'orange', 'Score 15–19. Active treatment warranted.' + red);
      return cat(score, 'Severe', 'red', 'Score 20–27. Immediate treatment — consider combined therapy.' + red);
    },
  },
  {
    id: 'gad7',
    name: 'GAD-7',
    specialty: 'Psychiatry',
    shortDesc: 'Anxiety severity screen',
    references: ['Spitzer 2006'],
    variables: [
      { id: 'q1', label: 'Nervous or on edge', type: 'select', options: rangePhq() },
      { id: 'q2', label: 'Unable to stop worrying', type: 'select', options: rangePhq() },
      { id: 'q3', label: 'Worrying about things too much', type: 'select', options: rangePhq() },
      { id: 'q4', label: 'Trouble relaxing', type: 'select', options: rangePhq() },
      { id: 'q5', label: 'Restless / hard to sit still', type: 'select', options: rangePhq() },
      { id: 'q6', label: 'Easily annoyed or irritable', type: 'select', options: rangePhq() },
      { id: 'q7', label: 'Feeling afraid something awful might happen', type: 'select', options: rangePhq() },
    ],
    compute: (v) => {
      const score = Object.values(v).reduce((a,b)=>a+(b||0),0);
      if (score < 5) return cat(score, 'Minimal', 'green', 'Score 0–4. Minimal anxiety.');
      if (score < 10) return cat(score, 'Mild', 'green', 'Score 5–9. Mild — watchful waiting.');
      if (score < 15) return cat(score, 'Moderate', 'yellow', 'Score 10–14. Consider treatment.');
      return cat(score, 'Severe', 'red', 'Score 15–21. Active treatment indicated.');
    },
  },

  // ── GENERAL / DOSING ──────────────────────────────────────────────────────
  {
    id: 'bmi',
    name: 'BMI',
    specialty: 'General',
    shortDesc: 'Body Mass Index',
    variables: [
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg', min: 20, max: 300, step: 0.1 },
      { id: 'height', label: 'Height', type: 'number', unit: 'cm', min: 100, max: 230 },
    ],
    compute: (v) => {
      const h = (v.height||0) / 100;
      const bmi = (v.weight||0) / Math.max(0.01, h*h);
      const score = Math.round(bmi * 10) / 10;
      if (bmi < 18.5) return cat(score, 'Underweight', 'yellow', 'BMI <18.5.', {unit:'kg/m²'});
      if (bmi < 25) return cat(score, 'Normal', 'green', 'BMI 18.5–24.9.', {unit:'kg/m²'});
      if (bmi < 30) return cat(score, 'Overweight', 'yellow', 'BMI 25–29.9.', {unit:'kg/m²'});
      if (bmi < 35) return cat(score, 'Obesity class I', 'orange', 'BMI 30–34.9.', {unit:'kg/m²'});
      if (bmi < 40) return cat(score, 'Obesity class II', 'orange', 'BMI 35–39.9.', {unit:'kg/m²'});
      return cat(score, 'Obesity class III', 'red', 'BMI ≥40.', {unit:'kg/m²'});
    },
  },
  {
    id: 'ibw_devine',
    name: 'IBW (Devine)',
    specialty: 'General',
    shortDesc: 'Ideal body weight',
    variables: [
      { id: 'height_cm', label: 'Height', type: 'number', unit: 'cm', min: 120, max: 230 },
      { id: 'female', label: 'Female', ...YN(1) },
    ],
    compute: (v) => {
      const inches = (v.height_cm||0) / 2.54;
      const over60 = Math.max(0, inches - 60);
      const ibw = v.female ? 45.5 + 2.3*over60 : 50 + 2.3*over60;
      return cat(Math.round(ibw*10)/10, 'IBW', 'green', `Devine IBW for the given height/sex.`, {unit:'kg'});
    },
  },
  {
    id: 'anion_gap',
    name: 'Anion Gap',
    specialty: 'General',
    shortDesc: 'Metabolic acidosis classification',
    variables: [
      { id: 'na', label: 'Sodium', type: 'number', unit: 'mEq/L', min: 100, max: 180 },
      { id: 'cl', label: 'Chloride', type: 'number', unit: 'mEq/L', min: 70, max: 140 },
      { id: 'hco3', label: 'Bicarbonate', type: 'number', unit: 'mEq/L', min: 5, max: 50 },
      { id: 'alb', label: 'Albumin (optional — for correction)', type: 'number', unit: 'g/dL', min: 0.5, max: 6, step: 0.1 },
    ],
    compute: (v) => {
      const ag = (v.na||0) - ((v.cl||0) + (v.hco3||0));
      const corrected = v.alb ? ag + 2.5 * (4 - v.alb) : ag;
      const score = Math.round(ag * 10) / 10;
      const cScore = Math.round(corrected * 10) / 10;
      if (corrected < 12) return cat(score, 'Normal', 'green', `AG ${score} (corrected ${cScore}). Non-AG acidosis if HCO₃ low.`, {unit:'mEq/L', 'corrected (alb)': cScore});
      if (corrected < 20) return cat(score, 'Elevated', 'yellow', `AG ${score} (corrected ${cScore}) — workup for AGMA (MUDPILES).`, {unit:'mEq/L', 'corrected (alb)': cScore});
      return cat(score, 'Markedly elevated', 'red', `AG ${score} (corrected ${cScore}) — strongly suggests AGMA; measure lactate, ketones, salicylate, osmolar gap.`, {unit:'mEq/L', 'corrected (alb)': cScore});
    },
  },
  {
    id: 'winters',
    name: "Winter's Formula",
    specialty: 'General',
    shortDesc: 'Expected PaCO₂ in metabolic acidosis',
    variables: [
      { id: 'hco3', label: 'Bicarbonate', type: 'number', unit: 'mEq/L', min: 5, max: 30 },
      { id: 'paco2', label: 'Measured PaCO₂', type: 'number', unit: 'mmHg', min: 10, max: 100 },
    ],
    compute: (v) => {
      const expected = 1.5 * (v.hco3||0) + 8;
      const low = expected - 2, high = expected + 2;
      const measured = v.paco2 || 0;
      const score = Math.round(expected * 10) / 10;
      if (measured >= low && measured <= high) return cat(score, 'Appropriate compensation', 'green', `Expected PaCO₂ ${low.toFixed(1)}–${high.toFixed(1)}. Measured falls in range — pure metabolic acidosis.`, {unit:'mmHg'});
      if (measured < low) return cat(score, 'Concurrent respiratory alkalosis', 'orange', `Expected ${low.toFixed(1)}–${high.toFixed(1)}; measured ${measured} is below range — added respiratory alkalosis.`, {unit:'mmHg'});
      return cat(score, 'Concurrent respiratory acidosis', 'red', `Expected ${low.toFixed(1)}–${high.toFixed(1)}; measured ${measured} is above range — added respiratory acidosis.`, {unit:'mmHg'});
    },
  },
  {
    id: 'corrected_ca',
    name: 'Corrected Calcium',
    specialty: 'General',
    shortDesc: 'Ca corrected for albumin',
    variables: [
      { id: 'ca', label: 'Measured calcium', type: 'number', unit: 'mg/dL', min: 5, max: 20, step: 0.1 },
      { id: 'alb', label: 'Serum albumin', type: 'number', unit: 'g/dL', min: 1, max: 6, step: 0.1 },
    ],
    compute: (v) => {
      const corrected = (v.ca||0) + 0.8 * (4 - (v.alb||0));
      const score = Math.round(corrected * 100) / 100;
      if (corrected < 8.5) return cat(score, 'Hypocalcemia', 'orange', 'Corrected Ca <8.5. Check ionized Ca for confirmation.', {unit:'mg/dL'});
      if (corrected <= 10.5) return cat(score, 'Normal', 'green', 'Corrected Ca within normal range.', {unit:'mg/dL'});
      return cat(score, 'Hypercalcemia', 'orange', 'Corrected Ca >10.5. Workup: PTH, PTHrP, Vit D, malignancy.', {unit:'mg/dL'});
    },
  },
  {
    id: 'friedewald',
    name: 'LDL (Friedewald)',
    specialty: 'General',
    shortDesc: 'Calculated LDL',
    variables: [
      { id: 'tc', label: 'Total cholesterol', type: 'number', unit: 'mg/dL', min: 50, max: 600 },
      { id: 'hdl', label: 'HDL', type: 'number', unit: 'mg/dL', min: 10, max: 150 },
      { id: 'tg', label: 'Triglycerides', type: 'number', unit: 'mg/dL', min: 20, max: 2000 },
    ],
    compute: (v) => {
      if ((v.tg||0) > 400) return cat(-1, 'Not valid (TG >400)', 'yellow', 'Friedewald inaccurate when TG >400 — request direct LDL.');
      const ldl = (v.tc||0) - (v.hdl||0) - (v.tg||0)/5;
      const score = Math.round(ldl);
      if (ldl < 100) return cat(score, 'Optimal', 'green', 'LDL <100.', {unit:'mg/dL'});
      if (ldl < 130) return cat(score, 'Near optimal', 'green', 'LDL 100–129.', {unit:'mg/dL'});
      if (ldl < 160) return cat(score, 'Borderline high', 'yellow', 'LDL 130–159.', {unit:'mg/dL'});
      if (ldl < 190) return cat(score, 'High', 'orange', 'LDL 160–189.', {unit:'mg/dL'});
      return cat(score, 'Very high', 'red', 'LDL ≥190 — heterozygous FH category.', {unit:'mg/dL'});
    },
  },
  {
    id: 'serum_osm',
    name: 'Serum Osmolality',
    specialty: 'General',
    shortDesc: 'Calculated osmolality + osm gap',
    variables: [
      { id: 'na', label: 'Sodium', type: 'number', unit: 'mEq/L', min: 100, max: 180 },
      { id: 'glucose', label: 'Glucose', type: 'number', unit: 'mg/dL', min: 40, max: 1500 },
      { id: 'bun', label: 'BUN', type: 'number', unit: 'mg/dL', min: 1, max: 300 },
      { id: 'measured', label: 'Measured osmolality (optional — for gap)', type: 'number', unit: 'mOsm/kg', min: 200, max: 500 },
    ],
    compute: (v) => {
      const calc = 2*(v.na||0) + (v.glucose||0)/18 + (v.bun||0)/2.8;
      const score = Math.round(calc);
      const gap = v.measured ? (v.measured - calc) : null;
      const extras: Record<string, number | string> = {unit:'mOsm/kg'};
      if (gap !== null) extras['osm_gap'] = Math.round(gap * 10) / 10;
      if (gap !== null && gap > 10) return cat(score, 'Elevated osm gap', 'red', `Gap ${gap.toFixed(1)} — workup toxic alcohols (methanol, ethylene glycol), mannitol, sorbitol.`, extras);
      if (calc < 275) return cat(score, 'Hypo-osmolar', 'orange', 'Calculated <275 — consistent with hyponatremia.', extras);
      if (calc <= 295) return cat(score, 'Normal', 'green', 'Normal osmolality.', extras);
      return cat(score, 'Hyperosmolar', 'orange', 'Calculated >295 — check glucose, Na, BUN.', extras);
    },
  },
];

function rangePhq(): CalcOption[] {
  return [
    { label: 'Not at all (0)', value: 0 },
    { label: 'Several days (1)', value: 1 },
    { label: 'More than half the days (2)', value: 2 },
    { label: 'Nearly every day (3)', value: 3 },
  ];
}

export const SPECIALTIES = [
  'All', 'Cardiology', 'Pulmonology', 'Nephrology', 'Hepatology',
  'Neurology', 'Infectious Disease', 'Hematology', 'Gastroenterology',
  'Psychiatry', 'General',
];

// Aspirational Phase-2 list — these are not yet implemented but tracked so we
// can see what's still missing vs the user's original spec. Enabling one of
// these means: add it to CALCULATORS above with a validated formula + threshold.
export const PHASE_2_CALCULATORS: {id: string; name: string; specialty: string}[] = [
  { id: 'grace', name: 'GRACE ACS', specialty: 'Cardiology' },
  { id: 'framingham', name: 'Framingham 10-year', specialty: 'Cardiology' },
  { id: 'ascvd', name: 'ASCVD Pooled Cohort', specialty: 'Cardiology' },
  { id: 'timi_stemi', name: 'TIMI STEMI', specialty: 'Cardiology' },
  { id: 'wells_dvt', name: 'Wells DVT', specialty: 'Pulmonology' },
  { id: 'geneva', name: 'Revised Geneva', specialty: 'Pulmonology' },
  { id: 'psi_port', name: 'PSI / PORT', specialty: 'Pulmonology' },
  { id: 'ariscat', name: 'ARISCAT', specialty: 'Pulmonology' },
  { id: 'berlin_ards', name: 'Berlin ARDS', specialty: 'Pulmonology' },
  { id: 'mdrd', name: 'MDRD GFR', specialty: 'Nephrology' },
  { id: 'fe_urea', name: 'FE Urea', specialty: 'Nephrology' },
  { id: 'uag', name: 'Urine Anion Gap', specialty: 'Nephrology' },
  { id: 'kdigo_aki', name: 'KDIGO AKI staging', specialty: 'Nephrology' },
  { id: 'fwd', name: 'Free water deficit', specialty: 'Nephrology' },
  { id: 'meld', name: 'MELD (pre-Na)', specialty: 'Hepatology' },
  { id: 'meld3', name: 'MELD 3.0', specialty: 'Hepatology' },
  { id: 'lille', name: 'Lille Model', specialty: 'Hepatology' },
  { id: 'nihss', name: 'NIHSS', specialty: 'Neurology' },
  { id: 'hunt_hess', name: 'Hunt-Hess', specialty: 'Neurology' },
  { id: 'fisher', name: 'Fisher Grade', specialty: 'Neurology' },
  { id: 'ich_score', name: 'ICH Score', specialty: 'Neurology' },
  { id: 'mrs', name: 'Modified Rankin', specialty: 'Neurology' },
  { id: 'sirs', name: 'SIRS', specialty: 'Infectious Disease' },
  { id: 'sofa', name: 'SOFA', specialty: 'Infectious Disease' },
  { id: 'feverpain', name: 'FeverPAIN', specialty: 'Infectious Disease' },
  { id: 'rockall', name: 'Rockall', specialty: 'Gastroenterology' },
  { id: 'ranson', name: 'Ranson Criteria', specialty: 'Gastroenterology' },
  { id: 'bisap', name: 'BISAP', specialty: 'Gastroenterology' },
  { id: 'mayo_uc', name: 'Mayo Score (UC)', specialty: 'Gastroenterology' },
  { id: 'harvey_bradshaw', name: 'Harvey-Bradshaw', specialty: 'Gastroenterology' },
  { id: 'plasmic', name: 'PLASMIC Score', specialty: 'Hematology' },
  { id: 'ecog', name: 'ECOG Performance', specialty: 'Oncology' },
  { id: 'karnofsky', name: 'Karnofsky', specialty: 'Oncology' },
  { id: 'bishop', name: 'Bishop Score', specialty: 'Obstetrics' },
  { id: 'edinburgh', name: 'Edinburgh Postnatal Depression', specialty: 'Obstetrics' },
  { id: 'pecarn', name: 'PECARN', specialty: 'Pediatrics' },
  { id: 'peds_gcs', name: 'Pediatric GCS', specialty: 'Pediatrics' },
  { id: 'apgar', name: 'Apgar', specialty: 'Pediatrics' },
  { id: 'columbia_ssrs', name: 'Columbia Suicide Severity', specialty: 'Psychiatry' },
  { id: 'audit', name: 'AUDIT', specialty: 'Psychiatry' },
  { id: 'cage', name: 'CAGE', specialty: 'Psychiatry' },
  { id: 'ciwa', name: 'CIWA-Ar', specialty: 'Psychiatry' },
  { id: 'cows', name: 'COWS', specialty: 'Psychiatry' },
  { id: 'rcri', name: 'RCRI / Lee', specialty: 'Surgery' },
  { id: 'asa_ps', name: 'ASA Physical Status', specialty: 'Surgery' },
  { id: 'caprini', name: 'Caprini VTE', specialty: 'Surgery' },
  { id: 'adjusted_bw', name: 'Adjusted body weight', specialty: 'General' },
  { id: 'bsa_mosteller', name: 'BSA (Mosteller)', specialty: 'General' },
  { id: 'steroid_conv', name: 'Steroid conversion', specialty: 'General' },
  { id: 'mme', name: 'Opioid MME', specialty: 'General' },
  { id: 'holliday_segar', name: 'Maintenance fluids (Holliday-Segar)', specialty: 'General' },
];
