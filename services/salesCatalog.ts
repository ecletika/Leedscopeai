import { NextActionType } from '../types';

// Catalogo comercial do SOL: planos (M41), playbook de demo (M42),
// recomendacao de materiais por situacao (M46), calculo de ROI (M35)
// e sequencias de follow-up (M39).
// Os valores de preco sao indicativos e configuraveis pela equipa.

// ----- Sequencias de follow-up (M39) -----
export interface SequenceStep {
  day: number; // dias apos o inicio da sequencia
  action: NextActionType;
  label: string;
}

export interface FollowupSequenceDef {
  key: string;
  name: string;
  steps: SequenceStep[];
}

export const FOLLOWUP_SEQUENCES: FollowupSequenceDef[] = [
  {
    key: 'info',
    name: 'Cliente pediu informacao',
    steps: [
      { day: 0, action: 'email', label: 'Email de apresentacao' },
      { day: 2, action: 'call', label: 'Ligar novamente' },
      { day: 5, action: 'email', label: 'Enviar caso de uso' },
      { day: 10, action: 'call', label: 'Ultimo contacto' },
      { day: 30, action: 'follow_up', label: 'Reativar lead' }
    ]
  },
  {
    key: 'postdemo',
    name: 'Depois da demo',
    steps: [
      { day: 0, action: 'email', label: 'Resumo da apresentacao' },
      { day: 1, action: 'proposal', label: 'Enviar proposta' },
      { day: 3, action: 'call', label: 'Esclarecer duvidas' },
      { day: 7, action: 'call', label: 'Fechar proxima etapa' },
      { day: 15, action: 'follow_up', label: 'Follow-up futuro ou perdido' }
    ]
  }
];

export const sequenceByKey = (key?: string) => FOLLOWUP_SEQUENCES.find((s) => s.key === key);

export interface SalesPlan {
  id: string;
  name: string;
  idealFor: string;
  priceHint: string; // indicativo, ajustar
  setup: string;
  trial: string;
  modules: string[];
  highlight?: boolean;
}

export const SALES_PLANS: SalesPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    idealFor: 'Hoteis pequenos (ate ~30 quartos)',
    priceHint: 'Sob consulta (por quarto/mes)',
    setup: 'Setup simples incluido',
    trial: '14 dias gratis',
    modules: ['Mapa de quartos', 'Tarefas de housekeeping', 'Checklists', 'App mobile', 'Multi-idioma']
  },
  {
    id: 'pro',
    name: 'Pro',
    idealFor: 'Hoteis medios (30-150 quartos)',
    priceHint: 'Sob consulta (por quarto/mes)',
    setup: 'Setup + formacao da equipa',
    trial: '14 dias gratis',
    modules: ['Tudo do Starter', 'Inspecoes de supervisao', 'Tickets de manutencao', 'Amenities e inventario', 'Relatorios', 'Dashboard em tempo real'],
    highlight: true
  },
  {
    id: 'premium',
    name: 'Premium',
    idealFor: 'Grupos e varias unidades',
    priceHint: 'Sob consulta (por unidade)',
    setup: 'Onboarding dedicado',
    trial: 'Piloto acompanhado',
    modules: ['Tudo do Pro', 'Multi-propriedade', 'IA operacional', 'Integracao PMS', 'Sustentabilidade', 'Relatorios por grupo']
  }
];

// ----- Playbook de demonstracao (M42) -----
export interface PlaybookStep {
  title: string;
  say: string;
  module?: number; // imagem do modulo SOL a mostrar
  question?: string;
  objection?: string;
  next: string;
}

