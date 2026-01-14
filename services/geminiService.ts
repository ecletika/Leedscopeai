import { supabase } from './supabase';
import { Lead } from '../types';

// URL do seu Worker externo
const WORKER_URL = "https://gemini-api-worker.mauricio-junior.workers.dev";

// --- Worker externo ---
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

  return res.json();
}

// --- Helper: invoca Edge Function Supabase com JWT ---
async function invokeEdgeFunction(name: string, body: any = {}) {
  // Pega sessão atual de forma assíncrona
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) throw new Error('Usuário não está logado');

  // Usa URL do projeto Supabase a partir das variáveis de ambiente
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // JWT enviado
    },
    body: JSON.stringify(body),
  });

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
  return callWorker({ action: 'analyzeAndGenerateProposal', lead }) as Promise<Lead>;
};

// Geração de email de outreach via Worker
export const generateOutreachEmail = async (lead: Lead): Promise<string> => {
  return callWorker({ action: 'generateOutreachEmail', lead }) as Promise<string>;
};

// Investigação da fachada / storefront via Edge Function
export const runStorefrontInvestigation = async (lead: Lead): Promise<{ analysis: any; leadUpdates: Partial<Lead> }> => {
  return invokeEdgeFunction('storefront-investigation', lead);
};

// Geração de proposta comercial completa via Worker
export const generateCommercialProposal = async (lead: Lead): Promise<string> => {
  return callWorker({ action: 'generateCommercialProposal', lead }) as Promise<string>;
};

// Pergunta AI para lead via Worker
export const askLeadQuestion = async (lead: Lead, question: string, history: any[]): Promise<string> => {
  return callWorker({ action: 'askLeadQuestion', lead, question, history }) as Promise<string>;
};

// --- Website Generation / Refinement ---

// Geração de código do website via Worker
export const generateWebsiteCode = async (lead: Lead): Promise<string> => {
  return callWorker({ action: 'generateWebsiteCode', lead }) as Promise<string>;
};

// Refinar código existente do website via Worker
export const refineWebsiteCode = async (existingCode: string, instructions: string): Promise<string> => {
  return callWorker({ action: 'refineWebsiteCode', existingCode, instructions }) as Promise<string>;
};
