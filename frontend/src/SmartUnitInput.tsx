// © 2026 SoulMD. All rights reserved.
import React from 'react';

export interface Unit { label: string; perBase?: number; }

interface Props {
  value: string;
  unit: string;
  onChange: (value: string, unit: string) => void;
  units: Unit[];
  listId: string;
  placeholder?: string;
  width?: string | number;
  unitWidth?: string | number;
}

const INPUT: React.CSSProperties = {
  padding:'10px 12px', borderRadius:'10px',
  border:'1px solid rgba(122,176,240,0.3)',
  fontSize:'13px', color:'#1a2a4a',
  background:'rgba(240,246,255,0.5)', outline:'none', boxSizing:'border-box',
};

const SmartUnitInput: React.FC<Props> = ({ value, unit, onChange, units, listId, placeholder, width, unitWidth = '110px' }) => {
  const handleUnitChange = (newUnit: string) => {
    const from = units.find(u => u.label === unit);
    const to = units.find(u => u.label === newUnit);
    const num = parseFloat(value);
    if (isFinite(num) && from && to && from.perBase && to.perBase) {
      const base = num / from.perBase;
      const converted = base * to.perBase;
      const rounded = Number(converted.toFixed(4));
      onChange(String(rounded), newUnit);
    } else {
      onChange(value, newUnit);
    }
  };

  return (
    <div style={{display:'flex', gap:'6px', width: width ?? '100%'}}>
      <input
        type="text" inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value, unit)}
        placeholder={placeholder}
        style={{...INPUT, flex:1, minWidth:0}}
      />
      <input
        type="text"
        value={unit}
        onChange={e => handleUnitChange(e.target.value)}
        list={listId}
        placeholder="unit"
        aria-label="Unit"
        style={{...INPUT, width: unitWidth as any, flexShrink:0, color:'#4a7ad0', fontWeight:600}}
      />
      <datalist id={listId}>
        {units.map(u => <option key={u.label} value={u.label}/>)}
      </datalist>
    </div>
  );
};

export default SmartUnitInput;
