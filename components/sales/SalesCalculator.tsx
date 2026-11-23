import React, { useMemo, useState } from 'react';
import { AlertCircle, Scale } from 'lucide-react';
import { CommercialSystem } from '../../types';
import { computeRoi, RoiInputs } from '../../services/salesCatalog';
import { WORKIO_PLANS, WorkioPlan, planModuleCodes } from '../../services/workioModules';
import { EmptyState } from './ui';

const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString('pt-PT');

const inputClass = 'mt-1 block w-full rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-sm text-white tabular-nums focus:border-emerald-500 focus:outline-none';

function NumberField({ label, hint, value, onChange, suffix }: { label: string; hint?: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-200">{label}</span>
      {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      <div className="relative">
        <input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className={inputClass} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{suffix}</span>}
      </div>
    </label>
  );
}

/** Workio: compara o custo do tempo de RH de hoje com o custo do plano. */
function WorkioCalculator() {
  const [people, setPeople] = useState(40);
  const [hours, setHours] = useState(30);
  const [hourCost, setHourCost] = useState(12);
  const [reduction, setReduction] = useState(50);
  const [planId, setPlanId] = useState<WorkioPlan['id']>('pessoas');

  const plan = WORKIO_PLANS.find((p) => p.id === planId) || WORKIO_PLANS[0];
  const result = useMemo(() => {
    const currentCost = hours * hourCost;
    const saved = Math.round(currentCost * (reduction / 100));
    const workioCost = people * plan.price;
    return { currentCost, saved, workioCost, balance: saved - workioCost };
  }, [people, hours, hourCost, reduction, plan]);

  const positive = result.balance >= 0;
  const needsReportChannel = people >= 50;
  const hasChannel = planModuleCodes(plan.id).includes('M27');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-5 rounded-2xl border border-gray-800 bg-ai-card p-6">
        <div>
          <h3 className="text-base font-semibold text-white">O que o cliente conta hoje</h3>
          <p className="mt-1 text-sm text-gray-400">Pergunte e preencha com ele. São estimativas dele, não nossas.</p>
        </div>
        <NumberField label="Colaboradores" value={people} onChange={setPeople} />
        <NumberField label="Horas por mês a tratar de ponto, escalas e férias" hint="Soma de todas as pessoas que tratam disto" value={hours} onChange={setHours} suffix="h" />
        <NumberField label="Custo médio por hora de quem trata disto" value={hourCost} onChange={setHourCost} suffix="€" />

        <label className="block">
          <span className="flex items-baseline justify-between text-sm font-medium text-gray-200">
            Quanto desse tempo o Workio poupa
            <span className="text-base font-semibold tabular-nums text-emerald-300">{reduction}%</span>
          </span>
          <span className="block text-xs text-gray-500">Hipótese para validar com o cliente, não um valor garantido</span>
          <input type="range" min={0} max={90} step={5} value={reduction} onChange={(e) => setReduction(Number(e.target.value))} className="mt-2 w-full accent-emerald-500" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-200">Plano a comparar</span>
          <select value={planId} onChange={(e) => setPlanId(e.target.value as WorkioPlan['id'])} className={inputClass}>
            {WORKIO_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.price.toFixed(2).replace('.', ',')} € por colaborador/mês</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-4">
        <div className={`rounded-2xl border p-6 ${positive ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-gray-800 bg-ai-card'}`}>
          <p className="text-sm font-medium text-gray-300">Saldo mensal estimado</p>
          <p className={`mt-1 text-5xl font-semibold tabular-nums tracking-tight ${positive ? 'text-emerald-300' : 'text-white'}`}>
            {positive ? '+' : '−'}{eur(Math.abs(result.balance))}
          </p>
          <p className="mt-2 text-sm text-gray-400">
            {positive
              ? 'Tempo poupado menos o custo do plano, por mês.'
              : 'Nesta hipótese o tempo poupado não cobre o plano. Foque a conversa no que não se mede em horas: a lei, os erros e a visibilidade.'}
          </p>
        </div>

        <dl className="divide-y divide-gray-800 rounded-2xl border border-gray-800 bg-ai-card">
          {[
            { label: 'Custo atual do tempo gasto', value: eur(result.currentCost), tone: 'text-white' },
            { label: `Tempo poupado (${reduction}%)`, value: eur(result.saved), tone: 'text-emerald-300' },
            { label: `${plan.name} para ${num(people)} colaboradores`, value: eur(result.workioCost), tone: 'text-white' }
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="text-sm text-gray-300">{row.label}</dt>
              <dd className={`text-base font-semibold tabular-nums ${row.tone}`}>{row.value}</dd>
            </div>
          ))}
        </dl>

        {needsReportChannel && (
          <div className="flex items-start gap-3 rounded-2xl border border-gray-800 bg-ai-card p-4">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm leading-relaxed text-gray-300">
              Com 50 ou mais trabalhadores o canal de denúncia é obrigatório (Lei 93/2021).{' '}
              {hasChannel ? 'Está incluído neste plano.' : 'Está nos planos Business e Universe.'}
            </p>
          </div>
        )}

        <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Estimativa para apoiar a conversa, não é proposta. Preços sem IVA; implementação, migração, formação, integrações e terminais físicos orçam-se à parte.
        </p>
      </div>
    </div>
  );
}