export const DEMO_PLAYBOOK: PlaybookStep[] = [
  { title: '1. Confirmar contexto', say: 'Antes de comecar, confirmo: tem X quartos e a equipa de limpeza e de Y pessoas, certo?', question: 'Como organizam hoje a limpeza dos quartos?', next: 'Relembrar a dor identificada.' },
  { title: '2. Relembrar a dor', say: 'Pelo que falamos, o maior desafio e [dor]. E exatamente nisso que o SOL ajuda.', next: 'Mostrar o mapa de quartos.' },
  { title: '3. Mapa de quartos', say: 'Este e o mapa em tempo real: a recepcao e a governanta veem o estado de cada quarto ao vivo.', module: 1, question: 'Hoje a recepcao sabe em tempo real quais quartos estao prontos?', objection: 'Ja sabemos na recepcao -> mas depende de chamadas/WhatsApp.', next: 'Mostrar a tarefa no telemovel.' },
  { title: '4. Tarefa no telemovel', say: 'A camareira recebe as tarefas no telemovel e atualiza o estado com um toque.', module: 14, question: 'A equipa usa telemovel no trabalho?', next: 'Mostrar a checklist.' },
  { title: '5. Checklist', say: 'Cada limpeza segue uma checklist padronizada — nada e esquecido, mesmo com equipas rotativas.', module: 3, next: 'Mostrar ticket de manutencao.' },
  { title: '6. Ticket de manutencao', say: 'Se houver um problema no quarto, vira um ticket com foto, responsavel e historico.', module: 6, question: 'Como recebem hoje os pedidos de manutencao?', objection: 'Mandamos WhatsApp -> perde historico e prioridade.', next: 'Mostrar o dashboard.' },
  { title: '7. Dashboard', say: 'A gestao ve a operacao ao vivo: sujos, em limpeza, prontos, inspecao e manutencao.', module: 13, next: 'Mostrar relatorios.' },
  { title: '8. Relatorios', say: 'E no fim tem relatorios de produtividade, atrasos e tickets resolvidos.', module: 12, question: 'Que indicadores gostaria de acompanhar?', next: 'Explicar implementacao.' },
  { title: '9. Implementacao', say: 'A implementacao e rapida e acompanhada: configuramos quartos, equipa e checklists convosco.', next: 'Apresentar proximos passos.' },
  { title: '10. Proximos passos', say: 'Faz sentido arrancarmos com um piloto/trial e definirmos uma data de inicio?', next: 'Fechar proximo passo (trial, proposta ou nova reuniao).' }
];

// ----- Materiais por situacao (M46) -----
export interface SituationMaterial {
  situation: string;
  recommend: string;
  module: number; // imagem principal a mostrar
}

export const SITUATION_MATERIALS: SituationMaterial[] = [
  { situation: 'Usa WhatsApp', recommend: 'Comparador SOL vs WhatsApp + estado dos quartos', module: 1 },
  { situation: 'Quartos prontos tarde / atrasos', recommend: 'Mapa de quartos + prioridades', module: 1 },
  { situation: 'Governanta quer controlo da equipa', recommend: 'Tarefas + checklists + inspecao', module: 4 },
  { situation: 'Gerente quer relatorios', recommend: 'Dashboard + relatorios', module: 13 },
  { situation: 'Manutencao desorganizada', recommend: 'Tickets de manutencao', module: 6 },
  { situation: 'Wi-Fi fraco no hotel', recommend: 'Funciona offline-first', module: 14 },
  { situation: 'Equipa estrangeira / multilingue', recommend: 'Sistema multi-idioma', module: 14 },
  { situation: 'Grupo com varios hoteis', recommend: 'Multi-propriedade + relatorios por unidade', module: 20 },
  { situation: 'Quer perceber o retorno', recommend: 'Calculadora de ROI + planos', module: 12 }
];

// ----- ROI / Calculadora de economia (M35) -----
export interface RoiInputs {
  rooms: number;
  cleaningsPerDay: number;
  minutesLostPerRoom: number;
  staff: number;
  costPerHour: number;
  lateCheckinsPerMonth: number;
  complaintsPerMonth: number;
}

export interface RoiResult {
  monthlyHoursLost: number;
  monthlyCostLost: number;
  yearlyCostLost: number;
  lateCheckinsPerMonth: number;
  complaintsPerMonth: number;
}

export const computeRoi = (i: RoiInputs): RoiResult => {
  const cleanings = i.cleaningsPerDay > 0 ? i.cleaningsPerDay : i.rooms;
  const monthlyMinutes = i.minutesLostPerRoom * cleanings * 30;
  const monthlyHoursLost = Math.round(monthlyMinutes / 60);
  const monthlyCostLost = Math.round(monthlyHoursLost * i.costPerHour);
  return {
    monthlyHoursLost,
    monthlyCostLost,
    yearlyCostLost: monthlyCostLost * 12,
    lateCheckinsPerMonth: i.lateCheckinsPerMonth,
    complaintsPerMonth: i.complaintsPerMonth
  };
};
