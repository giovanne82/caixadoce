// Vercel Serverless Function for 99Food OAuth Token Exchange (/api/99food/callback)
import { trocarCodigoOAuth99Food } from "../../src/lib/nine-nine-food-service";

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

  const code =
    req.body?.code ||
    req.query?.code ||
    req.body?.authorizationCode ||
    req.query?.authorizationCode;

  const stateCode =
    req.body?.estabelecimento_codigo ||
    req.body?.state ||
    req.query?.estabelecimento_codigo ||
    req.query?.state ||
    "CD-5411";

  const host =
    (req.headers?.["x-forwarded-proto"] ? `${req.headers["x-forwarded-proto"]}://` : "https://") +
    (req.headers?.["x-forwarded-host"] || req.headers?.host || "caixadoce.com.br");

  const redirectUri = `${host}/api/99food/callback`;

  const isJsonRequest =
    req.headers?.accept?.includes("application/json") ||
    req.headers?.["content-type"]?.includes("application/json") ||
    req.method === "POST";

  if (!code) {
    if (isJsonRequest) {
      return res.status(400).json({ success: false, error: "Código de autorização OAuth do 99Food não informado." });
    }
    return res.redirect(302, `${host}/painel/configuracoes?nine_nine_food=error&message=${encodeURIComponent("authorization_code_missing")}`);
  }

  try {
    const result = await trocarCodigoOAuth99Food(code, stateCode, redirectUri);

    if (!result.success) {
      if (isJsonRequest) {
        return res.status(400).json(result);
      }
      return res.redirect(302, `${host}/painel/configuracoes?nine_nine_food=error&message=${encodeURIComponent(result.error || "token_exchange_failed")}`);
    }

    if (isJsonRequest) {
      return res.status(200).json({
        success: true,
        message: "Sua loja foi conectada ao 99Food com sucesso!",
        merchantId: result.merchantId,
      });
    }

    return res.redirect(302, `${host}/painel/configuracoes?nine_nine_food_connected=true`);
  } catch (err: any) {
    console.error("[99Food OAuth Callback Exception]", err);
    if (isJsonRequest) {
      return res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
    }
    return res.redirect(302, `${host}/painel/configuracoes?nine_nine_food=error&message=${encodeURIComponent(err?.message || "server_error")}`);
  }
}
