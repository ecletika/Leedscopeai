import React, { useMemo, useState } from 'react';
import { ChevronDown, ClipboardCheck } from 'lucide-react';
import { CommercialSystem, CrmMaterial } from '../../types';
import { DEMO_PLAYBOOK } from '../../services/salesCatalog';
import { SEGMENTS } from '../../services/segments';
import { buildWorkioDemo, WorkioDemoPhase } from '../../services/workioSales';
import { EmptyState, SectionHeading } from './ui';

const tipStyle: Record<string, { label: string; cls: string }> = {
  tip: { label: 'Dica', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-200' },
  plus: { label: 'Aprofunde', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' },
  fast: { label: 'Acelere', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-200' },
  warn: { label: 'Cuidado', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-200' }
};

/** Linha do tempo vertical: o roteiro e uma sequencia, por isso a numeracao faz sentido. */
function Timeline({ children }: { children: React.ReactNode }) {
  return <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-gray-800">{children}</ol>;
}

function StepBadge({ n }: { n: number }) {
  return <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-ai-dark text-sm font-semibold tabular-nums text-emerald-300">{n}</span>;
}

function WorkioPhase({ phase, index, open, onToggle }: { phase: WorkioDemoPhase; index: number; open: boolean; onToggle: () => void }) {
  return (
    <li className="flex gap-4">
      <StepBadge n={index + 1} />
      <div className="min-w-0 flex-1 rounded-2xl border border-gray-800 bg-ai-card">
        <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{phase.title.replace(/^\d+\.\s*/, '')}</span>
            <span className="text-xs text-gray-500">{phase.timer} · acumulado {phase.acumulado}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="space-y-4 border-t border-gray-800 px-5 py-4">
            <blockquote className="border-l-2 border-emerald-500/50 pl-4 text-sm leading-relaxed text-gray-200">{phase.script}</blockquote>
            {phase.show.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-200">O que mostrar</p>
                <ul className="space-y-1 text-sm text-gray-400">
                  {phase.show.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {phase.tips.length > 0 && (
              <div className="space-y-2">
                {phase.tips.map((t, i) => (
                  <p key={i} className={`rounded-lg border px-3 py-2 text-sm ${tipStyle[t.type].cls}`}><span className="font-semibold">{tipStyle[t.type].label}:</span> {t.text}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function WorkioDemo() {
  const [segmentId, setSegmentId] = useState<string>('');
  const [openId, setOpenId] = useState<string | null>('abertura');
  const segment = SEGMENTS.find((s) => s.id === segmentId);
  const demo = useMemo(() => buildWorkioDemo(segment), [segment]);

  return (
    <div className="space-y-6">
      <SectionHeading title="Roteiro da demo do Workio" text="Escolha o tipo de empresa: o roteiro destaca os módulos que mais interessam a esse cliente." />

      <div role="group" aria-label="Tipo de empresa" className="flex flex-wrap gap-2">
        {[{ id: '', label: 'Geral' }, ...SEGMENTS.map((s) => ({ id: s.id, label: s.label }))].map((s) => (
          <button
            key={s.id || 'geral'}
            aria-pressed={segmentId === s.id}
            onClick={() => { setSegmentId(s.id); setOpenId('abertura'); }}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${segmentId === s.id ? 'border-emerald-500/50 bg-emerald-500/15 font-semibold text-emerald-200' : 'border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Timeline>
          {demo.phases.map((p, i) => (
            <WorkioPhase key={p.id} phase={p} index={i} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
          ))}
        </Timeline>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-800 bg-ai-card p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-white"><ClipboardCheck className="h-4 w-4 text-emerald-400" /> Antes de começar</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {demo.checklist.map((c) => <li key={c} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{c}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-ai-card p-5">
            <h4 className="text-sm font-semibold text-white">Por onde começar, conforme quem ouve</h4>
            <dl className="mt-3 space-y-3 text-sm">
              {demo.adaptations.map((a) => (
                <div key={a.role}><dt className="font-medium text-gray-200">{a.role}</dt><dd className="text-gray-400">{a.start}</dd></div>
              ))}
            </dl>
          </div>
          {demo.optional.length > 0 && (
            <div className="rounded-2xl border border-gray-800 bg-ai-card p-5">
              <h4 className="text-sm font-semibold text-white">Se sobrar tempo</h4>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {demo.optional.map((m) => <span key={m} className="rounded-md border border-gray-700 px-2 py-0.5 text-xs text-gray-300">{m}</span>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SolDemo({ materials }: { materials: CrmMaterial[] }) {
  // Imagem do modulo SOL a mostrar em cada passo (materiais com M<numero> no titulo ou no URL)
  const imageByModule = useMemo(() => {
    const map: Record<number, string> = {};
    materials.forEach((m) => {
      const match = /m(\d+)/i.exec(m.url || '') || /^M(\d+)/i.exec(m.title || '');
      if (match && m.url && m.materialType === 'image') map[parseInt(match[1], 10)] = m.url;
    });
    return map;
  }, [materials]);

  return (
    <div className="space-y-6">
      <SectionHeading title="Roteiro da demo do SOL" text="Dez passos, do contexto ao próximo passo combinado." />
      <Timeline>
        {DEMO_PLAYBOOK.map((step, i) => {
          const img = step.module ? imageByModule[step.module] : undefined;
          return (
            <li key={step.title} className="flex gap-4">
              <StepBadge n={i + 1} />
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 rounded-2xl border border-gray-800 bg-ai-card p-5 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white">{step.title.replace(/^\d+\.\s*/, '')}</h4>
                  <blockquote className="mt-2 border-l-2 border-emerald-500/50 pl-4 text-sm leading-relaxed text-gray-200">{step.say}</blockquote>
                  <div className="mt-3 space-y-1.5 text-sm">
                    {step.question && <p className="text-sky-200"><span className="font-semibold">Pergunte:</span> {step.question}</p>}
                    {step.objection && <p className="text-amber-200"><span className="font-semibold">Se disser:</span> {step.objection}</p>}
                    <p className="text-gray-400"><span className="font-semibold text-gray-300">A seguir:</span> {step.next}</p>
                  </div>
                </div>
                {img && <img src={img} alt={step.title} className="h-28 w-44 shrink-0 rounded-xl border border-gray-800 object-cover" loading="lazy" />}
              </div>
            </li>
          );
        })}
      </Timeline>
    </div>
  );
}

export default function SalesDemo({ system, materials }: { system: CommercialSystem; materials: CrmMaterial[] }) {
  if (system === 'workio') return <WorkioDemo />;
  if (system === 'sol') return <SolDemo materials={materials} />;
  return <EmptyState title="Roteiro do EMET por preencher" text="Quando tivermos os passos da demo do EMET, o roteiro aparece aqui com o mesmo formato." />;
}
