import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  MessageSquareQuote,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Target,
  Users,
  Wallet,
  XCircle
} from 'lucide-react';
import { CommercialSystem } from '../types';
import ProductSwitch from './sales/ProductSwitch';
import { EmptyState } from './sales/ui';
import { SEGMENTS } from '../services/segments';
import { WORKIO_AREAS, WORKIO_MODULES, WORKIO_PLANS, WorkioPlan, formatPlanPrice, modulesByArea, planModuleCodes } from '../services/workioModules';

/*
 * Academia — formação comercial, separada por sistema (Workio, SOL, EMET).
 * Cada curso pertence a um sistema (campo `product`); para criar a academia de um
 * sistema novo basta acrescentar cursos a SYSTEMS com o `product` respetivo.
 *
 * Academia Workio:
 *
 * O conteúdo do Workio sai do próprio Workio (repositório ecletika/workio):
 * planos e módulos de src/lib/modulos/catalogo.ts, argumentos e perguntas
 * frequentes de landing/pagina.html (workio.pt) e o funcionamento de cada
 * módulo de public/manuais/*.md. Quando um destes mudar, isto muda com ele.
 */

interface Lesson {
  title: string;
  body: string[];
  objetivo?: string;
  frase?: string;
  manuais?: { slug: string; nome: string }[];
}

interface AcademySystem {
  id: string;
  /** Sistema a que o curso pertence: define em que academia aparece */
  product: CommercialSystem;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  lessons: Lesson[];
  checklist: string[];
}

const MANUAL_BASE = 'https://app.workio.pt/manuais?m=';

/** Manual do centro de ajuda do Workio de cada módulo. */
const MANUAL_DO_MODULO: Record<string, string> = {
  M01: '01-controlo-de-ponto', M03: '02-pessoas', M24: '03-caixa-entrada', M14: '04-relatorios',
  M17: '06-banco-de-horas', M18: '07-escalas-graficas', M02: '12-motor-automatico', M04: '13-salarios',
  M05: '14-despesas-subsidios', M06: '15-desempenho', M07: '16-recrutamento', M08: '17-formacao',
  M09: '18-sst', M10: '19-comunicacao', M11: '20-bem-estar', M12: '21-multi-nif', M13: '22-terminal',
  M15: '23-benchmarking', M16: '24-carreira', M19: '25-licencas-planos', M20: '26-inventario',
  M21: '27-copilot', M23: '28-eventos-operacionais', M26: '29-documentacao', M27: '30-canal-denuncia'
};

