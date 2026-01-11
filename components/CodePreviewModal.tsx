import React, { useState } from 'react';
import { X, Copy, Eye, Code as CodeIcon, Download, Check, Send, Sparkles } from 'lucide-react';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  code: string;
  isLoading: boolean;
  onUpdateCode: (newCode: string) => void;
  onRefine: (instruction: string) => Promise<string>;
}

export default function CodePreviewModal({ isOpen, onClose, companyName, code, isLoading, onUpdateCode, onRefine }: CodePreviewModalProps) {
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_landing.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefine = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim() || isRefining) return;

      setIsRefining(true);
      try {
          const newCode = await onRefine(prompt);
          onUpdateCode(newCode);
          setPrompt('');
      } catch (error) {
          alert("Erro ao atualizar o site.");
      } finally {
          setIsRefining(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-ai-card border border-gray-700 w-full max-w-6xl h-[95vh] rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-ai-dark/90 rounded-t-xl shrink-0">
          <div className="flex items-center gap-4">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CodeIcon className="w-5 h-5 text-ai-accent" />
                Site Proposto: <span className="text-gray-300">{companyName}</span>
             </h3>
             
             {!isLoading && (
                 <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                    <button 
                        onClick={() => setActiveView('preview')}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 ${activeView === 'preview' ? 'bg-ai-accent text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button 
                        onClick={() => setActiveView('code')}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 ${activeView === 'code' ? 'bg-ai-accent text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <CodeIcon className="w-3 h-3" /> Código
                    </button>
                 </div>
             )}
          </div>
          
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-900 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                 <div className="w-16 h-16 border-4 border-ai-accent/30 border-t-ai-accent rounded-full animate-spin"></div>
                 <CodeIcon className="w-6 h-6 text-ai-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-ai-accent animate-pulse font-mono text-sm">Gerando landing page de alta conversão...</p>
              <p className="text-gray-500 text-xs">A escrever HTML + Tailwind CSS...</p>
            </div>
          ) : (
             <>
                {activeView === 'preview' ? (
                    <div className="w-full h-full relative">
                        {isRefining && (
                            <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center">
                                <Sparkles className="w-10 h-10 text-ai-accent animate-spin mb-2" />
                                <span className="text-white font-bold">A aplicar alterações...</span>
                            </div>
                        )}
                        <iframe 
                            srcDoc={code} 
                            title="Preview" 
                            className="w-full h-full bg-white border-none"
                            sandbox="allow-scripts"
                        />
                    </div>
                ) : (
                    <textarea 
                        className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 outline-none resize-none"
                        value={code}
                        readOnly
                    />
                )}
             </>
          )}
        </div>

        {/* Footer & Controls */}
        <div className="border-t border-gray-700 bg-ai-dark/90 rounded-b-xl flex flex-col shrink-0">
            {/* AI Prompt Input */}
            {!isLoading && (
                <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                    <form onSubmit={handleRefine} className="flex gap-2">
                        <div className="relative flex-1">
                            <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-ai-accent" />
                            <input 
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={isRefining}
                                placeholder="Peça alterações (ex: 'Muda o fundo para preto', 'Adiciona uma secção de preços', 'Muda a cor do botão')..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-ai-accent focus:outline-none"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!prompt.trim() || isRefining}
                            className="px-4 py-2 bg-ai-accent hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2"
                        >
                            {isRefining ? '...' : <Send className="w-4 h-4" />}
                        </button>
                    </form>
                </div>
            )}

            <div className="p-4 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                    {isLoading ? "Aguarde..." : "HTML5 & Tailwind CSS. Use o chat acima para refinar."}
                </p>
                <div className="flex gap-3">
                    {!isLoading && (
                        <>
                            <button 
                                onClick={handleDownload}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded border border-gray-600 flex items-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                            <button 
                                onClick={handleCopy}
                                className="px-4 py-2 bg-ai-accent hover:bg-blue-600 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copiado!" : "Copiar"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}