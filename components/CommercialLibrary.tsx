import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Edit,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Sparkles,
  Type,
  X
} from 'lucide-react';
import { CommercialSystem, CrmMaterial, CrmMaterialType, CrmObjection, CrmScript } from '../types';
import { crmDb } from '../services/crmDb';
import { COMMERCIAL_SYSTEMS, modulesOf, moduleLabel } from '../services/commercialSystems';
import { MATERIAL_ACCEPT_ATTR, MAX_MATERIAL_BYTES, formatBytes, uploadMaterialFile } from '../services/materialStorage';

type LibTab = 'scripts' | 'objections' | 'materials';

const fieldClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';

const roleOptions = [
  { value: 'reception', label: 'Recepcao' },
  { value: 'manager', label: 'Gerente' },
  { value: 'housekeeper', label: 'Governanta' },
  { value: 'general_manager', label: 'Diretor geral' },
  { value: 'general', label: 'Geral' }
];

const materialTypeOptions: { value: CrmMaterialType; label: string }[] = [
  { value: 'image', label: 'Imagem' },
  { value: 'pdf', label: 'PDF' },
  { value: 'text', label: 'Texto escrito' },
  { value: 'video', label: 'Video (link)' },
  { value: 'link', label: 'Link' }
];

const DB_WARNING = 'Atenção: ficou guardado apenas neste browser (falha ao gravar na base de dados). Falta aplicar a migração "commercial_library_by_system" no Supabase?';

const sysOf = (s?: CommercialSystem): CommercialSystem => s || 'sol';

