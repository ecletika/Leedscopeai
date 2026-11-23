import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CommercialSystem, CrmObjection } from '../../types';
import { SITUATION_MATERIALS } from '../../services/salesCatalog';
import { WORKIO_OBJECTIONS } from '../../services/workioSales';
import { EmptyState, SectionHeading } from './ui';

interface ArgumentItem {
  key: string;
  said: string;
  answer: string;
  full?: string;
  question?: string;
  material?: string;
  next?: string;
}

const fromDb = (o: CrmObjection): ArgumentItem => ({
  key: `db-${o.id}`,
  said: o.objection,
  answer: o.suggestedResponse,
  full: o.fullResponse,
  question: o.followUpQuestion,
  material: o.recommendedMaterial,
  next: o.nextAction
});

export default function SalesArguments({ system, objections }: { system: CommercialSystem; objections: CrmObjection[] }) {
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const own = objections.filter((o) => (o.system || 'sol') === system && o.active).map(fromDb);
    if (system !== 'workio') return own;
    // Workio: o que a equipa escreveu primeiro, depois o que ja vem de base
    const base: ArgumentItem[] = WORKIO_OBJECTIONS
      .filter((o) => !own.some((d) => d.said.toLowerCase() === o.objection.toLowerCase()))
      .map((o) => ({ key: `base-${o.objection}`, said: o.objection, answer: o.response, full: o.full, question: o.question, material: o.material, next: o.next }));
    return [...own, ...base];
  }, [objections, system]);

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.said} ${i.answer}`.toLowerCase().includes(q)) : items;

  if (system === 'emet' && items.length === 0) {
    return <EmptyState title="Ainda sem argumentos do EMET" text="Acrescente objeções e respostas do EMET em Scripts & Materiais e aparecem aqui." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Quando o cliente diz…"
        text="A resposta curta para dizer ao telefone, a pergunta para continuar a conversa e o que mostrar a seguir."
        action={
          <label className="relative block">
            <span className="sr-only">Procurar argumento</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar"
              className="w-64 rounded-lg border border-gray-700 bg-ai-dark py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        }
      />

      {shown.length === 0 ? (
        <EmptyState title="Nada encontrado" text="Tente outra palavra, ou acrescente este argumento em Scripts & Materiais." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shown.map((i) => (
            <article key={i.key} className="flex flex-col rounded-2xl border border-gray-800 bg-ai-card p-5">
              <h4 className="text-base font-semibold leading-snug text-white">“{i.said}”</h4>
              <p className="mt-3 text-sm leading-relaxed text-gray-200">{i.answer}</p>
              {i.full && <p className="mt-2 border-l-2 border-gray-700 pl-3 text-sm leading-relaxed text-gray-400">{i.full}</p>}
              {(i.question || i.material || i.next) && (
                <dl className="mt-4 space-y-2 border-t border-gray-800 pt-3 text-sm">
                  {i.question && <div><dt className="font-medium text-sky-200">Pergunte</dt><dd className="text-gray-300">{i.question}</dd></div>}
                  {i.material && <div><dt className="font-medium text-emerald-200">Mostre</dt><dd className="text-gray-300">{i.material}</dd></div>}
                  {i.next && <div><dt className="font-medium text-gray-200">Próximo passo</dt><dd className="text-gray-300">{i.next}</dd></div>}
                </dl>
              )}
            </article>
          ))}
        </div>
      )}

      {system === 'sol' && !q && (
        <div className="space-y-4">
          <SectionHeading title="Situação → o que mostrar" text="Atalhos para o material certo de cada situação típica de um hotel." />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SITUATION_MATERIALS.map((s) => (
              <li key={s.situation} className="rounded-2xl border border-gray-800 bg-ai-card p-4">
                <p className="text-sm font-semibold text-white">{s.situation}</p>
                <p className="mt-1 text-sm text-gray-400">{s.recommend}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
