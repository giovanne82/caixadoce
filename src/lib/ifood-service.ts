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
        process.env?.SUPABASE_SERVICE_KEY ||
        process.env?.SERVICE_ROLE_KEY ||
        process.env?.SUPABASE_ANON_KEY ||
        process.env?.VITE_SUPABASE_ANON_KEY)) ||
    DEFAULT_SUPABASE_KEY;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let cachedAppToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtém o access_token da aplicação CaixaDoce via client_credentials de forma padrão
 */
export async function obterTokenAppIFood(env?: any): Promise<string> {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt > now + 60000 && cachedAppToken.token) {
    return cachedAppToken.token;
  }

  const envObj = (env as Record<string, string>) || {};
  const procObj = (typeof process !== "undefined" && process.env ? process.env : {}) as Record<string, string>;

  const ifoodClientId =
    envObj.IFOOD_CLIENT_ID ||
    procObj.IFOOD_CLIENT_ID ||
    envObj.VITE_IFOOD_CLIENT_ID ||
    procObj.VITE_IFOOD_CLIENT_ID ||
    "";
  const ifoodClientSecret =
    envObj.IFOOD_CLIENT_SECRET ||
    procObj.IFOOD_CLIENT_SECRET ||
    envObj.VITE_IFOOD_CLIENT_SECRET ||
    procObj.VITE_IFOOD_CLIENT_SECRET ||
    "";

  if (!ifoodClientId || !ifoodClientSecret) {
    throw new Error("Credenciais IFOOD_CLIENT_ID ou IFOOD_CLIENT_SECRET não encontradas no ambiente.");
  }

  const bodyParams = new URLSearchParams();
  bodyParams.append("grant_type", "client_credentials");
  bodyParams.append("clientId", ifoodClientId.trim());
  bodyParams.append("clientSecret", ifoodClientSecret.trim());

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
    throw new Error(`Falha ao obter token client_credentials do iFood (${res.status}): ${errTxt}`);
  }

  const data: any = await res.json();
  const token = data.accessToken || data.access_token;
  const expiresIn = Number(data.expiresIn || data.expires_in || 21599);

  if (token) {
    cachedAppToken = {
      token,
      expiresAt: now + expiresIn * 1000,
    };
    return token;
  }

  throw new Error("Resposta do iFood não continha accessToken.");
}

export const obterTokenAppIFoodServer = obterTokenAppIFood;

/**
 * Obtém as credenciais e tokens iFood de um estabelecimento no Supabase
 */
