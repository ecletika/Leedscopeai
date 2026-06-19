import React, { useMemo, useState } from 'react';
import { Check, Copy, Loader2, Mail, MessageCircle, MessagesSquare, Send, X } from 'lucide-react';
import { Lead } from '../types';
import { sendTemplateEmail } from '../services/emailService';

interface MessageTemplatesProps {
  lead: Lead;
  onClose: () => void;
  sellerId?: string;
}

type Channel = 'email' | 'whatsapp' | 'linkedin';

interface Template {
  key: string;
  label: string;
  channel: Channel;
  subject?: (l: Lead, name: string) => string;
  body: (l: Lead, name: string) => string;
}

const firstName = (lead: Lead): string => {
  const raw = (lead.contactPerson || '').trim();
  if (!raw) return '';
  return raw.split(/\s+/)[0];
};

const greet = (name: string) => (name ? `Ola ${name},` : 'Ola,');

const TEMPLATES: Template[] = [
  {
    key: 'intro_email_formal',
    label: 'Email de apresentacao (formal)',
    channel: 'email',
    subject: (l) => `SOL — coordenacao de housekeeping para o ${l.companyName}`,
    body: (l, n) => `${greet(n)}\n\nO meu nome e [SEU NOME] e falo da SOL. Ajudamos hoteis independentes a coordenar housekeeping, rececao e manutencao em tempo real: mapa de quartos ao vivo, checklists, inspecoes e tickets de manutencao.\n\nMuitos hoteis com a dimensao do ${l.companyName} resolvem assim os quartos prontos tarde, a comunicacao dispersa por WhatsApp e a falta de historico nas tarefas.\n\nFaria sentido marcarmos uma apresentacao rapida de 15 a 20 minutos para mostrar como funciona na pratica?\n\nObrigado,\n[SEU NOME] — SOL`
  },
  {
    key: 'intro_email_curto',
    label: 'Email de apresentacao (curto)',
    channel: 'email',
    subject: (l) => `Ideia rapida para o housekeeping do ${l.companyName}`,
    body: (l, n) => `${greet(n)}\n\nFalo da SOL. Em 15 minutos mostro como o ${l.companyName} pode ter o estado dos quartos em tempo real, checklists e manutencao organizada — sem depender de WhatsApp.\n\nTem disponibilidade esta semana?\n\n[SEU NOME] — SOL`
  },
  {
    key: 'whatsapp_intro',
    label: 'WhatsApp — primeiro contacto',
    channel: 'whatsapp',
    body: (l, n) => `${greet(n)} falo da SOL. Ajudamos hoteis a organizar housekeeping e manutencao em tempo real. Posso mostrar ao ${l.companyName} numa apresentacao rapida de 15-20 min? Que dia lhe e mais comodo?`
  },
  {
    key: 'linkedin',
    label: 'LinkedIn — abordagem',
    channel: 'linkedin',
    body: (l, n) => `${greet(n)} vi que faz parte do ${l.companyName}. Na SOL ajudamos equipas de housekeeping e manutencao a trabalharem em tempo real, sem papel nem WhatsApp disperso. Fazia sentido trocarmos uma ideia rapida?`
  },
  {
    key: 'pos_demo',
    label: 'Email pos-demo',
    channel: 'email',
    subject: (l) => `Seguimento da apresentacao SOL — ${l.companyName}`,
    body: (l, n) => `${greet(n)}\n\nObrigado pelo tempo na apresentacao de hoje. Como combinado, fica o resumo do que o SOL pode trazer ao ${l.companyName}: estado dos quartos em tempo real, checklists padronizadas, inspecoes e tickets de manutencao com historico.\n\nQual seria o melhor proximo passo do vosso lado?\n\n[SEU NOME] — SOL`
  },
  {
    key: 'reenvio',
    label: 'Reenvio (sem resposta)',
    channel: 'email',
    subject: (l) => `Ainda faz sentido falarmos, ${l.companyName}?`,
    body: (l, n) => `${greet(n)}\n\nSo a confirmar se recebeu a minha mensagem anterior. Continuo a achar que o SOL pode ajudar o ${l.companyName} na organizacao do housekeeping e manutencao.\n\nSe preferir, indico-lhe dois horarios esta semana para uma conversa rapida. Fico ao dispor.\n\n[SEU NOME] — SOL`
  },
  {
    key: 'whatsapp_reagendar',
    label: 'WhatsApp — reagendar',
    channel: 'whatsapp',
    body: (l, n) => `${greet(n)} aqui da SOL. Ficou pendente a nossa apresentacao ao ${l.companyName}. Prefere amanha de manha ou ao final do dia?`
  }
];

