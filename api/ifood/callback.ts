// Vercel Serverless Function for iFood OAuth Callback (/api/ifood/callback)
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

function getSupabaseBackendClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: any, res: any) {
  const host =
    (req.headers?.["x-forwarded-proto"] ? `${req.headers["x-forwarded-proto"]}://` : "https://") +
    (req.headers?.["x-forwarded-host"] || req.headers?.host || "caixadoce.com.br");

  const authCode =
    req.query?.authorizationCode ||
    req.query?.authorization_code ||
    req.query?.code;

  const stateCode =
    req.query?.state ||
    req.query?.estabelecimento_codigo ||
    "";

  const ifoodError = req.query?.error;

  if (ifoodError || !authCode) {
    console.warn(`[iFood OAuth Callback Error] Erro iFood: ${ifoodError || "Sem código de autorização"}`);
    return res.redirect(
      302,
      `${host}/painel/configuracoes?ifood=error&message=${encodeURIComponent(ifoodError || "authorization_code_missing")}`
    );
  }

  const ifoodClientId =
    process.env.IFOOD_CLIENT_ID ||
    process.env.VITE_IFOOD_CLIENT_ID ||
    "";

  const ifoodClientSecret =
    process.env.IFOOD_CLIENT_SECRET ||
    process.env.VITE_IFOOD_CLIENT_SECRET ||
    "";

  const redirectUri = `${host}/api/ifood/callback`;

  try {
    const bodyParams = new URLSearchParams({
      grantType: "authorization_code",
      clientId: ifoodClientId,
      clientSecret: ifoodClientSecret,
      authorizationCode: authCode,
      redirectUri: redirectUri,
    });

    console.log(`[iFood OAuth Callback] Trocando código por token para loja '${stateCode}'...`);

    let tokenRes = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
    });

    let tokenData: any = null;

    if (tokenRes.ok) {
      tokenData = await tokenRes.json();
    } else {
      // Fallback para envio em JSON caso a API exija application/json
      tokenRes = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantType: "authorization_code",
          clientId: ifoodClientId,
          clientSecret: ifoodClientSecret,
          authorizationCode: authCode,
          redirectUri: redirectUri,
        }),
      });

      if (tokenRes.ok) {
        tokenData = await tokenRes.json();
      } else {
        const errBody = await tokenRes.text();
        console.error(`[iFood OAuth Token Exchange Failed] HTTP ${tokenRes.status}: ${errBody}`);
        return res.redirect(
          302,
          `${host}/painel/configuracoes?ifood=error&message=${encodeURIComponent("token_exchange_failed")}`
        );
      }
    }

    const accessToken = tokenData?.accessToken || tokenData?.access_token || "";
    const refreshToken = tokenData?.refreshToken || tokenData?.refresh_token || "";
    let merchantId =
      tokenData?.merchantId ||
      tokenData?.merchant_id ||
      (Array.isArray(tokenData?.merchants) && tokenData?.merchants[0]?.id) ||
      "";

    // Se o merchantId não veio diretamente no payload do token, busca na API de merchants do iFood
    if (!merchantId && accessToken) {
      try {
        const merchantsRes = await fetch("https://merchant-api.ifood.com.br/merchant/v1.0/merchants", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        if (merchantsRes.ok) {
          const merchantsData: any = await merchantsRes.json();
          if (Array.isArray(merchantsData) && merchantsData.length > 0) {
            merchantId = merchantsData[0]?.id || merchantsData[0]?.merchantId || "";
          } else if (merchantsData?.id) {
            merchantId = merchantsData.id;
          }
        }
      } catch (mErr) {
        console.warn("[iFood Fetch Merchants Log]", mErr);
      }
    }

    console.log(`[iFood OAuth Success] Loja: ${stateCode} | merchantId: ${merchantId}`);

    // Salvar tokens e merchantId na tabela estabelecimentos no Supabase
    const supabase = getSupabaseBackendClient();
    const updatePayload = {
      ifood_access_token: accessToken,
      ifood_refresh_token: refreshToken,
      ifood_merchant_id: merchantId,
      ifood_status: "conectado",
      updated_at: new Date().toISOString(),
    };

    if (stateCode) {
      await supabase
        .from("estabelecimentos")
        .update(updatePayload)
        .ilike("codigo", stateCode.trim());
    } else {
      // Se não veio state, atualiza o estabelecimento ativo ou mais recente
      const { data: ests } = await supabase
        .from("estabelecimentos")
        .select("id, codigo")
        .order("created_at", { ascending: false })
        .limit(1);

      if (ests && ests.length > 0) {
        await supabase
          .from("estabelecimentos")
          .update(updatePayload)
          .eq("id", ests[0].id);
      }
    }

    // Redireciona com feedback visual de sucesso
    return res.redirect(302, `${host}/painel/configuracoes?ifood_connected=true`);
  } catch (err: any) {
    console.error("[iFood OAuth Callback Exception]", err);
    return res.redirect(
      302,
      `${host}/painel/configuracoes?ifood=error&message=${encodeURIComponent(err?.message || "server_error")}`
    );
  }
}
