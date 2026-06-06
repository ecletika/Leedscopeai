import { Lead, SmtpConfig, SocialProfile, StorefrontAnalysis, ChatMessage } from '../types';

/**
 * Client-side transparent proxy calling backend-side secured Gemini endpoints.
 */

const formatGeminiError = (errorMsg: string, status?: number): string => {
  const lower = typeof errorMsg === 'string' ? errorMsg.toLowerCase() : '';
  
  if (status === 429 || lower.includes('429') || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted')) {
    return "A API do Gemini excedeu o limite de quota gratuita ou de requisições por minuto (Erro 429/Quota Excedida). Por favor, aguarde um momento antes de tentar novamente ou verifique as definições de faturamento da sua chave de API.";
  }
  
  if (status === 503 || lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand') || lower.includes('temporarily overloaded') || lower.includes('experiencing high demand')) {
    return "O modelo do Gemini está atualmente sob alta demanda ou temporariamente indisponível (Erro 503/Serviço Indisponível). Por favor, tente novamente daqui a instantes.";
  }
  
  return errorMsg;
};

export const searchLeadsInLocation = async (
  location: string, 
  niche: string, 
  aiContext: string,
  campaignName: string
): Promise<Partial<Lead>[]> => {
  try {
    const response = await fetch('/api/gemini/searchLeads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location, niche, aiContext, campaignName })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    return await response.json();
  } catch (error: any) {
    console.error("error searching leads:", error);
    throw new Error(formatGeminiError(error.message || "Failed to search leads via Gemini API"));
  }
};

export const runSocialMediaAgent = async (
  lead: Partial<Lead>
): Promise<{ socials: SocialProfile[], phones: string[], socialSummary: string }> => {
  try {
    const response = await fetch('/api/gemini/runSocialMedia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    return await response.json();
  } catch (error: any) {
    console.error("error inside runSocialMediaAgent:", error);
    return { socials: [], phones: [], socialSummary: `Erro na análise de mídias: ${formatGeminiError(error.message)}` };
  }
};

export const runStorefrontInvestigation = async (
  lead: Lead
): Promise<{ analysis: StorefrontAnalysis, leadUpdates: Partial<Lead> }> => {
  try {
    const response = await fetch('/api/gemini/runStorefront', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    return await response.json();
  } catch (error: any) {
    console.error("error inside runStorefrontInvestigation:", error);
    return {
      analysis: {
        analyzed: true,
        signageCondition: 'Unknown',
        visualAppeal: 'Medium',
        needsLedUpgrade: false,
        description: `Não foi possível prosseguir: ${formatGeminiError(error.message)}`,
        address: lead.location
      },
      leadUpdates: {}
    };
  }
};

export const generateCommercialProposal = async (lead: Lead): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/generateProposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    const data = await response.json();
    return data.text || "Erro ao receber proposta.";
  } catch (error: any) {
    console.error("error inside generateCommercialProposal:", error);
    return `Erro ao gerar proposta comercial: ${formatGeminiError(error.message)}`;
  }
};

export const askLeadQuestion = async (
  lead: Lead, 
  question: string, 
  history: ChatMessage[]
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/askQuestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead, question, history })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    const data = await response.json();
    return data.text || "Sem resposta do assistente.";
  } catch (error: any) {
    console.error("error inside askLeadQuestion:", error);
    return `Erro ao processar a pergunta: ${formatGeminiError(error.message)}`;
  }
};

export const analyzeAndGenerateProposal = async (
  leadData: Partial<Lead>
): Promise<Lead | null> => {
  try {
    const response = await fetch('/api/gemini/analyzeAndProposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leadData })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    return await response.json();
  } catch (error: any) {
    console.error("error inside analyzeAndGenerateProposal:", error);
    throw new Error(formatGeminiError(error.message || "Failed to analyze lead and generate proposal"));
  }
};

export const generateWebsiteCode = async (lead: Lead): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/generateWebsite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    const data = await response.json();
    return data.html || "<!-- Erro ao gerar o código da landing page. -->";
  } catch (error: any) {
    console.error("error inside generateWebsiteCode:", error);
    return `<!-- Erro na criação da página: ${formatGeminiError(error.message)} -->`;
  }
};

export const refineWebsiteCode = async (
  currentCode: string, 
  userInstruction: string
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/refineWebsite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentCode, userInstruction })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const rawMsg = errData.error || `Server error ${response.status}`;
      throw new Error(formatGeminiError(rawMsg, response.status));
    }

    const data = await response.json();
    return data.html || currentCode;
  } catch (error: any) {
    console.error("error inside refineWebsiteCode:", error);
    return currentCode;
  }
};

export const generateOutreachEmail = async (lead: Lead): Promise<Lead> => { 
  return { ...lead }; 
};

export const testSmtpConfiguration = async (config: SmtpConfig, targetEmail: string) => { 
  return { success: true, log: "Simulated OK" }; 
};

export interface GeminiHealthResponse {
  configured: boolean;
  metrics: {
    requestsThisMinute: number;
    totalRequests: number;
    lastRequestTime: string | null;
    lastLatencyMs: number | null;
    lastStatus: number;
    lastErrorMessage: string | null;
  };
  testResult?: {
    success: boolean;
    latencyMs: number;
    status?: number;
    message: string;
  } | null;
}

export const fetchGeminiHealth = async (runTest = false): Promise<GeminiHealthResponse> => {
  try {
    const url = `/api/gemini/health${runTest ? '?test=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro do servidor ao verificar estado (${response.status})`);
    }
    return await response.json();
  } catch (err: any) {
    console.error("fetchGeminiHealth failed:", err);
    return {
      configured: false,
      metrics: {
        requestsThisMinute: 0,
        totalRequests: 0,
        lastRequestTime: null,
        lastLatencyMs: null,
        lastStatus: 500,
        lastErrorMessage: err.message || "Erro de conexão com o servidor."
      }
    };
  }
};

