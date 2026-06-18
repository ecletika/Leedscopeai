import { Lead } from '../types';

export interface ScoreBand {
  label: string;
  // classes Tailwind para badge
  tone: string;
}

export interface LeadScoreResult {
  score: number;
  band: ScoreBand;
  breakdown: { label: string; points: number }[];
}

const BANDS: { min: number; band: ScoreBand }[] = [
  { min: 80, band: { label: 'Muito quente', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' } },
  { min: 60, band: { label: 'Quente', tone: 'bg-green-500/15 text-green-300 border-green-500/30' } },
  { min: 40, band: { label: 'Medio', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' } },
  { min: 20, band: { label: 'Frio', tone: 'bg-sky-500/15 text-sky-300 border-sky-500/30' } },
  { min: 0, band: { label: 'Baixa prioridade', tone: 'bg-slate-500/15 text-slate-300 border-slate-500/30' } }
];

const BLOCKED_BAND: ScoreBand = { label: 'Bloqueado', tone: 'bg-red-500/15 text-red-300 border-red-500/30' };

export const bandForScore = (score: number): ScoreBand =>
  (BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1]).band;

/**
 * Lead scoring comercial (PRD secao 9). Heuristica deterministica a partir
 * dos sinais disponiveis no lead. A IA pode sugerir ajustes, mas este calculo
 * e a base estavel e previsivel para priorizar a fila.
 */
export const computeLeadScore = (lead: Partial<Lead>): LeadScoreResult => {
  // Pedido para nao contactar => bloqueio
  if (lead.doNotContact || lead.commercialStatus === 'do_not_contact') {
    return { score: 0, band: BLOCKED_BAND, breakdown: [{ label: 'Nao contactar (bloqueio)', points: 0 }] };
  }

  const breakdown: { label: string; points: number }[] = [];
  const add = (label: string, points: number) => { if (points !== 0) breakdown.push({ label, points }); };

  const rooms = Number(lead.estimatedRooms || 0);
  if (rooms >= 20 && rooms <= 150) add('20 a 150 quartos', 30);
  else if (rooms > 150) add('Mais de 150 quartos', 10);

  const segment = (lead.segment || '').toLowerCase();
  if (segment.includes('independ')) add('Hotel independente', 25);
  if (segment.includes('grupo') || segment.includes('cadeia') || segment.includes('rede')) add('Grupo / varias unidades', 25);

  // Sinais de operacao manual / reputacao de limpeza fraca
  const rating = Number(lead.mapsRating || 0);
  if (rating > 0 && rating < 4) add('Reputacao de limpeza/operacao fraca', 20);

  if (lead.website || lead.hasWebsite) add('Website proprio', 10);

  // Decisor identificado
  if ((lead.contactPerson || '').trim() || lead.commercialStatus === 'decision_maker_identified') {
    add('Decisor identificado', 20);
  }

  // Ja aceitou falar novamente / lead engajado
  const engaged: string[] = ['rescheduled', 'follow_up', 'demo_scheduled', 'demo_completed', 'proposal_sent'];
  if (lead.commercialStatus && engaged.includes(lead.commercialStatus)) add('Ja aceitou continuar a falar', 20);

  // Potencial marcado manualmente como Hot
  if (lead.potential === 'Hot') add('Potencial marcado como Hot', 10);

  // Dados inconsistentes / sem telefone
  if (!(lead.phone || '').trim()) add('Sem telefone valido', -20);

  // Concorrente instalado sem intencao de mudar
  const closeNotes = (lead.closeNotes || '').toLowerCase();
  if (closeNotes.includes('sistema') || closeNotes.includes('concorrente')) add('Ja usa concorrente', -10);

  const raw = breakdown.reduce((acc, item) => acc + item.points, 0);
  const score = Math.max(0, Math.min(100, raw));

  return { score, band: bandForScore(score), breakdown };
};

/**
 * Score de interesse comportamental (M45). Complementa o lead score (fit) com
 * sinais de comportamento do lead: o que pediu, em que etapa esta, qualificacao.
 * Resultado: temperatura (Frio/Morno/Quente/Muito quente / Bloqueado).
 */
export interface InterestResult {
  score: number;
  label: string;
  tone: string;
}

export const computeInterestScore = (lead: Partial<Lead>): InterestResult => {
  const st = lead.commercialStatus;
  if (st === 'do_not_contact' || lead.doNotContact) {
    return { score: 0, label: 'Bloqueado', tone: 'bg-red-500/15 text-red-300 border-red-500/30' };
  }

  let s = 0;
  const q = lead.qualification;
  if (st === 'demo_scheduled' || st === 'demo_completed') s += 30;
  if (st === 'proposal_sent') s += 25;
  if (st === 'decision_maker_identified') s += 20;
  if (st === 'rescheduled') s += 10;
  if (st === 'follow_up') s += 10;
  if (st === 'won') s += 40;
  if (q?.interest === 'high') s += 25;
  else if (q?.interest === 'medium') s += 10;
  if ((q?.probability || 0) >= 50) s += 15;
  if (q?.housekeepingMethod === 'whatsapp' || q?.housekeepingMethod === 'paper') s += 10;
  const rooms = lead.estimatedRooms || q?.rooms || 0;
  if (rooms > 30) s += 15;
  if (st === 'lost') s -= 40;

  const score = Math.max(0, Math.min(100, s));
  if (score >= 70) return { score, label: 'Muito quente', tone: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
  if (score >= 45) return { score, label: 'Quente', tone: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
  if (score >= 20) return { score, label: 'Morno', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  return { score, label: 'Frio', tone: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
};
