import React, { useState } from 'react';
import { Lead, ProcessingStage, User, SmtpConfig, Campaign, PlanDefinition } from '../types';
import AgentCard from './AgentCard';
import LeadResults from './LeadResults';
import ProposalModal from './ProposalModal';
import AskAIModal from './AskAIModal';
import CodePreviewModal from './CodePreviewModal';
import { Target, MapPin, Loader2, Database, Mail, Globe, AlertTriangle, CheckCircle, Search, Sparkles, SlidersHorizontal, Settings, Server, Shield, Lock, Save, Activity, Wifi, LogOut, Hash, Calendar, Instagram, Facebook, Linkedin, Youtube, Video, Eye, Filter, UserCog, User as UserIcon, History, Edit, CreditCard, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { searchLeadsInLocation, analyzeAndGenerateProposal, generateOutreachEmail, runStorefrontInvestigation, generateCommercialProposal, askLeadQuestion, generateWebsiteCode, refineWebsiteCode } from '../services/geminiService';

const AGENTS = [
  { id: 0, name: 'Líder de Missão', role: 'Orquestrador', icon: 'orchestrator' },
  { id: 1, name: 'Radar Comercial', role: 'Busca de Empresas', icon: 'search' },
  { id: 9, name: 'Social Sniper', role: 'Investigação de Contactos', icon: 'audit' }, 
  { id: 2, name: 'Auditor Digital', role: 'Análise de Web', icon: 'audit' },
  { id: 10, name: 'Investigador Visual', role: 'Análise de Fachada', icon: 'proposal' },
  { id: 8, name: 'Closer', role: 'Outreach', icon: 'email' },
];

const INITIAL_PLANS: PlanDefinition[] = [
    { id: '1', name: 'Starter', price: '29€', credits: 30, features: ['Diagnóstico Básico'] },
    { id: '2', name: 'Pro', price: '79€', credits: 150, features: ['Propostas IA', 'Site Gen'] },
    { id: '3', name: 'Agency', price: '199€', credits: 9999, features: ['API Access', 'White-label'] }
];

interface DashboardProps {
  currentUser: User;
  allUsers: User[];
  setAllUsers: (users: User[]) => void;
  onLogout: () => void;
}

export default function Dashboard({ currentUser, allUsers, setAllUsers, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'admin'>('dashboard');
  
  // Search State
  const [campaignName, setCampaignName] = useState('');
  const [location, setLocation] = useState('');
  const [niche, setNiche] = useState('');
  const [aiContext, setAiContext] = useState(''); 
  const [leadLimit, setLeadLimit] = useState<number>(3); 

  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [logs, setLogs] = useState<Record<number, string>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<number, 'idle' | 'working' | 'finished' | 'error'>>({
    0: 'idle', 1: 'idle', 2: 'idle', 9: 'idle', 10: 'idle', 8: 'idle'
  });
  
  // Modals State
  const [activeLeadForProposal, setActiveLeadForProposal] = useState<Lead | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [activeLeadForChat, setActiveLeadForChat] = useState<Lead | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Website Generation State
  const [activeLeadForSite, setActiveLeadForSite] = useState<Lead | null>(null);
  const [isGeneratingSite, setIsGeneratingSite] = useState(false);
  
  // History View State
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Admin States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>(INITIAL_PLANS);
  const [newPlan, setNewPlan] = useState<Partial<PlanDefinition>>({ name: '', price: '', credits: 100 });

  // Filtros
  const [textFilter, setTextFilter] = useState('');
  const [caeFilter, setCaeFilter] = useState('');
  const [potentialFilter, setPotentialFilter] = useState<'all' | 'Hot' | 'Medium' | 'Cold'>('all');

  const updateAgent = (id: number, status: 'idle' | 'working' | 'finished' | 'error', logText?: string) => {
    setAgentStatuses(prev => ({ ...prev, [id]: status }));
    if (logText) setLogs(prev => ({ ...prev, [id]: logText }));
  };

  const handleStart = async () => {
    if (currentUser.credits <= 0) {
        alert("Sem créditos suficientes. Contacte o administrador.");
        return;
    }
    
    if (!campaignName.trim()) {
        alert("Por favor, dê um nome à sua campanha para organização.");
        return;
    }

    const hasSearchTerms = location.trim() || niche.trim() || aiContext.trim() || campaignName.trim();
    if (!hasSearchTerms) {
        alert("Introduza pelo menos um dado de pesquisa (ou um nome de campanha descritivo).");
        return;
    }
    
    const updatedUserCredit = { ...currentUser, credits: currentUser.credits - 1 };
    
    const newUsersList = allUsers.map(u => u.id === currentUser.id ? updatedUserCredit : u);
    setAllUsers(newUsersList);

    setLeads([]);
    setStage('searching');
    setAgentStatuses({ 0: 'working', 1: 'idle', 2: 'idle', 9: 'idle', 10: 'idle', 8: 'idle' });
    setLogs({});

    try {
      updateAgent(0, 'working', `A iniciar campanha "${campaignName}"...`);
      updateAgent(1, 'working', `A consumir 1 Crédito...`);
      updateAgent(1, 'working', `A pesquisar e validar empresas...`);
      
      const rawLeads = await searchLeadsInLocation(location, niche, aiContext, campaignName);
      
      if (!rawLeads || rawLeads.length === 0) {
          updateAgent(1, 'error', `Nenhuma empresa válida encontrada com estes critérios.`);
          updateAgent(0, 'error', `Processo cancelado.`);
          setStage('finished');
          
          const refundUser = { ...currentUser, credits: currentUser.credits };
          setAllUsers(allUsers.map(u => u.id === currentUser.id ? refundUser : u));
          return;
      }

      updateAgent(1, 'finished', `${rawLeads.length} leads validadas. Analisando Top ${leadLimit}...`);
      updateAgent(0, 'working', `A analisar em profundidade...`);

      setStage('analyzing');
      const processedLeads: Lead[] = [];

      for (const raw of rawLeads) {
          if (processedLeads.length >= leadLimit) break;

          updateAgent(9, 'working', `Investigando ${raw.companyName}...`);
          const lead = await analyzeAndGenerateProposal(raw);
          
          if (lead) {
              processedLeads.push(lead);
              setLeads(prev => [...prev, lead]);
          }
      }

      updateAgent(9, 'finished', 'Contactos extraídos.');
      updateAgent(0, 'finished', 'Campanha concluída e salva.');
      setStage('finished');

      // Save Campaign to History
      const newCampaign: Campaign = {
          id: crypto.randomUUID(),
          name: campaignName,
          date: new Date().toISOString(),
          location: location || "Geral",
          niche: niche || "Vários",
          leads: processedLeads
      };

      const finalUser = { 
          ...updatedUserCredit, 
          campaigns: [newCampaign, ...updatedUserCredit.campaigns] 
      };
      
      setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));

    } catch (error) {
      console.error(error);
      setStage('finished');
      updateAgent(0, 'error', 'Erro no sistema.');
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      
      setAllUsers(allUsers.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
  };

  const handleCreatePlan = () => {
      if (!newPlan.name || !newPlan.price) return;
      const plan: PlanDefinition = {
          id: crypto.randomUUID(),
          name: newPlan.name,
          price: newPlan.price,
          credits: newPlan.credits || 0,
          features: []
      };
      setPlans([...plans, plan]);
      setNewPlan({ name: '', price: '', credits: 100 });
  };

  const handleDeletePlan = (id: string) => {
      setPlans(plans.filter(p => p.id !== id));
  };

  // --- Handlers para Ações nos Leads ---

  const handleInvestigateStorefront = async (leadId: string) => {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      updateAgent(10, 'working', `A analisar fachada e dados do Maps de ${lead.companyName}...`);
      const { analysis, leadUpdates } = await runStorefrontInvestigation(lead);
      
      const updateLeadInList = (list: Lead[]) => list.map(l => {
          if (l.id !== leadId) return l;
          let newPotential = l.potential;
          if (analysis.needsLedUpgrade) newPotential = 'Hot'; 
          return { 
              ...l, 
              ...leadUpdates, // Merge updated business hours, reviews, etc.
              storefront: analysis, 
              potential: newPotential 
          };
      });

      setLeads(prev => updateLeadInList(prev));
      
      // Also update in history if viewing history
      if (activeTab === 'history' && selectedCampaign) {
          const updatedCampaignLeads = updateLeadInList(selectedCampaign.leads);
          const updatedCampaign = { ...selectedCampaign, leads: updatedCampaignLeads };
          setSelectedCampaign(updatedCampaign);
          
          // Persist deep update to user history
          const updatedUser = {
              ...currentUser,
              campaigns: currentUser.campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c)
          };
          setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
      }

      updateAgent(10, 'finished', `Análise visual e de dados concluída para ${lead.companyName}.`);
  };

  const handleOpenProposal = async (lead: Lead) => {
      setActiveLeadForProposal(lead);
      if (!lead.fullProposalText) {
          setIsGeneratingProposal(true);
          const text = await generateCommercialProposal(lead);
          
          const updateLeadText = (list: Lead[]) => list.map(l => l.id === lead.id ? { ...l, fullProposalText: text } : l);
          setLeads(prev => updateLeadText(prev));
          setActiveLeadForProposal(prev => prev ? { ...prev, fullProposalText: text } : null);
          
          // Update History Persistence
           if (activeTab === 'history' && selectedCampaign) {
              const updatedCampaignLeads = updateLeadText(selectedCampaign.leads);
              const updatedCampaign = { ...selectedCampaign, leads: updatedCampaignLeads };
              setSelectedCampaign(updatedCampaign);
              const updatedUser = {
                  ...currentUser,
                  campaigns: currentUser.campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c)
              };
              setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
           }

          setIsGeneratingProposal(false);
      }
  };
  
  const handleGenerateSite = async (lead: Lead) => {
      setActiveLeadForSite(lead);
      
      if (!lead.generatedSiteCode) {
          setIsGeneratingSite(true);
          const code = await generateWebsiteCode(lead);
          handleSiteCodeUpdate(lead.id, code);
          setIsGeneratingSite(false);
      }
  };

  const handleSiteCodeUpdate = (leadId: string, newCode: string) => {
      const updateLeadCode = (list: Lead[]) => list.map(l => l.id === leadId ? { ...l, generatedSiteCode: newCode } : l);
      setLeads(prev => updateLeadCode(prev));
      
      // Update Active Modal
      if (activeLeadForSite && activeLeadForSite.id === leadId) {
          setActiveLeadForSite({ ...activeLeadForSite, generatedSiteCode: newCode });
      }

      // Update History Persistence
       if (activeTab === 'history' && selectedCampaign) {
          const updatedCampaignLeads = updateLeadCode(selectedCampaign.leads);
          const updatedCampaign = { ...selectedCampaign, leads: updatedCampaignLeads };
          setSelectedCampaign(updatedCampaign);
          const updatedUser = {
              ...currentUser,
              campaigns: currentUser.campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c)
          };
          setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
       }
  };

  const handleOpenChat = (lead: Lead) => {
      setActiveLeadForChat(lead);
  };

  const handleChatSend = async (msg: string) => {
      if (!activeLeadForChat) return;
      setIsChatLoading(true);

      const updatedHistory = [...(activeLeadForChat.aiChatHistory || []), { role: 'user', content: msg } as const];
      
      const updateLeadChat = (list: Lead[], hist: any[]) => list.map(l => l.id === activeLeadForChat.id ? { ...l, aiChatHistory: hist } : l);

      setActiveLeadForChat(prev => prev ? { ...prev, aiChatHistory: updatedHistory } : null);
      setLeads(prev => updateLeadChat(prev, updatedHistory));

      const answer = await askLeadQuestion(activeLeadForChat, msg, updatedHistory);
      
      const finalHistory = [...updatedHistory, { role: 'assistant', content: answer } as const];
      setActiveLeadForChat(prev => prev ? { ...prev, aiChatHistory: finalHistory } : null);
      setLeads(prev => updateLeadChat(prev, finalHistory));
      
      // Update History Persistence
      if (activeTab === 'history' && selectedCampaign) {
          const updatedCampaignLeads = updateLeadChat(selectedCampaign.leads, finalHistory);
          const updatedCampaign = { ...selectedCampaign, leads: updatedCampaignLeads };
          setSelectedCampaign(updatedCampaign);
          const updatedUser = {
              ...currentUser,
              campaigns: currentUser.campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c)
          };
          setAllUsers(allUsers.map(u => u.id === currentUser.id ? updatedUser : u));
      }

      setIsChatLoading(false);
  };

  const currentLeadsToDisplay = activeTab === 'history' && selectedCampaign ? selectedCampaign.leads : leads;
  
  const filteredLeads = currentLeadsToDisplay.filter(lead => {
      if (potentialFilter !== 'all' && lead.potential !== potentialFilter) return false;
      if (textFilter && !lead.companyName.toLowerCase().includes(textFilter.toLowerCase())) return false;
      if (caeFilter && (!lead.cae || !lead.cae.includes(caeFilter))) return false;
      return true;
  });

  return (
    <div className="flex h-screen bg-ai-dark text-white overflow-hidden font-sans">
      <aside className="w-64 border-r border-gray-800 bg-ai-dark/50 hidden md:flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 bg-ai-accent rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">LeadScope LEDs</span>
        </div>
        <nav className="space-y-2">
            <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`w-full text-left px-4 py-2 rounded text-sm font-bold flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <Database className="w-4 h-4" /> Nova Campanha
            </button>
            
            <button 
                onClick={() => { setActiveTab('history'); setSelectedCampaign(null); }} 
                className={`w-full text-left px-4 py-2 rounded text-sm font-bold flex items-center gap-2 ${activeTab === 'history' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <History className="w-4 h-4" /> Histórico
            </button>

            {currentUser.role === 'admin' && (
                <button 
                    onClick={() => setActiveTab('admin')} 
                    className={`w-full text-left px-4 py-2 rounded text-sm font-bold flex items-center gap-2 ${activeTab === 'admin' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <UserCog className="w-4 h-4" /> Admin
                </button>
            )}

            <button onClick={onLogout} className="w-full text-left px-4 py-2 text-gray-400 hover:text-white text-sm flex items-center gap-2 mt-auto">
                <LogOut className="w-4 h-4" /> Sair
            </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-ai-dark shrink-0">
            <h1 className="font-bold">
                {activeTab === 'dashboard' && 'Nova Campanha de Prospeção'}
                {activeTab === 'history' && 'Histórico de Campanhas'}
                {activeTab === 'admin' && 'Gestão de Utilizadores'}
            </h1>
            <div className="flex items-center gap-4 text-sm">
                <div className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-ai-accent" />
                    <span className="font-bold">{currentUser.credits}</span> 
                    <span className="text-gray-400 text-xs">créditos</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <UserIcon className="w-4 h-4" /> {currentUser.name}
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
            
            {/* --- DASHBOARD (NEW CAMPAIGN) --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="bg-ai-card border border-gray-800 rounded-xl p-6">
                        {/* Campaign Name Input */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome da Campanha <span className="text-red-500">*</span></label>
                            <input 
                                value={campaignName} onChange={e => setCampaignName(e.target.value)}
                                placeholder="Ex: Stands Porto - Março 24"
                                className="w-full bg-ai-dark border border-gray-700 rounded p-3 text-sm focus:border-ai-accent outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <input 
                                value={location} onChange={e => setLocation(e.target.value)}
                                placeholder="Localização (Opcional)"
                                className="bg-ai-dark border border-gray-700 rounded p-3 text-sm md:col-span-1"
                            />
                            <input 
                                value={niche} onChange={e => setNiche(e.target.value)}
                                placeholder="Nicho (Opcional)"
                                className="bg-ai-dark border border-gray-700 rounded p-3 text-sm md:col-span-1"
                            />
                            
                             <div className="bg-ai-dark border border-gray-700 rounded p-3 text-sm flex items-center justify-between">
                                 <span className="text-gray-400 text-xs font-bold uppercase mr-2">Qtd: {leadLimit}</span>
                                 <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    step="1"
                                    value={leadLimit}
                                    onChange={(e) => setLeadLimit(parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                 />
                             </div>

                            <button 
                                onClick={handleStart}
                                disabled={stage !== 'idle' && stage !== 'finished'}
                                className="bg-ai-accent hover:bg-blue-600 text-white font-bold rounded p-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {stage === 'searching' ? <Loader2 className="animate-spin" /> : <Search />}
                                <span>BUSCAR (1 Crédito)</span>
                            </button>
                        </div>
                        
                        {stage !== 'idle' && (
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4">
                                {AGENTS.map(agent => (
                                    <AgentCard 
                                        key={agent.id}
                                        id={agent.id}
                                        name={agent.name}
                                        role={agent.role}
                                        iconName={agent.icon}
                                        status={agentStatuses[agent.id]}
                                        log={logs[agent.id]}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {leads.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Database className="text-ai-accent"/> Resultados Atuais
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                        <input 
                                            placeholder="Filtrar por nome..." 
                                            className="bg-gray-800 border border-gray-700 rounded pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-ai-accent"
                                            value={textFilter}
                                            onChange={(e) => setTextFilter(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Hash className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                        <input 
                                            placeholder="Filtrar por CAE..." 
                                            className="bg-gray-800 border border-gray-700 rounded pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-ai-accent w-32"
                                            value={caeFilter}
                                            onChange={(e) => setCaeFilter(e.target.value)}
                                        />
                                    </div>
                                    <select 
                                        className="bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                                        value={potentialFilter}
                                        onChange={(e) => setPotentialFilter(e.target.value as any)}
                                    >
                                        <option value="all">Todos os Potenciais</option>
                                        <option value="Hot">🔥 Quentes (Prioridade)</option>
                                        <option value="Medium">⚖️ Médios</option>
                                        <option value="Cold">❄️ Frios</option>
                                    </select>
                                </div>
                            </div>

                            <LeadResults 
                                leads={filteredLeads} 
                                onInvestigate={handleInvestigateStorefront} 
                                onGenerateProposal={handleOpenProposal}
                                onAskAI={handleOpenChat}
                                onGenerateSite={handleGenerateSite}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* --- HISTORY VIEW --- */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {!selectedCampaign ? (
                        <div className="grid grid-cols-1 gap-4">
                            {currentUser.campaigns.length === 0 && (
                                <div className="text-center text-gray-500 py-10">
                                    Nenhuma campanha encontrada no histórico.
                                </div>
                            )}
                            {currentUser.campaigns.map(camp => (
                                <div key={camp.id} onClick={() => setSelectedCampaign(camp)} className="bg-ai-card border border-gray-700 hover:border-ai-accent p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group">
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-ai-accent">{camp.name}</h3>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-4">
                                            <span><Calendar className="w-3 h-3 inline mr-1"/> {new Date(camp.date).toLocaleDateString()}</span>
                                            <span><MapPin className="w-3 h-3 inline mr-1"/> {camp.location || "N/A"}</span>
                                            <span><Target className="w-3 h-3 inline mr-1"/> {camp.niche || "N/A"}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="block text-xl font-bold text-white">{camp.leads.length}</span>
                                            <span className="text-xs text-gray-500 uppercase">Leads</span>
                                        </div>
                                        <ChevronRight className="text-gray-500 group-hover:text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <button onClick={() => setSelectedCampaign(null)} className="mb-4 text-sm text-gray-400 hover:text-white flex items-center gap-1">
                                &larr; Voltar ao Histórico
                            </button>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">
                                    Campanha: <span className="text-ai-accent">{selectedCampaign.name}</span>
                                </h2>
                                <span className="text-sm text-gray-400">
                                    {new Date(selectedCampaign.date).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                    <input 
                                        placeholder="Filtrar por nome..." 
                                        className="bg-gray-800 border border-gray-700 rounded pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-ai-accent"
                                        value={textFilter}
                                        onChange={(e) => setTextFilter(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <Hash className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                    <input 
                                        placeholder="Filtrar por CAE..." 
                                        className="bg-gray-800 border border-gray-700 rounded pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-ai-accent w-32"
                                        value={caeFilter}
                                        onChange={(e) => setCaeFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                            <LeadResults 
                                leads={filteredLeads} 
                                onInvestigate={handleInvestigateStorefront} 
                                onGenerateProposal={handleOpenProposal}
                                onAskAI={handleOpenChat}
                                onGenerateSite={handleGenerateSite}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* --- ADMIN VIEW --- */}
            {activeTab === 'admin' && (
                <div className="space-y-8">
                    {/* User Management */}
                    <div className="bg-ai-card border border-gray-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <UserCog className="text-ai-accent" /> Gestão de Utilizadores
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3">Nome</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Plano</th>
                                        <th className="px-6 py-3">Créditos</th>
                                        <th className="px-6 py-3">Campanhas</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.map(user => (
                                        <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                            <td className="px-6 py-4 font-bold text-white">{user.name}</td>
                                            <td className="px-6 py-4">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`py-1 px-2 rounded text-xs bg-gray-700 text-gray-300`}>
                                                    {user.plan}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-white">{user.credits}</td>
                                            <td className="px-6 py-4">{user.campaigns.length}</td>
                                            <td className="px-6 py-4">
                                                {user.status === 'active' 
                                                    ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Ativo</span> 
                                                    : <span className="text-red-400">Inativo</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-1.5 hover:bg-gray-700 rounded text-ai-accent transition-colors"
                                                    title="Editar Utilizador"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Plan Management */}
                    <div className="bg-ai-card border border-gray-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CreditCard className="text-ai-accent" /> Gestor de Planos
                        </h2>
                        
                        {/* New Plan Input */}
                        <div className="flex flex-wrap gap-4 mb-6 bg-gray-800/50 p-4 rounded-lg items-end">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Plano</label>
                                <input 
                                    value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                                    placeholder="Ex: Enterprise" className="bg-ai-dark border border-gray-700 rounded p-2 text-sm w-40"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Preço Display</label>
                                <input 
                                    value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})}
                                    placeholder="Ex: 299€" className="bg-ai-dark border border-gray-700 rounded p-2 text-sm w-24"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Créditos Padrão</label>
                                <input 
                                    type="number" value={newPlan.credits} onChange={e => setNewPlan({...newPlan, credits: parseInt(e.target.value)})}
                                    className="bg-ai-dark border border-gray-700 rounded p-2 text-sm w-24"
                                />
                            </div>
                            <button 
                                onClick={handleCreatePlan}
                                className="bg-ai-accent hover:bg-blue-600 text-white font-bold rounded p-2 px-4 text-sm flex items-center gap-2 h-[38px]"
                            >
                                <Plus className="w-4 h-4" /> Criar Plano
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {plans.map(plan => (
                                <div key={plan.id} className="border border-gray-700 bg-gray-800 rounded-lg p-4 relative group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white">{plan.name}</h3>
                                        <span className="text-sm text-ai-accent font-bold">{plan.price}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-2">Inclui {plan.credits} créditos</p>
                                    <button 
                                        onClick={() => handleDeletePlan(plan.id)}
                                        className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- MODALS --- */}
        {activeLeadForProposal && (
            <ProposalModal 
                isOpen={!!activeLeadForProposal}
                onClose={() => setActiveLeadForProposal(null)}
                companyName={activeLeadForProposal.companyName}
                proposalText={activeLeadForProposal.fullProposalText || ''}
                isLoading={isGeneratingProposal}
            />
        )}
        
        {activeLeadForChat && (
            <AskAIModal 
                isOpen={!!activeLeadForChat}
                onClose={() => setActiveLeadForChat(null)}
                lead={activeLeadForChat}
                onSend={handleChatSend}
                chatHistory={activeLeadForChat.aiChatHistory || []}
                isLoading={isChatLoading}
            />
        )}
        
        {activeLeadForSite && activeLeadForSite.generatedSiteCode && (
            <CodePreviewModal
                isOpen={!!activeLeadForSite}
                onClose={() => setActiveLeadForSite(null)}
                companyName={activeLeadForSite.companyName}
                code={activeLeadForSite.generatedSiteCode || ''}
                isLoading={isGeneratingSite}
                onUpdateCode={(newCode) => handleSiteCodeUpdate(activeLeadForSite.id, newCode)}
                onRefine={(instruction) => refineWebsiteCode(activeLeadForSite.generatedSiteCode || '', instruction)}
            />
        )}
        
        {/* Loading State for Site Gen outside of modal if needed, currently passed to modal logic but if modal is closed we wait */}
        {isGeneratingSite && !activeLeadForSite?.generatedSiteCode && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                 <div className="bg-ai-card border border-gray-700 p-8 rounded-xl flex flex-col items-center">
                     <Loader2 className="w-10 h-10 text-ai-accent animate-spin mb-4" />
                     <p className="text-white font-bold">A gerar website inicial...</p>
                 </div>
             </div>
        )}

        {/* --- ADMIN EDIT MODAL --- */}
        {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-ai-card border border-gray-700 w-full max-w-md rounded-xl shadow-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-ai-accent" /> Editar Utilizador
                    </h3>
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome</label>
                            <input 
                                value={editingUser.name}
                                onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email</label>
                            <input 
                                value={editingUser.email}
                                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Password</label>
                            <input 
                                type="text"
                                value={editingUser.password || ''}
                                onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Plano</label>
                                <select 
                                    value={editingUser.plan}
                                    onChange={e => setEditingUser({...editingUser, plan: e.target.value})}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                                >
                                    {plans.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Créditos</label>
                                <input 
                                    type="number"
                                    value={editingUser.credits}
                                    onChange={e => setEditingUser({...editingUser, credits: parseInt(e.target.value)})}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-ai-accent hover:bg-blue-600 text-white font-bold rounded text-sm"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}