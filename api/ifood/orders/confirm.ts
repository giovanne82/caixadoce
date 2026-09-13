// Vercel Serverless Function: POST /api/ifood/orders/confirm
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

function getSupabaseBackendClient() {
  const supabaseUrl =
    (typeof process !== "undefined" && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
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

async function obterTokensIFood(estabelecimentoCodigo?: string, orderId?: string) {
  const supabase = getSupabaseBackendClient();
  let targetCode = (estabelecimentoCodigo || "").trim().toUpperCase();

  // 1. Busca pelo orderId na tabela encomendas se targetCode não foi informado
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
      console.warn("[iFood Confirm Enc Check Warn]", e);
    }
  }

  // 2. Busca pelo código da loja
  if (targetCode) {
    try {
      const { data: estTarget } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, ifood_access_token, ifood_refresh_token, ifood_merchant_id, ifood_status")
        .ilike("codigo", targetCode)
        .maybeSingle();

      if (estTarget?.ifood_access_token) {
        return {
          id: estTarget.id,
          codigo: estTarget.codigo,
          accessToken: estTarget.ifood_access_token,
          refreshToken: estTarget.ifood_refresh_token,
          merchantId: estTarget.ifood_merchant_id,
        };
      }
    } catch (tErr) {
      console.warn("[iFood Confirm TargetCode Check Warn]", tErr);
    }
  }

  // 3. Busca pela loja ativa prioritária 'CD-5411'
  try {
    const { data: estCd5411 } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, ifood_access_token, ifood_refresh_token, ifood_merchant_id, ifood_status")
      .ilike("codigo", "CD-5411")
      .maybeSingle();

    if (estCd5411?.ifood_access_token) {
      return {
        id: estCd5411.id,
        codigo: estCd5411.codigo,
        accessToken: estCd5411.ifood_access_token,
        refreshToken: estCd5411.ifood_refresh_token,
        merchantId: estCd5411.ifood_merchant_id,
      };
    }
  } catch (cdErr) {
    console.warn("[iFood Confirm CD-5411 Check Warn]", cdErr);
  }

  // 4. Busca qualquer estabelecimento com token
  try {
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
        accessToken: est.ifood_access_token,
        refreshToken: est.ifood_refresh_token,
        merchantId: est.ifood_merchant_id,
      };
    }
  } catch (gErr) {
    console.warn("[iFood Confirm All Stores Check Warn]", gErr);
  }

  return { error: `Nenhum token de autorização do iFood encontrado para a loja '${targetCode || "CD-5411"}'. Conecte sua loja ao iFood nas configurações.` };
}

async function renovarToken(estabelecimentoId: string, refreshToken: string) {
  const ifoodClientId =
    (typeof process !== "undefined" && (process.env?.IFOOD_CLIENT_ID || process.env?.VITE_IFOOD_CLIENT_ID)) || "";
  const ifoodClientSecret =
    (typeof process !== "undefined" && (process.env?.IFOOD_CLIENT_SECRET || process.env?.VITE_IFOOD_CLIENT_SECRET)) || "";

  if (!refreshToken || !ifoodClientId) {
    throw new Error("Credenciais insuficientes para renovar o token iFood.");
  }

  const bodyParams = new URLSearchParams();
  bodyParams.append("grantType", "refresh_token");
  bodyParams.append("clientId", ifoodClientId.trim());
  bodyParams.append("clientSecret", ifoodClientSecret.trim());
  bodyParams.append("refreshToken", refreshToken.trim());

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
    throw new Error(`Falha ao renovar token iFood (${res.status}): ${errTxt}`);
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

export default async function handler(req: any, res: any) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const orderId = String(
      req.query?.orderId ||
      req.query?.id ||
      req.body?.orderId ||
      req.body?.id ||
      ""
    ).trim();

    const estabelecimentoCodigo = String(
      req.query?.estabelecimento_codigo ||
      req.body?.estabelecimento_codigo ||
      req.headers?.["x-estabelecimento-codigo"] ||
      ""
    ).trim();

    if (!orderId) {
      return res.status(400).json({ success: false, error: "ID do pedido não informado." });
    }

    const estData = await obterTokensIFood(estabelecimentoCodigo, orderId);
    if ("error" in estData && estData.error) {
      return res.status(404).json({ success: false, error: estData.error });
    }

    let accessToken = estData.accessToken;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Esta loja ainda não possui um token de acesso válido do iFood conectado. Conecte sua loja nas configurações.",
      });
    }

    const ifoodUrl = `https://merchant-api.ifood.com.br/order/v1.0/orders/${encodeURIComponent(orderId)}/confirm`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    console.log(`[iFood Confirm] Confirmando pedido ${orderId} no iFood...`);
    let ifoodRes = await fetch(ifoodUrl, { method: "POST", headers });

    // Auto-refresh se 401
    if (ifoodRes.status === 401 && estData.refreshToken) {
      try {
        console.log(`[iFood Confirm 401] Renovando access_token para ${estData.codigo}...`);
        accessToken = await renovarToken(estData.id, estData.refreshToken);
        headers.Authorization = `Bearer ${accessToken}`;
        ifoodRes = await fetch(ifoodUrl, { method: "POST", headers });
      } catch (renewErr) {
        console.error("[iFood Confirm Renew Token Error]", renewErr);
      }
    }

    if (!ifoodRes.ok && ifoodRes.status !== 202 && ifoodRes.status !== 200 && ifoodRes.status !== 204) {
      const errBody = await ifoodRes.text();
      console.error(`[iFood Confirm Error] Falhou (HTTP ${ifoodRes.status}): ${errBody}`);
      return res.status(ifoodRes.status || 400).json({
        success: false,
        error: `iFood retornou erro ${ifoodRes.status}: ${errBody || "Operação não autorizada ou pedido não encontrado no iFood."}`,
      });
    }

    // Atualiza status no Supabase
    const supabase = getSupabaseBackendClient();
    try {
      await supabase
        .from("encomendas")
        .update({
          status: "em_producao",
          updated_at: new Date().toISOString(),
        })
        .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`);
    } catch (dbErr) {
      console.warn("[iFood Confirm DB Status Warn]", dbErr);
    }

    return res.status(200).json({
      success: true,
      message: "Pedido confirmado com sucesso no iFood!",
    });
  } catch (err: any) {
    console.error("[iFood Confirm Fatal Exception]", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
}
