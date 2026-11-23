import React, { useMemo, useState } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Search, Type } from 'lucide-react';
import { CommercialSystem, CrmMaterial, CrmMaterialType } from '../../types';
import { modulesOf, moduleLabel } from '../../services/commercialSystems';
import { formatBytes } from '../../services/materialStorage';
import { EmptyState, SectionHeading } from './ui';

const FILTERS: { id: 'all' | CrmMaterialType; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Imagens' },
  { id: 'text', label: 'Texto' },
  { id: 'link', label: 'Links' }
];

function MaterialCard({ m }: { m: CrmMaterial }) {
  const [open, setOpen] = useState(false);
  const isFile = m.materialType === 'pdf' || m.materialType === 'image';

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-ai-card">
      {m.materialType === 'image' && m.url && (
        <a href={m.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${m.title}`}>
          <img src={m.url} alt={m.title} className="aspect-video w-full object-cover" loading="lazy" />
        </a>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {m.materialType !== 'image' && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-300">
              {m.materialType === 'pdf' ? <FileText className="h-5 w-5" /> : m.materialType === 'text' ? <Type className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
            </span>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-semibold leading-snug text-white">{m.title}</h4>
            {m.description && <p className="mt-1 text-sm leading-relaxed text-gray-400">{m.description}</p>}
          </div>
        </div>

        {m.materialType === 'text' && m.content && (
          <div className="mt-3">
            <p className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-300 ${open ? '' : 'line-clamp-4'}`}>{m.content}</p>
            {m.content.length > 220 && (
              <button onClick={() => setOpen(!open)} className="mt-1 text-sm font-medium text-emerald-400 hover:underline">{open ? 'Ler menos' : 'Ler tudo'}</button>
            )}
          </div>
        )}

        {m.url && m.materialType !== 'text' && (
          <a href={m.url} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-medium text-emerald-400 hover:underline">
            {m.materialType === 'pdf' ? 'Abrir PDF' : m.materialType === 'image' ? 'Ver em ponto grande' : 'Abrir'}
            <ExternalLink className="h-3.5 w-3.5" />
            {isFile && m.fileSize ? <span className="font-normal text-gray-500">{formatBytes(m.fileSize)}</span> : null}
          </a>
        )}
      </div>
    </article>
  );
}

export default function SalesMaterials({ system, materials }: { system: CommercialSystem; materials: CrmMaterial[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | CrmMaterialType>('all');
  const [moduleFilter, setModuleFilter] = useState('');

  const mine = useMemo(() => materials.filter((m) => (m.system || 'sol') === system && m.active), [materials, system]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((m) =>
      (type === 'all' || m.materialType === type || (type === 'link' && m.materialType === 'video')) &&
      (!moduleFilter || (m.moduleCode || '') === (moduleFilter === '__geral' ? '' : moduleFilter)) &&
      (!q || `${m.title} ${m.description || ''} ${m.content || ''}`.toLowerCase().includes(q))
    );
  }, [mine, query, type, moduleFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, CrmMaterial[]>();
    filtered.forEach((m) => map.set(m.moduleCode || '', [...(map.get(m.moduleCode || '') || []), m]));
    const order = modulesOf(system).map((m) => m.code);
    const rank = (k: string) => (k === '' ? -1 : order.indexOf(k) >= 0 ? order.indexOf(k) : 1000);
    return Array.from(map.entries())
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([key, items]) => ({ key, label: moduleLabel(system, key), items }));
  }, [filtered, system]);

  // Modulos que tem material, para o filtro
  const modulesWithMaterial = useMemo(
    () => Array.from(new Set(mine.map((m) => m.moduleCode || ''))).sort((a, b) => a.localeCompare(b)),
    [mine]
  );

  if (mine.length === 0) {
    return (
      <EmptyState
        title="Ainda sem materiais neste sistema"
        text="Os administradores acrescentam PDFs, imagens e textos em Scripts & Materiais, escolhendo o sistema e o módulo. Quando existirem, aparecem aqui separados por módulo."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Materiais por módulo"
        text="Tudo o que a equipa pode mostrar ou enviar ao cliente, separado pelo módulo de que fala."
        action={
          <label className="relative block">
            <span className="sr-only">Procurar material</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar" className="w-64 rounded-lg border border-gray-700 bg-ai-dark py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none" />
          </label>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="Tipo de material" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} aria-pressed={type === f.id} onClick={() => setType(f.id)} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${type === f.id ? 'border-emerald-500/50 bg-emerald-500/15 font-semibold text-emerald-200' : 'border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'}`}>{f.label}</button>
          ))}
        </div>
        {modulesWithMaterial.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-gray-400">
            Módulo
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none">
              <option value="">Todos</option>
              {modulesWithMaterial.map((c) => <option key={c || '__geral'} value={c || '__geral'}>{moduleLabel(system, c)}</option>)}
            </select>
          </label>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Nada encontrado" text="Mude o filtro ou procure por outra palavra." />
      ) : (
        groups.map((g) => (
          <section key={g.key || 'geral'} className="space-y-3">
            <h4 className="flex items-center gap-2 border-b border-gray-800 pb-2 text-base font-semibold text-white">
              <ImageIcon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              {g.label}
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-normal text-gray-400">{g.items.length}</span>
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((m) => <MaterialCard key={m.id} m={m} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
