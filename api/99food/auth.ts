// Vercel Serverless Function for 99Food OAuth Authorization Init (/api/99food/auth)
import { gerarUrlAutorizacao99Food } from "../../src/lib/nine-nine-food-service";

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

  const estCode = String(
    req.query?.estabelecimento_codigo ||
    req.body?.estabelecimento_codigo ||
    req.query?.state ||
    req.body?.state ||
    "CD-5411"
  ).trim();

  const host =
    (req.headers?.["x-forwarded-proto"] ? `${req.headers["x-forwarded-proto"]}://` : "https://") +
    (req.headers?.["x-forwarded-host"] || req.headers?.host || "caixadoce.com.br");

  const redirectUri = `${host}/api/99food/callback`;
  const { authUrl, clientId } = gerarUrlAutorizacao99Food(estCode, redirectUri);

  const isJsonRequest =
    req.headers?.accept?.includes("application/json") ||
    req.headers?.["content-type"]?.includes("application/json");

  if (isJsonRequest) {
    return res.status(200).json({
      success: true,
      authUrl,
      clientId,
    });
  }

  return res.redirect(302, authUrl);
}