// --- Sistema 1: Workio · Visão geral (produto, lei, planos, objeções, demo) ---
const WORKIO_LESSONS: Lesson[] = [
  {
    title: '1. O que é o Workio',
    objetivo: 'Explicar o Workio em 30 segundos, sem jargão.',
    body: [
      'O Workio é a plataforma de Recursos Humanos da Ecletika Tecnologia: põe o registo de ponto no telemóvel de cada pessoa e junta à volta dele o que o RH faz no resto do mês — escalas, férias, salários, formação, segurança no trabalho e mais módulos, 26 no total.',
      'Feito em Portugal, para a lei portuguesa. Dados na União Europeia. Sem relógio de ponto obrigatório. Funciona na app Android e em qualquer navegador.',
      'Os módulos estão organizados em quatro planos (Pessoas, Professional, Business e Universe). Cada plano inclui tudo o do anterior. A empresa pode subir de plano quando crescer.',
      'Cliente ideal: PME portuguesas com equipas por turnos ou que não estão ao computador — hotelaria, restauração, retalho, limpezas e facilities, clínicas, oficinas e pequena indústria — e grupos com várias empresas.',
      'Fora do alvo: empresas grandes que já têm um sistema de RH integrado, e trabalhadores independentes sem equipa.'
    ],
    frase: 'Ninguém escolhe um software de RH pelo logótipo. Escolhe-o no dia em que o mês fecha sozinho e ninguém ficou a somar horas.',
    manuais: [{ slug: '31-portal-colaborador', nome: 'A minha área (o que o colaborador vê)' }]
  },
  {
    title: '2. A lei que o Workio põe em dia',
    objetivo: 'Saber que obrigações legais o cliente tem e qual o módulo que responde a cada uma.',
    body: [
      'Art. 202.º do Código do Trabalho — registo dos tempos de trabalho, com início, fim e pausas de cada pessoa. O Workio regista e tem os mapas que a ACT pede prontos a imprimir (Controlo de Ponto e Relatórios).',
      'Banco de horas — regime grupal (art. 208.º-B) ou por IRCT, com limites diários, semanais e anuais. Os saldos calculam-se sozinhos (Banco de Horas).',
      'Descanso mínimo de 11 horas entre o fim de um turno e o início do seguinte — o «Guardião ACT» do Motor Automático avisa quando falha.',
      'Art. 131.º — 40 horas de formação por ano por trabalhador, proporcionais para quem entrou a meio do ano; as horas não dadas passam a crédito do colaborador (Formação).',
      'Lei 93/2021 — canal de denúncia, obrigatório para entidades com 50 ou mais trabalhadores: receção confirmada em 7 dias, resposta em 3 meses (Canal de Denúncia, conteúdo cifrado).',
      'Lei 102/2009 — segurança e saúde no trabalho: medicina do trabalho, riscos, EPI e acidentes (Workio SST).',
      'RGPD — dados na União Europeia; cada empresa só vê os seus e cada pessoa vê o que o seu papel permite.',
      'Cuidado: o Workio ajuda a cumprir a lei, não dá aconselhamento jurídico. Perante uma dúvida legal concreta, o cliente confirma com o advogado ou o contabilista.'
    ],
    frase: 'Feito para a lei portuguesa. Os mapas que a ACT pede, prontos a imprimir.',
    manuais: [
      { slug: '06-banco-de-horas', nome: 'Banco de Horas' },
      { slug: '12-motor-automatico', nome: 'Motor Automático' },
      { slug: '17-formacao', nome: 'Formação' },
      { slug: '30-canal-denuncia', nome: 'Canal de Denúncia' }
    ]
  },
  {
    title: '3. Picar o ponto: como funciona de verdade',
    objetivo: 'Responder com rigor a «como é que a equipa pica?» e a «e se picarem pelos colegas?».',
    body: [
      'Não é preciso comprar relógio de ponto. Basta o telemóvel de cada pessoa e o QR da empresa, impresso ou num ecrã.',
      'O QR é um ponto de picagem com localização e raio. Fixo: impresso e colado na parede, custo zero. Rotativo: num tablet ou monitor, muda de 30 em 30 segundos — uma fotografia do código deixa de servir em segundos.',
      'Cada telemóvel é aprovado pelo RH uma vez e fica ligado a uma só pessoa.',
      'Antes de aceitar, o Workio confirma quatro coisas: que o código é válido, que o telemóvel é o aprovado para aquela pessoa, que ela está no local e, se configurado, que é mesmo ela.',
      'Confirmações possíveis: só QR (chega para a maioria), QR + digital ou Face ID (a mais cómoda), QR + rosto (a que resiste a alguém emprestar o telemóvel a um colega).',
      'Quando a confirmação falha, nada fica registado e o administrador é avisado no momento, com quem, quando e de que telemóvel.',
      'Terminal em Dispositivo: um tablet à porta faz de relógio. Se o cliente já tem um relógio Anviz CrossChex na parede, liga-se ao Workio e as picagens entram sozinhas.',
      'Limites a conhecer (não prometer o contrário): o modo «só entrada e saída por QR» não regista pausas nem serviço externo — quem marca o almoço usa o ecrã completo; a picagem por QR precisa de GPS e de internet no momento; um esquecimento corrige-se com um pedido na Caixa de Entrada.'
    ],
    frase: 'Se não for a pessoa certa, não pica.',
    manuais: [
      { slug: '09-picagem-por-qr', nome: 'Picagem por QR' },
      { slug: '22-terminal', nome: 'Terminal em Dispositivo' },
      { slug: '01-controlo-de-ponto', nome: 'Controlo de Ponto' }
    ]
  },
  {
    title: '4. Do registo à decisão: escalas, banco de horas e aprovações',
    objetivo: 'Mostrar o que acontece depois da picagem — onde está o tempo que o cliente poupa.',
    body: [
      'Escalas Gráficas: a semana num quadro; arrasta-se um horário para várias células de uma vez e publica-se à equipa.',
      'Controlo de Ponto: atrasos, faltas, picagens em falta e anomalias aparecem no próprio dia, com a correção a um clique.',
      'Caixa de Entrada: férias, correções de ponto, banco de horas e pedidos de acesso chegam todos ao mesmo sítio, por ordem de urgência. Fica escrito quem aprovou e quando.',
      'Banco de Horas: fila de aprovação, saldo de cada pessoa com o histórico de movimentos, regularização e as regras da empresa.',
      'Relatórios: mapas de ponto, horas e pessoas em PDF ou Excel, agendados para chegar por e-mail sozinhos (por exemplo, às segundas às 08:00).',
      'Motor Automático (Business e Universe): todas as noites passa o dia anterior a pente fino — picagens em falta, descanso de 11h, terminais que deixaram de comunicar, picagens suspeitas — e deixa de manhã o que merece atenção, também no sino e na Caixa de Entrada.',
      'Cada colaborador tem «A minha parte» em cada módulo: pica, vê as suas horas, pede férias ou uma correção, sem passar pelo chefe por mensagem.'
    ],
    frase: 'Em vez de andar à procura dos problemas, os problemas vêm ter consigo.',
    manuais: [
      { slug: '07-escalas-graficas', nome: 'Escalas Gráficas' },
      { slug: '03-caixa-entrada', nome: 'Caixa de Entrada' },
      { slug: '04-relatorios', nome: 'Relatórios' }
    ]
  },
  {
    title: '5. Os quatro planos e como escolher',
    objetivo: 'Recomendar o plano certo à primeira e explicar o que está e não está incluído.',
    body: [
      'Workio Pessoas — 3,90 € por colaborador ativo/mês: Controlo de Ponto, Gestão de Pessoas, Terminal, Escalas, Banco de Horas e Relatórios.',
      'Workio Professional — 6,90 €: tudo do Pessoas, mais Recrutamento, Formação, Avaliação de Desempenho, Plano de Carreira e Bem-estar.',
      'Workio Business — 10,90 €: tudo do Professional, mais Integração de Salários, Despesas, Benchmarking, Comunicação Interna, Eventos, Inventário, SST, Documentação, Canal de Denúncia, Manuais e Motor Automático.',
      'Workio Universe — 14,90 €: tudo do Business, mais Multi-NIF e o Copilot Workio com IA. É o plano em destaque.',
      'Em todos os planos: Dashboard, Caixa de Entrada e Licenças & Planos. Preços por colaborador ativo, por mês, sem IVA. Faturação mensal, com condições especiais em contrato anual.',
      'Os módulos não se vendem soltos: estão organizados em planos. Uma necessidade específica avalia-se numa proposta personalizada.',
      'À parte, orçamentado à medida: implementação e configuração, migração de dados, formação de administradores e chefias, integrações e terminais físicos, e créditos adicionais do Copilot.',
      'Regra rápida: só ponto e escalas → Pessoas. Quer contratar, formar ou avaliar → Professional. Quer salários, despesas, SST, documentos ou canal de denúncia → Business. Tem várias empresas/NIF ou quer IA → Universe.'
    ],
    frase: 'Um preço por colaborador ativo, por mês. Pode subir de plano quando crescer.',
    manuais: [{ slug: '25-licencas-planos', nome: 'Licenças e Planos' }]
  },
  {
    title: '6. Integração de Salários: o que é e o que não é',
    objetivo: 'Nunca vender o que o Workio não faz — este é o erro mais caro.',
    body: [
      'O Workio NÃO processa salários. Não calcula salários, IRS nem Segurança Social, não emite recibos nem declarações.',
      'O processamento continua no software de salários do cliente: PHC, Sage, Primavera, CentralGest ou outro.',
      'O que o módulo faz: junta o mês, colaborador a colaborador — faltas, horas extra, subsídios e despesas — e gera um ficheiro pronto a carregar nesse software. Depois importa os recibos de vencimento para a ficha de cada pessoa.',
      'Há ficheiro preparado para PHC, Primavera, Sage e CentralGest; para outro qualquer usa-se a opção Genérico. A correspondência dos campos faz-se uma vez; o fecho e envio, todos os meses.',
      'Também gera o ficheiro de admissões, saídas e alterações de colaboradores, e recolhe a situação fiscal de cada pessoa.',
      'Argumento: «Não troca o seu software de salários. Deixa de copiar à mão o que o ponto já sabe.»'
    ],
    frase: 'Integramos com qualquer software de salários.',
    manuais: [{ slug: '13-salarios', nome: 'Integração de Salários' }]
  },
  {
    title: '7. Talento e empresa: Professional e Business',
    objetivo: 'Saber o que cada módulo resolve, para ligar a dor do cliente ao plano.',
    body: [
      'Recrutamento: vagas, quadro de candidatos, triagem e entrevistas, com uma página de carreiras com a marca da empresa.',
      'Formação: cursos e-learning com vídeo, PDF e teste, certificados, plano e orçamento anual, e as 40 horas por ano contadas automaticamente. Aviso 90 dias antes de uma formação obrigatória expirar.',
      'Avaliação de Desempenho, Plano de Carreira e Bem-estar: ciclos de avaliação e objetivos, mapas de carreira e sucessão, e um pulse anónimo para perceber quem está em risco de sair.',
      'Despesas e Subsídios: notas de despesa com fotografia do talão, quilómetros e aprovações.',
      'SST: fichas de aptidão, riscos, inspeções, EPI e acidentes, com avisos de validade.',
      'Documentação: arquivo com validades, modelos, assinaturas e políticas. Inventário: equipamentos atribuídos com comprovativo de entrega assinado.',
      'Comunicação Interna e Eventos Operacionais: comunicados com leitura confirmada, chamadas, e eventos com equipas e escalas próprias.'
    ],
    manuais: [
      { slug: '17-formacao', nome: 'Formação' },
      { slug: '18-sst', nome: 'SST' },
      { slug: '29-documentacao', nome: 'Documentação' }
    ]
  },
  {
    title: '8. Universe: Multi-NIF e Copilot',
    objetivo: 'Vender o plano mais completo sem prometer de mais sobre a IA.',
    body: [
      'Multi-NIF: várias empresas do mesmo grupo numa só conta; cada uma com os seus dados e as suas licenças, e troca-se de empresa sem sair.',
      'Copilot Workio: pergunta-se em português («quem está de férias na próxima semana na loja do Porto?») e a resposta vem dos dados da empresa, com a fonte de cada número.',
      'O Copilot só vê o que o papel de quem pergunta permite, e nunca dados de outra empresa.',
      'O que o Copilot NÃO faz: não altera dados (não marca férias nem aprova pedidos), não lê o conteúdo de documentos, não inventa, não dá aconselhamento jurídico definitivo e só conhece as regras da empresa que lhe escreverem.',
      'O Copilot está só no Universe, com condições de utilização e limites de consumo definidos na proposta; créditos adicionais orçamentam-se à parte.'
    ],
    frase: 'Pergunte em português. A resposta vem dos dados da sua empresa.',
    manuais: [
      { slug: '21-multi-nif', nome: 'Multi-NIF' },
      { slug: '27-copilot', nome: 'Copilot Workio' }
    ]
  },
  {
    title: '9. Descoberta: as perguntas certas',
    objetivo: 'Qualificar antes de mostrar. Quem pergunta bem escolhe o plano certo.',
    body: [
      'Quantas pessoas tem a empresa? Trabalham por turnos? Em quantos locais?',
      'Como registam hoje as horas — papel, Excel, um relógio de ponto? Quanto tempo leva a fechar as horas no fim do mês?',
      'Já tiveram uma inspeção da ACT? Conseguiriam mostrar hoje o registo com pausas de cada pessoa?',
      'Que software de salários usam (PHC, Sage, Primavera, CentralGest)? Quem passa as horas para lá?',
      'Têm 50 ou mais trabalhadores? (canal de denúncia obrigatório) Estão a cumprir as 40 horas de formação?',
      'Têm várias empresas ou NIF no mesmo grupo?',
      'Quem decide? Dono ou gerente (custo, estar em regra, tempo), RH (horas certas, menos trabalho), financeiro ou contabilista (dados certos para os salários), chefe de loja ou de turno (saber quem está e aprovar no telemóvel).'
    ]
  },
  {
    title: '10. Objeções: responder sem discutir',
    objetivo: 'Concordar, perguntar e mostrar valor — nunca contrariar.',
    body: [
      '«É mais uma despesa.» → Começa nos 3,90 € por colaborador e poupa as horas de fechar o mês à mão, além do risco de coima numa inspeção. Quanto tempo gasta hoje a somar horas?',
      '«A equipa não é de computadores.» → Picam no telemóvel ou num tablet à porta. No modo só QR há um botão de cada vez: quem está fora vê Entrada, quem está dentro vê Saída.',
      '«Já temos relógio de ponto.» → Ótimo, o Anviz CrossChex liga-se ao Workio. O relógio regista; o Workio calcula o banco de horas, prepara os mapas da ACT e trata das aprovações.',
      '«Usamos Excel e funciona.» → Muitos começam assim. Consegue saber hoje o saldo de banco de horas de cada pessoa sem abrir a folha?',
      '«E se picarem pelos colegas?» → Telemóvel aprovado e ligado a uma pessoa, localização verificada, QR rotativo e, se quiser, confirmação pelo rosto.',
      '«E os nossos dados?» → Servidores na União Europeia, RGPD, cada empresa só vê os seus e cada pessoa o que o papel permite.',
      '«Já temos software de salários.» → Não o substituímos. O Workio envia-lhe o mês pronto e traz os recibos de volta.',
      '«Mudar dá trabalho.» → Há serviço de implementação e migração de dados, e pode começar só pelo ponto.',
      '«Só quero um módulo.» → Os módulos estão em planos; para uma necessidade específica fazemos uma proposta personalizada.'
    ]
  },
  {
    title: '11. A demonstração de 30 minutos',
    objetivo: 'Mostrar o Workio com os horários e os locais do cliente, e sair com um próximo passo.',
    body: [
      'Antes: saber o setor, o número de pessoas, os locais, os turnos e o software de salários. Prepare exemplos com os horários e as lojas do cliente.',
      '0–3 min — Relembrar a dor que o cliente disse na descoberta.',
      '3–8 min — Picar no telemóvel por QR, ao vivo. Mostrar a confirmação e o que acontece quando falha.',
      '8–13 min — Uma anomalia do dia → pedido de correção → aprovação na Caixa de Entrada.',
      '13–18 min — Escala da semana e saldos do banco de horas.',
      '18–23 min — Relatórios e mapas para a ACT; Motor Automático se o plano for Business ou acima.',
      '23–27 min — Só o módulo do plano que responde à dor dele (formação, salários, SST, Multi-NIF…). Não mostrar os 26.',
      '27–30 min — Plano recomendado, preço por colaborador e próximo passo marcado com data: proposta, reunião com o decisor ou arranque.'
    ],
    frase: 'Mostramos-lhe o Workio com os seus horários e as suas lojas. Meia hora chega.'
  },
  {
    title: '12. Fluxo comercial no CRM',
    objetivo: 'Usar o LeadScope do primeiro contacto ao contrato, sem deixar leads parados.',
    body: [
      'Prospetar (escolher o segmento na Nova Prospeção) → guardar no CRM → Modo Play (chamada) → registar resultado, notas e próxima ação → demo → proposta → contrato.',
      'Regra de ouro: nenhum lead contactado fica sem próximo passo e sem notas da chamada.',
      'No Modo Play tem o guião de chamada, as objeções e o roteiro de demo do Workio por segmento.'
    ]
  },
  {
    title: '13. O que nunca se diz',
    objetivo: 'Proteger a confiança do cliente e a reputação da Ecletika.',
    body: [
      'Que o Workio processa salários, calcula IRS ou emite recibos.',
      'Que implementação, migração de dados ou formação estão incluídas no preço do plano.',
      'Que o Copilot está em todos os planos ou não tem limites.',
      'Que a picagem por QR regista pausas ou funciona sem GPS ou sem internet.',
      'Que um módulo se vende à parte a preço fixo.',
      'Preços com IVA — os preços são sem IVA.',
      'Nomes de clientes ou números de resultados que não estejam aprovados para marketing.',
      'Nomes ou preços de concorrentes. O argumento é «uma plataforma em vez de várias: um contrato, um fornecedor e os dados no mesmo sítio».',
      'Conselho jurídico definitivo. O Workio ajuda a cumprir a lei; a decisão legal é do cliente com o seu advogado ou contabilista.'
    ]
  }
];