export async function obterTokensIFoodEstabelecimento(estabelecimentoCodigo?: string, orderId?: string, env?: any) {
  const supabase = getSupabaseBackendClient();
  let targetCode = (estabelecimentoCodigo || "").trim().toUpperCase();

  // 1. Se não foi passado o código da loja, tenta encontrar pelo orderId na tabela encomendas
  if (!targetCode && orderId) {
    try {
      const { data: enc } = await supabase
        .from("encomendas")
        .select("estabelecimento_codigo, codigo_pedido_ifood")
        .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`)
        .maybeSingle();

      if (enc?.estabelecimento_codigo) {
        targetCode = enc.estabelecimento_codigo.trim().toUpperCase();
      }
    } catch (e) {
      console.warn("[obterTokensIFoodEstabelecimento Enc Check Warn]", e);
    }
  }

  // 2. Busca o estabelecimento pelo targetCode informado
  if (targetCode) {
    const { data: estTarget } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, ifood_access_token, ifood_refresh_token, ifood_merchant_id, ifood_status")
      .ilike("codigo", targetCode)
      .maybeSingle();

    if (estTarget) {
      return {
        id: estTarget.id,
        codigo: estTarget.codigo,
        accessToken: estTarget.ifood_access_token || null,
        refreshToken: estTarget.ifood_refresh_token || null,
        merchantId: estTarget.ifood_merchant_id || null,
        status: estTarget.ifood_status || null,
      };
    }
  }

  // 3. Busca prioritária pela loja ativa 'CD-5411'
  const { data: estCd5411 } = await supabase
    .from("estabelecimentos")
    .select("id, codigo, ifood_access_token, ifood_refresh_token, ifood_merchant_id, ifood_status")
    .ilike("codigo", "CD-5411")
    .maybeSingle();

  if (estCd5411) {
    return {
      id: estCd5411.id,
      codigo: estCd5411.codigo,
      accessToken: estCd5411.ifood_access_token || null,
      refreshToken: estCd5411.ifood_refresh_token || null,
      merchantId: estCd5411.ifood_merchant_id || null,
      status: estCd5411.ifood_status || null,
    };
  }

  // 4. Busca por qualquer estabelecimento com token ou conectado
  const { data: ests } = await supabase
    .from("estabelecimentos")
    .select("id, codigo, ifood_access_token, ifood_refresh_token, ifood_merchant_id, ifood_status")
    .not("ifood_access_token", "is", null)
    .order("updated_at", { ascending: false });

  if (Array.isArray(ests) && ests.length > 0) {
    const est = ests[0];
    return {
      id: est.id,
      codigo: est.codigo,
      accessToken: est.ifood_access_token || null,
      refreshToken: est.ifood_refresh_token || null,
      merchantId: est.ifood_merchant_id || null,
      status: est.ifood_status || null,
    };
  }

  return { error: `Nenhum registro de estabelecimento encontrado para '${targetCode || "CD-5411"}'.` };
}

/**
 * Renova o access_token do iFood usando o refresh_token
 */
export async function renovarAccessTokenIFood(estabelecimentoId: string, refreshToken: string, env?: any) {
  const envObj = (env as Record<string, string>) || {};
  const procObj = (typeof process !== "undefined" && process.env ? process.env : {}) as Record<string, string>;

  const ifoodClientId =
    envObj.IFOOD_CLIENT_ID ||
    procObj.IFOOD_CLIENT_ID ||
    envObj.VITE_IFOOD_CLIENT_ID ||
    procObj.VITE_IFOOD_CLIENT_ID ||
    "";
  const ifoodClientSecret =
    envObj.IFOOD_CLIENT_SECRET ||
    procObj.IFOOD_CLIENT_SECRET ||
    envObj.VITE_IFOOD_CLIENT_SECRET ||
    procObj.VITE_IFOOD_CLIENT_SECRET ||
    "";

  if (!refreshToken || !ifoodClientId) {
    throw new Error("Credenciais insuficientes para renovar o token iFood.");
  }

  const bodyParams = new URLSearchParams({
    grantType: "refresh_token",
    clientId: ifoodClientId.trim(),
    clientSecret: ifoodClientSecret.trim(),
    refreshToken: refreshToken.trim(),
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

  if (novoAccessToken && estabelecimentoId) {
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
    console.warn(`[iFood Action Notice] ${acao} retornou status ${res.status}: ${errBody}`);

    // Identificação de erro 401 (Autenticação) ou Pedido com Ciclo Expirado (400, 404, 409, 422)
    let mensagemAmigavel = `iFood retornou erro ${res.status}: ${errBody || "Operação não autorizada."}`;

    if (res.status === 401) {
      mensagemAmigavel = "Não é possível alterar este pedido pois a sessão do iFood expirou ou o ciclo de vida deste pedido expirou na plataforma.";
    } else if (
      res.status === 400 ||
      res.status === 404 ||
      res.status === 409 ||
      res.status === 422 ||
      errBody.toLowerCase().includes("lifecycle") ||
      errBody.toLowerCase().includes("expired") ||
      errBody.toLowerCase().includes("cannot transition") ||
      errBody.toLowerCase().includes("invalid status") ||
      errBody.toLowerCase().includes("not found")
    ) {
      mensagemAmigavel = "Não é possível alterar este pedido pois o ciclo de vida expirou no iFood.";
    }

    return {
      success: false,
      error: mensagemAmigavel,
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

export {
  sincronizarHorariosLojaIFood,
  consultarHorariosLojaIFood,
  consultarStatusLojaIFood,
  alterarStatusLojaIFood,
} from "./ifood-merchant-service";
