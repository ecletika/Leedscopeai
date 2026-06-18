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
  Plus,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';
import { CrmMaterial, CrmMaterialType, CrmObjection, CrmScript } from '../types';
import { crmDb } from '../services/crmDb';

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
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link' },
  { value: 'text', label: 'Texto' }
];

export default function CommercialLibrary() {
  const [tab, setTab] = useState<LibTab>('scripts');
  const [scripts, setScripts] = useState<CrmScript[]>([]);
  const [objections, setObjections] = useState<CrmObjection[]>([]);
  const [materials, setMaterials] = useState<CrmMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const tabs: { key: LibTab; label: string; icon: any; count: number }[] = useMemo(() => ([
    { key: 'scripts', label: 'Scripts', icon: MessageSquare, count: scripts.length },
    { key: 'objections', label: 'Objeccoes', icon: Sparkles, count: objections.length },
    { key: 'materials', label: 'Materiais', icon: ImageIcon, count: materials.length }
  ]), [scripts, objections, materials]);

  const saveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editScript?.name?.trim() || !editScript.content?.trim()) { alert('Nome e conteudo sao obrigatorios.'); return; }
    setSaving(true);
    await crmDb.saveScript({ ...editScript, name: editScript.name.trim() });
    setSaving(false);
    setEditScript(null);
    await loadData();
  };

  const saveObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObjection?.objection?.trim() || !editObjection.suggestedResponse?.trim()) { alert('Objeccao e resposta sao obrigatorias.'); return; }
    setSaving(true);
    await crmDb.saveObjection({ ...editObjection, objection: editObjection.objection.trim() });
    setSaving(false);
    setEditObjection(null);
    await loadData();
  };

  const saveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaterial?.title?.trim()) { alert('Titulo e obrigatorio.'); return; }
    setSaving(true);
    await crmDb.saveMaterial({ ...editMaterial, title: editMaterial.title.trim() });
    setSaving(false);
    setEditMaterial(null);
    await loadData();
  };

  const newScript = (): CrmScript => ({ id: crypto.randomUUID(), name: '', targetRole: 'manager', language: 'PT', country: 'Portugal', content: '', active: true });
  const newObjection = (): CrmObjection => ({ id: crypto.randomUUID(), objection: '', suggestedResponse: '', category: '', active: true });
  const newMaterial = (): CrmMaterial => ({ id: crypto.randomUUID(), title: '', materialType: 'image', url: '', description: '', targetStage: 'demo', active: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><BookOpen className="h-5 w-5 text-emerald-500" /> Scripts, Objeccoes e Materiais</h2>
          <p className="mt-1 text-xs text-gray-400">Conteudo comercial usado no Modo Play. Editavel pela equipa, sincronizado com o Supabase.</p>
        </div>
        <button onClick={loadData} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-ai-card p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition ${tab === t.key ? 'bg-emerald-600/10 text-emerald-300' : 'text-gray-400 hover:text-white'}`}>
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
            <Section title="Scripts comerciais" onAdd={() => setEditScript(newScript())}>
              {scripts.map((s) => (
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
                    <button onClick={() => setEditScript({ ...s })} className="rounded-lg bg-gray-800 p-2 text-emerald-300 hover:bg-gray-700"><Edit className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-300">{s.content}</p>
                </div>
              ))}
            </Section>
          )}

          {/* OBJECCOES */}
          {tab === 'objections' && (
            <Section title="Banco de objeccoes" onAdd={() => setEditObjection(newObjection())}>
              {objections.map((o) => (
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
                    <button onClick={() => setEditObjection({ ...o })} className="rounded-lg bg-gray-800 p-2 text-emerald-300 hover:bg-gray-700"><Edit className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-3 border-l-2 border-emerald-500/30 pl-3 text-xs leading-relaxed text-gray-300">{o.suggestedResponse}</p>
                </div>
              ))}
            </Section>
          )}

          {/* MATERIAIS */}
          {tab === 'materials' && (
            <Section title="Materiais comerciais" onAdd={() => setEditMaterial(newMaterial())} grid>
              {materials.map((m) => (
                <div key={m.id} className="flex flex-col rounded-lg border border-gray-800 bg-ai-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-300">
                        {m.materialType === 'pdf' ? <FileText className="h-4 w-4" /> : m.materialType === 'link' ? <LinkIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">{m.title}</h3>
                        <Tag>{materialTypeOptions.find((t) => t.value === m.materialType)?.label}</Tag>
                      </div>
                    </div>
                    <button onClick={() => setEditMaterial({ ...m })} className="rounded-lg bg-gray-800 p-2 text-emerald-300 hover:bg-gray-700"><Edit className="h-4 w-4" /></button>
                  </div>
                  {m.materialType === 'image' && m.url && (
                    <img src={m.url} alt={m.title} className="mt-3 aspect-video w-full rounded-lg border border-gray-800 object-cover" loading="lazy" />
                  )}
                  {m.description && <p className="mt-3 text-xs leading-relaxed text-gray-400">{m.description}</p>}
                  {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"><LinkIcon className="h-3 w-3" /> Abrir</a>}
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
            <Field label="Objeccao do cliente *"><input required value={editObjection.objection} onChange={(e) => setEditObjection({ ...editObjection, objection: e.target.value })} className={fieldClass} /></Field>
            <Field label="Resposta curta *"><textarea required rows={3} value={editObjection.suggestedResponse} onChange={(e) => setEditObjection({ ...editObjection, suggestedResponse: e.target.value })} className={`${fieldClass} leading-relaxed`} /></Field>
            <Field label="Resposta completa"><textarea rows={4} value={editObjection.fullResponse || ''} onChange={(e) => setEditObjection({ ...editObjection, fullResponse: e.target.value })} className={`${fieldClass} leading-relaxed`} placeholder="Versao mais detalhada para usar se o cliente insistir." /></Field>
            <Field label="Pergunta para continuar"><input value={editObjection.followUpQuestion || ''} onChange={(e) => setEditObjection({ ...editObjection, followUpQuestion: e.target.value })} className={fieldClass} placeholder="Ex.: Hoje conseguem saber quem limpou cada quarto?" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Material recomendado"><input value={editObjection.recommendedMaterial || ''} onChange={(e) => setEditObjection({ ...editObjection, recommendedMaterial: e.target.value })} className={fieldClass} placeholder="Comparador SOL vs WhatsApp" /></Field>
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
        <Modal title={editMaterial.title ? 'Editar material' : 'Novo material'} onClose={() => setEditMaterial(null)}>
          <form onSubmit={saveMaterial} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Titulo *"><input required value={editMaterial.title} onChange={(e) => setEditMaterial({ ...editMaterial, title: e.target.value })} className={fieldClass} /></Field>
              <Field label="Tipo">
                <select value={editMaterial.materialType} onChange={(e) => setEditMaterial({ ...editMaterial, materialType: e.target.value as CrmMaterialType })} className={fieldClass}>
                  {materialTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="URL"><input value={editMaterial.url || ''} onChange={(e) => setEditMaterial({ ...editMaterial, url: e.target.value })} className={fieldClass} /></Field>
              <Field label="Etapa alvo"><input value={editMaterial.targetStage || ''} onChange={(e) => setEditMaterial({ ...editMaterial, targetStage: e.target.value })} className={fieldClass} placeholder="demo, follow_up..." /></Field>
            </div>
            <Field label="Descricao / beneficio"><textarea rows={3} value={editMaterial.description || ''} onChange={(e) => setEditMaterial({ ...editMaterial, description: e.target.value })} className={`${fieldClass} leading-relaxed`} /></Field>
            <ActiveToggle checked={editMaterial.active} onChange={(v) => setEditMaterial({ ...editMaterial, active: v })} />
            <ModalActions saving={saving} onCancel={() => setEditMaterial(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
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
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
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