/** SOL: perda atual de um hotel com processos manuais. */
function SolCalculator() {
  const [roi, setRoi] = useState<RoiInputs>({
    rooms: 45, cleaningsPerDay: 30, minutesLostPerRoom: 6, staff: 6, costPerHour: 9, lateCheckinsPerMonth: 12, complaintsPerMonth: 4
  });
  const result = useMemo(() => computeRoi(roi), [roi]);
  const set = (k: keyof RoiInputs) => (v: number) => setRoi((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-5 rounded-2xl border border-gray-800 bg-ai-card p-6">
        <div>
          <h3 className="text-base font-semibold text-white">Dados do hotel</h3>
          <p className="mt-1 text-sm text-gray-400">Preencha com o que o cliente disser na chamada.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Quartos" value={roi.rooms} onChange={set('rooms')} />
          <NumberField label="Limpezas por dia" value={roi.cleaningsPerDay} onChange={set('cleaningsPerDay')} />
          <NumberField label="Minutos perdidos por quarto" value={roi.minutesLostPerRoom} onChange={set('minutesLostPerRoom')} suffix="min" />
          <NumberField label="Funcionários" value={roi.staff} onChange={set('staff')} />
          <NumberField label="Custo médio por hora" value={roi.costPerHour} onChange={set('costPerHour')} suffix="€" />
          <NumberField label="Check-ins atrasados por mês" value={roi.lateCheckinsPerMonth} onChange={set('lateCheckinsPerMonth')} />
          <NumberField label="Reclamações por mês" value={roi.complaintsPerMonth} onChange={set('complaintsPerMonth')} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.07] p-6">
          <p className="text-sm font-medium text-gray-300">Perda estimada por mês</p>
          <p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight text-emerald-300">{eur(result.monthlyCostLost)}</p>
          <p className="mt-2 text-sm text-gray-400">{num(result.monthlyHoursLost)} horas por mês, {eur(result.yearlyCostLost)} por ano, com processos manuais e comunicação dispersa.</p>
        </div>
        <dl className="divide-y divide-gray-800 rounded-2xl border border-gray-800 bg-ai-card">
          <div className="flex items-center justify-between px-5 py-3"><dt className="text-sm text-gray-300">Check-ins atrasados por mês</dt><dd className="text-base font-semibold tabular-nums text-white">{num(result.lateCheckinsPerMonth)}</dd></div>
          <div className="flex items-center justify-between px-5 py-3"><dt className="text-sm text-gray-300">Reclamações por mês</dt><dd className="text-base font-semibold tabular-nums text-white">{num(result.complaintsPerMonth)}</dd></div>
        </dl>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Estimativa indicativa para apoiar a conversa, não é um valor contratual.
        </p>
      </div>
    </div>
  );
}

export default function SalesCalculator({ system }: { system: CommercialSystem }) {
  if (system === 'workio') return <WorkioCalculator />;
  if (system === 'sol') return <SolCalculator />;
  return <EmptyState title="Calculadora do EMET por preencher" text="Quando tivermos os dados do EMET (planos e o que poupa ao cliente), a calculadora aparece aqui." />;
}