export default function CommercialLibrary() {
  const [system, setSystem] = useState<CommercialSystem>('workio');
  const [tab, setTab] = useState<LibTab>('materials');
  const [scripts, setScripts] = useState<CrmScript[]>([]);
  const [objections, setObjections] = useState<CrmObjection[]>([]);
  const [materials, setMaterials] = useState<CrmMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [expandedText, setExpandedText] = useState<string | null>(null);

  const [editScript, setEditScript] = useState<CrmScript | null>(null);
  const [editObjection, setEditObjection] = useState<CrmObjection | null>(null);
  const [editMaterial, setEditMaterial] = useState<CrmMaterial | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, o, m] = await Promise.all([crmDb.getScripts(), crmDb.getObjections(), crmDb.getMaterials()]);
      setScripts(s);
      setObjections(o);
      setMaterials(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const sysScripts = useMemo(() => scripts.filter((s) => sysOf(s.system) === system), [scripts, system]);
  const sysObjections = useMemo(() => objections.filter((o) => sysOf(o.system) === system), [objections, system]);
  const sysMaterials = useMemo(() => materials.filter((m) => sysOf(m.system) === system), [materials, system]);

  const countFor = (id: CommercialSystem) =>
    scripts.filter((s) => sysOf(s.system) === id).length +
    objections.filter((o) => sysOf(o.system) === id).length +
    materials.filter((m) => sysOf(m.system) === id).length;

  const tabs: { key: LibTab; label: string; icon: any; count: number }[] = useMemo(() => ([
    { key: 'materials', label: 'Materiais', icon: ImageIcon, count: sysMaterials.length },
    { key: 'scripts', label: 'Scripts', icon: MessageSquare, count: sysScripts.length },
    { key: 'objections', label: 'Objeccoes', icon: Sparkles, count: sysObjections.length }
  ]), [sysScripts, sysObjections, sysMaterials]);

  // Materiais do sistema escolhido, separados por modulo (Geral primeiro, depois a ordem do sistema)
  const materialGroups = useMemo(() => {
    const map = new Map<string, CrmMaterial[]>();
    sysMaterials.forEach((m) => {
      const key = m.moduleCode || '';
      map.set(key, [...(map.get(key) || []), m]);
    });
    const order = modulesOf(system).map((m) => m.code);
    const rank = (k: string) => (k === '' ? -1 : order.indexOf(k) >= 0 ? order.indexOf(k) : 1000);
    return Array.from(map.entries())
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([key, items]) => ({ key, label: moduleLabel(system, key), items }));
  }, [sysMaterials, system]);

  const saveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editScript?.name?.trim() || !editScript.content?.trim()) { alert('Nome e conteudo sao obrigatorios.'); return; }
    setSaving(true);
    const ok = await crmDb.saveScript({ ...editScript, name: editScript.name.trim() });
    setSaving(false);
    if (!ok) alert(DB_WARNING);
    setEditScript(null);
    await loadData();
  };

  const saveObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObjection?.objection?.trim() || !editObjection.suggestedResponse?.trim()) { alert('Objeccao e resposta sao obrigatorias.'); return; }
    setSaving(true);
    const ok = await crmDb.saveObjection({ ...editObjection, objection: editObjection.objection.trim() });
    setSaving(false);
    if (!ok) alert(DB_WARNING);
    setEditObjection(null);
    await loadData();
  };

  const saveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaterial?.title?.trim()) { alert('Titulo e obrigatorio.'); return; }
    const type = editMaterial.materialType;
    if ((type === 'image' || type === 'pdf') && !editMaterial.url) { alert('Anexe o ficheiro (ou, se preferir, escolha o tipo Link).'); return; }
    if ((type === 'link' || type === 'video') && !editMaterial.url?.trim()) { alert('Indique o link.'); return; }
    if (type === 'text' && !editMaterial.content?.trim()) { alert('Escreva o texto do material.'); return; }
    setSaving(true);
    const ok = await crmDb.saveMaterial({ ...editMaterial, title: editMaterial.title.trim(), moduleCode: editMaterial.moduleCode?.trim() || undefined });
    setSaving(false);
    if (!ok) alert(DB_WARNING);
    setEditMaterial(null);
    setUploadError('');
    await loadData();
  };

  const attachFile = async (file: File | undefined) => {
    if (!file || !editMaterial) return;
    setUploading(true);
    setUploadError('');
    try {
      const up = await uploadMaterialFile(file, sysOf(editMaterial.system));
      setEditMaterial((prev) => prev ? {
        ...prev,
        url: up.url,
        fileName: up.fileName,
        fileType: up.fileType,
        fileSize: up.fileSize,
        // o tipo acompanha o ficheiro anexado
        materialType: up.fileType === 'application/pdf' ? 'pdf' : 'image',
        title: prev.title || up.fileName.replace(/\.[^.]+$/, '')
      } : prev);
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao enviar o ficheiro.');
    } finally {
      setUploading(false);
    }
  };

  const newScript = (): CrmScript => ({ id: crypto.randomUUID(), system, name: '', targetRole: 'manager', language: 'PT', country: 'Portugal', content: '', active: true });
  const newObjection = (): CrmObjection => ({ id: crypto.randomUUID(), system, objection: '', suggestedResponse: '', category: '', active: true });
  const newMaterial = (moduleCode?: string): CrmMaterial => ({ id: crypto.randomUUID(), system, moduleCode, title: '', materialType: 'pdf', url: '', description: '', targetStage: 'demo', active: true });

  const closeMaterial = () => { setEditMaterial(null); setUploadError(''); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><BookOpen className="h-5 w-5 text-emerald-500" /> Scripts, Objeccoes e Materiais</h2>
          <p className="mt-1 text-xs text-gray-400">Escolha o sistema para ver (ou acrescentar) o que a equipa usa no Modo Play. Os materiais ficam separados por módulo.</p>
        </div>
        <button onClick={loadData} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700" aria-label="Atualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {/* Sistema */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="group" aria-label="Sistema">
        {COMMERCIAL_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={system === s.id}
            onClick={() => setSystem(s.id)}
            className={`rounded-lg border p-4 text-left transition ${system === s.id ? 'border-emerald-500/50 bg-emerald-500/[0.08]' : 'border-gray-800 bg-ai-card hover:border-gray-600'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{s.label}</span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">{countFor(s.id)} itens</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">{s.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-gray-800 bg-ai-card p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-xs font-bold transition ${tab === t.key ? 'bg-emerald-600/10 text-emerald-300' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-800 bg-ai-card p-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : (
        <>
          {/* SCRIPTS */}
          {tab === 'scripts' && (
            <Section title={`Scripts · ${COMMERCIAL_SYSTEMS.find((s) => s.id === system)?.label}`} onAdd={() => setEditScript(newScript())}>
              {system !== 'sol' && (
                <p className="rounded-lg border border-gray-800 bg-ai-card p-3 text-[11px] text-gray-400">
                  O Modo Play já traz um guião base {system === 'workio' ? 'do Workio' : 'do EMET (por preencher)'}. Os scripts que criar aqui aparecem para escolher a seguir a esse guião.
                </p>
              )}
              {sysScripts.length === 0 && <Empty>Ainda sem scripts para este sistema.</Empty>}
              {sysScripts.map((s) => (
                <div key={s.id} className="rounded-lg border border-gray-800 bg-ai-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{s.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.targetRole && <Tag>{roleOptions.find((r) => r.value === s.targetRole)?.label || s.targetRole}</Tag>}
                        {s.language && <Tag>{s.language}</Tag>}
                        {s.country && <Tag>{s.country}</Tag>}
                        {!s.active && <Tag tone="muted">Inativo</Tag>}
                      </div>
                    </div>
                    <button onClick={() => setEditScript({ ...s, system: sysOf(s.system) })} className="rounded-lg bg-gray-800 p-2 text-emerald-300 hover:bg-gray-700" aria-label="Editar script"><Edit className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-300">{s.content}</p>
                </div>
              ))}
            </Section>
          )}

          {/* OBJECCOES */}
          {tab === 'objections' && (
            <Section title={`Banco de objeccoes · ${COMMERCIAL_SYSTEMS.find((s) => s.id === system)?.label}`} onAdd={() => setEditObjection(newObjection())}>
              {sysObjections.length === 0 && <Empty>Ainda sem objeções para este sistema.</Empty>}
              {sysObjections.map((o) => (
                <div key={o.id} className="rounded-lg border border-gray-800 bg-ai-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">"{o.objection}"</h3>
                        {o.category && <Tag>{o.category}</Tag>}
                        {!o.active && <Tag tone="muted">Inativo</Tag>}
                      </div>
                    </div>
                    <button onClick={() => setEditObjection({ ...o, system: sysOf(o.system) })} className="rounded-lg bg-gray-800 p-2 text-emerald-300 hover:bg-gray-700" aria-label="Editar objeção"><Edit className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-3 border-l-2 border-emerald-500/30 pl-3 text-xs leading-relaxed text-gray-300">{o.suggestedResponse}</p>
                </div>
              ))}
            </Section>
          )}

          {/* MATERIAIS — por modulo */}
          {tab === 'materials' && (
            <Section title={`Materiais · ${COMMERCIAL_SYSTEMS.find((s) => s.id === system)?.label}`} onAdd={() => setEditMaterial(newMaterial())}>
              {materialGroups.length === 0 && <Empty>Ainda sem materiais para este sistema. Use "Adicionar" para anexar PDFs, imagens ou escrever um texto.</Empty>}
              {materialGroups.map((g) => (
                <div key={g.key || 'geral'} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-1.5">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                      {g.label}
                      <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-normal text-gray-400">{g.items.length}</span>
                    </h4>
                    <button onClick={() => setEditMaterial(newMaterial(g.key || undefined))} className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-emerald-300">
                      <Plus className="h-3 w-3" /> Neste módulo
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((m) => (
                      <div key={m.id} className="flex flex-col rounded-lg border border-gray-800 bg-ai-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-300">
                              {m.materialType === 'pdf' ? <FileText className="h-4 w-4" /> : m.materialType === 'text' ? <Type className="h-4 w-4" /> : m.materialType === 'link' || m.materialType === 'video' ? <LinkIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-white">{m.title}</h3>
                              <Tag>{materialTypeOptions.find((t) => t.value === m.materialType)?.label}</Tag>
                              {!m.active && <Tag tone="muted">Inativo</Tag>}
                            </div>
                          </div>
                          <button onClick={() => setEditMaterial({ ...m, system: sysOf(m.system) })} className="shrink-0 rounded-lg bg-gray-800 p-2 text-emerald-300 hover:bg-gray-700" aria-label="Editar material"><Edit className="h-4 w-4" /></button>
                        </div>

                        {m.materialType === 'image' && m.url && (
                          <a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt={m.title} className="mt-3 aspect-video w-full rounded-lg border border-gray-800 object-cover" loading="lazy" /></a>
                        )}
                        {m.materialType === 'text' && m.content && (
                          <div className="mt-3">
                            <p className={`whitespace-pre-wrap text-xs leading-relaxed text-gray-300 ${expandedText === m.id ? '' : 'line-clamp-4'}`}>{m.content}</p>
                            {m.content.length > 200 && (
                              <button onClick={() => setExpandedText(expandedText === m.id ? null : m.id)} className="mt-1 text-[11px] text-emerald-400 hover:underline">{expandedText === m.id ? 'Ver menos' : 'Ver tudo'}</button>
                            )}
                          </div>
                        )}
                        {m.description && <p className="mt-3 text-xs leading-relaxed text-gray-400">{m.description}</p>}
                        {m.url && m.materialType !== 'text' && (
                          <a href={m.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                            <LinkIcon className="h-3 w-3" /> {m.materialType === 'pdf' ? 'Abrir PDF' : 'Abrir'}
                            {m.fileName && <span className="text-gray-500">· {m.fileName}{m.fileSize ? ` (${formatBytes(m.fileSize)})` : ''}</span>}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      {/* MODAL SCRIPT */}
      {editScript && (
        <Modal title={editScript.name ? 'Editar script' : 'Novo script'} onClose={() => setEditScript(null)}>
          <form onSubmit={saveScript} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sistema *"><SystemSelect value={sysOf(editScript.system)} onChange={(v) => setEditScript({ ...editScript, system: v })} /></Field>
              <Field label="Nome *"><input required value={editScript.name} onChange={(e) => setEditScript({ ...editScript, name: e.target.value })} className={fieldClass} /></Field>
              <Field label="Alvo">
                <select value={editScript.targetRole || 'manager'} onChange={(e) => setEditScript({ ...editScript, targetRole: e.target.value })} className={fieldClass}>
                  {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Idioma"><input value={editScript.language || ''} onChange={(e) => setEditScript({ ...editScript, language: e.target.value })} className={fieldClass} placeholder="PT, EN, ES" /></Field>
              <Field label="Pais"><input value={editScript.country || ''} onChange={(e) => setEditScript({ ...editScript, country: e.target.value })} className={fieldClass} /></Field>
            </div>
            <Field label="Conteudo *"><textarea required rows={6} value={editScript.content} onChange={(e) => setEditScript({ ...editScript, content: e.target.value })} className={`${fieldClass} leading-relaxed`} placeholder="Use [NOME] para o nome do vendedor." /></Field>
            <ActiveToggle checked={editScript.active} onChange={(v) => setEditScript({ ...editScript, active: v })} />
            <ModalActions saving={saving} onCancel={() => setEditScript(null)} />
          </form>
        </Modal>
      )}

      {/* MODAL OBJECCAO */}
      {editObjection && (
        <Modal title={editObjection.objection ? 'Editar objeccao' : 'Nova objeccao'} onClose={() => setEditObjection(null)}>
          <form onSubmit={saveObjection} className="space-y-4">
            <Field label="Sistema *"><SystemSelect value={sysOf(editObjection.system)} onChange={(v) => setEditObjection({ ...editObjection, system: v })} /></Field>
            <Field label="Objeccao do cliente *"><input required value={editObjection.objection} onChange={(e) => setEditObjection({ ...editObjection, objection: e.target.value })} className={fieldClass} /></Field>
            <Field label="Resposta curta *"><textarea required rows={3} value={editObjection.suggestedResponse} onChange={(e) => setEditObjection({ ...editObjection, suggestedResponse: e.target.value })} className={`${fieldClass} leading-relaxed`} /></Field>
            <Field label="Resposta completa"><textarea rows={4} value={editObjection.fullResponse || ''} onChange={(e) => setEditObjection({ ...editObjection, fullResponse: e.target.value })} className={`${fieldClass} leading-relaxed`} placeholder="Versao mais detalhada para usar se o cliente insistir." /></Field>
            <Field label="Pergunta para continuar"><input value={editObjection.followUpQuestion || ''} onChange={(e) => setEditObjection({ ...editObjection, followUpQuestion: e.target.value })} className={fieldClass} placeholder="Ex.: Hoje conseguem saber quem limpou cada quarto?" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Material recomendado"><input value={editObjection.recommendedMaterial || ''} onChange={(e) => setEditObjection({ ...editObjection, recommendedMaterial: e.target.value })} className={fieldClass} placeholder="Nome de um material" /></Field>
              <Field label="Proxima accao"><input value={editObjection.nextAction || ''} onChange={(e) => setEditObjection({ ...editObjection, nextAction: e.target.value })} className={fieldClass} placeholder="Agendar demo" /></Field>
            </div>
            <Field label="Categoria"><input value={editObjection.category || ''} onChange={(e) => setEditObjection({ ...editObjection, category: e.target.value })} className={fieldClass} placeholder="preco, concorrencia, tempo..." /></Field>
            <ActiveToggle checked={editObjection.active} onChange={(v) => setEditObjection({ ...editObjection, active: v })} />
            <ModalActions saving={saving} onCancel={() => setEditObjection(null)} />
          </form>
        </Modal>
      )}

      {/* MODAL MATERIAL */}
      {editMaterial && (
        <Modal title={editMaterial.title ? 'Editar material' : 'Novo material'} onClose={closeMaterial}>
          <form onSubmit={saveMaterial} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sistema *">
                <SystemSelect value={sysOf(editMaterial.system)} onChange={(v) => setEditMaterial({ ...editMaterial, system: v, moduleCode: undefined })} />
              </Field>
              <Field label="Módulo">
                {modulesOf(sysOf(editMaterial.system)).length > 0 ? (
                  <select value={editMaterial.moduleCode || ''} onChange={(e) => setEditMaterial({ ...editMaterial, moduleCode: e.target.value || undefined })} className={fieldClass}>
                    <option value="">Geral (sem módulo)</option>
                    {modulesOf(sysOf(editMaterial.system)).map((m) => (
                      <option key={m.code} value={m.code}>{sysOf(editMaterial.system) === 'workio' ? `${m.code} · ${m.name}` : m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={editMaterial.moduleCode || ''}
                    onChange={(e) => setEditMaterial({ ...editMaterial, moduleCode: e.target.value })}
                    list="emet-modules"
                    className={fieldClass}
                    placeholder="Nome do módulo (ou vazio = geral)"
                  />
                )}
                <datalist id="emet-modules">
                  {Array.from(new Set(materials.filter((m) => sysOf(m.system) === 'emet' && m.moduleCode).map((m) => m.moduleCode as string))).map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Titulo *"><input required value={editMaterial.title} onChange={(e) => setEditMaterial({ ...editMaterial, title: e.target.value })} className={fieldClass} /></Field>
              <Field label="Tipo">
                <select value={editMaterial.materialType} onChange={(e) => setEditMaterial({ ...editMaterial, materialType: e.target.value as CrmMaterialType })} className={fieldClass}>
                  {materialTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>

            {/* Ficheiro (PDF / imagem) */}
            {(editMaterial.materialType === 'pdf' || editMaterial.materialType === 'image') && (
              <div className="rounded-lg border border-dashed border-gray-700 bg-ai-dark p-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-300">
                  <Paperclip className="h-4 w-4" /> {editMaterial.url ? 'Substituir ficheiro' : 'Anexar PDF ou imagem'}
                  <input
                    type="file"
                    accept={MATERIAL_ACCEPT_ATTR}
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => { attachFile(e.target.files?.[0]); e.target.value = ''; }}
                  />
                </label>
                <p className="mt-1 text-[11px] text-gray-500">PDF, PNG, JPG, WEBP ou GIF, até {formatBytes(MAX_MATERIAL_BYTES)}.</p>
                {uploading && <p className="mt-2 flex items-center gap-2 text-xs text-gray-300"><Loader2 className="h-3 w-3 animate-spin" /> A enviar...</p>}
                {uploadError && <p className="mt-2 text-xs text-rose-400">{uploadError}</p>}
                {editMaterial.url && !uploading && (
                  <div className="mt-3 space-y-2">
                    <p className="flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle className="h-3.5 w-3.5" /> {editMaterial.fileName || 'Ficheiro anexado'}{editMaterial.fileSize ? ` (${formatBytes(editMaterial.fileSize)})` : ''}</p>
                    {editMaterial.materialType === 'image' && <img src={editMaterial.url} alt="Pré-visualização" className="max-h-40 rounded-lg border border-gray-800 object-contain" />}
                  </div>
                )}
              </div>
            )}

            {/* Link / video */}
            {(editMaterial.materialType === 'link' || editMaterial.materialType === 'video') && (
              <Field label="Link *"><input value={editMaterial.url || ''} onChange={(e) => setEditMaterial({ ...editMaterial, url: e.target.value })} className={fieldClass} placeholder="https://..." /></Field>
            )}

            {/* Texto escrito */}
            {editMaterial.materialType === 'text' && (
              <Field label="Texto *"><textarea rows={8} value={editMaterial.content || ''} onChange={(e) => setEditMaterial({ ...editMaterial, content: e.target.value })} className={`${fieldClass} leading-relaxed`} placeholder="Escreva aqui o material (argumentos, comparativos, casos, perguntas...)." /></Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Etapa alvo"><input value={editMaterial.targetStage || ''} onChange={(e) => setEditMaterial({ ...editMaterial, targetStage: e.target.value })} className={fieldClass} placeholder="demo, follow_up..." /></Field>
            </div>
            <Field label="Descricao / beneficio"><textarea rows={3} value={editMaterial.description || ''} onChange={(e) => setEditMaterial({ ...editMaterial, description: e.target.value })} className={`${fieldClass} leading-relaxed`} /></Field>
            <ActiveToggle checked={editMaterial.active} onChange={(v) => setEditMaterial({ ...editMaterial, active: v })} />
            <ModalActions saving={saving || uploading} onCancel={closeMaterial} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function SystemSelect({ value, onChange }: { value: CommercialSystem; onChange: (v: CommercialSystem) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as CommercialSystem)} className={fieldClass}>
      {COMMERCIAL_SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-gray-800 p-6 text-center text-xs text-gray-500">{children}</p>;
}

function Section({ title, onAdd, children, grid }: { title: string; onAdd: () => void; children: React.ReactNode; grid?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500"><Plus className="h-3.5 w-3.5" /> Adicionar</button>
      </div>
      <div className={grid ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>{children}</div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'muted' }) {
  return <span className={`mr-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold ${tone === 'muted' ? 'border-gray-700 bg-gray-800 text-gray-500' : 'border-gray-700 bg-gray-900/60 text-gray-400'}`}>{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>{children}</label>;
}

function ActiveToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> Ativo (visivel no Modo Play)
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-800 bg-ai-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
        <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-white"><BookOpen className="h-5 w-5 text-emerald-400" /> {title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
      <button type="button" onClick={onCancel} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white">Cancelar</button>
      <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}{saving ? 'A guardar...' : 'Guardar'}
      </button>
    </div>
  );
}
