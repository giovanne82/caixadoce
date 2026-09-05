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

import { supabase } from "@/integrations/supabase/client";

/**
 * Envia o código OAuth recebido no callback para o backend efetuar a troca pelos tokens e gravar no Supabase
 */
export async function trocarCodigoOAuthMercadoPago(
  code: string,
  establishmentCode: string,
  redirectUri: string
): Promise<{
  success: boolean;
  mp_user_id?: string;
  mp_public_key?: string;
  mp_access_token?: string;
  mp_refresh_token?: string;
}> {
  const envClientId =
    (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_MP_CLIENT_ID || import.meta.env.VITE_MERCADOPAGO_CLIENT_ID || import.meta.env.VITE_MERCADO_PAGO_CLIENT_ID)) ||
    (typeof process !== "undefined" && process.env && (process.env.VITE_MP_CLIENT_ID || process.env.VITE_MERCADOPAGO_CLIENT_ID));

  const envClientSecret =
    (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_MP_CLIENT_SECRET || import.meta.env.VITE_MERCADOPAGO_CLIENT_SECRET || import.meta.env.VITE_MERCADO_PAGO_CLIENT_SECRET)) ||
    (typeof process !== "undefined" && process.env && (process.env.VITE_MP_CLIENT_SECRET || process.env.VITE_MERCADOPAGO_CLIENT_SECRET));

  const clientId = envClientId ? String(envClientId).trim() : undefined;
  const clientSecret = envClientSecret ? String(envClientSecret).trim() : undefined;

  // Obter token de sessão do usuário ativo para respeitar políticas de RLS
  let sessionToken: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    sessionToken = sessionData?.session?.access_token;
  } catch {}

  const targetCode = (establishmentCode || "CD-1001").toUpperCase().trim();

  // 1. Chamada ao endpoint do backend para troca do código por tokens na API do MP
  const res = await fetch("/api/mercadopago/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify({
      code: code.trim(),
      establishmentCode: targetCode,
      redirectUri: redirectUri.trim(),
      ...(clientId && clientId !== "undefined" ? { clientId } : {}),
      ...(clientSecret && clientSecret !== "undefined" ? { clientSecret } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Erro ao conectar conta do Mercado Pago.");
  }

  // 2. MUTAÇÃO EXPLÍCITA NO SUPABASE (FRONTEND AUTENTICADO COM SESSÃO ATIVA DO USUÁRIO)
  const tokensToSave = {
    mp_access_token: data.mp_access_token || data.access_token,
    mp_public_key: data.mp_public_key || data.public_key,
    mp_refresh_token: data.mp_refresh_token || data.refresh_token,
    mp_user_id: data.mp_user_id ? String(data.mp_user_id) : (data.user_id ? String(data.user_id) : null),
    updated_at: new Date().toISOString(),
  };

  try {
    // 2.1 Busca ID específico do estabelecimento para garantir cláusula .eq('id', ...)
    const { data: estRow } = await supabase
      .from("estabelecimentos")
      .select("id, codigo")
      .ilike("codigo", targetCode)
      .maybeSingle();

    let query = supabase.from("estabelecimentos").update(tokensToSave);
    if (estRow?.id) {
      query = query.eq("id", estRow.id);
    } else {
      query = query.ilike("codigo", targetCode);
    }

    const { data: updateData, error: updateError } = await query.select();

    if (updateError) {
      console.error("Falha no UPDATE do Supabase:", updateError);
      throw new Error(updateError.message);
    }

    console.log("[MercadoPago Service] UPDATE no Supabase concluído com sucesso:", updateData);
  } catch (err: any) {
    console.error("Falha no UPDATE do Supabase:", err);
    throw new Error(err.message || "Falha ao gravar tokens no banco de dados.");
  }

  return data;
}

/**
 * Solicita ao backend a desconexão da conta do Mercado Pago (limpa os tokens no Supabase)
 */
