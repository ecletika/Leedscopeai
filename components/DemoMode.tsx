import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarClock,
  Check,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import { CrmMaterial, Lead, NextActionType } from '../types';
import { crmDb } from '../services/crmDb';
import { hotelDb } from '../services/hotelDb';
import { downloadLeadIcs } from '../services/calendar';

interface DemoModeProps {
  lead: Lead;
  onClose: () => void;
  onSaved?: () => void;
}

type PersonaKey = 'all' | 'reception' | 'housekeeper' | 'manager' | 'maintenance' | 'owner' | 'group';

const personas: { key: PersonaKey; label: string }[] = [
  { key: 'all', label: 'Visao geral' },
  { key: 'reception', label: 'Recepcao' },
  { key: 'housekeeper', label: 'Governanta' },
  { key: 'manager', label: 'Gerente' },
  { key: 'maintenance', label: 'Manutencao' },
  { key: 'owner', label: 'Dono' },
  { key: 'group', label: 'Grupo' }
];

// Slides de valor: problema -> solucao -> modulo SOL (imagem) -> beneficio. Filtrados por persona.
interface ValueSlide {
  module: number; // numero do modulo SOL (M1..M20) para buscar a imagem real
  problem: string;
  solution: string;
  benefit: string;
  personas: PersonaKey[];
}

const VALUE_SLIDES: ValueSlide[] = [
  {
    module: 1,
    problem: 'A recepcao nao sabe em tempo real quais quartos estao prontos.',
    solution: 'O mapa de quartos do SOL mostra o estado de cada quarto ao vivo: sujo, em limpeza, inspecao, limpo, ocupado, bloqueado ou manutencao.',
    benefit: 'Menos chamadas, menos atrasos no check-in.',
    personas: ['all', 'reception', 'manager']
  },
  {
    module: 4,
    problem: 'Distribuir e acompanhar as limpezas da equipa e confuso.',
    solution: 'A governanta atribui quartos por zona, turno e prioridade; cada colaborador ve as suas tarefas no telemovel.',
    benefit: 'Equipa coordenada e progresso em tempo real.',
    personas: ['all', 'housekeeper']
  },
  {
    module: 3,
    problem: 'A qualidade da limpeza varia conforme a pessoa.',
    solution: 'Checklists por tipo (checkout, stay-over, deep clean, VIP) garantem padrao, mesmo com equipas rotativas.',
    benefit: 'Padronizacao e menos falhas.',
    personas: ['all', 'housekeeper']
  },
  {
    module: 5,
    problem: 'Nao ha inspecao formal antes de libertar o quarto.',
    solution: 'A supervisora valida checklist e fotos e aprova ou reprova o quarto antes de ficar disponivel.',
    benefit: 'Controlo de qualidade real.',
    personas: ['all', 'housekeeper', 'manager']
  },
  {
    module: 6,
    problem: 'A manutencao recebe pedidos soltos e perde o historico.',
    solution: 'Cada problema vira um ticket com foto, quarto, prioridade, responsavel e estado ate resolver.',
    benefit: 'Nada se perde, tudo com responsavel.',
    personas: ['all', 'maintenance', 'manager']
  },
  {
    module: 11,
    problem: 'Quando ha reclamacao, ninguem sabe quem fez o que.',
    solution: 'O SOL guarda historico de limpezas, inspecoes e tickets: quem fez, quando e com que observacoes.',
    benefit: 'Auditoria e resposta com dados.',
    personas: ['all', 'manager', 'owner']
  },
  {
    module: 13,
    problem: 'A gestao trabalha as cegas, sem visao da operacao.',
    solution: 'O dashboard mostra ao vivo quartos sujos, em limpeza, prontos, em inspecao, bloqueados e manutencao aberta.',
    benefit: 'Decisao baseada em dados.',
    personas: ['all', 'manager', 'owner']
  },
  {
    module: 12,
    problem: 'Faltam relatorios para perceber a produtividade.',
    solution: 'Relatorios de tempo medio de limpeza, quartos atrasados, produtividade e tickets resolvidos.',
    benefit: 'Operacao medivel e melhoravel.',
    personas: ['all', 'manager', 'owner', 'group']
  },
  {
    module: 20,
    problem: 'Gerir varios hoteis num grupo e disperso.',
    solution: 'Multi-propriedade: acompanhar varias unidades numa plataforma, com relatorios por unidade, equipa, cidade ou grupo.',
    benefit: 'Visao consolidada do grupo.',
    personas: ['all', 'owner', 'group']
  },
  {
    module: 14,
    problem: 'A equipa de chao nao trabalha sentada ao computador.',
    solution: 'App mobile-first: abrir tarefas, preencher checklists, enviar fotos e atualizar estados no telemovel.',
    benefit: 'Adocao facil pela equipa.',
    personas: ['all', 'housekeeper']
  }
];

