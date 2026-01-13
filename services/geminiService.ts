import { supabase } from './supabase';
import { Lead } from '../types';

// Função já existente para pesquisa de leads
export const searchLeadsInLocation = async (
  location: string,
  niche: string,
  aiContext: string,
  campaignName: string
): Promise<Partial<Lead>[]> => {
  const { data, error } = await supabase.functions.invoke(
    'search-leads-agent',
    { body: { location, niche, aiContext, campaignName } }
  );

  if (error) throw error;
  return data;
};

// Função do Gemini Worker
export async function generateText(prompt: string) {
  const res = await fetch("https://gemini-api-worker.YOURDOMAIN.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) {
    throw new Error("Erro ao gerar texto do Worker");
  }

  const data = await res.json();
  return data;
}
