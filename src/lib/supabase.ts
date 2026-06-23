import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function checkConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }
  // Avoid placeholder strings
  if (
    supabaseUrl.includes('YOUR_SUPABASE') ||
    supabaseUrl.includes('placeholder') ||
    supabaseAnonKey.includes('YOUR_SUPABASE') ||
    supabaseAnonKey.includes('placeholder')
  ) {
    return false;
  }
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export const isSupabaseConfigured = checkConfigured();

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

