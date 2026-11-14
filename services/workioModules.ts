/**
 * Catalogo de modulos do Workio (plataforma de RH e gestao de pessoas).
 * Usado na Academia e nas propostas/analise IA.
 * "Todos os modulos. Liga so os que a sua empresa precisa, quando precisar."
 */
export type WorkioArea = 'ponto' | 'talento' | 'salarios' | 'empresa';

export interface WorkioModule {
  code: string;
  name: string;
  area: WorkioArea;
  description: string;
  /** Exemplo mostrado no ecra da demo */
  demo: string;
  tag?: 'Novo' | 'IA';
}

export const WORKIO_AREAS: { id: WorkioArea; name: string; tagline: string }[] = [
  { id: 'ponto', name: 'Ponto e pessoas', tagline: 'O dia a dia de quem trabalha.' },
  { id: 'talento', name: 'Talento', tagline: 'Contratar, formar e fazer crescer.' },
  { id: 'salarios', name: 'Salários e despesas', tagline: 'O dinheiro, sem folhas de cálculo.' },
  { id: 'empresa', name: 'Empresa', tagline: 'O que mantém a casa em ordem.' }
];

export const WORKIO_MODULES: WorkioModule[] = [
  // --- Ponto e pessoas ---
  { code: 'M01', name: 'Controlo de Ponto', area: 'ponto', description: 'Picagem no telemóvel por QR, rosto ou digital. Atrasos, faltas e picagens em falta aparecem no próprio dia.', demo: 'Entrada 08:57 · Loja do Porto · QR confirmado' },
  { code: 'M13', name: 'Terminal em Dispositivo', area: 'ponto', description: 'Um tablet à porta faz de relógio de ponto. O Anviz que já tem na parede também serve.', demo: 'Terminal · Receção ligado · 41 picagens hoje' },
  { code: 'M17', name: 'Banco de Horas', area: 'ponto', description: 'Saldos que se calculam sozinhos, com as regras da empresa e de cada contrato.', demo: 'Setembro +3h 20 · Horas extra 2h 15' },
  { code: 'M18', name: 'Escalas Gráficas', area: 'ponto', description: 'Os turnos da semana montados num quadro e publicados à equipa, com folgas e férias à vista.', demo: 'Ana Silva · semana 46 · turnos M/T/N/F' },
  { code: 'M03', name: 'Gestão de Pessoas', area: 'ponto', description: 'Fichas, férias, ausências, organograma e o onboarding de quem entra.', demo: 'Férias · Rui Costa · 6 a 10 out · Aprovadas' },
  { code: 'M24', name: 'Caixa de Entrada', area: 'ponto', description: 'Correções, férias e alertas que esperam decisão, num só sítio e por ordem de urgência.', demo: 'Por decidir: 4 · mais antigo há 2 dias' },
  { code: 'M02', name: 'Motor Automático', area: 'ponto', description: 'Regras que trabalham sozinhas: quem não picou até às 10h, quem passou das horas, quem tem férias por marcar.', demo: 'Regra: sem picagem às 10:00 → avisa o chefe da loja' },
  { code: 'M14', name: 'Relatórios', area: 'ponto', description: 'Mapas de ponto, horas e pessoas, enviados por e-mail sozinhos, em PDF ou Excel.', demo: 'Mapa de horas · segundas 08:00 · PDF' },
  { code: 'M25', name: 'Manuais', area: 'ponto', description: 'Guias passo a passo para cada ecrã, para o RH e para a equipa.', demo: 'Como pedir férias · 3 passos' },

  // --- Talento ---
  { code: 'M06', name: 'Avaliação de Desempenho', area: 'talento', description: 'Ciclos de avaliação, objetivos com check-ins, feedback e conversas 1:1.', demo: 'Objetivo vendas Q4 · 72% · próximo check-in sexta' },
  { code: 'M07', name: 'Recrutamento e ATS', area: 'talento', description: 'Vagas, quadro de candidatos e uma página de carreiras com a marca da empresa.', demo: 'Vaga Rececionista · 12 → 4 → 1 (triagem, entrevista, proposta)' },
  { code: 'M08', name: 'Formação', area: 'talento', description: 'Cursos com vídeo, PDF e teste, certificados, notas por aula e as 40 horas por ano contadas.', demo: 'Horas em 2026: 28/40 h · 3 certificados' },
  { code: 'M16', name: 'Plano de Carreira', area: 'talento', description: 'Funções, competências, progressão e quem está pronto para suceder a quem.', demo: 'Pronta para Chefe de loja · competências 7 de 9' },
  { code: 'M11', name: 'Bem-estar', area: 'talento', description: 'Carga de trabalho, risco de saída e um pulse anónimo, para agir antes de alguém se despedir.', demo: 'Pulse de novembro · 68% responderam · respostas anónimas' },

  // --- Salarios e despesas ---
  { code: 'M04', name: 'Integração de Salários', area: 'salarios', description: 'O Workio não processa salários: envia o mês ao seu software (PHC, Sage, Primavera, CentralGest ou outro) e os recibos voltam para a ficha de cada pessoa.', demo: 'Outubro enviado ao PHC · recibos 35 de 35' },
  { code: 'M05', name: 'Despesas e Subsídios', area: 'salarios', description: 'Notas de despesa com fotografia do talão, quilómetros e aprovações.', demo: 'Deslocação Braga · 142 km · à espera de aprovação' },
  { code: 'M15', name: 'Benchmarking Salarial', area: 'salarios', description: 'Os salários da empresa comparados com o mercado, por função e região.', demo: 'Rececionista · Porto · empresa +4% vs mediana' },
  { code: 'M19', name: 'Licenças e Planos', area: 'salarios', description: 'Quantas licenças tem, quantas estão em uso e o que paga. Mais licenças pedem-se num clique.', demo: 'Licenças 35/40 · livres 5' },

  // --- Empresa ---
  { code: 'M09', name: 'Workio SST', area: 'empresa', tag: 'Novo', description: 'EPI, medicina do trabalho, avaliação de riscos e inspeções, com avisos antes de cada validade.', demo: 'Ficha de aptidão renova em 12 dias · 58 EPI entregues' },
  { code: 'M27', name: 'Canal de Denúncia', area: 'empresa', tag: 'Novo', description: 'Denúncias anónimas ou identificadas, cifradas, com os prazos da Lei 93/2021.', demo: 'Receção confirmada em 7 dias · resposta até 3 meses' },
  { code: 'M21', name: 'Copilot Workio', area: 'empresa', tag: 'IA', description: 'Pergunte em português e receba a resposta com os dados da empresa e a fonte de cada número.', demo: 'Pergunta: "quem falta hoje?" → 2 pessoas' },
  { code: 'M10', name: 'Comunicação Interna', area: 'empresa', description: 'Comunicados, conversas e chamadas de voz e vídeo, sem sair do Workio.', demo: 'Comunicado Horário de Natal · lido por 31 de 35' },
  // Descricoes de M12, M23 e M26 inferidas a partir do nome: a confirmar pela equipa.
  { code: 'M12', name: 'Multi-NIF', area: 'empresa', description: 'Várias empresas (NIF) do mesmo grupo geridas na mesma conta.', demo: 'A detalhar' },
  { code: 'M23', name: 'Eventos Operacionais', area: 'empresa', description: 'Registo e acompanhamento de eventos operacionais da empresa.', demo: 'A detalhar' },
  { code: 'M26', name: 'Documentação', area: 'empresa', description: 'Documentos da empresa e dos colaboradores num só sítio.', demo: 'A detalhar' },
  { code: 'M20', name: 'Inventário', area: 'empresa', tag: 'Novo', description: 'Computadores, telemóveis e licenças de software, com recibo de entrega assinado.', demo: 'INV-0012 · ThinkPad T14' }
];

