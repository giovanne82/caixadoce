import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application, x-application-name, x-requested-with, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!paymentId && req.method === "POST") {
      try {
        const body = await req.json();
        paymentId = body.data?.id || body.id || (body.resource ? String(body.resource).split("/").pop() : null);
      } catch {}
    }

    console.log("[webhook-mp Edge Function] Notificacao recebida. Payment ID:", paymentId);

    if (paymentId) {
      const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("VITE_MERCADOPAGO_ACCESS_TOKEN") || "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

      if (accessToken) {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (mpRes.ok) {
          const paymentData = await mpRes.json();
          console.log(`[webhook-mp Edge Function] Consulta Payment ${paymentId}: status=${paymentData.status}`);

          if (paymentData.status === "approved" || paymentData.status === "authorized") {
            const meta = paymentData.metadata || {};
            const amount = Number(paymentData.transaction_amount || 0);
            const externalRef = String(paymentData.external_reference || meta.pedido_id || meta.order_id || "").trim();

            if (externalRef && supabaseUrl && supabaseKey) {
              const encRes = await fetch(`${supabaseUrl}/rest/v1/encomendas?id=eq.${encodeURIComponent(externalRef)}&select=id,valor_total`, {
                headers: {
                  apikey: supabaseKey,
                  authorization: `Bearer ${supabaseKey}`,
                },
              });

              if (encRes.ok) {
                const encData = await encRes.json();
                if (encData && encData.length > 0) {
                  const encRow = encData[0];
                  const valorPago = amount > 0 ? amount : Number(encRow.valor_total || 0);

                  await fetch(`${supabaseUrl}/rest/v1/encomendas?id=eq.${encodeURIComponent(externalRef)}`, {
                    method: "PATCH",
                    headers: {
                      apikey: supabaseKey,
                      authorization: `Bearer ${supabaseKey}`,
                      "content-type": "application/json",
                    },
                    body: JSON.stringify({
                      status_pagamento: "pago_integral",
                      metodo_pagamento: "Mercado Pago",
                      forma_pagamento: "Mercado Pago",
                      origem_pagamento: "mercadopago",
                      valor_entrada: valorPago,
                      historico_pagamentos: [
                        {
                          id: `mp_${paymentId}`,
                          data: new Date().toISOString().split("T")[0],
                          valor: valorPago,
                          observacao: "Pagamento aprovado via Webhook MP Edge Function (Pix Automatico)",
                        },
                      ],
                      updated_at: new Date().toISOString(),
                    }),
                  });

                  console.log(`[webhook-mp Edge Function] Encomenda ${externalRef} atualizada com status PAGO!`);
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, status: "webhook_mp_processed", payment_id: paymentId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[webhook-mp Edge Function Exception]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro no processamento do webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
