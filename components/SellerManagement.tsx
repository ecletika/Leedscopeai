import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Edit,
  Globe2,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  Target,
  Users,
  X
} from 'lucide-react';
import { CrmSeller, SellerRole, SellerStatus } from '../types';
import { crmDb } from '../services/crmDb';

const roleOptions: { value: SellerRole; label: string; tone: string }[] = [
  { value: 'seller', label: 'Vendedor', tone: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  { value: 'sales_supervisor', label: 'Supervisor comercial', tone: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  { value: 'admin', label: 'Administrador', tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' }
];

const fieldClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';

const buildDefaultSeller = (): CrmSeller => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  phone: '',
  languages: [],
  assignedRegions: [],
  workSchedule: 'Manha (part-time)',
  dailyContactGoal: 20,
  weeklyDemoGoal: 5,
  role: 'seller',
  status: 'active'
});

const splitList = (value: string): string[] =>
  value.split(',').map((item) => item.trim()).filter(Boolean);

export default function SellerManagement() {
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<CrmSeller | null>(null);
  const [formPassword, setFormPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setSellers(await crmDb.getSellers());
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar vendedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => ({
    total: sellers.length,
    active: sellers.filter((s) => s.status === 'active').length,
    dailyGoal: sellers.reduce((acc, s) => acc + (s.status === 'active' ? s.dailyContactGoal : 0), 0),
    weeklyDemos: sellers.reduce((acc, s) => acc + (s.status === 'active' ? s.weeklyDemoGoal : 0), 0)
  }), [sellers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current?.name?.trim() || !current.email?.trim()) {
      alert('Nome e email sao obrigatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let userId = current.userId;
      let loginWarning = '';

      // Se foi definida uma senha, cria/atualiza a conta de login do vendedor
      if (formPassword.trim()) {
        const linkedId = await crmDb.upsertSellerLogin({
          name: current.name.trim(),
          email: current.email.trim(),
          password: formPassword.trim()
        });
        if (linkedId) userId = linkedId;
        else loginWarning = ' (mas nao foi possivel criar a conta de login - Supabase em falta?)';
      }

      const ok = await crmDb.saveSeller({ ...current, name: current.name.trim(), email: current.email.trim(), userId });
      if (ok) {
        if (loginWarning) setError('Vendedor guardado' + loginWarning);
        await loadData();
        setModalOpen(false);
        setCurrent(null);
        setFormPassword('');
      } else {
        setError('Nao foi possivel guardar o vendedor.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (seller: CrmSeller) => {
    const nextStatus: SellerStatus = seller.status === 'active' ? 'inactive' : 'active';
    await crmDb.saveSeller({ ...seller, status: nextStatus });
    await loadData();
  };

  const roleMeta = (role: SellerRole) => roleOptions.find((r) => r.value === role) || roleOptions[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Users className="h-5 w-5 text-emerald-500" /> Gestao de Vendedores
          </h2>
          <p className="mt-1 text-xs text-gray-400">Equipa comercial, metas diarias, regioes e permissoes do SOL.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700" title="Sincronizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setCurrent(buildDefaultSeller()); setFormPassword(''); setModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
            <Plus className="h-4 w-4" /> Novo vendedor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Vendedores', value: stats.total, icon: Users },
          { label: 'Ativos', value: stats.active, icon: CheckCircle },
          { label: 'Meta contactos/dia', value: stats.dailyGoal, icon: Target },
          { label: 'Meta demos/semana', value: stats.weeklyDemos, icon: Shield }
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-800 bg-ai-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.label}</span>
              <item.icon className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/25 bg-rose-600/10 p-3 text-xs text-rose-300">{error}</div>
      )}

      {loading ? (
        <div className="rounded-lg border border-gray-800 bg-ai-card p-16 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs text-gray-400">A carregar equipa...</p>
        </div>
      ) : sellers.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-ai-card p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <h3 className="text-base font-bold text-white">Sem vendedores registados</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">Adicione a equipa comercial para atribuir leads e organizar o planeador semanal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sellers.map((seller) => {
            const meta = roleMeta(seller.role);
            return (
              <div key={seller.id} className="flex flex-col rounded-lg border border-gray-800 bg-ai-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/15 text-sm font-bold text-emerald-300">
                      {seller.name ? seller.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white">{seller.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${meta.tone}`}>{meta.label}</span>
                        {seller.userId ? (
                          <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300"><Shield className="h-2.5 w-2.5" /> Login</span>
                        ) : (
                          <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">Sem login</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${seller.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-700/40 text-gray-500'}`}>
                    {seller.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-[11px] text-gray-400">
                  <div className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 text-gray-500" />{seller.email}</div>
                  {seller.phone && <div className="flex items-center gap-2 font-mono text-emerald-300"><Phone className="h-3 w-3 text-gray-500" />{seller.phone}</div>}
                  {seller.assignedRegions.length > 0 && <div className="flex items-center gap-2"><Globe2 className="h-3 w-3 text-gray-500" />{seller.assignedRegions.join(', ')}</div>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-y border-gray-800 py-3 text-center">
                  <div>
                    <div className="text-base font-bold text-white">{seller.dailyContactGoal}</div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">Contactos/dia</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{seller.weeklyDemoGoal}</div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">Demos/semana</div>
                  </div>
                </div>

                {seller.languages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {seller.languages.map((lang) => (
                      <span key={lang} className="rounded border border-gray-700 bg-gray-900/60 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">{lang}</span>
                    ))}
                  </div>
                )}

                <footer className="mt-4 flex items-center gap-2 border-t border-gray-800 pt-4">
                  <button onClick={() => { setCurrent({ ...seller }); setFormPassword(''); setModalOpen(true); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-800 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-gray-700">
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button onClick={() => toggleStatus(seller)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-[11px] font-bold text-gray-300 transition hover:bg-gray-700">
                    {seller.status === 'active' ? 'Desativar' : 'Ativar'}
                  </button>
                </footer>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gray-800 bg-ai-card p-6 shadow-2xl">
            <button onClick={() => setModalOpen(false)} className="absolute right-4 top-4 text-gray-400 transition hover:text-white"><X className="h-5 w-5" /></button>
            <header className="mb-5">
              <h3 className="flex items-center gap-2 text-base font-bold text-white"><Users className="h-5 w-5 text-emerald-400" />{current.name ? 'Editar vendedor' : 'Novo vendedor'}</h3>
            </header>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome *"><input required value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} className={fieldClass} /></Field>
                <Field label="Email *"><input required type="email" value={current.email} onChange={(e) => setCurrent({ ...current, email: e.target.value })} className={fieldClass} /></Field>
                <Field label="Telefone"><input value={current.phone || ''} onChange={(e) => setCurrent({ ...current, phone: e.target.value })} className={`${fieldClass} font-mono`} /></Field>
                <Field label="Foto (URL)"><input value={current.photoUrl || ''} onChange={(e) => setCurrent({ ...current, photoUrl: e.target.value })} className={fieldClass} /></Field>
                <Field label="Idiomas (separar por virgula)"><input value={current.languages.join(', ')} onChange={(e) => setCurrent({ ...current, languages: splitList(e.target.value) })} className={fieldClass} placeholder="PT, EN, ES" /></Field>
                <Field label="Regioes (separar por virgula)"><input value={current.assignedRegions.join(', ')} onChange={(e) => setCurrent({ ...current, assignedRegions: splitList(e.target.value) })} className={fieldClass} placeholder="Lisboa, Algarve" /></Field>
                <Field label="Horario de trabalho"><input value={current.workSchedule || ''} onChange={(e) => setCurrent({ ...current, workSchedule: e.target.value })} className={fieldClass} /></Field>
                <Field label="Perfil de permissao">
                  <select value={current.role} onChange={(e) => setCurrent({ ...current, role: e.target.value as SellerRole })} className={fieldClass}>
                    {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Field>
                <Field label="Meta contactos/dia"><input type="number" min="0" value={current.dailyContactGoal} onChange={(e) => setCurrent({ ...current, dailyContactGoal: Number(e.target.value) })} className={fieldClass} /></Field>
                <Field label="Meta demos/semana"><input type="number" min="0" value={current.weeklyDemoGoal} onChange={(e) => setCurrent({ ...current, weeklyDemoGoal: Number(e.target.value) })} className={fieldClass} /></Field>
                <Field label="Estado">
                  <select value={current.status} onChange={(e) => setCurrent({ ...current, status: e.target.value as SellerStatus })} className={fieldClass}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </Field>
              </div>
              <section className="rounded-lg border border-gray-800 bg-ai-dark/40 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" /> Acesso ao sistema
                </h4>
                <p className="mb-3 text-[11px] text-gray-500">
                  O vendedor entra no sistema com o <span className="font-bold text-gray-300">email</span> acima.{' '}
                  {current.userId ? 'Esta conta ja tem login ativo.' : 'Defina uma senha para criar o acesso.'}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={current.userId ? 'Nova senha (opcional)' : 'Senha de acesso'}>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className={fieldClass}
                      placeholder={current.userId ? 'Deixe vazio para manter a atual' : 'Defina uma senha inicial'}
                      autoComplete="new-password"
                    />
                  </Field>
                  <div className="flex items-end pb-1">
                    {current.userId ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300"><CheckCircle className="h-3 w-3" /> Login ativo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">Ainda sem login</span>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 transition hover:text-white">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}{saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}
