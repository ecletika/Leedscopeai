import { Lead, SmtpConfig, SocialProfile, StorefrontAnalysis, ChatMessage, CallAnalysis, NextActionType } from '../types';

/**
 * Client-side transparent proxy calling backend-side secured Gemini endpoints.
 */

const formatGeminiError = (errorMsg: string, status?: number): string => {
  const lower = typeof errorMsg === 'string' ? errorMsg.toLowerCase() : '';

  if (lower.includes('gemini_api_key') || lower.includes('não está configurada') || lower.includes('nao esta configurada')) {
    return errorMsg;
  }
  
  if (status === 429 || lower.includes('429') || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted')) {
    return "A API do Gemini excedeu o limite de quota gratuita ou de requisições por minuto (Erro 429/Quota Excedida). Por favor, aguarde um momento antes de tentar novamente ou verifique as definições de faturamento da sua chave de API.";
  }
  
  if (status === 503 || lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand') || lower.includes('temporarily overloaded') || lower.includes('experiencing high demand')) {
    return "O modelo do Gemini está atualmente sob alta demanda ou temporariamente indisponível (Erro 503/Serviço Indisponível). Por favor, tente novamente daqui a instantes.";
  }
  
  return errorMsg;
};

export const searchLeadsInLocation = async (
  country: string,
  location: string,
  niche: string,
  aiContext: string,
  campaignName: string,
  excludeNames: string[] = []
): Promise<Partial<Lead>[]> => {
  try {
    const response = await fetch('/api/gemini/searchLeads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ country, location, niche, aiContext, campaignName, excludeNames })
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

const VALID_NEXT_ACTIONS: NextActionType[] = ['call', 'demo', 'email', 'whatsapp', 'follow_up', 'proposal', 'none'];

/**
 * IA Comercial (M30): analisa as notas livres de uma chamada e devolve campos
 * estruturados (resumo, interesse, decisor, objeccoes, proxima accao, score).
 * Reusa o endpoint de pergunta livre, pedindo JSON estrito, com parse seguro
 * e fallback para texto simples quando o modelo nao devolve JSON valido.
 */
export const analyzeCallNotes = async (lead: Lead, notes: string): Promise<CallAnalysis> => {
  const prompt = `Es um assistente comercial do SOL (sistema de housekeeping para hoteis).
Analisa estas notas de uma chamada de prospeccao e responde APENAS com JSON valido, sem texto antes ou depois, neste formato exato:
{
  "summary": "resumo curto da chamada em PT-PT",
  "executiveSummary": "1-2 frases para a gestao",
  "interestLevel": "low" | "medium" | "high",
  "decisionMaker": { "name": "", "role": "", "phone": "", "email": "" },
  "objections": ["objeccao 1", "objeccao 2"],
  "nextActionType": "call" | "demo" | "email" | "whatsapp" | "follow_up" | "proposal" | "none",
  "nextActionDays": 7,
  "suggestedScore": 0
}
Regras: usa strings vazias quando nao houver informacao; suggestedScore entre 0 e 100; nextActionDays e o numero de dias ate ao proximo contacto.
Notas da chamada: "${notes || 'sem notas'}".`;

  const text = await askLeadQuestion(lead, prompt, []);

  // Extrai o bloco JSON (tolera code fences ou texto extra)
  const fenced = text.replace(/```json|```/gi, '');
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return { summary: text, raw: text };
  }

  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    const interest = ['low', 'medium', 'high'].includes(parsed.interestLevel) ? parsed.interestLevel : undefined;
    const nextActionType: NextActionType | undefined = VALID_NEXT_ACTIONS.includes(parsed.nextActionType) ? parsed.nextActionType : undefined;
    const dm = parsed.decisionMaker || {};
    return {
      summary: parsed.summary || text,
      executiveSummary: parsed.executiveSummary || undefined,
      interestLevel: interest,
      decisionMaker: {
        name: dm.name || undefined,
        role: dm.role || undefined,
        phone: dm.phone || undefined,
        email: dm.email || undefined
      },
      objections: Array.isArray(parsed.objections) ? parsed.objections.filter((o: any) => typeof o === 'string' && o.trim()) : [],
      nextActionType,
      nextActionDays: Number.isFinite(Number(parsed.nextActionDays)) ? Number(parsed.nextActionDays) : undefined,
      suggestedScore: Number.isFinite(Number(parsed.suggestedScore)) ? Math.max(0, Math.min(100, Number(parsed.suggestedScore))) : undefined,
      raw: text
    };
  } catch {
    return { summary: text, raw: text };
  }
};

export interface SimTurn { role: 'seller' | 'customer'; text: string; }

/**
 * Simulador de chamada com IA (M44). A IA faz role-play de uma persona de cliente
 * ou avalia o desempenho do vendedor (mode 'evaluate').
 */
export const simulateCall = async (
  persona: string,
  history: SimTurn[],
  message: string,
  mode: 'roleplay' | 'evaluate' = 'roleplay'
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, history, message, mode })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(formatGeminiError(errData.error || `Server error ${response.status}`, response.status));
    }
    const data = await response.json();
    return data.text || 'Sem resposta.';
  } catch (error: any) {
    console.error('simulateCall error:', error);
    return `Erro na simulacao: ${formatGeminiError(error.message)}`;
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
