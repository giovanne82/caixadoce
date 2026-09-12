// Vercel Serverless Function: POST /api/ifood/orders/[orderId]/cancel
import { executarAcaoPedidoIFood } from "../../../../src/lib/ifood-service";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

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

  const reason = req.body?.reason || req.query?.reason || "Cancelado pelo estabelecimento";
  const cancellationCode = req.body?.cancellationCode || req.query?.cancellationCode || "501";

  try {
    const result = await executarAcaoPedidoIFood(orderId, "cancel", {
      reason,
      cancellationCode,
      estabelecimento_codigo: estabelecimentoCodigo,
    });

    return res.status(result.status || (result.success ? 200 : 400)).json(result);
  } catch (err: any) {
    console.error("[iFood Cancel Exception]", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
