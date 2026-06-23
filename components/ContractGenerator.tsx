import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileSignature, Loader2, Printer, Search, Sparkles, Zap } from 'lucide-react';
import { Lead } from '../types';
import { hotelDb } from '../services/hotelDb';

// ── Dados do contrato ───────────────────────────────────────────────────────
interface ProviderData {
  name: string; nif: string; sede: string; rep: string; email: string; product: string;
}
interface ClientData {
  name: string; nif: string; address: string; rep: string; email: string;
}
interface Terms {
  value: number;            // valor da subscricao
  period: 'mensal' | 'anual';
  users: string;            // limite de utilizadores
  uptime: string;           // ex.: 99.5%
  supportHours: string;     // ex.: 24 horas uteis
  minTermMonths: number;    // periodo minimo
  noticeDays: number;       // aviso previo de cancelamento
  liabilityMonths: number;  // limite de responsabilidade (meses pagos)
  exitDays: number;         // dias para exportar/eliminar dados
  priceReviewPct: number;   // reajuste anual maximo
  foro: string;             // foro competente
}

const PROVIDER_KEY = 'contract_provider_v1';
const DEFAULT_PROVIDER: ProviderData = {
  name: 'Ecletika Tecnologia, Lda.',
  nif: '',
  sede: '',
  rep: '',
  email: 'comercial@sol.ecletika.com',
  product: 'SOL — Gestão Operacional Hoteleira'
};

const eur = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0);
const today = () => new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

interface Clause { n: number; title: string; body: string[]; }

