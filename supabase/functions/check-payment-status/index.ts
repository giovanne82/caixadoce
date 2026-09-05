import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application, x-application-name, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    let paymentId = url.searchParams.get("payment_id") || url.searchParams.get("id");
    let token = url.searchParams.get("mp_access_token") || url.searchParams.get("token") || url.searchParams.get("access_token");
    let establishmentCode = url.searchParams.get("estabelecimentoCodigo") || url.searchParams.get("establishmentCode") || url.searchParams.get("codigo");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        paymentId = paymentId || body.payment_id || body.paymentId || body.id;
        token = token || body.mp_access_token || body.accessToken || body.access_token;
        establishmentCode = establishmentCode || body.establishmentCode || body.estabelecimentoCodigo || body.codigo;
      } catch {}
    }

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Parâmetro payment_id é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!token && establishmentCode) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (supabaseUrl && supabaseKey) {
        try {
          const estRes = await fetch(
            `${supabaseUrl}/rest/v1/estabelecimentos?codigo=ilike.${encodeURIComponent(establishmentCode)}&select=mp_access_token`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          if (estRes.ok) {
            const list = await estRes.json();
            if (list[0]?.mp_access_token) {
              token = list[0].mp_access_token;
            }
          }
        } catch {}
      }
    }

    if (!token) {
      token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || Deno.env.get("VITE_MERCADOPAGO_ACCESS_TOKEN") || "";
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Access token do Mercado Pago não encontrado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok || mpData.error) {
      console.error("[check-payment-status Error]", mpData);
      return new Response(
        JSON.stringify({
          error: mpData.message || mpData.error || "Erro ao consultar pagamento no Mercado Pago",
          status: "error",
          approved: false,
        }),
        { status: mpRes.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = mpData.status;
    const isApproved = status === "approved" || status === "authorized";

    return new Response(
      JSON.stringify({
        success: true,
        approved: isApproved,
        status: status,
        status_detail: mpData.status_detail,
        id: mpData.id,
        payment_id: mpData.id,
        payment_method_id: mpData.payment_method_id,
        transaction_amount: mpData.transaction_amount,
        date_approved: mpData.date_approved,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[check-payment-status Exception]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno ao consultar pagamento." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
