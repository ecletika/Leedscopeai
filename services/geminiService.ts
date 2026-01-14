import { supabase } from './supabase';
import { Lead } from '../types';

// URL do seu Worker
const WORKER_URL = "https://gemini-api-worker.mauricio-junior.workers.dev";

// Função genérica para chamar o Worker
async function callWorker(promptOrData: any) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(promptOrData),
  });

  if (!res.ok) {
    throw new Error(`Erro ao chamar Worker: ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

// --- Helper: invoca Edge Function com JWT ---
async function invokeEdgeFunction(name: string, body: any = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error('Usuário não está logado');
  }

  const res = await fetch(
    `https://kqpdhmamwljpjozhcivy.supabase.co/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // JWT enviado automaticamente
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge Function retornou ${res.status}: ${text}`);
  }

  return res.json();
}

// --- Leads / Prospeção ---

// Pesquisa de leads
export const searchLeadsInLocation = async (
  location: string,
  niche: string,
  aiContext: string,
  campaignName: string
): Promise<Partial<Lead>[]> => {
  return invokeEdgeFunction('search-leads-agent', { location, niche, aiContext, campaignName });
};

// Análise e proposta inicial via Worker
export const analyzeAndGenerateProposal = async (lead: Lead): Promise<Lead> => {
  const result = await callWorker({ action: 'analyzeAndGenerateProposal', lead });
  return result as Lead;
};

// Geração de email de outreach via Worker
export const generateOutreachEmail = async (lead: Lead): Promise<string> => {
  const result = await callWorker({ action: 'generateOutreachEmail', lead });
  return result as string;
};

// Investigação da fachada / storefront via Supabase Edge Function
export const runStorefrontInvestigation = async (lead: Lead): Promise<{ analysis: any; leadUpdates: Partial<Lead> }> => {
  return invokeEdgeFunction('storefront-investigation', lead);
};

// Geração de proposta comercial completa via Worker
export const generateCommercialProposal = async (lead: Lead): Promise<string> => {
  const result = await callWorker({ action: 'generateCommercialProposal', lead });
  return result as string;
};

// Pergunta AI para lead via Worker
export const askLeadQuestion = async (lead: Lead, question: string, history: any[]): Promise<string> => {
  const result = await callWorker({ action: 'askLeadQuestion', lead, question, history });
  return result as string;
};

// --- Website Generation / Refinement ---

// Geração de código do website via Worker
export const generateWebsiteCode = async (lead: Lead): Promise<string> => {
  const result = await callWorker({ action: 'generateWebsiteCode', lead });
  return result as string;
};

// Refinar código existente do website via Worker
export const refineWebsiteCode = async (existingCode: string, instructions: string): Promise<string> => {
  const result = await callWorker({ action: 'refineWebsiteCode', existingCode, instructions });
  return result as string;
};
