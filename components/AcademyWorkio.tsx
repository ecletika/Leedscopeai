import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calculator,
  CheckCircle,
  ChevronDown,
  Circle,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  MessageSquareQuote,
  RotateCcw,
  ShieldAlert,
  XCircle
} from 'lucide-react';

/*
 * Academia Workio — formação comercial para vender o Workio.
 *
 * O conteúdo sai do próprio Workio (repositório ecletika/workio):
 * - planos, preços e módulos de cada plano: src/lib/modulos/catalogo.ts
 * - argumentos, perguntas frequentes e serviços: landing/pagina.html (workio.pt)
 * - funcionamento de cada módulo: public/manuais/*.md (centro de ajuda)
 * Quando um destes mudar no Workio, esta página tem de mudar com ele.
 */

const MANUAL_BASE = 'https://app.workio.pt/manuais?m=';

type PlanoId = 'pessoas' | 'professional' | 'business' | 'universe';

interface Plano {
  id: PlanoId;
  nome: string;
  preco: number;
  resumo: string;
  paraQuem: string;
}

const PLANOS: Plano[] = [
  { id: 'pessoas', nome: 'Workio Pessoas', preco: 3.9, resumo: 'Gestão operacional de pessoas, horários e assiduidade.', paraQuem: 'PME que querem digitalizar o dia a dia: ponto, escalas, banco de horas e relatórios.' },
  { id: 'professional', nome: 'Workio Professional', preco: 6.9, resumo: 'Gestão de pessoas e desenvolvimento de talento.', paraQuem: 'Empresas que querem profissionalizar o recrutamento, a formação e a avaliação.' },
  { id: 'business', nome: 'Workio Business', preco: 10.9, resumo: 'Recursos Humanos e operações numa só plataforma.', paraQuem: 'Empresas que querem centralizar o administrativo, o financeiro, o operacional e o documental.' },
  { id: 'universe', nome: 'Workio Universe', preco: 14.9, resumo: 'Todos os módulos, Multi-NIF e inteligência artificial.', paraQuem: 'Empresas e grupos com várias empresas (NIF) ou que querem o Copilot com IA.' }
];

const ORDEM: PlanoId[] = ['pessoas', 'professional', 'business', 'universe'];

interface Modulo {
  code: string;
  nome: string;
  plano: PlanoId | 'todos';
  oQueResolve: string;
  manual?: string;
}

