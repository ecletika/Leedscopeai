import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  ShieldOff,
  Sparkles,
  Star,
  User as UserIcon,
  X
} from 'lucide-react';
import {
  CommercialLeadStatus,
  CrmActivity,
  CrmCloseReason,
  CrmContact,
  CrmContactType,
  CrmMaterial,
  CrmObjection,
  CrmScript,
  CrmSeller,
  Lead,
  NextActionType
} from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';
import { analyzeCallNotes } from '../services/geminiService';
import { computeLeadScore } from '../services/leadScoring';

interface PlayModeProps {
  lead: Lead;
  sellers: CrmSeller[];
  closeReasons: CrmCloseReason[];
  onClose: () => void;
  onSaved: () => void;
}

const contactTypeOptions: { value: CrmContactType; label: string }[] = [
  { value: 'reception', label: 'Recepcao' },
  { value: 'manager', label: 'Gerente' },
  { value: 'general_manager', label: 'Diretor geral' },
  { value: 'housekeeper', label: 'Governanta' },
  { value: 'maintenance', label: 'Manutencao' },
  { value: 'purchasing', label: 'Compras' },
  { value: 'other', label: 'Outro' }
];

const nextActionOptions: { value: NextActionType; label: string }[] = [
  { value: 'call', label: 'Ligar de novo' },
  { value: 'demo', label: 'Demo' },
  { value: 'email', label: 'Enviar email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'none', label: 'Sem proxima acao' }
];

// Mini apresentacao do SOL (M28)
const presentationCards: { title: string; benefit: string }[] = [
  { title: 'Mapa de quartos em tempo real', benefit: 'Recepcao e governanta veem quais quartos estao sujos, em limpeza, inspecionados ou prontos.' },
  { title: 'Tarefas de housekeeping', benefit: 'Distribuicao automatica de quartos por camareira, com prioridades e estado ao vivo.' },
  { title: 'Checklist de limpeza', benefit: 'Padronizacao da limpeza e inspecao, sem depender de memoria ou papel.' },
  { title: 'Tickets de manutencao', benefit: 'Pedidos de reparacao criados na hora, com foto, responsavel e historico.' },
  { title: 'Dashboard da governanta', benefit: 'Visao geral de carga, atrasos e produtividade da equipa.' },
  { title: 'App mobile multilingue', benefit: 'Staff de chao usa no telemovel, em varios idiomas, sem formacao complexa.' }
];

// Banco de objeccoes (M28)
const objectionBank: { objection: string; response: string }[] = [
  { objection: 'Ja usamos WhatsApp', response: 'O WhatsApp ajuda no inicio, mas nao cria historico, auditoria, prioridades nem relatorios. O SOL organiza a operacao sem complicar a equipa.' },
  { objection: 'Nao temos orcamento', response: 'A ideia do SOL e ser acessivel para hoteis pequenos e medios, evitando ferramentas enterprise caras.' },
  { objection: 'A equipa nao usa tecnologia', response: 'O SOL foi pensado para equipas operacionais: interface simples, mobile-first e multilingue para staff de chao.' },
  { objection: 'Ja temos um sistema', response: 'Perfeito. A conversa pode ser para perceber se o sistema atual cobre housekeeping, manutencao, auditoria e comunicacao em tempo real.' },
  { objection: 'Estamos sem tempo agora', response: 'Sem problema. Sao apenas 15 a 20 minutos para mostrar na pratica. Prefere amanha de manha ou ao final do dia?' }
];

const statusButtons: {
  label: string;
  status: CommercialLeadStatus;
  nextAction: NextActionType;
  tone: string;
  needsReschedule?: boolean;
  needsCloseReason?: boolean;
}[] = [
  { label: 'Agendar demo', status: 'demo_scheduled', nextAction: 'demo', tone: 'bg-orange-600 hover:bg-orange-500', needsReschedule: true },
  { label: 'Decisor identificado', status: 'decision_maker_identified', nextAction: 'call', tone: 'bg-fuchsia-600 hover:bg-fuchsia-500' },
  { label: 'Reagendar contacto', status: 'rescheduled', nextAction: 'call', tone: 'bg-amber-600 hover:bg-amber-500', needsReschedule: true },
  { label: 'Enviar email', status: 'follow_up', nextAction: 'email', tone: 'bg-sky-600 hover:bg-sky-500' },
  { label: 'Pediu ligar depois', status: 'rescheduled', nextAction: 'call', tone: 'bg-yellow-600 hover:bg-yellow-500', needsReschedule: true },
  { label: 'Contactado recepcao', status: 'contacted_reception', nextAction: 'call', tone: 'bg-violet-600 hover:bg-violet-500' },
  { label: 'Sem resposta', status: 'scheduled_contact', nextAction: 'call', tone: 'bg-slate-600 hover:bg-slate-500', needsReschedule: true },
  { label: 'Nao tem interesse', status: 'lost', nextAction: 'none', tone: 'bg-rose-700 hover:bg-rose-600', needsCloseReason: true },
  { label: 'Nao contactar mais', status: 'do_not_contact', nextAction: 'none', tone: 'bg-red-800 hover:bg-red-700', needsCloseReason: true }
];

const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none shadow-sm';

const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function PlayMode({ lead, sellers, closeReasons, onClose, onSaved }: PlayModeProps) {
  const seller = useMemo(
    () => sellers.find((s) => s.id === lead.responsibleSellerId),
    [sellers, lead.responsibleSellerId]
  );
  const sellerName = seller?.name || 'a equipa SOL';

  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Conteudo comercial configuravel (M28)
  const [dbScripts, setDbScripts] = useState<CrmScript[]>([]);
  const [dbObjections, setDbObjections] = useState<CrmObjection[]>([]);
  const [dbMaterials, setDbMaterials] = useState<CrmMaterial[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');

  // Resultado da chamada
  const [interest, setInterest] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');
  const [answeredBy, setAnsweredBy] = useState('');
  const [answeredRole, setAnsweredRole] = useState('');
  const [decisionName, setDecisionName] = useState(lead.contactPerson || '');
  const [decisionPhone, setDecisionPhone] = useState('');
  const [decisionEmail, setDecisionEmail] = useState('');
  const [nextActionType, setNextActionType] = useState<NextActionType>(lead.nextActionType || 'call');
  const [nextActionAt, setNextActionAt] = useState<string>(plusDays(1));
  const [closeReasonId, setCloseReasonId] = useState('');
  const [pendingStatus, setPendingStatus] = useState<CommercialLeadStatus>(lead.commercialStatus || 'in_contact');
  const [selectedObjections, setSelectedObjections] = useState<string[]>([]);
  const [openObjection, setOpenObjection] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Novo contacto
  const [newContactType, setNewContactType] = useState<CrmContactType>('manager');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const closedStatuses: CommercialLeadStatus[] = ['lost', 'do_not_contact'];
  const needsCloseReason = closedStatuses.includes(pendingStatus);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactRows, activityRows, scriptRows, objectionRows, materialRows] = await Promise.all([
        crmDb.getContactsByLead(lead.id),
        crmDb.getActivitiesByLead(lead.id),
        crmDb.getScripts(),
        crmDb.getObjections(),
        crmDb.getMaterials()
      ]);
      setContacts(contactRows);
      setActivities(activityRows);
      setDbScripts(scriptRows.filter((s) => s.active));
      setDbObjections(objectionRows.filter((o) => o.active));
      setDbMaterials(materialRows.filter((m) => m.active));
    } finally {
      setLoading(false);
    }
  };

  const materials: { title: string; benefit: string; url?: string }[] = dbMaterials.length
    ? dbMaterials.map((m) => ({ title: m.title, benefit: m.description || '', url: m.url }))
    : presentationCards.map((c) => ({ ...c, url: undefined }));
  const objections = dbObjections.length
    ? dbObjections.map((o) => ({ objection: o.objection, response: o.suggestedResponse, full: o.fullResponse, question: o.followUpQuestion, material: o.recommendedMaterial, next: o.nextAction }))
    : objectionBank.map((o) => ({ objection: o.objection, response: o.response, full: undefined as string | undefined, question: undefined as string | undefined, material: undefined as string | undefined, next: undefined as string | undefined }));
  const selectedScript = dbScripts.find((s) => s.id === selectedScriptId);

  useEffect(() => {
    loadData();
    // garante que o lead fica em contacto ao abrir o Play
    if (lead.commercialStatus !== 'in_contact') {
      hotelDb.saveHotel({ ...lead, commercialStatus: 'in_contact', lastActivityAt: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const handleAddContact = async () => {
    if (!newContactName.trim() && !newContactPhone.trim()) return;
    const contact: CrmContact = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      name: newContactName.trim() || undefined,
      contactType: newContactType,
      phone: newContactPhone.trim() || undefined,
      status: 'contacted',
      isPrimaryDecisionMaker: false
    };
    await crmDb.saveContact(contact);
    setNewContactName('');
    setNewContactPhone('');
    await loadData();
  };

  const handleMarkDecisionMaker = async (contact: CrmContact) => {
    await crmDb.saveContact({ ...contact, isPrimaryDecisionMaker: true, status: 'decision_maker' });
    await loadData();
  };

  const applyQuickStatus = (button: (typeof statusButtons)[number]) => {
    setPendingStatus(button.status);
    setNextActionType(button.nextAction);
    if (button.needsReschedule && (!nextActionAt || nextActionType === 'none')) {
      setNextActionAt(plusDays(button.status === 'demo_scheduled' ? 1 : 2));
    }
  };

  const handleGenerateSummary = async () => {
    setAiLoading(true);
    try {
      const analysis = await analyzeCallNotes(lead, notes);
      setAiSummary(analysis.executiveSummary || analysis.summary);

      // Aplica sugestoes (o vendedor pode editar tudo depois)
      if (analysis.interestLevel) setInterest(analysis.interestLevel);
      const dm = analysis.decisionMaker || {};
      if (dm.name && !decisionName.trim()) setDecisionName(dm.name);
      if (dm.role && !answeredRole.trim()) setAnsweredRole(dm.role);
      if (dm.phone && !decisionPhone.trim()) setDecisionPhone(dm.phone);
      if (dm.email && !decisionEmail.trim()) setDecisionEmail(dm.email);
      if (analysis.objections?.length) {
        setSelectedObjections((prev) => Array.from(new Set([...prev, ...analysis.objections!])));
      }
      if (analysis.nextActionType && analysis.nextActionType !== 'none') setNextActionType(analysis.nextActionType);
      if (typeof analysis.nextActionDays === 'number' && analysis.nextActionDays > 0) setNextActionAt(plusDays(analysis.nextActionDays));
      if (typeof analysis.suggestedScore === 'number') setAiScore(analysis.suggestedScore);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAutoScore = () => {
    const result = computeLeadScore({
      ...lead,
      contactPerson: decisionName.trim() || lead.contactPerson,
      commercialStatus: pendingStatus
    });
    setAiScore(result.score);
  };

  const handleFinish = async () => {
    if (needsCloseReason && !closeReasonId) {
      alert('Escolha um motivo de encerramento antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      const reason = closeReasons.find((r) => r.id === closeReasonId);
      const finalNextAt = pendingStatus === 'do_not_contact' || pendingStatus === 'lost'
        ? undefined
        : (nextActionAt ? new Date(nextActionAt).toISOString() : undefined);

      // 1) Atualiza o lead
      const updatedLead: Lead = {
        ...lead,
        commercialStatus: pendingStatus,
        leadScore: aiScore ?? lead.leadScore,
        contactPerson: decisionName.trim() || lead.contactPerson,
        nextActionType: finalNextAt ? nextActionType : 'none',
        nextActionAt: finalNextAt,
        callbackScheduledAt: finalNextAt,
        callbackStatus: finalNextAt ? 'pending' : 'completed',
        closeReasonId: needsCloseReason ? closeReasonId : undefined,
        closeNotes: needsCloseReason ? (reason?.name || '') : lead.closeNotes,
        doNotContact: pendingStatus === 'do_not_contact',
        contactNotes: notes.trim() || lead.contactNotes,
        lastActivityAt: new Date().toISOString()
      };
      await hotelDb.saveHotel(updatedLead);

      // 2) Regista a atividade
      const activity: CrmActivity = {
        id: crypto.randomUUID(),
        leadId: lead.id,
        sellerId: lead.responsibleSellerId,
        activityType: 'call',
        outcome: statusButtons.find((b) => b.status === pendingStatus)?.label || pendingStatus,
        notes: notes.trim() || undefined,
        objections: selectedObjections.length ? selectedObjections : undefined,
        interestLevel: interest,
        nextActionType: finalNextAt ? nextActionType : 'none',
        nextActionAt: finalNextAt,
        createdAt: new Date().toISOString()
      };
      await crmDb.createActivity(activity);

      // 3) Guarda decisor como contacto, se preenchido
      if (decisionName.trim()) {
        await crmDb.saveContact({
          id: crypto.randomUUID(),
          leadId: lead.id,
          name: decisionName.trim(),
          role: answeredRole || undefined,
          contactType: 'manager',
          phone: decisionPhone.trim() || undefined,
          email: decisionEmail.trim() || undefined,
          status: 'decision_maker',
          isPrimaryDecisionMaker: true
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erro ao concluir Play:', err);
      alert('Nao foi possivel guardar o resultado da chamada.');
    } finally {
      setSaving(false);
    }
  };

  const interestTones: Record<string, string> = {
    low: 'bg-rose-100 text-rose-700 border-rose-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    high: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50">
      {/* TOPO - hotel + contactos em strip compacto */}
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-bold text-gray-900">{lead.companyName}</h2>
                <span className="rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">MODO PLAY</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.location}</span>
                {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 font-mono text-emerald-600 hover:underline"><Phone className="h-3 w-3" />{lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-gray-600 hover:underline"><Mail className="h-3 w-3" />{lead.email}</a>}
                {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline"><Globe className="h-3 w-3" />Website</a>}
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{sellerName}</span>
                <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 hover:text-emerald-600">
                  <ClipboardList className="h-3 w-3" />{activities.length} contacto(s) anteriores
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50">
            <X className="h-4 w-4" /> Sair
          </button>
        </div>

        {/* Strip de contactos compacto */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Contactos:</span>
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
          ) : contacts.length === 0 ? (
            <span className="text-[11px] text-gray-400 italic">Sem contactos ainda — identifique durante a chamada</span>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${c.isPrimaryDecisionMaker ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-100 text-gray-700'}`}>
                {c.isPrimaryDecisionMaker && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                <span>{c.name || contactTypeOptions.find((o) => o.value === c.contactType)?.label}</span>
                {c.phone && <span className="font-mono text-emerald-600">{c.phone}</span>}
                {!c.isPrimaryDecisionMaker && (
                  <button onClick={() => handleMarkDecisionMaker(c)} title="Marcar como decisor" className="ml-0.5 text-gray-400 hover:text-amber-500">
                    <Star className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))
          )}
          {/* Adicionar contacto inline */}
          <div className="ml-auto flex items-center gap-1.5">
            <select value={newContactType} onChange={(e) => setNewContactType(e.target.value as CrmContactType)} className="rounded border border-gray-300 bg-white px-1.5 py-1 text-[11px] text-gray-700 shadow-sm focus:border-emerald-500 focus:outline-none">
              {contactTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Nome" className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none" />
            <input value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder="Telefone" className="w-28 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[11px] text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none" />
            <button onClick={handleAddContact} className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden p-4">
        {/* ESQUERDA — Guião + Resultado da chamada */}
        <section className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {/* Guião */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <MessageSquare className="h-3.5 w-3.5" /> Guiao de chamada
              </h3>
              {dbScripts.length > 0 && (
                <select value={selectedScriptId} onChange={(e) => setSelectedScriptId(e.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] text-gray-700 shadow-sm focus:border-emerald-500 focus:outline-none">
                  <option value="">Guiao padrao</option>
                  {dbScripts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
            {selectedScript ? (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800">
                {selectedScript.content.replace(/\[NOME\]/g, sellerName)}
              </div>
            ) : (
              <div className="space-y-2 text-[13px] leading-relaxed text-gray-700">
                <p>Ola, bom dia. O meu nome e <span className="font-bold text-gray-900">{sellerName}</span> e falo da <span className="font-bold text-emerald-700">SOL</span>.</p>
                <p>Estamos a contactar alguns hoteis independentes porque desenvolvemos uma plataforma simples para ajudar equipas de housekeeping, recepcao e manutencao a coordenarem melhor quartos, limpezas, inspecoes e pedidos internos.</p>
                <p>Normalmente falamos com o gerente ou com a governanta, porque o sistema ajuda a resolver problemas como quartos prontos tarde, comunicacao por WhatsApp e falta de visibilidade sobre limpezas e manutencao.</p>
                <p>A ideia nao e tomar muito tempo agora. Gostava de perceber se faz sentido marcar uma apresentacao rapida de 15 a 20 minutos para mostrar como funciona na pratica.</p>
                <p className="font-semibold text-emerald-700">Com quem seria melhor falar sobre este tema: o gerente, a governanta ou outra pessoa responsavel pelas operacoes?</p>
              </div>
            )}
          </div>

          {/* Resultado da chamada */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Resultado da chamada</h3>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500">Interesse:</span>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setInterest(level)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${interest === level ? interestTones[level] : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'}`}
                >
                  {level === 'low' ? 'Baixo' : level === 'medium' ? 'Medio' : 'Alto'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Quem atendeu</span>
                <input value={answeredBy} onChange={(e) => setAnsweredBy(e.target.value)} className={fieldClass} placeholder="Nome" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Cargo</span>
                <input value={answeredRole} onChange={(e) => setAnsweredRole(e.target.value)} className={fieldClass} placeholder="Recepcao, gerente..." />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Decisor identificado</span>
                <input value={decisionName} onChange={(e) => setDecisionName(e.target.value)} className={fieldClass} placeholder="Nome do decisor" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Telefone direto</span>
                <input value={decisionPhone} onChange={(e) => setDecisionPhone(e.target.value)} className={`${fieldClass} font-mono`} />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Email direto</span>
                <input value={decisionEmail} onChange={(e) => setDecisionEmail(e.target.value)} className={fieldClass} />
              </label>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notas da chamada</span>
                <div className="flex items-center gap-3">
                  <button onClick={handleAutoScore} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-500">
                    <Star className="h-3 w-3" /> Score auto
                  </button>
                  <button onClick={handleGenerateSummary} disabled={aiLoading} className="flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:text-purple-500 disabled:opacity-50">
                    {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Analisar IA
                  </button>
                </div>
              </div>
              <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-3 text-xs leading-relaxed text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none" placeholder="O que foi falado, objeccoes, interesse, proximo passo..." />
              {(aiSummary || aiScore !== null) && (
                <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-[11px] text-purple-800">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-bold text-purple-700"><Bot className="h-3 w-3" /> Assistente comercial</span>
                    {aiScore !== null && (
                      <span className="flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Star className="h-2.5 w-2.5" /> Score {aiScore}
                      </span>
                    )}
                  </div>
                  {aiSummary && <p className="whitespace-pre-wrap leading-relaxed">{aiSummary}</p>}
                </div>
              )}
            </div>

            {/* Proxima acao */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Proxima acao</span>
                <select value={nextActionType} onChange={(e) => setNextActionType(e.target.value as NextActionType)} className={fieldClass}>
                  {nextActionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Data / hora</span>
                <input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} className={`${fieldClass} font-mono`} disabled={needsCloseReason} />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: '+7 dias', days: 7 },
                { label: '+15 dias', days: 15 },
                { label: '+30 dias', days: 30 },
                { label: '+60 dias', days: 60 },
                { label: '+90 dias', days: 90 }
              ].map((q) => (
                <button key={q.days} onClick={() => setNextActionAt(plusDays(q.days))} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600">{q.label}</button>
              ))}
            </div>

            {needsCloseReason && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600"><ShieldOff className="h-3 w-3" /> Motivo de encerramento *</span>
                <select value={closeReasonId} onChange={(e) => setCloseReasonId(e.target.value)} className={fieldClass}>
                  <option value="">Escolher motivo</option>
                  {closeReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* CENTRO — Mini apresentacao SOL em destaque */}
        <section className="flex w-[38%] shrink-0 flex-col overflow-y-auto">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> O que o SOL resolve
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {materials.map((card) => (
                <div key={card.title} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                  {card.url && (
                    <img src={card.url} alt={card.title} className="aspect-video w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-3">
                    <div className="text-xs font-bold text-emerald-700">{card.title}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{card.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CANTO DIREITO — Banco de objeccoes */}
        <aside className="flex w-56 shrink-0 flex-col overflow-y-auto">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              <AlertTriangle className="h-3 w-3" /> Banco de objeccoes
            </h3>
            <div className="space-y-1.5">
              {objections.map((item, idx) => {
                const active = selectedObjections.includes(item.objection);
                return (
                  <div key={item.objection} className={`rounded-lg border p-2 transition ${active ? 'border-amber-400 bg-amber-100' : 'border-amber-200 bg-white'}`}>
                    <button onClick={() => setOpenObjection(openObjection === idx ? null : idx)} className="flex w-full items-center justify-between gap-1 text-left text-[11px] font-bold text-gray-800">
                      <span className="leading-snug">{item.objection}</span>
                      <span className="shrink-0 text-gray-400">{openObjection === idx ? '−' : '+'}</span>
                    </button>
                    {openObjection === idx && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[11px] leading-relaxed text-gray-600">{item.response}</p>
                        {item.full && <p className="border-l-2 border-amber-300 pl-2 text-[11px] leading-relaxed text-gray-500">{item.full}</p>}
                        {item.question && (
                          <div className="rounded border border-sky-200 bg-sky-50 p-1.5 text-[11px] text-sky-700">
                            <span className="font-bold">Pergunta:</span> {item.question}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {item.material && <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Mostrar: {item.material}</span>}
                          {item.next && <span className="rounded border border-cyan-300 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700">Proximo: {item.next}</span>}
                        </div>
                        <button
                          onClick={() => setSelectedObjections((prev) => active ? prev.filter((o) => o !== item.objection) : [...prev, item.objection])}
                          className={`rounded px-2 py-1 text-[10px] font-bold transition ${active ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        >
                          {active ? 'Marcada' : 'Marcar'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* RODAPE - botoes de resultado */}
      <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {statusButtons.map((b) => (
            <button
              key={b.label}
              onClick={() => applyQuickStatus(b)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold text-white transition ${pendingStatus === b.status ? `${b.tone} ring-2 ring-gray-400/40` : b.tone}`}
            >
              {b.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-gray-500">Estado final: <span className="font-bold text-gray-800">{statusButtons.find((b) => b.status === pendingStatus)?.label || pendingStatus}</span></span>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? 'A guardar...' : 'Guardar e concluir'}
            </button>
          </div>
        </div>
      </footer>

      {/* HISTORICO COMERCIAL */}
      {showHistory && (
        <div className="absolute inset-0 z-10 flex" onClick={() => setShowHistory(false)}>
          <div className="flex-1 bg-black/20" />
          <aside className="flex h-full w-96 flex-col border-l border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600"><ClipboardList className="h-4 w-4 text-emerald-500" /> Historico comercial</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activities.length === 0 ? (
                <p className="py-8 text-center text-[11px] text-gray-400">Sem atividades registadas para este lead.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-gray-200 pl-4">
                  {activities.map((a) => {
                    const typeLabel: Record<string, string> = { call: 'Chamada', email: 'Email', whatsapp: 'WhatsApp', demo: 'Demo', note: 'Nota', status_change: 'Mudanca de estado', proposal: 'Proposta' };
                    return (
                      <li key={a.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-gray-900">{typeLabel[a.activityType] || a.activityType}</span>
                          <span className="text-[10px] text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        {a.outcome && <div className="mt-0.5 text-[11px] text-emerald-600">{a.outcome}</div>}
                        {a.interestLevel && <div className="text-[10px] text-gray-400">Interesse: {a.interestLevel}</div>}
                        {a.notes && <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-500">{a.notes}</p>}
                        {a.objections && a.objections.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.objections.map((o, i) => <span key={i} className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700">{o}</span>)}
                          </div>
                        )}
                        {a.nextActionAt && <div className="mt-1 text-[10px] text-gray-400">Proxima: {new Date(a.nextActionAt).toLocaleDateString('pt-PT')}</div>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