interface Question {
  q: string;
  options: string[];
  correct: number;
  why: string;
}

const QUIZ: Question[] = [
  { q: 'Um cliente pergunta se o Workio processa os salários. O que responde?', options: ['Sim, no plano Business.', 'Não. O processamento continua no software de salários dele; o Workio envia os dados do mês e traz os recibos de volta.', 'Sim, mas só com PHC.', 'Só no plano Universe.'], correct: 1, why: 'O M04 é Integração de Salários: o Workio não calcula salários, IRS nem Segurança Social.' },
  { q: 'Qual é o preço do Workio Professional?', options: ['3,90 € por colaborador/mês', '6,90 € por colaborador/mês', '10,90 € por colaborador/mês', '6,90 € por empresa/mês'], correct: 1, why: 'Pessoas 3,90 €, Professional 6,90 €, Business 10,90 €, Universe 14,90 € — por colaborador ativo, por mês, sem IVA.' },
  { q: 'Um grupo com três empresas (três NIF) quer tudo numa só conta. Que plano?', options: ['Pessoas', 'Professional', 'Business', 'Universe'], correct: 3, why: 'O Multi-NIF só está no Universe.' },
  { q: 'O cliente precisa de um relógio de ponto para começar?', options: ['Sim, um Anviz.', 'Sim, qualquer marca.', 'Não. Basta o telemóvel de cada pessoa e o QR da empresa; um relógio Anviz CrossChex que já tenha também se liga.', 'Não, mas precisa de um tablet por pessoa.'], correct: 2, why: 'Sem relógio obrigatório. O QR pode ser impresso (custo zero) ou num tablet.' },
  { q: 'Quem pica no modo «só entrada e saída por QR» pode marcar a pausa de almoço?', options: ['Sim, com um terceiro botão.', 'Não. Esse modo só regista entrada e saída; quem marca pausas usa o ecrã completo.', 'Sim, se tiver Face ID.', 'Só no plano Universe.'], correct: 1, why: 'A picagem por QR só regista dois momentos. Prometer pausas aqui é prometer o que não existe.' },
  { q: 'O que torna o QR rotativo mais seguro do que o fixo?', options: ['Não verifica a localização.', 'Muda de 30 em 30 segundos, por isso uma fotografia do código deixa de servir.', 'Funciona sem internet.', 'Dispensa a aprovação do telemóvel.'], correct: 1, why: 'Nos dois casos a localização é verificada; o rotativo fecha a porta a partilhar uma fotografia.' },
  { q: 'A implementação e a migração de dados estão incluídas no plano?', options: ['Sim, em todos.', 'Só no Universe.', 'Não. São serviços adicionais, orçamentados à medida.', 'Sim, no contrato anual.'], correct: 2, why: 'Implementação, migração, formação, integrações e terminais físicos orçamentam-se à parte.' },
  { q: 'Qual destes módulos está em TODOS os planos?', options: ['Motor Automático', 'Caixa de Entrada', 'Formação', 'Copilot Workio'], correct: 1, why: 'Dashboard, Caixa de Entrada e Licenças & Planos estão sempre incluídos.' },
  { q: 'O Copilot Workio pode aprovar férias por pedido do gestor?', options: ['Sim, se o gestor pedir.', 'Sim, no Universe.', 'Não. O Copilot consulta e responde com a fonte; não altera dados.', 'Só férias de um dia.'], correct: 2, why: 'Não altera dados, não lê o conteúdo de documentos e não inventa.' },
  { q: 'Uma empresa com 60 trabalhadores pergunta pelo canal de denúncia. Em que plano está?', options: ['Pessoas', 'Professional', 'Business (e Universe)', 'Não existe no Workio'], correct: 2, why: 'O M27 Canal de Denúncia entra no Business. A Lei 93/2021 obriga entidades com 50 ou mais trabalhadores.' },
  { q: 'Que regra o «Guardião ACT» do Motor Automático vigia?', options: ['As 40 horas de formação.', 'O descanso mínimo de 11 horas entre turnos.', 'O IRS de cada mês.', 'As validades do EPI.'], correct: 1, why: 'Avisa quando alguém não teve 11 horas de descanso entre o fim de um turno e o início do seguinte.' },
  { q: 'Qual a melhor forma de terminar uma demonstração?', options: ['Mostrar os 26 módulos.', 'Enviar o preço por e-mail mais tarde.', 'Recomendar o plano, dizer o preço por colaborador e marcar o próximo passo com data.', 'Comparar com o preço dos concorrentes.'], correct: 2, why: 'Cada contacto avança uma etapa. Nunca se sai sem próximo passo marcado.' }
];

