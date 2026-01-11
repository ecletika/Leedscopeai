import React from 'react';
import { X, Copy, FileText, Check } from 'lucide-react';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  proposalText: string;
  isLoading: boolean;
}

export default function ProposalModal({ isOpen, onClose, companyName, proposalText, isLoading }: ProposalModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(proposalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ai-card border border-gray-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-ai-dark/50 rounded-t-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-ai-accent" />
            Proposta Comercial: <span className="text-gray-300">{companyName}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-300 leading-relaxed font-sans">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <div className="w-8 h-8 border-2 border-ai-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-ai-accent animate-pulse">A redigir proposta vencedora...</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-xs md:text-sm">
                {proposalText || "Nenhuma proposta gerada."}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-ai-dark/50 rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Fechar
          </button>
          {!isLoading && (
            <button 
              onClick={handleCopy}
              className="px-4 py-2 bg-ai-accent hover:bg-blue-600 text-white text-sm font-bold rounded flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar Texto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}