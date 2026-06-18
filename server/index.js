const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

function escape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildFallbackLeads({ country, location, niche, aiContext, campaignName }) {
  const base = location || aiContext || campaignName || (country === 'BR' ? 'Brasil' : country === 'AO' ? 'Angola' : 'Portugal');
  const text = (niche || campaignName || '').toString();

  const names = text
    ? [
        `${text} - Unidade Centro`,
        `${text} - ${base}`,
        `${text} Premium`,
        `${text} Service`,
        `Central ${text}`,
        `${text} Express`,
        `Novo ${text}`,
        `${text} Oficial`
      ]
    : [
        `Unidade ${base}`,
        `${base} Premium`,
        `Central ${base}`,
        `${base} Service`,
        `Novo ${base}`
      ];

  return names.map((name, index) => ({
    id: `lead-fallback-${index + 1}`,
    companyName: name,
    location: base,
    niche: niche || 'Hotelaria',
    website: undefined,
    email: undefined,
    phone: undefined,
    allPhones: [],
    socials: [],
    country: String(country || 'PT').toUpperCase(),
    status: 'completed',
    potential: 'Medium',
    potentialReasoning: 'Lead gerado em modo offline por ausência de integração com Gemini.',
    contactPerson: 'Diretor de Operações / Governanta-Geral',
    contactNotes: 'Validar dados reais de contacto antes da abordagem.',
    callbackStatus: 'pending',
    storefront: {
      analyzed: false,
      signageCondition: 'Unknown',
      visualAppeal: 'Medium',
      needsLedUpgrade: false,
      description: 'Análise visual não executada no modo offline.',
      address: base
    },
    diagnosis: 'Lead sem análise detalhada. Utilize dados reais de avaliações para priorizar o contacto.',
    proposal: {
      siteStructure: ['Aplicação Móvel das Empregadas', 'Painel da Governanta', 'Ecrã de Status da Receção'],
      brandingSuggestion: 'Digitalização de Housekeeping',
      techStack: 'React Native + Web Panel Dashboard',
      problems: ['Coordenação manual entre receção e equipa de limpeza', 'Baixa visibilidade do estado dos quartos', 'Processos em papel difíceis de auditar'],
      solutionFeatures: ['Status de quartos em tempo real', 'Checklists digitais', 'Relatórios com foto para danos e achados'],
      expectedBenefits: ['Menos atrasos no check-in', 'Maior controlo operacional', 'Melhor rastreabilidade de limpeza'],
      estimatedValue: '149 EUR / mês'
    },
    emailSequence: [],
    aiChatHistory: [],
    generatedSiteCode: null
  }));
}

function buildProposalMarkdown(lead) {
  const hotel = escape(lead.companyName || 'o hotel');
  const location = escape(lead.location || 'Portugal');
  const rating = lead.mapsRating != null ? `${lead.mapsRating} estrelas` : 'avaliação disponível';
  const reviews = lead.mapsReviews != null ? `${lead.mapsReviews} avaliações` : 'avaliações públicas';
  const diagnosis = escape(lead.diagnosis || 'Potencial de modernização da operação de housekeeping.');
  const contact = escape(lead.contactPerson || 'Governanta Geral / Diretor de Operações');

  const problemSet = (lead.proposal?.problems && lead.proposal.problems.length) ? lead.proposal.problems : ['Coordenação manual entre a receção e a equipa de limpeza', 'Baixa visibilidade do estado dos quartos em tempo real', 'Processos em papel difíceis de auditar', 'Gestão de consumíveis e enxoval sem controlo'];
  const featureSet = (lead.proposal?.solutionFeatures && lead.proposal.solutionFeatures.length) ? lead.proposal.solutionFeatures : ['Status de quartos em tempo real', 'Checklists digitais com registo fotográfico de danos e achados', 'Relatórios automáticos para governanta e direção', 'Sincronização em tempo real com a receção'];
  const benefitSet = (lead.proposal?.expectedBenefits && lead.proposal.expectedBenefits.length) ? lead.proposal.expectedBenefits : ['Redução do tempo de rotação dos quartos', 'Melhoria da pontuação de limpeza em Booking e Tripadvisor', 'Controlo rigoroso de inventário', 'Mais quartos vendidos por dia com o mesmo staff'];
  const value = escape(lead.proposal?.estimatedValue || '149 EUR / mês');

  const packageItens = (lead.proposal?.siteStructure && lead.proposal.siteStructure.length) ? lead.proposal.siteStructure : ['Aplicação Móvel das Empregadas de Quarto', 'Painel da Governanta', 'Ecrã de Status da Receção'];
  const techStack = escape(lead.proposal?.techStack || 'React Native + Web Panel Dashboard');
  const branding = escape(lead.proposal?.brandingSuggestion || 'Digitalização de Housekeeping');

  const bullets = (items) => (items.length ? items : ['(sem detalhe)']).map((item) => `- ${escape(item)}`).join('\n');

  return `Proposta Comercial - ${hotel}
Localização: ${location}
Perfil decisor: ${contact}
Performance atual: ${rating} | ${reviews}

1. Introdução
O ${hotel} já tem um ativo importante: a confiança dos hóspedes. O próximo salto competitivo não é apenas ter boas avaliações, mas garantir que a operação de quartos consiga sustentar altas taxas de ocupação sem perder controlo da limpeza, dos achados e da comunicação entre a receção e as equipas de piso.

2. O Problema Silencioso
Hoje, hotéis com avaliações inconsistentes em limpeza e com alto movimento de check-in / check-out sofrem com:
${bullets(problemSet)}

Esses pontos geram atrasos no check-in, desperdício de tempo da governanta e maior risco de reclamações em portais de reserva.

3. A Nossa Proposta - ${branding}
Implementamos uma solução desenhada para resolver os pontos acima:
${bullets(featureSet)}

4. Âmbito do Projeto
${bullets(packageItens)}

Modelo tecnológico: ${techStack}

5. Retorno Esperado
Benefícios diretos para o ${hotel}:
${bullets(benefitSet)}

6. Investimento
Modelo simples e previsível: ${value}, com implementação faseada para não perturbar a operação diária.

7. Próximo Passo
Sugiro uma conversa de 30 minutos com ${contact} para:
- Mapear o fluxo atual de rooms status
- Apresentar um piloto com 10 quartos durante 2 semanas
- Aferir ganhos concretos antes da implementação total

---
LeadScope AI - Oportunidade gerada a ${new Date().toLocaleDateString('pt-PT')}.`;
}

