// Vercel Serverless Function: POST /api/ifood/orders/[orderId]/dispatch
import { executarAcaoPedidoIFood } from "../action-helper";

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
    const orderId =
      req.query?.orderId ||
      req.query?.id ||
      req.body?.orderId ||
      req.body?.id ||
      "";

    const estabelecimentoCodigo =
      req.query?.estabelecimento_codigo ||
      req.body?.estabelecimento_codigo ||
      req.headers?.["x-estabelecimento-codigo"] ||
      "";

    const result = await executarAcaoPedidoIFood(orderId, "dispatch", {
      estabelecimento_codigo: estabelecimentoCodigo,
    });

    return res.status(result.status || (result.success ? 200 : 400)).json(result);
  } catch (err: any) {
    console.error("[iFood Dispatch Exception]", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
}
