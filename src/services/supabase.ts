import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// @ts-ignore
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Se as variáveis não estiverem configuradas, cria um client inerte.
// A autenticação simplesmente não funcionará, mas o app não quebrará.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);
