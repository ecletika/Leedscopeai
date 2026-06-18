import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  Calculator,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  TrendingDown
} from 'lucide-react';
import CallSimulator from './CallSimulator';
import { CrmMaterial } from '../types';
import { crmDb } from '../services/crmDb';
import {
  computeRoi,
  DEMO_PLAYBOOK,
  RoiInputs,
  SALES_PLANS,
  SITUATION_MATERIALS
} from '../services/salesCatalog';

type Tab = 'roi' | 'plans' | 'playbook' | 'materials' | 'simulator';

const fieldClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none';
const fmt = (n: number) => n.toLocaleString('pt-PT');

export default function SalesTools() {
  const [tab, setTab] = useState<Tab>('roi');
  const [materials, setMaterials] = useState<CrmMaterial[]>([]);

  useEffect(() => { crmDb.getMaterials().then((rows) => setMaterials(rows.filter((m) => m.active))); }, []);

  const imageByModule = useMemo(() => {
    const map: Record<number, string> = {};
    materials.forEach((m) => {
      const match = /m(\d+)/i.exec(m.url || '') || /^M(\d+)/i.exec(m.title || '');
      if (match && m.url) map[parseInt(match[1], 10)] = m.url;
    });
    return map;
  }, [materials]);

  // ----- ROI -----
  const [roi, setRoi] = useState<RoiInputs>({
    rooms: 45, cleaningsPerDay: 30, minutesLostPerRoom: 6, staff: 6, costPerHour: 9, lateCheckinsPerMonth: 12, complaintsPerMonth: 4
  });
  const roiResult = useMemo(() => computeRoi(roi), [roi]);
  const setRoiField = (k: keyof RoiInputs, v: string) => setRoi((p) => ({ ...p, [k]: Number(v) || 0 }));

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'roi', label: 'ROI / Economia', icon: Calculator },
    { key: 'plans', label: 'Planos & Precos', icon: BadgePercent },
    { key: 'playbook', label: 'Playbook de Demo', icon: ClipboardList },
    { key: 'materials', label: 'Materiais por situacao', icon: Layers },
    { key: 'simulator', label: 'Simulador IA', icon: GraduationCap }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Lightbulb className="h-5 w-5 text-emerald-500" /> Ferramentas de Venda</h2>
        <p className="mt-1 text-xs text-gray-400">Tudo o que o vendedor precisa para apresentar valor, responder e fechar.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-800 bg-ai-card p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition ${tab === t.key ? 'bg-emerald-600/10 text-emerald-300' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ROI */}
      {tab === 'roi' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-ai-card p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Dados do hotel</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'rooms', label: 'Nº de quartos' },
                { k: 'cleaningsPerDay', label: 'Limpezas por dia' },
                { k: 'minutesLostPerRoom', label: 'Min. perdidos por quarto' },
                { k: 'staff', label: 'Nº de funcionarios' },
                { k: 'costPerHour', label: 'Custo medio por hora (€)' },
                { k: 'lateCheckinsPerMonth', label: 'Check-ins atrasados/mes' },
                { k: 'complaintsPerMonth', label: 'Reclamacoes/mes' }
              ].map((f) => (
                <label key={f.k} className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">{f.label}</span>
                  <input type="number" min="0" value={(roi as any)[f.k]} onChange={(e) => setRoiField(f.k as keyof RoiInputs, e.target.value)} className={fieldClass} />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><TrendingDown className="h-4 w-4" /> Estimativa de perda atual</h3>
            <p className="mb-4 text-xs text-gray-400">Com processos manuais e comunicacao dispersa.</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-800 bg-ai-dark p-4 text-center">
                <div className="text-3xl font-black text-white">{fmt(roiResult.monthlyHoursLost)}h</div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500">perdidas por mes</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-800 bg-ai-dark p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-300">€{fmt(roiResult.monthlyCostLost)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">por mes</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-ai-dark p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-300">€{fmt(roiResult.yearlyCostLost)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">por ano</div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 bg-ai-dark p-3 text-xs text-gray-300">
                Alem disso: <span className="font-bold text-white">{fmt(roiResult.lateCheckinsPerMonth)}</span> check-ins atrasados e <span className="font-bold text-white">{fmt(roiResult.complaintsPerMonth)}</span> reclamacoes por mes — que o SOL ajuda a reduzir.
              </div>
            </div>
            <p className="mt-4 text-[10px] italic text-gray-600">Estimativa indicativa para apoiar a conversa, nao um valor contratual.</p>
          </div>
        </div>
      )}

      {/* PLANOS */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {SALES_PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-lg border p-5 ${p.highlight ? 'border-emerald-500/40 bg-emerald-500/[0.05]' : 'border-gray-800 bg-ai-card'}`}>
              {p.highlight && <span className="mb-2 w-fit rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Mais escolhido</span>}
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              <p className="mt-1 text-xs text-gray-400">{p.idealFor}</p>
              <div className="mt-3 text-sm font-bold text-emerald-300">{p.priceHint}</div>
              <div className="mt-1 text-[11px] text-gray-500">{p.setup} · {p.trial}</div>
              <ul className="mt-4 space-y-1.5 border-t border-gray-800 pt-4">
                {p.modules.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-xs text-gray-300"><CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{m}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[10px] italic text-gray-600 lg:col-span-3">Precos indicativos e configuraveis — ajustar com a politica comercial (por quarto/utilizador, minimo mensal, desconto anual).</p>
        </div>
      )}

      {/* PLAYBOOK */}
      {tab === 'playbook' && (
        <div className="space-y-3">
          {DEMO_PLAYBOOK.map((step, i) => {
            const img = step.module ? imageByModule[step.module] : undefined;
            return (
              <div key={i} className="grid grid-cols-1 gap-4 rounded-lg border border-gray-800 bg-ai-card p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="text-sm font-bold text-white">{step.title}</h3>
                  <p className="mt-2 border-l-2 border-emerald-500/30 pl-3 text-sm italic leading-relaxed text-gray-200">"{step.say}"</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {step.question && <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">Pergunta: {step.question}</span>}
                    {step.objection && <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">Objecao: {step.objection}</span>}
                    <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">Proximo: {step.next}</span>
                  </div>
                </div>
                {img && <img src={img} alt={step.title} className="h-28 w-44 shrink-0 rounded-lg border border-gray-800 object-cover" loading="lazy" />}
              </div>
            );
          })}
        </div>
      )}

      {/* SIMULADOR IA */}
      {tab === 'simulator' && <CallSimulator />}

      {/* MATERIAIS POR SITUACAO */}
      {tab === 'materials' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SITUATION_MATERIALS.map((s) => {
            const img = imageByModule[s.module];
            return (
              <div key={s.situation} className="overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
                {img ? <img src={img} alt={s.situation} className="aspect-video w-full object-cover" loading="lazy" /> : <div className="flex aspect-video items-center justify-center bg-ai-dark text-gray-700"><ImageIcon className="h-6 w-6" /></div>}
                <div className="p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Se o cliente disser</div>
                  <h3 className="mt-0.5 text-sm font-bold text-white">{s.situation}</h3>
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-400"><CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{s.recommend}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
