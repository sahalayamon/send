import { createClient } from '@supabase/supabase-js';

// Supabase anon key is a public key — safe to expose in client-side code.
// RLS policies on the database control actual data access.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zrdglrotwvmrighdfddf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_l2RFFBe9wgbbXGgI1cgFjQ_4qu_pj-N';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