export async function desconectarMercadoPago(establishmentCode: string): Promise<boolean> {
  const targetCode = (establishmentCode || "CD-1001").toUpperCase().trim();

  let sessionToken: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    sessionToken = sessionData?.session?.access_token;
  } catch {}

  // 1. Desconectar via Backend API
  const res = await fetch("/api/mercadopago/oauth/disconnect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify({
      establishmentCode: targetCode,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Erro ao desconectar conta do Mercado Pago.");
  }

  // 2. Limpeza explícita no Supabase com sessão ativa
  try {
    const { data: estRow } = await supabase
      .from("estabelecimentos")
      .select("id, codigo")
      .ilike("codigo", targetCode)
      .maybeSingle();

    const clearPayload = {
      mp_access_token: null,
      mp_public_key: null,
      mp_refresh_token: null,
      mp_user_id: null,
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from("estabelecimentos").update(clearPayload);
    if (estRow?.id) {
      query = query.eq("id", estRow.id);
    } else {
      query = query.ilike("codigo", targetCode);
    }

    const { error: clearErr } = await query.select();
    if (clearErr) {
      console.error("Falha no UPDATE do Supabase (Disconnect):", clearErr);
      throw new Error(clearErr.message);
    }
  } catch (err: any) {
    console.error("Falha no UPDATE do Supabase (Disconnect):", err);
  }

  return true;
}

/**
 * Retorna a data de expiração formatada estritamente no padrão ISO 8601 com o offset do Brasil (-03:00):
 * Exemplo: "YYYY-MM-DDTHH:mm:ss.000-03:00"
 */
export function formatarDataExpiracaoPixMercadoPago(minutosNoFuturo = 5): string {
  const agora = new Date();
  const dataFutura = new Date(agora.getTime() + minutosNoFuturo * 60 * 1000);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(dataFutura);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const ano = map.year;
  const mes = map.month;
  const dia = map.day;
  const hora = (map.hour || "00").padStart(2, "0");
  const minuto = (map.minute || "00").padStart(2, "0");
  const segundo = (map.second || "00").padStart(2, "0");
  const millis = String(dataFutura.getMilliseconds()).padStart(3, "0");

  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}.${millis}-03:00`;
}

/**
 * Solicita ao backend a geração de uma cobrança Pix via Mercado Pago Connect para um pedido do cardápio
 */
export async function gerarPixMercadoPago(params: {
  establishmentCode: string;
  amount: number;
  description?: string;
  payerEmail?: string;
  accessToken?: string;
  date_of_expiration?: string;
  notification_url?: string;
  external_reference?: string;
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

/**
 * Consulta o status de um pagamento Pix específico no Mercado Pago
 */
export async function consultarStatusPagamentoPix(params: {
  paymentId: string | number;
  mpAccessToken?: string;
  establishmentCode?: string;
}): Promise<{
  success: boolean;
  approved: boolean;
  status: string;
  status_detail?: string;
  payment_id?: string | number;
  transaction_amount?: number;
}> {
  const query = new URLSearchParams({
    payment_id: String(params.paymentId),
    ...(params.mpAccessToken ? { mp_access_token: params.mpAccessToken } : {}),
    ...(params.establishmentCode ? { estabelecimentoCodigo: params.establishmentCode } : {}),
  });

  const res = await fetch(`/api/check-payment-status?${query.toString()}`);
  const data = await res.json();

  if (!res.ok || data.error) {
    return {
      success: false,
      approved: false,
      status: data.status || "error",
      status_detail: data.error || "Erro ao consultar status.",
      payment_id: params.paymentId,
    };
  }

  return {
    success: true,
    approved: data.status === "approved" || data.status === "authorized" || Boolean(data.approved),
    status: data.status,
    status_detail: data.status_detail,
    payment_id: data.payment_id || params.paymentId,
    transaction_amount: data.transaction_amount,
  };
}

