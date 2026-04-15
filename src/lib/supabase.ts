import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url');

if (!isConfigured) {
  console.warn('Supabase URL or Anon Key is missing or using placeholder values. Check your .env file.');
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder-url.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-key'
);