const channelMeta: Record<Channel, { label: string; tone: string }> = {
  email: { label: 'Email', tone: 'text-sky-300' },
  whatsapp: { label: 'WhatsApp', tone: 'text-green-300' },
  linkedin: { label: 'LinkedIn', tone: 'text-blue-300' }
};

export default function MessageTemplates({ lead, onClose, sellerId }: MessageTemplatesProps) {
  const name = firstName(lead);
  const [activeKey, setActiveKey] = useState(TEMPLATES[0].key);
  const active = useMemo(() => TEMPLATES.find((t) => t.key === activeKey) || TEMPLATES[0], [activeKey]);

  const initialSubject = active.subject ? active.subject(lead, name) : '';
  const initialBody = active.body(lead, name);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  const selectTemplate = (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key) || TEMPLATES[0];
    setActiveKey(key);
    setSubject(t.subject ? t.subject(lead, name) : '');
    setBody(t.body(lead, name));
    setCopied(false);
    setSendStatus('idle');
    setSendError('');
  };

  const handleSendEmail = async () => {
    if (!lead.email) return;
    setSending(true);
    setSendStatus('idle');
    setSendError('');
    const result = await sendTemplateEmail({
      to: lead.email,
      toName: lead.contactPerson || lead.companyName,
      subject,
      body,
      leadId: lead.id,
      sellerId,
      hotelName: lead.companyName,
    });
    setSending(false);
    if (result.success) {
      setSendStatus('sent');
    } else {
      setSendStatus('error');
      setSendError(result.error || 'Erro desconhecido');
    }
  };

  const handleCopy = async () => {
    const text = active.channel === 'email' && subject ? `Assunto: ${subject}\n\n${body}` : body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const emailHref = `mailto:${lead.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const whatsappHref = `https://wa.me/${(lead.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-800 bg-ai-card shadow-2xl">
        {/* lista */}
        <aside className="w-60 shrink-0 border-r border-gray-800 bg-ai-dark/40 p-3">
          <h3 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400"><MessagesSquare className="h-4 w-4 text-emerald-400" /> Templates</h3>
          <div className="space-y-1">
            {TEMPLATES.map((t) => (
              <button key={t.key} onClick={() => selectTemplate(t.key)} className={`w-full rounded-md px-2.5 py-2 text-left text-[11px] font-semibold transition ${activeKey === t.key ? 'bg-emerald-600/10 text-emerald-300' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <span className={`mr-1 text-[9px] uppercase ${channelMeta[t.channel].tone}`}>{channelMeta[t.channel].label}</span>
                <div className="mt-0.5">{t.label}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* editor */}
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
            <div>
              <h2 className="text-sm font-bold text-white">{active.label}</h2>
              <p className="text-[11px] text-gray-500">{lead.companyName}{name ? ` · ${name}` : ''}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {active.channel === 'email' && (
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Assunto</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none" />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Mensagem (editavel — substitua [SEU NOME])</span>
              <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-ai-dark p-3 text-xs leading-relaxed text-white focus:border-emerald-500 focus:outline-none" />
            </label>
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-gray-800 px-5 py-3">
            {/* feedback de envio */}
            <div className="text-xs">
              {sendStatus === 'sent' && (
                <span className="flex items-center gap-1.5 text-emerald-400"><Check className="h-4 w-4" /> Email enviado e registado no CRM</span>
              )}
              {sendStatus === 'error' && (
                <span className="text-rose-400">{sendError}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-gray-700">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar'}
              </button>

              {active.channel === 'email' && lead.email && (
                <>
                  {/* fallback: abrir no cliente de email */}
                  <a href={emailHref} className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-gray-700" title="Abrir no cliente de email">
                    <Mail className="h-4 w-4" /> Abrir
                  </a>
                  {/* envio direto via Brevo */}
                  <button
                    onClick={handleSendEmail}
                    disabled={sending || sendStatus === 'sent'}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:opacity-60 ${sendStatus === 'sent' ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                  >
                    {sending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> A enviar...</>
                      : sendStatus === 'sent'
                        ? <><Check className="h-4 w-4" /> Enviado</>
                        : <><Send className="h-4 w-4" /> Enviar via Brevo</>
                    }
                  </button>
                </>
              )}

              {(active.channel === 'whatsapp' || active.channel === 'linkedin') && lead.phone && (
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-500">
                  <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                </a>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
