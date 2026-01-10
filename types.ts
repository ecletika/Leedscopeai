export interface EmailDraft {
  id: string;
  step: 1 | 2 | 3 | 4;
  subject: string;
  body: string;
  type: 'intro' | 'follow_up_1' | 'follow_up_2' | 'breakup';
  status: 'draft' | 'sent';
}

export interface Lead {
  id: string;
  companyName: string;
  location: string;
  niche: string;
  website?: string;
  email?: string;
  phone?: string;
  
  // Dados Empresariais Expandidos
  nif?: string;
  cae?: string; // Código Principal
  secondaryCae?: string[]; // Códigos Secundários
  businessActivity?: string; 
  foundationYear?: string; // Data de Constituição
  capitalSocial?: string; // Capital Social
  employees?: string; // Dimensão da equipa
  
  socials: string[];
  
  // Google Maps Data
  mapsRating?: number;
  mapsReviews?: number;
  mapsPhotos?: string[]; // New: Photos found via Maps/Search
  
  // Content Inheritance
  existingSiteSummary?: string; 
  
  // Scoring & Status
  hasWebsite: boolean;
  isProfessionalEmail: boolean;
  websiteScore: number; // 0-10
  status: 'scouted' | 'analyzing' | 'completed' | 'discarded';
  
  // Analysis
  diagnosis: string;
  
  // Proposal
  proposal: {
    siteStructure: string[];
    brandingSuggestion: string;
    techStack: string;
    problems: string[];
    solutionFeatures: string[];
    expectedBenefits: string[];
    estimatedValue: string;
  } | null;

  // Module 5: Outreach Sequence (Updated)
  emailSequence: EmailDraft[];

  // Agent 7 Output
  generatedSiteCode: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Campo de senha adicionado
  role: 'admin' | 'user';
  plan: 'Starter' | 'Pro' | 'Agency';
  leadsGenerated: number;
  leadsLimit: number;
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

export interface AgentLog {
  id: string;
  agentName: string;
  action: string;
  timestamp: Date;
  details?: string;
  status: 'working' | 'success' | 'error';
}

export type ProcessingStage = 'idle' | 'searching' | 'analyzing' | 'generating' | 'finished';

export const NON_PROFESSIONAL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'sapo.pt', 'live.com.pt', 'netcabo.pt'
];