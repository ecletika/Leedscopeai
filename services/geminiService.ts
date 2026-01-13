import { supabase } from './supabase';
import { Lead } from '../types';

// --- Leads / Prospeção ---

// Pesquisa de leads
export const searchLeadsInLocation = async (
  location: string,
  niche: string,
  aiContext: string,
  campaignName: string
): Promise<Partial<Lead>[]> => {
  const { data, error } = await supabase.functions.invoke('search-leads-agent', {
    body: { location, niche, aiContext, campaignName }
  });
  if (error) throw error;
  return data;
};

// Análise e proposta inicial
export const analyzeAndGenerateProposal = async (lead: Lead): Promise<Lead> => {
  const { data, error } = await supabase.functions.invoke('analyze-and-generate-proposal', {
    body: lead
  });
  if (error) throw error;
  return data as Lead;
};

// Geração de email de outreach
export const generateOutreachEmail = async (lead: Lead): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-outreach-email', {
    body: lead
  });
  if (error) throw error;
  return data as string;
};

// Investigação da fachada / storefront
export const runStorefrontInvestigation = async (lead: Lead): Promise<{ analysis: any; leadUpdates: Partial<Lead> }> => {
  const { data, error } = await supabase.functions.invoke('storefront-investigation', {
    body: lead
  });
  if (error) throw error;
  return data;
};

// Geração de proposta comercial completa
export const generateCommercialProposal = async (lead: Lead): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-commercial-proposal', {
    body: lead
  });
  if (error) throw error;
  return data as string;
};

// Pergunta AI para lead
export const askLeadQuestion = async (lead: Lead, question: string, history: any[]): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('ask-lead-question', {
    body: { lead, question, history }
  });
  if (error) throw error;
  return data as string;
};

// --- Website Generation / Refinement ---

// Geração de código do website
export const generateWebsiteCode = async (lead: Lead): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-website-code', {
    body: lead
  });
  if (error) throw error;
  return data as string;
};

// Refinar código existente do website
export const refineWebsiteCode = async (existingCode: string, instructions: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('refine-website-code', {
    body: { existingCode, instructions }
  });
  if (error) throw error;
  return data as string;
};
