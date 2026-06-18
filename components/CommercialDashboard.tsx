import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import { CommercialLeadStatus, CrmSeller, Lead } from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';

const FUNNEL: { label: string; match: (lead: Lead) => boolean; tone: string }[] = [
  { label: 'Leads', match: () => true, tone: 'bg-slate-500' },
  { label: 'Contactados', match: (l) => !['new', 'prepared', 'scheduled_contact'].includes(l.commercialStatus || 'new'), tone: 'bg-sky-500' },
  { label: 'Decisor', match: (l) => ['decision_maker_identified', 'demo_scheduled', 'demo_completed', 'follow_up', 'proposal_sent', 'won'].includes(l.commercialStatus || ''), tone: 'bg-fuchsia-500' },
  { label: 'Demo marcada', match: (l) => ['demo_scheduled', 'demo_completed', 'follow_up', 'proposal_sent', 'won'].includes(l.commercialStatus || ''), tone: 'bg-orange-500' },
  { label: 'Demo feita', match: (l) => ['demo_completed', 'follow_up', 'proposal_sent', 'won'].includes(l.commercialStatus || ''), tone: 'bg-lime-500' },
  { label: 'Proposta', match: (l) => ['proposal_sent', 'won'].includes(l.commercialStatus || ''), tone: 'bg-emerald-500' },
  { label: 'Cliente', match: (l) => l.commercialStatus === 'won', tone: 'bg-green-500' }
];

interface CommercialDashboardProps {
  restrictSellerId?: string;
}

export default function CommercialDashboard({ restrictSellerId }: CommercialDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadRows, sellerRows] = await Promise.all([hotelDb.getAllHotels(), crmDb.getSellers()]);
      setLeads(restrictSellerId ? leadRows.filter((l) => l.responsibleSellerId === restrictSellerId) : leadRows);
      setSellers(restrictSellerId ? sellerRows.filter((s) => s.id === restrictSellerId) : sellerRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [restrictSellerId]);

  const count = (status: CommercialLeadStatus) => leads.filter((l) => l.commercialStatus === status).length;

  const metrics = useMemo(() => ([
    { label: 'Leads gerados', value: leads.length, tone: 'text-white' },
    { label: 'Preparados', value: count('prepared'), tone: 'text-cyan-300' },
    { label: 'Em contacto', value: count('in_contact') + count('contacted_reception'), tone: 'text-indigo-300' },
    { label: 'Decisores', value: count('decision_maker_identified'), tone: 'text-fuchsia-300' },
    { label: 'Demos agendadas', value: count('demo_scheduled'), tone: 'text-orange-300' },
    { label: 'Demos realizadas', value: count('demo_completed'), tone: 'text-lime-300' },
    { label: 'Propostas', value: count('proposal_sent'), tone: 'text-emerald-300' },
    { label: 'Ganhos', value: count('won'), tone: 'text-green-300' },
    { label: 'Perdidos', value: count('lost'), tone: 'text-rose-300' },
    { label: 'Nao contactar', value: count('do_not_contact'), tone: 'text-red-300' }
  ]), [leads]);

  const funnel = useMemo(() => {
    const base = leads.length || 1;
    return FUNNEL.map((stage) => {
      const value = leads.filter(stage.match).length;
      return { ...stage, value, pct: Math.round((value / base) * 100) };
    });
  }, [leads]);

  const perSeller = useMemo(() => {
    return sellers.map((seller) => {
      const own = leads.filter((l) => l.responsibleSellerId === seller.id);
      const won = own.filter((l) => l.commercialStatus === 'won').length;
      const lost = own.filter((l) => l.commercialStatus === 'lost' || l.commercialStatus === 'do_not_contact').length;
      const demos = own.filter((l) => ['demo_scheduled', 'demo_completed'].includes(l.commercialStatus || '')).length;
      const noNextAction = own.filter((l) => !l.nextActionAt && !['won', 'lost', 'do_not_contact'].includes(l.commercialStatus || '')).length;
      const conversion = own.length ? Math.round((won / own.length) * 100) : 0;
      return { seller, total: own.length, won, lost, demos, noNextAction, conversion };
    });
  }, [sellers, leads]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-ai-card p-16 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-gray-400">A calcular indicadores comerciais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><BarChart3 className="h-5 w-5 text-emerald-500" /> Dashboard de Vendas</h2>
          <p className="mt-1 text-xs text-gray-400">Saude real da operacao comercial SOL.</p>
        </div>
        <button onClick={loadData} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-gray-800 bg-ai-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{m.label}</div>
            <div className={`mt-2 text-xl font-bold ${m.tone}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Funil */}
      <div className="rounded-lg border border-gray-800 bg-ai-card p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Funil comercial</h3>
        <div className="space-y-2">
          {funnel.map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[11px] font-bold text-gray-300">{stage.label}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-ai-dark">
                <div className={`flex h-full items-center justify-end rounded px-2 ${stage.tone}`} style={{ width: `${Math.max(stage.pct, 4)}%` }}>
                  <span className="text-[10px] font-bold text-white">{stage.value}</span>
                </div>
              </div>
              <span className="w-10 shrink-0 text-right text-[10px] font-bold text-gray-500">{stage.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Por vendedor */}
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
        <div className="border-b border-gray-800 px-5 py-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><Users className="h-3.5 w-3.5" /> Metricas por vendedor</h3>
        </div>
        {perSeller.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-500">Sem vendedores registados.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-ai-dark text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2 text-center">Leads</th>
                <th className="px-4 py-2 text-center">Demos</th>
                <th className="px-4 py-2 text-center">Ganhos</th>
                <th className="px-4 py-2 text-center">Perdidos</th>
                <th className="px-4 py-2 text-center">Sem proxima acao</th>
                <th className="px-4 py-2 text-center">Conversao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {perSeller.map((row) => (
                <tr key={row.seller.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-bold text-white">{row.seller.name}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{row.total}</td>
                  <td className="px-4 py-3 text-center text-orange-300">{row.demos}</td>
                  <td className="px-4 py-3 text-center text-green-300">{row.won}</td>
                  <td className="px-4 py-3 text-center text-rose-300">{row.lost}</td>
                  <td className="px-4 py-3 text-center">
                    {row.noNextAction > 0 ? <span className="font-bold text-amber-300">{row.noNextAction}</span> : <span className="text-gray-600">0</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 font-bold ${row.conversion >= 20 ? 'text-emerald-300' : 'text-gray-400'}`}>
                      {row.conversion >= 20 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{row.conversion}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
