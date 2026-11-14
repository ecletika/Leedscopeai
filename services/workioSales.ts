/**
 * Material comercial do Workio para o Modo Play: guiao de chamada, banco de
 * objecoes e guiao de demo, adaptados ao segmento do lead.
 * Hoteis continuam a usar o material do SOL (housekeeping).
 */
import { findSegmentByText, Segment } from './segments';
import { WORKIO_MODULES } from './workioModules';

const strip = (v: string) =>
  (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export type LeadPitch =
  | { kind: 'hotel' }
  | { kind: 'workio'; segment?: Segment };

/** Decide que produto/material usar para um lead (pelo nicho). */
export const getLeadPitch = (niche?: string | null): LeadPitch => {
  const n = strip(niche || '');
  if (!n || n.includes('hotel') || n.includes('alojamento') || n.includes('hosped') || n.includes('pousada') || n.includes('resort')) {
    return { kind: 'hotel' };
  }
  return { kind: 'workio', segment: findSegmentByText(niche) };
};

/** Valores por omissao quando o nicho nao corresponde a nenhum segmento. */
const GENERIC = {
  label: 'empresas',
  contactRole: 'Gerente / Responsável de RH',
  painPoints: [
    'Controlo de ponto e horas feito em papel ou folhas de cálculo',
    'Escalas, férias e ausências difíceis de acompanhar',
    'Muito tempo do RH gasto a fechar o mês'
  ],
  keyModules: ['M01', 'M18', 'M17', 'M03']
};

const resolve = (segment?: Segment) => ({
  label: segment ? segment.label.toLowerCase() : GENERIC.label,
  contactRole: segment?.contactRole ?? GENERIC.contactRole,
  painPoints: segment?.painPoints ?? GENERIC.painPoints,
  keyModules: segment?.keyModules ?? GENERIC.keyModules
});

// ---------------------------------------------------------------------------
// Guiao de chamada
// ---------------------------------------------------------------------------
export interface WorkioScript {
  paragraphs: string[];
  closingQuestion: string;
  qualification: string[];
}

export const buildWorkioScript = (segment: Segment | undefined, sellerName: string): WorkioScript => {
  const s = resolve(segment);
  return {
    paragraphs: [
      `Olá, bom dia. O meu nome é ${sellerName} e falo do Workio.`,
      `Estamos a contactar ${s.label} porque o Workio ajuda as empresas a gerir as pessoas num só sítio: ponto, escalas, férias e relatórios, sem folhas de cálculo. Cada empresa liga só os módulos de que precisa.`,
      `Normalmente falamos com ${s.contactRole}, porque ajuda a resolver coisas como: ${s.painPoints.slice(0, 2).join('; ').toLowerCase()}.`,
      'A ideia não é tomar muito tempo agora. Gostava de perceber se faz sentido marcar uma apresentação rápida de 15 a 20 minutos para mostrar como funciona na prática.'
    ],
    closingQuestion: `Com quem seria melhor falar sobre este tema: ${s.contactRole} ou outra pessoa responsável pelos recursos humanos?`,
    qualification: [
      'Quantas pessoas tem na equipa e em quantos locais ou turnos?',
      'Como controlam hoje o ponto, as escalas e as férias: papel, folha de cálculo, relógio de ponto ou software?',
      'Que software usam para processar salários?',
      'Quem trata disto hoje e quanto tempo demora a fechar o mês?'
    ]
  };
};

// ---------------------------------------------------------------------------
// Banco de objecoes
// ---------------------------------------------------------------------------
export interface SalesObjection {
  objection: string;
  response: string;
  full?: string;
  question?: string;
  material?: string;
  next?: string;
}

export const WORKIO_OBJECTIONS: SalesObjection[] = [
  {
    objection: 'Já usamos folhas de cálculo',
    response: 'Perfeito, muitos começam assim. O Workio tira o trabalho manual: o ponto, as horas e as férias calculam-se sozinhos.',
    question: 'Quanto tempo gastam por mês a fechar o mapa de ponto e horas?',
    material: 'M14 Relatórios e M17 Banco de Horas',
    next: 'Marcar demo de 15 a 20 minutos'
  },
  {
    objection: 'Já temos relógio de ponto',
    response: 'Não precisa de o trocar. O Workio funciona com o terminal que já tem (por exemplo Anviz) e acrescenta escalas, banco de horas e relatórios.',
    question: 'Esse relógio já alimenta escalas e banco de horas, ou ainda fazem isso à mão?',
    material: 'M13 Terminal em Dispositivo',
    next: 'Mostrar M13 e M18 na demo'
  },
  {
    objection: 'Já temos software de salários',
    response: 'Não o substituímos. O Workio não processa salários: envia o mês ao seu software (PHC, Sage, Primavera, CentralGest ou outro) e os recibos voltam para a ficha de cada pessoa.',
    question: 'Que software usam hoje para os salários?',
    material: 'M04 Integração de Salários',
    next: 'Confirmar o software e marcar demo'
  },
  {
    objection: 'Não temos orçamento',
    response: 'O Workio é modular: liga só o que precisa, quando precisar. Pode começar por um módulo, como o ponto, e crescer depois.',
    question: 'Qual é o processo que hoje mais tempo ou dinheiro vos custa?',
    next: 'Propor começar por um módulo'
  },
  {
    objection: 'A equipa não usa tecnologia',
    response: 'A picagem faz-se no telemóvel por QR, rosto ou digital, ou num tablet à porta. É simples, sem formação longa.',
    question: 'A equipa já usa telemóvel no trabalho?',
    material: 'M01 Controlo de Ponto e M13 Terminal',
    next: 'Mostrar a picagem na demo'
  },
  {
    objection: 'Somos poucos / empresa pequena',
    response: 'Com equipas pequenas o ganho está em tirar tarefas manuais ao responsável: ponto, férias e relatórios. Começa-se só pelos módulos necessários.',
    question: 'Quem trata destas tarefas hoje e quanto tempo lhe ocupa?',
    next: 'Marcar demo curta'
  },
  {
    objection: 'Estamos sem tempo agora',
    response: 'Sem problema. São apenas 15 a 20 minutos para mostrar na prática. Prefere amanhã de manhã ou ao final do dia?',
    next: 'Agendar demo'
  }
];

// ---------------------------------------------------------------------------
// Guiao de demo
// ---------------------------------------------------------------------------
export type DemoTipData = { type: 'tip' | 'plus' | 'fast' | 'warn'; text: string };
export interface WorkioDemoPhase {
  id: string;
  title: string;
  timer: string;
  acumulado: string;
  route?: string;
  script: string;
  show: string[];
  tips: DemoTipData[];
}

export interface WorkioDemo {
  checklist: string[];
  adaptations: { role: string; start: string }[];
  phases: WorkioDemoPhase[];
  optional: string[];
}

const moduleByCode = (code: string) => WORKIO_MODULES.find((m) => m.code === code);

export const buildWorkioDemo = (segment: Segment | undefined): WorkioDemo => {
  const s = resolve(segment);
  const codes = Array.from(new Set(s.keyModules)).slice(0, 4);
  const mods = codes.map(moduleByCode).filter((m): m is NonNullable<ReturnType<typeof moduleByCode>> => Boolean(m));

  const plan: { id: string; title: string; minutes: number; script: string; show: string[]; tips: DemoTipData[] }[] = [];

  plan.push({
    id: 'abertura',
    title: '1. Abertura',
    minutes: 2,
    script: '"Antes de mostrar qualquer ecrã, uma pergunta rápida: como controlam hoje o ponto, as escalas e as férias da equipa? Em papel, folhas de cálculo ou mensagens?" (pausa — deixe o cliente responder) "O Workio junta tudo num só sítio e cada empresa liga só os módulos de que precisa. Nos próximos minutos vou mostrar o que faz mais sentido para si."',
    show: [],
    tips: [{ type: 'tip', text: 'Faça sempre a pergunta de abertura e anote a resposta: é com ela que escolhe por onde começar.' }]
  });

  mods.forEach((m, i) => {
    plan.push({
      id: m.code.toLowerCase(),
      title: `${i + 2}. ${m.name} (${m.code})`,
      minutes: 6,
      script: `"${m.description}" (mostre o ecrã) "Por exemplo: ${m.demo}."`,
      show: [m.demo],
      tips: [
        { type: 'plus', text: 'Pergunte como fazem isto hoje e quanto tempo gastam. Ligue a resposta ao que está no ecrã.' },
        ...(i === 0 ? [{ type: 'fast' as const, text: 'Se o cliente já percebeu o valor, acelere e avance para o módulo seguinte.' }] : [])
      ]
    });
  });

  if (!codes.includes('M04')) {
    const m04 = moduleByCode('M04');
    if (m04) {
      plan.push({
        id: 'm04',
        title: `${mods.length + 2}. ${m04.name} (${m04.code})`,
        minutes: 3,
        script: `"${m04.description}"`,
        show: [m04.demo],
        tips: [{ type: 'warn', text: 'O Workio não processa salários. Deixe isto claro para evitar falsas expectativas.' }]
      });
    }
  }

  plan.push({
    id: 'fecho',
    title: `${plan.length + 1}. Fecho e próximo passo`,
    minutes: 3,
    script: '"Do que viu, quais são os módulos que fazem mais sentido para vocês? Posso preparar uma proposta só com esses e marcar uma nova conversa com quem decide."',
    show: [],
    tips: [{ type: 'tip', text: 'Termine sempre com um compromisso: proposta enviada ou nova reunião com o decisor, com data.' }]
  });

  let acc = 0;
  const phases: WorkioDemoPhase[] = plan.map((p) => {
    acc += p.minutes;
    return { id: p.id, title: p.title, timer: `${p.minutes} min`, acumulado: `${acc} min`, script: p.script, show: p.show, tips: p.tips };
  });

  const first = mods[0];
  const shown = new Set(plan.map((p) => p.id));
  return {
    checklist: [
      'Conta Workio de demonstração aberta, com dados de exemplo',
      first ? `Começar pelo módulo mais relevante: ${first.name} (${first.code})` : 'Escolher o módulo mais relevante para o cliente',
      'Telemóvel à mão para mostrar a picagem',
      'Fechar outras abas desnecessárias',
      'Tom: confiante, direto, consultivo — não técnico'
    ],
    adaptations: [
      { role: 'Dono / Gerente', start: 'Comece no Controlo de Ponto e nos Relatórios' },
      { role: 'RH / Administrativo', start: 'Comece na Gestão de Pessoas e na Caixa de Entrada' },
      { role: 'Chefia de equipa', start: 'Comece nas Escalas Gráficas' },
      { role: 'Contabilidade', start: 'Comece na Integração de Salários' }
    ],
    phases,
    optional: WORKIO_MODULES.filter((m) => !shown.has(m.code.toLowerCase())).slice(0, 10).map((m) => `${m.code} ${m.name}`)
  };
};
