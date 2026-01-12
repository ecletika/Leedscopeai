// services/supabaseService.ts
import { createClient } from "jsr:@supabase/supabase-js"; // ou npm:@supabase/supabase-js

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

export const supabase = createClient(supabaseUrl, supabaseKey);
