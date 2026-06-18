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

const fieldClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';

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
    low: 'bg-rose-600/20 text-rose-300 border-rose-500/30',
    medium: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    high: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ai-dark/98 backdrop-blur-md">
      {/* TOPO - dados do hotel */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-800 bg-ai-card px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-white">{lead.companyName}</h2>
              <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                MODO PLAY
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.location}</span>
              {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 font-mono text-emerald-300 hover:underline"><Phone className="h-3 w-3" />{lead.phone}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{lead.email}</a>}
              {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-300 hover:underline"><Globe className="h-3 w-3" />Website</a>}
              <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{sellerName}</span>
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 hover:text-emerald-300" title="Ver historico comercial">
                <ClipboardList className="h-3 w-3" />{activities.length} contacto(s) anteriores
              </button>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-gray-700">
          <X className="h-4 w-4" /> Sair
        </button>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* ESQUERDA - contactos */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
          <div className="border-b border-gray-800 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Contactos do hotel</h3>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-500" /></div>
            ) : contacts.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-gray-500">Sem contactos. Identifique o decisor durante a chamada.</p>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="rounded-lg border border-gray-800 bg-ai-dark p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      {contactTypeOptions.find((o) => o.value === c.contactType)?.label || 'Contacto'}
                    </span>
                    {c.isPrimaryDecisionMaker ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300"><Star className="h-3 w-3 fill-amber-300" />Decisor</span>
                    ) : (
                      <button onClick={() => handleMarkDecisionMaker(c)} className="text-[9px] font-bold text-gray-500 hover:text-amber-300">Marcar decisor</button>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-medium text-white">{c.name || 'A preencher'}</div>
                  {c.phone && <div className="font-mono text-[11px] text-emerald-300">{c.phone}</div>}
                  {c.email && <div className="truncate text-[11px] text-gray-400">{c.email}</div>}
                </div>
              ))
            )}
          </div>
          <div className="space-y-2 border-t border-gray-800 p-3">
            <select value={newContactType} onChange={(e) => setNewContactType(e.target.value as CrmContactType)} className={fieldClass}>
              {contactTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Nome" className={fieldClass} />
            <input value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder="Telefone" className={`${fieldClass} font-mono`} />
            <button onClick={handleAddContact} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-800 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-gray-700">
              <Plus className="h-3.5 w-3.5" /> Adicionar contacto
            </button>
          </div>
        </aside>

        {/* CENTRO - guiao + resultado */}
        <section className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* Guiao */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <MessageSquare className="h-3.5 w-3.5" /> Guiao de chamada
              </h3>
              {dbScripts.length > 0 && (
                <select value={selectedScriptId} onChange={(e) => setSelectedScriptId(e.target.value)} className="rounded-lg border border-gray-700 bg-ai-dark px-2 py-1 text-[11px] text-gray-300 focus:border-emerald-500 focus:outline-none">
                  <option value="">Guiao padrao</option>
                  {dbScripts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
            {selectedScript ? (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-200">
                {selectedScript.content.replace(/\[NOME\]/g, sellerName)}
              </div>
            ) : (
            <div className="space-y-2 text-[13px] leading-relaxed text-gray-200">
              <p>Ola, bom dia. O meu nome e <span className="font-bold text-white">{sellerName}</span> e falo da <span className="font-bold text-white">SOL</span>.</p>
              <p>Estamos a contactar alguns hoteis independentes porque desenvolvemos uma plataforma simples para ajudar equipas de housekeeping, recepcao e manutencao a coordenarem melhor quartos, limpezas, inspecoes e pedidos internos.</p>
              <p>Normalmente falamos com o gerente ou com a governanta, porque o sistema ajuda a resolver problemas como quartos prontos tarde, comunicacao por WhatsApp e falta de visibilidade sobre limpezas e manutencao.</p>
              <p>A ideia nao e tomar muito tempo agora. Gostava de perceber se faz sentido marcar uma apresentacao rapida de 15 a 20 minutos para mostrar como funciona na pratica.</p>
              <p className="font-semibold text-emerald-200">Com quem seria melhor falar sobre este tema: o gerente, a governanta ou outra pessoa responsavel pelas operacoes?</p>
            </div>
            )}
          </div>

          {/* Captura do resultado */}
          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Resultado da chamada</h3>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Interesse:</span>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setInterest(level)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold capitalize transition ${interest === level ? interestTones[level] : 'border-gray-700 bg-ai-dark text-gray-500'}`}
                >
                  {level === 'low' ? 'Baixo' : level === 'medium' ? 'Medio' : 'Alto'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Quem atendeu</span>
                <input value={answeredBy} onChange={(e) => setAnsweredBy(e.target.value)} className={fieldClass} placeholder="Nome" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Cargo</span>
                <input value={answeredRole} onChange={(e) => setAnsweredRole(e.target.value)} className={fieldClass} placeholder="Recepcao, gerente..." />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Decisor identificado</span>
                <input value={decisionName} onChange={(e) => setDecisionName(e.target.value)} className={fieldClass} placeholder="Nome do decisor" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Telefone direto</span>
                <input value={decisionPhone} onChange={(e) => setDecisionPhone(e.target.value)} className={`${fieldClass} font-mono`} />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Email direto</span>
                <input value={decisionEmail} onChange={(e) => setDecisionEmail(e.target.value)} className={fieldClass} />
              </label>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notas da chamada</span>
                <div className="flex items-center gap-3">
                  <button onClick={handleAutoScore} className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 hover:text-emerald-200" title="Calcular score automatico">
                    <Star className="h-3 w-3" /> Score auto
                  </button>
                  <button onClick={handleGenerateSummary} disabled={aiLoading} className="flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200 disabled:opacity-50">
                    {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Analisar IA
                  </button>
                </div>
              </div>
              <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-ai-dark p-3 text-xs leading-relaxed text-white focus:border-emerald-500 focus:outline-none" placeholder="O que foi falado, objeccoes, interesse, proximo passo..." />
              {(aiSummary || aiScore !== null) && (
                <div className="mt-2 rounded-lg border border-purple-500/20 bg-purple-500/[0.06] p-3 text-[11px] text-purple-100">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-bold text-purple-300"><Bot className="h-3 w-3" /> Assistente comercial</span>
                    {aiScore !== null && (
                      <span className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
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
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Proxima acao</span>
                <select value={nextActionType} onChange={(e) => setNextActionType(e.target.value as NextActionType)} className={fieldClass}>
                  {nextActionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Data / hora</span>
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
                <button key={q.days} onClick={() => setNextActionAt(plusDays(q.days))} className="rounded border border-gray-700 bg-ai-dark px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-emerald-300">{q.label}</button>
              ))}
            </div>

            {needsCloseReason && (
              <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-300"><ShieldOff className="h-3 w-3" /> Motivo de encerramento *</span>
                <select value={closeReasonId} onChange={(e) => setCloseReasonId(e.target.value)} className={fieldClass}>
                  <option value="">Escolher motivo</option>
                  {closeReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* DIREITA - apresentacao + objeccoes */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Mini apresentacao SOL
            </h3>
            <div className="space-y-2">
              {materials.map((card) => (
                <div key={card.title} className="overflow-hidden rounded-lg border border-gray-800 bg-ai-dark">
                  {card.url && (
                    <img src={card.url} alt={card.title} className="aspect-video w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-3">
                    <div className="text-xs font-bold text-emerald-300">{card.title}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{card.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Banco de objeccoes
            </h3>
            <div className="space-y-2">
              {objections.map((item, idx) => {
                const active = selectedObjections.includes(item.objection);
                return (
                  <div key={item.objection} className={`rounded-lg border p-2.5 transition ${active ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-gray-800 bg-ai-dark'}`}>
                    <button onClick={() => setOpenObjection(openObjection === idx ? null : idx)} className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-bold text-white">
                      <span>{item.objection}</span>
                      <span className="text-gray-500">{openObjection === idx ? '-' : '+'}</span>
                    </button>
                    {openObjection === idx && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[11px] leading-relaxed text-gray-300">{item.response}</p>
                        {item.full && <p className="border-l-2 border-gray-700 pl-2 text-[11px] leading-relaxed text-gray-400">{item.full}</p>}
                        {item.question && (
                          <div className="rounded border border-sky-500/20 bg-sky-500/[0.06] p-2 text-[11px] text-sky-200">
                            <span className="font-bold">Pergunta:</span> {item.question}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {item.material && <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">Mostrar: {item.material}</span>}
                          {item.next && <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">Proximo: {item.next}</span>}
                        </div>
                        <button
                          onClick={() => setSelectedObjections((prev) => active ? prev.filter((o) => o !== item.objection) : [...prev, item.objection])}
                          className={`rounded px-2 py-1 text-[10px] font-bold ${active ? 'bg-amber-600 text-white' : 'bg-gray-800 text-amber-300'}`}
                        >
                          {active ? 'Marcada na chamada' : 'Marcar como levantada'}
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
      <footer className="shrink-0 border-t border-gray-800 bg-ai-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusButtons.map((b) => (
            <button
              key={b.label}
              onClick={() => applyQuickStatus(b)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold text-white transition ${pendingStatus === b.status ? `${b.tone} ring-2 ring-white/40` : b.tone}`}
            >
              {b.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-gray-400">Estado final: <span className="font-bold text-white">{statusButtons.find((b) => b.status === pendingStatus)?.label || pendingStatus}</span></span>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? 'A guardar...' : 'Guardar e concluir'}
            </button>
          </div>
        </div>
      </footer>

      {/* HISTORICO COMERCIAL (M47) */}
      {showHistory && (
        <div className="absolute inset-0 z-10 flex" onClick={() => setShowHistory(false)}>
          <div className="flex-1 bg-black/40" />
          <aside className="flex h-full w-96 flex-col border-l border-gray-800 bg-ai-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300"><ClipboardList className="h-4 w-4 text-emerald-400" /> Historico comercial</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activities.length === 0 ? (
                <p className="py-8 text-center text-[11px] text-gray-500">Sem atividades registadas para este lead.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-gray-800 pl-4">
                  {activities.map((a) => {
                    const typeLabel: Record<string, string> = { call: 'Chamada', email: 'Email', whatsapp: 'WhatsApp', demo: 'Demo', note: 'Nota', status_change: 'Mudanca de estado', proposal: 'Proposta' };
                    return (
                      <li key={a.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ai-card bg-emerald-500" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-white">{typeLabel[a.activityType] || a.activityType}</span>
                          <span className="text-[10px] text-gray-500">{a.createdAt ? new Date(a.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        {a.outcome && <div className="mt-0.5 text-[11px] text-emerald-300">{a.outcome}</div>}
                        {a.interestLevel && <div className="text-[10px] text-gray-500">Interesse: {a.interestLevel}</div>}
                        {a.notes && <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-400">{a.notes}</p>}
                        {a.objections && a.objections.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.objections.map((o, i) => <span key={i} className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300">{o}</span>)}
                          </div>
                        )}
                        {a.nextActionAt && <div className="mt-1 text-[10px] text-gray-500">Proxima: {new Date(a.nextActionAt).toLocaleDateString('pt-PT')}</div>}
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
