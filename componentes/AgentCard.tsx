import React from 'react';
import { Bot, Search, Eye, Mail, Database, PenTool, BrainCircuit } from 'lucide-react';

interface AgentCardProps {
  id: number;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'finished' | 'error';
  iconName: string;
  log?: string;
}

const getIcon = (name: string, className: string) => {
  switch (name) {
    case 'orchestrator': return <BrainCircuit className={className} />;
    case 'search': return <Search className={className} />;
    case 'audit': return <Eye className={className} />;
    case 'email': return <Mail className={className} />;
    case 'scraper': return <Database className={className} />;
    case 'proposal': return <PenTool className={className} />;
    default: return <Bot className={className} />;
  }
};

const AgentCard: React.FC<AgentCardProps> = ({ name, role, status, iconName, log }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'working': return 'border-ai-accent shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-ai-card/80';
      case 'finished': return 'border-ai-success/50 bg-ai-card/50';
      case 'error': return 'border-ai-danger/50 bg-ai-card/50';
      default: return 'border-gray-800 bg-ai-card/30 opacity-70';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'working': return 'text-ai-accent animate-pulse';
      case 'finished': return 'text-ai-success';
      case 'error': return 'text-ai-danger';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`relative p-4 rounded-xl border transition-all duration-300 ${getStatusColor()} flex flex-col gap-3 min-h-[160px]`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-black/20 ${getIconColor()}`}>
          {getIcon(iconName, "w-6 h-6")}
        </div>
        <div>
          <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-ai-text">{name}</h3>
          <p className="text-xs text-ai-muted">{role}</p>
        </div>
      </div>
      
      {status === 'working' && (
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-ai-accent animate-progress-indeterminate"></div>
        </div>
      )}

      <div className="mt-auto">
        <p className={`text-xs font-mono h-12 overflow-hidden ${status === 'working' ? 'text-ai-accent' : 'text-gray-400'}`}>
          {status === 'idle' ? 'Waiting for tasks...' : `> ${log || 'Processing...'}`}
        </p>
      </div>
    </div>
  );
};

export default AgentCard;
