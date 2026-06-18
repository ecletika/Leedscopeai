import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  Clock,
  FileText,
  Flame,
  KanbanSquare,
  Loader2,
  Play,
  RefreshCw,
  ShieldOff,
  User as UserIcon,
  X
} from 'lucide-react';
import { CommercialLeadStatus, CrmCloseReason, CrmSeller, Lead, LeadPriority } from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';

interface PipelineKanbanProps {
  onOpenPlay: (lead: Lead) => void;
  onSelectProposal?: (lead: Lead) => void;
  onSelectChat?: (lead: Lead) => void;
  restrictSellerId?: string;
}

interface Column {
  status: CommercialLeadStatus;
  label: string;
  accent: string;
}

const COLUMNS: Column[] = [
  { status: 'new', label: 'Novo', accent: 'border-slate-500/40' },
  { status: 'prepared', label: 'Preparado', accent: 'border-cyan-500/40' },
  { status: 'scheduled_contact', label: 'Agendado', accent: 'border-sky-500/40' },
  { status: 'contacted_reception', label: 'Contactado recepcao', accent: 'border-violet-500/40' },
  { status: 'decision_maker_identified', label: 'Decisor identificado', accent: 'border-fuchsia-500/40' },
  { status: 'demo_scheduled', label: 'Demo agendada', accent: 'border-orange-500/40' },
  { status: 'demo_completed', label: 'Demo realizada', accent: 'border-lime-500/40' },
  { status: 'follow_up', label: 'Follow-up', accent: 'border-yellow-500/40' },
  { status: 'proposal_sent', label: 'Proposta enviada', accent: 'border-emerald-500/40' },
  { status: 'won', label: 'Ganho', accent: 'border-green-500/40' },
  { status: 'lost', label: 'Perdido', accent: 'border-rose-500/40' }
];

const priorityTone: Record<LeadPriority, string> = {
  high: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-300 border-blue-500/20'
};

const closedStatuses: CommercialLeadStatus[] = ['lost', 'do_not_contact'];

// Dados obrigatorios para entrar em determinadas etapas
const stageRequirement = (status: CommercialLeadStatus, lead: Lead): string | null => {
  if (status === 'decision_maker_identified' && !lead.contactPerson?.trim()) {
    return 'Identifique o decisor (pessoa de contacto) antes de mover para esta etapa.';
  }
  if (status === 'demo_scheduled' && !lead.nextActionAt) {
    return 'Defina a data da demo (proxima acao) antes de marcar como demo agendada.';
  }
  return null;
};

