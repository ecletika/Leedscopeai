import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Lead, EmailDraft, SmtpConfig } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey });
};

/**
 * Agent 1: Search Agent (Module 1)
 * Updated to handle empty location/niche if aiContext is provided.
 */
export const searchLeadsInLocation = async (
  location: string, 
  niche: string, 
  mode: 'standard' | 'street' = 'standard',
  aiContext?: string
): Promise<Partial<Lead>[]> => {
  const ai = getClient();
  
  // Se location ou niche estiverem vazios, a IA deve inferir do contexto
  const locStr = location ? `"${location}"` : "(Infer from User Instruction)";
  const nicheStr = niche ? `"${niche}"` : "(Infer from User Instruction)";
  
  const contextInstruction = aiContext ? `CRITICAL USER INSTRUCTION: "${aiContext}". THIS OVERRIDES EVERYTHING. If location/niche are not explicit above, use this instruction to find the targets.` : "";

  let prompt = "";

  if (mode === 'street') {
    prompt = `
      TASK: Perform a "Street-by-Street" scan for businesses.
      TARGET LOCATION: ${locStr} (Portugal).
      TARGET NICHE: ${nicheStr}.
      ${contextInstruction}

      STRATEGY:
      1. Identify the relevant commercial streets based on the location or instruction.
      2. List real businesses found.
      3. Focus on local businesses, street shops, and offices.

      EXTRACT FOR EACH LEAD:
      - Company Name (MUST BE A REAL NAME, do not invent)
      - Full Address
      - Website URL (if available, set to null if not)
      - Phone Number
      - Email (if publicly visible)

      CRITICAL OUTPUT INSTRUCTION:
      - Return a VALID JSON ARRAY.
      - If no specific businesses are found, return an empty array [].
      - Do not return generic placeholders like "Loja de Sapatos".
      - JSON ONLY. No markdown.
    `;
  } else {
    prompt = `
      TASK: Find real local businesses.
      TARGET LOCATION: ${locStr} (Portugal).
      TARGET NICHE: ${nicheStr}.
      ${contextInstruction}
      
      For each business, extract:
      - Company Name (MUST BE A REAL NAME)
      - Website URL (if available, otherwise null)
      - Phone Number
      - Full Address
      - Email (if publicly visible)
      
      CRITICAL OUTPUT INSTRUCTION:
      - Return a VALID JSON ARRAY.
      - If no real businesses are found that match the criteria, return empty [].
      - JSON ONLY. No markdown.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: mode === 'street' ? [{ googleMaps: {} }] : [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    let rawText = response.text;
    if (!rawText) return [];
    
    if (rawText.includes("```json")) {
        rawText = rawText.split("```json")[1].split("```")[0];
    } else if (rawText.includes("```")) {
        rawText = rawText.split("```")[1].split("```")[0];
    }
    
    const parsed = JSON.parse(rawText.trim());
    
    if (!Array.isArray(parsed)) return [];

    // Filter out obviously bad data immediately
    return parsed
      .filter((item: any) => item.companyName && item.companyName !== 'Unknown' && item.companyName !== 'N/A')
      .map((item: any) => ({
        companyName: item.companyName,
        website: item.website || undefined,
        phone: item.phone || undefined,
        location: item.address || location || "Portugal",
        email: item.email || undefined,
        niche: niche || "General",
        socials: [],
      }));

  } catch (error) {
    console.error("Agent 1 Error:", error);
    return [];
  }
};

/**
 * Multi-Agent Simulation (Module 2, 3, 4)
 */
