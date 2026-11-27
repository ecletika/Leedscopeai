import React, { useEffect, useRef, useState } from 'react';
import { Delete, Grid3x3, Loader2, Mic, MicOff, Phone, PhoneOff, Settings, X } from 'lucide-react';
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
  // Teclado (DTMF) para menus automaticos: "prima 1 para...", extensoes, etc.
  const [showKeypad, setShowKeypad] = useState(false);
  const [sentDigits, setSentDigits] = useState('');

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

  const sendDigit = (d: string) => {
    const c: any = callRef.current;
    if (!c || typeof c.sendDigits !== 'function') return;
    try { c.sendDigits(d); } catch { /* ignore */ }
    setSentDigits((prev) => (prev + d).slice(-24));
  };

  // Com o teclado aberto, as teclas do computador tambem enviam os tons
  useEffect(() => {
    if (!showKeypad) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (/^[0-9*#]$/.test(e.key)) { e.preventDefault(); sendDigit(e.key); }
      if (e.key === 'Escape') setShowKeypad(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showKeypad]);

  // Fecha o teclado quando a chamada termina
  useEffect(() => {
    if (state !== 'connected' && state !== 'dialing') { setShowKeypad(false); setSentDigits(''); }
  }, [state]);

  const KEYS: Array<[string, string]> = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', '']
  ];

  const keypadButton = (
    <button
      type="button"
      onClick={() => setShowKeypad((v) => !v)}
      title="Teclado (para menus: prima 1, 2...)"
      aria-label="Abrir teclado"
      aria-expanded={showKeypad}
      className={`rounded-full p-1 transition ${showKeypad ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
    >
      <Grid3x3 className="h-3 w-3" />
    </button>
  );

  const keypadPanel = showKeypad && (
    <div
      role="dialog"
      aria-label="Teclado da chamada"
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-64 sm:rounded-2xl"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-h-[28px] flex-1 truncate rounded-lg bg-gray-50 px-3 py-1 text-center font-mono text-lg font-bold tracking-widest text-gray-800">
          {sentDigits || <span className="text-xs font-normal tracking-normal text-gray-400">Toque nas teclas</span>}
        </div>
        {sentDigits && (
          <button type="button" onClick={() => setSentDigits('')} title="Limpar o visor" aria-label="Limpar o visor" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Delete className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setShowKeypad(false)} aria-label="Fechar teclado" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {KEYS.map(([k, letters]) => (
          <button
            key={k}
            type="button"
            onClick={() => sendDigit(k)}
            className="flex h-14 flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-900 transition active:scale-95 active:bg-emerald-100 hover:bg-gray-100 sm:h-12"
          >
            <span className="text-xl font-bold leading-none">{k}</span>
            <span className="mt-0.5 h-3 text-[9px] font-bold tracking-wider text-gray-400">{letters}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-gray-400">Cada tecla é enviada logo para a chamada. No computador pode usar as teclas 0-9, * e #.</p>
    </div>
  );

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
    <div className="relative flex items-center gap-2">
      {keypadPanel}
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
            {(!cfg.wssUrl || !cfg.domain) && (
              <p className="rounded bg-amber-50 p-2 text-[11px] text-amber-700">
                Servidor EMET não definido. Configure VITE_EMET_WSS_URL e VITE_EMET_DOMAIN no deploy.
              </p>
            )}
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
          {state === 'dialing' && keypadButton}
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
          {keypadButton}
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
