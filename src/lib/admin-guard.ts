import { supabase } from "@/integrations/supabase/client";

/**
 * E-mail Master de Administrador / Sócios
 */
export const MASTER_ADMIN_EMAIL = "giovannecoelho@gmail.com";

export const ADMIN_EMAILS_WHITELIST: string[] = [
  "giovannecoelho@gmail.com",
  "giovannedoceria@gmail.com",
  "giovannesousa82@gmail.com",
  "artfesta@gmail.com",
  "admin@caixadoce.com.br",
  "contato@caixadoce.com.br",
];

/**
 * Helper com sanitização estrita de string (.toLowerCase().trim())
 */
export function sanitizeEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Helper de comparação segura e case-insensitive sem espaços residuais
 */
export function isEmailAdmin(email?: string | null): boolean {
  const cleanEmail = sanitizeEmail(email);
  if (!cleanEmail) return false;

  const envAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e: string) => sanitizeEmail(e))
    .filter(Boolean);

  const allowedSet = new Set([
    ...ADMIN_EMAILS_WHITELIST.map((e) => sanitizeEmail(e)),
    ...envAdminEmails,
  ]);

  return allowedSet.has(cleanEmail);
}

/**
 * Extração resiliente de e-mail a partir de múltiplos caminhos de objetos Supabase e LocalStorage
 */
export function extractUserEmailFromAllSources(sessionObj?: any, userObj?: any, contextUserObj?: any): string | null {
  const candidates = [
    sessionObj?.user?.email,
    userObj?.email,
    contextUserObj?.email,
  ];

  // Tentar restaurar do localStorage do aplicativo e do Supabase
  try {
    if (typeof window !== "undefined") {
      const caixadoceUser = localStorage.getItem("caixadoce_user");
      if (caixadoceUser) {
        const parsed = JSON.parse(caixadoceUser);
        if (parsed?.email) candidates.push(parsed.email);
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsedSb = JSON.parse(val);
              if (parsedSb?.user?.email) candidates.push(parsedSb.user.email);
              if (parsedSb?.currentSession?.user?.email) candidates.push(parsedSb.currentSession.user.email);
            } catch {}
          }
        }
      }
    }
  } catch {}

  for (const cand of candidates) {
    const clean = sanitizeEmail(cand);
    if (clean) return clean;
  }

  return null;
}

/**
 * Consulta assíncrona com retentativas (retry) para evitar falso negativo por latência de carregamento
 */
export async function checkCurrentSupabaseUserIsAdmin(contextUser?: any): Promise<{ isAdmin: boolean; email: string | null; loading: boolean }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      const extractedEmail = extractUserEmailFromAllSources(session, user, contextUser);

      if (extractedEmail) {
        const isAdmin = isEmailAdmin(extractedEmail);
        return { isAdmin, email: extractedEmail, loading: false };
      }
    } catch (err) {
      console.warn(`[Admin Guard Retry ${attempt}] Error:`, err);
    }

    if (attempt < 3) {
      await new Promise((res) => setTimeout(res, 150));
    }
  }

  const fallbackEmail = extractUserEmailFromAllSources(null, null, contextUser);
  if (fallbackEmail) {
    return { isAdmin: isEmailAdmin(fallbackEmail), email: fallbackEmail, loading: false };
  }

  return { isAdmin: false, email: null, loading: false };
}
