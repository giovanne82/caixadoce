import type { UserProfile } from "@/context/auth-context";

/**
 * Converte um texto arbitrário em um slug limpo para URL
 */
export function formatarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, "-") // substitui caracteres especiais por hífen
    .replace(/-+/g, "-") // remove hifens repetidos
    .replace(/^-+|-+$/g, ""); // remove hifens no início e fim
}

/**
 * Aplica máscara de telefone / WhatsApp brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatarMascaraWhatsapp(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Verifica se uma loja/estabelecimento necessita do fluxo de onboarding obrigatório.
 * Retorna true se faltar nome personalizado, slug ou whatsapp.
 */
export function isStoreNeedsOnboarding(profile: UserProfile | null): boolean {
  if (!profile) return false;
  
  // Colaboradores e operadores não realizam onboarding da loja mestre
  if (profile.role === "operador") return false;

  const nome = (profile.establishmentName || "").trim();
  const slug = (profile.slug || "").trim();
  const whatsapp = (profile.whatsapp || "").replace(/\D/g, "").trim();

  // 1. Slug obrigatório com no mínimo 3 caracteres
  if (!slug || slug.length < 3) return true;

  // 2. Nome da loja obrigatório e não pode ser o genérico inicial de criação
  if (
    !nome ||
    nome.length < 2 ||
    nome === "Minha Confeitaria" ||
    nome.startsWith("Confeitaria CD-") ||
    nome.startsWith("Loja CD-")
  ) {
    return true;
  }

  // 3. WhatsApp obrigatório com DDD (10 ou 11 dígitos)
  if (!whatsapp || whatsapp.length < 10) return true;

  return false;
}
