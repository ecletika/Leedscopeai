import React, { useEffect, useState, useCallback } from 'react';
import {
  Inbox, Send, RefreshCw, Mail, MailOpen, X, ChevronLeft,
  AlertCircle, PenSquare, Folder, FolderPlus, Check, Loader2,
  Paperclip, User,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

interface EmailData {
  type: 'received' | 'sent';
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt?: string;
  sentAt?: string;
  hotelName?: string;
}

interface EmailFolder {
  id: string;
  name: string;
  kind: 'inbox' | 'sent' | 'custom';
  driveId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SYSTEM_FOLDERS: EmailFolder[] = [
  { id: 'inbox', name: 'Recebidos', kind: 'inbox' },
  { id: 'sent',  name: 'Enviados',  kind: 'sent'  },
];

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

function parseName(filename: string) {
  // filename: 2026-06-20T14-30-00-000Z_gerente.json
  const noExt = filename.replace(/\.json$/, '');
  const parts = noExt.split('_');
  const sender = parts.slice(1).join('_').replace(/-/g, '.') || 'desconhecido';
  return sender;
}

// ── Main Component ────────────────────────────────────────────────────────────

interface EmailInboxProps {
  sellerId: string;
}

export function EmailInbox({ sellerId }: EmailInboxProps) {
  const [folders, setFolders] = useState<EmailFolder[]>(SYSTEM_FOLDERS);
  const [activeFolder, setActiveFolder] = useState<EmailFolder>(SYSTEM_FOLDERS[0]);
  const [emails, setEmails] = useState<DriveFile[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [openEmail, setOpenEmail] = useState<EmailData | null>(null);
  const [loadingOpen, setLoadingOpen] = useState(false);

  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState('');
  const [compSubject, setCompSubject] = useState('');
  const [compBody, setCompBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // ── Load custom folders ────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch(`/api/emails/folders?sellerId=${sellerId}`);
      if (!res.ok) return;
      const custom = await res.json() as { id: string; name: string }[];
      setFolders([
        ...SYSTEM_FOLDERS,
        ...custom.map((f) => ({ id: f.id, name: f.name, kind: 'custom' as const, driveId: f.id })),
      ]);
    } catch { /* ignore */ }
  }, [sellerId]);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  // ── Load emails ────────────────────────────────────────────────────────────

  const loadEmails = useCallback(async () => {
    setLoadingEmails(true);
    setEmailError('');
    setOpenEmail(null);
    setComposing(false);
    try {
      let url = '';
      if (activeFolder.kind === 'inbox') url = `/api/emails/inbox?sellerId=${sellerId}`;
      else if (activeFolder.kind === 'sent') url = `/api/emails/sent?sellerId=${sellerId}`;
      else url = `/api/emails/folder/${activeFolder.driveId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Erro ao carregar'); setEmails([]); }
      else setEmails(Array.isArray(data) ? data : []);
    } catch { setEmailError('Sem ligação ao servidor'); setEmails([]); }
    finally { setLoadingEmails(false); }
  }, [activeFolder, sellerId]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  // ── Open email ─────────────────────────────────────────────────────────────

  const openEmailFile = async (fileId: string) => {
    setLoadingOpen(true);
    setOpenEmail(null);
    setComposing(false);
    try {
      const res = await fetch(`/api/emails/${fileId}`);
      setOpenEmail(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingOpen(false); }
  };

  // ── Send email ─────────────────────────────────────────────────────────────

  const sendEmail = async () => {
    if (!to.trim() || !compSubject.trim() || !compBody.trim()) return;
    setSending(true);
    setSendStatus('idle');
    setSendError('');
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: compSubject, body: compBody, sellerId }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setSendStatus('sent');
        setTimeout(() => {
          setComposing(false);
          setSendStatus('idle');
          setTo(''); setCompSubject(''); setCompBody('');
        }, 2000);
      } else {
        setSendStatus('error');
        setSendError(data.error || 'Erro ao enviar');
      }
    } catch { setSendStatus('error'); setSendError('Servidor offline'); }
    finally { setSending(false); }
  };

  // ── Create folder ─────────────────────────────────────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/emails/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, name: newFolderName.trim() }),
      });
      if (res.ok) {
        setNewFolderName('');
        setShowNewFolder(false);
        await loadFolders();
      }
    } catch { /* ignore */ }
    setCreatingFolder(false);
  };

  // ── Select folder ─────────────────────────────────────────────────────────

  const selectFolder = (f: EmailFolder) => {
    setActiveFolder(f);
    setOpenEmail(null);
    setComposing(false);
  };

  const startCompose = () => {
    setComposing(true);
    setOpenEmail(null);
    setSendStatus('idle');
    setSendError('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: Folders ─────────────────────────────────────────────────── */}
      <aside className="w-48 shrink-0 flex flex-col border-r border-gray-800 bg-ai-dark/30">
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={startCompose}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition"
          >
            <PenSquare className="h-4 w-4" /> Novo Email
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* System folders */}
          {SYSTEM_FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFolder(f)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeFolder.id === f.id
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              {f.kind === 'inbox' ? <Inbox className="h-3.5 w-3.5 shrink-0" /> : <Send className="h-3.5 w-3.5 shrink-0" />}
              {f.name}
            </button>
          ))}

          {/* Custom folders */}
          {folders.filter((f) => f.kind === 'custom').length > 0 && (
            <>
              <div className="pt-3 pb-1 px-3 text-[9px] uppercase tracking-widest text-gray-600">Pastas</div>
              {folders.filter((f) => f.kind === 'custom').map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectFolder(f)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    activeFolder.id === f.id
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
                  }`}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </>
          )}

          {/* New folder */}
          <div className="pt-2">
            {showNewFolder ? (
              <div className="px-1 space-y-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                  placeholder="Nome da pasta"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={createFolder}
                    disabled={creatingFolder}
                    className="flex-1 py-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition disabled:opacity-50"
                  >
                    {creatingFolder ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Criar'}
                  </button>
                  <button
                    onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                    className="flex-1 py-1.5 text-[10px] bg-gray-800 text-gray-300 rounded font-bold hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolder(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-gray-500 hover:text-gray-300 transition rounded-lg hover:bg-gray-800/30"
              >
                <FolderPlus className="h-3.5 w-3.5" /> Nova Pasta
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Middle: Email list ────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-xs font-bold text-white">{activeFolder.name}</span>
          <button onClick={loadEmails} className="text-gray-500 hover:text-white transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingEmails ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingEmails && (
            <div className="flex items-center justify-center py-10 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> A carregar...
            </div>
          )}
          {!loadingEmails && emailError && (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <AlertCircle className="h-6 w-6 text-rose-400" />
              <p className="text-xs text-rose-400">{emailError}</p>
            </div>
          )}
          {!loadingEmails && !emailError && emails.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-14">
              <MailOpen className="h-10 w-10 text-gray-700" />
              <p className="text-xs text-gray-500">Nenhum email</p>
            </div>
          )}
          {!loadingEmails && !emailError && emails.map((f) => (
            <button
              key={f.id}
              onClick={() => openEmailFile(f.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-800/40 hover:bg-gray-800/30 transition ${
                loadingOpen ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-white truncate">{parseName(f.name)}</span>
                <span className="text-[9px] text-gray-500 shrink-0 mt-0.5">{formatDate(f.createdTime)}</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">{f.name.replace(/\.json$/, '').split('_').slice(2).join(' ') || f.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Viewer / Compose ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Empty state */}
        {!composing && !openEmail && !loadingOpen && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Mail className="h-14 w-14 text-gray-800" />
            <p className="text-sm text-gray-600">Selecciona um email ou escreve um novo</p>
            <button
              onClick={startCompose}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition mt-2"
            >
              <PenSquare className="h-4 w-4" /> Novo Email
            </button>
          </div>
        )}

        {/* Loading email */}
        {loadingOpen && (
          <div className="flex flex-1 items-center justify-center text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> A abrir...
          </div>
        )}

        {/* Email viewer */}
        {!composing && openEmail && !loadingOpen && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Email header */}
            <div className="border-b border-gray-800 px-6 py-4 bg-ai-dark/20 shrink-0">
              <h2 className="text-base font-bold text-white mb-2">{openEmail.subject || '(sem assunto)'}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-[11px] text-gray-400"><span className="text-gray-600">De:</span> {openEmail.from}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-[11px] text-gray-400"><span className="text-gray-600">Para:</span> {openEmail.to}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-[11px] text-gray-400">{formatDate(openEmail.receivedAt || openEmail.sentAt)}</span>
                </div>
                {openEmail.hotelName && (
                  <span className="text-[11px] text-emerald-500 font-semibold">{openEmail.hotelName}</span>
                )}
              </div>
            </div>
            {/* Email body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-200">
                {openEmail.body}
              </pre>
            </div>
            {/* Quick reply button */}
            <div className="border-t border-gray-800 px-6 py-3 shrink-0">
              <button
                onClick={() => {
                  setTo(openEmail.from);
                  setCompSubject(`Re: ${openEmail.subject}`);
                  setCompBody('');
                  setComposing(true);
                  setOpenEmail(null);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-emerald-500/40 hover:bg-emerald-600/10 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition"
              >
                <PenSquare className="h-3.5 w-3.5" /> Responder
              </button>
            </div>
          </div>
        )}

        {/* Compose form */}
        {composing && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Compose header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3 bg-ai-dark/20 shrink-0">
              <span className="text-sm font-bold text-white">Novo Email</span>
              <button onClick={() => setComposing(false)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Compose fields */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* To field */}
              <div className="flex items-center gap-3 border-b border-gray-800 px-6 py-3">
                <span className="text-[11px] font-bold text-gray-500 w-16 shrink-0">Para</span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="email@destino.com"
                  type="email"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              {/* Subject field */}
              <div className="flex items-center gap-3 border-b border-gray-800 px-6 py-3">
                <span className="text-[11px] font-bold text-gray-500 w-16 shrink-0">Assunto</span>
                <input
                  value={compSubject}
                  onChange={(e) => setCompSubject(e.target.value)}
                  placeholder="Assunto do email"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              {/* Body */}
              <textarea
                value={compBody}
                onChange={(e) => setCompBody(e.target.value)}
                placeholder="Escreve a tua mensagem aqui..."
                className="flex-1 resize-none bg-transparent px-6 py-4 text-sm text-white placeholder-gray-600 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Send bar */}
            <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between shrink-0 bg-ai-dark/20">
              <div className="text-xs">
                {sendStatus === 'sent' && (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Check className="h-4 w-4" /> Email enviado com sucesso
                  </span>
                )}
                {sendStatus === 'error' && (
                  <span className="text-rose-400">{sendError}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setComposing(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white border border-gray-700 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendEmail}
                  disabled={sending || sendStatus === 'sent' || !to || !compSubject || !compBody}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> A enviar...</>
                    : sendStatus === 'sent'
                      ? <><Check className="h-4 w-4" /> Enviado</>
                      : <><Send className="h-4 w-4" /> Enviar</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
