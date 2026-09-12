// Vercel Serverless Function for iFood OAuth Authorization (/api/ifood/authorize)
export default async function handler(req: any, res: any) {
  try {
    const estCode =
      req.query?.estabelecimento_codigo ||
      req.query?.state ||
      req.query?.code ||
      req.query?.id ||
      "";

    const ifoodClientId =
      process.env.IFOOD_CLIENT_ID ||
      process.env.VITE_IFOOD_CLIENT_ID ||
      "";

    if (!ifoodClientId) {
      console.error("[iFood OAuth] Credencial IFOOD_CLIENT_ID não encontrada nas variáveis de ambiente!");
    }

    const host = req.headers?.host ? `https://${req.headers.host}` : "https://caixadoce.com.br";
    const redirectUri = `${host}/api/ifood/callback`;

    const authorizationUrl = `https://merchant-api.ifood.com.br/authentication/v1.0/oauth/authorize?clientId=${encodeURIComponent(
      ifoodClientId
    )}&state=${encodeURIComponent(estCode)}&redirectUri=${encodeURIComponent(redirectUri)}`;

    console.log(`[iFood OAuth Authorize Vercel] Redirecionando para: ${authorizationUrl}`);
    return res.redirect(302, authorizationUrl);
  } catch (err: any) {
    console.error("[iFood Authorize Error]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
