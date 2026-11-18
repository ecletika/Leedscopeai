import React, { useState, useEffect, useMemo } from 'react';
import { Lead, ProcessingStage, User, SmtpConfig, Campaign, PlanDefinition } from '../types';
import AgentCard from './AgentCard';
import LeadResults from './LeadResults';
import ProposalModal from './ProposalModal';
import AskAIModal from './AskAIModal';
import CodePreviewModal from './CodePreviewModal';
import HotelManagement from './HotelManagement';
import SellerManagement from './SellerManagement';
import WeeklyPlanner from './WeeklyPlanner';
import CommercialDashboard from './CommercialDashboard';
import ContractGenerator from './ContractGenerator';
import PipelineKanban from './PipelineKanban';
import CommercialLibrary from './CommercialLibrary';
import FollowUpCenter from './FollowUpCenter';
import PlayMode from './PlayMode';
import DemoMode from './DemoMode';
import MessageTemplates from './MessageTemplates';
import QualificationModal from './QualificationModal';
import SalesTools from './SalesTools';
import ProposalBuilder from './ProposalBuilder';
import ThemeToggle from './ThemeToggle';
import Academy from './Academy';
import WorkioCatalog from './WorkioCatalog';
import AdminSales from './AdminSales';
import { canAccessAdminConsole } from '../services/accessControl';
import { Target, MapPin, Loader2, Database, Mail, Globe, AlertTriangle, CheckCircle, Search, Sparkles, SlidersHorizontal, Settings, Server, Shield, Lock, Save, Activity, Wifi, LogOut, Hash, Calendar, CalendarClock, Instagram, Facebook, Linkedin, Youtube, Video, Eye, Filter, UserCog, User as UserIcon, Users, History, Edit, CreditCard, ChevronRight, Plus, Trash2, X, FileText, Bot, BarChart3, KanbanSquare, BookOpen, RotateCcw, Lightbulb, GraduationCap, FileSignature } from 'lucide-react';
import { searchLeadsInLocation, analyzeAndGenerateProposal, generateOutreachEmail, runStorefrontInvestigation, generateCommercialProposal, askLeadQuestion, generateWebsiteCode, refineWebsiteCode } from '../services/geminiService';
import { hotelDb } from '../services/hotelDb';
import { crmDb } from '../services/crmDb';
import { CrmSeller, CrmCloseReason } from '../types';
import { SystemHealth } from './SystemHealth';
import { SEGMENTS, CUSTOM_SEGMENT_ID, getSegment } from '../services/segments';
import { searchApolloCompanies } from '../services/apolloService';
import ApolloUsageBar from './ApolloUsageBar';
import ApolloUsagePill from './ApolloUsagePill';

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

const COUNTRY_OPTIONS = [
  { code: 'PT', name: 'Portugal', defaultLocations: 'Lisboa, Porto, Algarve' },
  { code: 'AO', name: 'Angola', defaultLocations: 'Luanda, Benguela, Lubango' },
  { code: 'BR', name: 'Brasil', defaultLocations: 'São Paulo, Rio de Janeiro, Salvador' }
];

// Memoria de leads ja mostrados por pesquisa (evita repetir os mesmos hoteis)
const seenLeadsKey = (country: string, location: string, niche: string) =>
  `leadscope_seen_leads_${country}_${location}_${niche}`.toLowerCase().replace(/\s+/g, '_');

const getSeenLeads = (key: string): string[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};

const addSeenLeads = (key: string, names: string[]) => {
  const merged = new Set([...getSeenLeads(key), ...names].map((n) => (n || '').trim()).filter(Boolean));
  localStorage.setItem(key, JSON.stringify(Array.from(merged)));
};

type TabId = 'dashboard' | 'database' | 'pipeline' | 'followup' | 'tools' | 'academy' | 'crm' | 'contracts' | 'sellers' | 'library' | 'history' | 'admin';

interface NavItem {
  tab: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: string;
}

interface DashboardProps {
  currentUser: User;
  allUsers: User[];
  setAllUsers: (users: User[]) => void;
  onLogout: () => void;
}