app.post('/api/gemini/searchLeads', (req, res) => {
  try {
    const leads = buildFallbackLeads(req.body || {}).slice(0, 12);
    res.json(leads);
  } catch (error) {
    console.error('searchLeads fallback error:', error);
    res.status(500).json({ error: error.message || 'Erro na busca local de leads.' });
  }
});

app.post('/api/gemini/analyzeAndProposal', async (req, res) => {
  try {
    const { leadData } = req.body || {};
    const fallback = buildFallbackLeads(leadData || {}).slice(0, 1)[0];
    const merged = { ...(fallback || {}), ...(leadData || {}) };
    res.json(merged);
  } catch (error) {
    console.error('analyzeAndProposal fallback error:', error);
    res.status(500).json({ error: error.message || 'Erro na análise offline.' });
  }
});

app.post('/api/gemini/generateProposal', (req, res) => {
  try {
    const { lead } = req.body || {};
    if (!lead?.companyName) {
      return res.status(400).json({ text: 'Lead inválido: nome do hotel não foi fornecido.' });
    }
    const text = buildProposalMarkdown(lead);
    res.json({ text });
  } catch (error) {
    console.error('generateProposal fallback error:', error);
    res.status(500).json({ error: error.message || 'Error generating proposal' });
  }
});

app.post('/api/gemini/generateWebsite', (req, res) => {
  res.status(501).json({ html: '<!-- Geração de site desativada no modo offline. -->' });
});

app.post('/api/gemini/refineWebsite', (req, res) => {
  res.status(501).json({ html: '<!-- Edição de site desativada no modo offline. -->' });
});

app.post('/api/gemini/simulate', (req, res) => {
  res.status(501).json({ text: 'Simulador indisponível offline.' });
});

app.post('/api/gemini/runSocialMedia', (req, res) => {
  res.json({ socials: [], phones: [], socialSummary: 'Sem rede social neste modo offline.' });
});

app.post('/api/gemini/runStorefront', (req, res) => {
  res.json({
    analysis: { analyzed: false, signageCondition: 'Unknown', visualAppeal: 'Medium', needsLedUpgrade: false, description: 'Sem análise visual offline.', address: req.body?.lead?.location || 'Portugal' },
    leadUpdates: {}
  });
});

app.post('/api/gemini/askQuestion', (req, res) => {
  res.status(501).json({ text: 'Assistente offline indisponível.' });
});

app.get('/api/gemini/health', (_req, res) => {
  res.json({
    configured: false,
    offline: true,
    fallbackMode: true,
    message: 'Funcionamento local SEM Gemini ativado.'
  });
});

app.get('/api/gemini/health/test', (_req, res) => {
  res.json({
    success: false,
    source: 'offline',
    message: 'Teste desativado porque o Gemini não está configurado.'
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'leedscope-api', offlineGemini: true });
});

app.post('/api/test-smtp', async (req, res) => {
  const { config, to } = req.body;
  if (!config || !to) {
    return res.status(400).json({ success: false, log: 'Missing configuration or recipient.' });
  }
  const logEntries = [];
  const log = (msg) => logEntries.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  log(`Initializing SMTP Transport...`);
  log(`Host: ${config.host}:${config.port}`);
  log(`User: ${config.user}`);

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port),
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    });
    log('Verifying connection credentials...');
    await transporter.verify();
    log('Connection Verified! Credentials are valid.');
    log(`Sending test email to: ${to}...`);
    const info = await transporter.sendMail({
      from: `"${config.fromName || 'LeadScope Test'}" <${config.fromEmail || config.user}>`,
      to,
      subject: 'LeadScope AI - SMTP Configuration Test',
      text: 'If you are reading this, your SMTP configuration is working perfectly!',
      html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;"><h2 style="color: #10b981;">Connection Successful! 🚀</h2><p>Test email from LeadScope.</p></div>`
    });
    log(`Message sent: ${info.messageId}`);
    log('STATUS: SUCCESS');
    res.json({ success: true, log: logEntries.join('\n') });
  } catch (error) {
    console.error('SMTP Error:', error);
    log(`ERROR: ${error.message}`);
    if (error.code === 'EAUTH') log('Check your username and password.');
    if (error.code === 'ESOCKET') log('Check host address and port.');
    log('STATUS: FAILED');
    res.status(500).json({ success: false, log: logEntries.join('\n') });
  }
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('App not built. Run npm run build.');
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LeadScope Backend running on port ${PORT}`);
});
