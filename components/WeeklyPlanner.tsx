import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Play,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { CommercialLeadStatus, CrmScheduleSlot, CrmSeller, Lead } from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';

interface WeeklyPlannerProps {
  onOpenPlay: (lead: Lead) => void;
  restrictSellerId?: string;
}

const DAY_LABELS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'];
const closedStatuses: CommercialLeadStatus[] = ['won', 'lost', 'do_not_contact'];
const DAILY_LIMIT = 12; // ~12 hoteis por manha em blocos de 20 min

// Blocos de 20 min entre 09:00 e 13:00 (manha para chamadas)
const TIME_SLOTS: string[] = [];
for (let h = 9; h < 13; h++) {
  for (let m = 0; m < 60; m += 20) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const startOfWeek = (base: Date): Date => {
  const d = new Date(base);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // segunda-feira
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const slotIso = (weekStart: Date, dayIndex: number, time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const priorityRank = (lead: Lead): number => {
  const today = new Date().toISOString().slice(0, 10);
  if (lead.nextActionType === 'demo' && lead.nextActionAt?.slice(0, 10) === today) return 0;
  if (lead.commercialStatus === 'rescheduled') return 1;
  if (lead.nextActionAt && new Date(lead.nextActionAt) < new Date()) return 2; // atrasado
  if (lead.priority === 'high' || lead.potential === 'Hot') return 3;
  if (lead.commercialStatus === 'decision_maker_identified') return 4;
  if ((lead.leadScore || 0) >= 60) return 5;
  return 6;
};

export default function WeeklyPlanner({ onOpenPlay, restrictSellerId }: WeeklyPlannerProps) {
  const [sellers, setSellers] = useState<CrmSeller[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [slots, setSlots] = useState<CrmScheduleSlot[]>([]);
  const [sellerId, setSellerId] = useState<string>('');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);
  const [draggingKind, setDraggingKind] = useState<'lead' | 'slot' | null>(null);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 5);
    return d;
  }, [weekStart]);

  const loadBase = async () => {
    const [sellerRows, leadRows] = await Promise.all([crmDb.getSellers(), hotelDb.getAllHotels()]);
    setSellers(sellerRows);
    setLeads(leadRows);
    if (restrictSellerId) setSellerId(restrictSellerId);
    else if (!sellerId && sellerRows.length) setSellerId(sellerRows[0].id);
  };

  const loadSlots = async () => {
    if (!sellerId) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await crmDb.getScheduleSlots(sellerId, weekStart.toISOString(), weekEnd.toISOString());
      // Ignora slots cancelados/perdidos para nao bloquearem celulas (slots fantasma)
      setSlots(rows.filter((s) => s.status !== 'canceled' && s.status !== 'missed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { if (restrictSellerId) setSellerId(restrictSellerId); }, [restrictSellerId]);
  useEffect(() => { loadSlots(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId, weekStart]);

  const leadById = useMemo(() => {
    return leads.reduce<Record<string, Lead>>((acc, lead) => { acc[lead.id] = lead; return acc; }, {});
  }, [leads]);

  const scheduledLeadIds = useMemo(() => new Set(slots.map((s) => s.leadId).filter(Boolean) as string[]), [slots]);

  // Fila de prioridade: leads ativos do vendedor ainda nao agendados
  const queue = useMemo(() => {
    return leads
      .filter((lead) => !closedStatuses.includes(lead.commercialStatus || 'new'))
      .filter((lead) => !sellerId || !lead.responsibleSellerId || lead.responsibleSellerId === sellerId)
      .filter((lead) => !scheduledLeadIds.has(lead.id))
      .sort((a, b) => priorityRank(a) - priorityRank(b) || (b.leadScore || 0) - (a.leadScore || 0));
  }, [leads, sellerId, scheduledLeadIds]);

  // Indexa por timestamp (epoch ms) para ser robusto a diferencas de formato
  // entre o ISO gravado localmente e a timestamptz devolvida pelo Supabase.
  const slotByKey = useMemo(() => {
    const map: Record<number, CrmScheduleSlot> = {};
    slots.forEach((s) => {
      const t = new Date(s.slotStart).getTime();
      if (!Number.isNaN(t)) map[t] = s;
    });
    return map;
  }, [slots]);

  const slotAt = (iso: string): CrmScheduleSlot | undefined => slotByKey[new Date(iso).getTime()];

  const dayLoad = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    slots.forEach((s) => {
      const idx = Math.floor((new Date(s.slotStart).getTime() - weekStart.getTime()) / 86400000);
      if (idx >= 0 && idx < 5) counts[idx]++;
    });
    return counts;
  }, [slots, weekStart]);

  const scheduleLeadAt = async (leadId: string, iso: string) => {
    if (!sellerId) {
      alert('Selecione um vendedor.');
      return;
    }
    if (slotAt(iso)) return; // celula ocupada
    const end = new Date(new Date(iso).getTime() + 20 * 60000).toISOString();
    const lead = leadById[leadId];
    const slot: CrmScheduleSlot = {
      id: crypto.randomUUID(),
      sellerId,
      leadId,
      slotStart: iso,
      slotEnd: end,
      slotType: lead?.nextActionType === 'demo' ? 'demo' : 'call',
      status: 'scheduled'
    };
    await crmDb.saveScheduleSlot(slot);
    // marca o lead como agendado para contacto
    if (lead && lead.commercialStatus !== 'demo_scheduled') {
      await hotelDb.saveHotel({ ...lead, commercialStatus: 'scheduled_contact', nextActionAt: iso, lastActivityAt: new Date().toISOString() });
    }
    setSelectedLeadId(null);
    await Promise.all([loadSlots(), loadBase()]);
  };

  const moveSlotTo = async (slot: CrmScheduleSlot, iso: string) => {
    if (new Date(slot.slotStart).getTime() === new Date(iso).getTime() || slotAt(iso)) return; // mesmo bloco ou ocupado
    const end = new Date(new Date(iso).getTime() + 20 * 60000).toISOString();
    await crmDb.saveScheduleSlot({ ...slot, slotStart: iso, slotEnd: end });
    const lead = slot.leadId ? leadById[slot.leadId] : undefined;
    if (lead) {
      await hotelDb.saveHotel({ ...lead, nextActionAt: iso, lastActivityAt: new Date().toISOString() });
    }
    await Promise.all([loadSlots(), loadBase()]);
  };

  const handleCellClick = async (dayIndex: number, time: string) => {
    const iso = slotIso(weekStart, dayIndex, time);
    if (slotAt(iso)) return;
    if (!selectedLeadId) {
      alert('Selecione um lead na fila ou arraste-o para um bloco livre.');
      return;
    }
    await scheduleLeadAt(selectedLeadId, iso);
  };

  const handleDropOnCell = async (dayIndex: number, time: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIso(null);
    setDraggingKind(null);
    const iso = slotIso(weekStart, dayIndex, time);
    if (slotAt(iso)) return;
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { kind: 'lead' | 'slot'; id: string };
      if (payload.kind === 'lead') {
        await scheduleLeadAt(payload.id, iso);
      } else if (payload.kind === 'slot') {
        const slot = slots.find((s) => s.id === payload.id);
        if (slot) await moveSlotTo(slot, iso);
      }
    } catch {
      // payload invalido, ignora
    }
  };

  const handleRemoveSlot = async (slot: CrmScheduleSlot) => {
    await crmDb.deleteScheduleSlot(slot.id);
    await loadSlots();
  };

  const handlePlaySlot = (slot: CrmScheduleSlot) => {
    const lead = slot.leadId ? leadById[slot.leadId] : undefined;
    if (lead) onOpenPlay(lead);
  };

  const isRescheduled = (lead?: Lead) => lead?.commercialStatus === 'rescheduled';
  const isHot = (lead?: Lead) => lead?.priority === 'high' || lead?.potential === 'Hot';

  const weekLabel = `${weekStart.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - ${new Date(weekStart.getTime() + 4 * 86400000).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <CalendarClock className="h-5 w-5 text-emerald-500" /> Planeador Comercial Semanal
          </h2>
          <p className="mt-1 text-xs text-gray-400">Blocos de 20 minutos para chamadas. Reagendados e atrasados aparecem no topo da fila.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!restrictSellerId && (
            <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none">
              {sellers.length === 0 && <option value="">Sem vendedores</option>}
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-ai-dark p-0.5">
            <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))} className="rounded-md p-1.5 text-gray-400 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2 text-[11px] font-bold text-white">{weekLabel}</span>
            <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))} className="rounded-md p-1.5 text-gray-400 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-[11px] font-bold text-gray-300 hover:bg-gray-700">Hoje</button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* FILA DE PRIORIDADE */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
          <div className="border-b border-gray-800 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Fila de prioridade</h3>
            <p className="mt-0.5 text-[10px] text-gray-500">Arraste um lead para um bloco livre, ou clique e depois clique no bloco.</p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: '60vh' }}>
            {queue.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-gray-500">Sem leads por agendar.</p>
            ) : (
              queue.slice(0, 40).map((lead) => {
                const selected = selectedLeadId === lead.id;
                return (
                  <button
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'lead', id: lead.id }));
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingKind('lead');
                    }}
                    onDragEnd={() => { setDraggingKind(null); setDragOverIso(null); }}
                    onClick={() => setSelectedLeadId(selected ? null : lead.id)}
                    className={`w-full cursor-grab rounded-lg border p-2.5 text-left transition active:cursor-grabbing ${selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-800 bg-ai-dark hover:border-emerald-500/40'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-white">{lead.companyName}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {isRescheduled(lead) && <Zap className="h-3 w-3 text-amber-400" />}
                        {isHot(lead) && <Flame className="h-3 w-3 text-rose-400" />}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                      <span className="truncate">{lead.location}</span>
                      <span className="font-bold text-gray-400">Score {lead.leadScore || 0}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* GRELHA SEMANAL */}
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
          {loading ? (
            <div className="p-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-800 bg-ai-dark">
                    <th className="w-16 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Hora</th>
                    {DAY_LABELS.map((day, idx) => (
                      <th key={day} className="px-2 py-2 text-center">
                        <div className="text-[11px] font-bold text-white">{day}</div>
                        <div className={`mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold ${dayLoad[idx] > DAILY_LIMIT ? 'text-rose-400' : 'text-gray-500'}`}>
                          {dayLoad[idx] > DAILY_LIMIT && <AlertTriangle className="h-2.5 w-2.5" />}
                          {dayLoad[idx]}/{DAILY_LIMIT}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time} className="border-b border-gray-800/60">
                      <td className="px-2 py-1 text-[10px] font-mono font-bold text-gray-500">{time}</td>
                      {DAY_LABELS.map((_, dayIndex) => {
                        const iso = slotIso(weekStart, dayIndex, time);
                        const slot = slotAt(iso);
                        const lead = slot?.leadId ? leadById[slot.leadId] : undefined;
                        if (slot && lead) {
                          const demo = slot.slotType === 'demo';
                          return (
                            <td key={dayIndex} className="p-1">
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'slot', id: slot.id }));
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggingKind('slot');
                                }}
                                onDragEnd={() => { setDraggingKind(null); setDragOverIso(null); }}
                                className={`group relative cursor-grab rounded-md border p-1.5 active:cursor-grabbing ${demo ? 'border-orange-500/40 bg-orange-500/10' : isRescheduled(lead) ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}
                              >
                                <div className="truncate text-[10px] font-bold text-white">{lead.companyName}</div>
                                <div className="truncate text-[9px] text-gray-400">{demo ? 'Demo' : 'Chamada'}</div>
                                <div className="mt-1 flex items-center gap-1">
                                  <button onClick={() => handlePlaySlot(slot)} className="flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-emerald-500"><Play className="h-2.5 w-2.5" />Play</button>
                                  <button onClick={() => handleRemoveSlot(slot)} className="rounded bg-gray-800 p-0.5 text-rose-300 hover:bg-rose-600 hover:text-white"><Trash2 className="h-2.5 w-2.5" /></button>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        const isDropTarget = dragOverIso === iso;
                        return (
                          <td key={dayIndex} className="p-1">
                            <button
                              onClick={() => handleCellClick(dayIndex, time)}
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                              onDragEnter={() => setDragOverIso(iso)}
                              onDragLeave={() => setDragOverIso((prev) => (prev === iso ? null : prev))}
                              onDrop={(e) => handleDropOnCell(dayIndex, time, e)}
                              className={`h-12 w-full rounded-md border border-dashed text-[10px] transition ${isDropTarget ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : draggingKind ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' : selectedLeadId ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' : 'border-gray-800 text-gray-700 hover:border-gray-700'}`}
                            >
                              {isDropTarget ? 'largar aqui' : (draggingKind || selectedLeadId) ? '+ colocar' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedLeadId && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-200">
          <span>Lead selecionado: <span className="font-bold">{leadById[selectedLeadId]?.companyName}</span> — clique num bloco livre para agendar.</span>
          <button onClick={() => setSelectedLeadId(null)} className="ml-auto text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