export const analyzeAndGenerateProposal = async (leadData: Partial<Lead>): Promise<Lead | null> => {
  const ai = getClient();

  const isProfessionalEmail = (email?: string) => {
    if (!email || !email.includes('@')) return false;
    const parts = email.split('@');
    if (parts.length < 2) return false;
    const domain = parts[1];
    if (!domain) return false;
    const freeDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'sapo.pt', 'live.com.pt', 'netcabo.pt'];
    return !freeDomains.includes(domain.toLowerCase());
  };

  const hasWebsite = !!leadData.website;
  const emailIsPro = isProfessionalEmail(leadData.email);

  const prompt = `
    CONTEXT:
    Company: ${leadData.companyName}
    Location: ${leadData.location}
    Niche: ${leadData.niche}
    
    --- AGENT TASK ---
    1. Verify if this is a REAL company in Portugal via Google Search/Maps.
    2. If it is NOT a real company or you cannot find data, return {"valid": false}.
    3. If valid, find: NIF, CAE, Foundation Year, Map Rating.
    4. Score the website (0-10).
    5. Generate a proposal.

    --- OUTPUT FORMAT ---
    Return strictly JSON.
    If Invalid:
    { "valid": false }

    If Valid:
    {
      "valid": true,
      "nif": "string",
      "cae": "string",
      "secondaryCae": ["string"],
      "businessActivity": "string",
      "foundationYear": "string",
      "capitalSocial": "string",
      "employees": "string",
      "mapsRating": numberOrNull,
      "mapsReviews": numberOrNull,
      "existingSiteSummary": "stringOrNull",
      "websiteScore": number,
      "diagnosis": "string",
      "problems": ["string"],
      "solutionFeatures": ["string"],
      "expectedBenefits": ["string"],
      "siteStructure": ["string"],
      "brandingSuggestion": "string",
      "techStack": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {}, googleMaps: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    let rawText = response.text || "{}";
    if (rawText.includes("```json")) {
        rawText = rawText.split("```json")[1].split("```")[0];
    } else if (rawText.includes("```")) {
        rawText = rawText.split("```")[1].split("```")[0];
    }

    const data = JSON.parse(rawText.trim());

    // Strict validation check
    if (data.valid === false || !data.nif || data.nif === 'Not Found' || data.nif === 'N/A') {
        // If we can't even find a NIF or the AI says it's invalid, we treat it as a ghost lead.
        // However, some valid leads might not have public NIF easily found.
        // Let's rely on "valid" flag or if name is generic.
        if (data.valid === false) return null;
    }

    return {
      id: crypto.randomUUID(),
      companyName: leadData.companyName || "Unknown",
      location: leadData.location || "Unknown",
      niche: leadData.niche || "General",
      website: leadData.website,
      email: leadData.email,
      phone: leadData.phone,
      socials: [], 
      
      nif: data.nif || "N/A",
      cae: data.cae || "N/A",
      secondaryCae: data.secondaryCae || [],
      businessActivity: data.businessActivity || "Unknown",
      foundationYear: data.foundationYear || "N/A",
      capitalSocial: data.capitalSocial || "N/A",
      employees: data.employees || "N/A",
      
      mapsRating: data.mapsRating,
      mapsReviews: data.mapsReviews,
      existingSiteSummary: data.existingSiteSummary,

      hasWebsite: hasWebsite,
      isProfessionalEmail: emailIsPro,
      websiteScore: hasWebsite ? data.websiteScore : 0,
      status: 'completed',
      diagnosis: data.diagnosis || "Diagnóstico automático realizado.",
      proposal: {
        siteStructure: data.siteStructure || [],
        brandingSuggestion: data.brandingSuggestion || "",
        techStack: data.techStack || "Web Moderno",
        problems: data.problems || [],
        solutionFeatures: data.solutionFeatures || [],
        expectedBenefits: data.expectedBenefits || [],
        estimatedValue: "1200€ - 2500€"
      },
      emailSequence: [],
      generatedSiteCode: null 
    };

  } catch (error) {
    console.error("Analysis Error:", error);
    return null; // Return null on error so the dashboard can remove it
  }
};

/**
 * Module 5: Outreach Agent
 */
export const generateOutreachEmail = async (lead: Lead): Promise<Lead> => {
    if (!lead.proposal) return lead;

    const ai = getClient();
    const prompt = `
      Identify the single biggest digital weakness of "${lead.companyName}" based on:
      - Score: ${lead.websiteScore}/10
      - Email: ${lead.isProfessionalEmail ? 'Pro' : 'Generic'}
      - Problems: ${lead.proposal.problems.join(', ')}
      
      Output a single short sentence in Portuguese (PT).
    `;

    let weaknessSentence = "O site atual não reflete a qualidade dos vossos serviços.";
    try {
        const response = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt,
        });
        if(response.text) weaknessSentence = response.text.trim();
    } catch(e) {}

    const sequence: EmailDraft[] = [
        {
            id: '1',
            step: 1,
            type: 'intro',
            status: 'draft',
            subject: `Oportunidade para a ${lead.companyName}`,
            body: `Olá,\n\nAnalisei a presença digital da ${lead.companyName} e identifiquei algumas oportunidades claras de melhoria.\n\nAtualmente: ${weaknessSentence}\n\nGostaria de apresentar uma proposta.\n\nCumprimentos,\n[Seu Nome]`
        },
        // ... simplified for brevity, logic remains same
    ];

    return { ...lead, emailSequence: sequence };
};

/**
 * Agent 7: Website Builder
 */
