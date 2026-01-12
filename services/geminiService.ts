import { supabase } from './supabase';
import { Lead } from '../types';

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
