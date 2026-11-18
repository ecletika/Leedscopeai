/**
 * Segmentos de mercado para a Nova Prospeccao.
 * Partilhado entre o frontend (seletor) e o servidor (pesquisa + analise IA).
 *
 * O Workio e uma plataforma modular de RH / gestao de pessoas (ponto, escalas,
 * ferias, avaliacao, recrutamento, formacao, SST, canal de denuncia...).
 * O SOL e o sistema de housekeeping/operacao so para hotelaria.
 *
 * NOTA: dores e pitches por segmento sao um rascunho de trabalho — devem ser
 * revistos pela equipa comercial.
 */
export interface Segment {
  id: string;
  label: string;
  /** Termo enviado como "nicho" para a pesquisa de empresas */
  searchTerm: string;
  /** Termo em ingles usado em fontes abertas (OpenStreetMap) */
  osmTerm: string;
  /** Pistas para a IA procurar este tipo de empresa */
  aiHint: string;
  /** Cargo mais provavel do decisor */
  contactRole: string;
  /** Unidade de dimensao tipica (quartos, lugares, colaboradores...) */
  unitLabel: string;
  /** Produto mais relevante para este segmento */
  product: string;
  /** Codigos dos modulos Workio mais relevantes (ver workioModules.ts) */
  keyModules: string[];
  painPoints: string[];
  pitch: string;
}

