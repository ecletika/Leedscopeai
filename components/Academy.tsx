import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle,
  ChevronDown,
  Circle,
  Clock,
  GraduationCap,
  Layers,
  PlayCircle,
  ShieldCheck,
  Target,
  Users,
  Wallet
} from 'lucide-react';
import { SEGMENTS } from '../services/segments';
import { WORKIO_AREAS, WORKIO_MODULES, WORKIO_PLANS, formatPlanPrice, modulesByArea } from '../services/workioModules';

interface Lesson {
  title: string;
  body: string[];
}

interface AcademySystem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  lessons: Lesson[];
  checklist: string[];
}

// --- Sistema 1: Workio (visao geral da plataforma e da venda) ---
const WORKIO_LESSONS: Lesson[] = [
  {
    title: '1. O que é o Workio',
    body: [
      'O Workio é a plataforma de RH e gestão de pessoas da empresa: ponto, escalas, férias, avaliação, recrutamento, formação, SST, canal de denúncia e muito mais.',
      'É modular: "Todos os módulos. Liga só os que a sua empresa precisa, quando precisar."',
      'Quatro áreas: Ponto e pessoas, Talento, Salários e despesas, e Empresa (ver os cursos ao lado).',
      'O Workio não processa salários: envia o mês ao software que a empresa já usa (PHC, Sage, Primavera, CentralGest ou outro).',
      'O SOL é um sistema à parte, de housekeeping e operação, só para hotelaria.'
    ]
  },
  {
    title: '2. A quem vendemos',
    body: [
      'Empresas com equipas que picam ponto, trabalham por turnos ou têm vários locais: restauração, retalho, clínicas, ginásios, limpezas, construção, logística, oficinas, escolas e hotéis.',
      'Use a Nova Prospeção para escolher o segmento: o sistema ajusta a pesquisa, a análise e o decisor provável (gerente, diretor de RH, proprietário).',
      'Priorize empresas com 20+ colaboradores, turnos ou várias lojas. Com 50+ colaboradores o Canal de Denúncia é obrigatório (Lei 93/2021).'
    ]
  },
  {
    title: '3. Planos e preços',
    body: WORKIO_PLANS.map((p, i) =>
      `${p.name} · ${formatPlanPrice(p.price)}${p.highlight ? ` (${p.highlight})` : ''}: ${i === 0 ? 'inclui' : 'tudo do plano anterior, mais'} ${p.ownModules.join(', ')}.`
    ).concat([
      'Os preços são por colaborador por mês. Cada plano inclui os módulos do plano anterior.',
      'Regra prática: comece pelo plano que resolve a dor principal (ponto e escalas) e mostre o que o plano seguinte acrescenta.'
    ])
  },
  {
    title: '4. Fluxo comercial no CRM',
    body: [
      'Prospetar -> guardar no CRM -> Modo Play (chamada) -> registar resultado e próxima ação -> demo -> proposta -> contrato.',
      'Regra de ouro: nenhum lead contactado fica sem próximo passo e sem notas da chamada.',
      'Use o Banco de Objeções e os Scripts no Modo Play.'
    ]
  },
  {
    title: '5. Como responder objeções comuns',
    body: [
      'Nunca discuta. Concorde, faça uma pergunta e mostre valor.',
      '"Já usamos folhas de cálculo" -> "Perfeito, muitos começam assim. Quanto tempo o RH gasta a fechar o mês de ponto e horas?"',
      '"Já temos relógio de ponto" -> "O Workio funciona com o terminal que já tem (por exemplo Anviz) e acrescenta escalas, banco de horas e relatórios."',
      '"Já temos software de salários" -> "Não o substituímos: enviamos o mês ao seu software e os recibos voltam para a ficha de cada pessoa."',
      '"Não temos orçamento" -> comece só pelo módulo de que precisa; cada módulo liga-se quando for necessário.'
    ]
  }
];

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

// --- Um curso por area do Workio; cada modulo e uma licao ---
const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ponto: Clock,
  talento: Users,
  salarios: Wallet,
  empresa: ShieldCheck
};

