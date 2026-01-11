import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Lead, EmailDraft, SmtpConfig, SocialProfile, StorefrontAnalysis, Review, ChatMessage } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey });
};

const extractJson = (text: string): any => {
    try {
        // Remove markdown code blocks if present
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '');
        
        // Try to find the JSON array/object
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

const isValidNif = (nif?: string): boolean => {
    if (!nif || nif === 'N/A' || nif === 'Unknown') return false;
    const cleanNif = nif.replace(/[^0-9]/g, '');
    return cleanNif.length === 9;
};

/**
 * Agent 1: Search Agent (General Discovery)
 */
export const searchLeadsInLocation = async (
  location: string, 
  niche: string, 
  aiContext: string,
  campaignName: string
): Promise<Partial<Lead>[]> => {
  const ai = getClient();
  
  // Construct dynamic search intent based on what is available
  let searchIntent = "";
  if (location && niche) {
      searchIntent = `Find "${niche}" businesses in "${location}"`;
  } else if (location && !niche) {
      searchIntent = `Find active businesses in "${location}" (infer types from context: ${aiContext || campaignName})`;
  } else if (!location && niche) {
      searchIntent = `Find "${niche}" businesses in Portugal (focus on major cities if not specified)`;
  } else {
      // Fallback: Use AI Context or Campaign Name
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const parsed = extractJson(response.text || "[]");
    
    if (!Array.isArray(parsed)) return [];

    // Filter out bad results
    return parsed
      .filter((item: any) => {
          const name = item.companyName || "";
          // Filter out generic placeholders or empty names
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
  } catch (error) {
    console.error("Agent 1 Error:", error);
    return [];
  }
};

/**
 * Agent: Social Media Sniper
 */
export const runSocialMediaAgent = async (lead: Partial<Lead>): Promise<{ socials: SocialProfile[], phones: string[], socialSummary: string }> => {
    const ai = getClient();
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
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        const data = extractJson(response.text || "{}");
        const socials: SocialProfile[] = [];
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
    } catch (e) {
        return { socials: [], phones: [], socialSummary: "Erro na análise social." };
    }
};

/**
 * Agent: Visual Storefront Investigator + Maps Data Extractor
 */
export const runStorefrontInvestigation = async (lead: Lead): Promise<{ analysis: StorefrontAnalysis, leadUpdates: Partial<Lead> }> => {
    const ai = getClient();
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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }, { googleMaps: {} }] }
        });

        const data = extractJson(response.text || "{}");
        
        const analysis: StorefrontAnalysis = {
            analyzed: true,
            signageCondition: data.signageCondition || 'Unknown',
            visualAppeal: data.visualAppeal || 'Medium',
            needsLedUpgrade: data.needsLedUpgrade || false,
            description: data.description || "Não foi possível analisar visualmente.",
            address: data.address || lead.location
        };

        const leadUpdates: Partial<Lead> = {
            location: data.address || lead.location, // Update main location with exact address
            mapsRating: data.rating,
            mapsReviews: data.reviewsCount,
            businessHours: data.openingHours || [],
            reviewsList: data.reviews || [],
            servicesOffered: data.services || [],
            // Only update phone if we didn't have one or if it's new
            phone: lead.phone || data.phone
        };

        return { analysis, leadUpdates };

    } catch (e) {
        console.error("Storefront Investigation Error:", e);
        return {
            analysis: {
                analyzed: true,
                signageCondition: 'Unknown',
                visualAppeal: 'Medium',
                needsLedUpgrade: false,
                description: "Erro na investigação visual.",
                address: lead.location
            },
            leadUpdates: {}
        };
    }
};

/**
 * Agent: Commercial Proposal Generator
 */
export const generateCommercialProposal = async (lead: Lead): Promise<string> => {
    const ai = getClient();
    const prompt = `
        TASK: Write a highly persuasive commercial proposal for "${lead.companyName}".
        LANGUAGE: Portuguese (Portugal) - Formal, Professional, and Persuasive.
        
        CONTEXT: 
        - Lead Diagnosis: ${lead.diagnosis}
        - Website Status: ${lead.hasWebsite ? "Has Site (Score: " + lead.websiteScore + ")" : "No Website"}
        - LED Needs: ${lead.storefront.needsLedUpgrade ? "High" : "Low"}
        - Social Presence: ${lead.socialSummary}
        
        STRUCTURE REQUIREMENTS:
        1. **Introduction**: Acknowledge their business status professionally.
        2. **The Problem**: Highlight missed opportunities (old site, lack of visibility).
        3. **Visual Identity & Design** (CRITICAL): Write a dedicated, strong paragraph explaining why a modern, professional visual identity is crucial for establishing trust and justifying premium prices. Explain how poor design drives customers away.
        4. **The Solution**: Web Development + LED Signage + Social Growth.
        5. **Investment & Return**: Why this pays for itself.
        
        Output only the text of the proposal in Markdown format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "Erro ao gerar proposta.";
    } catch (e) {
        return "Erro ao conectar com o gerador de propostas.";
    }
};

/**
 * Agent: Ask AI About Lead
 */
export const askLeadQuestion = async (lead: Lead, question: string, history: ChatMessage[]): Promise<string> => {
    const ai = getClient();
    
    // Construct context from lead data
    const context = `
        LEAD CONTEXT:
        Name: ${lead.companyName}
        Website: ${lead.website || "None"} (Score: ${lead.websiteScore})
        Potential: ${lead.potential} (${lead.potentialReasoning})
        Diagnosis: ${lead.diagnosis}
        Reviews: ${lead.mapsRating} stars (${lead.mapsReviews} reviews)
        Signage: ${lead.storefront.signageCondition}
        Social Report: ${lead.socialSummary}
    `;

    const chatHistory = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');

    const prompt = `
        ${context}
        
        PREVIOUS CHAT:
        ${chatHistory}
        
        USER QUESTION: "${question}"
        
        TASK: Answer the user's question about this lead specifically. Be honest. 
        If the user asks why it's "Hot", explain the flaws found. 
        If they ask about the site quality, give details based on the score.
        Language: Portuguese (Portugal).
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "Sem resposta.";
    } catch (e) {
        return "Erro ao processar pergunta.";
    }
};

