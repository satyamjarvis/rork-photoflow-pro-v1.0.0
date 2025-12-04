import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log('[Supabase] Initializing with URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('[Supabase] Initializing with Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables!');
  console.error('[Supabase] URL:', supabaseUrl);
  console.error('[Supabase] Key:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('[Supabase] Client created successfully');

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('[Supabase] Initial session check error:', error.message);
  } else {
    console.log('[Supabase] Initial session:', data.session ? 'Active' : 'No session');
  }
}).catch((err) => {
  console.error('[Supabase] Connection test failed:', err);
});