export default function Dashboard({ currentUser, allUsers, setAllUsers, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  // "Hoje": follow-ups e planeador semanal no mesmo ecra
  const [todayView, setTodayView] = useState<'followup' | 'planner'>('followup');

  // CRM Play mode overlay
  const [activeLeadForPlay, setActiveLeadForPlay] = useState<Lead | null>(null);
  // sinal de refresh para a tabela de leads (HotelManagement carrega a sua propria lista)
  const [hotelRefreshToken, setHotelRefreshToken] = useState(0);
  // contador de buscas Google Places (creditos: comeca em limit e desce ate 0)
  const [placesUsage, setPlacesUsage] = useState<{ used: number; limit: number; warnAt: number } | null>(null);
  // lead pre-selecionado ao abrir o gerador de contratos
  const [contractLeadId, setContractLeadId] = useState<string | null>(null);
  const [activeLeadForDemo, setActiveLeadForDemo] = useState<Lead | null>(null);
  const [activeLeadForMessages, setActiveLeadForMessages] = useState<Lead | null>(null);
  // email tab — managed via activeTab === 'email'
  const [activeLeadForQualify, setActiveLeadForQualify] = useState<Lead | null>(null);
  const [activeLeadForProposalBuilder, setActiveLeadForProposalBuilder] = useState<Lead | null>(null);
  const [crmSellers, setCrmSellers] = useState<CrmSeller[]>([]);
  const [crmCloseReasons, setCrmCloseReasons] = useState<CrmCloseReason[]>([]);
  
  // Search State
  const [campaignName, setCampaignName] = useState('Hotéis Portugal - Housekeeping');
  const [country, setCountry] = useState('PT');
  const [location, setLocation] = useState('Lisboa, Porto, Algarve');
  const [segmentId, setSegmentId] = useState<string>('hotelaria');
  const [niche, setNiche] = useState('Hotéis');
  const [aiContext, setAiContext] = useState('Análise de reputação de limpeza e adequabilidade do Sistema de Governança');

  const currentSegment = getSegment(segmentId);

  // Apollo: pesquisa de empresas opcional, com teto mensal de creditos
  const [useApollo, setUseApollo] = useState(false);
  const [apolloAvailable, setApolloAvailable] = useState(false);

  // Escolher um segmento preenche nicho e contexto (o vendedor pode editar depois)
  const handleSelectSegment = (id: string) => {
    setSegmentId(id);
    const seg = getSegment(id);
    if (!seg) {
      setNiche('');
      setAiContext('');
      return;
    }
    setNiche(seg.searchTerm);
    setAiContext(`Segmento: ${seg.label}. Adequação ao Workio: ${seg.painPoints.join('; ')}.`);
    setCampaignName((prev) => (!prev.trim() || SEGMENTS.some((s) => prev.startsWith(s.searchTerm)) || prev.startsWith('Hotéis Portugal')
      ? `${seg.searchTerm} ${COUNTRY_OPTIONS.find((o) => o.code === country)?.name || ''}`.trim()
      : prev));
  };
  const [leadLimit, setLeadLimit] = useState<number>(3); 

  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [logs, setLogs] = useState<Record<number, string>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<number, 'idle' | 'working' | 'finished' | 'error'>>({
    0: 'idle', 1: 'idle', 2: 'idle', 9: 'idle', 10: 'idle', 8: 'idle'
  });
  
  // CRM Database & Agenda states
  const [savedHotels, setSavedHotels] = useState<Lead[]>([]);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [manualHotel, setManualHotel] = useState<Partial<Lead>>({
    companyName: '',
    location: '',
    website: '',
    phone: '',
    email: '',
    contactPerson: '',
    contactNotes: '',
    potential: 'Medium',
    callbackStatus: 'pending',
    callbackScheduledAt: ''
  });
  const [editingHotel, setEditingHotel] = useState<Lead | null>(null);

  const [isLoadingError, setIsLoadingError] = useState<string | null>(null);

  // Load saved hotels on mount and when changes occur
  const loadSavedHotels = async () => {
    try {
      setIsLoadingError(null);
      const data = await hotelDb.getAllHotels();
      setSavedHotels(data);
    } catch (err: any) {
      console.error("Erro ao carregar hotéis:", err);
      setIsLoadingError(`Não foi possível carregar os hotéis da base de dados: ${err.message}`);
    }
  };

  const loadCrmMeta = async () => {
    try {
      const [sellerRows, reasonRows] = await Promise.all([
        crmDb.getSellers(),
        crmDb.getCloseReasons()
      ]);
      setCrmSellers(sellerRows);
      setCrmCloseReasons(reasonRows);
    } catch (err) {
      console.warn('Falha ao carregar metadados CRM:', err);
    }
  };

  useEffect(() => {
    loadSavedHotels();
    loadCrmMeta();
  }, []);

  // Permissoes comerciais: descobre o vendedor associado ao utilizador logado
  const currentSeller = useMemo(
    () => crmSellers.find((s) =>
      (s.userId && s.userId === currentUser.id) ||
      s.email.toLowerCase() === currentUser.email.toLowerCase()
    ),
    [crmSellers, currentUser.id, currentUser.email]
  );

  // Vendedores (papel 'seller') so veem os seus leads. Admin e supervisor veem tudo.
  const restrictSellerId = useMemo(() => {
    if (currentUser.role === 'admin') return undefined;
    if (currentSeller && currentSeller.role === 'seller') return currentSeller.id;
    return undefined;
  }, [currentUser.role, currentSeller]);

  const handleOpenPlay = (lead: Lead) => {
    setActiveLeadForPlay(lead);
  };

  const handleOpenContract = (lead: Lead) => {
    setContractLeadId(lead.id);
    setActiveLeadForPlay(null);
    setActiveTab('contracts');
  };

  const handleOpenDemo = (lead: Lead) => {
    setActiveLeadForDemo(lead);
  };

  const handleOpenMessages = (lead: Lead) => {
    setActiveLeadForMessages(lead);
  };

  const handleOpenQualify = (lead: Lead) => {
    setActiveLeadForQualify(lead);
  };

  const handleOpenProposalBuilder = (lead: Lead) => {
    setActiveLeadForProposalBuilder(lead);
  };

  const loadPlacesUsage = async () => {
    try {
      const r = await fetch('/api/places/usage');
      if (r.ok) setPlacesUsage(await r.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (currentUser.role === 'admin') loadPlacesUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.role, hotelRefreshToken]);

  const handlePlaySaved = async () => {
    await loadSavedHotels();
    await loadCrmMeta();
    setHotelRefreshToken((t) => t + 1);
  };

  // Save Lead from active search results campaign directly into the B2B CRM database
  const handleSaveToDb = async (lead: Lead) => {
    console.log('--- A tentar salvar hotel no DB ---', lead.companyName);
    const success = await hotelDb.saveHotel({
      ...lead,
      niche: lead.niche || 'Hotelaria',
      callbackStatus: lead.callbackStatus || 'pending'
    });
    if (success) {
      console.log('--- Hotel salvo com sucesso! ---', lead.companyName);
      await loadSavedHotels();
    } else {
      console.error('--- Falha ao salvar hotel ---', lead.companyName);
    }
  };

  // Save manual hotel entry
  const handleSaveManualHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHotel.companyName) {
      alert("O nome do hotel é obrigatório.");
      return;
    }

    const fullHotelLead: Lead = {
      id: crypto.randomUUID(),
      companyName: manualHotel.companyName,
      location: manualHotel.location || "Portugal",
      niche: "Hotelaria",
      website: manualHotel.website || undefined,
      phone: manualHotel.phone || undefined,
      allPhones: manualHotel.phone ? [manualHotel.phone] : [],
      email: manualHotel.email || undefined,
      contactPerson: manualHotel.contactPerson || undefined,
      contactNotes: manualHotel.contactNotes || undefined,
      callbackScheduledAt: manualHotel.callbackScheduledAt || undefined,
      callbackStatus: (manualHotel.callbackStatus as any) || 'pending',
      potential: (manualHotel.potential as any) || 'Medium',
      mapsRating: 0,
      mapsReviews: 0,
      socials: [],
      nif: '',
      cae: '',
      hasWebsite: !!manualHotel.website,
      isProfessionalEmail: false,
      websiteScore: manualHotel.website ? 8 : 0,
      status: 'completed',
      potentialReasoning: 'Registo manual no CRM.',
      storefront: {
        analyzed: true,
        signageCondition: 'Unknown',
        visualAppeal: 'Medium',
        needsLedUpgrade: false,
        description: 'Parâmetro de estrutura criado manualmente.',
        address: manualHotel.location || "Portugal"
      },
      diagnosis: manualHotel.contactNotes || "Hotel registado manualmente.",
      proposal: null,
      emailSequence: [],
      generatedSiteCode: null
    };

    const success = await hotelDb.saveHotel(fullHotelLead);
    if (success) {
      await loadSavedHotels();
      setIsHotelModalOpen(false);
      setManualHotel({
        companyName: '',
        location: '',
        website: '',
        phone: '',
        email: '',
        contactPerson: '',
        contactNotes: '',
        potential: 'Medium',
        callbackStatus: 'pending',
        callbackScheduledAt: ''
      });
    }
  };

  // Delete hotel from Database
  const handleDeleteHotel = async (id: string, name: string) => {
    if (confirm(`Tem a certeza que deseja excluir "${name}" do CRM de Hotéis?`)) {
      await hotelDb.deleteHotel(id, name);
      await loadSavedHotels();
    }
  };

  // Save edited hotel properties (notes / callback dates)
  const handleSaveEditedHotelCrm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotel) return;

    // Synchronize direct updates
    const success = await hotelDb.saveHotel(editingHotel);
    if (success) {
      await loadSavedHotels();
      setEditingHotel(null);
    }
  };

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
  // Planos de utilizador (so para escolher o plano ao editar um utilizador)
  const plans = INITIAL_PLANS;

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

      // Exclui leads ja conhecidos: CRM + historico de campanhas + ja mostrados nesta pesquisa
      const seenKey = seenLeadsKey(country, location, niche);
      const excludeNames = Array.from(new Set([
        ...savedHotels.map((h) => h.companyName),
        ...currentUser.campaigns.flatMap((c) => c.leads.map((l) => l.companyName)),
        ...getSeenLeads(seenKey)
      ].map((n) => (n || '').trim()).filter(Boolean)));

      const segmentToSend = segmentId === CUSTOM_SEGMENT_ID ? undefined : segmentId;
      // Apollo (opcional, gasta creditos do teto mensal); se falhar ou vier vazio, usa a pesquisa normal
      let found: Partial<Lead>[] | null = null;
      if (useApollo && apolloAvailable) {
        try {
          updateAgent(1, 'working', 'A pesquisar empresas no Apollo...');
          const apolloLeads = await searchApolloCompanies({ country, location, niche, segmentId: segmentToSend, excludeNames });
          if (apolloLeads.length > 0) found = apolloLeads;
          else updateAgent(1, 'working', 'Apollo sem resultados novos. A usar a pesquisa normal...');
        } catch (apolloErr: any) {
          updateAgent(1, 'working', `${apolloErr?.message || 'Apollo indisponível'} A usar a pesquisa normal...`);
        }
      }
      if (!found) {
        found = await searchLeadsInLocation(country, location, niche, aiContext, campaignName, excludeNames, segmentToSend);
      }
      const rawLeads = found.map((raw) => ({ ...raw, segmentId: segmentToSend }));

      // Memoriza tudo o que veio para nao repetir na proxima pesquisa
      if (rawLeads && rawLeads.length > 0) {
        addSeenLeads(seenKey, rawLeads.map((l) => l.companyName || '').filter(Boolean));
      }

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
          location: `${COUNTRY_OPTIONS.find(option => option.code === country)?.name || country}${location ? ` - ${location}` : ''}`,
          niche: niche || "Vários",
          leads: processedLeads
      };

      const finalUser = { 
          ...updatedUserCredit, 
          campaigns: [newCampaign, ...updatedUserCredit.campaigns] 
      };
      
      setAllUsers(allUsers.map(u => u.id === currentUser.id ? finalUser : u));

    } catch (error: any) {
      console.error(error);
      setStage('finished');
      const apiErrorMsg = error instanceof Error ? error.message : 'Erro genérico ou falha na rede de dados.';
      updateAgent(0, 'error', `Falha na Campanha: ${apiErrorMsg}`);
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      
      setAllUsers(allUsers.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
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

  // Menu lateral agrupado por area de trabalho
  const isAdmin = currentUser.role === 'admin';
  // Admin Console: so o proprietario (mesmo que haja outros admins)
  const canAdminConsole = canAccessAdminConsole(currentUser);
  const overdueCount = savedHotels.filter(h =>
    h.nextActionAt && new Date(h.nextActionAt) < new Date() && !['won', 'lost', 'do_not_contact'].includes(h.commercialStatus || 'new')
  ).length;

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Prospeção',
      items: [
        { tab: 'dashboard', label: 'Nova Prospeção', icon: Search },
        { tab: 'database', label: 'Leads & CRM', icon: Database, badge: savedHotels.length }
      ]
    },
    {
      title: 'Vendas',
      items: [
        { tab: 'followup', label: 'Hoje', icon: CalendarClock, badge: overdueCount, badgeTone: 'bg-rose-600' },
        { tab: 'pipeline', label: 'Pipeline', icon: KanbanSquare }
      ]
    },
    {
      title: 'Formação e materiais',
      items: [
        { tab: 'academy', label: 'Academia', icon: GraduationCap },
        { tab: 'tools', label: 'Ferramentas de Venda', icon: Lightbulb },
        ...(isAdmin ? [{ tab: 'library' as TabId, label: 'Scripts & Materiais', icon: BookOpen }] : [])
      ]
    },
    {
      title: 'Gestão',
      items: [
        { tab: 'crm', label: 'Dashboard Vendas', icon: BarChart3 },
        ...(isAdmin ? [
          { tab: 'contracts' as TabId, label: 'Contratos', icon: FileSignature },
          { tab: 'sellers' as TabId, label: 'Equipa Comercial', icon: Users }
        ] : []),
        ...(canAdminConsole ? [{ tab: 'admin' as TabId, label: 'Admin Console', icon: UserCog }] : [])
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-ai-dark text-white overflow-hidden font-sans">
      <aside className="sol-sidebar w-64 h-screen min-h-0 border-r border-gray-800 hidden md:flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-lg shadow-emerald-500/20">
              {/* «W» do Workio, com as cores da marca */}
              <svg viewBox="0 0 64 64" className="w-6 h-6" aria-hidden="true">
                <polygon points="5,17 31,17 18,45" fill="#23C7A6" stroke="#23C7A6" strokeWidth="6" strokeLinejoin="round" />
                <polygon points="33,17 59,17 46,45" fill="#E85BA0" stroke="#E85BA0" strokeWidth="6" strokeLinejoin="round" />
                <polygon points="23,45 41,45 32,17" fill="#F4D23C" stroke="#F4D23C" strokeWidth="6" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white">LeadScope</span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-bold">WORKIO · VENDAS</span>
            </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 -mr-1">
            {navGroups.map((group) => (
                <div key={group.title} className="mb-4">
                    <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">{group.title}</div>
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const active = activeTab === item.tab;
                            return (
                                <button
                                    key={item.tab}
                                    onClick={() => setActiveTab(item.tab)}
                                    className={`w-full text-left px-4.5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-3 transition-all ${active ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'}`}
                                >
                                    <Icon className="w-4 h-4" /> {item.label}
                                    {item.badge ? (
                                        <span className={`ml-auto px-1.5 py-0.5 text-[9px] text-white rounded font-mono font-bold leading-none ${item.badgeTone || 'bg-emerald-600'}`}>
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <button onClick={onLogout} className="w-full text-left px-4.5 py-2.5 text-gray-500 hover:text-rose-400 text-xs font-bold flex items-center gap-3 mt-2 border border-transparent">
                <LogOut className="w-4 h-4" /> Terminar Sessão
            </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-800/50 shrink-0">
            <SystemHealth compact={true} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-ai-dark shrink-0">
            <h1 className="font-bold text-white tracking-tight flex items-center gap-2">
                {activeTab === 'dashboard' && 'Nova Prospeção'}
                {activeTab === 'database' && 'Base de Dados de Hotéis & CRM'}
                {activeTab === 'pipeline' && 'Pipeline Comercial'}
                {activeTab === 'followup' && 'Hoje: follow-ups e planeamento'}
                {activeTab === 'tools' && 'Ferramentas de Venda'}
                {activeTab === 'academy' && 'Academia'}
                {activeTab === 'crm' && 'Dashboard de Vendas'}
                {activeTab === 'contracts' && 'Gerador de Contratos'}
                {activeTab === 'sellers' && 'Equipa Comercial'}
                {activeTab === 'library' && 'Scripts, Objeções e Materiais'}
                {activeTab === 'history' && 'Histórico de Pesquisas'}
                {activeTab === 'admin' && 'Gestão Administrativa'}
            </h1>
            <div className="flex items-center gap-4 text-sm">
                <ThemeToggle />
                {currentUser.role === 'admin' && placesUsage ? (
                    <div
                        className={`px-3 py-1 rounded-full flex items-center gap-2 border ${placesUsage.used >= placesUsage.warnAt ? 'bg-rose-500/10 border-rose-500/40' : 'bg-gray-800 border-gray-700'}`}
                        title={`Buscas Google usadas: ${placesUsage.used} de ${placesUsage.limit} este mês`}
                    >
                        <CreditCard className={`w-4 h-4 ${placesUsage.used >= placesUsage.warnAt ? 'text-rose-400' : 'text-emerald-400'}`} />
                        <span className={`font-bold ${placesUsage.used >= placesUsage.warnAt ? 'text-rose-300' : 'text-white'}`}>{Math.max(placesUsage.limit - placesUsage.used, 0)}</span>
                        <span className="text-gray-400 text-xs">créditos Google</span>
                    </div>
                ) : (
                    <div className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white">{currentUser.credits}</span>
                        <span className="text-gray-400 text-xs">créditos</span>
                    </div>
                )}
                <ApolloUsagePill />
                <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-500" /> {currentUser.name} ({currentUser.role})
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

                        {/* Segmento de mercado */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Segmento a prospetar</label>
                            <div className="flex flex-wrap gap-2">
                                {SEGMENTS.map((seg) => (
                                    <button
                                        key={seg.id}
                                        type="button"
                                        onClick={() => handleSelectSegment(seg.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${segmentId === seg.id ? 'bg-emerald-600/15 text-emerald-300 border-emerald-500/40' : 'bg-ai-dark text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
                                    >
                                        {seg.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => handleSelectSegment(CUSTOM_SEGMENT_ID)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${segmentId === CUSTOM_SEGMENT_ID ? 'bg-emerald-600/15 text-emerald-300 border-emerald-500/40' : 'bg-ai-dark text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'}`}
                                >
                                    Outro (personalizado)
                                </button>
                            </div>
                            {currentSegment && (
                                <p className="mt-2 text-[11px] text-gray-500">
                                    <span className="text-gray-400 font-bold">{currentSegment.product}</span> · Decisor: {currentSegment.contactRole} · {currentSegment.pitch}
                                </p>
                            )}
                        </div>

                        {/* Apollo: fonte opcional com teto mensal de creditos */}
                        <div className="mb-4 rounded-lg border border-gray-800 bg-ai-dark p-3 space-y-2">
                            <ApolloUsageBar tone="dark" onAvailability={setApolloAvailable} />
                            <label className={`flex items-center gap-2 text-xs ${apolloAvailable ? 'text-gray-300' : 'text-gray-600'}`}>
                                <input
                                    type="checkbox"
                                    checked={useApollo && apolloAvailable}
                                    disabled={!apolloAvailable}
                                    onChange={(e) => setUseApollo(e.target.checked)}
                                />
                                Procurar as empresas no Apollo (gasta créditos do teto mensal; se falhar ou não houver resultados, usa a pesquisa normal)
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                            <select
                                value={country}
                                onChange={e => {
                                    const nextCountry = e.target.value;
                                    setCountry(nextCountry);
                                    const selected = COUNTRY_OPTIONS.find(option => option.code === nextCountry);
                                    if (selected) setLocation(selected.defaultLocations);
                                }}
                                className="bg-ai-dark border border-gray-700 rounded p-3 text-sm md:col-span-1"
                            >
                                {COUNTRY_OPTIONS.map(option => (
                                    <option key={option.code} value={option.code}>{option.name}</option>
                                ))}
                            </select>
                            <input 
                                value={location} onChange={e => setLocation(e.target.value)}
                                placeholder="Localização (Opcional)"
                                className="bg-ai-dark border border-gray-700 rounded p-3 text-sm md:col-span-1"
                            />
                            <input 
                                value={niche} onChange={e => setNiche(e.target.value)}
                                placeholder={segmentId === CUSTOM_SEGMENT_ID ? 'Escreva o nicho (ex.: Veterinários)' : 'Nicho (Opcional)'}
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
                                onSaveToDb={handleSaveToDb}
                                savedLeadNames={savedHotels.map(h => h.companyName.toLowerCase().trim())}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* --- BASE DE DADOS (CRM) VIEW --- */}
            {activeTab === 'database' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    {isLoadingError && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {isLoadingError}
                        </div>
                    )}
                    <HotelManagement
                        onSelectProposal={handleOpenProposal}
                        onSelectChat={handleOpenChat}
                        onOpenPlay={handleOpenPlay}
                        onOpenDemo={handleOpenDemo}
                        onOpenMessages={handleOpenMessages}
                        onOpenQualify={handleOpenQualify}
                        onOpenProposalBuilder={handleOpenProposalBuilder}
                        onOpenContract={handleOpenContract}
                        restrictSellerId={restrictSellerId}
                        refreshToken={hotelRefreshToken}
                        isAdmin={currentUser.role === 'admin'}
                    />
                </div>
            )}

            {/* --- PIPELINE KANBAN --- */}
            {activeTab === 'pipeline' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <PipelineKanban
                        onOpenPlay={handleOpenPlay}
                        onSelectProposal={handleOpenProposal}
                        onSelectChat={handleOpenChat}
                        restrictSellerId={restrictSellerId}
                    />
                </div>
            )}

            {/* --- HOJE: FOLLOW-UPS (M29) + PLANEADOR SEMANAL --- */}
            {activeTab === 'followup' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <div className="inline-flex rounded-lg border border-gray-800 bg-ai-card p-1">
                        {([
                            { id: 'followup', label: 'Follow-ups e reagendamentos' },
                            { id: 'planner', label: 'Planeador semanal' }
                        ] as const).map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setTodayView(v.id)}
                                className={`rounded-md px-4 py-1.5 text-xs font-bold transition ${todayView === v.id ? 'bg-emerald-600/15 text-emerald-300' : 'text-gray-400 hover:text-white'}`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                    {todayView === 'followup'
                        ? <FollowUpCenter onOpenPlay={handleOpenPlay} restrictSellerId={restrictSellerId} />
                        : <WeeklyPlanner onOpenPlay={handleOpenPlay} restrictSellerId={restrictSellerId} />}
                </div>
            )}

            {/* --- FERRAMENTAS DE VENDA (M35/M41/M42/M46) --- */}
            {activeTab === 'tools' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <SalesTools />
                </div>
            )}

            {/* --- ACADEMIA SOL (M43) --- */}
            {activeTab === 'academy' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <Academy />
                </div>
            )}

            {/* --- DASHBOARD DE VENDAS --- */}
            {activeTab === 'crm' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <CommercialDashboard restrictSellerId={restrictSellerId} />
                </div>
            )}

            {/* --- GERADOR DE CONTRATOS --- */}
            {activeTab === 'contracts' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <ContractGenerator isAdmin={currentUser.role === 'admin'} preselectLeadId={contractLeadId} />
                </div>
            )}

            {/* --- EQUIPA COMERCIAL --- */}
            {activeTab === 'sellers' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <SellerManagement />
                </div>
            )}

            {/* --- SCRIPTS & MATERIAIS (M28) --- */}
            {activeTab === 'library' && (
                <div className="space-y-6 animate-in fade-in duration-300 text-left">
                    <CommercialLibrary />
                </div>
            )}

            {/* --- ADICIONAR HOTEL MANUALMENTE (MODAL) --- */}
            {isHotelModalOpen && (
                <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-ai-card border border-gray-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl relative font-sans">
                        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="font-bold text-white text-base flex items-center gap-2"><Plus className="text-emerald-500" /> Registar Novo Hotel Manual</h2>
                            <button onClick={() => setIsHotelModalOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
                        </header>

                        <form onSubmit={handleSaveManualHotel} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nome do Hotel/Alojamento <span className="text-red-500">*</span></label>
                                    <input 
                                        required
                                        value={manualHotel.companyName}
                                        onChange={e => setManualHotel({...manualHotel, companyName: e.target.value})}
                                        placeholder="Ex: Pestana Palace Hotel"
                                        className="w-full bg-ai-dark border border-gray-705 border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Localidade/País <span className="text-red-500">*</span></label>
                                    <input 
                                        required
                                        value={manualHotel.location}
                                        onChange={e => setManualHotel({...manualHotel, location: e.target.value})}
                                        placeholder="Ex: Lisboa, Portugal"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Website</label>
                                    <input 
                                        value={manualHotel.website}
                                        onChange={e => setManualHotel({...manualHotel, website: e.target.value})}
                                        placeholder="Ex: pestana.com"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Telefone Principal</label>
                                    <input 
                                        value={manualHotel.phone}
                                        onChange={e => setManualHotel({...manualHotel, phone: e.target.value})}
                                        placeholder="Ex: +351 213 456 789"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Email Geral/Comercial</label>
                                    <input 
                                        type="email"
                                        value={manualHotel.email}
                                        onChange={e => setManualHotel({...manualHotel, email: e.target.value})}
                                        placeholder="Ex: rececao@hotel.com"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Pessoa de Contacto (Ex: Governança)</label>
                                    <input 
                                        value={manualHotel.contactPerson}
                                        onChange={e => setManualHotel({...manualHotel, contactPerson: e.target.value})}
                                        placeholder="Ex: Maria Ferreira (Governanta Geral)"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Grau de Prioridade comercial</label>
                                    <select 
                                        value={manualHotel.potential}
                                        onChange={e => setManualHotel({...manualHotel, potential: e.target.value as any})}
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    >
                                        <option value="Hot">🔥 Quente (Gargalo de Limpeza)</option>
                                        <option value="Medium">⚖️ Média (Potencial de Venda)</option>
                                        <option value="Cold">❄️ Fria (Operação Confortável)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">O que foi falado/combinado (Notas iniciais)</label>
                                <textarea 
                                    rows={3}
                                    value={manualHotel.contactNotes}
                                    onChange={e => setManualHotel({...manualHotel, contactNotes: e.target.value})}
                                    placeholder="Escreva aqui a nota sobre o primeiro contacto, emails enviados, ou feedbacks do hotel..."
                                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                />
                            </div>

                            <footer className="pt-2 border-t border-gray-800 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsHotelModalOpen(false)} className="px-4 py-2 text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Inserir no CRM</button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* --- REGISTAR CONVERSA E CALLS (MODAL REGISTO / EDIT) --- */}
            {editingHotel && (
                <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-ai-card border border-gray-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative font-sans">
                        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-emerald-950/20">
                            <h2 className="font-bold text-white text-base flex items-center gap-2"><Edit className="text-emerald-500" /> Registar Chamada / Conversa</h2>
                            <button onClick={() => setEditingHotel(null)} className="text-gray-400 hover:text-white">&times;</button>
                        </header>

                        <form onSubmit={handleSaveEditedHotelCrm} className="p-6 space-y-4">
                            <div>
                                <h3 className="text-white font-bold text-lg">{editingHotel.companyName}</h3>
                                <p className="text-xs text-gray-400">{editingHotel.location}</p>
                            </div>

                            <div className="space-y-3 p-3 bg-gray-850 rounded-lg border border-gray-800">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Pessoa de Contacto direta (Governanta Geral / Diretor)</label>
                                    <input 
                                        value={editingHotel.contactPerson || ''}
                                        onChange={e => setEditingHotel({...editingHotel, contactPerson: e.target.value})}
                                        placeholder="Ex: Paula Albuquerque (Governanta-Geral)"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Telefone Directo de Contacto</label>
                                    <input 
                                        value={editingHotel.phone || ''}
                                        onChange={e => setEditingHotel({...editingHotel, phone: e.target.value})}
                                        placeholder="Ex: +351 912 345 678"
                                        className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Grau de Interesse / Prioridade do Hotel</label>
                                <select 
                                    value={editingHotel.potential}
                                    onChange={e => setEditingHotel({...editingHotel, potential: e.target.value as any})}
                                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                >
                                    <option value="Hot">🔥 Muito Interessado (Problemas na Limpeza)</option>
                                    <option value="Medium">⚖️ Média / Resposta Neutra</option>
                                    <option value="Cold">❄️ Fria (Tem outro ou Sem interesse)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">O que foi falado/combinado (Histórico de Chamada) <span className="text-red-500">*</span></label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={editingHotel.contactNotes || ''}
                                    onChange={e => setEditingHotel({...editingHotel, contactNotes: e.target.value})}
                                    placeholder="Ex: Liguei e falei com a Dra. Paula. Mostrou-se muito interessada em eliminar checklists de papel para as camareiras de quarto. Ficámos de enviar vídeo demonstrativo."
                                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="p-3.5 bg-rose-500/5 rounded-lg border border-rose-500/10 space-y-3.5">
                                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                                    <Calendar className="w-3.5 h-3.5" /> AGENDAR PRÓXIMO CONTACTO (CALLBACK)
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Data / Hora</label>
                                        <input 
                                            type="datetime-local"
                                            value={editingHotel.callbackScheduledAt || ''}
                                            onChange={e => setEditingHotel({...editingHotel, callbackScheduledAt: e.target.value})}
                                            className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-rose-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Status da Chamada</label>
                                        <select 
                                            value={editingHotel.callbackStatus || 'pending'}
                                            onChange={e => setEditingHotel({...editingHotel, callbackStatus: e.target.value as any})}
                                            className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-rose-500"
                                        >
                                            <option value="pending">Pendente (Agendada)</option>
                                            <option value="completed">Concluída</option>
                                            <option value="canceled">Cancelada</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <footer className="pt-2 border-t border-gray-800 flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingHotel(null)} className="px-4 py-2 text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">Fechar</button>
                                <button type="submit" className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Guardar Notas</button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* --- ADMIN VIEW --- */}
            {activeTab === 'admin' && !canAdminConsole && (
                <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-16 text-center">
                    <p className="text-base font-semibold text-white">Sem acesso ao Admin Console</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">Este módulo está reservado ao proprietário da plataforma.</p>
                </div>
            )}
            {activeTab === 'admin' && canAdminConsole && (
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

                    {/* Modulos e planos Workio (M01..M27) */}
                    <WorkioCatalog />

                    {/* Vendas associadas a vendedores */}
                    <AdminSales sellers={crmSellers} leads={savedHotels.map((h) => ({ id: h.id, companyName: h.companyName }))} />
                </div>
            )}
        </div>

        {/* --- MODO PLAY (M23) --- */}
        {activeLeadForPlay && (
            <PlayMode
                lead={activeLeadForPlay}
                sellers={crmSellers}
                closeReasons={crmCloseReasons}
                onClose={() => { setActiveLeadForPlay(null); setHotelRefreshToken((t) => t + 1); }}
                onSaved={handlePlaySaved}
                isAdmin={currentUser.role === 'admin'}
                onOpenContract={() => activeLeadForPlay && handleOpenContract(activeLeadForPlay)}
                onOpenDemo={() => setActiveLeadForDemo(activeLeadForPlay)}
                onOpenMessages={() => setActiveLeadForMessages(activeLeadForPlay)}
                onOpenQualify={() => setActiveLeadForQualify(activeLeadForPlay)}
                onOpenProposalBuilder={() => setActiveLeadForProposalBuilder(activeLeadForPlay)}
                onSelectChat={() => setActiveLeadForChat(activeLeadForPlay)}
            />
        )}

        {/* --- MODO DEMO COMERCIAL (M31) --- */}
        {activeLeadForDemo && (
            <DemoMode
                lead={activeLeadForDemo}
                onClose={() => setActiveLeadForDemo(null)}
                onSaved={handlePlaySaved}
            />
        )}

        {/* --- TEMPLATES DE EMAIL/WHATSAPP (M38) --- */}
        {activeLeadForMessages && (
            <MessageTemplates
                lead={activeLeadForMessages}
                onClose={() => setActiveLeadForMessages(null)}
                sellerId={currentSeller?.id ?? currentUser.id}
            />
        )}


        {/* --- QUALIFICACAO DO LEAD (M34) --- */}
        {activeLeadForQualify && (
            <QualificationModal
                lead={activeLeadForQualify}
                onClose={() => setActiveLeadForQualify(null)}
                onSaved={handlePlaySaved}
            />
        )}

        {/* --- PROPOSTA COMERCIAL (M40) --- */}
        {activeLeadForProposalBuilder && (
            <ProposalBuilder
                lead={activeLeadForProposalBuilder}
                onClose={() => setActiveLeadForProposalBuilder(null)}
                onSaved={handlePlaySaved}
            />
        )}

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