export const SEGMENTS: Segment[] = [
  {
    id: 'hotelaria',
    label: 'Hotéis e alojamento',
    searchTerm: 'Hotéis',
    osmTerm: 'hotel',
    aiHint: 'hotéis, alojamento local, guest houses, pousadas e resorts',
    contactRole: 'Diretor de Operações / Governanta-Geral',
    unitLabel: 'quartos',
    product: 'SOL (housekeeping e operação hoteleira) + Workio (ponto e escalas)',
    keyModules: ['M01', 'M18', 'M17', 'M03'],
    painPoints: [
      'Quartos prontos tarde e receção sem visibilidade (SOL)',
      'Escalas de turnos e folgas montadas à mão',
      'Horas extra e banco de horas sem controlo'
    ],
    pitch: 'SOL para coordenar housekeeping e manutenção; Workio para ponto, escalas e gestão da equipa.'
  },
  {
    id: 'restauracao',
    label: 'Restaurantes e cafés',
    searchTerm: 'Restaurantes',
    osmTerm: 'restaurant',
    aiHint: 'restaurantes, cafés, pastelarias, bares e catering independentes',
    contactRole: 'Gerente / Proprietário',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M18', 'M01', 'M17', 'M03'],
    painPoints: [
      'Escalas e trocas de turno por WhatsApp',
      'Horas extra e folgas difíceis de controlar',
      'Rotatividade alta e onboarding repetido'
    ],
    pitch: 'Escalas gráficas publicadas à equipa, ponto no telemóvel e banco de horas automático.'
  },
  {
    id: 'clinicas',
    label: 'Clínicas e consultórios',
    searchTerm: 'Clínicas',
    osmTerm: 'clinic',
    aiHint: 'clínicas médicas, dentárias, de fisioterapia e consultórios privados',
    contactRole: 'Diretor Clínico / Gestor da Clínica',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M09', 'M01', 'M08', 'M03'],
    painPoints: [
      'Fichas de aptidão e EPI com validades por controlar',
      'Formação obrigatória sem registo de horas',
      'Férias e ausências geridas em papel ou Excel'
    ],
    pitch: 'SST com avisos de validade, formação com horas contadas e gestão de férias e ausências.'
  },
  {
    id: 'ginasios',
    label: 'Ginásios e fitness',
    searchTerm: 'Ginásios',
    osmTerm: 'gym',
    aiHint: 'ginásios, health clubs, estúdios de fitness, pilates e crossfit',
    contactRole: 'Gerente / Proprietário',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M18', 'M01', 'M13', 'M17'],
    painPoints: [
      'Monitores e rececionistas com horários variáveis',
      'Picagem em papel ou sem controlo real',
      'Pagamento de horas e aulas sem mapa claro'
    ],
    pitch: 'Terminal de ponto num tablet à receção, escalas e mapa de horas automático.'
  },
  {
    id: 'retalho',
    label: 'Lojas e retalho',
    searchTerm: 'Lojas',
    osmTerm: 'shop',
    aiHint: 'lojas independentes, supermercados locais, boutiques e pequenas redes de retalho',
    contactRole: 'Gerente de Loja / Diretor de RH',
    unitLabel: 'lojas',
    product: 'Workio',
    keyModules: ['M01', 'M18', 'M02', 'M14'],
    painPoints: [
      'Várias lojas sem visão central das picagens',
      'Faltas e atrasos conhecidos só no fim do mês',
      'Escalas por loja feitas à mão'
    ],
    pitch: 'Ponto por loja com alertas no próprio dia e relatórios automáticos para a gestão.'
  },
  {
    id: 'oficinas',
    label: 'Oficinas e automóvel',
    searchTerm: 'Oficinas automóvel',
    osmTerm: 'car repair',
    aiHint: 'oficinas de reparação automóvel, stands, centros de pneus e lavagens',
    contactRole: 'Chefe de Oficina / Proprietário',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M09', 'M01', 'M05', 'M17'],
    painPoints: [
      'EPI e medicina do trabalho por controlar',
      'Despesas e deslocações sem registo',
      'Horas extra sem mapa'
    ],
    pitch: 'SST com avisos de validade, despesas com foto do talão e ponto simples.'
  },
  {
    id: 'limpezas',
    label: 'Empresas de limpeza e facility',
    searchTerm: 'Empresas de limpeza',
    osmTerm: 'cleaning company',
    aiHint: 'empresas de limpeza, facility services, segurança privada e manutenção de edifícios',
    contactRole: 'Diretor Operacional / Gerente',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M01', 'M13', 'M18', 'M09'],
    painPoints: [
      'Equipas em vários locais, picagem difícil de validar',
      'Muitas pessoas, rotatividade e escalas complexas',
      'EPI e fichas de aptidão em grande volume'
    ],
    pitch: 'Picagem por QR ou rosto em cada local, escalas e controlo de EPI e aptidões.'
  },
  {
    id: 'construcao',
    label: 'Construção e obras',
    searchTerm: 'Construção civil',
    osmTerm: 'construction company',
    aiHint: 'empresas de construção civil, remodelações, empreiteiros e engenharia',
    contactRole: 'Diretor de Obra / Gerente',
    unitLabel: 'obras',
    product: 'Workio',
    keyModules: ['M09', 'M01', 'M05', 'M20'],
    painPoints: [
      'Várias obras em simultâneo sem controlo de presenças',
      'SST, EPI e inspeções com validades difíceis de seguir',
      'Despesas de deslocação e equipamentos sem registo'
    ],
    pitch: 'Presenças por obra, SST com avisos de validade e inventário de equipamentos.'
  },
  {
    id: 'escolas',
    label: 'Escolas e centros de formação',
    searchTerm: 'Escolas e centros de formação',
    osmTerm: 'school',
    aiHint: 'escolas privadas, colégios, centros de formação e academias de línguas',
    contactRole: 'Diretor / Coordenador Administrativo',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M03', 'M08', 'M06', 'M27'],
    painPoints: [
      'Férias e ausências do pessoal docente e não docente',
      'Formação anual sem registo das 40 horas',
      'Avaliação de desempenho em papel'
    ],
    pitch: 'Gestão de pessoas, formação com horas contadas e ciclos de avaliação.'
  },
  {
    id: 'logistica',
    label: 'Logística e armazéns',
    searchTerm: 'Logística e armazéns',
    osmTerm: 'logistics warehouse',
    aiHint: 'empresas de logística, transportes, armazéns e distribuição',
    contactRole: 'Diretor de Operações / Responsável de RH',
    unitLabel: 'colaboradores',
    product: 'Workio',
    keyModules: ['M01', 'M18', 'M17', 'M09'],
    painPoints: [
      'Turnos rotativos e noturnos com cálculo manual',
      'Horas extra e banco de horas sem regras claras',
      'EPI e aptidões com validade por controlar'
    ],
    pitch: 'Ponto por turno, banco de horas automático e controlo de SST.'
  }
];

/** Segmento "livre": o utilizador escreve o seu proprio nicho. */
export const CUSTOM_SEGMENT_ID = 'custom';

export const getSegment = (id?: string | null): Segment | undefined =>
  SEGMENTS.find((s) => s.id === id);

const strip = (v: string) =>
  (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Descobre o segmento a partir de texto livre (ex.: nicho de uma campanha antiga). */
export const findSegmentByText = (text?: string | null): Segment | undefined => {
  const t = strip(text || '');
  if (!t) return undefined;
  return SEGMENTS.find((s) => {
    const label = strip(s.label);
    const term = strip(s.searchTerm);
    return t === term || t === label || t.includes(term) || term.includes(t);
  });
};

/** Segmento hoteleiro (unico com fontes oficiais RNET/CADASTUR). */
export const isHotelSegment = (id?: string | null) => id === 'hotelaria';