const MODULOS: Modulo[] = [
  { code: 'DASH', nome: 'Dashboard', plano: 'todos', oQueResolve: 'Página inicial com os indicadores do dia, com widgets que cada um organiza.', manual: '08-dashboard' },
  { code: 'M24', nome: 'Caixa de Entrada', plano: 'todos', oQueResolve: 'Correções, férias, banco de horas e acessos à espera de decisão, num só sítio. Fica escrito quem decidiu.', manual: '03-caixa-entrada' },
  { code: 'M19', nome: 'Licenças & Planos', plano: 'todos', oQueResolve: 'O plano da empresa, as licenças em uso e livres, e o pedido de mais licenças.', manual: '25-licencas-planos' },
  { code: 'M01', nome: 'Controlo de Ponto', plano: 'pessoas', oQueResolve: 'Picagem no telemóvel por QR, rosto ou digital. Atrasos, faltas e picagens em falta aparecem no próprio dia.', manual: '01-controlo-de-ponto' },
  { code: 'M03', nome: 'Gestão de Pessoas', plano: 'pessoas', oQueResolve: 'Fichas, férias, ausências, organograma, onboarding e saídas de quem sai.', manual: '02-pessoas' },
  { code: 'M13', nome: 'Terminal em Dispositivo', plano: 'pessoas', oQueResolve: 'Um tablet à porta faz de relógio de ponto. O relógio Anviz CrossChex que o cliente já tem também se liga.', manual: '22-terminal' },
  { code: 'M18', nome: 'Escalas Gráficas', plano: 'pessoas', oQueResolve: 'Os turnos da semana montados num quadro e publicados à equipa, com folgas e férias à vista.', manual: '07-escalas-graficas' },
  { code: 'M17', nome: 'Banco de Horas', plano: 'pessoas', oQueResolve: 'Saldos que se calculam sozinhos, com as regras da empresa e de cada contrato (art. 208.º-B ou IRCT).', manual: '06-banco-de-horas' },
  { code: 'M14', nome: 'Relatórios', plano: 'pessoas', oQueResolve: 'Mapas de ponto, horas e pessoas em PDF ou Excel, enviados por e-mail sozinhos.', manual: '04-relatorios' },
  { code: 'M07', nome: 'Recrutamento e ATS', plano: 'professional', oQueResolve: 'Vagas, quadro de candidatos, triagem, entrevistas e página de carreiras com a marca da empresa.', manual: '16-recrutamento' },
  { code: 'M08', nome: 'Formação / LMS', plano: 'professional', oQueResolve: 'Cursos com vídeo, PDF e teste, certificados e as 40 horas por ano contadas, com o crédito de cada um.', manual: '17-formacao' },
  { code: 'M06', nome: 'Avaliação de Desempenho', plano: 'professional', oQueResolve: 'Ciclos de avaliação, objetivos com check-ins, calibração, feedback e conversas 1:1.', manual: '15-desempenho' },
  { code: 'M16', nome: 'Plano de Carreira', plano: 'professional', oQueResolve: 'Funções, competências, progressão e quem está pronto para suceder a quem.', manual: '24-carreira' },
  { code: 'M11', nome: 'Bem-estar', plano: 'professional', oQueResolve: 'Carga de trabalho, risco de saída e um pulse anónimo, para agir antes de alguém se despedir.', manual: '20-bem-estar' },
  { code: 'M04', nome: 'Integração de Salários', plano: 'business', oQueResolve: 'NÃO processa salários: envia o mês (faltas, horas extra, subsídios, despesas) ao software da empresa e traz os recibos de volta.', manual: '13-salarios' },
  { code: 'M05', nome: 'Despesas e Subsídios', plano: 'business', oQueResolve: 'Notas de despesa com fotografia do talão, quilómetros, subsídio de refeição e aprovações.', manual: '14-despesas-subsidios' },
  { code: 'M15', nome: 'Benchmarking Salarial', plano: 'business', oQueResolve: 'Salários da empresa comparados com o mercado, propostas de aumento e revisão anual.', manual: '23-benchmarking' },
  { code: 'M10', nome: 'Comunicação Interna', plano: 'business', oQueResolve: 'Comunicados com leitura confirmada, conversas, grupos e chamadas de voz e vídeo.', manual: '19-comunicacao' },
  { code: 'M23', nome: 'Eventos Operacionais', plano: 'business', oQueResolve: 'Eventos com equipas e escalas próprias, reserva de pessoas e conflitos à vista.', manual: '28-eventos-operacionais' },
  { code: 'M20', nome: 'Inventário', plano: 'business', oQueResolve: 'Computadores, telemóveis, stock e viaturas atribuídos a pessoas, com comprovativo de entrega.', manual: '26-inventario' },
  { code: 'M09', nome: 'Workio SST', plano: 'business', oQueResolve: 'Medicina do trabalho, avaliação de riscos, inspeções, EPI e acidentes, com avisos antes de cada validade.', manual: '18-sst' },
  { code: 'M26', nome: 'Documentação', plano: 'business', oQueResolve: 'Arquivo da empresa e de cada pessoa, com validades, modelos, assinaturas e políticas.', manual: '29-documentacao' },
  { code: 'M27', nome: 'Canal de Denúncia', plano: 'business', oQueResolve: 'Denúncias anónimas ou identificadas, cifradas, com os prazos da Lei 93/2021.', manual: '30-canal-denuncia' },
  { code: 'M25', nome: 'Manuais', plano: 'business', oQueResolve: 'Guias passo a passo de cada módulo, para o RH e para a equipa.' },
  { code: 'M02', nome: 'Motor Automático', plano: 'business', oQueResolve: 'Vigilâncias que correm todas as noites: picagens em falta, descanso de 11h, terminais desligados, relatórios ACT.', manual: '12-motor-automatico' },
  { code: 'M12', nome: 'Multi-NIF', plano: 'universe', oQueResolve: 'Várias empresas do mesmo grupo numa só conta, cada uma com os seus dados e licenças.', manual: '21-multi-nif' },
  { code: 'M21', nome: 'Copilot Workio', plano: 'universe', oQueResolve: 'Perguntas em português, respostas com os dados da empresa e a fonte de cada número.', manual: '27-copilot' }
];

