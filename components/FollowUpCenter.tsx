import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Play,
  RefreshCw,
  Repeat,
  RotateCcw,
  Sun
} from 'lucide-react';
import { CommercialLeadStatus, CrmActivity, CrmCloseReason, CrmSeller, Lead, NextActionType } from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';
import { FOLLOWUP_SEQUENCES, sequenceByKey } from '../services/salesCatalog';
import { downloadLeadIcs } from '../services/calendar';

interface FollowUpCenterProps {
  onOpenPlay: (lead: Lead) => void;
  restrictSellerId?: string;
}

const closedStatuses: CommercialLeadStatus[] = ['won', 'lost', 'do_not_contact'];
const QUICK_DAYS = [7, 15, 30, 60, 90];

const plusDaysIso = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
};

const formatDate = (iso?: string) => {
  if (!iso) return 'sem data';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'data invalida';
  return d.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const daysDiff = (iso?: string): number | null => {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
};

const digitsOnly = (phone?: string) => (phone || '').replace(/\D/g, '');

const emailHref = (lead: Lead) => {
  const subject = `SOL - coordenacao de housekeeping para ${lead.companyName}`;
  const body = `Ola,\n\nDando seguimento ao nosso contacto, gostava de mostrar como o SOL ajuda a equipa do ${lead.companyName} a coordenar limpezas, inspecoes e manutencao em tempo real.\n\nSao 15 a 20 minutos. Que dia lhe e mais comodo?\n\nObrigado.`;
  return `mailto:${lead.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const whatsappHref = (lead: Lead) => {
  const text = `Ola! Falo da SOL. Gostava de agendar uma apresentacao rapida (15-20 min) sobre a coordenacao de housekeeping e manutencao para o ${lead.companyName}. Que dia lhe e mais comodo?`;
  return `https://wa.me/${digitsOnly(lead.phone)}?text=${encodeURIComponent(text)}`;
};

export default function FollowUpCenter({ onOpenPlay, restrictSellerId }: FollowUpCenterProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [closeReasons, setCloseReasons] = useState<CrmCloseReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerFilter, setSellerFilter] = useState<'all' | string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const base = restrictSellerId ? leads.filter((l) => l.responsibleSellerId === restrictSellerId) : leads;
    return base.filter((l) => sellerFilter === 'all' || l.responsibleSellerId === sellerFilter);
  }, [leads, sellerFilter, restrictSellerId]);

  const buckets = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const upcoming: Lead[] = [];
    const noAction: Lead[] = [];
    const reactivation: Lead[] = [];

    filtered.forEach((lead) => {
      const status = lead.commercialStatus || 'new';
      const reason = closeReasons.find((r) => r.id === lead.closeReasonId);

      // Reativacao: encerrado com motivo de follow-up futuro (sazonal), nunca do_not_contact
      if ((status === 'lost' && reason?.category === 'future_follow_up') ||
          (status === 'lost' && reason?.requiresFollowUp)) {
        reactivation.push(lead);
        return;
      }
      if (closedStatuses.includes(status)) return; // won / lost sem retorno / do_not_contact saem da fila

      if (!lead.nextActionAt) { noAction.push(lead); return; }
      const t = new Date(lead.nextActionAt).getTime();
      if (Number.isNaN(t)) { noAction.push(lead); return; }
      if (lead.nextActionAt.slice(0, 10) === todayStr) today.push(lead);
      else if (t < now) overdue.push(lead);
      else if (t <= now + 7 * 86400000) upcoming.push(lead);
      // mais de 7 dias no futuro: fora da fila imediata
    });

    const byDate = (a: Lead, b: Lead) => (a.nextActionAt || '').localeCompare(b.nextActionAt || '');
    overdue.sort(byDate); today.sort(byDate); upcoming.sort(byDate);
    return { overdue, today, upcoming, noAction, reactivation };
  }, [filtered, closeReasons]);

  const logActivity = async (lead: Lead, outcome: string, nextType: NextActionType, nextAt?: string) => {
    const activity: CrmActivity = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      sellerId: lead.responsibleSellerId,
      activityType: 'note',
      outcome,
      nextActionType: nextType,
      nextActionAt: nextAt,
      createdAt: new Date().toISOString()
    };
    await crmDb.createActivity(activity);
  };

  const reschedule = async (lead: Lead, iso: string) => {
    setBusyId(lead.id);
    try {
      const keepDemo = lead.commercialStatus === 'demo_scheduled';
      await hotelDb.saveHotel({
        ...lead,
        commercialStatus: keepDemo ? 'demo_scheduled' : 'rescheduled',
        nextActionType: keepDemo ? 'demo' : (lead.nextActionType && lead.nextActionType !== 'none' ? lead.nextActionType : 'follow_up'),
        nextActionAt: iso,
        callbackScheduledAt: iso,
        callbackStatus: 'pending',
        lastActivityAt: new Date().toISOString()
      });
      await logActivity(lead, 'Reagendado', keepDemo ? 'demo' : 'follow_up', iso);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const markDone = async (lead: Lead) => {
    setBusyId(lead.id);
    try {
      await hotelDb.saveHotel({
        ...lead,
        nextActionType: 'none',
        nextActionAt: undefined,
        callbackScheduledAt: undefined,
        callbackStatus: 'completed',
        lastActivityAt: new Date().toISOString()
      });
      await logActivity(lead, 'Follow-up concluido', 'none');
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const stepDateIso = (startedAt: string, day: number) => {
    const d = new Date(new Date(startedAt).getTime() + day * 86400000);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  };

  const startSequence = async (lead: Lead, key: string) => {
    const seq = sequenceByKey(key);
    if (!seq) return;
    setBusyId(lead.id);
    try {
      const startedAt = new Date().toISOString();
      const first = seq.steps[0];
      const iso = stepDateIso(startedAt, first.day);
      await hotelDb.saveHotel({
        ...lead,
        followupSequence: { key, startedAt, step: 0 },
        commercialStatus: closedStatuses.includes(lead.commercialStatus || 'new') ? 'follow_up' : lead.commercialStatus,
        nextActionType: first.action,
        nextActionAt: iso,
        callbackScheduledAt: iso,
        callbackStatus: 'pending',
        lastActivityAt: new Date().toISOString()
      });
      await logActivity(lead, `Sequencia iniciada: ${seq.name}`, first.action, iso);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const advanceSequence = async (lead: Lead) => {
    const fs = lead.followupSequence;
    const seq = sequenceByKey(fs?.key);
    if (!fs || !seq) return;
    setBusyId(lead.id);
    try {
      const doneStep = seq.steps[fs.step];
      const nextIdx = fs.step + 1;
      if (nextIdx >= seq.steps.length) {
        await hotelDb.saveHotel({
          ...lead,
          followupSequence: undefined,
          nextActionType: 'none',
          nextActionAt: undefined,
          callbackScheduledAt: undefined,
          callbackStatus: 'completed',
          lastActivityAt: new Date().toISOString()
        });
        await logActivity(lead, `Passo concluido: ${doneStep.label} (sequencia terminada)`, 'none');
      } else {
        const next = seq.steps[nextIdx];
        const iso = stepDateIso(fs.startedAt, next.day);
        await hotelDb.saveHotel({
          ...lead,
          followupSequence: { ...fs, step: nextIdx },
          nextActionType: next.action,
          nextActionAt: iso,
          callbackScheduledAt: iso,
          callbackStatus: 'pending',
          lastActivityAt: new Date().toISOString()
        });
        await logActivity(lead, `Passo concluido: ${doneStep.label}`, next.action, iso);
      }
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const reactivate = async (lead: Lead, days: number) => {
    setBusyId(lead.id);
    try {
      const iso = plusDaysIso(days);
      await hotelDb.saveHotel({
        ...lead,
        commercialStatus: 'follow_up',
        doNotContact: false,
        closeReasonId: undefined,
        closeNotes: undefined,
        nextActionType: 'follow_up',
        nextActionAt: iso,
        callbackScheduledAt: iso,
        callbackStatus: 'pending',
        lastActivityAt: new Date().toISOString()
      });
      await logActivity(lead, 'Lead reativado', 'follow_up', iso);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const Card = ({ lead, mode }: { lead: Lead; mode: 'queue' | 'noAction' | 'reactivation' }) => {
    const overdue = !!lead.nextActionAt && new Date(lead.nextActionAt) < new Date();
    const dd = daysDiff(lead.nextActionAt);
    const busy = busyId === lead.id;
    return (
      <div className={`rounded-lg border bg-ai-card p-3 transition ${busy ? 'opacity-60' : ''} ${overdue && mode === 'queue' ? 'border-rose-500/30' : 'border-gray-800'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-white">{lead.companyName}</h4>
            <div className="mt-0.5 truncate text-[10px] text-gray-500">{lead.location}</div>
          </div>
          <span className="shrink-0 rounded border border-gray-700 bg-gray-900/60 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">
            {lead.responsibleSellerId ? sellerNameById[lead.responsibleSellerId] || 'Vendedor' : 'Sem vendedor'}
          </span>
        </div>

        {mode !== 'noAction' && (
          <div className={`mt-2 flex items-center gap-1.5 text-[11px] ${overdue ? 'text-rose-300' : 'text-gray-400'}`}>
            <CalendarClock className="h-3 w-3" />
            {formatDate(lead.nextActionAt)}
            {dd !== null && <span className="font-bold">• {dd < 0 ? `${Math.abs(dd)}d atrasado` : dd === 0 ? 'hoje' : `em ${dd}d`}</span>}
          </div>
        )}
        {mode === 'noAction' && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300"><AlertTriangle className="h-3 w-3" /> Sem proxima acao definida</div>
        )}

        {/* Acoes */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button onClick={() => onOpenPlay(lead)} className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"><Play className="h-3 w-3" />Play</button>
          {lead.email && <a href={emailHref(lead)} className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-[10px] font-bold text-sky-300 hover:bg-gray-700"><Mail className="h-3 w-3" />Email</a>}
          {lead.phone && <a href={whatsappHref(lead)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-[10px] font-bold text-green-300 hover:bg-gray-700"><MessageCircle className="h-3 w-3" />WhatsApp</a>}
          {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-[10px] font-bold text-gray-300 hover:bg-gray-700"><Phone className="h-3 w-3" />Ligar</a>}
          {mode !== 'noAction' && lead.nextActionAt && (
            <button onClick={() => downloadLeadIcs(lead)} className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-[10px] font-bold text-indigo-300 hover:bg-gray-700" title="Adicionar ao calendario (.ics)"><CalendarPlus className="h-3 w-3" />Calendario</button>
          )}
        </div>

        {/* Reagendar / Reativar */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-gray-600">{mode === 'reactivation' ? 'Reativar em' : 'Adiar'}</span>
          {QUICK_DAYS.map((d) => (
            <button
              key={d}
              disabled={busy}
              onClick={() => mode === 'reactivation' ? reactivate(lead, d) : reschedule(lead, plusDaysIso(d))}
              className="rounded border border-gray-700 bg-ai-dark px-1.5 py-0.5 text-[9px] font-bold text-gray-400 hover:text-emerald-300 disabled:opacity-50"
            >
              +{d}d
            </button>
          ))}
          {mode !== 'reactivation' && (
            <button disabled={busy} onClick={() => markDone(lead)} className="ml-1 flex items-center gap-1 rounded border border-gray-700 bg-ai-dark px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-50">
              <CheckCircle className="h-2.5 w-2.5" />Concluir
            </button>
          )}
        </div>

        {/* Sequencia de follow-up (M39) */}
        {mode !== 'reactivation' && (() => {
          const fs = lead.followupSequence;
          const seq = sequenceByKey(fs?.key);
          if (fs && seq) {
            const step = seq.steps[fs.step];
            return (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded border border-indigo-500/20 bg-indigo-500/[0.06] px-2 py-1.5">
                <Repeat className="h-3 w-3 text-indigo-300" />
                <span className="text-[9px] font-bold text-indigo-200">{seq.name} · passo {fs.step + 1}/{seq.steps.length}: {step?.label}</span>
                <button disabled={busy} onClick={() => advanceSequence(lead)} className="ml-auto rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-indigo-500 disabled:opacity-50">Concluir passo</button>
              </div>
            );
          }
          return (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-gray-600">Sequencia</span>
              {FOLLOWUP_SEQUENCES.map((s) => (
                <button key={s.key} disabled={busy} onClick={() => startSequence(lead, s.key)} className="flex items-center gap-1 rounded border border-gray-700 bg-ai-dark px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 hover:bg-indigo-600/10 disabled:opacity-50">
                  <Repeat className="h-2.5 w-2.5" />{s.name}
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    );
  };

  const Column = ({ title, icon: Icon, tone, items, mode, empty }: { title: string; icon: any; tone: string; items: Lead[]; mode: 'queue' | 'noAction' | 'reactivation'; empty: string }) => (
    <div className="flex flex-col rounded-lg border border-gray-800 bg-ai-dark/40">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${tone}`}><Icon className="h-3.5 w-3.5" />{title}</span>
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">{items.length}</span>
      </div>
      <div className="space-y-2 overflow-y-auto p-2" style={{ maxHeight: '64vh' }}>
        {items.length === 0 ? <p className="py-6 text-center text-[10px] text-gray-600">{empty}</p> : items.map((lead) => <React.Fragment key={lead.id}><Card lead={lead} mode={mode} /></React.Fragment>)}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-ai-card p-16 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-gray-400">A carregar follow-ups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><RotateCcw className="h-5 w-5 text-emerald-500" /> Follow-up e Reagendamentos</h2>
          <p className="mt-1 text-xs text-gray-400">Retornos por urgencia. Atrasados no topo, reativacao de leads sazonais a direita.</p>
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

      {buckets.overdue.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          <AlertTriangle className="h-4 w-4" />
          <span><span className="font-bold">{buckets.overdue.length}</span> follow-up(s) vencido(s) precisam de atencao imediata.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <Column title="Atrasados" icon={AlertTriangle} tone="text-rose-300" items={buckets.overdue} mode="queue" empty="Sem atrasos. Bom trabalho!" />
        <Column title="Hoje" icon={CalendarClock} tone="text-emerald-300" items={buckets.today} mode="queue" empty="Nada agendado para hoje." />
        <Column title="Proximos 7 dias" icon={Clock} tone="text-sky-300" items={buckets.upcoming} mode="queue" empty="Sem retornos proximos." />
        <Column title="Sem proxima acao" icon={AlertTriangle} tone="text-amber-300" items={buckets.noAction} mode="noAction" empty="Todos os leads tem proxima acao." />
        <Column title="Reativacao sazonal" icon={Sun} tone="text-orange-300" items={buckets.reactivation} mode="reactivation" empty="Sem leads para reativar." />
      </div>
    </div>
  );
}