const PASS_MARK = 10;

// --- Sistema 2: SOL (hotelaria) - formacao original ---
const SOL_LESSONS: Lesson[] = [
  {
    title: '1. O que é o SOL',
    body: [
      'O SOL é a plataforma Workio de operação hoteleira que organiza housekeeping, manutenção e quartos em tempo real.',
      'Resolve dores como quartos prontos tarde, comunicação dispersa por WhatsApp e manutenção sem histórico.',
      'Público-alvo: hotéis independentes e grupos, sobretudo entre 20 e 150 quartos.'
    ]
  },
  {
    title: '2. Como funciona o housekeeping num hotel',
    body: [
      'A governanta distribui quartos pela equipa por zona e turno.',
      'A camareira limpa, segue uma checklist e marca o quarto como pronto.',
      'A supervisão inspeciona e liberta o quarto para a receção.',
      'Problemas viram tickets de manutenção. Entender este fluxo ajuda a falar a língua do cliente.'
    ]
  },
  {
    title: '3. Principais dores dos hotéis',
    body: [
      'Receção sem saber em tempo real que quartos estão prontos -> atrasos no check-in.',
      'Comunicação por WhatsApp/papel -> sem histórico, sem prioridade, sem auditoria.',
      'Manutenção desorganizada e sem responsável claro.',
      'Falta de relatórios e de visão da operação para a gestão.'
    ]
  },
  {
    title: '4. Como falar com cada pessoa',
    body: [
      'Receção: foco em saber quais quartos estão prontos (módulo mapa de quartos).',
      'Governanta: controlar equipa, limpezas e inspeções (tarefas, checklists, inspeção).',
      'Gerente: reduzir reclamações e ter relatórios (dashboard, relatórios, histórico).',
      'Dono: economia, controlo e profissionalização (ROI, sustentabilidade).',
      'Use o seletor de persona no Modo Demo para mostrar o discurso certo.'
    ]
  },
  {
    title: '5. Como fazer a demo',
    body: [
      'Confirme o contexto e relembre a dor antes de mostrar o sistema.',
      'Siga o Playbook de Demo (Ferramentas de Venda): mapa -> tarefa mobile -> checklist -> ticket -> dashboard -> relatórios.',
      'Termine sempre a marcar o próximo passo (trial, proposta ou nova reunião).'
    ]
  },
  {
    title: '6. Como preencher o CRM',
    body: [
      'Qualifique o lead antes da demo (botão Qualificar).',
      'Registe o resultado de cada chamada no Modo Play e deixe sempre uma próxima ação.',
      'Use sequências de follow-up para não perder o lead.'
    ]
  },
  {
    title: '7. Como fechar o próximo passo',
    body: [
      'O objetivo de cada contacto é avançar uma etapa, não vender tudo de uma vez.',
      'Peça sempre um compromisso concreto: data de demo, envio de proposta ou reunião com o decisor.',
      'Gere a proposta comercial e marque o pipeline.'
    ]
  }
];

