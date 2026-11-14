/**
 * Segmentos de mercado para a Nova Prospeccao.
 * Partilhado entre o frontend (seletor) e o servidor (pesquisa + analise IA).
 *
 * NOTA: os textos de dores/pitch sao um rascunho de trabalho — devem ser
 * revistos pela equipa comercial do Workio.
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
  /** Sistema Workio mais relevante para este segmento */
  product: string;
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
    product: 'SOL (housekeeping e operação hoteleira)',
    painPoints: [
      'Quartos prontos tarde e receção sem visibilidade',
      'Comunicação por WhatsApp/papel sem histórico',
      'Manutenção sem responsável nem registo'
    ],
    pitch: 'Coordenar housekeeping, manutenção e receção em tempo real, num só sistema.'
  },
  {
    id: 'restauracao',
    label: 'Restaurantes e cafés',
    searchTerm: 'Restaurantes',
    osmTerm: 'restaurant',
    aiHint: 'restaurantes, cafés, pastelarias, bares e catering independentes',
    contactRole: 'Gerente / Proprietário',
    unitLabel: 'lugares',
    product: 'Workio Operações (turnos, checklists, tarefas)',
    painPoints: [
      'Checklists de abertura/fecho e higiene em papel',
      'Escalas e trocas de turno por mensagem',
      'Falhas de comunicação entre sala e cozinha'
    ],
    pitch: 'Checklists, tarefas e turnos da equipa organizados e auditáveis no telemóvel.'
  },
  {
    id: 'clinicas',
    label: 'Clínicas e consultórios',
    searchTerm: 'Clínicas',
    osmTerm: 'clinic',
    aiHint: 'clínicas médicas, dentárias, de fisioterapia e consultórios privados',
    contactRole: 'Diretor Clínico / Gestor da Clínica',
    unitLabel: 'gabinetes',
    product: 'Workio Operações (checklists, manutenção, equipas)',
    painPoints: [
      'Registo de limpeza e desinfeção de gabinetes',
      'Manutenção de equipamentos sem histórico',
      'Coordenação entre receção e equipa clínica'
    ],
    pitch: 'Rotinas, registos e manutenção de gabinetes com histórico e responsáveis claros.'
  },
  {
    id: 'ginasios',
    label: 'Ginásios e fitness',
    searchTerm: 'Ginásios',
    osmTerm: 'gym',
    aiHint: 'ginásios, health clubs, estúdios de fitness, pilates e crossfit',
    contactRole: 'Gerente / Proprietário',
    unitLabel: 'colaboradores',
    product: 'Workio Operações (limpeza, manutenção, equipa)',
    painPoints: [
      'Limpeza de balneários e salas sem controlo',
      'Avarias de equipamentos sem registo',
      'Escalas de monitores e rececionistas'
    ],
    pitch: 'Controlo de limpeza, manutenção de máquinas e escalas num só lugar.'
  },
  {
    id: 'retalho',
    label: 'Lojas e retalho',
    searchTerm: 'Lojas',
    osmTerm: 'shop',
    aiHint: 'lojas independentes, supermercados locais, boutiques e pequenas redes de retalho',
    contactRole: 'Gerente de Loja / Proprietário',
    unitLabel: 'lojas',
    product: 'Workio Operações (tarefas por loja, checklists)',
    painPoints: [
      'Tarefas de reposição e abertura sem acompanhamento',
      'Várias lojas sem visão central',
      'Comunicação sede-loja dispersa'
    ],
    pitch: 'Tarefas e checklists por loja, com visão central para a gestão.'
  },
  {
    id: 'oficinas',
    label: 'Oficinas e automóvel',
    searchTerm: 'Oficinas automóvel',
    osmTerm: 'car repair',
    aiHint: 'oficinas de reparação automóvel, stands, centros de pneus e lavagens',
    contactRole: 'Chefe de Oficina / Proprietário',
    unitLabel: 'colaboradores',
    product: 'Workio Operações (ordens de trabalho, equipas)',
    painPoints: [
      'Ordens de trabalho em papel',
      'Sem visibilidade do estado de cada viatura',
      'Prazos falhados por falta de coordenação'
    ],
    pitch: 'Ordens de trabalho e estado de cada intervenção visíveis em tempo real.'
  },
  {
    id: 'limpezas',
    label: 'Empresas de limpeza e facility',
    searchTerm: 'Empresas de limpeza',
    osmTerm: 'cleaning company',
    aiHint: 'empresas de limpeza, facility services, manutenção de edifícios e condomínios',
    contactRole: 'Diretor Operacional / Gerente',
    unitLabel: 'colaboradores',
    product: 'Workio Operações (rondas, checklists, ocorrências)',
    painPoints: [
      'Provar ao cliente que o serviço foi feito',
      'Equipas em vários locais sem supervisão',
      'Ocorrências e consumíveis sem registo'
    ],
    pitch: 'Rondas, checklists com foto e ocorrências para provar o serviço ao cliente.'
  },
  {
    id: 'construcao',
    label: 'Construção e obras',
    searchTerm: 'Construção civil',
    osmTerm: 'construction company',
    aiHint: 'empresas de construção civil, remodelações, empreiteiros e engenharia',
    contactRole: 'Diretor de Obra / Gerente',
    unitLabel: 'obras',
    product: 'Workio Operações (tarefas de obra, equipas, registos)',
    painPoints: [
      'Várias obras em simultâneo sem visão central',
      'Registos e ocorrências em papel',
      'Atrasos por falhas de comunicação'
    ],
    pitch: 'Tarefas, equipas e registos de cada obra num painel único.'
  },
  {
    id: 'escolas',
    label: 'Escolas e centros de formação',
    searchTerm: 'Escolas e centros de formação',
    osmTerm: 'school',
    aiHint: 'escolas privadas, colégios, centros de formação e academias de línguas',
    contactRole: 'Diretor / Coordenador Administrativo',
    unitLabel: 'salas',
    product: 'Workio Operações + Academia (formação de equipas)',
    painPoints: [
      'Manutenção e limpeza de salas sem registo',
      'Pedidos internos por e-mail e telefone',
      'Formação de pessoal sem acompanhamento'
    ],
    pitch: 'Pedidos internos, manutenção e formação da equipa organizados.'
  },
  {
    id: 'condominios',
    label: 'Condomínios e gestão de edifícios',
    searchTerm: 'Gestão de condomínios',
    osmTerm: 'property management',
    aiHint: 'administração de condomínios, gestão de edifícios e imobiliárias com gestão de imóveis',
    contactRole: 'Gestor de Condomínios / Diretor',
    unitLabel: 'edifícios',
    product: 'Workio Operações (ocorrências, manutenção)',
    painPoints: [
      'Ocorrências dos condóminos sem seguimento',
      'Fornecedores de manutenção sem controlo',
      'Falta de histórico por edifício'
    ],
    pitch: 'Ocorrências, fornecedores e manutenção por edifício com histórico completo.'
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