/**
 * Main Analysis (Orchestrator)
 */
export const analyzeAndGenerateProposal = async (leadData: Partial<Lead>): Promise<Lead | null> => {
  const ai = getClient();

  const socialData = await runSocialMediaAgent(leadData);
  const primaryPhone = leadData.phone || socialData.phones[0];
  const hasWebsite = !!leadData.website;
  
  const prompt = `
    AUDIT TARGET: "${leadData.companyName}" in "${leadData.location}".
    URL: ${leadData.website || "No URL provided"}

    LANGUAGE: STRICTLY EUROPEAN PORTUGUESE (pt-PT).

    TASK 1: RIGOROUS WEBSITE & DIGITAL AUDIT
    - If they have a website, check if it is **MODERN** (responsive, SSL, design post-2020).
    - If the site looks good, clean, and modern, SCORE IT HIGH (8-10).
    - If the site is old, broken, non-responsive, or ugly, SCORE IT LOW (0-4).
    - If NO website, Score is 0.

    TASK 2: GOOGLE MAPS DEEP DIVE
    - Extract Opening Hours, Services, Reviews.

    TASK 3: CLASSIFICATION (The most important part)
    - **HOT**: No website, OR Website Score < 5 (Old/Broken).
    - **COLD**: Modern Website (Score > 7) AND Good Reviews.
    - **MEDIUM**: In between.
    - **REASONING**: Explain exactly why you chose this classification.

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
      "reasoning": "string (pt-PT) - e.g. 'Site muito antigo e não responsivo' or 'Site moderno e profissional'",
      "problems": ["string"],
      "solutionFeatures": ["string"],
      "expectedBenefits": ["string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: { tools: [{ googleSearch: {} }, { googleMaps: {} }] },
    });

    const data = extractJson(response.text || "{}");
    if (data.valid === false) return null;

    return {
      id: crypto.randomUUID(),
      companyName: leadData.companyName || "Unknown",
      location: leadData.location || "Unknown",
      niche: leadData.niche || "General",
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
      potentialReasoning: data.reasoning || "Análise automática.",
      storefront: {
          analyzed: false,
          signageCondition: 'Unknown',
          visualAppeal: 'Medium',
          needsLedUpgrade: false,
          description: "Requer investigação visual.",
          address: leadData.location // Fallback initial location
      },
      diagnosis: data.diagnosis || "Análise preliminar feita.",
      proposal: {
        siteStructure: [],
        brandingSuggestion: "Upgrade Digital & Físico",
        techStack: "React",
        problems: data.problems || [],
        solutionFeatures: data.solutionFeatures || [],
        expectedBenefits: data.expectedBenefits || [],
        estimatedValue: "3000€"
      },
      emailSequence: [],
      aiChatHistory: [],
      generatedSiteCode: null 
    };

  } catch (error) {
    console.error("Analysis Error:", error);
    return null; 
  }
};

/**
 * Agent: Website Generator
 */
export const generateWebsiteCode = async (lead: Lead): Promise<string> => {
  const ai = getClient();

  const services = lead.servicesOffered?.slice(0, 3).join(", ") || "Serviços Premium";
  const reviews = lead.reviewsList?.slice(0, 2) || [];
  
  // Create a structured prompt
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let code = response.text || "";
    // Clean up markdown code blocks if present
    code = code.replace(/```html/g, '').replace(/```/g, '');
    
    return code;
  } catch (e) {
    console.error("Site Generation Error:", e);
    return "<!-- Erro ao gerar o site. Tente novamente. -->";
  }
};

/**
 * Agent: Website Refiner (Update Code based on prompt)
 */
export const refineWebsiteCode = async (currentCode: string, userInstruction: string): Promise<string> => {
    const ai = getClient();

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
        ${currentCode.substring(0, 15000)} // Truncate if too huge, but usually fine for simple landing pages
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        let code = response.text || "";
        code = code.replace(/```html/g, '').replace(/```/g, '');
        return code;
    } catch (e) {
        console.error("Refine Error:", e);
        return currentCode; // Return original on error
    }
}

export const generateOutreachEmail = async (lead: Lead): Promise<Lead> => { return { ...lead }; };
export const testSmtpConfiguration = async (config: SmtpConfig, targetEmail: string) => { return { success: true, log: "Simulated OK" }; };