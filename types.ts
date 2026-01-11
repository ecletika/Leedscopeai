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

export interface Lead {
  id: string;
  companyName: string;
  location: string;
  niche: string;
  website?: string;
  email?: string;
  phone?: string;
  allPhones: string[]; 
  
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