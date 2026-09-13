// Vercel Serverless Function for 99Food Order Dispatch (/api/99food/orders/dispatch)
import { executarAcaoPedido99Food } from "../../../src/lib/nine-nine-food-service";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const orderId = req.body?.orderId || req.query?.orderId;
  const estCodigo = req.body?.estabelecimento_codigo || req.query?.estabelecimento_codigo;

  if (!orderId) {
    return res.status(400).json({ success: false, error: "ID do pedido não informado." });
  }

  const result = await executarAcaoPedido99Food(orderId, "dispatch", {
    estabelecimento_codigo: estCodigo,
  });

  return res.status(result.status || (result.success ? 200 : 400)).json(result);
}
