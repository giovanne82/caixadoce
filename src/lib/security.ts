/**
 * Utilitários de Segurança para CaixaDoce
 * Sanitiza entradas de texto para mitigar riscos de Cross-Site Scripting (XSS) e manuseio de permissões
 */

export function sanitizarTexto(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * Tenta solicitar o acesso à câmera usando a API do navegador com tratamento gracioso de exceções.
 */
export async function solicitarAcessoCamera(): Promise<MediaStream | null> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    return stream;
  } catch (err: any) {
    console.warn("[Media Permissions Warning] Acesso à câmera negado ou indisponível:", err?.message || err);
    return null;
  }
}
