import React, { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { APOLLO_USAGE_EVENT, ApolloUsageState, getApolloUsage } from '../services/apolloService';

/** Indicador compacto dos creditos Apollo restantes (ao lado dos creditos Google, no topo). */
export default function ApolloUsagePill() {
  const [state, setState] = useState<ApolloUsageState | null>(null);

  const load = useCallback(async () => {
    try { setState(await getApolloUsage()); } catch { setState(null); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(APOLLO_USAGE_EVENT, load);
    return () => window.removeEventListener(APOLLO_USAGE_EVENT, load);
  }, [load]);

  if (!state) return null;

  const unavailable = !state.configured || !state.counterAvailable;
  const low = !unavailable && state.remaining <= Math.ceil(state.limit * 0.2);
  const tone = unavailable
    ? 'bg-gray-800 border-gray-700'
    : state.remaining <= 0
    ? 'bg-rose-500/10 border-rose-500/40'
    : low
    ? 'bg-amber-500/10 border-amber-500/40'
    : 'bg-gray-800 border-gray-700';

  const title = !state.configured
    ? 'Apollo não configurado (falta CLIENT_API_APOLLO)'
    : !state.counterAvailable
    ? 'Contador de créditos Apollo indisponível'
    : `Créditos Apollo usados: ${state.used} de ${state.limit} este mês`;

  return (
    <div className={`px-3 py-1 rounded-full flex items-center gap-2 border ${tone}`} title={title}>
      <Users className={`w-4 h-4 ${state.remaining <= 0 && !unavailable ? 'text-rose-400' : low ? 'text-amber-400' : 'text-emerald-400'}`} />
      <span className="font-bold text-white">{unavailable ? '–' : state.remaining}</span>
      <span className="text-gray-400 text-xs">créditos Apollo</span>
    </div>
  );
}
