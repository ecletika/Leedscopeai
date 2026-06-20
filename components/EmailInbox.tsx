import React, { useEffect, useState } from 'react';
import { Inbox, Send, RefreshCw, Mail, MailOpen, X, ChevronLeft, AlertCircle } from 'lucide-react';

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
  read: boolean;
  hotelName?: string;
}

type Tab = 'inbox' | 'sent';

interface EmailInboxProps {
  sellerId: string;
  onClose: () => void;
}

export function EmailInbox({ sellerId, onClose }: EmailInboxProps) {
  const [tab, setTab] = useState<Tab>('inbox');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openEmail, setOpenEmail] = useState<EmailData | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = tab === 'inbox' ? '/api/emails/inbox' : '/api/emails/sent';
      const res = await fetch(`${endpoint}?sellerId=${sellerId}`);
      const data = await res.json() as DriveFile[] | { error: string };
      if (!res.ok) {
        setError((data as { error: string }).error || 'Erro ao carregar emails');
        setFiles([]);
      } else {
        setFiles(data as DriveFile[]);
      }
    } catch {
      setError('Servidor offline ou sem ligação ao Drive');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [tab, sellerId]);

  const openFile = async (fileId: string) => {
    setLoadingEmail(true);
    setOpenEmail(null);
    try {
      const res = await fetch(`/api/emails/${fileId}`);
      const data = await res.json() as EmailData;
      setOpenEmail(data);
    } catch {
      setError('Não foi possível abrir o email');
    } finally {
      setLoadingEmail(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-PT', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const extractSubjectFromName = (name: string) => {
    // name format: 2026-06-20T14-30-00-000Z_gerente.json
    return name.replace(/\.json$/, '').replace(/^\d{4}-\d{2}-\d{2}T[\d-]+Z_/, '').replace(/_/g, ' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-800 bg-ai-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-ai-dark/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Caixa de Email</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-ai-dark/40">
          {(['inbox', 'sent'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setOpenEmail(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition ${
                tab === t
                  ? 'border-b-2 border-emerald-400 text-emerald-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'inbox' ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {t === 'inbox' ? 'Recebidos' : 'Enviados'}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lista de emails */}
          <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-gray-800">
            {loading && (
              <div className="flex flex-1 items-center justify-center py-12 text-xs text-gray-500">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> A carregar...
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-rose-400" />
                <p className="text-xs text-rose-400">{error}</p>
              </div>
            )}
            {!loading && !error && files.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
                <MailOpen className="h-10 w-10 text-gray-700" />
                <p className="text-xs text-gray-500">
                  {tab === 'inbox' ? 'Nenhum email recebido' : 'Nenhum email enviado'}
                </p>
              </div>
            )}
            {!loading && !error && files.map((f) => (
              <button
                key={f.id}
                onClick={() => openFile(f.id)}
                className={`flex flex-col gap-0.5 border-b border-gray-800/60 px-4 py-3 text-left transition hover:bg-gray-800/40 ${
                  openEmail && loadingEmail ? 'opacity-60' : ''
                }`}
              >
                <span className="truncate text-[11px] font-semibold text-white">
                  {extractSubjectFromName(f.name)}
                </span>
                <span className="text-[10px] text-gray-500">
                  {formatDate(f.createdTime)}
                </span>
              </button>
            ))}
          </div>

          {/* Conteúdo do email */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            {loadingEmail && (
              <div className="flex flex-1 items-center justify-center py-12 text-xs text-gray-500">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> A abrir email...
              </div>
            )}
            {!loadingEmail && !openEmail && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-gray-600">
                <Mail className="h-12 w-12 opacity-20" />
                <p className="text-xs">Seleciona um email para ler</p>
              </div>
            )}
            {!loadingEmail && openEmail && (
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-start gap-3">
                  <button onClick={() => setOpenEmail(null)} className="mt-0.5 text-gray-500 hover:text-white">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white">{openEmail.subject || '(sem assunto)'}</h3>
                    <div className="mt-1 space-y-0.5 text-[11px] text-gray-400">
                      <p><span className="text-gray-500">De:</span> {openEmail.from}</p>
                      <p><span className="text-gray-500">Para:</span> {openEmail.to}</p>
                      <p><span className="text-gray-500">Data:</span> {formatDate(openEmail.receivedAt || openEmail.sentAt)}</p>
                      {openEmail.hotelName && (
                        <p><span className="text-gray-500">Hotel:</span> {openEmail.hotelName}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-ai-dark/40 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-200">
                    {openEmail.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