const daysSince = (iso?: string): number | null => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / 86400000);
};

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function PipelineKanban({ onOpenPlay, onSelectProposal, onSelectChat, restrictSellerId }: PipelineKanbanProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [closeReasons, setCloseReasons] = useState<CrmCloseReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerFilter, setSellerFilter] = useState<'all' | string>('all');
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<CommercialLeadStatus | null>(null);
  const [pendingClose, setPendingClose] = useState<{ lead: Lead; status: CommercialLeadStatus } | null>(null);
  const [closeReasonId, setCloseReasonId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadRows, sellerRows, reasonRows] = await Promise.all([
        hotelDb.getAllHotels(),
        crmDb.getSellers(),
        crmDb.getCloseReasons()
      ]);
      setLeads(leadRows);
      setSellers(sellerRows);
      setCloseReasons(reasonRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const sellerNameById = useMemo(
    () => sellers.reduce<Record<string, string>>((acc, s) => { acc[s.id] = s.name; return acc; }, {}),
    [sellers]
  );

  const visibleLeads = useMemo(() => {
    const base = restrictSellerId ? leads.filter((l) => l.responsibleSellerId === restrictSellerId) : leads;
    return base.filter((l) => sellerFilter === 'all' || l.responsibleSellerId === sellerFilter);
  }, [leads, sellerFilter, restrictSellerId]);

  const leadsByStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    COLUMNS.forEach((c) => { map[c.status] = []; });
    visibleLeads.forEach((lead) => {
      const status = (lead.commercialStatus || 'new') as CommercialLeadStatus;
      if (map[status]) map[status].push(lead);
      // do_not_contact nao tem coluna propria; fica oculto do board ativo
    });
    return map;
  }, [visibleLeads]);

  const applyStatus = async (lead: Lead, status: CommercialLeadStatus, reason?: CrmCloseReason) => {
    const updated: Lead = {
      ...lead,
      commercialStatus: status,
      doNotContact: status === 'do_not_contact' ? true : lead.doNotContact,
      closeReasonId: reason ? reason.id : (closedStatuses.includes(status) ? lead.closeReasonId : undefined),
      closeNotes: reason ? reason.name : lead.closeNotes,
      lastActivityAt: new Date().toISOString()
    };
    await hotelDb.saveHotel(updated);
    await loadData();
  };

  const handleDropOnColumn = async (status: CommercialLeadStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStatus(null);
    setDragLeadId(null);
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const lead = leads.find((l) => l.id === raw);
    if (!lead || lead.commercialStatus === status) return;

    const requirement = stageRequirement(status, lead);
    if (requirement) {
      alert(requirement);
      return;
    }
    if (closedStatuses.includes(status)) {
      setCloseReasonId('');
      setPendingClose({ lead, status });
      return;
    }
    await applyStatus(lead, status);
  };

  const confirmClose = async () => {
    if (!pendingClose) return;
    if (!closeReasonId) {
      alert('Escolha um motivo de encerramento.');
      return;
    }
    const reason = closeReasons.find((r) => r.id === closeReasonId);
    await applyStatus(pendingClose.lead, pendingClose.status, reason);
    setPendingClose(null);
  };

  const isOverdue = (lead: Lead) => !!lead.nextActionAt && new Date(lead.nextActionAt) < new Date();
  const isStale = (lead: Lead) => {
    const d = daysSince(lead.lastActivityAt);
    return d !== null && d >= 7 && !closedStatuses.includes(lead.commercialStatus || 'new');
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-ai-card p-16 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-gray-400">A carregar pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <KanbanSquare className="h-5 w-5 text-emerald-500" /> Pipeline Comercial
          </h2>
          <p className="mt-1 text-xs text-gray-400">Arraste o lead entre etapas. Dados obrigatorios e motivos sao validados automaticamente.</p>
        </div>
        <div className="flex items-center gap-2">
          {!restrictSellerId && (
            <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none">
              <option value="all">Vendedor: todos</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button onClick={loadData} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {COLUMNS.map((col) => {
            const items = leadsByStatus[col.status] || [];
            const over = dragOverStatus === col.status;
            return (
              <div
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDragEnter={() => setDragOverStatus(col.status)}
                onDragLeave={() => setDragOverStatus((prev) => (prev === col.status ? null : prev))}
                onDrop={(e) => handleDropOnColumn(col.status, e)}
                className={`flex w-64 shrink-0 flex-col rounded-lg border bg-ai-card transition ${over ? 'border-emerald-400 ring-1 ring-emerald-400/40' : 'border-gray-800'}`}
              >
                <div className={`flex items-center justify-between border-b-2 ${col.accent} px-3 py-2`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">{col.label}</span>
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: '120px', maxHeight: '64vh' }}>
                  {items.length === 0 ? (
                    <div className="py-6 text-center text-[10px] text-gray-700">{over ? 'Largar aqui' : '—'}</div>
                  ) : (
                    items.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDragLeadId(lead.id);
                        }}
                        onDragEnd={() => { setDragLeadId(null); setDragOverStatus(null); }}
                        className={`cursor-grab rounded-md border border-gray-800 bg-ai-dark p-2.5 transition active:cursor-grabbing hover:border-emerald-500/40 ${dragLeadId === lead.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-xs font-bold text-white">{lead.companyName}</span>
                          {lead.priority && <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${priorityTone[lead.priority]}`}>{lead.priority === 'high' ? 'Alta' : lead.priority === 'medium' ? 'Media' : 'Baixa'}</span>}
                        </div>
                        <div className="mt-1 truncate text-[10px] text-gray-500">{lead.location}</div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px]">
                          <span className="flex items-center gap-1 text-gray-400"><UserIcon className="h-2.5 w-2.5" />{lead.responsibleSellerId ? sellerNameById[lead.responsibleSellerId] || 'Vendedor' : 'Sem vendedor'}</span>
                          <span className="font-bold text-gray-500">Score {lead.leadScore || 0}</span>
                          {(lead.priority === 'high' || lead.potential === 'Hot') && <Flame className="h-2.5 w-2.5 text-rose-400" />}
                        </div>

                        {lead.nextActionAt && (
                          <div className={`mt-2 flex items-center gap-1 text-[9px] ${isOverdue(lead) ? 'text-rose-300' : 'text-gray-400'}`}>
                            <CalendarClock className="h-2.5 w-2.5" />
                            {formatDate(lead.nextActionAt)}
                            {isOverdue(lead) && <span className="font-bold">• atrasado</span>}
                          </div>
                        )}

                        {isStale(lead) && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-300">
                            <Clock className="h-2.5 w-2.5" /> parado ha {daysSince(lead.lastActivityAt)}d
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-1 border-t border-gray-800 pt-2">
                          <button onClick={() => onOpenPlay(lead)} className="flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-emerald-500"><Play className="h-2.5 w-2.5" />Play</button>
                          {onSelectProposal && <button onClick={() => onSelectProposal(lead)} className="rounded bg-gray-800 p-1 text-blue-300 hover:bg-gray-700" title="Proposta"><FileText className="h-2.5 w-2.5" /></button>}
                          {onSelectChat && <button onClick={() => onSelectChat(lead)} className="rounded bg-gray-800 p-1 text-purple-300 hover:bg-gray-700" title="IA"><Bot className="h-2.5 w-2.5" /></button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de motivo ao mover para Perdido/Nao contactar */}
      {pendingClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg border border-rose-500/30 bg-ai-card p-6 shadow-2xl">
            <button onClick={() => setPendingClose(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            <h3 className="flex items-center gap-2 text-base font-bold text-white"><ShieldOff className="h-5 w-5 text-rose-400" /> Encerrar lead</h3>
            <p className="mt-1 text-xs text-gray-400">Mover <span className="font-bold text-white">{pendingClose.lead.companyName}</span> para "{COLUMNS.find((c) => c.status === pendingClose.status)?.label || pendingClose.status}" exige um motivo.</p>
            <div className="mt-4">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Motivo *</span>
              <select value={closeReasonId} onChange={(e) => setCloseReasonId(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none">
                <option value="">Escolher motivo</option>
                {closeReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={() => setPendingClose(null)} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white">Cancelar</button>
              <button onClick={confirmClose} className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500">Confirmar encerramento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
