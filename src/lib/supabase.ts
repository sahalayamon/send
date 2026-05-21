import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Show a visible error in the DOM instead of a silent blank crash
  document.body.innerHTML = `
    <div style="font-family:monospace;padding:2rem;background:#111;color:#fff;min-height:100vh;display:flex;flex-direction:column;gap:1rem;">
      <span style="color:#ff4444;font-size:0.75rem;letter-spacing:.1em;text-transform:uppercase;">// Configuration Error</span>
      <p style="font-size:0.9rem;color:#aaa;max-width:520px;line-height:1.7;">
        Missing Supabase environment variables.<br/>
        Add <code style="color:#fff">VITE_SUPABASE_URL</code> and <code style="color:#fff">VITE_SUPABASE_ANON_KEY</code>
        to your Vercel project settings under <strong>Settings → Environment Variables</strong>, then redeploy.
      </p>
    </div>`;
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
