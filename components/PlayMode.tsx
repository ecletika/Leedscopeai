import React, { useEffect, useMemo, useState, useCallback } from 'react';
import TwilioCall from './TwilioCall';
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
  X,
  Zap
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

const solProblems = [
  'Quartos prontos tarde — recepcao nao sabe o estado em tempo real',
  'Comunicacao feita por WhatsApp pessoal, sem registo nem auditoria',
  'Governanta sem visao geral de carga e produtividade da equipa',
  'Pedidos de manutencao perdem-se ou ficam sem follow-up',
  'Dificil provar qualidade da limpeza a gestao ou a inspecoes'
];

const solFeatures = [
  { emoji: '🗺️', title: 'Mapa de quartos ao vivo', problem: 'Recepcao nao sabe quais quartos estao prontos para check-in', benefit: 'Recepcao e governanta veem o estado de cada quarto em tempo real: sujo, em limpeza, inspecionado ou pronto.' },
  { emoji: '📋', title: 'Distribuicao de tarefas', problem: 'Governanta distribui quartos manualmente, em papel ou por mensagem', benefit: 'Sistema distribui automaticamente por camareira com base na carga, prioridade e tipo de quarto.' },
  { emoji: '✅', title: 'Checklist digital de limpeza', problem: 'Padrao de limpeza depende da memoria e habito de cada pessoa', benefit: 'Guiao passo-a-passo no telemovel: camareira confirma cada item, governanta valida na inspecao.' },
  { emoji: '🔧', title: 'Tickets de manutencao', problem: 'Avarias reportadas por WhatsApp e esquecidas ou sem responsavel', benefit: 'Pedido criado na hora com foto, responsavel atribuido automaticamente e historico completo.' },
  { emoji: '📊', title: 'Dashboard da governanta', problem: 'Sem visibilidade de atrasos nem de quartos em risco antes do check-in', benefit: 'Visao consolidada de carga, atrasos, quartos em risco e produtividade da equipa.' },
  { emoji: '📱', title: 'App mobile multilingue', problem: 'Staff resiste a tecnologia complexa ou em idioma que nao domina', benefit: 'Interface simples no smartphone do staff, disponivel em varios idiomas, sem formacao longa.' }
];

const demoChecklist = [
  'Sistema SOL aberto no browser, logado como Admin Hotel',
  'Comecar na tela: Dashboard (/dashboard)',
  'Telemovel a mao para mostrar o App Mobile',
  'Fechar outras abas desnecessarias',
  'Tom: confiante, direto, consultivo — nao tecnico'
];

type DemoTip = { type: 'tip' | 'plus' | 'fast' | 'warn'; text: string };
interface DemoPhase {
  id: string; title: string; timer: string; acumulado: string;
  route?: string; script: string; show: string[]; tips: DemoTip[];
}