const AREA_SYSTEMS: AcademySystem[] = WORKIO_AREAS.map((area) => {
  const mods = modulesByArea(area.id);
  return {
    id: `workio-${area.id}`,
    name: `Workio · ${area.name}`,
    description: `${area.tagline} ${mods.length} módulos.`,
    icon: AREA_ICONS[area.id] || Layers,
    lessons: mods.map((m) => ({
      title: `${m.code} · ${m.name}${m.tag ? ` (${m.tag})` : ''}`,
      body: [m.description, `Mostrar na demo: ${m.demo}.`]
    })),
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
    name: 'Workio · Visão geral',
    description: 'O que é o Workio, a quem vendemos e como funciona o processo comercial.',
    icon: Layers,
    lessons: WORKIO_LESSONS,
    checklist: [
      'Percebe o que é o Workio e para quem serve',
      'Sabe escolher o segmento na Nova Prospeção',
      'Sabe usar o Modo Play e registar notas e próxima ação',
      'Sabe responder às objeções mais comuns'
    ]
  },
  ...AREA_SYSTEMS,
  {
    id: 'sol',
    name: 'SOL · Hotelaria',
    description: 'Formação do sistema de housekeeping e operação hoteleira.',
    icon: Building2,
    lessons: SOL_LESSONS,
    checklist: [
      'Assistiu à formação do SOL (estas lições)',
      'Fez pelo menos uma simulação no Simulador IA',
      'Conhece os módulos principais do SOL',
      'Sabe qualificar um lead',
      'Sabe marcar uma demo',
      'Sabe usar o pipeline',
      'Sabe gerar uma proposta'
    ]
  },
  {
    id: 'segmentos',
    name: 'Vender por segmento',
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

const LS_KEY = 'leadscope_academy_checklist_v2';

type Progress = Record<string, boolean[]>;

const loadProgress = (): Progress => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved as Progress;
  } catch { /* ignore */ }
  return {};
};

export default function Academy() {
  const [systemId, setSystemId] = useState<string>(SYSTEMS[0].id);
  const [open, setOpen] = useState<number | null>(0);
  const [progress, setProgress] = useState<Progress>(loadProgress);

  const system = useMemo(() => SYSTEMS.find((s) => s.id === systemId) || SYSTEMS[0], [systemId]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch { /* ignore */ }
  }, [progress]);

  const done: boolean[] = system.checklist.map((_, i) => Boolean(progress[system.id]?.[i]));
  const completed = done.filter(Boolean).length;
  const approved = completed === system.checklist.length;
  const pct = Math.round((completed / system.checklist.length) * 100);

  const toggle = (i: number) =>
    setProgress((prev) => {
      const current = system.checklist.map((_, idx) => Boolean(prev[system.id]?.[idx]));
      current[i] = !current[i];
      return { ...prev, [system.id]: current };
    });

  const systemPct = (s: AcademySystem) => {
    const n = s.checklist.filter((_, i) => progress[s.id]?.[i]).length;
    return Math.round((n / s.checklist.length) * 100);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><GraduationCap className="h-5 w-5 text-emerald-500" /> Academia Workio</h2>
        <p className="mt-1 text-xs text-gray-400">Formação para vender o Workio e os seus sistemas com segurança, mesmo sendo novo na equipa.</p>
      </div>

      {/* Sistemas / cursos */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SYSTEMS.map((s) => {
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
                <span className="text-[10px] font-mono text-gray-500">{systemPct(s)}%</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{s.description}</p>
              <div className="mt-2 text-[10px] text-gray-500">{s.lessons.length} lições</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* licoes */}
        <div className="space-y-2">
          {system.lessons.map((lesson, i) => (
            <div key={lesson.title} className="overflow-hidden rounded-lg border border-gray-800 bg-ai-card">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="flex items-center gap-2 text-sm font-bold text-white"><BookOpen className="h-4 w-4 text-emerald-400" />{lesson.title}</span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <ul className="space-y-2 border-t border-gray-800 px-4 py-3">
                  {lesson.body.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs leading-relaxed text-gray-300"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />{p}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* certificacao */}
        <div className="flex flex-col gap-4">
          <div className={`rounded-lg border p-5 ${approved ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-gray-800 bg-ai-card'}`}>
            <div className="flex items-center gap-2">
              <Award className={`h-5 w-5 ${approved ? 'text-emerald-400' : 'text-gray-500'}`} />
              <h3 className="text-sm font-bold text-white">Aprovado em {system.name}</h3>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ai-dark">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-gray-500">{completed}/{system.checklist.length} concluído</div>

            <div className="mt-4 space-y-2">
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

          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><PlayCircle className="h-4 w-4 text-emerald-400" /> Praticar</h3>
            <p className="text-[11px] leading-relaxed text-gray-400">Use o <span className="font-bold text-emerald-300">Simulador IA</span> (Ferramentas de Venda) para treinar chamadas com personas reais e receber avaliação. Depois pratique o <span className="font-bold text-emerald-300">Playbook de Demo</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
