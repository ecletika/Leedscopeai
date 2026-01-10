import React, { useState, useEffect } from 'react';
import { Lead, ProcessingStage, User, SmtpConfig } from '../types';
import AgentCard from './AgentCard';
import LeadResults from './LeadResults';
import { Target, MapPin, Loader2, Database, Mail, Globe, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Star, Phone, Briefcase, Zap, MonitorPlay, Send, Copy, X, Filter, Users, LayoutDashboard, Plus, Trash2, Search, Map, Sparkles, SlidersHorizontal, Settings, Server, Shield, Key, Lock, Save, Terminal, Activity, Wifi, LogOut } from 'lucide-react';
import { searchLeadsInLocation, analyzeAndGenerateProposal, generateOutreachEmail, generateWebsiteCode, testSmtpConfiguration } from '../services/geminiService';
import { sendRealSmtpTest } from '../services/emailService';

// Reusing existing agent definitions
const AGENTS = [
  { id: 0, name: 'Agente Mestre', role: 'Orquestrador', icon: 'orchestrator' },
  { id: 1, name: 'Módulo de Busca', role: 'Descoberta de Nicho', icon: 'search' },
  { id: 2, name: 'Auditor Digital', role: 'Pontuação Digital', icon: 'audit' },
  { id: 3, name: 'Enriquecimento', role: 'Mineração de Dados', icon: 'scraper' },
  { id: 5, name: 'Estrategista', role: 'Geração de Proposta', icon: 'proposal' },
  { id: 8, name: 'Outreach', role: 'Sequência de Email', icon: 'email' },
  { id: 7, name: 'Construtor Web', role: 'Funcionalidade Pro', icon: 'scraper' },
];

interface DashboardProps {
  currentUser: User;
  allUsers: User[];
  setAllUsers: (users: User[]) => void;
  onLogout: () => void;
}

