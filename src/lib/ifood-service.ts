import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

export function getSupabaseBackendClient() {
  const supabaseUrl =
    (typeof process !== "undefined" && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
    DEFAULT_SUPABASE_URL;
  const supabaseKey =
    (typeof process !== "undefined" &&
      (process.env?.SUPABASE_SERVICE_ROLE_KEY ||
        process.env?.VITE_SUPABASE_SERVICE_ROLE_KEY ||
        process.env?.VITE_SUPABASE_ANON_KEY ||
        process.env?.SUPABASE_ANON_KEY)) ||
    DEFAULT_SUPABASE_KEY;

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Obtém as credenciais e tokens iFood de um estabelecimento no Supabase
 */
export async function obterTokensIFoodEstabelecimento(estabelecimentoCodigo?: string, orderId?: string) {
  const supabase = getSupabaseBackendClient();
  let targetCode = (estabelecimentoCodigo || "").trim().toUpperCase();

  // Se não foi passado o código da loja, tenta encontrar pelo orderId na tabela encomendas
  if (!targetCode && orderId) {
    const { data: enc } = await supabase
      .from("encomendas")
      .select("estabelecimento_codigo, codigo_pedido_ifood")
      .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`)
      .maybeSingle();

    if (enc?.estabelecimento_codigo) {
      targetCode = enc.estabelecimento_codigo.trim().toUpperCase();
    }
  }

  // Busca o estabelecimento
  let query = supabase.from("estabelecimentos").select("id, codigo, ifood_access_token, ifood_refresh_token, ifood_merchant_id, ifood_status");
  if (targetCode) {
    query = query.ilike("codigo", targetCode);
  } else {
    query = query.eq("ifood_status", "conectado").limit(1);
  }

  const { data: est, error } = await query.maybeSingle();
  if (error || !est) {
    return { error: `Estabelecimento '${targetCode || "ativo"}' não encontrado ou sem conexão iFood configurada.` };
  }

  return {
    id: est.id,
    codigo: est.codigo,
    accessToken: est.ifood_access_token,
    refreshToken: est.ifood_refresh_token,
    merchantId: est.ifood_merchant_id,
    status: est.ifood_status,
  };
}

/**
 * Renova o access_token do iFood usando o refresh_token
 */
export async function renovarAccessTokenIFood(estabelecimentoId: string, refreshToken: string) {
  const ifoodClientId =
    (typeof process !== "undefined" && (process.env?.IFOOD_CLIENT_ID || process.env?.VITE_IFOOD_CLIENT_ID)) || "";
  const ifoodClientSecret =
    (typeof process !== "undefined" && (process.env?.IFOOD_CLIENT_SECRET || process.env?.VITE_IFOOD_CLIENT_SECRET)) || "";

  if (!refreshToken || !ifoodClientId) {
    throw new Error("Credenciais insuficientes para renovar o token iFood.");
  }

  const bodyParams = new URLSearchParams({
    grantType: "refresh_token",
    clientId: ifoodClientId,
    clientSecret: ifoodClientSecret,
    refreshToken: refreshToken,
  });

  const res = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Falha ao renovar token iFood: ${errTxt}`);
  }

  const data = await res.json();
  const novoAccessToken = data.accessToken || data.access_token;
  const novoRefreshToken = data.refreshToken || data.refresh_token || refreshToken;

  if (novoAccessToken) {
    const supabase = getSupabaseBackendClient();
    await supabase
      .from("estabelecimentos")
      .update({
        ifood_access_token: novoAccessToken,
        ifood_refresh_token: novoRefreshToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", estabelecimentoId);
  }

  return novoAccessToken;
}

/**
 * Executa uma ação de pedido no iFood (confirm, dispatch, cancel) com suporte a auto-refresh do token
 */
export async function executarAcaoPedidoIFood(
  orderId: string,
  acao: "confirm" | "dispatch" | "cancel",
  payload?: { reason?: string; cancellationCode?: string; estabelecimento_codigo?: string }
): Promise<{ success: boolean; message?: string; error?: string; status?: number }> {
  if (!orderId) {
    return { success: false, error: "ID do pedido não informado.", status: 400 };
  }

  const estData = await obterTokensIFoodEstabelecimento(payload?.estabelecimento_codigo, orderId);
  if ("error" in estData && estData.error) {
    return { success: false, error: estData.error, status: 404 };
  }

  let accessToken = estData.accessToken;
  if (!accessToken) {
    return {
      success: false,
      error: "Esta loja ainda não possui um token de acesso válido do iFood conectado. Conecte sua loja nas configurações.",
      status: 401,
    };
  }

  // Determina o endpoint correspondente da API do iFood
  let ifoodUrl = "";
  let method = "POST";
  let bodyData: any = undefined;

  if (acao === "confirm") {
    ifoodUrl = `https://merchant-api.ifood.com.br/order/v1.0/orders/${encodeURIComponent(orderId)}/confirm`;
  } else if (acao === "dispatch") {
    ifoodUrl = `https://merchant-api.ifood.com.br/order/v1.0/orders/${encodeURIComponent(orderId)}/dispatch`;
  } else if (acao === "cancel") {
    ifoodUrl = `https://merchant-api.ifood.com.br/order/v1.0/orders/${encodeURIComponent(orderId)}/requestCancellation`;
    bodyData = JSON.stringify({
      reason: payload?.reason || "Cancelado pelo estabelecimento",
      cancellationCode: payload?.cancellationCode || "501",
    });
  } else {
    return { success: false, error: `Ação desconhecida: ${acao}`, status: 400 };
  }

  // Faz a requisição à API do iFood
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
  if (bodyData) {
    headers["Content-Type"] = "application/json";
  }

  console.log(`[iFood Action Request] Executando '${acao}' para pedido ${orderId} no iFood...`);
  let res = await fetch(ifoodUrl, { method, headers, body: bodyData });

  // Se receber 401 (Não autorizado), tenta renovar o token e repetir uma vez
  if (res.status === 401 && estData.refreshToken) {
    try {
      console.log(`[iFood Action 401] Renovando access_token para ${estData.codigo}...`);
      accessToken = await renovarAccessTokenIFood(estData.id, estData.refreshToken);
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(ifoodUrl, { method, headers, body: bodyData });
    } catch (renewErr) {
      console.error("[iFood Action Renew Token Error]", renewErr);
    }
  }

  // Fallback para endpoint alternativo de cancelamento caso requestCancellation retorne 404/405
  if (acao === "cancel" && !res.ok && (res.status === 404 || res.status === 405)) {
    const fallbackUrl = `https://merchant-api.ifood.com.br/order/v1.0/orders/${encodeURIComponent(orderId)}/cancel`;
    res = await fetch(fallbackUrl, { method: "POST", headers, body: bodyData });
  }

  if (!res.ok && res.status !== 202 && res.status !== 200 && res.status !== 204) {
    const errBody = await res.text();
    console.error(`[iFood Action Error] ${acao} falhou (HTTP ${res.status}): ${errBody}`);
    return {
      success: false,
      error: `iFood retornou erro ${res.status}: ${errBody || "Operação não autorizada ou pedido não encontrado no iFood."}`,
      status: res.status,
    };
  }

  // Atualiza o status correspondente no Supabase
  const supabase = getSupabaseBackendClient();
  const novoStatusLocal = acao === "confirm" ? "em_producao" : acao === "dispatch" ? "pronta" : "cancelada";

  try {
    await supabase
      .from("encomendas")
      .update({
        status: novoStatusLocal,
        updated_at: new Date().toISOString(),
      })
      .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`);
  } catch (dbErr) {
    console.warn("[iFood DB Status Update Log]", dbErr);
  }

  const mensagensAcao = {
    confirm: "Pedido confirmado com sucesso no iFood!",
    dispatch: "Pedido despachado para entrega no iFood!",
    cancel: "Cancelamento do pedido solicitado com sucesso no iFood!",
  };

  return {
    success: true,
    message: mensagensAcao[acao],
    status: 200,
  };
}