// Comparador SOL vs WhatsApp/Papel (M36)
const COMPARATOR: { topic: string; old: string; sol: string }[] = [
  { topic: 'Estado dos quartos', old: 'Manual / chamadas', sol: 'Tempo real' },
  { topic: 'Historico', old: 'Perdido', sol: 'Guardado' },
  { topic: 'Responsavel', old: 'Nem sempre claro', sol: 'Sempre registado' },
  { topic: 'Fotos', old: 'Espalhadas', sol: 'Ligadas ao quarto' },
  { topic: 'Manutencao', old: 'Mensagens soltas', sol: 'Tickets' },
  { topic: 'Relatorios', old: 'Dificil', sol: 'Automatico' },
  { topic: 'Multilingue', old: 'Nao', sol: 'Sim' },
  { topic: 'Offline', old: 'Limitado', sol: 'Sim' }
];

const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
};

export default function DemoMode({ lead, onClose, onSaved }: DemoModeProps) {
  const [materials, setMaterials] = useState<CrmMaterial[]>([]);
  const [persona, setPersona] = useState<PersonaKey>('all');
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    crmDb.getMaterials().then((rows) => setMaterials(rows.filter((m) => m.active)));
  }, []);

  // imagem real por numero de modulo (titulos "M1 · ...", url /materials/mNN.png)
  const imageByModule = useMemo(() => {
    const map: Record<number, string> = {};
    materials.forEach((m) => {
      const match = /m(\d+)/i.exec(m.url || '') || /^M(\d+)/i.exec(m.title || '');
      if (match && m.url) map[parseInt(match[1], 10)] = m.url;
    });
    return map;
  }, [materials]);

  const valueSlides = useMemo(
    () => VALUE_SLIDES.filter((s) => s.personas.includes(persona)),
    [persona]
  );

  // estrutura de slides: capa + slides de valor + comparador + proximos passos
  const totalSlides = valueSlides.length + 3;
  const clampedIndex = Math.min(index, totalSlides - 1);

  useEffect(() => { setIndex(0); }, [persona]);

  const go = (delta: number) => setIndex((i) => Math.max(0, Math.min(totalSlides - 1, i + delta)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides]);

  const pitchText = useMemo(() => {
    const lines = [
      `SOL — operacao de housekeeping em tempo real para o ${lead.companyName}.`,
      '',
      ...valueSlides.map((s) => `• ${s.problem} -> ${s.solution}`),
      '',
      'Faz sentido marcarmos uma apresentacao rapida de 15 a 20 minutos?'
    ];
    return lines.join('\n');
  }, [lead.companyName, valueSlides]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pitchText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const emailHref = `mailto:${lead.email || ''}?subject=${encodeURIComponent(`SOL para o ${lead.companyName}`)}&body=${encodeURIComponent(pitchText)}`;
  const whatsappHref = `https://wa.me/${(lead.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(pitchText)}`;

  const scheduleDemo = async () => {
    setSavingAction(true);
    try {
      const iso = plusDaysIso(1);
      await hotelDb.saveHotel({
        ...lead,
        commercialStatus: 'demo_scheduled',
        nextActionType: 'demo' as NextActionType,
        nextActionAt: iso,
        callbackScheduledAt: iso,
        callbackStatus: 'pending',
        lastActivityAt: new Date().toISOString()
      });
      onSaved?.();
      onClose();
    } finally {
      setSavingAction(false);
    }
  };

  // ----- render do slide atual -----
  const renderSlide = () => {
    if (clampedIndex === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 flex items-center gap-3">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-5xl font-black text-transparent">SOL</span>
          </div>
          <h1 className="max-w-2xl text-3xl font-bold text-white">Operacao de housekeeping em tempo real</h1>
          <p className="mt-3 max-w-xl text-sm text-gray-400">Apresentacao preparada para <span className="font-bold text-emerald-300">{lead.companyName}</span></p>
          <p className="mt-8 text-xs text-gray-500">Use as setas ← → para avancar. Escolha a pessoa com quem fala em cima.</p>
        </div>
      );
    }

    if (clampedIndex >= 1 && clampedIndex <= valueSlides.length) {
      const slide = valueSlides[clampedIndex - 1];
      const img = imageByModule[slide.module];
      return (
        <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-300">Problema</span>
            <h2 className="text-2xl font-bold text-white">{slide.problem}</h2>
            <div className="mt-6">
              <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">Como o SOL resolve</span>
              <p className="text-base leading-relaxed text-gray-200">{slide.solution}</p>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-200">{slide.benefit}</span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            {img ? (
              <img src={img} alt={slide.problem} className="max-h-[62vh] w-full rounded-xl border border-gray-800 object-contain shadow-2xl" />
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-gray-700 text-xs text-gray-600">Imagem do modulo M{slide.module}</div>
            )}
          </div>
        </div>
      );
    }

    if (clampedIndex === valueSlides.length + 1) {
      return (
        <div className="flex h-full flex-col justify-center">
          <h2 className="mb-1 text-2xl font-bold text-white">SOL vs WhatsApp / Papel / Excel</h2>
          <p className="mb-5 text-sm text-gray-400">Muitos hoteis comecam no WhatsApp. Eis a diferenca na pratica.</p>
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-ai-dark text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Processo</th>
                  <th className="px-4 py-3 text-rose-300">WhatsApp / Papel</th>
                  <th className="px-4 py-3 text-emerald-300">SOL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {COMPARATOR.map((r) => (
                  <tr key={r.topic}>
                    <td className="px-4 py-2.5 font-semibold text-white">{r.topic}</td>
                    <td className="px-4 py-2.5 text-gray-400">{r.old}</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-300">{r.sol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // proximos passos
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Check className="mb-4 h-12 w-12 text-emerald-400" />
        <h2 className="text-3xl font-bold text-white">Proximo passo</h2>
        <p className="mt-3 max-w-xl text-base text-gray-300">Vamos marcar uma apresentacao rapida de 15 a 20 minutos para mostrar o SOL a funcionar com os dados do {lead.companyName}?</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={scheduleDemo} disabled={savingAction} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">
            {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Marcar demo (amanha)
          </button>
          {lead.email && <a href={emailHref} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-bold text-sky-300 hover:bg-gray-700"><Mail className="h-4 w-4" /> Enviar por email</a>}
          {lead.phone && <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-bold text-green-300 hover:bg-gray-700"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          <button onClick={() => downloadLeadIcs(lead, { start: new Date(plusDaysIso(1)), title: `SOL Demo — ${lead.companyName}`, durationMinutes: 30 })} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-bold text-indigo-300 hover:bg-gray-700"><CalendarClock className="h-4 w-4" /> Adicionar ao calendario</button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ai-dark/98 backdrop-blur-md">
      {/* topo */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-800 bg-ai-card px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">MODO DEMO</span>
          <h2 className="truncate text-base font-bold text-white">{lead.companyName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 md:flex">
            <Users className="mr-1 h-3.5 w-3.5 text-gray-500" />
            {personas.map((p) => (
              <button key={p.key} onClick={() => setPersona(p.key)} className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${persona === p.key ? 'bg-emerald-600/15 text-emerald-300' : 'text-gray-500 hover:text-white'}`}>{p.label}</button>
            ))}
          </div>
          <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-[11px] font-bold text-gray-300 transition hover:bg-gray-700" title="Copiar pitch">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar pitch'}
          </button>
          <button onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-gray-700"><X className="h-4 w-4" /> Sair</button>
        </div>
      </header>

      {/* seletor de persona mobile */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-800 bg-ai-card px-4 py-2 md:hidden">
        {personas.map((p) => (
          <button key={p.key} onClick={() => setPersona(p.key)} className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${persona === p.key ? 'bg-emerald-600/15 text-emerald-300' : 'text-gray-500'}`}>{p.label}</button>
        ))}
      </div>

      {/* slide */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto h-full max-w-6xl">{renderSlide()}</div>
      </main>

      {/* rodape navegacao */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-800 bg-ai-card px-6 py-3">
        <button onClick={() => go(-1)} disabled={clampedIndex === 0} className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-gray-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Anterior</button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i === clampedIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-gray-700 hover:bg-gray-600'}`} />
          ))}
        </div>
        <button onClick={() => go(1)} disabled={clampedIndex === totalSlides - 1} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40">Proximo <ArrowRight className="h-4 w-4" /></button>
      </footer>
    </div>
  );
}
