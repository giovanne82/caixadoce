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
 * Helper para verificar se um e-mail possui permissão de Administrador
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();

  const envAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowedSet = new Set([
    ...ADMIN_EMAILS_WHITELIST.map((e) => e.toLowerCase()),
    ...envAdminEmails,
  ]);

  return allowedSet.has(cleanEmail);
}

/**
 * Consulta assíncrona para obter e verificar o e-mail do usuário autenticado no Supabase
 */
export async function checkCurrentSupabaseUserIsAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      return { isAdmin: isEmailAdmin(user.email), email: user.email };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      return { isAdmin: isEmailAdmin(session.user.email), email: session.user.email };
    }
  } catch (err) {
    console.error("[Admin Check Error]", err);
  }

  return { isAdmin: false, email: null };
}
