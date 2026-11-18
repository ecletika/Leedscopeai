import React, { useCallback, useEffect, useState } from 'react';
import { APOLLO_USAGE_EVENT, ApolloUsageState, getApolloUsage } from '../services/apolloService';

interface ApolloUsageBarProps {
  /** Tema escuro (Nova Prospecao) ou claro (Modo Play) */
  tone?: 'dark' | 'light';
  /** Informa o ecra pai se o Apollo pode ser usado (chave + contador + creditos) */
  onAvailability?: (available: boolean) => void;
}

/** Barra com os creditos Apollo gastos no mes (o teto vem do servidor: 70 por omissao). */
export default function ApolloUsageBar({ tone = 'dark', onAvailability }: ApolloUsageBarProps) {
  const [state, setState] = useState<ApolloUsageState | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getApolloUsage();
      setState(s);
      setFailed(false);
      onAvailability?.(s.configured && s.counterAvailable && s.remaining > 0);
    } catch {
      setFailed(true);
      onAvailability?.(false);
    }
  }, [onAvailability]);

  useEffect(() => {
    load();
    window.addEventListener(APOLLO_USAGE_EVENT, load);
    return () => window.removeEventListener(APOLLO_USAGE_EVENT, load);
  }, [load]);

  const dark = tone === 'dark';
  const text = dark ? 'text-gray-300' : 'text-gray-700';
  const muted = dark ? 'text-gray-500' : 'text-gray-500';
  const track = dark ? 'bg-gray-800' : 'bg-gray-200';

  let message: string | null = null;
  if (failed) message = 'Não foi possível ler os créditos do Apollo.';
  else if (state && !state.configured) message = 'Apollo não configurado (falta CLIENT_API_APOLLO no servidor).';
  else if (state && !state.counterAvailable) message = 'Contador de créditos indisponível: Apollo bloqueado por segurança.';

  const pct = state ? Math.min(100, Math.round((state.used / state.limit) * 100)) : 0;
  const exhausted = Boolean(state && state.remaining <= 0);
  const barColor = exhausted ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="w-full" aria-live="polite">
      <div className={`mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold ${text}`}>
        <span>Apollo · créditos do mês</span>
        {state && !message && (
          <span className="font-mono">
            {state.used}/{state.limit} <span className={`font-normal ${muted}`}>({state.remaining} restantes)</span>
          </span>
        )}
      </div>
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${track}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={state?.limit ?? 70}
        aria-valuenow={state?.used ?? 0}
        aria-label="Créditos Apollo usados no mês"
      >
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {message && <p className="mt-1 text-[11px] text-amber-500">{message}</p>}
      {exhausted && !message && <p className="mt-1 text-[11px] text-rose-500">Limite mensal atingido: o sistema deixou de enviar pedidos ao Apollo até ao próximo mês.</p>}
    </div>
  );
}