// --- Sistema 3: Vender por segmento (gerado a partir de services/segments.ts) ---
const moduleName = (code: string) => WORKIO_MODULES.find((m) => m.code === code)?.name || code;

const SEGMENT_LESSONS: Lesson[] = SEGMENTS.map((s) => ({
  title: s.label,
  body: [
    `Produto: ${s.product}.`,
    `Decisor provável: ${s.contactRole}.`,
    `Dores típicas: ${s.painPoints.join('; ')}.`,
    `Módulos a destacar: ${s.keyModules.map(moduleName).join(', ')}.`,
    `Pitch: ${s.pitch}`
  ]
}));
// --- Um curso por área do Workio; cada módulo é uma lição, com o seu manual ---
const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ponto: Clock,
  talento: Users,
  salarios: Wallet,
  empresa: ShieldCheck
};

const planoDoModulo = (code: string) => WORKIO_PLANS.find((p) => planModuleCodes(p.id).includes(code));

const AREA_SYSTEMS: AcademySystem[] = WORKIO_AREAS.map((area) => {
  const mods = modulesByArea(area.id);
  return {
    id: `workio-${area.id}`,
    product: 'workio',
    name: `Workio · ${area.name}`,
    description: `${area.tagline} ${mods.length} módulos.`,
    icon: AREA_ICONS[area.id] || Layers,
    lessons: mods.map((m) => {
      const plano = planoDoModulo(m.code);
      return {
        title: `${m.code} · ${m.name}${m.tag ? ` (${m.tag})` : ''}`,
        body: [
          m.description,
          `Mostrar na demo: ${m.demo}.`,
          plano ? `Entra no ${plano.name} (e nos planos acima).` : 'Incluído em todos os planos.'
        ],
        manuais: MANUAL_DO_MODULO[m.code] ? [{ slug: MANUAL_DO_MODULO[m.code], nome: m.name }] : undefined
      };
    }),
    checklist: [
      `Conhece os ${mods.length} módulos desta área`,
      'Sabe fazer a demo de pelo menos 2 módulos',
      'Sabe a que tipo de empresa vender cada módulo'
    ]
  };
});

