import React, { useEffect, useState } from 'react';
import { BadgePercent, Calculator, ClipboardList, Layers, Lightbulb, MessageSquareQuote } from 'lucide-react';
import { CommercialSystem, CrmMaterial, CrmObjection } from '../types';
import { crmDb } from '../services/crmDb';
import ProductSwitch from './sales/ProductSwitch';
import SalesCalculator from './sales/SalesCalculator';
import SalesPlans from './sales/SalesPlans';
import SalesDemo from './sales/SalesDemo';
import SalesArguments from './sales/SalesArguments';
import SalesMaterials from './sales/SalesMaterials';

type Tab = 'calculator' | 'plans' | 'demo' | 'arguments' | 'materials';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'calculator', label: 'Calculadora', icon: Calculator },
  { key: 'plans', label: 'Planos e preços', icon: BadgePercent },
  { key: 'demo', label: 'Roteiro da demo', icon: ClipboardList },
  { key: 'arguments', label: 'Argumentos', icon: MessageSquareQuote },
  { key: 'materials', label: 'Materiais', icon: Layers }
];

/**
 * Ferramentas de Venda: tudo o que o vendedor usa para apresentar valor, responder e fechar,
 * para cada sistema (Workio, SOL, EMET). O conteudo editavel vem de Scripts & Materiais.
 */
export default function SalesTools() {
  const [system, setSystem] = useState<CommercialSystem>('workio');
  const [tab, setTab] = useState<Tab>('calculator');
  const [materials, setMaterials] = useState<CrmMaterial[]>([]);
  const [objections, setObjections] = useState<CrmObjection[]>([]);

  useEffect(() => {
    crmDb.getMaterials().then(setMaterials).catch(() => setMaterials([]));
    crmDb.getObjections().then(setObjections).catch(() => setObjections([]));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
            <Lightbulb className="h-6 w-6 text-emerald-400" /> Ferramentas de venda
          </h2>
          <p className="mt-1 text-sm text-gray-400">Calcule o ganho do cliente, mostre os planos, siga o roteiro da demo e responda às objeções.</p>
        </div>
        <ProductSwitch value={system} onChange={setSystem} />
      </header>

      <nav aria-label="Ferramentas" className="flex flex-wrap gap-1 border-b border-gray-800">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${active ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </nav>

      <section>
        {tab === 'calculator' && <SalesCalculator system={system} />}
        {tab === 'plans' && <SalesPlans system={system} />}
        {tab === 'demo' && <SalesDemo system={system} materials={materials} />}
        {tab === 'arguments' && <SalesArguments system={system} objections={objections} />}
        {tab === 'materials' && <SalesMaterials system={system} materials={materials} />}
      </section>
    </div>
  );
}