interface Lesson {
  title: string;
  objetivo: string;
  body: string[];
  frase?: string;
  manuais?: { slug: string; nome: string }[];
}

const LESSONS: Lesson[] = [
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
    title: '12. O que nunca se diz',
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

const PRACTICE = [
  'Expliquei o Workio em 30 segundos a um colega',
  'Fiz uma demonstração completa de 30 minutos (simulada)',
  'Montei um preço no simulador para um cliente real',
  'Sei responder às 9 objeções sem consultar'
];

const LS_KEY = 'leadscope_academy_workio_v1';

interface Progress {
  read: boolean[];
  practice: boolean[];
  bestScore: number;
}

const freshProgress = (): Progress => ({
  read: LESSONS.map(() => false),
  practice: PRACTICE.map(() => false),
  bestScore: 0
});

function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && Array.isArray(saved.read) && saved.read.length === LESSONS.length && Array.isArray(saved.practice) && saved.practice.length === PRACTICE.length) {
      return { read: saved.read, practice: saved.practice, bestScore: Number(saved.bestScore) || 0 };
    }
  } catch { /* sem armazenamento: começa do zero */ }
  return freshProgress();
}

const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

const planoNome = (p: PlanoId | 'todos') => (p === 'todos' ? 'Todos os planos' : PLANOS.find((x) => x.id === p)!.nome.replace('Workio ', ''));

const PLANO_COR: Record<PlanoId | 'todos', string> = {
  todos: 'border-gray-700 text-gray-300',
  pessoas: 'border-sky-500/40 text-sky-300',
  professional: 'border-violet-500/40 text-violet-300',
  business: 'border-amber-500/40 text-amber-300',
  universe: 'border-emerald-500/40 text-emerald-300'
};

const incluiModulo = (plano: PlanoId, m: Modulo) => m.plano === 'todos' || ORDEM.indexOf(m.plano) <= ORDEM.indexOf(plano);

// Necessidades do cliente → plano mínimo que as cobre.
const NECESSIDADES: { label: string; plano: PlanoId }[] = [
  { label: 'Picar o ponto, escalas e banco de horas', plano: 'pessoas' },
  { label: 'Recrutar, formar ou avaliar pessoas', plano: 'professional' },
  { label: 'Enviar o mês ao software de salários', plano: 'business' },
  { label: 'Despesas, SST, documentos ou inventário', plano: 'business' },
  { label: 'Canal de denúncia (50+ trabalhadores)', plano: 'business' },
  { label: 'Alertas automáticos (Motor Automático)', plano: 'business' },
  { label: 'Várias empresas / NIF numa conta', plano: 'universe' },
  { label: 'Assistente com IA (Copilot)', plano: 'universe' }
];

type Tab = 'licoes' | 'modulos' | 'planos' | 'teste';

