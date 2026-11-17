import React, { useEffect, useState } from 'react';
import { ExternalLink, Linkedin, Loader2, Mail, Phone, Plus, Search, ShieldAlert, User, X } from 'lucide-react';
import { CrmContact, Lead } from '../types';
import { crmDb } from '../services/crmDb';
import {
  FoundPerson,
  PeopleSearchResult,
  findPeopleOnWebsite,
  linkedinPeopleSearchUrl,
  roleToContactType,
  splitRoles
} from '../services/peopleFinder';

interface PeopleFinderModalProps {
  lead: Lead;
  website?: string;
  /** Cargos-alvo sugeridos (ex.: "Gerente / Proprietário") */
  targetRoles: string;
  existingContacts: CrmContact[];
  onClose: () => void;
  onChanged: () => void;
}

const confidenceLabel: Record<FoundPerson['confidence'], { text: string; tone: string }> = {
  probable: { text: 'Provável', tone: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  unverified: { text: 'Não verificado', tone: 'border-amber-300 bg-amber-50 text-amber-700' }
};

const inputClass = 'rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none';

export default function PeopleFinderModal({ lead, website, targetRoles, existingContacts, onClose, onChanged }: PeopleFinderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PeopleSearchResult | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  // formulario manual (inclui o link de perfil LinkedIn colado pelo vendedor)
  const [mName, setMName] = useState('');
  const [mRole, setMRole] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mLinkedin, setMLinkedin] = useState('');

  const roles = splitRoles(targetRoles);

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await findPeopleOnWebsite(lead.companyName, website));
    } catch (e: any) {
      setError(e.message || 'Erro ao procurar pessoas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);

  const alreadyHas = (name?: string, email?: string) =>
    existingContacts.some((c) =>
      (name && c.name && c.name.toLowerCase() === name.toLowerCase()) ||
      (email && c.email && c.email.toLowerCase() === email.toLowerCase())
    );

  const saveContact = async (key: string, contact: Omit<CrmContact, 'id' | 'leadId' | 'isPrimaryDecisionMaker' | 'status'>) => {
    await crmDb.saveContact({
      id: crypto.randomUUID(),
      leadId: lead.id,
      status: 'unknown',
      isPrimaryDecisionMaker: false,
      ...contact
    });
    setSavedKeys((prev) => new Set(prev).add(key));
    onChanged();
  };

  const addPerson = (p: FoundPerson) =>
    saveContact(`p:${p.name}`, {
      name: p.name,
      role: p.role,
      contactType: roleToContactType(p.role),
      email: p.email,
      phone: p.phone,
      notes: `Fonte: website (${p.sourceUrl}) · Confiança: ${confidenceLabel[p.confidence].text}${p.evidence ? ` · "${p.evidence}"` : ''}`
    });

  const addEmail = (email: string, sourceUrl: string) =>
    saveContact(`e:${email}`, {
      contactType: 'other',
      email,
      notes: `Email público no website (${sourceUrl}). Confiança: Provável`
    });

  const addManual = async () => {
    if (!mName.trim() && !mEmail.trim() && !mLinkedin.trim()) return;
    await saveContact(`m:${Date.now()}`, {
      name: mName.trim() || undefined,
      role: mRole.trim() || undefined,
      contactType: roleToContactType(mRole),
      email: mEmail.trim() || undefined,
      notes: `Fonte: pesquisa manual${mLinkedin.trim() ? ` · LinkedIn: ${mLinkedin.trim()}` : ''}`
    });
    setMName(''); setMRole(''); setMEmail(''); setMLinkedin('');
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><User className="h-4 w-4 text-emerald-600" /> Encontrar pessoas · {lead.companyName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Website */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">No website da empresa</h4>
              <button onClick={search} disabled={loading} className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Procurar de novo
              </button>
            </div>

            {loading && <p className="text-xs text-gray-500">A ler as páginas públicas (equipa, sobre, contactos)...</p>}
            {error && <p className="text-xs text-rose-600">{error}</p>}

            {result && !loading && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500">{result.pagesChecked} página(s) analisada(s). Só aparece o que está escrito no website; confirme sempre na chamada.</p>
                {result.notes.map((n) => <p key={n} className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">{n}</p>)}

                {result.people.length > 0 && (
                  <ul className="space-y-1.5">
                    {result.people.map((p) => {
                      const key = `p:${p.name}`;
                      const done = savedKeys.has(key) || alreadyHas(p.name, p.email);
                      return (
                        <li key={key} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-2.5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{p.name}</span>
                              {p.role && <span className="text-xs text-gray-600">{p.role}</span>}
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${confidenceLabel[p.confidence].tone}`}>{confidenceLabel[p.confidence].text}</span>
                            </div>
                            {(p.email || p.phone) && (
                              <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-gray-600">
                                {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                                {p.phone && <span className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3" />{p.phone}</span>}
                              </div>
                            )}
                            {p.evidence && <p className="mt-1 text-[11px] italic text-gray-500">"{p.evidence}"</p>}
                            <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"><ExternalLink className="h-3 w-3" />Fonte</a>
                          </div>
                          <button onClick={() => addPerson(p)} disabled={done} className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            {done ? 'Adicionado' : 'Adicionar'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {result.emails.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-bold text-gray-500">Emails públicos</div>
                    <ul className="space-y-1">
                      {result.emails.map((e) => {
                        const key = `e:${e.email}`;
                        const done = savedKeys.has(key) || alreadyHas(undefined, e.email);
                        return (
                          <li key={key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-2 text-gray-700">
                              <Mail className="h-3 w-3 text-gray-400" />{e.email}
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{e.kind === 'generic' ? 'Geral' : 'Pessoal?'}</span>
                            </span>
                            <button onClick={() => addEmail(e.email, e.sourceUrl)} disabled={done} className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                              {done ? 'Adicionado' : 'Adicionar'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {result.phones.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-bold text-gray-500">Telefones no website</div>
                    <div className="flex flex-wrap gap-2">
                      {result.phones.map((p) => <span key={p.phone} className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700">{p.phone}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* LinkedIn */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Pesquisa manual no LinkedIn</h4>
            <p className="mb-2 text-[11px] text-gray-500">Abre a pesquisa já com o cargo e a empresa. O sistema não lê o LinkedIn: escolha a pessoa e cole os dados abaixo.</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <a key={r} href={linkedinPeopleSearchUrl(lead.companyName, r)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100">
                  <Linkedin className="h-3 w-3" /> {r}
                </a>
              ))}
            </div>
          </section>

          {/* Adicionar manualmente */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Adicionar pessoa encontrada</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Nome completo" className={inputClass} />
              <input value={mRole} onChange={(e) => setMRole(e.target.value)} placeholder="Cargo" className={inputClass} />
              <input value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="Email (opcional)" className={inputClass} />
              <input value={mLinkedin} onChange={(e) => setMLinkedin(e.target.value)} placeholder="Link do perfil LinkedIn (opcional)" className={inputClass} />
            </div>
            <button onClick={addManual} className="mt-2 flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">
              <Plus className="h-3 w-3" /> Adicionar ao CRM
            </button>
          </section>

          <p className="flex items-start gap-1.5 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
            Dados pessoais: use só para contacto profissional B2B, guarde a fonte e respeite pedidos de "não contactar".
          </p>
        </div>
      </div>
    </div>
  );
}