const SYSTEMS: AcademySystem[] = [
  {
    id: 'workio',
    product: 'workio',
    name: 'Workio · Visão geral',
    description: 'O produto, a lei, os planos, as objeções e a demonstração.',
    icon: Layers,
    lessons: WORKIO_LESSONS,
    checklist: [
      'Explicou o Workio em 30 segundos a um colega',
      'Fez uma demonstração completa de 30 minutos (simulada)',
      'Montou um preço no simulador para um cliente real',
      'Sabe responder às objeções sem consultar',
      'Sabe usar o Modo Play e registar notas e próxima ação'
    ]
  },
  ...AREA_SYSTEMS,
  {
    id: 'sol',
    product: 'sol',
    name: 'SOL · Hotelaria',
    description: 'Formação do sistema de housekeeping e operação hoteleira.',
    icon: Building2,
    lessons: SOL_LESSONS,
    checklist: [
      'Assistiu à formação do SOL (estas lições)',
      'Seguiu o roteiro da demo nas Ferramentas de venda',
      'Conhece os módulos principais do SOL',
      'Sabe qualificar um lead',
      'Sabe marcar uma demo',
      'Sabe usar o pipeline',
      'Sabe gerar uma proposta'
    ]
  },
  {
    id: 'segmentos',
    product: 'workio',
    name: 'Workio · Vender por segmento',
    description: 'Dores, decisor e pitch para cada mercado (rascunho a validar pela equipa).',
    icon: Target,
    lessons: SEGMENT_LESSONS,
    checklist: [
      'Leu as dores e o pitch de pelo menos 3 segmentos',
      'Fez uma prospeção num segmento que não seja hotelaria',
      'Adaptou o guião de chamada ao segmento'
    ]
  }
];

// Necessidades do cliente → plano mais baixo que as cobre.
const NECESSIDADES: { label: string; plano: WorkioPlan['id'] }[] = [
  { label: 'Picar o ponto, escalas e banco de horas', plano: 'pessoas' },
  { label: 'Recrutar, formar ou avaliar pessoas', plano: 'professional' },
  { label: 'Enviar o mês ao software de salários', plano: 'business' },
  { label: 'Despesas, SST, documentos ou inventário', plano: 'business' },
  { label: 'Canal de denúncia (50+ trabalhadores)', plano: 'business' },
  { label: 'Alertas automáticos (Motor Automático)', plano: 'business' },
  { label: 'Várias empresas / NIF numa conta', plano: 'universe' },
  { label: 'Assistente com IA (Copilot)', plano: 'universe' }
];

const LS_KEY = 'leadscope_academy_checklist_v2';
const LS_QUIZ = 'leadscope_academy_quiz_best';

type Progress = Record<string, boolean[]>;

const loadProgress = (): Progress => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved as Progress;
  } catch { /* sem armazenamento */ }
  return {};
};

const loadBest = (): number => {
  try { return Number(localStorage.getItem(LS_QUIZ)) || 0; } catch { return 0; }
};

const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

type Tab = 'cursos' | 'planos' | 'teste';

