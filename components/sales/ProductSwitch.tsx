import React from 'react';
import { CommercialSystem } from '../../types';
import { COMMERCIAL_SYSTEMS } from '../../services/commercialSystems';

interface ProductSwitchProps {
  value: CommercialSystem;
  onChange: (system: CommercialSystem) => void;
}

/** Escolha do sistema a apresentar (Workio, SOL ou EMET). */
export default function ProductSwitch({ value, onChange }: ProductSwitchProps) {
  return (
    <div role="group" aria-label="Sistema" className="inline-flex rounded-xl border border-gray-800 bg-ai-card p-1">
      {COMMERCIAL_SYSTEMS.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s.id)}
            title={s.description}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${active ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