function buildClauses(p: ProviderData, c: ClientData, t: Terms): Clause[] {
  const periodLabel = t.period === 'mensal' ? 'mensal' : 'anual';
  const annual = t.period === 'mensal' ? t.value * 12 : t.value;
  return [
    { n: 1, title: 'Identificação das Partes', body: [
      `PRIMEIRO OUTORGANTE (Prestador / Fornecedor SaaS): ${p.name || '[Nome do Fornecedor]'}, pessoa coletiva com o NIF ${p.nif || '[NIF]'}, com sede em ${p.sede || '[Sede]'}, neste ato representada por ${p.rep || '[Representante legal]'}, adiante designada por "Fornecedor".`,
      `SEGUNDO OUTORGANTE (Cliente): ${c.name || '[Nome do Cliente]'}, com o NIF ${c.nif || '[NIF]'}, com morada em ${c.address || '[Morada]'}, neste ato representado por ${c.rep || '[Representante legal]'}, adiante designado por "Cliente".`,
      'As partes acima identificadas celebram entre si o presente Contrato de Prestação de Serviços Digitais e Licenciamento de Software em modelo SaaS (Software as a Service), que se regerá pelas cláusulas seguintes e, no omisso, pela legislação portuguesa aplicável.'
    ]},
    { n: 2, title: 'Definições', body: [
      '"Plataforma": o sistema informático e respetivo software disponibilizado pelo Fornecedor em modelo SaaS, acessível remotamente através da Internet.',
      '"Serviço": a disponibilização de acesso à Plataforma, incluindo manutenção, atualizações e suporte nos termos do presente contrato.',
      '"Licença": o direito de uso não exclusivo, intransmissível, limitado e revogável concedido ao Cliente sobre a Plataforma.',
      '"Dados do Cliente": todos os dados, conteúdos e informações introduzidos, carregados ou gerados pelo Cliente e seus Utilizadores na Plataforma.',
      '"Utilizador": cada pessoa singular autorizada pelo Cliente a aceder à Plataforma através de credenciais próprias.',
      '"Subscrição": o regime de acesso pago e recorrente à Plataforma, na periodicidade contratada.'
    ]},
    { n: 3, title: 'Objeto do Contrato', body: [
      `O presente contrato tem por objeto o fornecimento, pelo Fornecedor ao Cliente, de acesso à Plataforma "${p.product}" em modelo SaaS, mediante subscrição.`,
      'É concedida ao Cliente uma licença de uso não exclusiva, limitada, intransmissível e revogável, válida apenas durante a vigência do contrato e enquanto o Cliente cumprir as suas obrigações de pagamento.',
      'O presente contrato não implica qualquer transferência de propriedade intelectual sobre o software, concedendo unicamente o direito de acesso e utilização. O SaaS concede acesso ao Serviço, não constituindo venda de software.'
    ]},
    { n: 4, title: 'Modalidade de Licenciamento', body: [
      `A licença é concedida no regime de subscrição ${periodLabel}, sendo o acesso limitado a ${t.users || '[número]'} utilizadores/logins por entidade.`,
      'É expressamente proibido ao Cliente: (a) revender, sublicenciar, alugar ou ceder o acesso à Plataforma a terceiros; (b) realizar engenharia reversa, descompilação ou desmontagem do software; (c) copiar, reproduzir ou criar obras derivadas do sistema.',
      'O incumprimento das proibições previstas nesta cláusula constitui violação grave do contrato, conferindo ao Fornecedor o direito de rescisão imediata e de exigir indemnização.'
    ]},
    { n: 5, title: 'Preços e Pagamento', body: [
      `O valor da subscrição é de ${eur(t.value)} (${periodLabel})${t.period === 'mensal' ? `, correspondendo a ${eur(annual)} por ano` : ''}, acrescido de IVA à taxa legal em vigor.`,
      'O pagamento é efetuado de forma recorrente e antecipada, por transferência bancária, débito direto ou outro meio aceite pelo Fornecedor.',
      'A subscrição renova-se automaticamente no final de cada período, salvo cancelamento nos termos da Cláusula 6, sendo a cobrança processada automaticamente.',
      'O atraso no pagamento por período superior a 15 (quinze) dias confere ao Fornecedor o direito de suspender o acesso à Plataforma, sem prejuízo do direito ao recebimento dos valores em dívida e respetivos juros de mora à taxa legal.'
    ]},
    { n: 6, title: 'Duração, Renovação e Cancelamento', body: [
      `O contrato tem a duração inicial de ${t.minTermMonths} (${t.minTermMonths === 1 ? 'um' : t.minTermMonths}) ${t.minTermMonths === 1 ? 'mês' : 'meses'}, com início na data da sua assinatura.`,
      `Findo o período inicial, o contrato renova-se automaticamente por períodos iguais e sucessivos, salvo se qualquer das partes o denunciar mediante aviso prévio escrito de, pelo menos, ${t.noticeDays} dias relativamente ao termo do período em curso.`,
      `O cancelamento antecipado pelo Cliente durante o período mínimo de fidelização obriga ao pagamento das mensalidades remanescentes até ao termo desse período, a título de penalização.`
    ]},
    { n: 7, title: 'Nível de Serviço (SLA)', body: [
      `O Fornecedor compromete-se a envidar os melhores esforços para assegurar uma disponibilidade (uptime) da Plataforma de ${t.uptime}, em base mensal, excluindo janelas de manutenção programada previamente comunicadas.`,
      `O suporte técnico responde aos pedidos em prazo razoável, tendencialmente até ${t.supportHours}, em dias úteis.`,
      'Em caso de indisponibilidade não programada que exceda os limites acordados e seja imputável ao Fornecedor, o Cliente terá direito a créditos de serviço proporcionais, a aplicar na fatura seguinte, constituindo esta a única compensação devida.'
    ]},
    { n: 8, title: 'Obrigações do Prestador', body: [
      'Disponibilizar o acesso à Plataforma de forma contínua, nos termos do presente contrato.',
      'Garantir o funcionamento razoável e a manutenção do Serviço, bem como a disponibilização de atualizações e correções.',
      'Prestar suporte técnico ao Cliente nos canais e horários definidos.',
      'Aplicar medidas técnicas e organizativas adequadas de segurança da informação na Plataforma.'
    ]},
    { n: 9, title: 'Obrigações do Cliente', body: [
      'Utilizar a Plataforma de forma lícita e em conformidade com o presente contrato e a legislação aplicável.',
      'Não violar direitos de terceiros, incluindo direitos de propriedade intelectual e de proteção de dados.',
      'Manter a confidencialidade e segurança das credenciais de acesso dos seus Utilizadores, sendo responsável por toda a atividade realizada com as mesmas.',
      'Efetuar os pagamentos devidos dentro dos prazos acordados.'
    ]},
    { n: 10, title: 'Propriedade Intelectual', body: [
      'A Plataforma, o software, o código-fonte, a marca, o design, a documentação e toda a tecnologia associada são e permanecem propriedade exclusiva do Fornecedor (ou dos seus licenciadores).',
      'O Cliente não adquire quaisquer direitos sobre o código, a marca ou a tecnologia, para além do direito de acesso e utilização concedido pela licença.',
      'Os Dados do Cliente permanecem propriedade do Cliente, concedendo este ao Fornecedor apenas o direito de os tratar na medida necessária à prestação do Serviço.'
    ]},
    { n: 11, title: 'Proteção de Dados Pessoais (RGPD)', body: [
      'No tratamento de dados pessoais realizado no âmbito do Serviço, o Cliente atua como Responsável pelo Tratamento e o Fornecedor como Subcontratante, nos termos do artigo 28.º do Regulamento (UE) 2016/679 (RGPD).',
      'O Fornecedor trata os dados pessoais apenas de acordo com instruções documentadas do Cliente e para as finalidades estritas do Serviço.',
      'O Fornecedor implementa medidas técnicas e organizativas adequadas de segurança e obriga-se a notificar o Cliente, sem demora injustificada e no prazo máximo de 72 horas após conhecimento, de qualquer violação de dados pessoais.',
      'O Cliente tem o direito de exportar os Dados do Cliente. Após o termo do contrato, os dados pessoais serão eliminados ou devolvidos, conforme instrução do Cliente, salvo obrigação legal de conservação.'
    ]},
    { n: 12, title: 'Portabilidade e Plano de Saída (Exit Plan)', body: [
      `Durante a vigência do contrato e até ${t.exitDays} dias após o seu termo, o Cliente pode solicitar a exportação dos Dados do Cliente num formato estruturado e de uso corrente.`,
      `Decorrido o prazo de ${t.exitDays} dias após o termo do contrato, o Fornecedor procederá à eliminação definitiva dos Dados do Cliente dos seus sistemas, salvo obrigação legal em contrário.`
    ]},
    { n: 13, title: 'Confidencialidade', body: [
      'Cada parte obriga-se a manter confidencial toda a informação comercial, técnica ou de negócio a que tenha acesso por força do presente contrato.',
      'A obrigação de confidencialidade mantém-se em vigor durante a vigência do contrato e por um período de 3 (três) anos após o seu termo.'
    ]},
    { n: 14, title: 'Limitação de Responsabilidade', body: [
      `Na medida máxima permitida por lei, a responsabilidade total do Fornecedor perante o Cliente, por quaisquer danos decorrentes do contrato, fica limitada ao montante efetivamente pago pelo Cliente nos ${t.liabilityMonths} (${t.liabilityMonths}) meses anteriores ao facto que originou a responsabilidade.`,
      'O Fornecedor não responde por danos indiretos, lucros cessantes, perda de dados decorrente de facto imputável ao Cliente, ou danos resultantes de causas fora do seu controlo razoável.'
    ]},
    { n: 15, title: 'Suspensão do Serviço', body: [
      'O Fornecedor pode suspender, total ou parcialmente, o acesso à Plataforma em caso de: (a) incumprimento contratual pelo Cliente; (b) uso indevido ou ilícito da Plataforma; (c) falta de pagamento nos termos da Cláusula 5; (d) risco de segurança.',
      'Sempre que possível, a suspensão será precedida de aviso ao Cliente, sendo restabelecido o acesso após cessação da causa que a originou.'
    ]},
    { n: 16, title: 'Segurança', body: [
      'O Fornecedor adota medidas de segurança que incluem, designadamente, encriptação de dados em trânsito, controlo de acessos baseado em credenciais e perfis, e realização de cópias de segurança (backups) periódicas.',
      'O Cliente compromete-se a colaborar na manutenção da segurança, nomeadamente protegendo as credenciais de acesso dos seus Utilizadores.'
    ]},
    { n: 17, title: 'Força Maior', body: [
      'Nenhuma das partes será responsável pelo incumprimento de obrigações resultante de eventos de força maior, entendidos como factos imprevisíveis e fora do seu controlo razoável, incluindo falhas generalizadas de Internet, indisponibilidade de datacenters, catástrofes naturais, atos de autoridade ou ciberataques de larga escala.'
    ]},
    { n: 18, title: 'Rescisão', body: [
      'O contrato pode ser rescindido: (a) por qualquer das partes, em caso de incumprimento grave da outra que não seja sanado em 15 dias após interpelação escrita; (b) por mútuo acordo; (c) com efeitos imediatos pelo Fornecedor, em casos de uso ilícito, pirataria ou violação de propriedade intelectual.',
      'A rescisão não desobriga o Cliente do pagamento dos valores devidos até à data da cessação.'
    ]},
    { n: 19, title: 'Lei Aplicável e Foro', body: [
      'O presente contrato rege-se pela lei portuguesa.',
      `Para a resolução de qualquer litígio emergente do presente contrato, as partes elegem o foro da Comarca de ${t.foro}, com expressa renúncia a qualquer outro.`
    ]},
    { n: 20, title: 'Disposições Finais', body: [
      'Qualquer alteração ao presente contrato apenas é válida se efetuada por escrito e aceite por ambas as partes.',
      'A eventual invalidade ou ineficácia de qualquer cláusula não afeta a validade das restantes, que se mantêm em pleno vigor.',
      'O presente contrato representa o acordo integral entre as partes quanto ao seu objeto, prevalecendo sobre quaisquer entendimentos anteriores.'
    ]},
    // ── Extras (nível avançado) ──
    { n: 21, title: 'Uso Aceitável e Anti-Pirataria', body: [
      'O Cliente obriga-se a não utilizar a Plataforma para fins ilícitos, incluindo envio de spam, tentativas de intrusão (hacking), distribuição de malware, ou qualquer forma de abuso dos recursos do Serviço.',
      'É expressamente proibida qualquer forma de pirataria, partilha não autorizada de credenciais, ou contorno de mecanismos técnicos de licenciamento. A violação desta cláusula confere ao Fornecedor o direito de rescisão imediata e de promover os procedimentos legais aplicáveis.'
    ]},
    { n: 22, title: 'Atualizações e Melhorias', body: [
      'O Fornecedor poderá, a todo o tempo, implementar atualizações, correções e melhorias na Plataforma, com vista a otimizar o Serviço, sem custo adicional, desde que não reduzam materialmente as funcionalidades contratadas.'
    ]},
    { n: 23, title: 'Auditoria', body: [
      'O Fornecedor reserva-se o direito de auditar, por meios automáticos, a utilização da Plataforma para verificar o cumprimento dos limites de licenciamento e das obrigações contratuais, respeitando a confidencialidade e a proteção de dados.'
    ]},
    { n: 24, title: 'Bloqueio de Conta', body: [
      'O Fornecedor pode bloquear, de imediato e cautelarmente, contas ou Utilizadores sempre que detete atividade suspeita, fraudulenta ou que coloque em risco a segurança ou integridade da Plataforma ou de terceiros.'
    ]},
    { n: 25, title: 'Cobrança Automática e Reajuste de Preço', body: [
      'O Cliente autoriza a cobrança automática e recorrente do valor da subscrição no início de cada período de faturação.',
      `O valor da subscrição poderá ser revisto anualmente, mediante aviso prévio de 30 dias, até ao limite de ${t.priceReviewPct}% ou da variação do índice de preços no consumidor, consoante o que for superior.`
    ]}
  ];
}