const demoPhases: DemoPhase[] = [
  {
    id: 'abertura', title: '1. Abertura', timer: '2 min', acumulado: '2 min',
    script: '"Antes de mostrar qualquer ecra, deixa-me fazer uma pergunta rapida: quantas mensagens em grupos de WhatsApp a vossa equipa troca por dia so para gerir limpezas, manutencao e pedidos de hospedes?" (pausa — deixa o cliente responder) "Pois e. O SOL foi criado exatamente para isso: tirar a gestao operacional do WhatsApp e coloca-la num sistema unico, inteligente e rastreavel. Em 30 minutos vou mostrar-vos como o SOL funciona na pratica — da limpeza de quartos ao relatorio executivo."',
    show: [],
    tips: [
      { type: 'tip', text: 'Faca a pergunta do WhatsApp sempre. Ela gera identificacao imediata e abre o cliente para escutar.' },
      { type: 'fast', text: 'Nao gaste tempo apresentando a empresa. Va direto ao ponto de dor.' }
    ]
  },
  {
    id: 'visao', title: '2. Visao Geral do Sistema', timer: '2 min', acumulado: '4 min',
    script: '"O SOL e um sistema de gestao operacional hoteleira com 21 modulos integrados. Foi desenhado para tres perfis: Governanta e equipa de pisos, Direcao e chefias, e Recepcao. Tudo comunica em tempo real. Os tres problemas que resolve diretamente: falta de visibilidade, comunicacao fragmentada, e ausencia de dados."',
    show: ['Mostrar o menu lateral brevemente enquanto fala — e visual e transmite a amplitude do sistema'],
    tips: [
      { type: 'fast', text: 'Nao entre em detalhe de cada modulo aqui. A demo faz esse trabalho.' }
    ]
  },
  {
    id: 'dashboard', title: '3. Dashboard SLA', timer: '2 min', acumulado: '6 min', route: '/dashboard',
    script: '"Esta e a tela de controlo do diretor. Em qualquer momento, a qualquer hora, ele abre isto e sabe: quantos quartos estao sujos, quantos estao em limpeza, se ha atrasos de SLA e se ha manutencao pendente. Auto-atualiza a cada 30 segundos."',
    show: [
      'KPIs do topo: Quartos Sujos, Em Limpeza, Pend. Inspecao, SLA Cumprido, Manutencao aberta',
      'Grafico "Quartos concluidos por hora"',
      'Painel "Estado dos Quartos" com percentagens',
      'Seccao "Quartos em Atraso (SLA)"'
    ],
    tips: [
      { type: 'plus', text: 'Se cliente for diretor/GM, parem aqui. Pergunta gatilho: "Conseguem medir quanto tempo demora uma limpeza de checkout na vossa propriedade?"' },
      { type: 'fast', text: 'Se cliente for governanta, passe rapidamente e va para o Mapa de Quartos.' }
    ]
  },
  {
    id: 'rooms', title: '4. Mapa de Quartos', timer: '2,5 min', acumulado: '8,5 min', route: '/rooms',
    script: '"Este e o mapa de quartos em tempo real. Cada cor significa um estado diferente. Aqui vejo que o quarto 203 e VIP e tem Early Check-in confirmado — o sistema ja prioriza automaticamente este quarto na fila de limpeza. A equipa de pisos nao precisa de perguntar ao rececionista o que e urgente — o SOL ja sabe."',
    show: [
      'Cards de status no topo: Limpos, Sujos, Inspecao Pendente, Manutencao',
      'Filtros por piso e tipo de quarto',
      'Estados com cores: Verde (Limpo), Amarelo (Inspecao), Vermelho (Sujo), Azul (Ocupado), Cinza (Bloqueado)',
      'Badge VIP e Early Check-in no quarto 203'
    ],
    tips: [
      { type: 'plus', text: 'Clique num quarto para mostrar o historico de limpezas, tarefas e manutencoes.' },
      { type: 'warn', text: 'Nao fique a explicar cada estado de cor. Mencione dois ou tres e avance.' }
    ]
  },
  {
    id: 'tasks', title: '5. Painel Operacional', timer: '2,5 min', acumulado: '11 min', route: '/tasks',
    script: '"Este e o painel operacional da governanta. Ela ve a fila completa de tarefas — quartos e areas comuns. Do lado direito ve os colaboradores disponiveis e quantas tarefas cada um tem. Com um clique em Atribuicao Automatica, o sistema distribui tudo com base em algoritmo de prioridade. Acabou o \'Fulana, podes ir ao 203?\'"',
    show: [
      'Fila de limpeza com quartos e areas comuns',
      'Painel lateral com colaboradores disponiveis e respetiva carga',
      'Botao "Atribuicao Automatica"',
      'Indicadores de urgencia (tag Urgente na Sala de Conferencias)'
    ],
    tips: [
      { type: 'plus', text: 'Demonstre a atribuicao manual — selecionar colaborador e checklist no dropdown e clicar Atribuir.' },
      { type: 'fast', text: 'Nao mostre todas as tarefas da fila. Dois ou tres exemplos chegam.' }
    ]
  },
  {
    id: 'checklists', title: '6. Checklists', timer: '1,5 min', acumulado: '12,5 min', route: '/checklists',
    script: '"Cada tarefa tem um checklist associado. A funcionaria executa passo a passo pelo telemovel. O sistema sabe quanto tempo cada limpeza deve demorar. Se demorar mais, o supervisor e alertado automaticamente."',
    show: [
      'Lista de checklists ativos: Checkout, Stay-over, Areas Comuns',
      'Variacao de tempo estimado por tipo (20 min, 45 min)',
      'Aplicacao por tipo de quarto: Standard, Suite'
    ],
    tips: [
      { type: 'plus', text: 'Se o cliente tiver interesse em padronizacao, abra um checklist e mostre os itens dentro.' },
      { type: 'fast', text: 'Nao entre no modo de criacao de checklist. Isso e setup, nao demo.' }
    ]
  },
  {
    id: 'mobile', title: '7. App Mobile', timer: '2 min', acumulado: '14,5 min', route: '/mobile',
    script: '"A equipa de pisos usa esta interface mobile — simples, facil de ler nos corredores. A funcionaria ve as tarefas do dia, executa o checklist, e quando termina, o quarto passa automaticamente para Aguarda Inspecao. A governanta recebe a notificacao no telemovel ou aqui no dashboard."',
    show: [
      'Visao da governanta: quartos por inspecionar, equipa ativa',
      'Contador de tarefas: A limpar / Por iniciar / Inspecionar / Concluidas',
      'Acesso rapido a tarefas, mensagens, passagem de turno'
    ],
    tips: [
      { type: 'plus', text: 'Se questionarem adocao pela equipa, reforce: "Desenhado para ser usado por qualquer pessoa, sem formacao tecnica."' },
      { type: 'fast', text: 'Nao entre nos menus internos do mobile agora.' }
    ]
  },
  {
    id: 'maintenance', title: '8. Manutencao', timer: '1,5 min', acumulado: '16 min', route: '/maintenance',
    script: '"Qualquer colaborador pode abrir um ticket de manutencao — inclusive diretamente do checklist, quando encontra uma avaria durante a limpeza. O ticket vai para o tecnico responsavel, tem rastreabilidade completa e o sistema mede quanto tempo ficou em aberto."',
    show: [
      'KPIs: Abertos, Em progresso, Urgentes',
      'Tabela de tickets com quarto, categoria, descricao, prioridade, estado, tecnico',
      'Filtros por prioridade, categoria, tecnico'
    ],
    tips: [
      { type: 'plus', text: 'Mostre o botao "Preventiva" para quem tem interesse em manutencao preventiva programada.' },
      { type: 'fast', text: 'Nao abra cada ticket. Descreva o fluxo verbalmente.' }
    ]
  },
  {
    id: 'guests', title: '9. Pedidos dos Hospedes', timer: '2 min', acumulado: '18 min', route: '/guest-requests',
    script: '"O hospede le um QR Code no quarto — nao precisa de instalar nada — e acede a um portal personalizado do hotel. Pode pedir room service, marcar servicos, ver informacoes do hotel e falar diretamente com a recepcao via chat. Tudo entra aqui, com alerta em tempo real."',
    show: [
      'Pedidos de menu ativos (Quarto 101, Quarto 104)',
      'Abas: Pedidos e chat / Info do hotel / Agendamentos / Menu / Construtor',
      'Chat com hospedes em tempo real'
    ],
    tips: [
      { type: 'plus', text: 'Mostre o "Construtor" — onde o hotel personaliza o menu e as informacoes disponiveis para o hospede.' },
      { type: 'fast', text: 'Nao entre nos detalhes de cada pedido listado.' }
    ]
  },
  {
    id: 'messages', title: '10. Mensagens', timer: '1 min', acumulado: '19 min', route: '/messages',
    script: '"O SOL tem o seu proprio sistema de mensagens internas — por departamento, sem misturar conversas. E tem a Passagem de Turno digital: tudo o que aconteceu no turno fica registado e e partilhado com o turno seguinte com um clique."',
    show: [
      'Canais por departamento: Housekeeping, Manutencao, Recepcao, Geral',
      'Mensagens em massa e chat com hospedes integrado',
      'Passagem de turno no painel lateral'
    ],
    tips: [
      { type: 'fast', text: 'Esta tela e muito intuitiva. Nao gaste mais de 1 minuto aqui.' }
    ]
  },
  {
    id: 'league', title: '11. Liga da Limpeza', timer: '1 min', acumulado: '20 min', route: '/housekeeping-league',
    script: '"Este e o nosso elemento favorito. A Liga da Limpeza e um sistema de gamificacao: as funcionarias ganham pontos por cada limpeza aprovada, conquistam medalhas, sobem no ranking. Em hoteis que usam isto, a qualidade das inspecoes aumentou entre 15 a 20%."',
    show: [
      'Ranking de colaboradores com pontos e nota media',
      'Medalhas conquistadas',
      'Seccao "Aguardam avaliacao"'
    ],
    tips: [
      { type: 'plus', text: 'Se o cliente tiver alto turnover ou problemas de motivacao, explore mais este modulo.' },
      { type: 'fast', text: 'Para clientes focados em eficiencia pura, passe rapidamente.' }
    ]
  },
  {
    id: 'shifts', title: '12. Escalas', timer: '1 min', acumulado: '21 min', route: '/shifts',
    script: '"A escala semanal esta aqui integrada. O gestor arrasta e larga os turnos, publica com um clique, e toda a equipa recebe automaticamente. Sem Excel, sem papel, sem confusao."',
    show: [
      'Vista semanal com colaboradores',
      'Tipos de turno codificados por cor: Manha, Tarde, Noite, Ferias, Falta',
      'Botao "Publicar Escala"'
    ],
    tips: [
      { type: 'fast', text: 'Esta tela e autoexplicativa. Maximo 1 minuto.' }
    ]
  },
  {
    id: 'reports', title: '13. Relatorios', timer: '1,5 min', acumulado: '22,5 min', route: '/reports',
    script: '"No final do mes — ou no final do dia — a direcao tem aqui relatorios completos de cada area: SLA de limpeza, ranking da equipa, tickets de manutencao, pedidos de hospedes, tudo cruzado. O relatorio executivo cruza dados de todos os modulos. Exporta em PDF com um clique."',
    show: [
      'Grid de categorias: Limpeza, Manutencao, Equipa, Hospedes, Inventario, Quartos, Auditorias...',
      'Numeros em destaque: 128 tarefas, 59 tickets, 164 turnos'
    ],
    tips: [
      { type: 'plus', text: 'Se cliente for GM ou investidor, entre num relatorio especifico e mostre os graficos.' },
      { type: 'fast', text: 'Se cliente ja estiver convencido dos operacionais, passe rapidamente pelos relatorios.' }
    ]
  },
  {
    id: 'ai', title: '14. Centro IA', timer: '1 min', acumulado: '23,5 min', route: '/ai',
    script: '"O Centro IA analisa padroes em segundo plano. Quando um quarto acumula tickets de manutencao recorrentes, o sistema alerta automaticamente a direcao. E manutencao preditiva — o hotel age antes que o hospede reclame."',
    show: [
      'Alerta critico: Quarto 101 — 5 tickets de manutencao nos ultimos 60 dias',
      'Alerta de atencao: Quarto 302 — padrao de manutencao recorrente'
    ],
    tips: [
      { type: 'fast', text: 'Tela de impacto, mas a mensagem e simples. Um minuto e suficiente.' }
    ]
  },
  {
    id: 'flow', title: '15. Fluxo Completo — Simulacao Real', timer: '2 min', acumulado: '25,5 min',
    script: '"Vamos ver isto como um dia real de hotel. O hospede faz checkout as 11h. O quarto aparece automaticamente como Sujo no mapa. O sistema prioriza-o na fila — ainda mais se for VIP ou tiver Early Check-in a seguir. A governanta distribui a tarefa pelo app mobile. A funcionaria executa o checklist no telemovel. Ao terminar, manda para inspecao. A governanta inspeciona, aprova, e o quarto passa para Limpo. Se encontrar uma avaria, abre um ticket em 10 segundos. No final do turno, faz a passagem de turno digital. O diretor, em qualquer lugar, ve tudo no dashboard. Nenhuma mensagem de WhatsApp. Nenhum papel. Tudo rastreado."',
    show: [],
    tips: [
      { type: 'tip', text: 'Fale devagar neste momento. Este e o clique da apresentacao.' }
    ]
  },
  {
    id: 'diferenciais', title: '16. Diferenciais do Sistema', timer: '2 min', acumulado: '27,5 min',
    script: '"O que torna o SOL diferente de outros sistemas: 1) Tudo integrado — operacao inteira num unico sistema. 2) Tempo real — auto-atualizado a cada 30 segundos. 3) App Mobile simples — sem hardware adicional. 4) IA integrada — alertas preditivos, distribuicao inteligente. 5) Gamificacao — Liga da Limpeza, unico no mercado para housekeeping. 6) Dados estrategicos — relatorios cross-modulos. 7) Sem papel nem WhatsApp — operacao auditavel."',
    show: [],
    tips: [
      { type: 'fast', text: 'Nao explique cada diferencial em detalhe. Dois ou tres frases por ponto. O cliente ja viu a demo — os diferenciais sao confirmacao do que ele acabou de ver.' }
    ]
  },
  {
    id: 'encerramento', title: '17. Encerramento e CTA', timer: '2 min', acumulado: '29,5 min',
    script: '"Em resumo: o SOL e a diferenca entre gerir um hotel com WhatsApp e gerir com dados. Entre \'acho que esta limpo\' e \'confirmado, aprovado as 14h32\'." (pausa) "A pergunta que ficou para mim e: qual e o maior ponto de dor da vossa operacao hoje — limpeza, manutencao, comunicacao, ou visibilidade para a direcao?" (ouvir a resposta e ligar ao modulo que acabou de mostrar) "O proximo passo que sugiro e uma sessao de configuracao rapida com os dados do vosso hotel. Normalmente demora menos de uma semana. Quer que agendemos isso?"',
    show: [],
    tips: [
      { type: 'tip', text: 'Termine sempre com pergunta aberta + proposta de proximo passo concreto. Nao termine com "alguma duvida?".' }
    ]
  }
];

