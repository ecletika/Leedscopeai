import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { CommercialSystem } from '../../types';
import { SALES_PLANS } from '../../services/salesCatalog';
import { WORKIO_MODULES, WORKIO_PLANS, planModuleCodes } from '../../services/workioModules';
import { EmptyState, ModuleChip, SectionHeading } from './ui';

const eur = (n: number, digits = 2) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits });
const moduleName = (code: string) => WORKIO_MODULES.find((m) => m.code === code)?.name || code;

function WorkioPlans() {
  const [people, setPeople] = useState(40);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Os quatro planos do Workio"
        text="O preço é por colaborador por mês, sem IVA. Cada plano inclui tudo o do anterior, por isso o cliente pode subir quando crescer."
        action={
          <label className="flex items-center gap-3 text-sm text-gray-300">
            Para
            <input
              type="number"
              min={1}
              value={people}
              onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-sm tabular-nums text-white focus:border-emerald-500 focus:outline-none"
              aria-label="Número de colaboradores"
            />
            colaboradores
          </label>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WORKIO_PLANS.map((plan, i) => (
          <article key={plan.id} className={`flex flex-col rounded-2xl border p-6 ${plan.highlight ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : 'border-gray-800 bg-ai-card'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-lg font-semibold text-white">{plan.name.replace('Workio ', '')}</h4>
              {plan.highlight && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">{plan.highlight}</span>}
            </div>
            <p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-white">{eur(plan.price)}</p>
            <p className="text-sm text-gray-400">por colaborador, por mês</p>
            <p className="mt-3 rounded-lg bg-ai-dark px-3 py-2 text-sm text-gray-300">
              <span className="font-semibold tabular-nums text-white">{eur(plan.price * people)}</span> por mês para {people}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.tagline}</p>

            <div className="mt-5 border-t border-gray-800 pt-4">
              <p className="mb-2 text-sm font-medium text-gray-200">{i === 0 ? 'Inclui' : `Tudo do ${WORKIO_PLANS[i - 1].name.replace('Workio ', '')}, mais`}</p>
              <ul className="space-y-1.5">
                {plan.ownModules.map((code) => (
                  <li key={code} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="min-w-0"><ModuleChip code={code} /> <span className="ml-1">{moduleName(code)}</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-500">{planModuleCodes(plan.id).length} módulos no total</p>
            </div>
          </article>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-gray-500">
        Implementação, migração, formação, integrações e terminais físicos orçam-se à parte. Fale sempre em preços sem IVA.
      </p>
    </div>
  );
}

function SolPlans() {
  return (
    <div className="space-y-6">
      <SectionHeading title="Planos do SOL" text="Por dimensão do hotel. Preços indicativos: confirmar com a política comercial." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SALES_PLANS.map((p) => (
          <article key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.highlight ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : 'border-gray-800 bg-ai-card'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-lg font-semibold text-white">{p.name}</h4>
              {p.highlight && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">Mais escolhido</span>}
            </div>
            <p className="mt-1 text-sm text-gray-400">{p.idealFor}</p>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-white">{p.priceHint}</p>
            <p className="mt-1 text-sm text-gray-500">{p.setup} · {p.trial}</p>
            <ul className="mt-5 space-y-1.5 border-t border-gray-800 pt-4">
              {p.modules.map((m) => (
                <li key={m} className="flex items-start gap-2 text-sm text-gray-300"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{m}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function SalesPlans({ system }: { system: CommercialSystem }) {
  if (system === 'workio') return <WorkioPlans />;
  if (system === 'sol') return <SolPlans />;
  return <EmptyState title="Planos do EMET por preencher" text="Quando tivermos os planos e preços do EMET, aparecem aqui no mesmo formato do Workio." />;
}
