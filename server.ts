import express from "express";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize server-side Gemini client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Helper: extract raw json from markdown
  const extractJson = (text: string): any => {
    try {
      let cleanText = text.replace(/```json/g, '').replace(/```/g, '');
      const jsonMatch = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON Parsing failed:", text);
      return [];
    }
  };

  // SMTP Test Route
  app.post('/api/test-smtp', async (req, res) => {
    const { config, to } = req.body;
    if (!config || !to) {
      return res.status(400).json({ success: false, log: 'Missing configuration or recipient.' });
    }
    const logEntries: string[] = [];
    const log = (msg: string) => logEntries.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    log(`Initializing SMTP Transport...`);
    log(`Host: ${config.host}:${config.port}`);
    log(`User: ${config.user}`);

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      log('Verifying connection credentials...');
      await transporter.verify();
      log('Connection Verified! Credentials are valid.');
      log(`Sending test email to: ${to}...`);
      const info = await transporter.sendMail({
        from: `"${config.fromName || 'LeadScope Test'}" <${config.fromEmail || config.user}>`,
        to: to,
        subject: 'LeadScope AI - SMTP Configuration Test',
        text: 'If you are reading this, your SMTP configuration is working perfectly! This is a real email sent from your LeadScope dashboard.',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #10b981;">Connection Successful! 🚀</h2>
            <p>This is a test email from your <strong>LeadScope AI</strong> infrastructure agent.</p>
            <hr/>
            <p style="font-size: 12px; color: #666;">
              <strong>Host:</strong> ${config.host}<br/>
              <strong>Port:</strong> ${config.port}<br/>
              <strong>User:</strong> ${config.user}
            </p>
          </div>
        `
      });
      log(`Message sent: ${info.messageId}`);
      log('STATUS: SUCCESS');
      res.json({ success: true, log: logEntries.join('\n') });
    } catch (error: any) {
      console.error('SMTP Error:', error);
      log(`ERROR: ${error.message}`);
      if (error.code === 'EAUTH') log('Check your username and password (or App Password).');
      if (error.code === 'ESOCKET') log('Check host address and port.');
      log('STATUS: FAILED');
      res.status(500).json({ success: false, log: logEntries.join('\n') });
    }
  });

  // GEMINI API ROUTES

  // Systemic Gemini Health Metrics
  const geminiMetrics = {
    requestsThisMinute: 0,
    totalRequests: 0,
    lastRequestTime: null as string | null,
    lastLatencyMs: null as number | null,
    lastStatus: 200,
    lastErrorMessage: null as string | null
  };

  // Reset minute requests sliding window counter
  setInterval(() => {
    geminiMetrics.requestsThisMinute = 0;
  }, 60000);

  // Request & Status interceptor middleware for Gemini calls
  app.use('/api/gemini', (req, res, next) => {
    // Skip metric accumulation for simple polling on /health (unless test is requested)
    if (req.path === '/health' && req.query.test !== 'true') {
      return next();
    }

    const start = Date.now();
    geminiMetrics.totalRequests++;
    geminiMetrics.requestsThisMinute++;
    geminiMetrics.lastRequestTime = new Date().toISOString();

    const originalJson = res.json;
    res.json = function(body) {
      const latency = Date.now() - start;
      geminiMetrics.lastLatencyMs = latency;
      geminiMetrics.lastStatus = res.statusCode;

      if (body && body.error) {
        const errMsg = String(body.error).toLowerCase();
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('exhausted')) {
          geminiMetrics.lastStatus = 429;
        } else if (errMsg.includes('503') || errMsg.includes('overloaded') || errMsg.includes('unavailable') || errMsg.includes('demand')) {
          geminiMetrics.lastStatus = 503;
        } else {
          geminiMetrics.lastStatus = res.statusCode || 500;
        }
        geminiMetrics.lastErrorMessage = String(body.error);
      } else {
        // Successful response resets error state
        geminiMetrics.lastStatus = 200;
        geminiMetrics.lastErrorMessage = null;
      }

      return originalJson.call(this, body);
    };

    next();
  });

  // Route: health check and connection test
  app.get('/api/gemini/health', async (req, res) => {
    const test = req.query.test === 'true';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        configured: false,
        metrics: geminiMetrics,
        testResult: {
          success: false,
          message: "A chave GEMINI_API_KEY não está configurada no ambiente."
        }
      });
    }

    let testResult = null;

    if (test) {
      const startTest = Date.now();
      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: 'Diga apenas a palavra "Ok".',
        });

        const latency = Date.now() - startTest;
        testResult = {
          success: true,
          latencyMs: latency,
          message: response.text?.trim() || "Ok"
        };

        // Update indicators
        geminiMetrics.lastLatencyMs = latency;
        geminiMetrics.lastStatus = 200;
        geminiMetrics.lastErrorMessage = null;
      } catch (err: any) {
        const latency = Date.now() - startTest;
        const msg = err.message || "Erro desconhecido";
        let status = 500;
        if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted')) {
          status = 429;
        } else if (msg.includes('503') || msg.includes('overloaded') || msg.includes('demand')) {
          status = 503;
        }

        testResult = {
          success: false,
          latencyMs: latency,
          status,
          message: msg
        };

        geminiMetrics.lastLatencyMs = latency;
        geminiMetrics.lastStatus = status;
        geminiMetrics.lastErrorMessage = msg;
      }
    }

    res.json({
      configured: true,
      metrics: geminiMetrics,
      testResult
    });
  });

  // Route: searchLeads
  app.post('/api/gemini/searchLeads', async (req, res) => {
    try {
      const { location, niche, aiContext, campaignName } = req.body;
      const ai = getGeminiClient();

      let searchIntent = "";
      if (location && niche) {
        searchIntent = `Find "${niche}" businesses in "${location}"`;
      } else if (location && !niche) {
        searchIntent = `Find active businesses in "${location}" (infer types from context: ${aiContext || campaignName})`;
      } else if (!location && niche) {
        searchIntent = `Find "${niche}" businesses in Portugal (focus on major cities if not specified)`;
      } else {
        const fallback = aiContext || campaignName;
        searchIntent = `Find businesses related to: "${fallback}" in Portugal`;
      }

      const extraContext = aiContext ? `Additional Context: ${aiContext}` : "";

      const prompt = `
        ROLE: Strict B2B Lead Investigator.
        GOAL: Find REAL, EXISTING businesses matching the search intent.
        
        SEARCH INTENT: ${searchIntent}
        ${extraContext}
        
        RULES:
        1. Use the 'googleSearch' tool to verify existence. Do NOT invent companies.
        2. If you find a company, ensure it has a real Name and Address.
        3. Focus on Small & Medium Enterprises (PME) in Portugal.
        4. IGNORE huge global corporations (McDonalds, Zara, IKEA).
        5. IGNORE marketplaces (OLX, CustoJusto) or directories (Páginas Amarelas) as "companies".
        
        OUTPUT FORMAT:
        Return a STRICT JSON ARRAY of objects.
        [
          { "companyName": "Exact Business Name", "address": "City/Street", "website": "url or null" }
        ]
        
        If no real businesses are found, return an empty array [].
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 0 }
        },
      });

      const parsed = extractJson(response.text || "[]");
      if (!Array.isArray(parsed)) {
        return res.json([]);
      }

      const filtered = parsed
        .filter((item: any) => {
          const name = item.companyName || "";
          return name.length > 2 && 
                 !name.includes("Nome da Empresa") && 
                 !name.includes("[Insert Name]") &&
                 !name.toLowerCase().includes("exemplo");
        })
        .map((item: any) => ({
          companyName: item.companyName,
          website: item.website || undefined,
          location: item.address || location || "Portugal",
          niche: niche || "General",
          socials: [],
          allPhones: []
        }));

      res.json(filtered);
    } catch (error: any) {
      console.error("SearchLeads error:", error);
      res.status(500).json({ error: error.message || "Error searching leads" });
    }
  });

  // Route: runSocialMedia
  app.post('/api/gemini/runSocialMedia', async (req, res) => {
    try {
      const { lead } = req.body;
      const ai = getGeminiClient();

      const prompt = `
        TASK: Analyze Social Presence for company: "${lead.companyName}" in "${lead.location}".
        
        PART 1: Find URLs (Instagram, Facebook, LinkedIn, TikTok).
        
        PART 2: CRITICAL ANALYSIS (ONLY RELEVANT INFO FOR SALES).
        - Do NOT simply say "I found the accounts".
        - Focus on ACTIVITY, QUALITY, and MISSED OPPORTUNITIES.
        - Check:
          1. **Last Post Date**: Is it abandoned? (e.g., "Último post em 2021").
          2. **Quality**: Is it professional content or amateur/low-res?
          3. **Engagement**: Do they have likes/comments or is it a ghost town?
          4. **Setup**: Is there a link in bio? Is the logo correct?

        OUTPUT JSON: 
        { 
          "phones": [], 
          "instagram": "", 
          "facebook": "", 
          "linkedin": "", 
          "tiktok": "", 
          "youtube": "",
          "report": "Short, punchy summary in PT-PT. Example: 'Instagram abandonado desde 2022. Facebook ativo mas com imagens de baixa qualidade e sem link para site. Oportunidade de gestão.'"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });

      const data = extractJson(response.text || "{}");
      const socials: any[] = [];
      if (data.instagram) socials.push({ network: 'instagram', url: data.instagram });
      if (data.facebook) socials.push({ network: 'facebook', url: data.facebook });
      if (data.linkedin) socials.push({ network: 'linkedin', url: data.linkedin });
      if (data.tiktok) socials.push({ network: 'tiktok', url: data.tiktok });
      if (data.youtube) socials.push({ network: 'youtube', url: data.youtube });

      res.json({
        socials,
        phones: Array.isArray(data.phones) ? data.phones : (data.phones ? [data.phones] : []),
        socialSummary: data.report || "Sem informação social relevante encontrada."
      });
    } catch (error: any) {
      console.error("RunSocialMedia error:", error);
      res.status(500).json({ error: error.message || "Error running social media search" });
    }
  });

  // Route: runStorefront
  app.post('/api/gemini/runStorefront', async (req, res) => {
    try {
      const { lead } = req.body;
      const ai = getGeminiClient();

      const prompt = `
        TASK: Perform a deep Google Maps investigation for "${lead.companyName}" in "${lead.location}".

        GOALS:
        1.  **Exact Address**: Find the precise street address.
        2.  **Visual Analysis**: Analyze images/street view for Signage Condition and Visual Appeal.
        3.  **Operational Data**: Extract Opening Hours and Contact Phone.
        4.  **Reputation**: Extract Rating, Review Count, and 2-3 recent reviews (Top/Newest).
        5.  **Services**: Extract categories or specific services listed on the Maps profile.

        OUTPUT JSON ONLY:
        {
          "address": "Full street address found",
          "signageCondition": "Modern" | "Average" | "Old/Damaged",
          "visualAppeal": "High" | "Medium" | "Low",
          "needsLedUpgrade": boolean,
          "description": "Visual analysis summary (pt-PT)",
          "openingHours": ["Mon-Fri: 9-18", "Sat: 9-13"],
          "rating": 4.5,
          "reviewsCount": 120,
          "reviews": [{"author": "Name", "rating": 5, "text": "Comment"}],
          "services": ["Service A", "Service B"],
          "phone": "+351..."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash", 
        contents: prompt,
        config: { tools: [{ googleSearch: {} }, { googleMaps: {} }] }
      });

      const data = extractJson(response.text || "{}");
      
      const analysis = {
        analyzed: true,
        signageCondition: data.signageCondition || 'Unknown',
        visualAppeal: data.visualAppeal || 'Medium',
        needsLedUpgrade: data.needsLedUpgrade || false,
        description: data.description || "Não foi possível analisar visualmente.",
        address: data.address || lead.location
      };

      const leadUpdates = {
        location: data.address || lead.location,
        mapsRating: data.rating,
        mapsReviews: data.reviewsCount,
        businessHours: data.openingHours || [],
        reviewsList: data.reviews || [],
        servicesOffered: data.services || [],
        phone: lead.phone || data.phone
      };

      res.json({ analysis, leadUpdates });
    } catch (error: any) {
      console.error("RunStorefront error:", error);
      res.status(500).json({ error: error.message || "Error performing maps investigation" });
    }
  });

  // Route: generateProposal
  app.post('/api/gemini/generateProposal', async (req, res) => {
    try {
      const { lead } = req.body;
      const ai = getGeminiClient();

      const prompt = `
        TASK: Escrever uma proposta comercial altamente persuasiva para vender o "Sistema de Housekeeping, Limpeza e Governação Autónoma" para o hotel "${lead.companyName}".
        LANGUAGE: Portuguese (Portugal) - Formal, Professional, and Persuasive (use pt-PT vocabulary).
        
        CONTEXT: 
        - Nome do Hotel: ${lead.companyName}
        - Localização: ${lead.location}
        - Diagnóstico de Estrelas/Avaliações: ${lead.mapsRating} estrelas (${lead.mapsReviews} avaliações)
        - Deficiências encontradas (comentários ou faltas identificadas): ${lead.diagnosis}
        - Pessoa de Contacto alvo: ${lead.contactPerson || "Governanta Geral / Diretor de Operações"}
        
        STRUCTURE REQUIREMENTS:
        1. **Introdução**: Reconhecer a importância do ${lead.companyName} e apresentar a automatização de housekeeping.
        2. **O Problema Silencioso**: Explicar o impacto de quartos que demoram a arrumar (atrasos no check-in), falhas de comunicação entre a receção e a equipa de limpeza, má gestão de consumíveis ou falta de controlo em tempo real (checklists em papel).
        3. **A Solução proposed**: Nosso Software Autónomo de Housekeeping com:
           - Notificações de suites libertadas para as empregadas de quarto na aplicação móvel.
           - Checklists visuais rápidos e relatórios de danos/achados e perdidos com foto.
           - Validação e inspeção automática pela Governanta.
           - Sincronização em tempo real com o Front-Office/Receção.
           - Gestão e inventário de enxoval e minibares.
        4. **Retorno de Investimento (ROI)**: Como a diminuição do tempo de arrumação em 15-20% liberta mais quartos por dia, aumenta a pontuação de limpeza em portais de reserva (Booking, TripAdvisor) e gera mais receitas.
        
        Retorne apenas a proposta comercial estruturada em Markdown de forma elegante e polida.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json({ text: response.text || "Erro ao gerar proposta comercial." });
    } catch (error: any) {
      console.error("GenerateProposal error:", error);
      res.status(500).json({ error: error.message || "Error generating proposal" });
    }
  });

  // Route: askQuestion
  app.post('/api/gemini/askQuestion', async (req, res) => {
    try {
      const { lead, question, history } = req.body;
      const ai = getGeminiClient();

      const context = `
        LEAD CONTEXT:
        Hotel Name: ${lead.companyName}
        Website: ${lead.website || "None"}
        Potential: ${lead.potential} (${lead.potentialReasoning})
        Pessoa de Contacto: ${lead.contactPerson || "Governanta Geral / Diretor de Alojamento"}
        Diagnosis: ${lead.diagnosis}
        Reviews: ${lead.mapsRating} stars (${lead.mapsReviews} reviews)
        Notas de Contacto: ${lead.contactNotes || "Nenhuma nota inserida"}
      `;

      const chatHistory = history.map((h: any) => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');

      const prompt = `
        ${context}
        
        PREVIOUS CHAT:
        ${chatHistory}
        
        USER QUESTION: "${question}"
        
        TASK: Responda de forma focada e assertiva sobre as oportunidades de vender o sistema de governação / housekeeping para este hotel. Sugira táticas de abordagem frias ou mensagens.
        Language: Portuguese (Portugal).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json({ text: response.text || "Sem resposta." });
    } catch (error: any) {
      console.error("AskQuestion error:", error);
      res.status(500).json({ error: error.message || "Error asking question to AI" });
    }
  });

  // Route: analyzeAndProposal
  app.post('/api/gemini/analyzeAndProposal', async (req, res) => {
    try {
      const { leadData } = req.body;

      // Run runSocialMedia logic directly or via server code
      const socialData = await runSocialMediaOnServer(leadData);
      const primaryPhone = leadData.phone || socialData.phones[0];
      const hasWebsite = !!leadData.website;

      const ai = getGeminiClient();

      const prompt = `
        AUDIT TARGET: "${leadData.companyName}" in "${leadData.location}".
        URL: ${leadData.website || "No URL provided"}

        LANGUAGE: STRICTLY EUROPEAN PORTUGUESE (pt-PT).

        TASK 1: HOTEL/ACCOMMODATION OPERATION AUDIT
        - Analyze if the establishment possesses an active hotel/guesthouse operation.
        - Check reviews for mention of "limpeza" (cleanliness), "arrumação" (room tidy), "higiene" (hygiene), "tempo de espera para quarto" (wait time).
        - Infer a specific and highly plausible Persona/Contact Person with a realistic generic Portuguese/Angolan Portuguese name (e.g., "Dra. Paula Albuquerque (Governanta-Geral)" or "Carlos Fernandes (Diretor de Alojamentos)") based on standard industry directories or corporate roles.

        TASK 2: HOUSEKEEPING PAIN INDEX & CLASSIFICATION
        - **HOT**: Bad reviews regarding cleanliness, slow check-in/turnaround, or large size showing clear logistics struggles.
        - **COLD**: Excellent reviews with explicit praise for perfect cleanliness ("limpeza impecável", "quartos limpíssimos").
        - **MEDIUM**: Standard reviews or average sized hotels.

        OUTPUT JSON:
        {
          "valid": boolean,
          "nif": "string",
          "cae": "string",
          "websiteScore": number,
          "mapsRating": number,
          "mapsReviews": number,
          "openingHours": ["string"],
          "services": ["string"],
          "reviews": [{"author": "Name", "rating": 5, "text": "..."}],
          "diagnosis": "string (pt-PT)",
          "potential": "Hot" | "Medium" | "Cold",
          "reasoning": "string (pt-PT) - e.g. 'Recebeu 3 avaliações reclamando de cabelos no quarto e atraso no check-in'",
          "problems": ["string"],
          "solutionFeatures": ["string"],
          "expectedBenefits": ["string"],
          "contactPerson": "string (realistic name + role, e.g. Maria Clara Sousa (Governanta-Geral))",
          "contactNotes": "string (pt-PT - summary of hotel size, positioning, and target pitch)"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash", 
        contents: prompt,
        config: { tools: [{ googleSearch: {} }, { googleMaps: {} }] },
      });

      const data = extractJson(response.text || "{}");
      if (data.valid === false) {
        return res.json(null);
      }

      const id = crypto.randomUUID();

      const lead = {
        id,
        companyName: leadData.companyName || "Unknown",
        location: leadData.location || "Unknown",
        niche: leadData.niche || "Hotelaria",
        website: leadData.website,
        email: leadData.email,
        phone: primaryPhone,
        allPhones: socialData.phones,
        socials: socialData.socials,
        socialSummary: socialData.socialSummary,
        nif: data.nif || "N/A",
        cae: data.cae || "N/A",
        mapsRating: data.mapsRating || 0,
        mapsReviews: data.mapsReviews || 0,
        businessHours: data.openingHours || [],
        servicesOffered: data.services || [],
        reviewsList: data.reviews || [],
        hasWebsite: hasWebsite,
        isProfessionalEmail: false,
        websiteScore: data.websiteScore || 0,
        status: 'completed',
        potential: data.potential || 'Medium',
        potentialReasoning: data.reasoning || "Análise de limpeza e governança concluída.",
        contactPerson: data.contactPerson || "Governanta-Geral",
        contactNotes: data.contactNotes || "Hotel com potencial para modernização operacional do departamento de andares.",
        callbackStatus: 'pending',
        storefront: {
          analyzed: true,
          signageCondition: 'Unknown',
          visualAppeal: 'Medium',
          needsLedUpgrade: false,
          description: "Estrutura do hotel analisada remotamente via fotos de satélite e Maps.",
          address: leadData.location || "Portugal"
         },
        diagnosis: data.diagnosis || "Pronto para contacto de apresentação do software de Housekeeping.",
        proposal: {
          siteStructure: ["Aplicação Móvel das Empregadas", "Painel Administrativo da Governanta", "Ecrã de Status da Receção"],
          brandingSuggestion: "Digitalização de Housekeeping",
          techStack: "React Native + Web Panel Dashboard",
          problems: data.problems || ["Coordenação ineficiente por telefone/rádio", "Checklists em papel rasgados ou perdidos", "Receção sem visibilidade do quarto limpo"],
          solutionFeatures: data.solutionFeatures || ["Ecrã de equipas em tempo real", "Registo de minibares com submissão imediata", "Checklist digital obrigatório por quarto"],
          expectedBenefits: data.expectedBenefits || ["Redução de 20 minutos no tempo de rotação do quarto", "Aumento imediato do NPS de Limpeza", "Controlo rigoroso de inventário de amenities"],
          estimatedValue: "149€ / mês"
        },
        emailSequence: [],
        aiChatHistory: [],
        generatedSiteCode: null 
      };

      res.json(lead);
    } catch (error: any) {
      console.error("AnalyzeAndProposal error:", error);
      res.status(500).json({ error: error.message || "Error analyzing lead" });
    }
  });

  // Helper inside analyze route to match current architecture
  async function runSocialMediaOnServer(lead: any) {
    const ai = getGeminiClient();
    const prompt = `
        TASK: Analyze Social Presence for company: "${lead.companyName}" in "${lead.location}".
        
        PART 1: Find URLs (Instagram, Facebook, LinkedIn, TikTok).
        
        PART 2: CRITICAL ANALYSIS (ONLY RELEVANT INFO FOR SALES).
        - Do NOT simply say "I found the accounts".
        - Focus on ACTIVITY, QUALITY, and MISSED OPPORTUNITIES.
        - Check:
          1. **Last Post Date**: Is it abandoned? (e.g., "Último post em 2021").
          2. **Quality**: Is it professional content or amateur/low-res?
          3. **Engagement**: Do they have likes/comments or is it a ghost town?
          4. **Setup**: Is there a link in bio? Is the logo correct?

        OUTPUT JSON: 
        { 
          "phones": [], 
          "instagram": "", 
          "facebook": "", 
          "linkedin": "", 
          "tiktok": "", 
          "youtube": "",
          "report": "Short, punchy summary in PT-PT. Example: 'Instagram abandonado desde 2022. Facebook ativo mas com imagens de baixa qualidade e sem link para site. Oportunidade de gestão.'"
        }
    `;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      const data = extractJson(response.text || "{}");
      const socials: any[] = [];
      if (data.instagram) socials.push({ network: 'instagram', url: data.instagram });
      if (data.facebook) socials.push({ network: 'facebook', url: data.facebook });
      if (data.linkedin) socials.push({ network: 'linkedin', url: data.linkedin });
      if (data.tiktok) socials.push({ network: 'tiktok', url: data.tiktok });
      if (data.youtube) socials.push({ network: 'youtube', url: data.youtube });

      return {
        socials,
        phones: Array.isArray(data.phones) ? data.phones : (data.phones ? [data.phones] : []),
        socialSummary: data.report || "Sem informação social relevante encontrada."
      };
    } catch {
      return { socials: [], phones: [], socialSummary: "Não foi possível coletar mídias sociais." };
    }
  }

  // Route: generateWebsite
  app.post('/api/gemini/generateWebsite', async (req, res) => {
    try {
      const { lead } = req.body;
      const ai = getGeminiClient();

      const services = lead.servicesOffered?.slice(0, 3).join(", ") || "Serviços Premium";
      const reviews = lead.reviewsList?.slice(0, 2) || [];
      
      const prompt = `
          ROLE: Senior Frontend Developer (Tailwind CSS Expert).
          TASK: Create a single-file, responsive, high-converting Landing Page for: "${lead.companyName}".
          
          CONTEXT:
          - Niche: ${lead.niche} in ${lead.location}
          - Services: ${services}
          - Reviews: ${JSON.stringify(reviews)}
          - Contact: ${lead.phone || "Contact us"}, ${lead.email || ""}
          - Address: ${lead.location}
          - Colors: Professional, Trustworthy, Modern (Use Tailwind blue/slate/gray palette).

          REQUIREMENTS:
          1. **Structure**: 
             - Header (Logo + Nav)
             - Hero Section (Strong Headline + CTA "Pedir Orçamento")
             - Features/Services Grid (Use 3 cards)
             - Social Proof/Testimonials (Use real reviews if available)
             - Contact/Footer (Map placeholder + Info)
          2. **Tech Stack**: HTML5 + Tailwind CSS (via CDN).
          3. **Design**: Minimalist, clean, lots of whitespace.
          4. **Images**: YOU MUST USE WORKING PLACEHOLDER IMAGES. 
             - Use 'https://placehold.co/600x400/e2e8f0/1e293b?text=Service' for service cards.
             - Use 'https://placehold.co/1920x1080/1e293b/ffffff?text=Hero+Image' for Hero background.
             - Do not use Unsplash Source (it is deprecated).
          5. **Language**: Portuguese (Portugal).

          OUTPUT:
          - Return ONLY the raw HTML code starting with <!DOCTYPE html>.
          - Include <script src="https://cdn.tailwindcss.com"></script> in the head.
          - Ensure the code is complete and ready to run.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      
      let code = response.text || "";
      code = code.replace(/```html/g, '').replace(/```/g, '');
      res.json({ html: code });
    } catch (error: any) {
      console.error("GenerateWebsite error:", error);
      res.status(500).json({ error: error.message || "Error generating website code" });
    }
  });

  // Route: refineWebsite
  app.post('/api/gemini/refineWebsite', async (req, res) => {
    try {
      const { currentCode, userInstruction } = req.body;
      const ai = getGeminiClient();

      const prompt = `
          ROLE: Expert Frontend Developer.
          TASK: Update the existing HTML/Tailwind code based on the user's request.

          USER INSTRUCTION: "${userInstruction}"

          RULES:
          1. Keep the existing structure unless asked to change it.
          2. Keep Tailwind CSS (CDN).
          3. Output ONLY the FULL, VALID, UPDATED HTML code.
          4. Do NOT output markdown code blocks.
          5. Do not summarize, output the code directly.

          CURRENT CODE:
          ${currentCode.substring(0, 15000)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let code = response.text || "";
      code = code.replace(/```html/g, '').replace(/```/g, '');
      res.json({ html: code });
    } catch (error: any) {
      console.error("RefineWebsite error:", error);
      res.status(500).json({ error: error.message || "Error refining website code" });
    }
  });

  // Integrates Vite development server middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
