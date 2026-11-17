import type { Lead } from '../types';

export interface ApolloUsage {
  used: number;
  limit: number;
  remaining: number;
  period: string;
}

export interface ApolloUsageState extends ApolloUsage {
  configured: boolean;
  counterAvailable: boolean;
}

export interface ApolloPerson {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  hasEmail: boolean;
  linkedinUrl?: string;
}

export interface ApolloRevealed {
  name?: string;
  title?: string;
  email?: string;
  emailStatus?: string;
  linkedinUrl?: string;
}

const USAGE_EVENT = 'apollo-usage-changed';

/** Avisa as barras de creditos abertas para se atualizarem. */
const notifyUsage = () => {
  try { window.dispatchEvent(new Event(USAGE_EVENT)); } catch { /* ignore */ }
};

export const APOLLO_USAGE_EVENT = USAGE_EVENT;

const post = async <T,>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  notifyUsage();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status} no Apollo.`);
  return data as T;
};

export const getApolloUsage = async (): Promise<ApolloUsageState> => {
  const res = await fetch('/api/apollo/usage');
  if (!res.ok) throw new Error(`Erro ${res.status} ao ler os créditos do Apollo.`);
  return res.json();
};

export const searchApolloCompanies = async (params: {
  country: string;
  location: string;
  niche: string;
  segmentId?: string;
  excludeNames?: string[];
}): Promise<Partial<Lead>[]> => {
  const data = await post<{ leads: Partial<Lead>[] }>('/api/apollo/companies', params);
  return data.leads || [];
};

export const findApolloPeople = async (website: string, titles: string[]): Promise<ApolloPerson[]> => {
  const data = await post<{ people: ApolloPerson[] }>('/api/apollo/people', { domain: website, titles });
  return data.people || [];
};

export const revealApolloEmail = async (personId: string): Promise<ApolloRevealed> => {
  const data = await post<{ person: ApolloRevealed }>('/api/apollo/reveal', { personId });
  return data.person || {};
};

/** Cargos em PT + equivalentes em ingles (os perfis do Apollo estao sobretudo em ingles). */
const TITLE_SYNONYMS: Record<string, string[]> = {
  gerente: ['manager', 'general manager'],
  proprietario: ['owner', 'founder'],
  diretor: ['director'],
  'diretor de operacoes': ['operations director', 'head of operations'],
  'diretor geral': ['general manager', 'managing director'],
  governanta: ['housekeeping manager', 'executive housekeeper'],
  rh: ['human resources manager', 'hr manager', 'head of hr'],
  'responsavel de rh': ['hr manager', 'head of hr'],
  'recursos humanos': ['human resources manager', 'head of hr'],
  coordenador: ['coordinator'],
  administrativo: ['office manager', 'administrative manager']
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const apolloTitlesFor = (roles: string[]): string[] => {
  const out = new Set<string>();
  roles.forEach((r) => {
    out.add(r);
    const key = norm(r);
    Object.entries(TITLE_SYNONYMS).forEach(([k, syn]) => {
      if (key === k || key.includes(k)) syn.forEach((s) => out.add(s));
    });
  });
  return Array.from(out).slice(0, 12);
};
