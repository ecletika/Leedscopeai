import React from 'react';

/** Estado vazio com explicacao e proximo passo (em vez de um ecra em branco). */
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-14 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">{text}</p>
    </div>
  );
}

/** Chip de codigo de modulo (M01...) */
export function ModuleChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-emerald-700/60 bg-emerald-950/40 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">{code}</span>
  );
}

/** Titulo de seccao com descricao curta. */
export function SectionHeading({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {text && <p className="mt-1 max-w-2xl text-sm text-gray-400">{text}</p>}
      </div>
      {action}
    </div>
  );
}
