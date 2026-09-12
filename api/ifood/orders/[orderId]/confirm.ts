// Vercel Serverless Function: POST /api/ifood/orders/[orderId]/confirm
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

  try {
    const result = await executarAcaoPedidoIFood(orderId, "confirm", {
      estabelecimento_codigo: estabelecimentoCodigo,
    });

    return res.status(result.status || (result.success ? 200 : 400)).json(result);
  } catch (err: any) {
    console.error("[iFood Confirm Exception]", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
