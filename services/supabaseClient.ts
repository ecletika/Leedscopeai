import { createClient } from '@supabase/supabase-js';

// Conectado ao projeto ref: wsqqdmkmmrxyaksqygrq
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wsqqdmkmmrxyaksqygrq.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcXFkbWttbXJ4eWFrc3F5Z3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDMwNzYsImV4cCI6MjA5NjMxOTA3Nn0.X7vVzm3oy0kj1xC6wNJRivgwjvBmX2V_IV6KOE9cYSo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = (): boolean => {
  return (
    SUPABASE_URL.length > 0 &&
    !SUPABASE_URL.includes('sua-url-do-projeto.supabase.co') &&
    SUPABASE_ANON_KEY.length > 0 &&
    !SUPABASE_ANON_KEY.includes('sua-chave-anonima-publica')
  );
};
