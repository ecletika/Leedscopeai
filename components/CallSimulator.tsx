import React, { useRef, useState } from 'react';
import { Bot, Loader2, RefreshCw, Send, Sparkles, User } from 'lucide-react';
import { simulateCall, SimTurn } from '../services/geminiService';

const PERSONAS: { key: string; label: string; hint: string }[] = [
  { key: 'reception_busy', label: 'Recepcao ocupada', hint: 'Sem tempo, quer despachar.' },
  { key: 'housekeeper_resistant', label: 'Governanta resistente', hint: 'Acha que o metodo atual chega.' },
  { key: 'manager_interested', label: 'Gerente interessado', hint: 'Faz perguntas concretas.' },
  { key: 'owner_price', label: 'Dono (preco)', hint: 'Focado em custos e ROI.' },
  { key: 'competitor_user', label: 'Ja usa concorrente', hint: 'Nao ve razao para mudar.' }
];

export default function CallSimulator() {
  const [persona, setPersona] = useState(PERSONAS[0].key);
  const [messages, setMessages] = useState<SimTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reset = () => { setMessages([]); setEvaluation(''); setInput(''); };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newHistory = [...messages, { role: 'seller', text } as SimTurn];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    try {
      const reply = await simulateCall(persona, messages, text, 'roleplay');
      setMessages([...newHistory, { role: 'customer', text: reply }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    } finally {
      setLoading(false);
    }
  };

  const evaluate = async () => {
    if (messages.length === 0) return;
    setEvaluating(true);
    try {
      setEvaluation(await simulateCall(persona, messages, '', 'evaluate'));
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      {/* chat */}
      <div className="flex h-[60vh] flex-col rounded-lg border border-gray-800 bg-ai-card">
        <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            <select value={persona} onChange={(e) => { setPersona(e.target.value); reset(); }} className="rounded-lg border border-gray-700 bg-ai-dark px-2 py-1 text-xs text-gray-200 focus:border-emerald-500 focus:outline-none">
              {PERSONAS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <button onClick={reset} className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-[11px] font-bold text-gray-300 hover:bg-gray-700"><RefreshCw className="h-3.5 w-3.5" /> Reiniciar</button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center text-xs text-gray-500">
              Comece a chamada. Escreva a sua abertura e a IA responde como <span className="mx-1 font-bold text-gray-300">{PERSONAS.find((p) => p.key === persona)?.label}</span>.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'seller' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'customer' && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-400"><Bot className="h-3.5 w-3.5" /></span>}
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.role === 'seller' ? 'bg-emerald-600 text-white' : 'bg-ai-dark text-gray-200 border border-gray-800'}`}>{m.text}</div>
              {m.role === 'seller' && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-300"><User className="h-3.5 w-3.5" /></span>}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> a pensar...</div>}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-800 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Escreva a sua fala de vendedor..."
            className="flex-1 rounded-lg border border-gray-700 bg-ai-dark px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          />
          <button onClick={send} disabled={loading || !input.trim()} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </div>
      </div>

      {/* avaliacao */}
      <div className="flex flex-col rounded-lg border border-gray-800 bg-ai-card p-4">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><Sparkles className="h-4 w-4 text-purple-400" /> Avaliacao</h3>
        <p className="mb-3 text-[11px] text-gray-500">{PERSONAS.find((p) => p.key === persona)?.hint}</p>
        <button onClick={evaluate} disabled={evaluating || messages.length === 0} className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-500 disabled:opacity-50">
          {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Terminar e avaliar
        </button>
        <div className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-ai-dark p-3 text-[11px] leading-relaxed text-gray-300">
          {evaluation ? <p className="whitespace-pre-wrap">{evaluation}</p> : <span className="text-gray-600">Faca a simulacao e clique em avaliar para receber feedback do treinador IA.</span>}
        </div>
      </div>
    </div>
  );
}
