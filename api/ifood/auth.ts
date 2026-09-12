// Vercel Serverless Function for iFood Device Authorization Grant (/api/ifood/auth e /api/ifood/userCode)
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
    const estCode =
      req.query?.estabelecimento_codigo ||
      req.body?.estabelecimento_codigo ||
      req.query?.state ||
      req.body?.state ||
      "";

    const ifoodClientId =
      process.env.IFOOD_CLIENT_ID ||
      process.env.VITE_IFOOD_CLIENT_ID ||
      "";

    if (!ifoodClientId) {
      console.error("[iFood OAuth] Credencial IFOOD_CLIENT_ID não encontrada nas variáveis de ambiente!");
      return res.status(500).json({
        success: false,
        error: "Credencial IFOOD_CLIENT_ID não configurada no servidor.",
      });
    }

    console.log(`[iFood OAuth userCode] Solicitando userCode para loja '${estCode}' com clientId '${ifoodClientId}'...`);

    // POST para /authentication/v1.0/oauth/userCode
    const bodyParams = new URLSearchParams({
      clientId: ifoodClientId,
    });

    let ifoodRes = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/userCode", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
    });

    let ifoodData: any = null;

    if (ifoodRes.ok) {
      ifoodData = await ifoodRes.json();
    } else {
      // Fallback JSON
      ifoodRes = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/userCode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: ifoodClientId }),
      });

      if (ifoodRes.ok) {
        ifoodData = await ifoodRes.json();
      } else {
        const errTxt = await ifoodRes.text();
        console.error(`[iFood OAuth userCode Error] HTTP ${ifoodRes.status}: ${errTxt}`);
        return res.status(ifoodRes.status || 400).json({
          success: false,
          error: `Erro ao obter código de autorização do iFood: ${errTxt}`,
        });
      }
    }

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
