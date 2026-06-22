export interface EmailDraft {
  id: string;
  step: 1 | 2 | 3 | 4;
  subject: string;
  body: string;
  type: 'intro' | 'follow_up_1' | 'follow_up_2' | 'breakup';
  status: 'draft' | 'sent';
}

export interface SocialProfile {
  network: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
  url: string;
}

export interface StorefrontAnalysis {
  analyzed: boolean;
  signageCondition: 'Modern' | 'Average' | 'Old/Damaged' | 'Unknown';
  visualAppeal: 'High' | 'Medium' | 'Low';
  needsLedUpgrade: boolean; // Se precisa de letreiro novo
  description: string;
  address?: string; // Endereço confirmado visualmente
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  relativeTime?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type CommercialLeadStatus =
  | 'new'
  | 'prepared'
  | 'scheduled_contact'
  | 'in_contact'
  | 'contacted_reception'
  | 'decision_maker_identified'
  | 'rescheduled'
  | 'demo_scheduled'
  | 'demo_completed'
  | 'follow_up'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'do_not_contact';

export type LeadPriority = 'high' | 'medium' | 'low';

export type NextActionType =
  | 'call'
  | 'demo'
  | 'email'
  | 'whatsapp'
  | 'follow_up'
  | 'proposal'
  | 'none';

export type SellerRole = 'seller' | 'sales_supervisor' | 'admin';
export type SellerStatus = 'active' | 'inactive';
export type CrmContactType = 'reception' | 'manager' | 'general_manager' | 'housekeeper' | 'maintenance' | 'purchasing' | 'other';
export type CrmContactStatus = 'unknown' | 'searching' | 'contacted' | 'decision_maker' | 'influencer' | 'inactive';
export type CrmActivityType = 'call' | 'email' | 'whatsapp' | 'demo' | 'note' | 'status_change' | 'proposal';
export type CrmScheduleSlotType = 'call' | 'demo' | 'follow_up' | 'admin';
export type CrmScheduleSlotStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'missed';

export interface CrmSeller {
  id: string;
  userId?: string;
  name: string;
  photoUrl?: string;
  email: string;
  phone?: string;
  languages: string[];
  assignedRegions: string[];
  workSchedule?: string;
  dailyContactGoal: number;
  weeklyDemoGoal: number;
  role: SellerRole;
  status: SellerStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmContact {
  id: string;
  leadId: string;
  name?: string;
  role?: string;
  contactType: CrmContactType;
  phone?: string;
  email?: string;
  status: CrmContactStatus;
  isPrimaryDecisionMaker: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmActivity {
  id: string;
  leadId: string;
  sellerId?: string;
  contactId?: string;
  activityType: CrmActivityType;
  outcome?: string;
  notes?: string;
  objections?: string[];
  interestLevel?: 'low' | 'medium' | 'high';
  nextActionType?: NextActionType;
  nextActionAt?: string;
  createdAt?: string;
}

export interface CrmScheduleSlot {
  id: string;
  sellerId: string;
  leadId?: string;
  slotStart: string;
  slotEnd: string;
  slotType: CrmScheduleSlotType;
  status: CrmScheduleSlotStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallAnalysis {
  summary: string;
  executiveSummary?: string;
  interestLevel?: 'low' | 'medium' | 'high';
  decisionMaker?: { name?: string; role?: string; phone?: string; email?: string };
  objections?: string[];
  nextActionType?: NextActionType;
  nextActionDays?: number;
  suggestedScore?: number;
  raw?: string;
}

export interface CrmScript {
  id: string;
  name: string;
  targetRole?: string; // reception | manager | housekeeper | general
  language?: string;
  country?: string;
  content: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmObjection {
  id: string;
  objection: string;
  suggestedResponse: string; // resposta curta
  fullResponse?: string; // resposta completa
  followUpQuestion?: string; // pergunta para continuar a conversa
  recommendedMaterial?: string; // material a mostrar
  nextAction?: string; // proxima accao sugerida
  category?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadQualification {
  rooms?: number;
  usesPms?: 'yes' | 'no' | 'unknown';
  housekeepingMethod?: 'paper' | 'whatsapp' | 'excel' | 'system' | 'unknown';
  hasGoverness?: 'yes' | 'no' | 'unknown';
  maintenanceTeam?: 'internal' | 'external' | 'none' | 'unknown';
  mainPain?: string;
  interest?: 'low' | 'medium' | 'high';
  probability?: number; // 0-100
  bestDemoContact?: string;
  qualifiedAt?: string;
}

export type CrmMaterialType = 'image' | 'video' | 'pdf' | 'link' | 'text';

export interface CrmMaterial {
  id: string;
  title: string;
  materialType: CrmMaterialType;
  url?: string;
  description?: string;
  targetStage?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmCloseReason {
  id: string;
  name: string;
  category: 'lost' | 'do_not_contact' | 'invalid' | 'duplicate' | 'future_follow_up';
  requiresFollowUp: boolean;
  defaultFollowUpDays?: number;
  active: boolean;
}

export interface Lead {
  id: string;
  companyName: string;
  location: string;
  city?: string;
  country?: string;
  niche: string;
  segment?: string;
  estimatedRooms?: number;
  website?: string;
  email?: string;
  phone?: string;
  additionalPhones?: string[]; // telefones extra (ex.: encontrados ao enriquecer), sem sobrescrever o principal
  allPhones: string[];
  contactPerson?: string; // Pessoa de contacto (Ex: Governanta Geral, Gerente)
  contactNotes?: string;  // Notas do que foi falado/combinado
  dealValue?: number;     // Valor mensal do contrato (€/mês) — base da comissao do vendedor
  callbackScheduledAt?: string; // Data e hora agendadas para ligar novamente
  callbackStatus?: 'pending' | 'completed' | 'canceled';
  
  nif?: string;
  cae?: string;
  secondaryCae?: string[];
  businessActivity?: string; 
  foundationYear?: string;
  capitalSocial?: string;
  employees?: string;
  
  socials: SocialProfile[];
  socialSummary?: string; // Relatório de análise das redes sociais
  
  mapsRating?: number;
  mapsReviews?: number;
  businessHours?: string[];
  servicesOffered?: string[];
  reviewsList?: Review[];
  
  existingSiteSummary?: string; 
  
  hasWebsite: boolean;
  isProfessionalEmail: boolean;
  websiteScore: number;
  status: 'scouted' | 'analyzing' | 'completed' | 'discarded';
  commercialStatus?: CommercialLeadStatus;
  responsibleSellerId?: string;
  responsibleSellerName?: string;
  priority?: LeadPriority;
  leadScore?: number;
  source?: string;
  nextActionType?: NextActionType;
  nextActionAt?: string;
  closeReasonId?: string;
  closeReasonName?: string;
  closeNotes?: string;
  doNotContact?: boolean;
  lastActivityAt?: string;
  qualification?: LeadQualification;
  followupSequence?: { key: string; startedAt: string; step: number };

  potential: 'Hot' | 'Medium' | 'Cold';
  potentialReasoning: string;
  storefront: StorefrontAnalysis;

  diagnosis: string;
  
  proposal: {
    siteStructure: string[];
    brandingSuggestion: string;
    techStack: string;
    problems: string[];
    solutionFeatures: string[];
    expectedBenefits: string[];
    estimatedValue: string;
  } | null;
  
  fullProposalText?: string; 

  emailSequence: EmailDraft[];
  aiChatHistory?: ChatMessage[];
  generatedSiteCode: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  date: string; // ISO string
  location: string;
  niche: string;
  leads: Lead[];
}

export interface PlanDefinition {
  id: string;
  name: string;
  price: string;
  credits: number;
  features: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  plan: string; // Alterado para string para permitir planos dinâmicos
  credits: number; // Créditos restantes para buscar campanhas
  campaigns: Campaign[]; // Histórico de campanhas
  status: 'active' | 'inactive';
}

export interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

export type ProcessingStage = 'idle' | 'searching' | 'analyzing' | 'generating' | 'finished';

export const NON_PROFESSIONAL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'sapo.pt', 'live.com.pt', 'netcabo.pt'
];
