import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { Lead, ChatMessage } from '../types';

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSend: (message: string) => Promise<void>;
  chatHistory: ChatMessage[];
  isLoading: boolean;
}

export default function AskAIModal({ isOpen, onClose, lead, onSend, chatHistory, isLoading }: AskAIModalProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ai-card border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl flex flex-col h-[600px]">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-ai-dark/50 rounded-t-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Consultor IA: <span className="text-gray-300 text-sm">{lead.companyName}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
           {chatHistory.length === 0 && (
               <div className="text-center text-gray-500 mt-10 text-sm">
                   <p>Pergunte-me qualquer coisa sobre este lead.</p>
                   <p className="text-xs mt-2">"Por que classificaste como Quente?"</p>
                   <p className="text-xs">"O site atual é responsivo?"</p>
               </div>
           )}
           {chatHistory.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                 msg.role === 'user' 
                   ? 'bg-ai-accent text-white rounded-br-none' 
                   : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
               }`}>
                 <p className="whitespace-pre-wrap">{msg.content}</p>
               </div>
             </div>
           ))}
           {isLoading && (
             <div className="flex justify-start">
               <div className="bg-gray-800 rounded-lg p-3 rounded-bl-none border border-gray-700 flex gap-1 items-center">
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-ai-dark/50 rounded-b-xl flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faça uma pergunta..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-ai-accent"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-ai-accent hover:bg-blue-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}