const demoAdaptations = [
  { role: 'GM / Diretor', start: 'Comece no Dashboard SLA' },
  { role: 'Governanta', start: 'Comece no Mapa de Quartos' },
  { role: 'Recepcao', start: 'Comece nos Pedidos de Hospedes' },
  { role: 'Responsavel TI', start: 'Comece no Log de Auditoria' }
];

const demoOptionalModules = [
  'Inventario (/inventory)', 'Sustentabilidade (/sustainability)',
  'Lost & Found (/lost-found)', 'Auditorias (/audits)',
  'Telefone Interno (/phone)', 'Areas Comuns (/common-areas)'
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
  const [demoCenterTab, setDemoCenterTab] = useState<'pitch' | 'demo'>('pitch');
  const [activeDemoStep, setActiveDemoStep] = useState<string | null>(null);

  // Enriquecimento de dados via Google Places
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    found: boolean; name?: string; phone?: string; website?: string;
    address?: string; rating?: number; totalRatings?: number;
  } | null>(null);

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/places/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: lead.companyName, location: lead.location })
      });
      const data = await res.json();
      setEnrichResult(data);
    } catch {
      setEnrichResult({ found: false });
    } finally {
      setEnriching(false);
    }
  };

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
                {lead.phone && (
                <span className="flex items-center gap-2">
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 font-mono text-emerald-600 hover:underline"><Phone className="h-3 w-3" />{lead.phone}</a>
                  <TwilioCall
                    phoneNumber={lead.phone}
                    leadName={lead.companyName}
                    onCallEnded={(secs) => {
                      const mins = Math.floor(secs / 60);
                      const secsRem = secs % 60;
                      const durStr = mins > 0 ? `${mins}m ${secsRem}s` : `${secsRem}s`;
                      setNotes((prev) => prev ? prev : `Chamada de ${durStr}.`);
                    }}
                  />
                </span>
              )}
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-gray-600 hover:underline"><Mail className="h-3 w-3" />{lead.email}</a>}
                {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline"><Globe className="h-3 w-3" />Website</a>}
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{sellerName}</span>
                <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 hover:text-emerald-600">
                  <ClipboardList className="h-3 w-3" />{activities.length} contacto(s) anteriores
                </button>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-50"
              title="Pesquisar dados no Google Maps"
            >
              {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Enriquecer dados
            </button>
            <button onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50">
              <X className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>

        {/* Painel de resultado do enriquecimento */}
        {enrichResult && (
          <div className={`mt-2 rounded-xl border p-3 text-[11px] ${enrichResult.found ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
            {!enrichResult.found ? (
              <span className="text-gray-500">Nenhum resultado encontrado no Google Maps para este hotel.</span>
            ) : (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className="font-bold text-indigo-700">Google Maps encontrou:</span>
                {enrichResult.phone && (
                  <span className="flex items-center gap-1 text-gray-700">
                    <Phone className="h-3 w-3 text-emerald-500" />
                    <span className="font-mono font-bold text-emerald-700">{enrichResult.phone}</span>
                    <button
                      onClick={() => { setDecisionPhone(enrichResult.phone!); setEnrichResult(null); }}
                      className="ml-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      Usar
                    </button>
                  </span>
                )}
                {enrichResult.website && (
                  <span className="flex items-center gap-1 text-gray-700">
                    <Globe className="h-3 w-3 text-indigo-500" />
                    <a href={enrichResult.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      {enrichResult.website.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  </span>
                )}
                {enrichResult.address && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-3 w-3 text-gray-400" />{enrichResult.address}
                  </span>
                )}
                {enrichResult.rating && (
                  <span className="flex items-center gap-1 text-amber-700">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {enrichResult.rating} ({enrichResult.totalRatings} avaliações)
                  </span>
                )}
                <button onClick={() => setEnrichResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

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

        {/* CENTRO — Pitch rapido / Demo completa */}
        <section className="flex w-[38%] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-gray-200">
            <button
              onClick={() => setDemoCenterTab('pitch')}
              className={`flex-1 py-2.5 text-xs font-bold transition ${demoCenterTab === 'pitch' ? 'border-b-2 border-emerald-500 text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pitch rapido
            </button>
            <button
              onClick={() => setDemoCenterTab('demo')}
              className={`flex-1 py-2.5 text-xs font-bold transition ${demoCenterTab === 'demo' ? 'border-b-2 border-indigo-500 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Demo completa (30 min)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* TAB PITCH RAPIDO */}
            {demoCenterTab === 'pitch' && (
              <div className="space-y-3 p-4">
                {/* Problemas */}
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    <AlertTriangle className="h-3 w-3" /> Problemas que o hotel tem agora
                  </h3>
                  <ul className="space-y-1">
                    {solProblems.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-[11px] leading-snug text-rose-800">
                        <span className="mt-0.5 shrink-0 text-rose-400">✕</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Funcionalidades */}
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <Sparkles className="h-3 w-3 text-emerald-500" /> O que o SOL resolve
                  </h3>
                  <div className="space-y-2">
                    {(dbMaterials.length > 0
                      ? dbMaterials.map((m) => ({ emoji: '✦', title: m.title, problem: '', benefit: m.description || '' }))
                      : solFeatures
                    ).map((f) => (
                      <div key={f.title} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5 transition hover:border-emerald-200">
                        <span className="mt-0.5 text-sm leading-none">{f.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-emerald-700">{f.title}</div>
                          {f.problem && <div className="mt-0.5 text-[10px] italic text-gray-400">Problema: {f.problem}</div>}
                          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{f.benefit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA fechar demo */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-600 p-3 text-center">
                  <p className="text-[12px] font-bold italic text-white">"Faz sentido vermos isto juntos em 15 minutos? Quando e que tem 15 minutos livres esta semana?"</p>
                </div>
              </div>
            )}

            {/* TAB DEMO COMPLETA */}
            {demoCenterTab === 'demo' && (
              <div className="space-y-3 p-4">

                {/* Checklist pre-demo */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600">Checklist antes de comecar</h3>
                  <ul className="space-y-1">
                    {demoChecklist.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[11px] text-indigo-800">
                        <CheckCircle className="h-3 w-3 shrink-0 text-indigo-400" />{item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Adaptar pelo perfil */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Adaptar pelo perfil do cliente</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {demoAdaptations.map((a) => (
                      <div key={a.role} className="rounded border border-gray-200 bg-white p-2">
                        <div className="text-[10px] font-bold text-gray-700">{a.role}</div>
                        <div className="mt-0.5 text-[10px] italic text-gray-500">{a.start}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fases da demo — acordeao */}
                <div className="space-y-1.5">
                  {demoPhases.map((phase) => {
                    const isOpen = activeDemoStep === phase.id;
                    return (
                      <div key={phase.id} className={`overflow-hidden rounded-lg border transition ${isOpen ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <button
                          onClick={() => setActiveDemoStep(isOpen ? null : phase.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left"
                        >
                          <span className={`flex-1 text-[12px] font-bold ${isOpen ? 'text-indigo-800' : 'text-gray-800'}`}>{phase.title}</span>
                          <span className="shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-gray-500">{phase.timer}</span>
                          <span className="shrink-0 text-[10px] font-bold text-gray-400">acum. {phase.acumulado}</span>
                          <span className="shrink-0 text-gray-400">{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-indigo-200 px-3 pb-3 pt-2 space-y-2">
                            {phase.route && (
                              <span className="inline-block rounded border border-indigo-300 bg-white px-2 py-0.5 font-mono text-[10px] text-indigo-700">{phase.route}</span>
                            )}
                            {phase.show.length > 0 && (
                              <div>
                                <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">O que mostrar</div>
                                <ul className="space-y-0.5">
                                  {phase.show.map((s) => (
                                    <li key={s} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                                      <span className="mt-0.5 shrink-0 text-indigo-400">→</span>{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div>
                              <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">Script falado</div>
                              <p className="rounded-lg border border-indigo-200 bg-white p-2 text-[11px] italic leading-relaxed text-gray-800">{phase.script}</p>
                            </div>
                            {phase.tips.length > 0 && (
                              <div className="space-y-1">
                                {phase.tips.map((tip, i) => {
                                  const styles: Record<string, string> = {
                                    tip: 'border-sky-200 bg-sky-50 text-sky-800',
                                    plus: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                                    fast: 'border-orange-200 bg-orange-50 text-orange-800',
                                    warn: 'border-red-200 bg-red-50 text-red-800'
                                  };
                                  const labels: Record<string, string> = { tip: '✅ Dica', plus: '(+) Aprofunde', fast: '⚡ Acelere', warn: '⚠️ Cuidado' };
                                  return (
                                    <div key={i} className={`rounded border p-1.5 text-[10px] leading-snug ${styles[tip.type]}`}>
                                      <span className="font-bold">{labels[tip.type]}: </span>{tip.text}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Modulos opcionais */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Modulos opcionais (se sobrar tempo)</h3>
                  <div className="flex flex-wrap gap-1">
                    {demoOptionalModules.map((m) => (
                      <span key={m} className="rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-600">{m}</span>
                    ))}
                  </div>
                </div>

              </div>
            )}
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
