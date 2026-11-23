import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dns from "dns";
import net from "net";
import { GoogleGenAI } from "@google/genai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { getSegment, findSegmentByText, isHotelSegment } from "./services/segments";
import { WORKIO_PRODUCT_SUMMARY } from "./services/workioModules";
import {
  createSellerFolders,
  listFilesInFolder,
  readDriveFile,
  saveFileToDrive,
  isDriveConfigured,
  listSubfoldersInFolder,
  createDriveFolder,
} from "./services/googleDriveService.js";

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

export function buildApp() {
  const app = express();
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

  // Groq client — pura geração de texto via fetch nativo, sem pacote extra
  const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const callGroq = async (
    messages: Array<{ role: string; content: string }>,
    temperature = 0.7
  ): Promise<string> => {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error("GROQ_API_KEY não definida no .env.local");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature }),
    });
    const json = await res.json() as any;
    if (!res.ok) throw new Error(`Groq ${res.status}: ${json.error?.message || "Erro desconhecido"}`);
    return (json.choices?.[0]?.message?.content as string) ?? "";
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

    // Segmentos Workio (ginasios, oficinas, limpezas, ...)
    const segment = findSegmentByText(value);
    if (segment) return segment.osmTerm;

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
    const segment = getSegment(leadData.segmentId) || findSegmentByText(leadData.niche);
    const hotel = !segment || isHotelSegment(segment.id);

    const base = {
      id,
      companyName: leadData.companyName || "Unknown",
      location: leadData.location || "Portugal",
      niche: !hotel && segment ? segment.label : (leadData.niche || "Hotelaria"),
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
      contactPerson: leadData.responsibleName || undefined,
      contactNotes: "Decisor provável (cargo): Diretor de Operações / Governanta-Geral. " + (leadData.explorerName
        ? `Entidade exploradora oficial: ${leadData.explorerName}${leadData.explorerTaxId ? ` (NIF ${leadData.explorerTaxId})` : ""}. Validar contacto antes da abordagem comercial.`
        : (leadData.cnpj
          ? `CADASTUR: ${leadData.legalName || leadData.companyName} (CNPJ ${leadData.cnpj}). ${leadData.responsibleName ? `Responsável: ${leadData.responsibleName}. ` : ""}${leadData.qsaAdministrators?.length ? `QSA/administradores: ${leadData.qsaAdministrators.join(", ")}. ` : ""}Validar contacto antes da abordagem comercial.`
          : "Validar contacto por telefone ou website antes da abordagem comercial.")),
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

    if (hotel || !segment) return base;

    // Outros segmentos: troca os textos especificos de hotelaria
    return {
      ...base,
      businessActivity: leadData.businessActivity || segment.label,
      servicesOffered: leadData.servicesOffered?.length ? leadData.servicesOffered : [segment.label],
      contactPerson: leadData.responsibleName || undefined,
      contactNotes: String(base.contactNotes).replace("Diretor de Operações / Governanta-Geral", segment.contactRole),
      diagnosis: `Lead importado em modo gratuito (${segment.label}). Configure GEMINI_API_KEY para diagnóstico automático, reviews e proposta personalizada.`,
      proposal: {
        siteStructure: ["App do colaborador (ponto, férias, recibos)", "Painel de RH e chefias", "Relatórios automáticos"],
        brandingSuggestion: `Workio para ${segment.label}`,
        techStack: "Web + App Mobile",
        problems: segment.painPoints,
        solutionFeatures: ["Controlo de ponto no telemóvel (QR, rosto ou digital)", "Escalas gráficas e banco de horas automático", "Férias, ausências e relatórios sem folhas de cálculo"],
        expectedBenefits: ["Menos tempo de RH em tarefas manuais", "Faltas e atrasos visíveis no próprio dia", "Dados prontos para o processamento salarial"],
        estimatedValue: "Desde 3,90 € por colaborador / mês"
      }
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

  // ─── Brevo — envio de email comercial ────────────────────────────────────
  function escHtml(str: string | null | undefined): string {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  }

  async function sendViaBrevo(payload: {
    sender: { name: string; email: string };
    to: { email: string; name?: string }[];
    bcc?: { email: string; name?: string }[];
    replyTo?: { email: string; name?: string };
    subject: string;
    htmlContent: string;
  }): Promise<string> {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) throw new Error("BREVO_API_KEY não definida no .env.local");

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as { messageId?: string; message?: string };
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${json.message ?? JSON.stringify(json)}`);
    return json.messageId ?? "sem-id";
  }

  app.post('/api/email/send', async (req, res) => {
    const { to, toName, subject, body, leadId, sellerId, hotelName } = req.body || {};

    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Campos obrigatórios: to, subject, body" });
    }

    const fromName = process.env.BREVO_FROM_NAME?.trim() || "LeadScope · Ecletika";
    const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
    if (!fromEmail) return res.status(500).json({ error: "BREVO_FROM_EMAIL não configurado" });

    const bodyHtml = escHtml(body).replace(/\n/g, "<br>");

    // Copia para o vendedor (BCC) + endereco de copia configuravel; reply-to para o vendedor.
    const bccList: { email: string; name?: string }[] = [];
    let replyTo: { email: string; name?: string } | undefined;
    const adminForCopy = getSupabaseAdmin();
    if (sellerId && adminForCopy) {
      try {
        const { data: sellerRow } = await adminForCopy.from('app_users').select('email, name').eq('id', sellerId).maybeSingle();
        if (sellerRow?.email) {
          bccList.push({ email: sellerRow.email, name: sellerRow.name || undefined });
          replyTo = { email: sellerRow.email, name: sellerRow.name || undefined };
        }
      } catch { /* ignora */ }
    }
    // Endereco de copia: EMAIL_COPY_TO se definido, senao o proprio remetente comercial.
    const copyTo = process.env.EMAIL_COPY_TO?.trim() || fromEmail;
    if (copyTo) bccList.push({ email: copyTo });
    const seenBcc = new Set([String(to).toLowerCase()]);
    const bcc = bccList.filter((b) => b.email && !seenBcc.has(b.email.toLowerCase()) && (seenBcc.add(b.email.toLowerCase()), true));

    try {
      const messageId = await sendViaBrevo({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to, name: toName || to }],
        ...(bcc.length ? { bcc } : {}),
        ...(replyTo ? { replyTo } : {}),
        subject,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fbff;">
            <div style="background:linear-gradient(135deg,#10b981,#047857);padding:28px 32px;">
              <p style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.28em;margin:0 0 6px;">SOL · Plataforma de Operações Hoteleiras</p>
              <h1 style="color:#fff;font-size:18px;font-weight:800;margin:0;">${escHtml(hotelName || "")}</h1>
            </div>
            <div style="background:#fff;padding:32px;font-size:15px;color:#1a1a2e;line-height:1.7;">
              ${bodyHtml}
            </div>
            <div style="padding:16px 32px;text-align:center;color:#a0aab8;font-size:11px;border-top:1px solid #f0f3f8;">
              LeadScope · Ecletika — ecletikaportugal@gmail.com
            </div>
          </div>
        `,
      });

      // Log automático na tabela crm_activities
      if (leadId) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          await supabase.from("crm_activities").insert({
            lead_id: leadId,
            seller_id: sellerId || null,
            activity_type: "email",
            outcome: "sent",
            notes: `Email enviado via Brevo: "${subject}"`,
            next_action_type: null,
            next_action_at: null,
          });
        }
      }

      // Guardar cópia no Google Drive (pasta Enviados do vendedor)
      if (isDriveConfigured() && sellerId) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            const { data: seller } = await supabase
              .from('app_users')
              .select('name, drive_sent_id')
              .eq('id', sellerId)
              .maybeSingle();

            let sentFolderId: string | null = seller?.drive_sent_id ?? null;

            // Auto-setup: create Drive folders if this seller has none yet
            if (!sentFolderId) {
              const rawName: string = (seller as { name?: string } | null)?.name ?? sellerId;
              const prefix = rawName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .replace(/\s+/g, '.')
                .replace(/[^a-z0-9.]/g, '')
                .slice(0, 40) || 'vendedor';
              const folders = await createSellerFolders(prefix);
              await supabase.from('app_users').update({
                drive_folder_id: folders.rootId,
                drive_inbox_id: folders.inboxId,
                drive_sent_id: folders.sentId,
              }).eq('id', sellerId);
              sentFolderId = folders.sentId;
              console.log(`[Drive] ✅ Pastas criadas automaticamente para ${sellerId}`);
            }

            if (sentFolderId) {
              const ts = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `${ts}_${(to.split('@')[0] || 'destinatario').slice(0, 30)}.json`;
              await saveFileToDrive(sentFolderId, filename, {
                type: 'sent', from: fromEmail, to, subject,
                body, sentAt: new Date().toISOString(),
                leadId: leadId || null, hotelName: hotelName || null,
                brevoMessageId: messageId, read: true,
              });
              console.log(`[Drive] ✅ Cópia guardada em Enviados (${sentFolderId})`);
            }
          }
        } catch (driveErr: any) {
          console.warn('[Drive] Não foi possível guardar cópia enviada:', driveErr.message);
        }
      }

      console.log(`[Brevo] ✅ Email enviado para ${to} | messageId: ${messageId}`);
      res.json({ success: true, messageId });
    } catch (err: any) {
      console.error("[Brevo] Erro:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Email Drive setup (auto-creates folders for sellers without them) ────────

  app.post('/api/emails/setup-drive', async (req, res) => {
    const { sellerId } = req.body as { sellerId?: string };
    if (!sellerId) return res.status(400).json({ error: 'sellerId obrigatório' });
    if (!isDriveConfigured()) return res.json({ skipped: true, reason: 'Drive não configurado' });

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return res.json({ skipped: true, reason: 'Supabase não configurado' });

      const { data: user } = await supabase
        .from('app_users')
        .select('name, drive_folder_id, drive_inbox_id, drive_sent_id')
        .eq('id', sellerId)
        .maybeSingle();

      // Already set up — nothing to do
      if (user?.drive_folder_id && user?.drive_inbox_id && user?.drive_sent_id) {
        return res.json({ ok: true, alreadySetup: true });
      }

      const rawName: string = (user as { name?: string } | null)?.name ?? sellerId;
      const prefix = rawName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')
        .slice(0, 40) || 'vendedor';

      const folders = await createSellerFolders(prefix);
      await supabase.from('app_users').update({
        drive_folder_id: folders.rootId,
        drive_inbox_id: folders.inboxId,
        drive_sent_id: folders.sentId,
      }).eq('id', sellerId);

      console.log(`[Drive] ✅ Pastas criadas para ${rawName} (${sellerId}): ${JSON.stringify(folders)}`);
      res.json({ ok: true, folders });
    } catch (err: any) {
      console.error('[Drive] setup-drive error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Email Drive endpoints ──────────────────────────────────────────────────

  app.get('/api/emails/inbox', async (req, res) => {
    const { sellerId } = req.query as { sellerId?: string };
    if (!sellerId) return res.status(400).json({ error: 'sellerId obrigatório' });
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return res.json([]);
      const { data: seller } = await supabase
        .from('app_users').select('drive_inbox_id').eq('id', sellerId).maybeSingle();
      if (!seller?.drive_inbox_id) return res.json([]);
      const files = await listFilesInFolder(seller.drive_inbox_id);
      res.json(files);
    } catch { res.json([]); }
  });

  app.get('/api/emails/sent', async (req, res) => {
    const { sellerId } = req.query as { sellerId?: string };
    if (!sellerId) return res.status(400).json({ error: 'sellerId obrigatório' });
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return res.json([]);
      const { data: seller } = await supabase
        .from('app_users').select('drive_sent_id').eq('id', sellerId).maybeSingle();
      if (!seller?.drive_sent_id) return res.json([]);
      const files = await listFilesInFolder(seller.drive_sent_id);
      res.json(files);
    } catch { res.json([]); }
  });

  // specific routes BEFORE parameterised :fileId — Express matches in order

  // list custom subfolders for a seller (excludes Inbox / Enviados)
  app.get('/api/emails/folders', async (req, res) => {
    const { sellerId } = req.query as { sellerId?: string };
    if (!sellerId) return res.status(400).json({ error: 'sellerId obrigatório' });
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return res.json([]);
      const { data: user, error: dbErr } = await supabase
        .from('app_users')
        .select('drive_folder_id')
        .eq('id', sellerId)
        .maybeSingle();
      if (dbErr || !user?.drive_folder_id) return res.json([]);
      const all = await listSubfoldersInFolder(user.drive_folder_id);
      const custom = all.filter((f) => f.name !== 'Inbox' && f.name !== 'Enviados');
      res.json(custom);
    } catch { res.json([]); }
  });

  // list files in a custom Drive folder
  app.get('/api/emails/folder/:folderId', async (req, res) => {
    try {
      const files = await listFilesInFolder(req.params.folderId);
      res.json(files);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // create a custom folder for a seller
  app.post('/api/emails/folder', async (req, res) => {
    const { sellerId, name } = req.body as { sellerId?: string; name?: string };
    if (!sellerId || !name) return res.status(400).json({ error: 'sellerId e name obrigatórios' });
    if (!isDriveConfigured()) return res.status(500).json({ error: 'Google Drive não configurado no servidor' });
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return res.status(500).json({ error: 'Supabase não configurado' });
      const { data: user } = await supabase.from('app_users').select('name, drive_folder_id').eq('id', sellerId).maybeSingle();

      // Auto-provisiona a pasta raiz do vendedor se ainda nao existir
      let rootId: string | null = user?.drive_folder_id ?? null;
      if (!rootId) {
        const rawName: string = (user as { name?: string } | null)?.name ?? sellerId;
        const prefix = rawName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').slice(0, 40) || 'vendedor';
        const folders = await createSellerFolders(prefix);
        await supabase.from('app_users').update({ drive_folder_id: folders.rootId, drive_inbox_id: folders.inboxId, drive_sent_id: folders.sentId }).eq('id', sellerId);
        rootId = folders.rootId;
      }

      const folderId = await createDriveFolder(name.trim(), rootId);
      res.json({ id: folderId, name: name.trim() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // parameterised :fileId MUST be last — matches anything that didn't match above
  app.get('/api/emails/:fileId', async (req, res) => {
    try {
      const email = await readDriveFile(req.params.fileId);
      res.json(email);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

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
    // Estes paths não precisam de Gemini: usam Groq ou são templates estáticos
    const noGeminiNeeded = ["/searchLeads", "/analyzeAndProposal", "/generateProposal", "/askQuestion"];
    if (!process.env.GEMINI_API_KEY && !noGeminiNeeded.includes(req.path)) {
      return res.status(503).json({
        error: "GEMINI_API_KEY não está configurada. Crie um arquivo .env.local com GEMINI_API_KEY=sua_chave ou defina a variável de ambiente antes de iniciar o servidor."
      });
    }

    next();
  });

  // Route: searchLeads
  app.post('/api/gemini/searchLeads', async (req, res) => {
    try {
      const { country, location, niche, aiContext, campaignName, excludeNames, segmentId } = req.body;
      const searchSegment = getSegment(segmentId);

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

      const extraContext = [
        aiContext ? `Additional Context: ${aiContext}` : "",
        searchSegment ? `Target segment: ${searchSegment.label} (${searchSegment.aiHint}).` : ""
      ].filter(Boolean).join("\n        ");

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
          segmentId: searchSegment?.id,
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
      const { name, email, password, emailPrefix } = req.body || {};
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
      const { data: existingProfile } = await admin.from('app_users').select('id, drive_inbox_id').eq('email', lowerEmail).maybeSingle();
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

      // 3) Criar pastas no Google Drive automaticamente
      if (isDriveConfigured()) {
        try {
          const prefix = emailPrefix
            ? String(emailPrefix).toLowerCase().replace(/[^a-z0-9.]/g, '')
            : (name || lowerEmail.split('@')[0]).toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
          const solEmail = `${prefix}@sol.ecletika.com`;
          const folders = await createSellerFolders(prefix);
          await admin.from('app_users').update({
            email_address: solEmail,
            drive_folder_id: folders.rootId,
            drive_inbox_id: folders.inboxId,
            drive_sent_id: folders.sentId,
          }).eq('id', authUserId);
          console.log(`[Drive] ✅ Pastas criadas para ${prefix}: inbox=${folders.inboxId}`);
        } catch (driveErr: any) {
          console.warn('[Drive] Não foi possível criar pastas:', driveErr.message);
        }
      }

      return res.json({ userId: authUserId });
    } catch (error: any) {
      console.error('Seller account error:', error);
      res.status(500).json({ error: error.message || 'Erro ao criar conta do vendedor.' });
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

  // Route: askQuestion — via Groq (pura geração de texto, sem web search)
  app.post('/api/gemini/askQuestion', async (req, res) => {
    try {
      const { lead, question, history } = req.body;

      const systemPrompt = `
        LEAD CONTEXT:
        Hotel Name: ${lead.companyName}
        Website: ${lead.website || "None"}
        Potential: ${lead.potential} (${lead.potentialReasoning})
        Pessoa de Contacto: ${lead.contactPerson || "Governanta Geral / Diretor de Alojamento"}
        Diagnosis: ${lead.diagnosis}
        Reviews: ${lead.mapsRating} stars (${lead.mapsReviews} reviews)
        Notas de Contacto: ${lead.contactNotes || "Nenhuma nota inserida"}

        TASK: Responde de forma focada e assertiva sobre as oportunidades de vender o sistema de governacao / housekeeping SOL para este hotel. Sugere taticas de abordagem ou mensagens concretas. Responde sempre em Portugues de Portugal (PT-PT).
      `.trim();

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
        ...((Array.isArray(history) ? history : []) as any[]).map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content,
        })),
        { role: "user", content: question },
      ];

      const text = await callGroq(messages, 0.6);
      res.json({ text: text || "Sem resposta." });
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

      // Segmento Workio (por omissao: hotelaria, comportamento anterior)
      const segment = getSegment(leadData.segmentId) || findSegmentByText(leadData.niche);
      const isHotel = !segment || isHotelSegment(segment.id);

      const segmentPrompt = segment && !isHotel ? `
        AUDIT TARGET: "${leadData.companyName}" in "${leadData.location}".
        URL: ${leadData.website || "No URL provided"}

        LANGUAGE: STRICTLY EUROPEAN PORTUGUESE (pt-PT).

        CONTEXT: ${WORKIO_PRODUCT_SUMMARY}
        TARGET SEGMENT: ${segment.label} (${segment.aiHint}).
        TYPICAL PAINS IN THIS SEGMENT: ${segment.painPoints.join("; ")}.
        MOST RELEVANT WORKIO MODULES: ${segment.keyModules.join(", ")}.

        TASK 1: BUSINESS AUDIT
        - Confirm the business is real and active (use search/maps). If it is clearly not a "${segment.label}" business, set "valid" to false.
        - Estimate the number of employees and number of locations/shifts (${segment.unitLabel}). Workio fits companies with enough staff to need time tracking, scheduling and HR admin (typically 10+ employees). Companies with 50+ employees are legally required to have a whistleblowing channel (Lei 93/2021).
        - Look for signs of HR/workforce pain: many staff or shifts, hiring ads, high turnover in reviews, multiple sites, regulated safety requirements.
        - Infer the most likely decision maker role (e.g. ${segment.contactRole}). Do NOT invent a personal name unless found in a public source.

        TASK 2: WORKIO FIT CLASSIFICATION
        - **HOT**: 20+ employees, shift work or multiple sites, active hiring, or clear HR/compliance pressure.
        - **COLD**: very small team (under ~8) or evidence of an existing HR/time-tracking system.
        - **MEDIUM**: otherwise.

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
          "reasoning": "string (pt-PT) - why this business fits Workio, citing evidence",
          "problems": ["string"],
          "solutionFeatures": ["string"],
          "expectedBenefits": ["string"],
          "contactPerson": "string - real full name ONLY if found in a public source, otherwise empty string",
          "contactRole": "string - most likely decision-maker role, e.g. ${segment.contactRole}",
          "contactNotes": "string (pt-PT - size, positioning and suggested pitch for ${segment.label})"
        }
      ` : null;

      const prompt = segmentPrompt || `
        AUDIT TARGET: "${leadData.companyName}" in "${leadData.location}".
        URL: ${leadData.website || "No URL provided"}

        LANGUAGE: STRICTLY EUROPEAN PORTUGUESE (pt-PT).

        TASK 1: HOTEL/ACCOMMODATION OPERATION AUDIT
        - Analyze if the establishment possesses an active hotel/guesthouse operation.
        - Check reviews for mention of "limpeza" (cleanliness), "arrumação" (room tidy), "higiene" (hygiene), "tempo de espera para quarto" (wait time).
        - Identify the most likely DECISION-MAKER ROLE (e.g. "Governanta-Geral", "Diretor de Alojamentos"). NEVER invent a personal name: give a full name only if it appears in a public source you actually found, otherwise leave it empty.

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
          "contactPerson": "string - real full name ONLY if found in a public source, otherwise empty string",
          "contactRole": "string - most likely decision-maker role, no personal name",
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
        niche: segment && !isHotel ? segment.label : (leadData.niche || "Hotelaria"),
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
        // Nunca um nome inventado: so um nome encontrado numa fonte publica; o cargo vai nas notas
        contactPerson: (typeof data.contactPerson === "string" && data.contactPerson.trim()) || undefined,
        contactNotes: `Decisor provável (cargo): ${data.contactRole || (segment && !isHotel ? segment.contactRole : "Governanta-Geral / Diretor de Operações")}. ` +
          (data.contactNotes || (segment && !isHotel ? `${segment.label}: ${segment.pitch}` : "Hotel com potencial para modernização operacional do departamento de andares.")),
        callbackStatus: 'pending',
        storefront: {
          analyzed: true,
          signageCondition: 'Unknown',
          visualAppeal: 'Medium',
          needsLedUpgrade: false,
          description: segment && !isHotel ? "Análise remota via Maps e website." : "Estrutura do hotel analisada remotamente via fotos de satélite e Maps.",
          address: leadData.location || "Portugal"
         },
        diagnosis: data.diagnosis || (segment && !isHotel ? `Pronto para contacto de apresentação do Workio (${segment.label}).` : "Pronto para contacto de apresentação do software de Housekeeping."),
        proposal: segment && !isHotel ? {
          siteStructure: ["App do colaborador (ponto, férias, recibos)", "Painel de RH e chefias", "Relatórios automáticos"],
          brandingSuggestion: `Workio para ${segment.label}`,
          techStack: "Web + App Mobile",
          problems: data.problems || segment.painPoints,
          solutionFeatures: data.solutionFeatures || ["Controlo de ponto no telemóvel (QR, rosto ou digital)", "Escalas gráficas e banco de horas automático", "Férias, ausências e relatórios sem folhas de cálculo"],
          expectedBenefits: data.expectedBenefits || ["Menos tempo de RH em tarefas manuais", "Faltas e atrasos visíveis no próprio dia", "Dados prontos para o processamento salarial"],
          estimatedValue: "Desde 3,90 € por colaborador / mês"
        } : {
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

  // ── TWILIO VOICE ────────────────────────────────────────────────────────────
  // .trim() é essencial: valores colados nas env vars (Vercel) podem trazer
  // espaços/tabs invisiveis. Um callerId com tab/espaco e invalido e a Twilio
  // recusa a chamada de saida (a chamada liga e termina em segundos).
  const twilioSid     = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioKey     = process.env.TWILIO_API_KEY_SID?.trim();
  const twilioSecret  = process.env.TWILIO_API_KEY_SECRET?.trim();
  const twilioApp     = process.env.TWILIO_TWIML_APP_SID?.trim();
  const twilioPhone   = process.env.TWILIO_PHONE_NUMBER?.trim();
  const twilioReady   = twilioSid && twilioKey && twilioSecret && twilioApp;

  // GET /api/twilio/token — Access Token para o browser SDK
  app.get('/api/twilio/token', async (_req, res) => {
    if (!twilioReady) {
      return res.status(503).json({ error: 'Twilio nao configurado. Adicione TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET e TWILIO_TWIML_APP_SID ao .env.local' });
    }
    try {
      const tw = await import('twilio');
      const AccessToken = (tw as any).default?.jwt?.AccessToken ?? (tw as any).jwt?.AccessToken;
      const VoiceGrant  = AccessToken.VoiceGrant;

      const grant = new VoiceGrant({ outgoingApplicationSid: twilioApp, incomingAllow: false });
      const token = new AccessToken(twilioSid, twilioKey, twilioSecret, { identity: 'crm_seller', ttl: 3600 });
      token.addGrant(grant);
      res.json({ token: token.toJwt() });
    } catch (err: any) {
      res.status(500).json({ error: 'Twilio token error: ' + err.message });
    }
  });

  // POST /api/twilio/voice — TwiML para chamadas de saída (URL do TwiML App)
  app.post('/api/twilio/voice', async (req, res) => {
    try {
      const tw = await import('twilio');
      const VoiceResponse = (tw as any).default?.twiml?.VoiceResponse ?? (tw as any).twiml?.VoiceResponse;
      const twiml = new VoiceResponse();
      const to = (req.body.To as string | undefined)?.trim();
      const callerId = (twilioPhone || '').trim();
      if (to) {
        const dial = twiml.dial({ callerId });
        dial.number(to);
      } else {
        twiml.say({ language: 'pt-PT' }, 'Numero de destino nao especificado.');
      }
      res.type('text/xml').send(twiml.toString());
    } catch (err: any) {
      res.status(500).json({ error: 'TwiML error: ' + err.message });
    }
  });

  // POST /api/twilio/status — Webhook de estado (configure no Twilio Console)
  app.post('/api/twilio/status', (req, res) => {
    const { CallSid, CallStatus, CallDuration, To } = req.body;
    console.log(`[Twilio] ${CallSid} → ${CallStatus} | ${CallDuration}s | To: ${To}`);
    res.status(204).send();
  });

  // ── GOOGLE PLACES — Enriquecimento + busca de hoteis ────────────────────────
  // Teto mensal (so avisa, nao bloqueia). Contador global partilhado na BD.
  const PLACES_MONTHLY_LIMIT = 900;
  const PLACES_WARN_AT = 800;
  const placesPeriod = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // Le o nr de buscas Places deste mes
  async function getPlacesUsage(): Promise<number> {
    const admin = getSupabaseAdmin();
    if (!admin) return 0;
    const { data } = await admin
      .from('api_usage')
      .select('count')
      .eq('period', placesPeriod())
      .eq('service', 'places')
      .maybeSingle();
    return data?.count ?? 0;
  }

  // Incrementa o contador deste mes (upsert) e devolve o novo total
  async function bumpPlacesUsage(): Promise<number> {
    const admin = getSupabaseAdmin();
    if (!admin) return 0;
    const period = placesPeriod();
    const current = await getPlacesUsage();
    const next = current + 1;
    await admin
      .from('api_usage')
      .upsert({ period, service: 'places', count: next, updated_at: new Date().toISOString() }, { onConflict: 'period,service' });
    return next;
  }

  // GET /api/places/usage — estado do contador (para o painel do admin)
  app.get('/api/places/usage', async (_req, res) => {
    const used = await getPlacesUsage();
    res.json({ used, limit: PLACES_MONTHLY_LIMIT, warnAt: PLACES_WARN_AT, period: placesPeriod() });
  });

  app.post('/api/places/enrich', async (req, res) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (!apiKey) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY nao configurada no servidor.' });

    const { name, location } = req.body as { name?: string; location?: string };
    if (!name) return res.status(400).json({ error: 'Nome do hotel e obrigatorio.' });

    const query = [name, location, 'hotel'].filter(Boolean).join(' ');

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.displayName',
            'places.formattedAddress',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.rating',
            'places.userRatingCount'
          ].join(',')
        },
        body: JSON.stringify({ textQuery: query, languageCode: 'pt' })
      });

      const data: any = await response.json();
      const used = await bumpPlacesUsage(); // conta a chamada (independente de ter resultados)

      if (!data.places || data.places.length === 0) {
        return res.json({ found: false, usage: { used, limit: PLACES_MONTHLY_LIMIT, warnAt: PLACES_WARN_AT } });
      }

      const place = data.places[0];
      res.json({
        found: true,
        name: place.displayName?.text ?? null,
        phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        address: place.formattedAddress ?? null,
        rating: place.rating ?? null,
        totalRatings: place.userRatingCount ?? null,
        usage: { used, limit: PLACES_MONTHLY_LIMIT, warnAt: PLACES_WARN_AT }
      });
    } catch (err: any) {
      console.error('[Places] enrich error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/places/search — descobre leads novos por zona/termo (1 chamada = ate 20 resultados)
  app.post('/api/places/search', async (req, res) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (!apiKey) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY nao configurada no servidor.' });

    const { query, location } = req.body as { query?: string; location?: string };
    const textQuery = [query, location].filter(Boolean).join(' ').trim();
    if (!textQuery) return res.status(400).json({ error: 'Indique um termo ou zona para a busca.' });

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.rating',
            'places.userRatingCount'
          ].join(',')
        },
        body: JSON.stringify({ textQuery, languageCode: 'pt' })
      });

      const data: any = await response.json();
      const used = await bumpPlacesUsage();

      const results = (data.places || []).map((p: any) => ({
        placeId: p.id ?? null,
        name: p.displayName?.text ?? null,
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        address: p.formattedAddress ?? null,
        rating: p.rating ?? null,
        totalRatings: p.userRatingCount ?? null
      }));

      res.json({ results, usage: { used, limit: PLACES_MONTHLY_LIMIT, warnAt: PLACES_WARN_AT } });
    } catch (err: any) {
      console.error('[Places] search error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── PESSOAS — procura em fontes PUBLICAS do website da empresa ─────────────
  // Nunca inventa: so devolve nomes/cargos/emails que aparecem escritos nas paginas
  // (e valida o que a IA extrai contra o texto real da pagina).
  const isPrivateIp = (ip: string): boolean => {
    if (net.isIPv4(ip)) {
      const [a, b] = ip.split(".").map(Number);
      return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
    }
    if (net.isIPv6(ip)) {
      const v = ip.toLowerCase();
      if (v === "::1" || v === "::") return true;
      if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
      const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
      return mapped ? isPrivateIp(mapped[1]) : false;
    }
    return true;
  };

  const isPublicHost = async (hostname: string): Promise<boolean> => {
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (net.isIP(hostname)) return !isPrivateIp(hostname);
    try {
      const addrs = await dns.promises.lookup(hostname, { all: true });
      return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
    } catch {
      return false;
    }
  };

  const PEOPLE_MAX_BYTES = 1_500_000;

  // GET de uma pagina publica, com limites (tempo, tamanho, redirects, so portas 80/443)
  const safeFetchHtml = async (startUrl: string): Promise<{ url: string; html: string } | null> => {
    let current = startUrl;
    for (let hop = 0; hop < 4; hop++) {
      let u: URL;
      try { u = new URL(current); } catch { return null; }
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      if (u.port && u.port !== "80" && u.port !== "443") return null;
      if (!(await isPublicHost(u.hostname))) return null;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(u.toString(), {
          redirect: "manual",
          signal: ctrl.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; WorkioBot/1.0)", Accept: "text/html,application/xhtml+xml" }
        });
        if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
          current = new URL(r.headers.get("location") as string, u).toString();
          continue;
        }
        if (!r.ok) return null;
        if (!String(r.headers.get("content-type") || "").includes("html")) return null;
        const buf = Buffer.from(await r.arrayBuffer());
        return { url: u.toString(), html: buf.subarray(0, PEOPLE_MAX_BYTES).toString("utf8") };
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  };

  const htmlToText = (html: string): string =>
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#64;|&commat;/g, "@")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();

  const GENERIC_EMAIL_PREFIXES = ["info", "geral", "reservas", "reservations", "booking", "contacto", "contactos", "contact", "comercial", "sales", "recepcao", "receção", "reception", "administrativo", "hello", "ola", "olá", "suporte", "support", "marketing", "rh", "office", "mail", "geral"];

  const extractEmails = (html: string, text: string): string[] => {
    const found = new Set<string>();
    const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
    for (const m of (html + " " + text).match(re) || []) {
      const e = m.toLowerCase();
      if (/\.(png|jpe?g|gif|svg|webp|css|js)$/.test(e)) continue;
      if (/(example|sentry|wixpress|domain\.com|email\.com|yourdomain)/.test(e)) continue;
      found.add(e);
    }
    return Array.from(found);
  };

  const extractPtPhones = (text: string): string[] => {
    const found = new Set<string>();
    const re = /(?:\+?351[\s.-]?)?(?:2\d[\s.-]?\d{3}[\s.-]?\d{4}|9[1236]\d[\s.-]?\d{3}[\s.-]?\d{3})/g;
    for (const m of text.match(re) || []) {
      const digits = m.replace(/\D/g, "").replace(/^351/, "");
      if (digits.length === 9 && /^[29]/.test(digits)) found.add(`+351 ${digits}`);
    }
    return Array.from(found);
  };

  const PEOPLE_PAGE_PATHS = ["", "/equipa", "/a-equipa", "/a-nossa-equipa", "/team", "/sobre", "/sobre-nos", "/quem-somos", "/about", "/about-us", "/contactos", "/contacto", "/contact"];

  // POST /api/people/find — { companyName, website }
  app.post('/api/people/find', async (req, res) => {
    try {
      const { companyName, website } = req.body as { companyName?: string; website?: string };
      if (!website || !String(website).trim()) {
        return res.json({ people: [], emails: [], phones: [], pagesChecked: 0, notes: ["Este lead não tem website: não há página pública para analisar."] });
      }

      let base: URL;
      try {
        base = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
      } catch {
        return res.status(400).json({ error: "Website inválido." });
      }

      const pages: { url: string; html: string; text: string }[] = [];
      const seen = new Set<string>();
      for (const p of PEOPLE_PAGE_PATHS) {
        if (pages.length >= 6) break;
        const target = new URL(p || "/", base).toString();
        if (seen.has(target)) continue;
        seen.add(target);
        const got = await safeFetchHtml(target);
        if (got && !pages.some((x) => x.url === got.url)) {
          pages.push({ url: got.url, html: got.html, text: htmlToText(got.html).slice(0, 12000) });
        }
      }

      const notes: string[] = [];
      if (pages.length === 0) {
        return res.json({ people: [], emails: [], phones: [], pagesChecked: 0, notes: ["Não foi possível abrir o website (indisponível ou bloqueado)."] });
      }

      const allText = pages.map((p) => p.text).join("\n");
      const emailSet = new Map<string, string>();
      const phoneSet = new Map<string, string>();
      for (const p of pages) {
        for (const e of extractEmails(p.html, p.text)) if (!emailSet.has(e)) emailSet.set(e, p.url);
        for (const ph of extractPtPhones(p.text)) if (!phoneSet.has(ph)) phoneSet.set(ph, p.url);
      }
      const emails = Array.from(emailSet.entries()).map(([email, sourceUrl]) => {
        const local = email.split("@")[0];
        return { email, sourceUrl, kind: GENERIC_EMAIL_PREFIXES.includes(local) ? "generic" : "personal" };
      });
      const phones = Array.from(phoneSet.entries()).map(([phone, sourceUrl]) => ({ phone, sourceUrl }));

      // Pessoas: so se houver IA; valida cada resultado contra o texto real
      let people: any[] = [];
      if (!process.env.GEMINI_API_KEY) {
        notes.push("IA não configurada: só foram extraídos emails e telefones. Os nomes exigem GEMINI_API_KEY.");
      } else {
        try {
          const ai = getGeminiClient();
          const corpus = pages.map((p) => `### PÁGINA ${p.url}\n${p.text}`).join("\n\n").slice(0, 40000);
          const prompt = `
            Extrai APENAS pessoas que aparecem escritas, com nome próprio, nas páginas abaixo da empresa "${companyName || ""}".
            REGRAS:
            - NUNCA inventes, deduzas ou completes nomes, cargos ou emails. Se não está escrito, não incluas.
            - Só pessoas associadas à empresa (equipa, direção, gerência, contactos). Ignora autores de reviews, clientes e figuras públicas.
            - "evidence" é uma citação CURTA e literal do texto onde a pessoa aparece.
            Devolve um ARRAY JSON (pode ser vazio): [{"name":"","role":"","email":"","phone":"","sourceUrl":"","evidence":""}]

            ${corpus}
          `;
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
          });
          const parsed = extractJson(response.text || "[]");
          const hay = allText.toLowerCase();
          const normalizedEmails = new Set(emails.map((e) => e.email));
          if (Array.isArray(parsed)) {
            const dedupe = new Set<string>();
            for (const item of parsed) {
              const name = String(item?.name || "").trim();
              if (name.length < 5 || !name.includes(" ")) continue;
              if (!hay.includes(name.toLowerCase())) continue; // nome tem de existir no texto
              if (dedupe.has(name.toLowerCase())) continue;
              dedupe.add(name.toLowerCase());
              const role = String(item?.role || "").trim();
              const roleOk = role && hay.includes(role.toLowerCase());
              const email = String(item?.email || "").trim().toLowerCase();
              people.push({
                name,
                role: roleOk ? role : undefined,
                email: normalizedEmails.has(email) ? email : undefined,
                phone: item?.phone && allText.includes(String(item.phone)) ? String(item.phone) : undefined,
                source: "website",
                sourceUrl: pages.some((p) => p.url === item?.sourceUrl) ? item.sourceUrl : pages[0].url,
                confidence: roleOk ? "probable" : "unverified",
                evidence: String(item?.evidence || "").slice(0, 240)
              });
              if (people.length >= 15) break;
            }
          }
          if (people.length === 0) notes.push("Nenhuma pessoa com nome foi encontrada nas páginas públicas.");
        } catch (err: any) {
          console.warn("[People] extraction failed:", err?.message);
          notes.push("A extração por IA falhou; só foram extraídos emails e telefones.");
        }
      }

      res.json({ people, emails, phones, pagesChecked: pages.length, notes });
    } catch (err: any) {
      console.error("[People] find error:", err);
      res.status(500).json({ error: err.message || "Erro ao procurar pessoas." });
    }
  });

  // ── APOLLO — empresas e pessoas, com teto mensal de creditos ───────────────
  // A chave (CLIENT_API_APOLLO) vive so no servidor. Cada pedido reserva creditos no
  // contador ANTES de chamar o Apollo; atingido o teto, nenhum pedido sai.
  // NOTA: o contador e interno (o que ESTA app gastou); nao le o saldo real do Apollo.
  const APOLLO_BASE = "https://api.apollo.io/api/v1";
  // Teto mensal (pode ser ajustado na Vercel com APOLLO_MONTHLY_LIMIT, sem mexer no codigo)
  const APOLLO_MONTHLY_LIMIT = Number(process.env.APOLLO_MONTHLY_LIMIT) > 0 ? Math.floor(Number(process.env.APOLLO_MONTHLY_LIMIT)) : 70;
  const apolloKey = () => process.env.CLIENT_API_APOLLO?.trim();

  async function getApolloUsage(): Promise<number | null> {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from('api_usage')
      .select('count')
      .eq('period', placesPeriod())
      .eq('service', 'apollo')
      .maybeSingle();
    if (error) return null;
    return data?.count ?? 0;
  }

  async function setApolloUsage(count: number): Promise<boolean> {
    const admin = getSupabaseAdmin();
    if (!admin) return false;
    const { error } = await admin
      .from('api_usage')
      .upsert({ period: placesPeriod(), service: 'apollo', count: Math.max(0, count), updated_at: new Date().toISOString() }, { onConflict: 'period,service' });
    return !error;
  }

  type ApolloGate = { ok: true; used: number } | { ok: false; status: number; error: string; used?: number };

  // Reserva `cost` creditos. Falha fechada: sem contador, nao ha pedidos.
  async function apolloReserve(cost: number): Promise<ApolloGate> {
    if (!apolloKey()) return { ok: false, status: 503, error: "Apollo não configurado (falta a variável CLIENT_API_APOLLO)." };
    const used = await getApolloUsage();
    if (used === null) return { ok: false, status: 503, error: "Contador de créditos indisponível: pedidos ao Apollo bloqueados por segurança." };
    if (used >= APOLLO_MONTHLY_LIMIT || used + cost > APOLLO_MONTHLY_LIMIT) {
      return { ok: false, status: 429, used, error: `Limite mensal do Apollo atingido (${used}/${APOLLO_MONTHLY_LIMIT} créditos). Novos pedidos só no próximo mês.` };
    }
    if (cost > 0 && !(await setApolloUsage(used + cost))) {
      return { ok: false, status: 503, error: "Não foi possível registar o consumo de créditos: pedido bloqueado." };
    }
    return { ok: true, used: used + cost };
  }

  // Chama o Apollo. Pedido falhado devolve os creditos reservados; se a resposta indicar
  // `credits_consumed`, ajusta o contador ao valor real.
  async function apolloCall(path: string, body: any, reservedCost: number): Promise<{ status: number; data: any; used: number }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let used = (await getApolloUsage()) ?? 0;
    try {
      const r = await fetch(`${APOLLO_BASE}${path}`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "x-api-key": apolloKey() as string },
        body: JSON.stringify(body)
      });
      const data: any = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (reservedCost > 0) { used = Math.max(0, used - reservedCost); await setApolloUsage(used); }
      } else if (typeof data?.credits_consumed === "number" && data.credits_consumed !== reservedCost) {
        used = Math.max(0, used + (data.credits_consumed - reservedCost));
        await setApolloUsage(used);
      }
      return { status: r.status, data, used };
    } catch (err) {
      if (reservedCost > 0) { used = Math.max(0, used - reservedCost); await setApolloUsage(used); }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  const apolloUsagePayload = (used: number) => ({
    used,
    limit: APOLLO_MONTHLY_LIMIT,
    remaining: Math.max(APOLLO_MONTHLY_LIMIT - used, 0),
    period: placesPeriod()
  });

  const apolloErrorMessage = (status: number, data: any) =>
    status === 401 || status === 403 ? "Chave do Apollo recusada. Verifique a variável CLIENT_API_APOLLO."
      : status === 429 ? "Apollo: limite de pedidos atingido. Tente mais tarde."
      : `Erro do Apollo (${status})${data?.error ? `: ${String(data.error).slice(0, 120)}` : "."}`;

  // GET /api/apollo/usage — estado da barra de creditos
  app.get('/api/apollo/usage', async (_req, res) => {
    const configured = Boolean(apolloKey());
    const used = await getApolloUsage();
    res.json({
      configured,
      counterAvailable: used !== null,
      ...apolloUsagePayload(used ?? 0)
    });
  });

  // POST /api/apollo/companies — pesquisa de empresas (conta 1 credito por pedido, por precaucao)
  app.post('/api/apollo/companies', async (req, res) => {
    try {
      const { country, location, niche, segmentId, excludeNames } = req.body as any;
      const gate = await apolloReserve(1);
      if (!gate.ok) return res.status(gate.status).json({ error: gate.error, usage: gate.used !== undefined ? apolloUsagePayload(gate.used) : undefined });

      const countryName = ({ PT: "Portugal", AO: "Angola", BR: "Brazil" } as Record<string, string>)[String(country || "PT").toUpperCase()] || "Portugal";
      const places = splitLocations(String(location || ""), "", "").slice(0, 5);
      const segment = getSegment(segmentId) || findSegmentByText(niche);
      const keyword = segment?.osmTerm || String(niche || "").trim();

      const body: any = {
        organization_locations: (places.length ? places : [countryName]).map((p: string) => (p.toLowerCase().includes(countryName.toLowerCase()) ? p : `${p}, ${countryName}`)),
        per_page: 10,
        page: 1
      };
      if (keyword) body.q_organization_keyword_tags = [keyword];
      // Workio e para empresas com equipa; o SOL (hotelaria) nao filtra por tamanho
      if (segment && !isHotelSegment(segment.id)) body.organization_num_employees_ranges = ["11,50", "51,200", "201,500"];

      const { status, data, used } = await apolloCall("/mixed_companies/search", body, 1);
      if (status < 200 || status >= 300) return res.status(502).json({ error: apolloErrorMessage(status, data), usage: apolloUsagePayload(used) });

      const excluded = new Set((Array.isArray(excludeNames) ? excludeNames : []).map((n: any) => String(n || "").trim().toLowerCase()));
      const orgs: any[] = data.organizations || data.accounts || [];
      const leads = orgs
        .filter((o) => o?.name && !excluded.has(String(o.name).trim().toLowerCase()))
        .map((o) => {
          const phone = o.phone || o.primary_phone?.number || o.sanitized_phone || undefined;
          return {
            companyName: o.name,
            website: o.website_url || (o.primary_domain ? `https://${o.primary_domain}` : undefined),
            location: [o.street_address, o.city, o.state, o.country].filter(Boolean).join(", ") || countryName,
            phone,
            allPhones: phone ? [phone] : [],
            niche: niche || segment?.searchTerm || "Empresas",
            segmentId: segment?.id,
            employees: o.estimated_num_employees ? `${o.estimated_num_employees} colaboradores (estimativa Apollo)` : undefined,
            socials: [],
            country: String(country || "PT").toUpperCase(),
            dataSource: "Apollo"
          };
        });

      res.json({ leads, usage: apolloUsagePayload(used) });
    } catch (err: any) {
      console.error("[Apollo] companies error:", err?.message);
      res.status(500).json({ error: "Erro ao falar com o Apollo." });
    }
  });

  // POST /api/apollo/people — decisores de uma empresa (pesquisa sem emails: 0 creditos segundo a doc)
  app.post('/api/apollo/people', async (req, res) => {
    try {
      const { domain, titles } = req.body as { domain?: string; titles?: string[] };
      const cleanDomain = String(domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      if (!cleanDomain) return res.status(400).json({ error: "Falta o domínio da empresa (website)." });

      const gate = await apolloReserve(0);
      if (!gate.ok) return res.status(gate.status).json({ error: gate.error, usage: gate.used !== undefined ? apolloUsagePayload(gate.used) : undefined });

      const body: any = { q_organization_domains_list: [cleanDomain], per_page: 10, page: 1 };
      if (Array.isArray(titles) && titles.length) body.person_titles = titles.slice(0, 12);

      const { status, data, used } = await apolloCall("/mixed_people/api_search", body, 0);
      if (status < 200 || status >= 300) return res.status(502).json({ error: apolloErrorMessage(status, data), usage: apolloUsagePayload(used) });

      const people = ((data.people || data.contacts || []) as any[])
        .filter((p) => p?.id)
        .map((p) => ({
          id: String(p.id),
          name: [p.first_name, p.last_name || p.last_name_obfuscated].filter(Boolean).join(" ").trim() || "(nome oculto)",
          title: p.title || undefined,
          organization: p.organization?.name || undefined,
          hasEmail: Boolean(p.has_email),
          linkedinUrl: p.linkedin_url || undefined
        }));

      res.json({ people, usage: apolloUsagePayload(used) });
    } catch (err: any) {
      console.error("[Apollo] people error:", err?.message);
      res.status(500).json({ error: "Erro ao falar com o Apollo." });
    }
  });

  // POST /api/apollo/reveal — revela o email profissional de UMA pessoa (gasta creditos)
  app.post('/api/apollo/reveal', async (req, res) => {
    try {
      const { personId } = req.body as { personId?: string };
      if (!personId) return res.status(400).json({ error: "Falta a pessoa a revelar." });

      const gate = await apolloReserve(1);
      if (!gate.ok) return res.status(gate.status).json({ error: gate.error, usage: gate.used !== undefined ? apolloUsagePayload(gate.used) : undefined });

      // Sem emails pessoais: so o contacto profissional
      const { status, data, used } = await apolloCall("/people/match", { id: String(personId), reveal_personal_emails: false }, 1);
      if (status < 200 || status >= 300) return res.status(502).json({ error: apolloErrorMessage(status, data), usage: apolloUsagePayload(used) });

      const p = data.person || {};
      res.json({
        person: {
          name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || undefined,
          title: p.title || undefined,
          email: p.email || undefined,
          emailStatus: p.email_status || undefined,
          linkedinUrl: p.linkedin_url || undefined
        },
        usage: apolloUsagePayload(used)
      });
    } catch (err: any) {
      console.error("[Apollo] reveal error:", err?.message);
      res.status(500).json({ error: "Erro ao falar com o Apollo." });
    }
  });

  return app;
}