export default function Dashboard({ currentUser, allUsers, setAllUsers, onLogout }: DashboardProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'webbuilder' | 'admin'>('dashboard');

  // Prospecting State
  const [location, setLocation] = useState('');
  const [niche, setNiche] = useState('');
  const [aiContext, setAiContext] = useState(''); 
  const [searchMode, setSearchMode] = useState<'standard' | 'street'>('standard');
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [logs, setLogs] = useState<Record<number, string>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<number, 'idle' | 'working' | 'finished' | 'error'>>({
    0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle', 5: 'idle', 7: 'idle', 8: 'idle'
  });
  
  // Filters State
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'has_site' | 'no_site'>('all');
  const [textFilter, setTextFilter] = useState('');
  const [nifFilter, setNifFilter] = useState(''); // Estado para filtro de NIF
  const [secondaryCaeFilter, setSecondaryCaeFilter] = useState('');
  const [foundationYearFilter, setFoundationYearFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Admin State
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', plan: 'Starter' as const });
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
      host: 'smtp.gmail.com',
      port: '587',
      user: '',
      pass: '',
      fromName: 'LeadScope Agency',
      fromEmail: '',
      secure: false // Usually 587 uses STARTTLS which starts insecure then upgrades
  });
  const [smtpSaved, setSmtpSaved] = useState(false);
  
  // SMTP Test State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestLog, setSmtpTestLog] = useState<string>('');
  const [smtpTestStatus, setSmtpTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const updateAgent = (id: number, status: 'idle' | 'working' | 'finished' | 'error', logText?: string) => {
    setAgentStatuses(prev => ({ ...prev, [id]: status }));
    if (logText) setLogs(prev => ({ ...prev, [id]: logText }));
  };

  const handleStart = async () => {
    // UPDATED VALIDATION: Allows search if aiContext is present, even if location/niche are empty
    if ((!location.trim() && !niche.trim()) && !aiContext.trim()) {
        alert("Por favor, preencha a Localização e Nicho OU use o campo de Contexto IA.");
        return;
    }
    
    if (!process.env.API_KEY) {
        alert("Chave API ausente.");
        return;
    }

    setLeads([]);
    setStage('searching');
    setAgentStatuses({ 0: 'working', 1: 'idle', 2: 'idle', 3: 'idle', 5: 'idle', 7: 'idle', 8: 'idle' });
    setLogs({});
    setWebsiteFilter('all');
    setTextFilter('');
    setNifFilter('');
    setSecondaryCaeFilter('');
    setFoundationYearFilter('');

    try {
      updateAgent(0, 'working', `A iniciar fluxo inteligente...`);
      
      // Module 1: Search
      const searchMsg = aiContext 
        ? `A pesquisar com base em instrução IA: "${aiContext}"...`
        : `A procurar empresas...`;
        
      updateAgent(1, 'working', searchMsg);
      
      const rawLeads = await searchLeadsInLocation(location, niche, searchMode, aiContext);
      
      if (!rawLeads || rawLeads.length === 0) {
          updateAgent(1, 'error', `Nenhum lead encontrado para estes critérios.`);
          updateAgent(0, 'error', `Processo abortado. Tente refinar a busca.`);
          setStage('finished');
          return;
      }

      updateAgent(1, 'finished', `Identificados ${rawLeads.length} potenciais candidatos.`);
      updateAgent(0, 'working', `A validar e auditar leads...`);

      // Initialize leads in UI as 'scouted'
      const initialLeads: Lead[] = rawLeads.map(l => ({
        ...l,
        id: crypto.randomUUID(),
        niche: niche || "Detectado por IA",
        socials: [],
        hasWebsite: !!l.website,
        isProfessionalEmail: false,
        websiteScore: 0,
        status: 'scouted',
        diagnosis: 'A aguardar validação...',
        proposal: null,
        emailSequence: [],
        generatedSiteCode: null
      } as Lead));
      
      setLeads(initialLeads);
      setStage('analyzing');

      let qualifiedCount = 0;
      const MAX_QUALIFIED = currentUser.plan === 'Starter' ? 5 : 10;
      
      // Create a temporary array to track valid leads. We will filter the main state dynamically.
      const validLeadIds = new Set<string>();

      for (const lead of initialLeads) {
        if (qualifiedCount >= MAX_QUALIFIED) {
          updateAgent(0, 'working', `Limite do plano atingido.`);
          break; 
        }

        updateAgent(2, 'working', `A auditar: ${lead.companyName}`);
        updateAgent(3, 'working', `A validar existência e dados...`);
        updateAgent(5, 'working', `A verificar viabilidade...`);
        updateAgent(8, 'idle', '');

        // Module 2, 3, 4
        // If this returns NULL, it means the lead is invalid/ghost/error
        let completedLead = await analyzeAndGenerateProposal(lead);
        
        if (!completedLead) {
             // ERROR / INVALID: Remove from list immediately
             setLeads(prev => prev.filter(l => l.id !== lead.id));
             updateAgent(2, 'error', `Lead inválido removido: ${lead.companyName}`);
             continue;
        }

        // Logic to discard healthy sites or keep good opportunities
        if (completedLead.websiteScore >= 8) {
           // Based on "so listar se realmente encontrar um leed verdadeiro" (meaning sales lead?)
           // Let's assume we keep it to show the AI worked, but mark as discarded.
           completedLead.status = 'discarded';
           completedLead.diagnosis = "Descartado: Presença digital já é forte.";
           setLeads(prev => prev.map(l => l.id === lead.id ? completedLead! : l));
        } else {
           qualifiedCount++;
           validLeadIds.add(lead.id);
           
           // Module 5: Outreach
           updateAgent(8, 'working', `A criar estratégia...`);
           completedLead = await generateOutreachEmail(completedLead);
           updateAgent(8, 'finished', 'Ok.');

           // Bonus: Site Builder
           updateAgent(7, 'working', `[PRO] A desenhar site...`);
           const siteCode = await generateWebsiteCode(completedLead);
           completedLead.generatedSiteCode = siteCode;
           updateAgent(7, 'finished', 'Ok.');
           
           setLeads(prev => prev.map(l => l.id === lead.id ? completedLead! : l));
        }

        await new Promise(r => setTimeout(r, 200));
      }

      Object.keys(agentStatuses).forEach(k => updateAgent(Number(k), 'finished'));
      
      // Final cleanup: If we ended up with no leads after filtering
      if (qualifiedCount === 0 && leads.length === 0) {
          updateAgent(0, 'finished', `Processo terminado. Nenhuma lead qualificada encontrada.`);
      } else {
          updateAgent(0, 'finished', `Concluído. ${qualifiedCount} leads qualificadas.`);
      }
      
      setStage('finished');

    } catch (error) {
      console.error(error);
      updateAgent(0, 'error', 'Erro do Sistema.');
      setStage('finished');
    }
  };

  const handleAddUser = () => {
    if(!newUser.name || !newUser.email || !newUser.password) return;
    const limits = { 'Starter': 30, 'Pro': 150, 'Agency': 9999 };
    
    const user: User = {
        id: crypto.randomUUID(),
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: 'user',
        plan: newUser.plan,
        leadsGenerated: 0,
        leadsLimit: limits[newUser.plan],
        status: 'active'
    };
    setAllUsers([...allUsers, user]);
    setNewUser({ name: '', email: '', password: '', plan: 'Starter' });
  };

  const handleDeleteUser = (id: string) => {
      setAllUsers(allUsers.filter(u => u.id !== id));
  };

  const handleSaveSmtp = () => {
      // Simulation of saving settings
      setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 3000);
  };
  
  const handleTestSmtp = async () => {
      if (!testEmailRecipient) {
          alert("Insira um email de teste.");
          return;
      }
      if (!smtpConfig.host || !smtpConfig.user) {
          alert("Configure o SMTP primeiro.");
          return;
      }

      setIsTestingSmtp(true);
      setSmtpTestLog('Initializing Infrastructure Agent...\nConnecting to ' + smtpConfig.host + '...');
      setSmtpTestStatus('idle');

      try {
          // 1. Tentar Envio Real via Backend (Produção)
          const realResult = await sendRealSmtpTest(smtpConfig, testEmailRecipient);
          setSmtpTestLog(realResult.log);
          setSmtpTestStatus(realResult.success ? 'success' : 'error');
      } catch (e: any) {
          // 2. Fallback: Se o backend não estiver rodando (Preview/Demo), usar Simulação IA
          if (e.message === 'BACKEND_OFFLINE') {
             setSmtpTestLog(prev => prev + '\n[WARN] Backend Server not detected (localhost:3001).\n[INFO] Switching to AI Protocol Simulation Mode...\n----------------------------------------\n');
             
             try {
                const simResult = await testSmtpConfiguration(smtpConfig, testEmailRecipient);
                setSmtpTestLog(prev => prev + simResult.log);
                setSmtpTestStatus(simResult.success ? 'success' : 'error');
             } catch (simError) {
                 setSmtpTestLog('Critical Agent Error during simulation.');
                 setSmtpTestStatus('error');
             }
          } else {
             setSmtpTestLog(`Critical Error: ${e.message}`);
             setSmtpTestStatus('error');
          }
      } finally {
          setIsTestingSmtp(false);
      }
  };

  const hotLeads = leads.filter(l => l.websiteScore < 5 && l.status === 'completed').length;
  const avgScore = leads.length > 0 ? (leads.reduce((a, b) => a + b.websiteScore, 0) / leads.length).toFixed(1) : '0';

  const filteredLeads = leads.filter(lead => {
    // Basic Website Filter
    if (websiteFilter === 'has_site' && !lead.hasWebsite) return false;
    if (websiteFilter === 'no_site' && lead.hasWebsite) return false;
    
    // Advanced Filter: NIF
    if (nifFilter) {
      if (!lead.nif || !lead.nif.includes(nifFilter)) {
        return false;
      }
    }

    // Advanced Filter: Secondary CAE
    if (secondaryCaeFilter) {
        if (!lead.secondaryCae || !lead.secondaryCae.some(c => c.toLowerCase().includes(secondaryCaeFilter.toLowerCase()))) {
            return false;
        }
    }

    // Advanced Filter: Foundation Year
    if (foundationYearFilter) {
        if (!lead.foundationYear || !lead.foundationYear.toString().includes(foundationYearFilter)) {
            return false;
        }
    }

    // Basic Text Filter
    if (textFilter) {
        const lower = textFilter.toLowerCase();
        return lead.companyName.toLowerCase().includes(lower) ||
               lead.nif?.toLowerCase().includes(lower) ||
               lead.cae?.toLowerCase().includes(lower) ||
               lead.niche.toLowerCase().includes(lower);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-ai-dark text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-ai-dark/50 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ai-accent rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">LeadScope AI</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-ai-accent/10 text-ai-accent' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Painel Principal
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'campaigns' ? 'bg-ai-accent/10 text-ai-accent' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Mail className="w-4 h-4" /> Campanhas
          </button>
          <button 
            onClick={() => setActiveTab('webbuilder')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'webbuilder' ? 'bg-ai-accent/10 text-ai-accent' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Globe className="w-4 h-4" /> Construtor Web
          </button>
          
          {currentUser.role === 'admin' && (
             <>
               <div className="pt-4 mt-4 border-t border-gray-800 px-4 text-xs font-bold text-gray-500 uppercase">Administração</div>
               <button 
                 onClick={() => setActiveTab('admin')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'admin' ? 'bg-ai-accent/10 text-ai-accent' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
               >
                 <Settings className="w-4 h-4" /> Sistema & Utilizadores
               </button>
             </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold">
                 {currentUser.name.substring(0,2).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium truncate">{currentUser.name}</p>
               <p className="text-xs text-ai-accent">Plano {currentUser.plan}</p>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-ai-dark shrink-0">
          <h1 className="text-lg font-bold">
              {activeTab === 'dashboard' && 'Painel de Prospeção'}
              {activeTab === 'campaigns' && 'Campanhas de Email'}
              {activeTab === 'webbuilder' && 'Construtor de Sites IA'}
              {activeTab === 'admin' && 'Administração do SaaS'}
          </h1>
          <div className="flex items-center gap-4">
             <div className="text-xs text-gray-400">Leads Usadas: <span className="text-white">{currentUser.leadsGenerated} / {currentUser.leadsLimit}</span></div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-ai-card p-4 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase font-bold">Leads Totais Hoje</p>
                  <p className="text-2xl font-bold mt-1">{leads.length}</p>
                </div>
                <div className="bg-ai-card p-4 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase font-bold text-ai-accent">Leads Quentes (Score &lt; 5)</p>
                  <p className="text-2xl font-bold mt-1 text-ai-accent">{hotLeads}</p>
                </div>
                <div className="bg-ai-card p-4 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase font-bold">Média Score Digital</p>
                  <p className="text-2xl font-bold mt-1">{avgScore}</p>
                </div>
                <div className="bg-ai-card p-4 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-500 uppercase font-bold">Emails Criados</p>
                  <p className="text-2xl font-bold mt-1">{leads.reduce((a,b) => a + (b.emailSequence?.length || 0), 0)}</p>
                </div>
              </div>

              {/* Generator Input */}
              <div className="bg-ai-card border border-gray-800 rounded-xl p-6">
                <div className="flex flex-col gap-4">
                  {/* Mode Selector */}
                  <div className="flex justify-start">
                     <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                        <button 
                          onClick={() => setSearchMode('standard')}
                          className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${searchMode === 'standard' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                        >
                           <Search className="w-3 h-3" /> Busca Padrão
                        </button>
                        <button 
                          onClick={() => setSearchMode('street')}
                          className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${searchMode === 'street' ? 'bg-ai-accent text-white shadow' : 'text-gray-500 hover:text-white'}`}
                        >
                           <Map className="w-3 h-3" /> Scanner de Rua (Google Maps)
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-4">
                        <label className="text-xs font-bold text-gray-400 block mb-2">Freguesia / Cidade (Opcional)</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                              type="text" 
                              value={location}
                              onChange={e => setLocation(e.target.value)}
                              placeholder="ex: Benfica, Lisboa"
                              className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-ai-accent outline-none"
                            />
                        </div>
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-xs font-bold text-gray-400 block mb-2">Nicho ou Código CAE (Opcional)</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                              type="text" 
                              value={niche}
                              onChange={e => setNiche(e.target.value)}
                              placeholder="ex: Restaurantes, 43210"
                              className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-ai-accent outline-none"
                            />
                        </div>
                      </div>
                      <div className="md:col-span-4">
                        <button 
                          onClick={handleStart}
                          disabled={stage === 'searching' || stage === 'analyzing'}
                          className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${stage !== 'idle' && stage !== 'finished' ? 'bg-gray-700 text-gray-400' : 'bg-ai-accent hover:bg-blue-600 text-white'}`}
                        >
                          {stage !== 'idle' && stage !== 'finished' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'GERAR LEADS'}
                        </button>
                      </div>

                      {/* AI Context Field - Full Width */}
                      <div className="md:col-span-12">
                          <label className="text-xs font-bold text-ai-accent block mb-2 flex items-center gap-2">
                             <Sparkles className="w-3 h-3" /> Buscador Inteligente IA (Ex: "Restaurantes Italianos no Porto que não têm site")
                          </label>
                          <input 
                              type="text" 
                              value={aiContext}
                              onChange={e => setAiContext(e.target.value)}
                              placeholder="Digite aqui sua instrução de busca..."
                              className="w-full bg-ai-dark/50 border border-gray-700/50 rounded-lg py-2.5 px-4 text-sm focus:border-ai-accent outline-none text-gray-300 placeholder-gray-600"
                          />
                      </div>
                  </div>
                </div>
                
                {/* Agents Visualization */}
                {stage !== 'idle' && (
                  <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-2 md:grid-cols-7 gap-2">
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

              {/* Lead List Table */}
              {leads.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Database className="w-4 h-4" /> Resultados ({filteredLeads.length})
                          </h3>
                          
                          <div className="flex flex-1 md:justify-end gap-3">
                            {/* Text Search / CAE Filter */}
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input 
                                  type="text" 
                                  value={textFilter}
                                  onChange={e => setTextFilter(e.target.value)}
                                  placeholder="Filtrar por nome, NIF ou CAE..."
                                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-xs focus:border-ai-accent outline-none text-white placeholder-gray-500"
                                />
                            </div>

                            {/* Status Filters */}
                            <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg border border-gray-700 shrink-0">
                                <button
                                onClick={() => setWebsiteFilter('all')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${websiteFilter === 'all' ? 'bg-ai-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                Todas
                                </button>
                                <button
                                onClick={() => setWebsiteFilter('has_site')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${websiteFilter === 'has_site' ? 'bg-ai-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                Com Site
                                </button>
                                <button
                                onClick={() => setWebsiteFilter('no_site')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${websiteFilter === 'no_site' ? 'bg-ai-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                Sem Site
                                </button>
                            </div>

                            {/* Advanced Filters Toggle */}
                            <button
                               onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                               className={`p-2 rounded-lg border transition-colors ${showAdvancedFilters ? 'bg-ai-accent text-white border-ai-accent' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                               title="Filtros Avançados"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                      </div>

                      {/* Advanced Filters Panel */}
                      {showAdvancedFilters && (
                        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 fade-in">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">NIF</label>
                                <input 
                                  type="text" 
                                  value={nifFilter}
                                  onChange={e => setNifFilter(e.target.value)}
                                  placeholder="Ex: 510..."
                                  className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-xs text-white focus:border-ai-accent outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">CAE Secundário</label>
                                <input 
                                  type="text" 
                                  value={secondaryCaeFilter}
                                  onChange={e => setSecondaryCaeFilter(e.target.value)}
                                  placeholder="Ex: 47111..."
                                  className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-xs text-white focus:border-ai-accent outline-none"
                                />
                            </div>
                             <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Ano de Fundação</label>
                                <input 
                                  type="text" 
                                  value={foundationYearFilter}
                                  onChange={e => setFoundationYearFilter(e.target.value)}
                                  placeholder="Ex: 2020..."
                                  className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-xs text-white focus:border-ai-accent outline-none"
                                />
                            </div>
                        </div>
                      )}
                  </div>
                  
                  <div className="bg-ai-card border border-gray-800 rounded-xl overflow-hidden">
                     {/* Using the specialized LeadResults component, but passing filtered leads */}
                     <LeadResults leads={filteredLeads} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: CAMPAIGNS (Mock) */}
          {activeTab === 'campaigns' && (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                   <Mail className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold">Campanhas Ativas</h2>
                <p className="text-gray-400 max-w-md">
                   Aqui pode gerir os emails enviados e as respostas. Esta funcionalidade conecta-se ao seu SMTP para envio em massa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
                   <div className="bg-ai-card p-6 rounded-xl border border-gray-800 text-left">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2">Campanha #1 - Dentistas Lisboa</div>
                      <div className="text-2xl font-bold text-white mb-1">45%</div>
                      <div className="text-sm text-ai-success">Taxa de Abertura</div>
                   </div>
                   <div className="bg-ai-card p-6 rounded-xl border border-gray-800 text-left">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2">Campanha #2 - Imobiliário Porto</div>
                      <div className="text-2xl font-bold text-white mb-1">12%</div>
                      <div className="text-sm text-ai-accent">Taxa de Resposta</div>
                   </div>
                   <div className="bg-ai-card p-6 rounded-xl border border-gray-800 text-left">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2">Agendamentos</div>
                      <div className="text-2xl font-bold text-white mb-1">3</div>
                      <div className="text-sm text-purple-400">Reuniões esta semana</div>
                   </div>
                </div>
             </div>
          )}

          {/* VIEW: WEB BUILDER (Mock) */}
          {activeTab === 'webbuilder' && (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                   <Globe className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold">Construtor de Sites IA</h2>
                <p className="text-gray-400 max-w-md">
                   Selecione uma lead qualificada para gerar um site completo automaticamente.
                </p>
                
                {leads.filter(l => l.generatedSiteCode).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl mt-8">
                        {leads.filter(l => l.generatedSiteCode).map(lead => (
                            <div key={lead.id} className="bg-ai-card rounded-xl border border-gray-800 overflow-hidden hover:border-ai-accent transition-colors group">
                                <div className="h-32 bg-gray-900 flex items-center justify-center border-b border-gray-800">
                                    <MonitorPlay className="w-8 h-8 text-gray-600 group-hover:text-ai-accent transition-colors" />
                                </div>
                                <div className="p-4 text-left">
                                    <h3 className="font-bold text-white">{lead.companyName}</h3>
                                    <p className="text-xs text-gray-500 mb-4">{lead.niche}</p>
                                    <button 
                                      onClick={() => {
                                          const blob = new Blob([lead.generatedSiteCode!], { type: 'text/html' });
                                          const url = URL.createObjectURL(blob);
                                          window.open(url, '_blank');
                                      }}
                                      className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-bold transition-colors"
                                    >
                                        Ver Site Gerado
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-sm">
                        Gere leads primeiro para desbloquear sites automáticos.
                    </div>
                )}
             </div>
          )}

          {/* VIEW: ADMIN PANEL */}
          {activeTab === 'admin' && currentUser.role === 'admin' && (
             <div className="max-w-5xl mx-auto space-y-12">
                 
                 {/* SMTP Configuration Section */}
                 <div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-ai-accent/10 rounded-lg">
                            <Server className="w-5 h-5 text-ai-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Configuração de Envio (SMTP)</h2>
                            <p className="text-xs text-gray-500">Credenciais para o Agente de Outreach enviar emails.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-ai-card border border-gray-800 p-6 rounded-xl flex flex-col justify-between">
                            <div className="space-y-6">
                                {/* Server Info */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Globe className="w-3 h-3" /> Servidor de Saída
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">SMTP Host</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-ai-dark border border-gray-700 rounded p-2.5 text-sm focus:border-ai-accent outline-none"
                                            placeholder="ex: smtp.gmail.com"
                                            value={smtpConfig.host}
                                            onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Porta</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-ai-dark border border-gray-700 rounded p-2.5 text-sm focus:border-ai-accent outline-none"
                                            placeholder="ex: 587 ou 465"
                                            value={smtpConfig.port}
                                            onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {/* Auth Info */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> Autenticação
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Utilizador / Email</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-ai-dark border border-gray-700 rounded p-2.5 text-sm focus:border-ai-accent outline-none"
                                            placeholder="admin@leadscope.pt"
                                            value={smtpConfig.user}
                                            onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Password / App Key</label>
                                        <div className="relative">
                                            <input 
                                                type="password" 
                                                className="w-full bg-ai-dark border border-gray-700 rounded p-2.5 text-sm focus:border-ai-accent outline-none"
                                                placeholder="••••••••••••"
                                                value={smtpConfig.pass}
                                                onChange={e => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                                            />
                                            <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-800 flex justify-end items-center gap-3">
                                {smtpSaved && <span className="text-ai-success text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Guardado</span>}
                                <button 
                                    onClick={handleSaveSmtp}
                                    className="bg-ai-accent hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all"
                                >
                                    <Save className="w-4 h-4" /> Guardar Configuração
                                </button>
                            </div>
                        </div>

                        {/* Agent Test Card */}
                        <div className="bg-black/40 border border-gray-800 p-6 rounded-xl flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-ai-accent uppercase tracking-wider flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Agente de Infraestrutura
                                </h4>
                                {smtpTestStatus === 'success' && <span className="text-ai-success text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> ONLINE</span>}
                                {smtpTestStatus === 'error' && <span className="text-ai-danger text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> OFFLINE</span>}
                            </div>
                            
                            <div className="flex-1 bg-black border border-gray-800 rounded-lg p-4 font-mono text-xs overflow-y-auto mb-4 min-h-[250px] relative group">
                                {!smtpTestLog && !isTestingSmtp && (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                        <p>Aguardando comando de teste...</p>
                                    </div>
                                )}
                                {smtpTestLog ? (
                                    <div className="whitespace-pre-wrap text-green-500/90 leading-relaxed">
                                        {smtpTestLog}
                                        {isTestingSmtp && <span className="animate-pulse">_</span>}
                                    </div>
                                ) : (
                                    isTestingSmtp && (
                                        <div className="flex items-center justify-center h-full text-ai-accent">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <input 
                                    type="email"
                                    placeholder="Email de teste (ex: meu.email@gmail.com)"
                                    className="flex-1 bg-ai-dark border border-gray-700 rounded p-2 text-sm focus:border-ai-accent outline-none"
                                    value={testEmailRecipient}
                                    onChange={e => setTestEmailRecipient(e.target.value)}
                                />
                                <button 
                                    onClick={handleTestSmtp}
                                    disabled={isTestingSmtp}
                                    className={`px-4 py-2 rounded font-bold text-xs flex items-center gap-2 ${isTestingSmtp ? 'bg-gray-800 text-gray-500' : 'bg-white text-black hover:bg-gray-200'}`}
                                >
                                    {isTestingSmtp ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wifi className="w-3 h-3" />}
                                    Testar Conexão
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>


                 {/* User Management Section */}
                 <div>
                     <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-ai-accent/10 rounded-lg">
                            <Users className="w-5 h-5 text-ai-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Gestão de Utilizadores</h2>
                            <p className="text-xs text-gray-500">Adicionar, remover ou alterar planos de clientes.</p>
                        </div>
                     </div>

                     {/* Add User Form */}
                     <div className="bg-ai-card border border-gray-800 p-6 rounded-xl mb-8">
                         <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Adicionar Novo Cliente</h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                                 <input 
                                   type="text" 
                                   className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-sm"
                                   value={newUser.name}
                                   onChange={e => setNewUser({...newUser, name: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                 <input 
                                   type="email" 
                                   className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-sm"
                                   value={newUser.email}
                                   onChange={e => setNewUser({...newUser, email: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1">Senha Inicial</label>
                                 <input 
                                   type="text" 
                                   className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-sm"
                                   value={newUser.password}
                                   onChange={e => setNewUser({...newUser, password: e.target.value})}
                                   placeholder="Min. 6 caracteres"
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1">Plano</label>
                                 <select 
                                   className="w-full bg-ai-dark border border-gray-700 rounded p-2 text-sm"
                                   value={newUser.plan}
                                   onChange={e => setNewUser({...newUser, plan: e.target.value as any})}
                                 >
                                     <option value="Starter">Starter (30 leads)</option>
                                     <option value="Pro">Pro (150 leads)</option>
                                     <option value="Agency">Agency (Ilimitado)</option>
                                 </select>
                             </div>
                             <button 
                               onClick={handleAddUser}
                               className="bg-ai-accent hover:bg-blue-600 text-white font-bold py-2 rounded text-sm flex items-center justify-center gap-2 col-span-4 md:col-span-4"
                             >
                                 <Plus className="w-4 h-4" /> Adicionar Cliente
                             </button>
                         </div>
                     </div>

                     {/* Users Table */}
                     <div className="bg-ai-card border border-gray-800 rounded-xl overflow-hidden">
                         <table className="w-full text-left text-sm">
                             <thead className="bg-gray-900/50 text-gray-400 font-bold uppercase text-xs">
                                 <tr>
                                     <th className="px-6 py-4">Cliente</th>
                                     <th className="px-6 py-4">Plano</th>
                                     <th className="px-6 py-4">Leads Geradas</th>
                                     <th className="px-6 py-4">Progresso</th>
                                     <th className="px-6 py-4">Status</th>
                                     <th className="px-6 py-4 text-right">Ações</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-800">
                                 {allUsers.map(u => (
                                     <tr key={u.id}>
                                         <td className="px-6 py-4">
                                             <div className="font-bold text-white">{u.name}</div>
                                             <div className="text-xs text-gray-500">{u.email}</div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                                 u.plan === 'Agency' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                 u.plan === 'Pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                 'bg-gray-700 text-gray-300 border-gray-600'
                                             }`}>
                                                 {u.plan}
                                             </span>
                                         </td>
                                         <td className="px-6 py-4">
                                             <div className="flex flex-col">
                                                <span className="text-lg font-bold text-white">{u.leadsGenerated}</span>
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Total</span>
                                             </div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <div className="flex flex-col gap-1">
                                                 <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                     <div 
                                                       className="h-full bg-ai-success" 
                                                       style={{ width: `${Math.min(100, (u.leadsGenerated / u.leadsLimit) * 100)}%` }}
                                                     ></div>
                                                 </div>
                                                 <span className="text-xs text-gray-400">{Math.round((u.leadsGenerated / u.leadsLimit) * 100)}% do limite</span>
                                             </div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                                                 <CheckCircle className="w-3 h-3" /> Ativo
                                             </span>
                                         </td>
                                         <td className="px-6 py-4 text-right">
                                             <button 
                                               onClick={() => handleDeleteUser(u.id)}
                                               className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                               disabled={u.role === 'admin'}
                                             >
                                                 <Trash2 className="w-4 h-4" />
                                             </button>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}