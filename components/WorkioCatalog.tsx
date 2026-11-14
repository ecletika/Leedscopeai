import React from 'react';
import { Boxes, CheckCircle, Sparkles } from 'lucide-react';
import {
  WORKIO_AREAS,
  WORKIO_MODULES,
  WORKIO_PLANS,
  formatPlanPrice,
  modulesByArea,
  planModuleCodes,
  unassignedModules
} from '../services/workioModules';

/**
 * Catalogo Workio no Admin Console: planos (preco por colaborador/mes) e
 * modulos M01..M27 com o plano em que cada um entra.
 * Leitura a partir de services/workioModules.ts.
 */
export default function WorkioCatalog() {
  const planCodes = WORKIO_PLANS.map((p) => new Set(planModuleCodes(p.id)));
  const unassigned = unassignedModules();
  const newCount = WORKIO_MODULES.filter((m) => m.tag === 'Novo').length;

  const stats = [
    { label: 'Módulos', value: WORKIO_MODULES.length, note: 'cada um com o seu código' },
    { label: 'Áreas', value: WORKIO_AREAS.length, note: 'Ponto, Talento, Salários, Empresa' },
    { label: 'Planos', value: WORKIO_PLANS.length, note: 'preço por colaborador / mês' },
    { label: 'Novos', value: newCount, note: 'marcados como Novo' }
  ];

  return (
    <div className="bg-ai-card border border-emerald-700/40 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Boxes className="text-emerald-400" /> Módulos e planos Workio
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Todos os módulos, cada um com o seu código. Cada plano inclui os módulos do plano anterior.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-800 bg-ai-dark p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{s.label}</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-gray-500">{s.note}</div>
          </div>
        ))}
      </div>

      {/* Planos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WORKIO_PLANS.map((plan, i) => (
          <div key={plan.id} className={`relative flex flex-col gap-3 rounded-xl border bg-ai-dark p-5 ${plan.highlight ? 'border-emerald-500/60' : 'border-gray-800'}`}>
            {plan.highlight && (
              <span className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                <Sparkles className="h-3 w-3" /> {plan.highlight}
              </span>
            )}
            <h3 className="font-bold text-white">{plan.name}</h3>
            <div>
              <span className="font-mono text-2xl font-bold text-emerald-400">{plan.price.toFixed(2).replace('.', ',')} €</span>
              <span className="ml-1 text-[11px] text-gray-500">por colaborador / mês</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">{plan.tagline}</p>
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {i === 0 ? 'Inclui' : `Tudo do ${WORKIO_PLANS[i - 1].name.replace('Workio ', '')}, mais`}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plan.ownModules.map((code) => (
                  <span key={code} className="rounded border border-emerald-700/60 bg-emerald-950/40 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-300">{code}</span>
                ))}
              </div>
            </div>
            <div className="mt-auto text-[11px] text-gray-500">{planCodes[i].size} módulos no total</div>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Sem plano atribuído: {unassigned.map((m) => `${m.code} ${m.name}`).join(', ')}.
        </div>
      )}

      {/* Matriz modulo x plano */}
      <div className="space-y-6">
        {WORKIO_AREAS.map((area) => {
          const mods = modulesByArea(area.id);
          return (
            <div key={area.id}>
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <h3 className="font-bold text-emerald-300">{area.name}</h3>
                <span className="text-xs text-gray-500">{area.tagline} · {mods.length} módulos</span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="grid grid-cols-[72px_1.5fr_3fr_repeat(4,72px)] gap-3 rounded-lg bg-ai-dark px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <span>Código</span>
                    <span>Módulo</span>
                    <span>O que faz</span>
                    {WORKIO_PLANS.map((p) => <span key={p.id} className="text-center">{p.name.replace('Workio ', '')}</span>)}
                  </div>
                  {mods.map((m) => (
                    <div key={m.code} className="grid grid-cols-[72px_1.5fr_3fr_repeat(4,72px)] items-center gap-3 border-b border-gray-800 px-3 py-2.5">
                      <span className="justify-self-start rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">{m.code}</span>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        {m.name}
                        {m.tag === 'Novo' && <span className="rounded bg-blue-900 px-1.5 py-0.5 text-[10px] font-bold text-blue-200">Novo</span>}
                        {m.tag === 'IA' && <span className="rounded bg-purple-900 px-1.5 py-0.5 text-[10px] font-bold text-purple-200">IA</span>}
                      </span>
                      <span className="text-xs leading-snug text-gray-400">{m.description}</span>
                      {planCodes.map((set, i) => (
                        <span key={WORKIO_PLANS[i].id} className="flex justify-center" aria-label={set.has(m.code) ? 'Incluído' : 'Não incluído'}>
                          {set.has(m.code)
                            ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                            : <span className="text-gray-600">–</span>}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
