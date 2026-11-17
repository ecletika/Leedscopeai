import type { CrmContactType } from '../types';

export interface FoundPerson {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  source: 'website';
  sourceUrl: string;
  /** Nunca "verified": so um humano confirma. */
  confidence: 'probable' | 'unverified';
  evidence?: string;
}

export interface FoundEmail {
  email: string;
  sourceUrl: string;
  kind: 'generic' | 'personal';
}

export interface FoundPhone {
  phone: string;
  sourceUrl: string;
}

export interface PeopleSearchResult {
  people: FoundPerson[];
  emails: FoundEmail[];
  phones: FoundPhone[];
  pagesChecked: number;
  notes: string[];
}

export const findPeopleOnWebsite = async (companyName: string, website?: string): Promise<PeopleSearchResult> => {
  const res = await fetch('/api/people/find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName, website })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status} ao procurar pessoas.`);
  }
  return res.json();
};

/** Ligacao de pesquisa no LinkedIn (sem scraping): o vendedor abre e escolhe manualmente. */
export const linkedinPeopleSearchUrl = (companyName: string, role: string): string =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${role} ${companyName}`.trim())}`;

/** Cargos-alvo a partir de um texto como "Gerente / Proprietário". */
export const splitRoles = (roles: string): string[] =>
  roles.split(/[\/,;]+/).map((r) => r.trim()).filter(Boolean);

/** Mapeia um cargo livre para o tipo de contacto do CRM. */
export const roleToContactType = (role?: string): CrmContactType => {
  const r = (role || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/governanta|housekeep/.test(r)) return 'housekeeper';
  if (/recep/.test(r)) return 'reception';
  if (/manuten/.test(r)) return 'maintenance';
  if (/compras|purchas/.test(r)) return 'purchasing';
  if (/diretor geral|director geral|administrador|proprietario|owner|ceo|fundador/.test(r)) return 'general_manager';
  if (/gerente|manager|diretor|director|coordenador|responsavel|rh|recursos humanos/.test(r)) return 'manager';
  return 'other';
};
