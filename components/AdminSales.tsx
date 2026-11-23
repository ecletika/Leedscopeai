import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Loader2, Trash2, X } from 'lucide-react';
import { CrmSale, CrmSeller, SaleItem } from '../types';
import { crmDb } from '../services/crmDb';
import { SALE_ITEMS, saleItemLabel } from '../services/salesItems';

interface AdminSalesProps {
  sellers: CrmSeller[];
  leads: { id: string; companyName: string }[];
}

const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

const inputClass = 'mt-1 block w-full rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';

interface Draft {
  soldAt: string;
  sellerId: string;
  item: SaleItem;
  clientName: string;
  amountText: string;
  notes: string;
}

const emptyDraft = (): Draft => ({ soldAt: today(), sellerId: '', item: 'workio', clientName: '', amountText: '', notes: '' });

/** "1 250,50" ou "1250.5" -> 1250.5 ; vazio -> undefined (valor por lancar) */
const parseAmount = (text: string): number | undefined | null => {
  let clean = text.trim().replace(/\s/g, '');
  if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.'); // 1.250,50
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) clean = clean.replace(/\./g, ''); // 1.250 (milhares)
  if (!clean) return undefined;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; // null = invalido
};

export default function AdminSales({ sellers, leads }: AdminSalesProps) {
  const [sales, setSales] = useState<CrmSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [month, setMonth] = useState(thisMonth());
  const [sellerFilter, setSellerFilter] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setSales(await crmDb.getSales()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const activeSellers = useMemo(() => sellers.filter((s) => s.status !== 'inactive'), [sellers]);
  const sellerName = (id?: string, fallback?: string) => sellers.find((s) => s.id === id)?.name || fallback || 'Sem vendedor';

  const visible = useMemo(
    () => sales.filter((s) => (!month || s.soldAt.startsWith(month)) && (!sellerFilter || s.sellerId === sellerFilter)),
    [sales, month, sellerFilter]
  );

  // Resumo por vendedor (do periodo filtrado)
  const summary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; pending: number }>();
    visible.forEach((s) => {
      const key = s.sellerId || '—';
      const row = map.get(key) || { name: sellerName(s.sellerId, s.sellerName), count: 0, total: 0, pending: 0 };
      row.count += 1;
      if (s.amount == null) row.pending += 1; else row.total += s.amount;
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total || b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sellers]);

  const grandTotal = visible.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const pendingCount = visible.filter((s) => s.amount == null).length;

  const startEdit = (s: CrmSale) => {
    setEditingId(s.id);
    setError('');
    setDraft({
      soldAt: s.soldAt,
      sellerId: s.sellerId || '',
      item: s.item,
      clientName: s.clientName,
      amountText: s.amount != null ? String(s.amount).replace('.', ',') : '',
      notes: s.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => { setEditingId(null); setDraft(emptyDraft()); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!draft.sellerId) { setError('Escolha o vendedor.'); return; }
    if (!draft.clientName.trim()) { setError('Indique o cliente.'); return; }
    const amount = parseAmount(draft.amountText);
    if (amount === null) { setError('O valor não é válido. Use por exemplo 1250,50 ou deixe vazio.'); return; }

    const lead = leads.find((l) => l.companyName.trim().toLowerCase() === draft.clientName.trim().toLowerCase());
    const existing = sales.find((s) => s.id === editingId);
    const sale: CrmSale = {
      id: editingId || crypto.randomUUID(),
      soldAt: draft.soldAt || today(),
      sellerId: draft.sellerId,
      sellerName: sellerName(draft.sellerId),
      item: draft.item,
      leadId: lead?.id ?? existing?.leadId,
      clientName: draft.clientName.trim(),
      amount,
      notes: draft.notes.trim() || undefined
    };

    setSaving(true);
    const ok = await crmDb.saveSale(sale);
    setSaving(false);
    if (!ok) alert('Atenção: a venda ficou guardada apenas neste browser (falha ao gravar na base de dados). Falta aplicar a migração "crm_sales" no Supabase?');
    reset();
    await load();
  };

  const remove = async (s: CrmSale) => {
    if (!window.confirm(`Apagar a venda de ${saleItemLabel(s.item)} a ${s.clientName}?`)) return;
    const ok = await crmDb.deleteSale(s.id);
    if (!ok) alert('Não foi possível apagar na base de dados.');
    if (editingId === s.id) reset();
    await load();
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-800 bg-ai-card p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Vendas por vendedor</h2>
        <p className="mt-1 text-sm text-gray-400">Associe cada venda a um vendedor e ao artigo vendido. O valor lança-se à mão, porque pode ser negociado com o cliente.</p>
      </div>

      {/* Formulario */}
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-800 bg-ai-dark/40 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Editar venda' : 'Nova venda'}</h3>
          {editingId && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"><X className="h-4 w-4" /> Cancelar edição</button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-200">Vendedor</span>
            <select value={draft.sellerId} onChange={(e) => setDraft({ ...draft, sellerId: e.target.value })} className={inputClass}>
              <option value="">Escolher vendedor</option>
              {activeSellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-200">Artigo</span>
            <select value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value as SaleItem })} className={inputClass}>
              {SALE_ITEMS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-200">Cliente</span>
            <input list="admin-sales-leads" value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="Nome do cliente" className={inputClass} />
            <datalist id="admin-sales-leads">
              {leads.slice(0, 500).map((l) => <option key={l.id} value={l.companyName} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-200">Data da venda</span>
            <input type="date" value={draft.soldAt} onChange={(e) => setDraft({ ...draft, soldAt: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-200">Valor (€)</span>
            <input inputMode="decimal" value={draft.amountText} onChange={(e) => setDraft({ ...draft, amountText: e.target.value })} placeholder="A lançar" className={`${inputClass} tabular-nums`} />
            <span className="mt-1 block text-xs text-gray-500">Deixe vazio se ainda não está fechado.</span>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-200">Notas</span>
            <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Condições negociadas, desconto, prazo…" className={inputClass} />
          </label>
        </div>
        {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingId ? 'Guardar alterações' : 'Associar venda'}
        </button>
      </form>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-sm text-gray-400">Mês</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${inputClass} w-44`} />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">Vendedor</span>
          <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} className={`${inputClass} w-56`}>
            <option value="">Todos</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {month && <button type="button" onClick={() => setMonth('')} className="pb-2 text-sm text-emerald-400 hover:underline">Ver todos os meses</button>}
      </div>

      {/* Resumo */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
              <p className="text-sm text-gray-300">Total lançado</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">{eur(grandTotal)}</p>
              <p className="mt-1 text-xs text-gray-400">{visible.length} venda{visible.length === 1 ? '' : 's'}{pendingCount ? ` · ${pendingCount} com valor por lançar` : ''}</p>
            </div>
            {summary.map((r) => (
              <div key={r.name} className="rounded-xl border border-gray-800 bg-ai-dark/40 p-4">
                <p className="truncate text-sm font-medium text-white">{r.name}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">{eur(r.total)}</p>
                <p className="mt-1 text-xs text-gray-400">{r.count} venda{r.count === 1 ? '' : 's'}{r.pending ? ` · ${r.pending} por lançar` : ''}</p>
              </div>
            ))}
          </div>

          {/* Tabela */}
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-700 px-6 py-10 text-center text-sm text-gray-400">Ainda não há vendas neste período. Use o formulário acima para associar a primeira.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-ai-dark/60 text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Artigo</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                    <th className="px-4 py-3 text-right font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Notas</th>
                    <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {visible.map((s) => (
                    <tr key={s.id} className="text-gray-300 hover:bg-ai-dark/40">
                      <td className="whitespace-nowrap px-4 py-3">{fmtDate(s.soldAt)}</td>
                      <td className="px-4 py-3 font-medium text-white">{s.clientName}</td>
                      <td className="px-4 py-3"><span className="rounded-md border border-gray-700 bg-ai-dark px-2 py-0.5 text-xs font-semibold text-gray-200">{saleItemLabel(s.item)}</span></td>
                      <td className="px-4 py-3">{sellerName(s.sellerId, s.sellerName)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {s.amount != null ? <span className="font-semibold text-white">{eur(s.amount)}</span> : <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">A lançar</span>}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-gray-400" title={s.notes}>{s.notes}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => startEdit(s)} className="rounded-lg p-2 text-emerald-400 hover:bg-gray-800" aria-label={`Editar venda a ${s.clientName}`}><Edit className="h-4 w-4" /></button>
                        <button onClick={() => remove(s)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-rose-400" aria-label={`Apagar venda a ${s.clientName}`}><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