export const modulesByArea = (area: WorkioArea) =>
  WORKIO_MODULES.filter((m) => m.area === area).sort((a, b) => a.code.localeCompare(b.code));

// ---------------------------------------------------------------------------
// Planos Workio (preco por colaborador / mes). Cada plano inclui o anterior.
// ---------------------------------------------------------------------------
export interface WorkioPlan {
  id: 'pessoas' | 'professional' | 'business' | 'universe';
  name: string;
  /** Preco por colaborador / mes, em euros */
  price: number;
  tagline: string;
  /** Modulos acrescentados por este plano (alem dos do plano anterior) */
  ownModules: string[];
  highlight?: string;
}

export const WORKIO_PLANS: WorkioPlan[] = [
  {
    id: 'pessoas',
    name: 'Workio Pessoas',
    price: 3.9,
    tagline: 'Gestão operacional de pessoas, horários e assiduidade. Para pequenas e médias empresas que querem digitalizar o dia a dia dos colaboradores.',
    ownModules: ['M01', 'M03', 'M13', 'M18', 'M17', 'M14']
  },
  {
    id: 'professional',
    name: 'Workio Professional',
    price: 6.9,
    tagline: 'Gestão de pessoas e desenvolvimento de talento. Para profissionalizar o recrutamento, a formação e a avaliação.',
    ownModules: ['M07', 'M08', 'M06', 'M16', 'M11']
  },
  {
    id: 'business',
    name: 'Workio Business',
    price: 10.9,
    tagline: 'Recursos Humanos e operações numa só plataforma. Para centralizar o administrativo, o financeiro, o operacional e o documental.',
    ownModules: ['M04', 'M05', 'M15', 'M10', 'M23', 'M20', 'M09', 'M26', 'M27', 'M25', 'M02']
  },
  {
    id: 'universe',
    name: 'Workio Universe',
    price: 14.9,
    tagline: 'Todos os módulos, Multi-NIF e inteligência artificial. Para empresas e grupos que querem tudo centralizado e preparado para crescer.',
    ownModules: ['M12', 'M21'],
    highlight: 'Mais completo'
  }
];

export const formatPlanPrice = (price: number) =>
  `${price.toFixed(2).replace('.', ',')} € por colaborador / mês`;

/** Modulos incluidos num plano (cumulativo). */
export const planModuleCodes = (planId: WorkioPlan['id']): string[] => {
  const idx = WORKIO_PLANS.findIndex((p) => p.id === planId);
  return WORKIO_PLANS.slice(0, idx + 1).flatMap((p) => p.ownModules);
};

/** Plano mais baixo que inclui o modulo (undefined = ainda sem plano). */
export const lowestPlanForModule = (code: string): WorkioPlan | undefined =>
  WORKIO_PLANS.find((p) => planModuleCodes(p.id).includes(code));

/** Modulos do catalogo que ainda nao estao em nenhum plano. */
export const unassignedModules = () => WORKIO_MODULES.filter((m) => !lowestPlanForModule(m.code));

/** Resumo curto para prompts de IA. */
export const WORKIO_PRODUCT_SUMMARY =
  'Workio is a modular HR / workforce-management platform for Portuguese companies: time & attendance (QR, face, fingerprint, tablet terminal), shift scheduling, overtime bank, vacations/absences, automatic rules, reports, performance reviews, recruitment (ATS), training, career plans, well-being, payroll integration (PHC, Sage, Primavera, CentralGest), expenses, salary benchmarking, workplace safety (SST), whistleblowing channel (Lei 93/2021), internal communication, inventory and an AI copilot. Companies switch on only the modules they need.';
