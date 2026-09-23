import { createClient } from "@supabase/supabase-js";
import { safeStorage } from "@/lib/safe-storage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://whfrjoqolyatylcwccon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZnJqb3FvbHlhdHlsY3djY29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTg2NzYsImV4cCI6MjEwMjgzNDY3Nn0.jr-E--3S_NyzKgeB-ChHmsTdowxOEzIpWDEJTgQvHzQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "caixadoce_supabase_auth_token",
    storage: safeStorage,
  },
});
