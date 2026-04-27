import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if the URL is a valid Supabase URL format (starts with http/https)
const isValidSupabaseUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-supabase-url' && 
  isValidSupabaseUrl(supabaseUrl)
);

if (!isConfigured) {
  console.warn('Supabase URL or Anon Key is missing, invalid, or using placeholder values. Check your .env file.');
}

// Ensure we ALWAYS pass a valid-looking URL to createClient to avoid crashing on startup
const finalUrl = isConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = isConfigured ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);
