import React, { useState, useEffect } from 'react';
import { 
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle, 
  RefreshCw, SlidersHorizontal, Gauge, Zap, Sparkles, 
  Clock, ShieldCheck, HelpCircle, HardDrive, Play
} from 'lucide-react';
import { fetchGeminiHealth, GeminiHealthResponse } from '../services/geminiService';

interface SystemHealthProps {
  className?: string;
  compact?: boolean;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ className = '', compact = false }) => {
  const [data, setData] = useState<GeminiHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [plan, setPlan] = useState<'free' | 'paid'>('free');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    timestamp: string;
  } | null>(null);

  // Poll metrics every 8 seconds to keep UI visual representation live
  const updateMetrics = async (runTest = false) => {
    if (runTest) setTesting(true);
    try {
      const resp = await fetchGeminiHealth(runTest);
      setData(resp);
      if (runTest && resp.testResult) {
        setTestResult({
          success: resp.testResult.success,
          latencyMs: resp.testResult.latencyMs,
          message: resp.testResult.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      if (runTest) setTesting(false);
    }
  };

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(() => {
      updateMetrics(false);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <LoaderSpinner className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs font-medium">A analisar hardware e latência da API...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    requestsThisMinute: 0,
    totalRequests: 0,
    lastRequestTime: null,
    lastLatencyMs: null,
    lastStatus: 200,
    lastErrorMessage: null
  };

  const isConfigured = data?.configured ?? false;
  
  // RPM limit based on Plan selection
  const maxRpm = plan === 'free' ? 15 : 120;
  const currentRpm = metrics.requestsThisMinute;
  const rpmPercentage = Math.min((currentRpm / maxRpm) * 100, 100);

  // Quota indicators
  const isCloseToRpmLimit = currentRpm >= maxRpm * 0.8;
  const isOverRpmLimit = currentRpm >= maxRpm;

  // Determine Overall Status Color
  // 503/429 recently, or not configured = problem
  let statusColor = "bg-emerald-500 text-emerald-400 border-emerald-500/20";
  let statusText = "Ligado e Seguro";
  let animatePulse = "animate-ping";

  if (!isConfigured) {
    statusColor = "bg-rose-500 text-rose-400 border-rose-500/20";
    statusText = "Sem Chave de API";
    animatePulse = "";
  } else if (metrics.lastStatus === 429 || isOverRpmLimit) {
    statusColor = "bg-rose-500 text-rose-400 border-rose-500/20";
    statusText = "Limite de Quotas Atingido (429)";
    animatePulse = "animate-pulse";
  } else if (metrics.lastStatus === 503) {
    statusColor = "bg-amber-500 text-amber-400 border-amber-500/20";
    statusText = "Gemini Sob Alta Demanda (503)";
    animatePulse = "animate-pulse";
  } else if (isCloseToRpmLimit) {
    statusColor = "bg-amber-500 text-amber-400 border-amber-500/20";
    statusText = "Aproximação de Limite (RPM)";
    animatePulse = "animate-pulse";
  }

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border bg-gray-900/60 border-gray-850 ${className}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-gray-200">Estado Gemini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`relative flex h-2 w-2`}>
              {animatePulse && <span className={`absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75 ${animatePulse}`}></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor.split(' ')[0]}`}></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-gray-300">{statusText}</span>
          </div>
        </div>

        {/* Mini Meter bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Quota ({currentRpm}/{maxRpm} RPM)</span>
            <span>{Math.round(rpmPercentage)}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${rpmPercentage}%` }} 
              className={`h-full transition-all duration-500 ${
                isOverRpmLimit ? 'bg-rose-500' : isCloseToRpmLimit ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status indicator Card */}
        <div className="p-4 rounded-xl border bg-gray-900/40 border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              !isConfigured ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {isConfigured ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-mono font-bold">LIGAÇÃO À API</p>
              <h3 className="text-sm font-extrabold text-white mt-0.5">{isConfigured ? 'Configurada' : 'Não detetada'}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-800/60 border border-gray-700/50">
            <span className="relative flex h-2.5 w-2.5">
              {animatePulse && <span className={`absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75 ${animatePulse}`}></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor.split(' ')[0]}`}></span>
            </span>
            <span className="text-xs font-semibold text-gray-200">{statusText}</span>
          </div>
        </div>

        {/* Plan Configuration */}
        <div className="p-4 rounded-xl border bg-gray-900/40 border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-mono font-bold">ESCALA DO MEDIDOR</p>
              <h3 className="text-sm font-extrabold text-white mt-0.5">
                {plan === 'free' ? 'Plano Gratuito (15 RPM)' : 'Plano Pago / Pro'}
              </h3>
            </div>
          </div>

          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setPlan('free')} 
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                plan === 'free' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              FREE
            </button>
            <button 
              onClick={() => setPlan('paid')} 
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                plan === 'paid' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              PAID
            </button>
          </div>
        </div>

        {/* Requests Made This Session */}
        <div className="p-4 rounded-xl border bg-gray-900/40 border-gray-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-mono font-bold">PEDIDOS ACUMULADOS</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-black text-white leading-none">{metrics.totalRequests}</span>
              <span className="text-[10px] text-gray-400">chamadas à API</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Speed Gauge & Quota metrics */}
        <div className="lg:col-span-2 p-5 rounded-2xl border bg-gray-950 border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-gray-100">Velocímetro e Medidor de Frequência (RPM)</h3>
              </div>
              <span className="text-[10px] font-mono text-gray-400 uppercase">Período de 1m Deslizante</span>
            </div>

            {/* Layout layout split: Gauge + stats */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-4">
              
              {/* Actual Visual Gauge (Half circle/speed bar mockup in pure CSS) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
                  {/* Gauge Arc outer */}
                  <div className="absolute top-0 left-0 right-0 bottom-0 rounded-t-full border-[10px] border-gray-800"></div>
                  {/* Gauge colored cover */}
                  <div 
                    style={{ 
                      transform: `rotate(${(rpmPercentage * 1.8) - 180}deg)`,
                      transformOrigin: 'bottom center'
                    }}
                    className={`absolute inset-0 rounded-t-full border-[10px] transition-all duration-1000 ${
                      isOverRpmLimit ? 'border-rose-500' : isCloseToRpmLimit ? 'border-amber-500' : 'border-emerald-500'
                    }`}
                  ></div>
                  {/* Mask hiding bottom of rotation */}
                  <div className="absolute h-10 w-full bg-gray-950 bottom-0 left-0 z-10"></div>
                  
                  {/* Value display inside */}
                  <div className="relative z-20 text-center pb-2">
                    <span className="block text-3xl font-black text-white tracking-tight">{currentRpm}</span>
                    <span className="text-[9px] text-gray-450 uppercase font-mono font-bold">REQ / MINUTO</span>
                  </div>
                </div>

                <div className="flex justify-between w-full max-w-[180px] text-[10px] font-mono text-gray-500 mt-2">
                  <span>0 RPM</span>
                  <span className="text-amber-500">Limiar ({Math.floor(maxRpm * 0.8)})</span>
                  <span>{maxRpm} max</span>
                </div>
              </div>

              {/* Status information items */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-850 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Taxa de Ocupabilidade:</span>
                    <span className={`font-mono font-bold ${
                      isOverRpmLimit ? 'text-rose-400' : isCloseToRpmLimit ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {Math.round(rpmPercentage)}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${rpmPercentage}%` }} 
                      className={`h-full transition-all duration-1000 ${
                        isOverRpmLimit ? 'bg-rose-500 animate-pulse' : isCloseToRpmLimit ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <p className="text-[10px] text-gray-450 leading-relaxed">
                    O Gemini Flash Gratuito limita as requisições a <strong>15 RPM</strong>. 
                    Monitorize esta barra ao iniciar varreuras ou prospeções em lote de mídias para evitar erros 429.
                  </p>
                </div>
                
                {/* Warnings or positive feedback messages */}
                {isOverRpmLimit ? (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex gap-2.5 items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <p className="font-bold">Limite de Requisições Ultrapassado!</p>
                      <p className="text-rose-300/80 mt-0.5">Os pedidos estão temporariamente suspensos pelo Gemini. O medidor irá reiniciar em breves segundos.</p>
                    </div>
                  </div>
                ) : isCloseToRpmLimit ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex gap-2.5 items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <p className="font-bold">Aproximação perigosa do Limite (80%)</p>
                      <p className="text-amber-300/80 mt-0.5">Limite de 15 pedidos/minuto quase atingido. Recomenda-se abrandar os cliques rápidos de análises consecutivas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl flex gap-2.5 items-start">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <p className="font-bold">Frequência Segura e Saudável</p>
                      <p className="text-gray-400 mt-0.5">A API do Gemini está dentro da margem operacional verde. Pode avançar com a prospeção e geração de propostas.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Core latency information */}
          <div className="border-t border-gray-900 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-gray-400">
            <div className="flex gap-4">
              <div>
                <span>Última Latência: </span>
                <span className="font-mono font-bold text-emerald-400">
                  {metrics.lastLatencyMs ? `${metrics.lastLatencyMs}ms` : 'N/A'}
                </span>
              </div>
              <div>
                <span>Último Pedido: </span>
                <span className="font-mono font-bold text-gray-300">
                  {metrics.lastRequestTime ? new Date(metrics.lastRequestTime).toLocaleTimeString() : 'Nenhum registado'}
                </span>
              </div>
            </div>

            <button 
              onClick={() => updateMetrics()}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-[11px] font-bold text-gray-200 rounded transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar Indicadores
            </button>
          </div>
        </div>

        {/* Live Active Diagnostic Tools & Ping Test */}
        <div className="p-5 rounded-2xl border bg-gray-950 border-gray-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-gray-100">Teste de Diagnóstico Real</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Execute um ping ultraleve instantâneo diretamente do servidor backend para a rede do Google Gemini para testar credenciais e latência de rede.
            </p>

            <button
              onClick={() => updateMetrics(true)}
              disabled={testing || !isConfigured}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                testing 
                  ? 'bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/20 active:scale-98'
              }`}
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  A testar ligação...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Testar Resposta & Latência
                </>
              )}
            </button>

            {/* Test result display */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                testResult.success 
                  ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                  : 'bg-rose-500/5 border-rose-500/15 text-rose-450'
              }`}>
                <div className="flex justify-between items-center font-bold">
                  <span>{testResult.success ? 'Ligação OK 🚀' : 'Falha na Ligação ❌'}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{testResult.timestamp}</span>
                </div>
                <div className="grid grid-cols-2 text-[10px] font-mono text-gray-400 border-t border-gray-900 pt-1.5 mt-1">
                  <span>Latência: <b className="text-gray-200">{testResult.latencyMs}ms</b></span>
                  <span>Código: <b className={`${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>{testResult.success ? '200' : 'Erro'}</b></span>
                </div>
                <p className="text-[10px] text-gray-300 font-mono pt-1 leading-relaxed break-words bg-gray-950 p-1.5 rounded mt-1 border border-gray-900">
                  {testResult.message}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-900 pt-3.5 mt-4 text-[11px] text-gray-400 space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-gray-300">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" /> O que fazer em caso de erro?
            </span>
            <ul className="list-disc pl-4 space-y-1 text-gray-400">
              <li><b>Erro 429:</b> Reduza a frequência ou frequência em lote e aguarde 1 minuto.</li>
              <li><b>Erro 503:</b> O servidor do Google está sobrecarregado. Aguarde e re-tente.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Deep-dive Troubleshooting & Error dictionary panel */}
      {metrics.lastStatus !== 200 && metrics.lastErrorMessage && (
        <div className="p-4 rounded-xl border bg-rose-500/5 border-rose-500/15 text-rose-300 space-y-3 animate-fade-in">
          <div className="flex gap-2.5 items-center text-sm font-bold text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Alerta de Erro Ativo Registado no Sistema ({metrics.lastStatus})</span>
          </div>
          
          <div className="p-3 bg-gray-950 rounded-lg border border-gray-900 font-mono text-xs text-rose-450 whitespace-pre-wrap select-all max-h-32 overflow-y-auto">
            {metrics.lastErrorMessage}
          </div>

          <div className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-gray-300">Diagnóstico Sugerido pelo Agente:</p>
            {metrics.lastStatus === 429 ? (
              <p>
                <b>Quota Excedida:</b> Acabou de colidir com a barreira de 15 chamadas por minuto (RPM) da chave gratuita do Gemini. O sistema suspendeu pedidos secundários de mídias temporariamente para proteger o fluxo. Recomenda-se aguardar pelo menos 30 segundos antes de realizar nova pesquisa de Leads.
              </p>
            ) : metrics.lastStatus === 503 ? (
              <p>
                <b>Serviço Indisponível:</b> O Google está a processar demasiadas tarefas nas suas centrais de processamento neuronais. Este erro é alheio à sua aplicação e é resolvido automaticamente pelo Google em poucos segundos. Tente novamente o pedido que falhou.
              </p>
            ) : (
              <p>
                <b>Erro Geral da API:</b> Verifique se a sua variável de ambiente <code>GEMINI_API_KEY</code> inserida nas configurações de Secrets está correta, ativa e sem espaços vazios.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Internal utility component to skip dependencies for simple spinner icon
const LoaderSpinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
