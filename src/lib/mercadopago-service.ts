export interface MercadoPagoPaymentResult {
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | string;
  status_detail?: string;
  id?: number | string;
  payment_method_id?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  error?: string;
}

/**
 * Envia o payload do Checkout Brick para a rota de processamento no servidor backend.
 */
export async function processarPagamentoMercadoPago(
  formData: any,
  establishmentCode: string,
  planId: string = "mensal"
): Promise<MercadoPagoPaymentResult> {
  console.log("[MercadoPago Service] Enviando pagamento para o backend:", establishmentCode, planId);

  const res = await fetch("/api/mercadopago/process-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      formData,
      establishmentCode,
      planId,
      amount: formData?.transaction_amount || 10.90,
      description: `Assinatura Plano Mensal PRO — CaixaDoce (${establishmentCode})`,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Falha ao processar pagamento no Mercado Pago.");
  }

  return data as MercadoPagoPaymentResult;
}