export default function Academy() {
  const [tab, setTab] = useState<Tab>('cursos');
  const [product, setProduct] = useState<CommercialSystem>('workio');
  const [systemId, setSystemId] = useState<string>(SYSTEMS[0].id);
  const [open, setOpen] = useState<number | null>(0);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [best, setBest] = useState<number>(loadBest);

  const [pessoas, setPessoas] = useState(25);
  const [planoId, setPlanoId] = useState<WorkioPlan['id']>('pessoas');
  const [needs, setNeeds] = useState<boolean[]>(NECESSIDADES.map(() => false));

  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  // Cada sistema tem a sua academia: so aparecem os cursos do sistema escolhido
  const courses = useMemo(() => SYSTEMS.filter((s) => s.product === product), [product]);
  const system = useMemo(() => courses.find((s) => s.id === systemId) || courses[0] || SYSTEMS[0], [courses, systemId]);
  const changeProduct = (p: CommercialSystem) => {
    setProduct(p);
    setSystemId(SYSTEMS.find((s) => s.product === p)?.id || '');
    setTab('cursos');
    setOpen(0);
  };
  const isWorkio = system.id === 'workio';

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch { /* sem armazenamento */ }
  }, [progress]);
  useEffect(() => {
    try { localStorage.setItem(LS_QUIZ, String(best)); } catch { /* sem armazenamento */ }
  }, [best]);

  const quizPassed = best >= PASS_MARK;
  const done: boolean[] = system.checklist.map((_, i) => Boolean(progress[system.id]?.[i]));
  const totalSteps = system.checklist.length + (isWorkio ? 1 : 0);
  const completed = done.filter(Boolean).length + (isWorkio && quizPassed ? 1 : 0);
  const approved = completed === totalSteps;
  const pct = Math.round((completed / totalSteps) * 100);

  const toggle = (i: number) =>
    setProgress((prev) => {
      const current = system.checklist.map((_, idx) => Boolean(prev[system.id]?.[idx]));
      current[i] = !current[i];
      return { ...prev, [system.id]: current };
    });

  const systemPct = (s: AcademySystem) => {
    const extra = s.id === 'workio' ? 1 : 0;
    const n = s.checklist.filter((_, i) => progress[s.id]?.[i]).length + (s.id === 'workio' && quizPassed ? 1 : 0);
    return Math.round((n / (s.checklist.length + extra)) * 100);
  };

  const recomendado = useMemo(() => {
    const ordem = WORKIO_PLANS.map((p) => p.id);
    let idx = 0;
    needs.forEach((on, i) => { if (on) idx = Math.max(idx, ordem.indexOf(NECESSIDADES[i].plano)); });
    return WORKIO_PLANS[idx];
  }, [needs]);

  const plano = WORKIO_PLANS.find((p) => p.id === planoId)!;
  const n = Math.max(0, Math.floor(pessoas || 0));
  const mensal = plano.price * n;

  const score = QUIZ.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const allAnswered = answers.every((a) => a !== null);
  const submitQuiz = () => { setSubmitted(true); setBest((b) => Math.max(b, score)); };
  const resetQuiz = () => { setAnswers(QUIZ.map(() => null)); setSubmitted(false); };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'cursos', label: 'Cursos', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'planos', label: 'Planos e simulador', icon: <Calculator className="h-3.5 w-3.5" /> },
    { id: 'teste', label: `Teste final${quizPassed ? ' ✓' : ''}`, icon: <ClipboardCheck className="h-3.5 w-3.5" /> }
  ];

  // Planos/simulador e teste final so existem na academia do Workio
  const visibleTabs = TABS.filter((t) => product === 'workio' || t.id === 'cursos');

  const productIntro: Record<CommercialSystem, string> = {
    workio: 'Formação para vender o Workio com rigor, mesmo sendo novo na equipa. O conteúdo vem do próprio Workio e dos seus manuais.',
    sol: 'Formação para vender o SOL, o sistema de housekeeping e operação hoteleira.',
    emet: 'Formação para vender o EMET.'
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><GraduationCap className="h-5 w-5 text-emerald-500" /> Academia</h2>
        <p className="mt-1 max-w-2xl text-xs text-gray-400">{productIntro[product]}</p>
      </div>
      <ProductSwitch value={product} onChange={changeProduct} />
    </div>
  );

  if (courses.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState
          title="A academia do EMET ainda não tem cursos"
          text="Quando o plano de venda do EMET estiver fechado, os cursos, o roteiro e o teste do EMET aparecem aqui, separados da academia do Workio e do SOL."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {visibleTabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${tab === t.id ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400' : 'border-gray-800 text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── CURSOS ── */}
      {tab === 'cursos' && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {courses.map((s) => {
              const Icon = s.icon;
              const active = s.id === system.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSystemId(s.id); setOpen(0); }}
                  className={`rounded-lg border p-4 text-left transition ${active ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-gray-800 bg-ai-card hover:border-gray-600'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-bold text-white"><Icon className="h-4 w-4 text-emerald-400" />{s.name}</span>
                    <span className="font-mono text-[10px] text-gray-500">{systemPct(s)}%</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{s.description}</p>
                  <div className="mt-2 text-[10px] text-gray-500">{s.lessons.length} lições</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-2">
              {system.lessons.map((lesson, i) => (
                <div key={lesson.title} className="overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
                  <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                    <span className="flex items-center gap-2 text-sm font-bold text-white"><BookOpen className="h-4 w-4 shrink-0 text-emerald-400" />{lesson.title}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && (
                    <div className="space-y-3 border-t border-gray-800 px-4 py-3">
                      {lesson.objetivo && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Objetivo: <span className="normal-case tracking-normal text-gray-300">{lesson.objetivo}</span></p>
                      )}
                      <ul className="space-y-2">
                        {lesson.body.map((p, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs leading-relaxed text-gray-300"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />{p}</li>
                        ))}
                      </ul>
                      {lesson.frase && (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs italic text-emerald-300">
                          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0" />«{lesson.frase}»
                        </div>
                      )}
                      {lesson.manuais && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-gray-500">No manual do Workio:</span>
                          {lesson.manuais.map((m) => (
                            <a key={m.slug} href={MANUAL_BASE + m.slug} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded border border-gray-700 px-2 py-0.5 text-[11px] text-sky-300 hover:bg-gray-800/40">
                              {m.nome}<ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div className={`rounded-lg border p-5 ${approved ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-gray-800 bg-ai-card'}`}>
                <div className="flex items-center gap-2">
                  <Award className={`h-5 w-5 ${approved ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <h3 className="text-sm font-bold text-white">{isWorkio ? 'Vendedor aprovado para vender Workio' : `Aprovado em ${system.name}`}</h3>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ai-dark">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-gray-500">{completed}/{totalSteps} concluído</div>

                <div className="mt-4 space-y-2">
                  {isWorkio && (
                    <button onClick={() => setTab('teste')} className="flex w-full items-start gap-2 text-left text-xs text-gray-300">
                      {quizPassed ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                      <span>Teste final aprovado (melhor nota {best}/{QUIZ.length}, mínimo {PASS_MARK})</span>
                    </button>
                  )}
                  {system.checklist.map((item, i) => (
                    <button key={item} onClick={() => toggle(i)} className="flex w-full items-start gap-2 text-left text-xs text-gray-300">
                      {done[i] ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                      <span className={done[i] ? 'text-gray-400 line-through' : ''}>{item}</span>
                    </button>
                  ))}
                </div>

                {approved && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                    <Award className="h-4 w-4" /> Parabéns! Concluiu a formação em {system.name}.
                  </div>
                )}
              </div>

              {isWorkio && (
                <div className="rounded-lg border border-rose-500/20 bg-ai-card p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300"><ShieldAlert className="h-4 w-4" /> Nunca dizer</h3>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed text-gray-400">
                    <li>• Que o Workio processa salários.</li>
                    <li>• Que a implementação está incluída.</li>
                    <li>• Que o Copilot está em todos os planos.</li>
                    <li>• Que o QR regista pausas.</li>
                    <li>• Preços com IVA ou de concorrentes.</li>
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><PlayCircle className="h-4 w-4 text-emerald-400" /> Praticar</h3>
                <p className="text-[11px] leading-relaxed text-gray-400">Treine com o <span className="font-bold text-emerald-300">Roteiro da demo</span> e com os <span className="font-bold text-emerald-300">Argumentos</span> (Ferramentas de venda): leia as respostas em voz alta e use a calculadora num caso de exemplo.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── PLANOS E SIMULADOR ── */}
      {tab === 'planos' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {WORKIO_PLANS.map((p) => (
              <div key={p.id} className={`rounded-lg border bg-ai-card p-3 ${p.highlight ? 'border-emerald-500/40' : 'border-gray-800'}`}>
                {p.highlight && <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">{p.highlight}</div>}
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="mt-1 text-lg font-bold text-white">{eur(p.price)}<span className="text-[11px] font-normal text-gray-500"> /colab./mês</span></div>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{p.tagline}</p>
                <div className="mt-2 text-[11px] text-gray-500">{planModuleCodes(p.id).length} módulos + Dashboard, Caixa de Entrada e Licenças</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-1 text-sm font-bold text-white">Que plano recomendar?</h3>
            <p className="mb-3 text-[11px] text-gray-400">Marque o que o cliente disse na descoberta. A recomendação é o plano mais baixo que cobre tudo.</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {NECESSIDADES.map((nd, i) => (
                <button key={nd.label} onClick={() => setNeeds((prev) => prev.map((v, idx) => (idx === i ? !v : v)))} className="flex items-start gap-2 text-left text-xs text-gray-300">
                  {needs[i] ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                  {nd.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
              Recomendado: <span className="rounded border border-emerald-500/40 px-2 py-0.5 font-bold text-emerald-300">{recomendado.name}</span>
              <button onClick={() => setPlanoId(recomendado.id)} className="rounded border border-gray-700 px-2 py-0.5 text-[11px] text-gray-300 hover:bg-gray-800/40">Usar no simulador</button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-3 text-sm font-bold text-white">Simulador de preço</h3>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs text-gray-400">
                Colaboradores ativos
                <input type="number" min={0} value={pessoas} onChange={(e) => setPessoas(Number(e.target.value))} className="mt-1 block w-28 rounded-lg border border-gray-700 bg-ai-dark px-2 py-1.5 text-sm text-white" />
              </label>
              <label className="text-xs text-gray-400">
                Plano
                <select value={planoId} onChange={(e) => setPlanoId(e.target.value as WorkioPlan['id'])} className="mt-1 block rounded-lg border border-gray-700 bg-ai-dark px-2 py-1.5 text-sm text-white">
                  {WORKIO_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatPlanPrice(p.price)}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-800 p-3"><div className="text-[11px] text-gray-500">Por mês, sem IVA</div><div className="text-lg font-bold text-white">{eur(mensal)}</div></div>
              <div className="rounded-lg border border-gray-800 p-3"><div className="text-[11px] text-gray-500">Por mês, com IVA (23%)</div><div className="text-lg font-bold text-white">{eur(mensal * 1.23)}</div></div>
              <div className="rounded-lg border border-gray-800 p-3"><div className="text-[11px] text-gray-500">12 meses, sem IVA</div><div className="text-lg font-bold text-white">{eur(mensal * 12)}</div></div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-500">Referência para a conversa, não é proposta. O contrato anual tem condições especiais definidas na contratação; implementação, migração, formação, integrações e terminais físicos orçamentam-se à parte. Ao cliente fala-se sempre em preços sem IVA.</p>
          </div>
        </div>
      )}

      {/* ── TESTE FINAL ── */}
      {tab === 'teste' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{QUIZ.length} perguntas sobre o Workio. Aprovação com {PASS_MARK} ou mais certas; conta para a certificação «Workio · Visão geral». Pode repetir; fica a melhor nota ({best}/{QUIZ.length}).</p>
          {QUIZ.map((q, i) => (
            <div key={q.q} className="rounded-lg border border-gray-800 bg-ai-card p-4">
              <div className="mb-2 text-sm font-bold text-white">{i + 1}. {q.q}</div>
              <div className="space-y-1.5">
                {q.options.map((opt, j) => {
                  const chosen = answers[i] === j;
                  const right = submitted && j === q.correct;
                  const wrong = submitted && chosen && j !== q.correct;
                  return (
                    <button key={opt} disabled={submitted} onClick={() => setAnswers((prev) => prev.map((v, idx) => (idx === i ? j : v)))}
                      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${right ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : wrong ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : chosen ? 'border-sky-500/40 text-white' : 'border-gray-800 text-gray-300 hover:bg-gray-800/40'}`}>
                      {right ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : wrong ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : chosen ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{q.why}</p>}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {!submitted ? (
              <button disabled={!allAnswered} onClick={submitQuiz} className={`rounded-lg px-4 py-2 text-xs font-bold ${allAnswered ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'cursor-not-allowed border border-gray-800 text-gray-500'}`}>
                {allAnswered ? 'Corrigir teste' : `Responda a todas (${answers.filter((a) => a !== null).length}/${QUIZ.length})`}
              </button>
            ) : (
              <>
                <span className={`text-sm font-bold ${score >= PASS_MARK ? 'text-emerald-400' : 'text-rose-300'}`}>{score}/{QUIZ.length} — {score >= PASS_MARK ? 'Aprovado' : 'Ainda não'}</span>
                <button onClick={resetQuiz} className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-gray-800/40"><RotateCcw className="h-3.5 w-3.5" /> Repetir</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