export default function AcademyWorkio() {
  const [tab, setTab] = useState<Tab>('licoes');
  const [open, setOpen] = useState<number | null>(0);
  const [progress, setProgress] = useState<Progress>(loadProgress);

  // simulador
  const [pessoas, setPessoas] = useState(25);
  const [plano, setPlano] = useState<PlanoId>('pessoas');
  const [needs, setNeeds] = useState<boolean[]>(NECESSIDADES.map(() => false));

  // teste
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch { /* sem armazenamento */ }
  }, [progress]);

  const recomendado: PlanoId = useMemo(() => {
    let idx = 0;
    needs.forEach((on, i) => { if (on) idx = Math.max(idx, ORDEM.indexOf(NECESSIDADES[i].plano)); });
    return ORDEM[idx];
  }, [needs]);

  const lessonsRead = progress.read.filter(Boolean).length;
  const practiceDone = progress.practice.filter(Boolean).length;
  const quizPassed = progress.bestScore >= PASS_MARK;
  const totalSteps = LESSONS.length + PRACTICE.length + 1;
  const doneSteps = lessonsRead + practiceDone + (quizPassed ? 1 : 0);
  const approved = doneSteps === totalSteps;
  const pct = Math.round((doneSteps / totalSteps) * 100);

  const score = QUIZ.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const allAnswered = answers.every((a) => a !== null);

  const markRead = (i: number) => setProgress((p) => ({ ...p, read: p.read.map((v, idx) => (idx === i ? !v : v)) }));
  const togglePractice = (i: number) => setProgress((p) => ({ ...p, practice: p.practice.map((v, idx) => (idx === i ? !v : v)) }));

  const submitQuiz = () => {
    setSubmitted(true);
    setProgress((p) => ({ ...p, bestScore: Math.max(p.bestScore, score) }));
  };
  const resetQuiz = () => { setAnswers(QUIZ.map(() => null)); setSubmitted(false); };

  const precoPlano = PLANOS.find((p) => p.id === plano)!.preco;
  const n = Math.max(0, Math.floor(pessoas || 0));
  const mensal = precoPlano * n;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'licoes', label: 'Lições', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'modulos', label: 'Módulos', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: 'planos', label: 'Planos e simulador', icon: <Calculator className="h-3.5 w-3.5" /> },
    { id: 'teste', label: 'Teste final', icon: <ClipboardCheck className="h-3.5 w-3.5" /> }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><GraduationCap className="h-5 w-5 text-emerald-500" /> Academia Workio</h2>
        <p className="mt-1 text-xs text-gray-400">Formação para vender o Workio com rigor: o produto, a lei, os planos, as objeções e a demonstração. Conteúdo tirado do próprio Workio e dos seus manuais.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${tab === t.id ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400' : 'border-gray-800 text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* ── LIÇÕES ── */}
          {tab === 'licoes' && (
            <div className="space-y-2">
              {LESSONS.map((lesson, i) => (
                <div key={lesson.title} className="overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
                  <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                    <span className="flex items-center gap-2 text-sm font-bold text-white">
                      {progress.read[i] ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" /> : <BookOpen className="h-4 w-4 shrink-0 text-gray-500" />}
                      {lesson.title}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && (
                    <div className="space-y-3 border-t border-gray-800 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Objetivo: <span className="normal-case tracking-normal text-gray-300">{lesson.objetivo}</span></p>
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
                      <div className="flex justify-between gap-2 pt-1">
                        <button onClick={() => markRead(i)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${progress.read[i] ? 'border-gray-700 text-gray-400' : 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400'}`}>
                          {progress.read[i] ? 'Marcar como não lida' : 'Marcar como lida'}
                        </button>
                        {i < LESSONS.length - 1 && (
                          <button onClick={() => { if (!progress.read[i]) markRead(i); setOpen(i + 1); }} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-gray-800/40">Lida — seguinte →</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MÓDULOS ── */}
          {tab === 'modulos' && (
            <div className="space-y-5">
              {(['todos', ...ORDEM] as (PlanoId | 'todos')[]).map((grupo) => {
                const lista = MODULOS.filter((m) => m.plano === grupo);
                return (
                  <div key={grupo}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {grupo === 'todos' ? 'Incluídos em todos os planos' : `Entram no ${planoNome(grupo)}`}
                      <span className="ml-2 normal-case tracking-normal text-gray-500">({lista.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {lista.map((m) => (
                        <div key={m.code} className="rounded-lg border border-gray-800 bg-ai-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-bold text-white"><span className="mr-1.5 font-mono text-[11px] text-gray-500">{m.code}</span>{m.nome}</div>
                            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${PLANO_COR[m.plano]}`}>{planoNome(m.plano)}</span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{m.oQueResolve}</p>
                          {m.manual && (
                            <a href={MANUAL_BASE + m.manual} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-300 hover:underline">Abrir manual<ExternalLink className="h-3 w-3" /></a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-gray-500">Cada plano inclui todos os módulos dos planos anteriores. Os manuais abrem no Workio e pedem sessão iniciada.</p>
            </div>
          )}

          {/* ── PLANOS E SIMULADOR ── */}
          {tab === 'planos' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PLANOS.map((p) => (
                  <div key={p.id} className={`rounded-lg border bg-ai-card p-3 ${p.id === 'universe' ? 'border-emerald-500/40' : 'border-gray-800'}`}>
                    {p.id === 'universe' && <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Mais completo</div>}
                    <div className="text-sm font-bold text-white">{p.nome}</div>
                    <div className="mt-1 text-lg font-bold text-white">{eur(p.preco)}<span className="text-[11px] font-normal text-gray-500"> /colab./mês</span></div>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{p.paraQuem}</p>
                    <div className="mt-2 text-[11px] text-gray-500">{MODULOS.filter((m) => m.plano !== 'todos' && incluiModulo(p.id, m)).length} módulos + os 3 de base</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
                <h3 className="mb-3 text-sm font-bold text-white">Que plano recomendar?</h3>
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
                  Recomendado: <span className={`rounded border px-2 py-0.5 font-bold ${PLANO_COR[recomendado]}`}>{PLANOS.find((p) => p.id === recomendado)!.nome}</span>
                  <button onClick={() => setPlano(recomendado)} className="rounded border border-gray-700 px-2 py-0.5 text-[11px] text-gray-300 hover:bg-gray-800/40">Usar no simulador</button>
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
                    <select value={plano} onChange={(e) => setPlano(e.target.value as PlanoId)} className="mt-1 block rounded-lg border border-gray-700 bg-ai-dark px-2 py-1.5 text-sm text-white">
                      {PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome} — {eur(p.preco)}</option>)}
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

          {/* ── TESTE ── */}
          {tab === 'teste' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">{QUIZ.length} perguntas. Aprovação com {PASS_MARK} ou mais certas. Pode repetir as vezes que quiser; conta a melhor nota.</p>
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

        {/* ── CERTIFICAÇÃO ── */}
        <div className="flex flex-col gap-4">
          <div className={`rounded-lg border p-5 ${approved ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-gray-800 bg-ai-card'}`}>
            <div className="flex items-center gap-2">
              <Award className={`h-5 w-5 ${approved ? 'text-emerald-400' : 'text-gray-500'}`} />
              <h3 className="text-sm font-bold text-white">Vendedor aprovado para vender Workio</h3>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ai-dark">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-gray-500">{doneSteps}/{totalSteps} passos</div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-gray-300">
                {lessonsRead === LESSONS.length ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                <span>Lições lidas: {lessonsRead}/{LESSONS.length}</span>
              </div>
              <div className="flex items-start gap-2 text-gray-300">
                {quizPassed ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                <span>Teste final: melhor nota {progress.bestScore}/{QUIZ.length} (mínimo {PASS_MARK})</span>
              </div>
              <div className="pt-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Prática</div>
              {PRACTICE.map((item, i) => (
                <button key={item} onClick={() => togglePractice(i)} className="flex w-full items-start gap-2 text-left text-gray-300">
                  {progress.practice[i] ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                  <span className={progress.practice[i] ? 'text-gray-400 line-through' : ''}>{item}</span>
                </button>
              ))}
            </div>

            {approved && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                <Award className="h-4 w-4" /> Parabéns! Está pronto para vender o Workio.
              </div>
            )}
          </div>

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

          <div className="rounded-lg border border-gray-800 bg-ai-card p-4 text-[11px] leading-relaxed text-gray-400">
            O progresso fica guardado neste navegador. Página de preços pública: <a href="https://workio.pt" target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">workio.pt</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
