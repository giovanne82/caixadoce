import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application, x-application-name, x-requested-with, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

function formatarDataExpiracaoPixMercadoPago(minutosNoFuturo = 5): string {
  const agora = new Date();
  const dataFutura = new Date(agora.getTime() + minutosNoFuturo * 60 * 1000);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(dataFutura);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const ano = map.year;
  const mes = map.month;
  const dia = map.day;
  const hora = (map.hour || "00").padStart(2, "0");
  const minuto = (map.minute || "00").padStart(2, "0");
  const segundo = (map.second || "00").padStart(2, "0");
  const millis = String(dataFutura.getMilliseconds()).padStart(3, "0");

  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}.${millis}-03:00`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const token = body.mp_access_token || body.accessToken || body.access_token || Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
    const amount = Number(body.transaction_amount || body.amount || body.valor || 0);
    const description = body.description || "Pedido CaixaDoce";
    const payer = body.payer || {
      email: body.payerEmail || body.email || "cliente@caixadoce.com.br",
      first_name: body.payerFirstName || body.clienteNome || "Cliente",
    };

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Access token do Mercado Pago não fornecido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "O valor da transação (transaction_amount) deve ser maior que zero." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const expDate = body.date_of_expiration || formatarDataExpiracaoPixMercadoPago(5);
    const notificationUrl = body.notification_url || undefined;
    const externalRef = body.external_reference || body.pedidoId || body.orderId || "";

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        payment_method_id: "pix",
        description,
        date_of_expiration: expDate,
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        ...(externalRef ? { external_reference: externalRef } : {}),
        payer: {
          email: payer.email || "cliente@caixadoce.com.br",
          first_name: payer.first_name || "Cliente",
        },
        metadata: {
          pedido_id: externalRef,
          tipo: "encomenda",
        },
      }),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok || mpData.error) {
      console.error("[MercadoPago Edge Function Error]", mpData);
      return new Response(
        JSON.stringify({
          error: mpData.message || mpData.error || "Erro retornado pelo Mercado Pago",
          details: mpData,
        }),
        { status: mpRes.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pointOfInteraction = mpData.point_of_interaction;
    const qrCodeBase64 = pointOfInteraction?.transaction_data?.qr_code_base64 || null;
    const qrCode = pointOfInteraction?.transaction_data?.qr_code || null;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: mpData.id,
        id: mpData.id,
        status: mpData.status,
        point_of_interaction: pointOfInteraction,
        qr_code_base64: qrCodeBase64,
        qr_code: qrCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[create-pix-payment Edge Function Exception]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno ao processar Pix." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
