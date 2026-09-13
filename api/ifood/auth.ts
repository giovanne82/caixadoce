// Vercel Serverless Function for iFood OAuth Authentication (/api/ifood/auth e /api/ifood/userCode)
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

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function conectarClientCredentials(
  ifoodClientId: string,
  ifoodClientSecret: string,
  targetCode: string = "CD-5411"
) {
  console.log(`[iFood Client Credentials] Obtendo token para loja '${targetCode}'...`);

  const tokenParams = new URLSearchParams();
  tokenParams.append("grantType", "client_credentials");
  tokenParams.append("clientId", ifoodClientId.trim());
  tokenParams.append("clientSecret", ifoodClientSecret.trim());

  const tokenRes = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error(`[iFood Client Credentials Error] HTTP ${tokenRes.status}: ${errBody}`);
    throw new Error(`iFood Token Error (${tokenRes.status}): ${errBody}`);
  }

  const tokenData: any = await tokenRes.json();
  const accessToken = tokenData.accessToken || tokenData.access_token;
  const refreshToken = tokenData.refreshToken || tokenData.refresh_token || "";
  const expiresIn = tokenData.expiresIn || tokenData.expires_in || 21599;

  let merchantId = tokenData.merchantId || tokenData.merchant_id || "";

  // Tenta buscar merchantId se não veio direto
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

  // Fallback para merchantId padrão de homologação se não retornar da API
  if (!merchantId) {
    merchantId = "4115946";
  }

  console.log(`[iFood Client Credentials Success] Loja: ${targetCode} | merchantId: ${merchantId}`);

  // Persiste no Supabase
  const supabase = getSupabaseBackendClient();
  const updatePayload = {
    ifood_access_token: accessToken,
    ifood_refresh_token: refreshToken,
    ifood_merchant_id: merchantId,
    ifood_status: "conectado",
    updated_at: new Date().toISOString(),
  };

  const cleanTargetCode = targetCode.trim().toUpperCase() || "CD-5411";

  // Atualiza a loja especificada
  const { data: updatedStore, error: updateErr } = await supabase
    .from("estabelecimentos")
    .update(updatePayload)
    .ilike("codigo", cleanTargetCode)
    .select("id, codigo");

  if (updateErr || !updatedStore || updatedStore.length === 0) {
    // Se não encontrou pelo código exato, atualiza CD-5411 ou primeira loja
    await supabase
      .from("estabelecimentos")
      .update(updatePayload)
      .ilike("codigo", "CD-5411");
  }

  return {
    success: true,
    connected: true,
    mode: "client_credentials",
    accessToken,
    merchantId,
    expiresIn,
    message: `Sua loja (${cleanTargetCode}) foi conectada com sucesso ao iFood via Client Credentials (App Centralizado)!`,
  };
}

export default async function handler(req: any, res: any) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  try {
    const estCode = String(
      req.query?.estabelecimento_codigo ||
      req.body?.estabelecimento_codigo ||
      req.query?.state ||
      req.body?.state ||
      "CD-5411"
    ).trim();

    const grantType = String(
      req.query?.grantType ||
      req.body?.grantType ||
      ""
    ).trim();

    const ifoodClientId =
      process.env.IFOOD_CLIENT_ID ||
      process.env.VITE_IFOOD_CLIENT_ID ||
      "";

    const ifoodClientSecret =
      process.env.IFOOD_CLIENT_SECRET ||
      process.env.VITE_IFOOD_CLIENT_SECRET ||
      "";

    if (!ifoodClientId) {
      console.error("[iFood OAuth] Credencial IFOOD_CLIENT_ID não encontrada nas variáveis de ambiente!");
      return res.status(500).json({
        success: false,
        error: "Credencial IFOOD_CLIENT_ID não configurada no servidor.",
      });
    }

    // Se o cliente solicitou explicitamente client_credentials
    if (grantType === "client_credentials" || grantType === "centralizado") {
      if (!ifoodClientSecret) {
        return res.status(400).json({
          success: false,
          error: "Credencial IFOOD_CLIENT_SECRET necessária para grantType client_credentials.",
        });
      }

      const credsResult = await conectarClientCredentials(ifoodClientId, ifoodClientSecret, estCode);
      return res.status(200).json(credsResult);
    }

    // Fluxo padrão 1: Tenta o fluxo de Device Authorization (userCode)
    console.log(`[iFood OAuth userCode] Solicitando userCode para loja '${estCode}' com clientId '${ifoodClientId}'...`);

    const bodyParams = new URLSearchParams();
    bodyParams.append("clientId", ifoodClientId.trim());

    const ifoodRes = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/userCode", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: bodyParams.toString(),
    });

    // Se o iFood recusar o userCode (ex: 400 "Grant type not authorized for client" para App Centralizado),
    // aciona fallback automático imediato para client_credentials!
    if (!ifoodRes.ok) {
      const errTxt = await ifoodRes.text();
      console.warn(`[iFood OAuth userCode Fail (${ifoodRes.status})]: ${errTxt}. Acionando fallback para client_credentials...`);

      if (ifoodClientSecret) {
        try {
          const fallbackResult = await conectarClientCredentials(ifoodClientId, ifoodClientSecret, estCode);
          return res.status(200).json(fallbackResult);
        } catch (fbErr: any) {
          console.error("[iFood Client Credentials Fallback Error]", fbErr);
          return res.status(400).json({
            success: false,
            error: `Erro ao conectar via credenciais iFood: ${fbErr.message || errTxt}`,
          });
        }
      }

      return res.status(ifoodRes.status || 400).json({
        success: false,
        error: `Erro ao obter código de autorização do iFood (${ifoodRes.status}): ${errTxt}`,
      });
    }

    const ifoodData: any = await ifoodRes.json();

    const userCode = ifoodData.userCode;
    const authorizationCodeVerifier = ifoodData.authorizationCodeVerifier;
    const verificationUrlComplete =
      ifoodData.verificationUrlComplete ||
      ifoodData.verificationUrl ||
      `https://portal.ifood.com.br/autorizacao?code=${userCode}`;
    const verificationUrl = ifoodData.verificationUrl || "https://portal.ifood.com.br/autorizacao";
    const expiresIn = ifoodData.expiresIn || 600;

    console.log(`[iFood OAuth userCode Success] userCode: ${userCode} | Loja: ${estCode}`);

    // Salvar authorizationCodeVerifier no banco de dados (na tabela estabelecimentos)
    if (estCode) {
      const supabase = getSupabaseBackendClient();
      await supabase
        .from("estabelecimentos")
        .update({
          ifood_code_verifier: authorizationCodeVerifier,
          updated_at: new Date().toISOString(),
        })
        .ilike("codigo", estCode.trim());
    }

    return res.status(200).json({
      success: true,
      connected: false,
      userCode,
      authorizationCodeVerifier,
      verificationUrlComplete,
      verificationUrl,
      expiresIn,
    });
  } catch (err: any) {
    console.error("[iFood OAuth userCode Exception]", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

