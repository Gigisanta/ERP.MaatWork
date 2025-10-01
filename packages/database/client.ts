import { createClient } from '@supabase/supabase-js';

// Soporta tanto frontend (import.meta.env) como backend (process.env)
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    // Frontend: usar import.meta.env
    return (import.meta as any).env?.[key] || '';
  }
  // Backend: usar process.env
  return process.env[key] || '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Missing Supabase environment variables');
}

// Cliente Supabase con anon key (protegido por RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export default supabase;
