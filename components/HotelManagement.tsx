import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Database,
  Edit,
  FileText,
  Filter,
  Gauge,
  Link,
  Loader2,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  Play,
  Presentation,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  User,
  X
} from 'lucide-react';
import {
  CommercialLeadStatus,
  CrmCloseReason,
  CrmSeller,
  Lead,
  LeadPriority,
  NextActionType
} from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';
import { computeLeadScore, bandForScore, computeInterestScore } from '../services/leadScoring';

interface HotelManagementProps {
  onSelectProposal?: (hotel: Lead) => void;
  onSelectChat?: (hotel: Lead) => void;
  onOpenPlay?: (hotel: Lead) => void;
  onOpenDemo?: (hotel: Lead) => void;
  onOpenMessages?: (hotel: Lead) => void;
  onOpenQualify?: (hotel: Lead) => void;
  onOpenProposalBuilder?: (hotel: Lead) => void;
  restrictSellerId?: string;
}

const statusOptions: { value: CommercialLeadStatus; label: string; tone: string }[] = [
  { value: 'new', label: 'Novo', tone: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
  { value: 'prepared', label: 'Preparado', tone: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  { value: 'scheduled_contact', label: 'Agendado contacto', tone: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  { value: 'in_contact', label: 'Em contacto', tone: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
  { value: 'contacted_reception', label: 'Contactado recepcao', tone: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  { value: 'decision_maker_identified', label: 'Decisor identificado', tone: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20' },
  { value: 'rescheduled', label: 'Reagendado', tone: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { value: 'demo_scheduled', label: 'Demo agendada', tone: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  { value: 'demo_completed', label: 'Demo realizada', tone: 'bg-lime-500/10 text-lime-300 border-lime-500/20' },
  { value: 'follow_up', label: 'Follow-up', tone: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  { value: 'proposal_sent', label: 'Proposta enviada', tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  { value: 'won', label: 'Ganho', tone: 'bg-green-500/10 text-green-300 border-green-500/20' },
  { value: 'lost', label: 'Perdido', tone: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  { value: 'do_not_contact', label: 'Nao contactar', tone: 'bg-red-500/10 text-red-300 border-red-500/20' }
];

const priorityOptions: { value: LeadPriority; label: string; tone: string }[] = [
  { value: 'high', label: 'Alta', tone: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  { value: 'medium', label: 'Media', tone: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { value: 'low', label: 'Baixa', tone: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
];

const nextActionOptions: { value: NextActionType; label: string }[] = [
  { value: 'call', label: 'Ligar' },
  { value: 'demo', label: 'Demo' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'none', label: 'Sem proxima acao' }
];

const closedStatuses: CommercialLeadStatus[] = ['lost', 'do_not_contact'];
const fieldInputClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';

const getStatusMeta = (status?: CommercialLeadStatus) =>
  statusOptions.find((item) => item.value === status) || statusOptions[0];

const getPriorityMeta = (priority?: LeadPriority) =>
  priorityOptions.find((item) => item.value === priority) || priorityOptions[1];

const formatDateTime = (value?: string) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data invalida';
  return date.toLocaleString();
};

const toDateTimeLocal = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const buildDefaultLead = (): Partial<Lead> => ({
  companyName: '',
  location: '',
  city: '',
  country: 'Portugal',
  niche: 'Hotelaria',
  segment: 'Hotel independente',
  estimatedRooms: undefined,
  website: '',
  phone: '',
  email: '',
  source: 'manual',
  contactPerson: '',
  contactNotes: '',
  potential: 'Medium',
  commercialStatus: 'new',
  priority: 'medium',
  leadScore: 0,
  nextActionType: 'call',
  nextActionAt: '',
  callbackStatus: 'pending',
  callbackScheduledAt: '',
  doNotContact: false
});

export default function HotelManagement({ onSelectProposal, onSelectChat, onOpenPlay, onOpenDemo, onOpenMessages, onOpenQualify, onOpenProposalBuilder, restrictSellerId }: HotelManagementProps) {
  const [hotels, setHotels] = useState<Lead[]>([]);
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [closeReasons, setCloseReasons] = useState<CrmCloseReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CommercialLeadStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | LeadPriority>('all');
  const [sellerFilter, setSellerFilter] = useState<'all' | 'unassigned' | string>('all');
  const [nextActionFilter, setNextActionFilter] = useState<'all' | 'overdue' | 'today' | 'empty'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentHotel, setCurrentHotel] = useState<Partial<Lead> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const [leadRows, sellerRows, reasonRows] = await Promise.all([
        hotelDb.getAllHotels(),
        crmDb.getSellers(),
        crmDb.getCloseReasons()
      ]);
      setHotels(leadRows);
      setSellers(sellerRows);
      setCloseReasons(reasonRows);
    } catch (err: any) {
      console.error('Erro ao carregar banco de leads:', err);
      setDbError(err.message || 'Erro ao comunicar com a base de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sellerNameById = useMemo(() => {
    return sellers.reduce<Record<string, string>>((acc, seller) => {
      acc[seller.id] = seller.name;
      return acc;
    }, {});
  }, [sellers]);

  // Vendedor restrito: ve apenas os seus leads
  const scopedHotels = useMemo(
    () => (restrictSellerId ? hotels.filter((h) => h.responsibleSellerId === restrictSellerId) : hotels),
    [hotels, restrictSellerId]
  );

  const contactedStatuses: CommercialLeadStatus[] = ['in_contact', 'contacted_reception', 'decision_maker_identified', 'rescheduled', 'demo_scheduled', 'demo_completed', 'follow_up', 'proposal_sent'];

  const stats = useMemo(() => {
    const active = scopedHotels.filter((lead) => !closedStatuses.includes(lead.commercialStatus || 'new'));
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: scopedHotels.length,
      active: active.length,
      noNextAction: scopedHotels.filter((lead) => contactedStatuses.includes(lead.commercialStatus || 'new') && !lead.nextActionAt).length,
      hot: scopedHotels.filter((lead) => lead.priority === 'high' || lead.potential === 'Hot').length,
      demos: scopedHotels.filter((lead) => lead.commercialStatus === 'demo_scheduled').length,
      proposals: scopedHotels.filter((lead) => lead.commercialStatus === 'proposal_sent').length,
      won: scopedHotels.filter((lead) => lead.commercialStatus === 'won').length,
      overdue: scopedHotels.filter((lead) => lead.nextActionAt && new Date(lead.nextActionAt) < new Date()).length,
      today: scopedHotels.filter((lead) => lead.nextActionAt?.slice(0, 10) === today).length
    };
  }, [scopedHotels]);

  const filteredHotels = useMemo(() => {
    const textLower = searchTerm.toLowerCase().trim();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    return scopedHotels.filter((hotel) => {
      const matchText = !textLower ||
        hotel.companyName.toLowerCase().includes(textLower) ||
        hotel.location.toLowerCase().includes(textLower) ||
        (hotel.city || '').toLowerCase().includes(textLower) ||
        (hotel.country || '').toLowerCase().includes(textLower) ||
        (hotel.contactPerson || '').toLowerCase().includes(textLower) ||
        (hotel.email || '').toLowerCase().includes(textLower) ||
        (hotel.phone || '').includes(searchTerm);

      const matchStatus = statusFilter === 'all' || hotel.commercialStatus === statusFilter;
      const matchPriority = priorityFilter === 'all' || hotel.priority === priorityFilter;
      const matchSeller =
        sellerFilter === 'all' ||
        (sellerFilter === 'unassigned' && !hotel.responsibleSellerId) ||
        hotel.responsibleSellerId === sellerFilter;

      const nextAction = hotel.nextActionAt ? new Date(hotel.nextActionAt) : null;
      const matchNextAction =
        nextActionFilter === 'all' ||
        (nextActionFilter === 'empty' && !hotel.nextActionAt) ||
        (nextActionFilter === 'today' && hotel.nextActionAt?.slice(0, 10) === today) ||
        (nextActionFilter === 'overdue' && !!nextAction && nextAction < now);

      return matchText && matchStatus && matchPriority && matchSeller && matchNextAction;
    });
  }, [scopedHotels, nextActionFilter, priorityFilter, searchTerm, sellerFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setCurrentHotel(buildDefaultLead());
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hotel: Lead) => {
    setCurrentHotel({
      ...hotel,
      nextActionAt: toDateTimeLocal(hotel.nextActionAt),
      callbackScheduledAt: toDateTimeLocal(hotel.callbackScheduledAt)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem a certeza que deseja remover "${name}" do CRM?`)) return;
    await hotelDb.deleteHotel(id, name);
    await fetchData();
  };

  const handleQuickUpdate = async (hotel: Lead, updates: Partial<Lead>) => {
    const updated: Lead = {
      ...hotel,
      ...updates,
      lastActivityAt: new Date().toISOString()
    };
    const success = await hotelDb.saveHotel(updated);
    if (success) await fetchData();
  };

  const handleRecalcScores = async () => {
    if (!confirm('Recalcular o lead score de todos os leads com base nos sinais atuais?')) return;
    setIsLoading(true);
    try {
      for (const hotel of hotels) {
        const { score } = computeLeadScore(hotel);
        if (score !== (hotel.leadScore || 0)) {
          await hotelDb.saveHotel({ ...hotel, leadScore: score });
        }
      }
      await fetchData();
    } catch (err: any) {
      setDbError(err.message || 'Erro ao recalcular scores.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPlay = async (hotel: Lead) => {
    if (onOpenPlay) {
      onOpenPlay(hotel);
      return;
    }
    await handleQuickUpdate(hotel, {
      commercialStatus: 'in_contact',
      nextActionType: 'call'
    });
  };

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel?.companyName || !currentHotel.location) {
      alert('Nome do hotel e localizacao sao obrigatorios.');
      return;
    }

    const status = (currentHotel.commercialStatus || 'new') as CommercialLeadStatus;
    if (closedStatuses.includes(status) && !currentHotel.closeReasonId) {
      alert('Escolha um motivo antes de marcar como perdido ou nao contactar.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanHotel: Lead = {
        id: currentHotel.id || crypto.randomUUID(),
        companyName: currentHotel.companyName.trim(),
        location: currentHotel.location.trim(),
        city: currentHotel.city?.trim() || undefined,
        country: currentHotel.country?.trim() || undefined,
        niche: currentHotel.niche || 'Hotelaria',
        segment: currentHotel.segment?.trim() || undefined,
        estimatedRooms: currentHotel.estimatedRooms ? Number(currentHotel.estimatedRooms) : undefined,
        website: currentHotel.website?.trim() || undefined,
        phone: currentHotel.phone?.trim() || undefined,
        allPhones: currentHotel.phone ? [currentHotel.phone.trim()] : [],
        email: currentHotel.email?.trim() || undefined,
        source: currentHotel.source?.trim() || 'manual',
        contactPerson: currentHotel.contactPerson?.trim() || undefined,
        contactNotes: currentHotel.contactNotes?.trim() || undefined,
        callbackScheduledAt: currentHotel.callbackScheduledAt || currentHotel.nextActionAt || undefined,
        callbackStatus: currentHotel.callbackStatus as any || 'pending',
        potential: currentHotel.potential as any || 'Medium',
        commercialStatus: status,
        responsibleSellerId: currentHotel.responsibleSellerId || undefined,
        priority: currentHotel.priority || 'medium',
        leadScore: Number(currentHotel.leadScore || 0),
        nextActionType: currentHotel.nextActionType || 'call',
        nextActionAt: currentHotel.nextActionAt || undefined,
        closeReasonId: currentHotel.closeReasonId || undefined,
        closeNotes: currentHotel.closeNotes?.trim() || undefined,
        doNotContact: status === 'do_not_contact' || !!currentHotel.doNotContact,
        lastActivityAt: currentHotel.lastActivityAt || new Date().toISOString(),
        mapsRating: currentHotel.mapsRating || 0,
        mapsReviews: currentHotel.mapsReviews || 0,
        socials: currentHotel.socials || [],
        nif: currentHotel.nif || '',
        cae: currentHotel.cae || '',
        hasWebsite: !!currentHotel.website,
        isProfessionalEmail: false,
        websiteScore: currentHotel.website ? 8 : 0,
        status: currentHotel.status || 'completed',
        potentialReasoning: currentHotel.potentialReasoning || 'Lead preparado no Banco de Leads Comercial.',
        storefront: currentHotel.storefront || {
          analyzed: true,
          signageCondition: 'Unknown',
          visualAppeal: 'Medium',
          needsLedUpgrade: false,
          description: 'Lead registado para operacao comercial SOL.',
          address: currentHotel.location
        },
        diagnosis: currentHotel.contactNotes || 'Pronto para contacto comercial.',
        proposal: currentHotel.proposal || null,
        emailSequence: currentHotel.emailSequence || [],
        generatedSiteCode: currentHotel.generatedSiteCode || null
      };

      const success = await hotelDb.saveHotel(cleanHotel);
      if (success) {
        await fetchData();
        setIsModalOpen(false);
        setCurrentHotel(null);
      } else {
        setDbError('Nao foi possivel guardar o lead.');
      }
    } catch (err: any) {
      console.error(err);
      setDbError(err.message || 'Erro ao guardar lead.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusBadge = (status?: CommercialLeadStatus) => {
    const meta = getStatusMeta(status);
    return (
      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${meta.tone}`}>
        {meta.label}
      </span>
    );
  };

  const renderPriorityBadge = (priority?: LeadPriority) => {
    const meta = getPriorityMeta(priority);
    return (
      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${meta.tone}`}>
        {meta.label}
      </span>
    );
  };

  return (
    <div id="hotel-management-root" className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Database className="h-5 w-5 text-emerald-500" />
            Banco de Leads Comercial
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Pipeline operacional para priorizar, contactar, reagendar e fechar hoteis para o SOL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700"
            title="Sincronizar Supabase"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleRecalcScores}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-gray-700"
            title="Recalcular lead score de todos os leads"
          >
            <Gauge className="h-4 w-4" />
            Recalcular scores
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/10 transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Novo lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { label: 'Leads', value: stats.total, icon: Database },
          { label: 'Ativos', value: stats.active, icon: ClipboardList },
          { label: 'Alta prioridade', value: stats.hot, icon: Gauge },
          { label: 'Atrasados', value: stats.overdue, icon: AlertTriangle },
          { label: 'Hoje', value: stats.today, icon: CalendarClock },
          { label: 'Demos', value: stats.demos, icon: Play },
          { label: 'Propostas', value: stats.proposals, icon: FileText },
          { label: 'Ganhos', value: stats.won, icon: CircleDollarSign }
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

      {dbError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-600/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <h4 className="text-xs font-bold text-red-300">Problema na base de dados</h4>
            <p className="mt-1 text-xs text-red-200/90">{dbError}</p>
          </div>
        </div>
      )}

      {stats.noNextAction > 0 && nextActionFilter !== 'empty' && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="flex-1 text-xs text-amber-200">
            <span className="font-bold">{stats.noNextAction}</span> lead(s) contactado(s) sem proxima accao definida. Regra: nenhum lead contactado deve ficar sem proximo passo.
          </p>
          <button onClick={() => setNextActionFilter('empty')} className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-200 transition hover:bg-amber-500/25">
            Ver e resolver
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Procurar por hotel, cidade, decisor, telefone ou email..."
              className="w-full rounded-lg border border-gray-700 bg-ai-dark py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none">
            <option value="all">Estado: todos</option>
            {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none">
            <option value="all">Prioridade: todas</option>
            {priorityOptions.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </select>

          {!restrictSellerId && (
            <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none">
              <option value="all">Vendedor: todos</option>
              <option value="unassigned">Sem vendedor</option>
              {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
            </select>
          )}

          <select value={nextActionFilter} onChange={(e) => setNextActionFilter(e.target.value as any)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none">
            <option value="all">Proxima acao: todas</option>
            <option value="today">Hoje</option>
            <option value="overdue">Atrasadas</option>
            <option value="empty">Sem proxima acao</option>
          </select>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex rounded-lg border border-gray-700 bg-ai-dark p-0.5">
              <button onClick={() => setViewMode('table')} className={`rounded-md px-3 py-1 text-[11px] font-bold ${viewMode === 'table' ? 'bg-emerald-600/10 text-emerald-300' : 'text-gray-500'}`}>Tabela</button>
              <button onClick={() => setViewMode('grid')} className={`rounded-md px-3 py-1 text-[11px] font-bold ${viewMode === 'grid' ? 'bg-emerald-600/10 text-emerald-300' : 'text-gray-500'}`}>Cards</button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Resultados: <span className="font-bold text-white">{filteredHotels.length}</span> / {scopedHotels.length}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-gray-800 bg-ai-card p-16 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs text-gray-400">A carregar leads do Supabase...</p>
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-ai-card p-12 text-center">
          <Database className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <h3 className="text-base font-bold text-white">Nenhum lead encontrado</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">Ajuste os filtros ou adicione um novo lead comercial.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredHotels.map((hotel) => (
            <div key={hotel.id} className="flex flex-col rounded-lg border border-gray-800 bg-ai-card p-5 transition hover:border-emerald-500/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">{hotel.companyName}</h3>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    {hotel.location}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {renderPriorityBadge(hotel.priority)}
                  <span className="text-[10px] font-bold text-gray-500">Score {hotel.leadScore || 0}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {renderStatusBadge(hotel.commercialStatus)}
                <span className="rounded border border-gray-700 bg-gray-900/60 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                  {hotel.responsibleSellerId ? sellerNameById[hotel.responsibleSellerId] || 'Vendedor' : 'Sem vendedor'}
                </span>
              </div>

              <div className="mt-4 space-y-2 border-y border-gray-800 py-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Decisor</span>
                  <span className="truncate font-medium text-white">{hotel.contactPerson || 'Por identificar'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Telefone</span>
                  <span className="font-mono text-emerald-300">{hotel.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Email</span>
                  <span className="truncate text-gray-300">{hotel.email || 'Sem email'}</span>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <CalendarClock className="h-3.5 w-3.5 text-emerald-400" />
                    Proxima acao
                  </span>
                  <span className="font-semibold text-white">{formatDateTime(hotel.nextActionAt || hotel.callbackScheduledAt)}</span>
                </div>
              </div>

              <div className="mt-4 min-h-[54px] rounded-lg border border-gray-800 bg-gray-950/30 p-3 text-xs italic text-gray-300">
                {hotel.contactNotes || 'Sem notas comerciais registadas.'}
              </div>

              <footer className="mt-auto flex items-center gap-2 border-t border-gray-800 pt-4">
                <button onClick={() => handleStartPlay(hotel)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
                  <Play className="h-3.5 w-3.5" />
                  Play
                </button>
                <button onClick={() => handleDelete(hotel.id, hotel.companyName)} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-rose-300 transition hover:bg-rose-600 hover:text-white" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </footer>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-800 bg-ai-dark text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Proxima acao</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 text-xs">
                {filteredHotels.map((hotel) => (
                  <tr key={hotel.id} className="transition hover:bg-gray-800/30">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{hotel.companyName}</div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span className="max-w-[220px] truncate">{hotel.location}</span>
                      </div>
                      {hotel.website && (
                        <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                          <Link className="h-3 w-3" />
                          Website
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-4">{renderStatusBadge(hotel.commercialStatus)}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {renderPriorityBadge(hotel.priority)}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500">Score {hotel.leadScore || 0}</span>
                          <span className={`inline-flex items-center rounded border px-1 py-0.5 text-[8px] font-bold ${bandForScore(hotel.leadScore || 0).tone}`}>
                            {bandForScore(hotel.leadScore || 0).label}
                          </span>
                        </div>
                        <span className={`inline-flex items-center rounded border px-1 py-0.5 text-[8px] font-bold ${computeInterestScore(hotel).tone}`} title="Interesse comportamental">
                          {computeInterestScore(hotel).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">
                      {hotel.responsibleSellerId ? sellerNameById[hotel.responsibleSellerId] || 'Vendedor' : <span className="text-gray-600">Sem vendedor</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-white">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="max-w-[180px] truncate">{hotel.contactPerson || 'Por identificar'}</span>
                        </div>
                        {hotel.phone && <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-300"><Phone className="h-3 w-3 text-gray-500" />{hotel.phone}</div>}
                        {hotel.email && <div className="flex items-center gap-1 text-[11px] text-gray-400"><Mail className="h-3 w-3 text-gray-500" /><span className="max-w-[180px] truncate">{hotel.email}</span></div>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{formatDateTime(hotel.nextActionAt || hotel.callbackScheduledAt)}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{hotel.nextActionType || 'call'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[240px] truncate text-gray-400">{hotel.contactNotes || 'Sem notas'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleStartPlay(hotel)} className="rounded-lg bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-500" title="Modo Play">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(hotel.id, hotel.companyName)} className="rounded-lg bg-gray-800 p-1.5 text-rose-300 transition hover:bg-rose-600 hover:text-white" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && currentHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-gray-800 bg-ai-card p-6 text-left shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-gray-400 transition hover:text-white">
              <X className="h-5 w-5" />
            </button>

            <header className="mb-5">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Database className="h-5 w-5 text-emerald-400" />
                {currentHotel.id ? 'Editar lead comercial' : 'Adicionar lead comercial'}
              </h3>
              <p className="mt-1 text-xs text-gray-400">Atualize dados de contacto, pipeline, prioridade e proxima acao.</p>
            </header>

            <form onSubmit={handleSaveHotel} className="space-y-5">
              <section>
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Dados do hotel</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Nome do hotel *">
                    <input required value={currentHotel.companyName || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, companyName: e.target.value })} className={fieldInputClass} />
                  </Field>
                  <Field label="Localizacao *">
                    <input required value={currentHotel.location || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, location: e.target.value })} className={fieldInputClass} placeholder="Lisboa, Portugal" />
                  </Field>
                  <Field label="Cidade">
                    <input value={currentHotel.city || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, city: e.target.value })} className={fieldInputClass} />
                  </Field>
                  <Field label="Pais">
                    <input value={currentHotel.country || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, country: e.target.value })} className={fieldInputClass} />
                  </Field>
                  <Field label="Segmento">
                    <input value={currentHotel.segment || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, segment: e.target.value })} className={fieldInputClass} placeholder="Hotel independente" />
                  </Field>
                  <Field label="Quartos estimados">
                    <input type="number" min="0" value={currentHotel.estimatedRooms || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, estimatedRooms: e.target.value ? Number(e.target.value) : undefined })} className={fieldInputClass} />
                  </Field>
                  <Field label="Website">
                    <input type="url" value={currentHotel.website || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, website: e.target.value })} className={fieldInputClass} />
                  </Field>
                  <Field label="Fonte">
                    <input value={currentHotel.source || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, source: e.target.value })} className={fieldInputClass} placeholder="manual, RNET, Google Maps" />
                  </Field>
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Contacto e decisor</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Telefone principal">
                    <input value={currentHotel.phone || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, phone: e.target.value })} className={`${fieldInputClass} font-mono`} />
                  </Field>
                  <Field label="Email geral">
                    <input type="email" value={currentHotel.email || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, email: e.target.value })} className={fieldInputClass} />
                  </Field>
                  <Field label="Pessoa de contacto">
                    <input value={currentHotel.contactPerson || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, contactPerson: e.target.value })} className={fieldInputClass} placeholder="Nome e cargo" />
                  </Field>
                  <Field label="Potencial">
                    <select value={currentHotel.potential || 'Medium'} onChange={(e) => setCurrentHotel({ ...currentHotel, potential: e.target.value as any })} className={fieldInputClass}>
                      <option value="Hot">Hot</option>
                      <option value="Medium">Medium</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Pipeline comercial</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Estado comercial">
                    <select value={currentHotel.commercialStatus || 'new'} onChange={(e) => setCurrentHotel({ ...currentHotel, commercialStatus: e.target.value as CommercialLeadStatus })} className={fieldInputClass}>
                      {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Prioridade">
                    <select value={currentHotel.priority || 'medium'} onChange={(e) => setCurrentHotel({ ...currentHotel, priority: e.target.value as LeadPriority })} className={fieldInputClass}>
                      {priorityOptions.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Lead score">
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" value={currentHotel.leadScore ?? 0} onChange={(e) => setCurrentHotel({ ...currentHotel, leadScore: Number(e.target.value) })} className={fieldInputClass} />
                      <button
                        type="button"
                        onClick={() => setCurrentHotel({ ...currentHotel, leadScore: computeLeadScore(currentHotel).score })}
                        className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-600/10 px-2.5 py-2 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-600/20"
                        title="Calcular automaticamente"
                      >
                        Auto
                      </button>
                    </div>
                    <span className={`mt-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold ${bandForScore(Number(currentHotel.leadScore || 0)).tone}`}>
                      {bandForScore(Number(currentHotel.leadScore || 0)).label}
                    </span>
                  </Field>
                  <Field label="Vendedor responsavel">
                    <select value={currentHotel.responsibleSellerId || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, responsibleSellerId: e.target.value || undefined })} className={fieldInputClass}>
                      <option value="">Sem vendedor</option>
                      {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Tipo da proxima acao">
                    <select value={currentHotel.nextActionType || 'call'} onChange={(e) => setCurrentHotel({ ...currentHotel, nextActionType: e.target.value as NextActionType })} className={fieldInputClass}>
                      {nextActionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Data da proxima acao">
                    <input type="datetime-local" value={currentHotel.nextActionAt || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, nextActionAt: e.target.value })} className={`${fieldInputClass} font-mono`} />
                  </Field>
                  <Field label="Status callback legado">
                    <select value={currentHotel.callbackStatus || 'pending'} onChange={(e) => setCurrentHotel({ ...currentHotel, callbackStatus: e.target.value as any })} className={fieldInputClass}>
                      <option value="pending">Pendente</option>
                      <option value="completed">Concluido</option>
                      <option value="canceled">Cancelado</option>
                    </select>
                  </Field>
                  <Field label="Bloqueio">
                    <label className="flex h-[38px] items-center gap-2 rounded-lg border border-gray-700 bg-ai-dark px-3 text-xs text-gray-300">
                      <input type="checkbox" checked={!!currentHotel.doNotContact} onChange={(e) => setCurrentHotel({ ...currentHotel, doNotContact: e.target.checked })} />
                      Nao contactar
                    </label>
                  </Field>
                </div>
              </section>

              {closedStatuses.includes((currentHotel.commercialStatus || 'new') as CommercialLeadStatus) && (
                <section className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    <ShieldOff className="h-3.5 w-3.5" />
                    Encerramento obrigatorio
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Motivo">
                      <select value={currentHotel.closeReasonId || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, closeReasonId: e.target.value })} className={fieldInputClass}>
                        <option value="">Escolher motivo</option>
                        {closeReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Notas de encerramento">
                      <input value={currentHotel.closeNotes || ''} onChange={(e) => setCurrentHotel({ ...currentHotel, closeNotes: e.target.value })} className={fieldInputClass} />
                    </Field>
                  </div>
                </section>
              )}

              <section>
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Notas comerciais</h4>
                <textarea
                  rows={5}
                  value={currentHotel.contactNotes || ''}
                  onChange={(e) => setCurrentHotel({ ...currentHotel, contactNotes: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-ai-dark p-3 text-xs leading-relaxed text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Registe o que foi falado, decisor, objecoes, interesse, proximo passo e contexto de follow-up."
                />
              </section>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-gray-700 bg-gray-850 px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-500 disabled:opacity-60">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  {isSaving ? 'A guardar...' : 'Guardar lead'}
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
