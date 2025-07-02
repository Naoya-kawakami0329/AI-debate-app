import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client-side Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side client with service role key
export const createSupabaseAdmin = () => {
  // Use NEXT_PUBLIC_SUPABASE_URL for server-side as well since it's available
  const serverSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serverSupabaseUrl || !serviceRoleKey) {
    console.error('Supabase admin client configuration missing - check environment variables');
    return null;
  }
  
  return createClient<Database>(serverSupabaseUrl, serviceRoleKey);
};

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};