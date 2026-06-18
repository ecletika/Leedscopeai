import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;

    const contents = fs.readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      value = value.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 6001);
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Supabase admin client (service role) - usado para criar contas de vendedor via Supabase Auth
  let supabaseAdmin: any = null;
  const getSupabaseAdmin = (): any => {
    if (supabaseAdmin) return supabaseAdmin;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    supabaseAdmin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    return supabaseAdmin;
  };

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

  const getPrimaryUrl = (item: any) => {
    return item.extratags?.website ||
      item.extratags?.contact_website ||
      item.extratags?.["contact:website"] ||
      undefined;
  };

  const getPrimaryPhone = (item: any) => {
    return item.extratags?.phone ||
      item.extratags?.contact_phone ||
      item.extratags?.["contact:phone"] ||
      undefined;
  };

  const escapeMd = (value: string | undefined | null) => {
    const text = String(value || "").trim();
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const joinBullets = (items: string[] = [], fallback: string) =>
    (items.length ? items : [fallback])
      .map((item) => `- ${escapeMd(item)}`)
      .join("\n");

  const buildProposalMarkdown = (lead: any) => {
    const hotel = escapeMd(lead.companyName || "o hotel");
    const location = escapeMd(lead.location || "Portugal");
    const rating = lead.mapsRating != null ? `${lead.mapsRating} estrelas` : "avaliação disponível";
    const reviews = lead.mapsReviews != null ? `${lead.mapsReviews} avaliações` : "avaliações públicas";
    const diagnosis = escapeMd(lead.diagnosis || "Potencial de modernização da operação de housekeeping.");
    const contact = escapeMd(lead.contactPerson || "Governanta Geral / Diretor de Operações");

    const problemSet = lead.proposal?.problems || [
      "Coordenação manual entre a receção e a equipa de limpeza",
      "Baixa visibilidade do estado dos quartos em tempo real",
      "Processos em papel difíceis de auditar",
      "Gestão de consumíveis e enxoval sem controlo"
    ];
    const featureSet = lead.proposal?.solutionFeatures || [
      "Status de quartos em tempo real",
      "Checklists digitais com registo fotográfico de danos e achados",
      "Relatórios automáticos para governanta e direção",
      "Sincronização em tempo real com a receção"
    ];
    const benefitSet = lead.proposal?.expectedBenefits || [
      "Redução do tempo de rotação dos quartos",
      "Melhoria da pontuação de limpeza em Booking e Tripadvisor",
      "Controlo rigoroso de inventário",
      "Mais quartos vendidos por dia com o mesmo staff"
    ];
    const value = escapeMd(lead.proposal?.estimatedValue || "149 EUR / mês");

    const packageItens = lead.proposal?.siteStructure || [
      "Aplicação Móvel das Empregadas de Quarto",
      "Painel da Governanta",
      "Ecrã de Status da Receção"
    ];
    const techStack = escapeMd(lead.proposal?.techStack || "React Native + Web Panel Dashboard");
    const branding = escapeMd(lead.proposal?.brandingSuggestion || "Digitalização de Housekeeping");

    return `Proposta Comercial - ${hotel}
Localização: ${location}
Perfil decisor: ${contact}
Performance atual: ${rating} | ${reviews}

1. Introdução
O ${hotel} já tem um ativo importante: a confiança dos hóspedes. O próximo salto competitivo não é apenas ter boas avaliações, mas garantir que a operação de quartos consiga sustentar altas taxas de ocupação sem perder controlo da limpeza, dos achados e da comunicação entre a receção e as equipas de piso.

2. O Problema Silencioso
Hoje, hotéis com avaliações inconsistentes em limpeza e com alto movimento de check-in / check-out sofrem com:
${joinBullets(problemSet, "Falhas de comunicação entre receção e equipa de limpeza")}

Esses pontos geram atrasos no check-in, desperdício de tempo da governanta e maior risco de reclamações em portais de reserva.

3. A Nossa Proposta - ${branding}
Implementamos uma solução desenhada para resolver os pontos acima:
${joinBullets(featureSet, "Checklists digitais com validacao da governanta")}

4. Âmbito do Projeto
${packageItens.map((item: string) => `- ${escapeMd(item)}`).join("\n")}

Modelo tecnológico: ${techStack}

5. Retorno Esperado
Benefícios diretos para o ${hotel}:
${joinBullets(benefitSet, "Redução de retrabalho e reclamações de limpeza")}

6. Investimento
Modelo simples e previsível: ${value}, com implementação faseada para não perturbar a operação diária.

7. Próximo Passo
Sugiro uma conversa de 30 minutos com ${contact} para:
- Mapear o fluxo atual de rooms status
- Apresentar um piloto com 10 quartos durante 2 semanas
- Aferir ganhos concretos antes da implementação total

---
LeadScope AI - Oportunidade gerada a ${new Date().toLocaleDateString("pt-PT")}.`;
  };

  // Route: generateProposal
  app.post('/api/gemini/generateProposal', async (req, res) => {
    try {
      const { lead } = req.body;

      if (!lead?.companyName) {
        return res.status(400).json({ text: "Lead inválido: nome do hotel não foi fornecido." });
      }

      const text = buildProposalMarkdown(lead);
      res.json({ text });
    } catch (error: any) {
      console.error("GenerateProposal error:", error);
      res.status(500).json({ error: error.message || "Error generating proposal" });
    }
  });

  const decodeXml = (value: string) => {
    return (value || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\\,/g, ",")
      .trim();
  };

  const getXmlTag = (xml: string, tag: string) => {
    const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return decodeXml(match?.[1] || "");
  };

  const parseRnetRecords = (xml: string) => {
    const records = xml.match(/<RNET_Registo>[\s\S]*?<\/RNET_Registo>/g) || [];
    return records.map(record => ({
      tipologia: getXmlTag(record, "Tipologia"),
      nrRegisto: getXmlTag(record, "NrRegisto"),
      dataRegisto: getXmlTag(record, "DataRegisto"),
      nome: getXmlTag(record, "Nome"),
      marca: getXmlTag(record, "Marca"),
      categoria: getXmlTag(record, "Categoria"),
      estadoClassificacao: getXmlTag(record, "EstadoClassificacao"),
      capacidade: Number(getXmlTag(record, "Capacidade") || 0),
      nrUnidadesAlojamento: Number(getXmlTag(record, "NrUnidadesAlojamento") || 0),
      endereco: getXmlTag(record, "Endereco"),
      codPostal: getXmlTag(record, "CodPostal"),
      localidade: getXmlTag(record, "Localidade"),
      concelho: getXmlTag(record, "Concelho"),
      distrito: getXmlTag(record, "Distrito"),
      telefone: getXmlTag(record, "Telefone") || getXmlTag(record, "Telemovel"),
      email: getXmlTag(record, "Email"),
      nrRestaurantes: Number(getXmlTag(record, "NrRestaurantes") || 0),
      salasReuniao: getXmlTag(record, "SalasReuniao") === "true",
      capacidadeSalasReuniao: Number(getXmlTag(record, "CapacidadeSalasReuniao") || 0),
      spa: getXmlTag(record, "SPA") === "true",
      piscinasExteriores: getXmlTag(record, "PiscinasExteriores") === "true",
      piscinasInteriores: getXmlTag(record, "PiscinasInteriores") === "true",
      ginasio: getXmlTag(record, "Ginasio") === "true",
      contribuinteEntidadeExploradora: getXmlTag(record, "ContribuinteEntidadeExploradora"),
      entidadeExploradora: getXmlTag(record, "EntidadeExploradora")
    }));
  };

  const fetchRnetByConcelho = async (concelho: string) => {
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <list_RNET xmlns="http://www.outsystems.com">
      <Concelho>${concelho}</Concelho>
    </list_RNET>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch("https://webservices.turismodeportugal.pt/RNT_External/WS_RNT.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": '"http://RNT_External/WS_RNT/list_RNET"'
      },
      body: soapBody
    });

    if (!response.ok) {
      throw new Error(`RNET search failed (${response.status})`);
    }

    return parseRnetRecords(await response.text());
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const normalizeSearchTerm = (value: string) => {
    const normalized = (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (normalized.startsWith("hot") || normalized.includes("hotel") || normalized.includes("hoteis") || normalized.includes("alojamento") || normalized.includes("hosped")) {
      return "hotel";
    }

    if (normalized.includes("restaurante")) return "restaurant";
    if (normalized.includes("clinica")) return "clinic";
    if (normalized.includes("loja")) return "shop";
    if (normalized.includes("cafe") || normalized.includes("cafetaria")) return "cafe";

    return value || "business";
  };

  const splitLocations = (location: string, aiContext: string, campaignName: string) => {
    const source = location || aiContext || campaignName || "Portugal";
    const parts = source
      .split(/[,;|/]+|\s+ e \s+/i)
      .map(part => part.trim())
      .filter(Boolean);

    return (parts.length ? parts : ["Portugal"]).slice(0, 5);
  };

  const expandRnetLocations = (locations: string[]) => {
    const algarveConcelhos = [
      "Faro",
      "Albufeira",
      "Portimão",
      "Lagos",
      "Loulé",
      "Tavira",
      "Lagoa",
      "Silves",
      "Vila Real de Santo António",
      "Olhão"
    ];

    return locations.flatMap(place => {
      const normalized = place
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      if (normalized === "algarve" || normalized.includes("algarve")) {
        return algarveConcelhos;
      }

      return [place];
    });
  };

  const normalizeForMatch = (value: string) => {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  };

  const COUNTRY_CONFIG: Record<string, { name: string; osmCode: string; useRnet: boolean }> = {
    PT: { name: "Portugal", osmCode: "pt", useRnet: true },
    AO: { name: "Angola", osmCode: "ao", useRnet: false },
    BR: { name: "Brasil", osmCode: "br", useRnet: false }
  };

  const CADASTUR_MEIOS_HOSPEDAGEM_URL =
    "https://dados.turismo.gov.br/dataset/d2333d1b-db1e-438b-955a-028db80a031e/resource/938cb620-7252-4cd0-9def-443dd2fe3f3b/download/meio-de-hospedagem-1-trimestre-2026.xlsx";
  let cadasturCache: { loadedAt: number; rows: any[] } | null = null;

  const getCountryConfig = (country: string) => {
    return COUNTRY_CONFIG[String(country || "PT").toUpperCase()] || COUNTRY_CONFIG.PT;
  };

  const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");

  const getCadasturRows = async () => {
    const oneDay = 24 * 60 * 60 * 1000;
    if (cadasturCache && Date.now() - cadasturCache.loadedAt < oneDay) {
      return cadasturCache.rows;
    }

    const response = await fetch(CADASTUR_MEIOS_HOSPEDAGEM_URL);
    if (!response.ok) {
      throw new Error(`CADASTUR download failed (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false }) as any[];
    cadasturCache = { loadedAt: Date.now(), rows };
    return rows;
  };

  const searchCadasturLeads = async (location: string, niche: string, aiContext: string, campaignName: string) => {
    const searchTerm = normalizeSearchTerm(niche || aiContext || campaignName);
    if (searchTerm !== "hotel") return [];

    const locations = splitLocations(location, aiContext, campaignName).map(normalizeForMatch);
    const rows = await getCadasturRows();
    const seen = new Set<string>();
    const leads: any[] = [];

    for (const row of rows) {
      const municipio = String(row["Município"] || "");
      const uf = String(row["UF"] || "");
      const searchableLocation = normalizeForMatch(`${municipio} ${uf}`);
      const matchesLocation = locations.length === 0 || locations.some(place => searchableLocation.includes(place) || place.includes(searchableLocation));
      if (!matchesLocation) continue;

      const cnpj = onlyDigits(row["Número de Inscrição do CNPJ"] || row["Número do Certificado"]);
      const companyName = row["Nome Fantasia"] || row["Nome da Pessoa Jurídica"];
      if (!companyName || !cnpj || seen.has(cnpj)) continue;
      seen.add(cnpj);

      const phone = row["Telefone Comercial"] || row["Telefone Institucional"] || undefined;
      const email = row["E-mail Comercial"] || row["E-mail Institucional"] || row["E-mail do usuário administrador"] || undefined;
      const website = row["Website"] || undefined;
      const address = row["Endereço Completo Comercial"] || row["Endereço Completo Receita Federal"] || `${municipio}, ${uf}, Brasil`;
      const rooms = Number(row["Unidade Habitacionais"] || 0);
      const beds = Number(row["Leitos"] || 0);
      const accommodationType = row["Tipo de Hospedagem"] || row["Atividade Turística"] || "Meio de Hospedagem";

      leads.push({
        companyName,
        legalName: row["Nome da Pessoa Jurídica"] || undefined,
        location: address,
        niche: niche || accommodationType,
        website,
        email,
        phone,
        allPhones: phone ? [phone] : [],
        socials: [],
        country: "BR",
        dataSource: "CADASTUR",
        cnpj,
        explorerTaxId: cnpj,
        cadasturCertificate: row["Número do Certificado"] || undefined,
        cadasturStatus: row["Situação Cadastral"] || undefined,
        cadasturActivityStatus: row["Situação da Atividade"] || undefined,
        responsibleName: row["Nome do Responsável"] || undefined,
        businessActivity: accommodationType,
        cnae: row["CNAE(S) relacionados à atividade"] || undefined,
        companySize: row["Porte"] || undefined,
        openingDate: row["Data de Abertura"] || undefined,
        rooms,
        beds,
        hasEmployees: row["Possui Empregado?"] || undefined,
        servicesOffered: [
          accommodationType,
          rooms ? `${rooms} unidades habitacionais` : "",
          beds ? `${beds} leitos` : "",
          row["Idiomas"] && row["Idiomas"] !== "-" ? `Idiomas: ${row["Idiomas"]}` : ""
        ].filter(Boolean),
        potentialReasoning: `Fonte oficial CADASTUR: ${accommodationType}, CNPJ ${cnpj}, ${rooms || 0} unidades habitacionais e ${beds || 0} leitos.`
      });

      if (leads.length >= 50) break;
    }

    return leads;
  };

  const enrichLeadWithBrasilApi = async (leadData: any) => {
    const cnpj = onlyDigits(leadData.cnpj || leadData.explorerTaxId || "");
    if (!cnpj || cnpj.length !== 14 || leadData.brasilApiEnriched) return leadData;

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) return leadData;

      const data = await response.json();
      const qsa = Array.isArray(data.qsa) ? data.qsa : [];
      const administrators = qsa
        .map((partner: any) => partner.nome_socio || partner.nome || "")
        .filter(Boolean)
        .slice(0, 3);

      return {
        ...leadData,
        legalName: leadData.legalName || data.razao_social,
        companySize: leadData.companySize || data.porte,
        openingDate: leadData.openingDate || data.data_inicio_atividade,
        cnae: leadData.cnae || data.cnae_fiscal_descricao || data.cnae_fiscal,
        responsibleName: leadData.responsibleName || administrators[0],
        qsaAdministrators: administrators,
        brasilApiEnriched: true
      };
    } catch (error) {
      console.warn(`BrasilAPI enrichment failed for ${cnpj}:`, error);
      return leadData;
    }
  };

  const toRnetLead = (record: any, niche: string) => {
    const addressParts = [record.endereco, record.codPostal, record.localidade, record.concelho, record.distrito]
      .filter(Boolean);
    const phone = record.telefone || undefined;
    const serviceFlags = [
      record.nrRestaurantes > 0 ? `${record.nrRestaurantes} restaurante(s)` : "",
      record.salasReuniao ? `salas de reunião${record.capacidadeSalasReuniao ? ` (${record.capacidadeSalasReuniao} pax)` : ""}` : "",
      record.spa ? "SPA" : "",
      record.piscinasExteriores ? "piscina exterior" : "",
      record.piscinasInteriores ? "piscina interior" : "",
      record.ginasio ? "ginásio" : ""
    ].filter(Boolean);

    return {
      companyName: record.nome,
      location: addressParts.join(", ") || record.concelho || "Portugal",
      niche: niche || record.tipologia || "Hotelaria",
      email: record.email || undefined,
      phone,
      allPhones: phone ? [phone] : [],
      socials: [],
      country: "PT",
      dataSource: "RNET",
      rnetNumber: record.nrRegisto,
      rnetType: record.tipologia,
      category: record.categoria,
      classificationStatus: record.estadoClassificacao,
      capacity: record.capacidade,
      rooms: record.nrUnidadesAlojamento,
      explorerName: record.entidadeExploradora,
      explorerTaxId: record.contribuinteEntidadeExploradora,
      servicesOffered: serviceFlags,
      potentialReasoning: `Fonte oficial RNET: ${record.tipologia || "empreendimento turístico"} ${record.categoria || ""}, ${record.capacidade || 0} camas/capacidade e ${record.nrUnidadesAlojamento || 0} unidades de alojamento.`
    };
  };

  const searchRnetLeads = async (location: string, niche: string, aiContext: string, campaignName: string) => {
    const searchTerm = normalizeSearchTerm(niche || aiContext || campaignName);
    if (searchTerm !== "hotel") return [];

    const locations = expandRnetLocations(splitLocations(location, aiContext, campaignName));
    const seen = new Set<string>();
    const leads: any[] = [];

    for (const place of locations) {
      const records = await fetchRnetByConcelho(place);
      for (const record of records) {
        if (!record.nome) continue;
        const key = `${record.nrRegisto || record.nome}|${record.concelho}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        leads.push(toRnetLead(record, niche));
      }
      if (leads.length >= 50) break;
      if (locations.length > 1) await sleep(500);
    }

    return leads;
  };

  const enrichLeadWithRnet = async (leadData: any) => {
    if (leadData.explorerTaxId || leadData.rnetNumber) return leadData;
    if (leadData.country && String(leadData.country).toUpperCase() !== "PT") return leadData;

    const candidateLocations = expandRnetLocations(splitLocations(leadData.location || "", "", leadData.companyName || ""));
    const leadName = normalizeForMatch(leadData.companyName || "");
    if (!leadName) return leadData;

    for (const place of candidateLocations) {
      try {
        const records = await fetchRnetByConcelho(place);
        const match = records.find(record => {
          const rnetName = normalizeForMatch(record.nome || "");
          return rnetName === leadName || rnetName.includes(leadName) || leadName.includes(rnetName);
        });

        if (match) {
          return {
            ...leadData,
            ...toRnetLead(match, leadData.niche || "Hotelaria"),
            website: leadData.website,
            socials: leadData.socials || [],
            dataSource: leadData.dataSource ? `${leadData.dataSource}+RNET` : "RNET"
          };
        }
      } catch (error) {
        console.warn(`RNET enrichment failed for ${place}:`, error);
      }
    }

    return leadData;
  };

  const searchOpenStreetMapLeads = async (country: string, location: string, niche: string, aiContext: string, campaignName: string) => {
    const countryConfig = getCountryConfig(country);
    const searchTerm = normalizeSearchTerm(niche || aiContext || campaignName);
    const locations = splitLocations(location, aiContext, campaignName);
    const seen = new Set<string>();
    const leads: any[] = [];

    for (const place of locations) {
      const params = new URLSearchParams({
        q: `${searchTerm} in ${place} ${countryConfig.name}`,
        format: "jsonv2",
        addressdetails: "1",
        extratags: "1",
        namedetails: "1",
        limit: "20",
        countrycodes: countryConfig.osmCode
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          "User-Agent": "LeadScopeAI/1.0 local development contact=local"
        }
      });

      if (!response.ok) {
        throw new Error(`OpenStreetMap search failed (${response.status})`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) continue;

      for (const item of data) {
        const name = item.namedetails?.name || item.name || item.display_name?.split(",")[0];
        const address = item.display_name || location || countryConfig.name;
        const key = `${name}|${address}`.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);

        const website = getPrimaryUrl(item);
        const phone = getPrimaryPhone(item);

        leads.push({
          companyName: name,
          website,
          phone,
          location: address,
          niche: niche || "Hotelaria",
          socials: [],
          allPhones: phone ? [phone] : [],
          country: String(country || "PT").toUpperCase(),
          dataSource: "OpenStreetMap"
        });
      }

      if (leads.length >= 30) break;
      if (locations.length > 1) await sleep(1100);
    }

    return leads;
  };

  const buildBasicLead = (leadData: any) => {
    const id = crypto.randomUUID();
    const phone = leadData.phone || leadData.allPhones?.[0];

    return {
      id,
      companyName: leadData.companyName || "Unknown",
      location: leadData.location || "Portugal",
      niche: leadData.niche || "Hotelaria",
      website: leadData.website,
      email: leadData.email,
      phone,
      allPhones: phone ? [phone] : [],
      socials: leadData.socials || [],
      socialSummary: "Pesquisa gratuita: dados recolhidos por fontes abertas. Configure GEMINI_API_KEY para análise avançada de redes sociais, avaliações e proposta com IA.",
      nif: leadData.explorerTaxId || leadData.cnpj || "N/A",
      cae: leadData.cnae || "N/A",
      businessActivity: leadData.businessActivity || leadData.rnetType || leadData.niche || "Hotelaria",
      employees: leadData.capacity
        ? `Capacidade oficial: ${leadData.capacity}; unidades/quartos: ${leadData.rooms || "N/A"}`
        : (leadData.beds || leadData.rooms ? `Leitos: ${leadData.beds || "N/A"}; unidades habitacionais: ${leadData.rooms || "N/A"}` : undefined),
      mapsRating: 0,
      mapsReviews: 0,
      businessHours: [],
      servicesOffered: leadData.servicesOffered?.length ? leadData.servicesOffered : [leadData.niche || "Hotelaria"],
      reviewsList: [],
      hasWebsite: Boolean(leadData.website),
      isProfessionalEmail: false,
      websiteScore: leadData.website ? 55 : 20,
      status: "completed",
      potential: "Medium",
      potentialReasoning: leadData.potentialReasoning || "Lead encontrado por pesquisa gratuita em fonte aberta. A classificação detalhada requer IA configurada.",
      contactPerson: leadData.responsibleName || "Diretor de Operações / Governanta-Geral",
      contactNotes: leadData.explorerName
        ? `Entidade exploradora oficial: ${leadData.explorerName}${leadData.explorerTaxId ? ` (NIF ${leadData.explorerTaxId})` : ""}. Validar contacto antes da abordagem comercial.`
        : (leadData.cnpj
          ? `CADASTUR: ${leadData.legalName || leadData.companyName} (CNPJ ${leadData.cnpj}). ${leadData.responsibleName ? `Responsável: ${leadData.responsibleName}. ` : ""}${leadData.qsaAdministrators?.length ? `QSA/administradores: ${leadData.qsaAdministrators.join(", ")}. ` : ""}Validar contacto antes da abordagem comercial.`
          : "Validar contacto por telefone ou website antes da abordagem comercial."),
      callbackStatus: "pending",
      storefront: {
        analyzed: false,
        signageCondition: "Unknown",
        visualAppeal: "Medium",
        needsLedUpgrade: false,
        description: "Análise visual não executada no modo gratuito.",
        address: leadData.location || "Portugal"
      },
      diagnosis: leadData.rnetNumber
        ? `Lead importado do RNET (${leadData.rnetNumber}). ${leadData.category ? `Categoria: ${leadData.category}. ` : ""}${leadData.capacity ? `Capacidade oficial: ${leadData.capacity}. ` : ""}${leadData.rooms ? `Unidades/quartos: ${leadData.rooms}. ` : ""}Configure GEMINI_API_KEY para diagnóstico automático de housekeeping, reviews e proposta personalizada.`
        : (leadData.cnpj
          ? `Lead importado do CADASTUR (${leadData.cadasturCertificate || leadData.cnpj}). CNPJ: ${leadData.cnpj}. ${leadData.companySize ? `Porte: ${leadData.companySize}. ` : ""}${leadData.rooms ? `Unidades habitacionais: ${leadData.rooms}. ` : ""}${leadData.beds ? `Leitos: ${leadData.beds}. ` : ""}Configure GEMINI_API_KEY para diagnóstico automático de housekeeping, reviews e proposta personalizada.`
          : "Lead importado em modo gratuito. Configure GEMINI_API_KEY para diagnóstico automático de housekeeping, reviews e proposta personalizada."),
      proposal: {
        siteStructure: ["Aplicação Móvel das Empregadas", "Painel da Governanta", "Ecrã de Status da Receção"],
        brandingSuggestion: "Digitalização de Housekeeping",
        techStack: "React Native + Web Panel Dashboard",
        problems: ["Coordenação manual entre receção e equipa de limpeza", "Baixa visibilidade do estado dos quartos", "Processos em papel difíceis de auditar"],
        solutionFeatures: ["Status de quartos em tempo real", "Checklists digitais", "Relatórios com foto para danos e achados"],
        expectedBenefits: ["Menos atrasos no check-in", "Maior controlo operacional", "Melhor rastreabilidade de limpeza"],
        estimatedValue: "149 EUR / mês"
      },
      emailSequence: [],
      aiChatHistory: [],
      generatedSiteCode: null
    };
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

  app.get('/api/rnet/search', async (req, res) => {
    try {
      const location = String(req.query.location || req.query.concelho || "");
      const niche = String(req.query.niche || "Hotéis");
      const campaignName = String(req.query.campaignName || "");
      const aiContext = String(req.query.aiContext || "");
      const leads = await searchRnetLeads(location, niche, aiContext, campaignName);

      res.json({
        source: "RNET - Turismo de Portugal",
        count: leads.length,
        leads
      });
    } catch (error: any) {
      console.error("RNET search error:", error);
      res.status(500).json({ error: error.message || "Error searching RNET" });
    }
  });

  app.get('/api/cadastur/search', async (req, res) => {
    try {
      const location = String(req.query.location || req.query.municipio || "");
      const niche = String(req.query.niche || "Hotéis");
      const campaignName = String(req.query.campaignName || "");
      const aiContext = String(req.query.aiContext || "");
      const leads = await searchCadasturLeads(location, niche, aiContext, campaignName);

      res.json({
        source: "CADASTUR - Ministério do Turismo do Brasil",
        count: leads.length,
        leads
      });
    } catch (error: any) {
      console.error("CADASTUR search error:", error);
      res.status(500).json({ error: error.message || "Error searching CADASTUR" });
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
          model: GEMINI_MODEL,
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

  app.use('/api/gemini', (req, res, next) => {
    const canRunWithoutGemini = req.path === "/searchLeads" || req.path === "/analyzeAndProposal" || req.path === "/generateProposal";
    if (!process.env.GEMINI_API_KEY && !canRunWithoutGemini) {
      return res.status(503).json({
        error: "GEMINI_API_KEY não está configurada. Crie um arquivo .env.local com GEMINI_API_KEY=sua_chave ou defina a variável de ambiente antes de iniciar o servidor."
      });
    }

    next();
  });

  // Route: searchLeads
  app.post('/api/gemini/searchLeads', async (req, res) => {
    try {
      const { country, location, niche, aiContext, campaignName, excludeNames } = req.body;

      // Nomes ja conhecidos/mostrados/descartados: nunca devem voltar
      const excludedSet = new Set(
        (Array.isArray(excludeNames) ? excludeNames : [])
          .map((n: any) => String(n || "").trim().toLowerCase())
          .filter((n: string) => n.length > 0)
      );
      const dropExcluded = (arr: any[]) =>
        arr.filter((l) => !excludedSet.has(String(l?.companyName || "").trim().toLowerCase()));

      if (!process.env.GEMINI_API_KEY || process.env.LEAD_SEARCH_PROVIDER === "osm") {
        const countryConfig = getCountryConfig(country);
        if (countryConfig.useRnet) {
          const rnetLeads = dropExcluded(await searchRnetLeads(location, niche, aiContext, campaignName));
          if (rnetLeads.length > 0) {
            return res.json(rnetLeads);
          }
        }

        if (String(country || "").toUpperCase() === "BR") {
          const cadasturLeads = dropExcluded(await searchCadasturLeads(location, niche, aiContext, campaignName));
          if (cadasturLeads.length > 0) {
            return res.json(cadasturLeads);
          }
        }

        const osmLeads = dropExcluded(await searchOpenStreetMapLeads(country, location, niche, aiContext, campaignName));
        return res.json(osmLeads);
      }

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

      // Lista de exclusao: empresas ja conhecidas que NAO devem voltar
      const excludeList = Array.from(excludedSet) as string[];
      const exclusionClause = excludeList.length > 0
        ? `\n        ALREADY KNOWN (DO NOT RETURN THESE - find DIFFERENT, NEW businesses):\n        ${excludeList.slice(0, 200).map((n) => `- ${n}`).join("\n        ")}\n`
        : "";

      const prompt = `
        ROLE: Strict B2B Lead Investigator.
        GOAL: Find REAL, EXISTING businesses matching the search intent.

        SEARCH INTENT: ${searchIntent}
        ${extraContext}
        ${exclusionClause}
        RULES:
        1. Use the 'googleSearch' tool to verify existence. Do NOT invent companies.
        2. If you find a company, ensure it has a real Name and Address.
        3. Focus on Small & Medium Enterprises (PME) in Portugal.
        4. IGNORE huge global corporations (McDonalds, Zara, IKEA).
        5. IGNORE marketplaces (OLX, CustoJusto) or directories (Páginas Amarelas) as "companies".
        6. NEVER return any business listed under "ALREADY KNOWN". Return only NEW, different establishments.

        OUTPUT FORMAT:
        Return a STRICT JSON ARRAY of objects.
        [
          { "companyName": "Exact Business Name", "address": "City/Street", "website": "url or null" }
        ]
        
        If no real businesses are found, return an empty array [].
      `;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
                 !name.toLowerCase().includes("exemplo") &&
                 !excludedSet.has(name.trim().toLowerCase());
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

  // Route: criar/atualizar conta de login de um vendedor via Supabase Auth (service role)
  app.post('/api/sellers/account', async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e password sao obrigatorios.' });
      }

      const admin = getSupabaseAdmin();
      if (!admin) {
        return res.status(500).json({ error: 'SUPABASE_ROLE_KEY nao configurada no servidor.' });
      }

      const lowerEmail = String(email).trim().toLowerCase();
      let authUserId: string | null = null;

      // 1) Cria o utilizador no Supabase Auth (email ja confirmado) ou atualiza a password se existir
      const created = await admin.auth.admin.createUser({
        email: lowerEmail,
        password,
        email_confirm: true,
        user_metadata: { name }
      });

      if (created.error) {
        const msg = (created.error.message || '').toLowerCase();
        const alreadyExists = msg.includes('already') || msg.includes('registered') || msg.includes('exist');
        if (!alreadyExists) {
          return res.status(500).json({ error: created.error.message });
        }
        const list = await admin.auth.admin.listUsers();
        const found = list.data?.users?.find((u: any) => (u.email || '').toLowerCase() === lowerEmail);
        if (!found) {
          return res.status(500).json({ error: 'Conta ja existe mas nao foi possivel localiza-la para atualizar.' });
        }
        authUserId = found.id;
        await admin.auth.admin.updateUserById(found.id, { password, user_metadata: { name } });
      } else {
        authUserId = created.data.user?.id || null;
      }

      if (!authUserId) {
        return res.status(500).json({ error: 'Nao foi possivel obter o id do utilizador.' });
      }

      // 2) Garante o perfil em app_users com papel 'user' (evita a promocao automatica a admin no login)
      const { data: existingProfile } = await admin.from('app_users').select('id').eq('email', lowerEmail).maybeSingle();
      if (existingProfile?.id) {
        await admin.from('app_users').update({ name, status: 'active' }).eq('id', existingProfile.id);
        return res.json({ userId: existingProfile.id });
      }

      const { error: insErr } = await admin.from('app_users').insert([{
        id: authUserId, name, email: lowerEmail, password: 'supabase_auth', role: 'user', plan: 'Pro', credits: 150, status: 'active'
      }]);
      if (insErr) {
        return res.status(500).json({ error: insErr.message });
      }
      return res.json({ userId: authUserId });
    } catch (error: any) {
      console.error('Seller account error:', error);
      res.status(500).json({ error: error.message || 'Erro ao criar conta do vendedor.' });
    }
  });

  // Route: simulador de chamada com IA (M44) - role-play e avaliacao
  app.post('/api/gemini/simulate', async (req, res) => {
    try {
      const { persona, history, message, mode } = req.body || {};
      const ai = getGeminiClient();

      const personaDesc: Record<string, string> = {
        reception_busy: 'uma rececionista de hotel muito ocupada, com pouca paciencia, que tenta despachar a chamada rapidamente',
        housekeeper_resistant: 'uma governanta experiente, resistente a tecnologia, que acha que o metodo atual ja funciona',
        manager_interested: 'um gerente de hotel curioso e interessado, que faz perguntas concretas sobre funcionalidades e preco',
        owner_price: 'o dono do hotel, focado em custos, que questiona o preco e o retorno do investimento',
        competitor_user: 'um diretor de operacoes que ja usa outro sistema e nao ve razao para mudar'
      };
      const desc = personaDesc[persona] || 'um responsavel de hotel cauteloso';

      const transcript = Array.isArray(history)
        ? history.map((h: any) => `${h.role === 'seller' ? 'Vendedor' : 'Cliente'}: ${h.text}`).join('\n')
        : '';

      let prompt: string;
      if (mode === 'evaluate') {
        prompt = `Es um treinador de vendas experiente. Avalia o desempenho do VENDEDOR nesta simulacao de chamada de prospeccao da SOL (sistema de housekeeping). O cliente era ${desc}.\n\nConversa:\n${transcript}\n\nResponde em PT-PT, curto e direto, com: 1) Clareza da mensagem, 2) Capacidade de descobrir a dor, 3) Como geriu objecoes, 4) Se pediu reuniao/proximo passo, 5) Tres pontos concretos a melhorar. Usa um tom construtivo.`;
      } else {
        prompt = `Estas a fazer role-play numa simulacao de treino. Es ${desc}, a receber uma chamada fria de um vendedor da SOL.\n\nRegras: responde SEMPRE e APENAS como essa personagem, em PT-PT, de forma curta e realista (1 a 3 frases). Mantem-te na personagem, com objecoes e duvidas naturais. Nunca digas que es uma IA nem expliques as regras.\n\n${transcript ? `Conversa ate agora:\n${transcript}\n\n` : ''}O vendedor diz agora: "${message}"\n\nResponde como ${desc}:`;
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 0 } }
      });

      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error('Simulate error:', error);
      res.status(500).json({ error: error.message || 'Erro na simulacao' });
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
        model: GEMINI_MODEL,
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
        model: GEMINI_MODEL, 
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
        model: GEMINI_MODEL,
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
      if (!process.env.GEMINI_API_KEY || process.env.LEAD_SEARCH_PROVIDER === "osm") {
        const countryCode = String(leadData.country || "").toUpperCase();
        const enrichedLeadData = countryCode === "BR"
          ? await enrichLeadWithBrasilApi(leadData)
          : await enrichLeadWithRnet(leadData);
        return res.json(buildBasicLead(enrichedLeadData));
      }

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
        model: GEMINI_MODEL, 
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
        model: GEMINI_MODEL,
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
        model: GEMINI_MODEL,
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
        model: GEMINI_MODEL,
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