interface ContractGeneratorProps {
  isAdmin?: boolean;
  preselectLeadId?: string | null;
}

export default function ContractGenerator({ isAdmin, preselectLeadId }: ContractGeneratorProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [enriching, setEnriching] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [provider, setProvider] = useState<ProviderData>(() => {
    try { const s = localStorage.getItem(PROVIDER_KEY); if (s) return { ...DEFAULT_PROVIDER, ...JSON.parse(s) }; } catch { /* ignore */ }
    return DEFAULT_PROVIDER;
  });
  const [client, setClient] = useState<ClientData>({ name: '', nif: '', address: '', rep: '', email: '' });
  const [terms, setTerms] = useState<Terms>({
    value: 149, period: 'mensal', users: 'ilimitados por propriedade', uptime: '99,5%',
    supportHours: '24 horas úteis', minTermMonths: 12, noticeDays: 30, liabilityMonths: 12,
    exitDays: 30, priceReviewPct: 5, foro: 'Lisboa'
  });

  useEffect(() => {
    hotelDb.getAllHotels().then((rows) => setLeads(rows)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem(PROVIDER_KEY, JSON.stringify(provider)); }, [provider]);

  // pre-seleciona o cliente quando aberto a partir do Play Mode / ficha do lead
  useEffect(() => {
    if (preselectLeadId && leads.length) {
      const l = leads.find((x) => x.id === preselectLeadId);
      if (l && l.id !== selectedId) selectLead(l);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectLeadId, leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return leads.filter((l) => l.companyName.toLowerCase().includes(q)).slice(0, 8);
  }, [query, leads]);

  const selectLead = (l: Lead) => {
    setSelectedId(l.id);
    setQuery(l.companyName);
    setClient({
      name: l.companyName,
      nif: l.nif || '',
      address: l.location || '',
      rep: l.contactPerson || '',
      email: l.email || ''
    });
    if (l.dealValue) setTerms((t) => ({ ...t, value: l.dealValue! }));
    setGenerated(false);
  };

  const selectedLead = leads.find((l) => l.id === selectedId);

  const handleEnrich = async () => {
    if (!selectedLead) return;
    setEnriching(true);
    try {
      const res = await fetch('/api/places/enrich', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedLead.companyName, location: selectedLead.location })
      });
      const data = await res.json();
      if (data.found) {
        setClient((c) => ({ ...c, address: c.address || data.address || c.address }));
      }
    } catch { /* ignore */ } finally { setEnriching(false); }
  };

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!client.nif) m.push('NIF do cliente');
    if (!client.address) m.push('Morada');
    if (!client.rep) m.push('Representante legal');
    if (!provider.nif) m.push('NIF do fornecedor');
    if (!provider.sede) m.push('Sede do fornecedor');
    return m;
  }, [client, provider]);

  const clauses = useMemo(() => buildClauses(provider, client, terms), [provider, client, terms]);

  const printContract = () => {
    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><title>Contrato — ${client.name}</title>
      <style>
        @page { size: A4; margin: 22mm 18mm; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #111; font-size: 11pt; line-height: 1.5; }
        h1 { font-size: 16pt; text-align: center; margin: 0 0 4px; }
        .sub { text-align: center; color: #555; font-size: 10pt; margin-bottom: 24px; }
        h2 { font-size: 12pt; margin: 18px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
        p { margin: 0 0 8px; text-align: justify; }
        .sign { margin-top: 48px; display: flex; justify-content: space-between; gap: 40px; }
        .sign div { flex: 1; text-align: center; }
        .line { margin-top: 40px; border-top: 1px solid #000; padding-top: 6px; font-size: 10pt; }
        .disc { margin-top: 32px; font-size: 9pt; font-style: italic; color: #777; border-top: 1px dashed #bbb; padding-top: 10px; }
      </style></head><body>
      <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DIGITAIS E LICENCIAMENTO DE SOFTWARE (SaaS)</h1>
      <div class="sub">${provider.product} · Celebrado em ${today()}</div>
      ${clauses.map((cl) => `<h2>Cláusula ${cl.n}.ª — ${cl.title}</h2>${cl.body.map((b) => `<p>${b}</p>`).join('')}`).join('')}
      <div class="sign">
        <div><div class="line">O Fornecedor<br>${provider.name}</div></div>
        <div><div class="line">O Cliente<br>${client.name || ''}</div></div>
      </div>
      <p class="disc">Este documento é um modelo e deve ser validado por um advogado antes do uso comercial.</p>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para abrir o contrato.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  if (!isAdmin) {
    return <div className="rounded-lg border border-gray-800 bg-ai-card p-8 text-center text-sm text-gray-400">Apenas administradores podem gerar contratos.</div>;
  }

  const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none';
  const lbl = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><FileSignature className="h-5 w-5 text-emerald-500" /> Gerador de Contratos SaaS</h2>
        <p className="mt-1 text-xs text-gray-400">Pesquise o cliente, complete os dados em falta e gere um contrato profissional (PT-PT, RGPD).</p>
      </div>

      {/* 1. Pesquisa do cliente */}
      <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
        <label className={lbl}>1. Procurar cliente pelo nome</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedId(''); }}
            placeholder="Escreva o nome do hotel/cliente..."
            className={`${inputCls} pl-9`}
          />
          {filtered.length > 0 && !selectedId && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
              {filtered.map((l) => (
                <button key={l.id} onClick={() => selectLead(l)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800">
                  <span>{l.companyName}</span>
                  <span className="text-[11px] text-gray-500">{l.location}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {loading && <p className="mt-2 text-[11px] text-gray-500">A carregar clientes...</p>}
      </div>

      {selectedId && (
        <>
          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-bold">Dados em falta:</span> {missing.join(', ')}.
                <span className="text-amber-400/80"> Preencha abaixo antes de gerar (NIF não vem do Google — tem de ser manual).</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 2. Dados do cliente */}
            <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">2. Dados do Cliente</h3>
                <button onClick={handleEnrich} disabled={enriching} className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 transition hover:bg-indigo-500/20 disabled:opacity-50">
                  {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Enriquecer
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className={lbl}>Nome / Designação</span><input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} className={inputCls} /></label>
                <label><span className={lbl}>NIF</span><input value={client.nif} onChange={(e) => setClient({ ...client, nif: e.target.value })} className={inputCls} placeholder="obrigatório" /></label>
                <label><span className={lbl}>Email</span><input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><span className={lbl}>Morada / Sede</span><input value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><span className={lbl}>Representante legal</span><input value={client.rep} onChange={(e) => setClient({ ...client, rep: e.target.value })} className={inputCls} placeholder="Nome e cargo" /></label>
              </div>
            </div>

            {/* Fornecedor */}
            <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Dados do Fornecedor (a sua empresa — guardado)</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className={lbl}>Nome / Designação</span><input value={provider.name} onChange={(e) => setProvider({ ...provider, name: e.target.value })} className={inputCls} /></label>
                <label><span className={lbl}>NIF</span><input value={provider.nif} onChange={(e) => setProvider({ ...provider, nif: e.target.value })} className={inputCls} /></label>
                <label><span className={lbl}>Email</span><input value={provider.email} onChange={(e) => setProvider({ ...provider, email: e.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><span className={lbl}>Sede</span><input value={provider.sede} onChange={(e) => setProvider({ ...provider, sede: e.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><span className={lbl}>Representante legal</span><input value={provider.rep} onChange={(e) => setProvider({ ...provider, rep: e.target.value })} className={inputCls} /></label>
                <label className="sm:col-span-2"><span className={lbl}>Produto / Plataforma</span><input value={provider.product} onChange={(e) => setProvider({ ...provider, product: e.target.value })} className={inputCls} /></label>
              </div>
            </div>
          </div>

          {/* 3. Termos da subscrição */}
          <div className="rounded-lg border border-gray-800 bg-ai-card p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">3. Termos da Subscrição</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label><span className={lbl}>Valor (€)</span><input type="number" value={terms.value} onChange={(e) => setTerms({ ...terms, value: Number(e.target.value) })} className={`${inputCls} font-mono`} /></label>
              <label><span className={lbl}>Periodicidade</span><select value={terms.period} onChange={(e) => setTerms({ ...terms, period: e.target.value as Terms['period'] })} className={inputCls}><option value="mensal">Mensal</option><option value="anual">Anual</option></select></label>
              <label><span className={lbl}>Utilizadores</span><input value={terms.users} onChange={(e) => setTerms({ ...terms, users: e.target.value })} className={inputCls} /></label>
              <label><span className={lbl}>Uptime (SLA)</span><input value={terms.uptime} onChange={(e) => setTerms({ ...terms, uptime: e.target.value })} className={inputCls} /></label>
              <label><span className={lbl}>Período mínimo (meses)</span><input type="number" value={terms.minTermMonths} onChange={(e) => setTerms({ ...terms, minTermMonths: Number(e.target.value) })} className={inputCls} /></label>
              <label><span className={lbl}>Aviso prévio (dias)</span><input type="number" value={terms.noticeDays} onChange={(e) => setTerms({ ...terms, noticeDays: Number(e.target.value) })} className={inputCls} /></label>
              <label><span className={lbl}>Resp. limitada (meses)</span><input type="number" value={terms.liabilityMonths} onChange={(e) => setTerms({ ...terms, liabilityMonths: Number(e.target.value) })} className={inputCls} /></label>
              <label><span className={lbl}>Reajuste anual (%)</span><input type="number" value={terms.priceReviewPct} onChange={(e) => setTerms({ ...terms, priceReviewPct: Number(e.target.value) })} className={inputCls} /></label>
              <label><span className={lbl}>Saída/eliminação dados (dias)</span><input type="number" value={terms.exitDays} onChange={(e) => setTerms({ ...terms, exitDays: Number(e.target.value) })} className={inputCls} /></label>
              <label><span className={lbl}>Suporte (resposta)</span><input value={terms.supportHours} onChange={(e) => setTerms({ ...terms, supportHours: e.target.value })} className={inputCls} /></label>
              <label><span className={lbl}>Foro</span><input value={terms.foro} onChange={(e) => setTerms({ ...terms, foro: e.target.value })} className={inputCls} /></label>
            </div>
          </div>

          {/* Acções */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setGenerated(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500">
              <Sparkles className="h-4 w-4" /> Gerar pré-visualização
            </button>
            <button onClick={printContract} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-5 py-2.5 text-sm font-bold text-gray-200 transition hover:bg-gray-700">
              <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
            </button>
          </div>

          {/* Pré-visualização */}
          {generated && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-gray-900 shadow-xl">
              <h1 className="text-center text-lg font-bold">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DIGITAIS E LICENCIAMENTO DE SOFTWARE (SaaS)</h1>
              <p className="mb-6 text-center text-xs text-gray-500">{provider.product} · Celebrado em {today()}</p>
              <div className="space-y-4">
                {clauses.map((cl) => (
                  <div key={cl.n}>
                    <h2 className="border-b border-gray-200 pb-1 text-sm font-bold text-gray-800">Cláusula {cl.n}.ª — {cl.title}</h2>
                    {cl.body.map((b, i) => <p key={i} className="mt-1.5 text-justify text-[13px] leading-relaxed text-gray-700">{b}</p>)}
                  </div>
                ))}
              </div>
              <div className="mt-12 flex justify-between gap-10 text-center text-xs">
                <div className="flex-1 border-t border-gray-800 pt-2">O Fornecedor<br />{provider.name}</div>
                <div className="flex-1 border-t border-gray-800 pt-2">O Cliente<br />{client.name}</div>
              </div>
              <p className="mt-8 border-t border-dashed border-gray-300 pt-3 text-[11px] italic text-gray-500">
                Este documento é um modelo e deve ser validado por um advogado antes do uso comercial.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
