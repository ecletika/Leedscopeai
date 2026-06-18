import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  Circle,
  GraduationCap,
  PlayCircle
} from 'lucide-react';

interface Lesson {
  title: string;
  body: string[];
}

const LESSONS: Lesson[] = [
  {
    title: '1. O que e o SOL',
    body: [
      'O SOL e uma plataforma de operacao hoteleira que organiza housekeeping, manutencao e quartos em tempo real.',
      'Resolve dores como quartos prontos tarde, comunicacao dispersa por WhatsApp e manutencao sem historico.',
      'Publico-alvo: hoteis independentes e grupos, sobretudo entre 20 e 150 quartos.'
    ]
  },
  {
    title: '2. Como funciona o housekeeping num hotel',
    body: [
      'A governanta distribui quartos pela equipa por zona e turno.',
      'A camareira limpa, segue uma checklist e marca o quarto como pronto.',
      'A supervisao inspeciona e liberta o quarto para a recepcao.',
      'Problemas viram tickets de manutencao. Entender este fluxo ajuda a falar a lingua do cliente.'
    ]
  },
  {
    title: '3. Principais dores dos hoteis',
    body: [
      'Recepcao sem saber em tempo real que quartos estao prontos -> atrasos no check-in.',
      'Comunicacao por WhatsApp/papel -> sem historico, sem prioridade, sem auditoria.',
      'Manutencao desorganizada e sem responsavel claro.',
      'Falta de relatorios e de visao da operacao para a gestao.'
    ]
  },
  {
    title: '4. Como falar com cada pessoa',
    body: [
      'Recepcao: foco em saber quais quartos estao prontos (modulo mapa de quartos).',
      'Governanta: controlar equipa, limpezas e inspecoes (tarefas, checklists, inspecao).',
      'Gerente: reduzir reclamacoes e ter relatorios (dashboard, relatorios, historico).',
      'Dono: economia, controlo e profissionalizacao (ROI, sustentabilidade).',
      'Use o seletor de persona no Modo Demo para mostrar o discurso certo.'
    ]
  },
  {
    title: '5. Como responder objecoes',
    body: [
      'Nunca discuta. Concorde, faca uma pergunta e mostre valor.',
      '"Ja usamos WhatsApp" -> "Perfeito, muitos comecam assim. Conseguem saber quem limpou cada quarto e a que horas?"',
      'Use o Banco de Objecoes no Modo Play: resposta curta, resposta completa, pergunta e material a mostrar.'
    ]
  },
  {
    title: '6. Como fazer a demo',
    body: [
      'Confirme o contexto e relembre a dor antes de mostrar o sistema.',
      'Siga o Playbook de Demo (Ferramentas de Venda): mapa -> tarefa mobile -> checklist -> ticket -> dashboard -> relatorios.',
      'Termine sempre a marcar o proximo passo (trial, proposta ou nova reuniao).'
    ]
  },
  {
    title: '7. Como preencher o CRM',
    body: [
      'Qualifique o lead antes da demo (botao Qualificar).',
      'Registe o resultado de cada chamada no Modo Play e deixe sempre uma proxima accao.',
      'Use sequencias de follow-up para nao perder o lead.',
      'Regra de ouro: nenhum lead contactado fica sem proximo passo.'
    ]
  },
  {
    title: '8. Como fechar o proximo passo',
    body: [
      'O objetivo de cada contacto e avancar uma etapa, nao vender tudo de uma vez.',
      'Peca sempre um compromisso concreto: data de demo, envio de proposta ou reuniao com o decisor.',
      'Gere a proposta comercial e marque o pipeline.'
    ]
  }
];

const CHECKLIST = [
  'Assistiu a formacao (estas licoes)',
  'Fez pelo menos uma simulacao no Simulador IA',
  'Conhece os modulos principais do SOL',
  'Sabe qualificar um lead',
  'Sabe marcar uma demo',
  'Sabe usar o pipeline',
  'Sabe gerar uma proposta'
];

const LS_KEY = 'leadscope_academy_checklist';

export default function Academy() {
  const [open, setOpen] = useState<number | null>(0);
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length === CHECKLIST.length) return saved;
    } catch { /* ignore */ }
    return CHECKLIST.map(() => false);
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(done)); } catch { /* ignore */ }
  }, [done]);

  const completed = done.filter(Boolean).length;
  const approved = completed === CHECKLIST.length;
  const pct = Math.round((completed / CHECKLIST.length) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><GraduationCap className="h-5 w-5 text-emerald-500" /> Academia SOL</h2>
        <p className="mt-1 text-xs text-gray-400">Formacao para vender o SOL com seguranca, mesmo sendo novo na equipa.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* licoes */}
        <div className="space-y-2">
          {LESSONS.map((lesson, i) => (
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
              <h3 className="text-sm font-bold text-white">Vendedor aprovado para vender SOL</h3>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ai-dark">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-gray-500">{completed}/{CHECKLIST.length} concluido</div>

            <div className="mt-4 space-y-2">
              {CHECKLIST.map((item, i) => (
                <button key={item} onClick={() => setDone((p) => p.map((v, idx) => (idx === i ? !v : v)))} className="flex w-full items-start gap-2 text-left text-xs text-gray-300">
                  {done[i] ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />}
                  <span className={done[i] ? 'text-gray-400 line-through' : ''}>{item}</span>
                </button>
              ))}
            </div>

            {approved && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                <Award className="h-4 w-4" /> Parabens! Esta pronto para vender o SOL.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><PlayCircle className="h-4 w-4 text-emerald-400" /> Praticar</h3>
            <p className="text-[11px] leading-relaxed text-gray-400">Use o <span className="font-bold text-emerald-300">Simulador IA</span> (Ferramentas de Venda) para treinar chamadas com personas reais e receber avaliacao. Depois pratique o <span className="font-bold text-emerald-300">Playbook de Demo</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
