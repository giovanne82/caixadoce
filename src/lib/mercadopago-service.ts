export interface MercadoPagoPaymentResult {
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | string;
  status_detail?: string;
  id?: number | string;
  payment_method_id?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  error?: string;
}

/**
 * Envia o payload do Checkout Brick para a rota de processamento no servidor backend.
 */
export async function processarPagamentoMercadoPago(
  formData: any,
  establishmentCode: string,
  planId: string = "mensal"
): Promise<MercadoPagoPaymentResult> {
  console.log("[MercadoPago Service] Enviando pagamento para o backend:", establishmentCode, planId);

  const res = await fetch("/api/mercadopago/process-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      formData,
      establishmentCode,
      planId,
      amount: formData?.transaction_amount || 10.90,
      description: `Assinatura Plano Mensal PRO — CaixaDoce (${establishmentCode})`,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Falha ao processar pagamento no Mercado Pago.");
  }

  return data as MercadoPagoPaymentResult;
}

/**
 * Consulta o status da conexão OAuth do Mercado Pago para um estabelecimento
 */
export async function obterStatusConexaoMercadoPago(establishmentCode: string): Promise<{
  connected: boolean;
  mp_user_id?: string | null;
  mp_public_key?: string | null;
}> {
  try {
    const code = (establishmentCode || "CD-1001").toUpperCase();
    const res = await fetch(`/api/mercadopago/connect-status?codigo=${encodeURIComponent(code)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Erro ao consultar status da conexão com Mercado Pago:", e);
  }
  return { connected: false };
}

/**
 * Envia o código OAuth recebido no callback para o backend efetuar a troca pelos tokens e gravar no Supabase
 */
export async function trocarCodigoOAuthMercadoPago(
  code: string,
  establishmentCode: string,
  redirectUri: string
): Promise<{ success: boolean; mp_user_id?: string; mp_public_key?: string }> {
  const envClientId =
    (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_MP_CLIENT_ID || import.meta.env.VITE_MERCADOPAGO_CLIENT_ID || import.meta.env.VITE_MERCADO_PAGO_CLIENT_ID)) ||
    (typeof process !== "undefined" && process.env && (process.env.VITE_MP_CLIENT_ID || process.env.VITE_MERCADOPAGO_CLIENT_ID));

  const envClientSecret =
    (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_MP_CLIENT_SECRET || import.meta.env.VITE_MERCADOPAGO_CLIENT_SECRET || import.meta.env.VITE_MERCADO_PAGO_CLIENT_SECRET)) ||
    (typeof process !== "undefined" && process.env && (process.env.VITE_MP_CLIENT_SECRET || process.env.VITE_MERCADOPAGO_CLIENT_SECRET));

  const clientId = envClientId ? String(envClientId).trim() : undefined;
  const clientSecret = envClientSecret ? String(envClientSecret).trim() : undefined;

  // Validação de Segurança no Frontend antes do envio
  if (!clientId || clientId === "undefined") {
    console.error("[MercadoPago OAuth Alerta Frontend] VITE_MP_CLIENT_ID está undefined ou não configurado nas variáveis de ambiente!");
  }
  if (!clientSecret || clientSecret === "undefined") {
    console.error("[MercadoPago OAuth Alerta Frontend] VITE_MP_CLIENT_SECRET está undefined ou não configurado nas variáveis de ambiente!");
  }

  const res = await fetch("/api/mercadopago/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code.trim(),
      establishmentCode: (establishmentCode || "CD-1001").toUpperCase(),
      redirectUri: redirectUri.trim(),
      ...(clientId && clientId !== "undefined" ? { clientId } : {}),
      ...(clientSecret && clientSecret !== "undefined" ? { clientSecret } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Erro ao conectar conta do Mercado Pago.");
  }
  return data;
}

/**
 * Solicita ao backend a desconexão da conta do Mercado Pago (limpa os tokens no Supabase)
 */
export async function desconectarMercadoPago(establishmentCode: string): Promise<boolean> {
  const res = await fetch("/api/mercadopago/oauth/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      establishmentCode: (establishmentCode || "CD-1001").toUpperCase(),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Erro ao desconectar conta do Mercado Pago.");
  }
  return true;
}

/**
 * Solicita ao backend a geração de uma cobrança Pix via Mercado Pago Connect para um pedido do cardápio
 */
export async function gerarPixMercadoPago(params: {
  establishmentCode: string;
  amount: number;
  description?: string;
  payerEmail?: string;
}): Promise<{
  success: boolean;
  payment_id?: string | number;
  status?: string;
  qr_code_base64?: string;
  qr_code?: string;
  error?: string;
}> {
  const res = await fetch("/api/mercadopago/create-pix-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Falha ao gerar QR Code do Pix no Mercado Pago.");
  }
  return data;
}