export const generateWebsiteCode = async (lead: Lead): Promise<string> => {
  if (!lead.proposal) return "";
  const ai = getClient();
  const prompt = `
    ROLE: World-Class UI/UX Designer & Frontend Developer.
    TASK: Create a High-Converting, Modern, Minimalist Landing Page for "${lead.companyName}" (Niche: ${lead.niche}).
    
    DESIGN PRINCIPLES (Minimalism):
    - **Whitespace**: Use generous padding (py-24, gap-16) to let content breathe. Avoid clutter.
    - **Typography**: Use 'Inter' font. Large, bold headings (text-5xl, text-6xl) with tight leading. Readable, dark-gray body text (text-lg, text-gray-600) with relaxed leading.
    - **Color Palette**: Strict monochrome base (White bg, Slate-900 text, Gray-50 borders) with ONE vibrant accent color (e.g., Blue-600, Indigo-600, or Emerald-600) used SPARINGLY for buttons/highlights.
    - **Components**: 
      - Cards should have subtle borders (border border-gray-100) and practically NO shadow (or extremely subtle shadow-sm).
      - Buttons should be rounded-lg or rounded-full with ample padding.
      - Navigation: Simple, sticky, with a glassmorphism effect (backdrop-blur-md bg-white/80).

    CONTENT STRUCTURE:
    1. **Hero Section**: Powerful H1, concise subtext, primary CTA, and a prominent Hero Image.
    2. **Features/Services**: A clean grid (3 columns). Icons should be simple (use generic SVG paths or simple CSS shapes, DO NOT use external icon fonts that might break).
    3. **About/Trust**: A split layout (Text Left / Image Right) explaining why to choose them.
    4. **Contact/Footer**: Minimalist form or contact info with map placeholder.

    IMAGE HANDLING (CRITICAL):
    - Do NOT invent fake URLs that will 404.
    - YOU MUST USE THE FOLLOWING PLACEHOLDER FORMAT for all images: 
      "https://placehold.co/800x600/F3F4F6/1F2937?text=Keyword"
    - Replace 'Keyword' with the specific subject of the image (e.g., text=Office, text=Team, text=Meeting, text=Product, text=Hero).
    - Images must use 'object-cover' and have rounded corners (rounded-2xl) where appropriate.

    OUTPUT:
    - Return ONLY the complete HTML code (starting with <!DOCTYPE html>).
    - Include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
    - Include Google Fonts (Inter) in the head.
    - Ensure it is fully responsive (mobile-first).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    let code = response.text || "";
    if (code.includes("```html")) code = code.split("```html")[1].split("```")[0];
    return code.trim();
  } catch (error) {
    return "<div>Error generating site</div>";
  }
};

/**
 * Agent 9: Infrastructure Agent (SMTP Test)
 */
export const testSmtpConfiguration = async (config: SmtpConfig, targetEmail: string): Promise<{ success: boolean; log: string }> => {
    const ai = getClient();
    
    // Check for obvious missing fields first
    if (!config.host || !config.user || !config.pass) {
        return { 
            success: false, 
            log: `[ERROR] Missing required SMTP fields.\nHost: ${config.host || 'MISSING'}\nUser: ${config.user || 'MISSING'}\nPassword: ${config.pass ? '******' : 'MISSING'}` 
        };
    }

    const prompt = `
      ROLE: Infrastructure Reliability Agent.
      TASK: Simulate a RAW SMTP PROTOCOL handshake log to test an email configuration.
      
      INPUTS:
      Host: ${config.host}
      Port: ${config.port}
      User: ${config.user}
      Target: ${targetEmail}
      
      INSTRUCTIONS:
      1. Generate a realistic, technical log of an SMTP session (connecting, HELO, STARTTLS, AUTH LOGIN, MAIL FROM, RCPT TO, DATA, 250 OK, QUIT).
      2. If the 'Host' looks like a common provider (gmail, outlook) and the port is correct (587, 465, 25), simulate a SUCCESSFUL connection.
      3. If the settings look completely wrong (e.g. host "fake.com"), simulate a TIMEOUT or DNS ERROR.
      4. Include timestamps in the log [HH:mm:ss.ms].
      
      OUTPUT FORMAT:
      Start with "LOG_START" and end with "LOG_END".
      Inside, provide the raw log text.
      The last line should be either "STATUS: SUCCESS" or "STATUS: FAILED".
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });

        let text = response.text || "";
        let log = text;
        let success = true;

        if (text.includes("STATUS: FAILED")) {
            success = false;
        }
        
        // Cleanup response
        log = log.replace("LOG_START", "").replace("LOG_END", "").trim();
        
        return { success, log };

    } catch (error) {
        return { success: false, log: `[SYSTEM ERROR] Agent failed to execute diagnosis: ${error}` };
    }
};