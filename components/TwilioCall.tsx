import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Phone, PhoneOff, Settings, X } from 'lucide-react';
import { isEmetActive, loadEmetConfig, saveEmetConfig, startEmetCall } from '../services/emetService';
import type { EmetCall, EmetConfig } from '../services/emetService';
import { getTwilioDevice } from '../services/twilioService';
import type { Call } from '../services/twilioService';

type CallState = 'idle' | 'initializing' | 'dialing' | 'connected' | 'ended' | 'error';

interface TwilioCallProps {
  phoneNumber: string;
  leadName: string;
  onCallEnded?: (durationSeconds: number) => void;
}

export default function TwilioCall({ phoneNumber, leadName, onCallEnded }: TwilioCallProps) {
  const [state, setState] = useState<CallState>('idle');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const callRef = useRef<Call | EmetCall | null>(null);
  const [showCfg, setShowCfg] = useState(false);
  const [cfg, setCfg] = useState<EmetConfig>(() => loadEmetConfig());
  const emet = isEmetActive(cfg);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    // Ao desmontar so encerra a chamada DESTE componente.
    // O device Twilio e partilhado (singleton) entre varios botoes de telefone,
    // por isso nao pode ser destruido aqui — isso terminava chamadas de outros numeros.
    return () => {
      clearTimer();
      hangUpCall();
    };
  }, []);

  const startTimer = () => {
    durationRef.current = 0;
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleCall = async () => {
    if (!phoneNumber) return;
    setState('initializing');
    setError('');
    setDuration(0);
    durationRef.current = 0;

    const finish = () => { setState('ended'); clearTimer(); onCallEnded?.(durationRef.current); };

    if (emet) {
      try {
        setState('dialing');
        callRef.current = await startEmetCall(phoneNumber, {
          onAccepted: () => { setState('connected'); startTimer(); },
          onEnded: finish,
          onError: (msg) => { setState('error'); setError(msg); clearTimer(); },
        });
      } catch (err: any) {
        setState('error');
        setError(err.message || 'Nao foi possivel iniciar a chamada EMET');
      }
      return;
    }

    try {
      const device = await getTwilioDevice();
      setState('dialing');

      const call = await device.connect({ params: { To: phoneNumber } });
      callRef.current = call;

      call.on('accept', () => {
        setState('connected');
        startTimer();
      });

      call.on('disconnect', () => {
        setState('ended');
        clearTimer();
        onCallEnded?.(durationRef.current);
      });

      call.on('error', (err: any) => {
        setState('error');
        setError(err.message || 'Erro na chamada');
        clearTimer();
      });
    } catch (err: any) {
      setState('error');
      setError(err.message || 'Nao foi possivel iniciar a chamada');
    }
  };

  const hangUpCall = () => {
    const c: any = callRef.current;
    if (!c) return;
    if (typeof c.hangup === 'function') c.hangup(); else c.disconnect?.();
  };

  const handleHangUp = () => hangUpCall();

  const toggleMute = () => {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.mute(next);
    setMuted(next);
  };

  const reset = () => {
    setState('idle');
    setDuration(0);
    setMuted(false);
    setError('');
    callRef.current = null;
  };

  if (!phoneNumber) return null;

  const field = (label: string, key: keyof EmetConfig, ph: string, type = 'text') => (
    <label className="block text-[11px] font-bold text-gray-600">
      {label}
      <input
        type={type}
        value={(cfg[key] as string) || ''}
        placeholder={ph}
        onChange={(e) => setCfg({ ...cfg, [key]: e.target.value })}
        className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-xs font-normal text-gray-800"
      />
    </label>
  );

  return (
    <div className="flex items-center gap-2">
      {state === 'idle' && (
        <button onClick={() => setShowCfg(true)} title="Configurar extensão EMET" className="rounded-full p-1 text-gray-400 hover:text-emerald-600">
          <Settings className="h-3.5 w-3.5" />
        </button>
      )}
      {showCfg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCfg(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Extensão EMET (SIP/WebRTC)</h3>
              <button onClick={() => setShowCfg(false)}><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            {field('Servidor WSS', 'wssUrl', 'wss://pbx.emet.pt:8089/ws')}
            {field('Domínio SIP', 'domain', 'pbx.emet.pt')}
            {field('Extensão', 'extension', '101')}
            {field('Password da extensão', 'password', '••••••', 'password')}
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
              Fazer as chamadas pelo EMET (em vez do Twilio)
            </label>
            <button
              onClick={() => { saveEmetConfig(cfg); setShowCfg(false); }}
              className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
      {state === 'idle' && (
        <button
          onClick={handleCall}
          className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
        >
          <Phone className="h-3 w-3" /> {emet ? 'Ligar (EMET)' : 'Ligar agora'}
        </button>
      )}

      {(state === 'initializing' || state === 'dialing') && (
        <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
          <span className="text-[11px] font-bold text-amber-700">
            {state === 'initializing' ? 'A inicializar...' : `A ligar para ${leadName}...`}
          </span>
          <button onClick={handleHangUp} className="ml-1 text-rose-500 hover:text-rose-700">
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {state === 'connected' && (
        <div className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[12px] font-bold text-emerald-700">{fmt(duration)}</span>
          <button
            onClick={toggleMute}
            title={muted ? 'Ativar microfone' : 'Silenciar'}
            className={`rounded-full p-1 transition ${muted ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
          >
            {muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          </button>
          <button
            onClick={handleHangUp}
            className="rounded-full bg-rose-100 p-1 text-rose-600 transition hover:bg-rose-200"
            title="Encerrar chamada"
          >
            <PhoneOff className="h-3 w-3" />
          </button>
        </div>
      )}

      {state === 'ended' && (
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 shadow-sm">
          <PhoneOff className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] text-gray-500">
            Chamada terminada · <span className="font-mono font-bold">{fmt(duration)}</span>
          </span>
          <button onClick={reset} className="text-[10px] font-bold text-emerald-600 hover:underline">
            Ligar de novo
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 shadow-sm">
          <PhoneOff className="h-3.5 w-3.5 text-rose-500" />
          <span className="max-w-xs truncate text-[11px] text-rose-700">{error}</span>
          <button onClick={reset} className="text-[10px] font-bold text-rose-600 hover:underline">
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
