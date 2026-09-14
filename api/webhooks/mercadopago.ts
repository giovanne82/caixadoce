// Vercel Serverless Function for Mercado Pago Webhook (/api/webhooks/mercadopago)
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

const DEFAULT_MP_ACCESS_TOKEN =
  "APP_USR-3682622436709302-082412-8dce93a51299673df017bb9caf9b848b-78387856";

function getSupabaseBackendClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getMercadoPagoToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    DEFAULT_MP_ACCESS_TOKEN
  );
}

export default async function handler(req: any, res: any) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  };

  // 1. Preflight CORS
  if (req.method === "OPTIONS") {
    if (res && res.setHeader) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      return res.status ? res.status(200).end() : new Response(null, { status: 200, headers: corsHeaders });
    }
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 2. Health check / GET
  if (req.method === "GET") {
    const payload = JSON.stringify({ status: "ok", message: "Webhook Mercado Pago CaixaDoce Ativo" });
    if (res && res.status) {
      return res.status(200).send ? res.status(200).send(payload) : res.status(200).json({ status: "ok", message: "Webhook Mercado Pago CaixaDoce Ativo" });
    }
    return new Response(payload, { status: 200, headers: corsHeaders });
  }

  // 3. Recebimento de Notificação POST
  if (req.method === "POST") {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      let paymentId =
        req.query?.["data.id"] ||
        req.query?.id ||
        req.query?.data_id ||
        body?.data?.id ||
        body?.id ||
        (body?.resource ? String(body.resource).split("/").pop() : null);

      console.log(`[MercadoPago Webhook] Evento POST recebido. Payment ID: ${paymentId}`);

      const isMockOrTest =
        !paymentId ||
        paymentId === "123456" ||
        paymentId === "123456789" ||
        paymentId === "12345" ||
        paymentId === "1234567" ||
        body?.live_mode === false ||
        body?.action === "test" ||
        body?.type === "test";

      if (isMockOrTest) {
        console.log(`[MercadoPago Webhook] Simulação/Teste detectado (ID: ${paymentId}). Retornando 200 OK.`);
        const resp = JSON.stringify({ received: true, status: "ok_simulation", payment_id: paymentId });
        if (res && res.status) return res.status(200).send ? res.status(200).send(resp) : res.status(200).json({ received: true, status: "ok_simulation", payment_id: paymentId });
        return new Response(resp, { status: 200, headers: corsHeaders });
      }

      const mpToken = getMercadoPagoToken();
      const supabase = getSupabaseBackendClient();

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${mpToken}`, Accept: "application/json" },
        });

        if (!mpRes.ok) {
          const errTxt = await mpRes.text().catch(() => "");
          console.warn(`[MercadoPago Webhook Warn] MP API HTTP ${mpRes.status} para ID ${paymentId}: ${errTxt}`);
        } else {
          const paymentData: any = await mpRes.json();
          const status = String(paymentData.status || "").toLowerCase();
          const externalRef = String(
            paymentData.external_reference ||
            paymentData.metadata?.external_reference ||
            paymentData.metadata?.estabelecimento_codigo ||
            paymentData.metadata?.pedido_id ||
            ""
          ).trim();

          const amount = Number(paymentData.transaction_amount || paymentData.transaction_details?.total_paid_amount || 0);
          const payerEmail = String(paymentData.payer?.email || paymentData.metadata?.email || "").trim();

          if (status === "approved" || status === "authorized") {
            let estMatch: any = null;

            if (externalRef) {
              const { data: listCod } = await supabase
                .from("estabelecimentos")
                .select("id, codigo, plano_expira_em, plano_exp")
                .or(`codigo.ilike.${externalRef},id.eq.${externalRef},slug.ilike.${externalRef}`)
                .limit(1);
              if (listCod && listCod.length > 0) estMatch = listCod[0];
            }

            if (!estMatch && payerEmail) {
              const { data: listEmail } = await supabase
                .from("estabelecimentos")
                .select("id, codigo, plano_expira_em, plano_exp")
                .ilike("email", payerEmail)
                .limit(1);
              if (listEmail && listEmail.length > 0) estMatch = listEmail[0];
            }

            if (estMatch) {
              const isAnual = amount >= 100 || String(paymentData.description || "").toLowerCase().includes("anual");
              const duracaoDias = isAnual ? 365 : 30;

              let baseMs = Date.now();
              const expStr = estMatch.plano_expira_em || estMatch.plano_exp;
              if (expStr) {
                const expMs = new Date(expStr).getTime();
                if (!isNaN(expMs) && expMs > baseMs) baseMs = expMs;
              }

              const novaExpiraIso = new Date(baseMs + duracaoDias * 24 * 60 * 60 * 1000).toISOString();

              await supabase
                .from("estabelecimentos")
                .update({
                  plano_expira_em: novaExpiraIso,
                  plano_exp: novaExpiraIso,
                  status: "ativo",
                  plano_status: "ativo",
                  status_assinatura: "ativo",
                  is_pro: true,
                  plano_id: isAnual ? "anual" : "mensal",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", estMatch.id);

              console.log(`[MercadoPago Webhook Success] Assinatura renovada para loja ${estMatch.codigo} até ${novaExpiraIso}`);
            }

            if (externalRef) {
              const { data: listEnc } = await supabase
                .from("encomendas")
                .select("id, valor_total, historico_pagamentos")
                .or(`id.eq.${externalRef},codigo_pedido_ifood.eq.${externalRef},codigo.eq.${externalRef}`)
                .limit(1);

              if (listEnc && listEnc.length > 0) {
                const encRow = listEnc[0];
                const valorPago = amount > 0 ? amount : Number(encRow.valor_total || 0);
                const historico = Array.isArray(encRow.historico_pagamentos) ? encRow.historico_pagamentos : [];
                historico.push({
                  id: `mp_${paymentId}`,
                  data: new Date().toISOString().split("T")[0],
                  valor: valorPago,
                  observacao: "Pagamento aprovado via Webhook Mercado Pago",
                });

                await supabase
                  .from("encomendas")
                  .update({
                    status_pagamento: "pago_integral",
                    metodo_pagamento: "Mercado Pago",
                    forma_pagamento: "Mercado Pago",
                    origem_pagamento: "mercadopago",
                    valor_entrada: valorPago,
                    historico_pagamentos: historico,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", encRow.id);

                console.log(`[MercadoPago Webhook Success] Encomenda ${encRow.id} atualizada para PAGO!`);
              }
            }
          }
        }
      } catch (fetchErr: any) {
        console.warn(`[MercadoPago Webhook Exception Captured] Erro ao consultar MP:`, fetchErr?.message || fetchErr);
      }

      const okResponse = JSON.stringify({ received: true, status: "processed", payment_id: paymentId });
      if (res && res.status) return res.status(200).send ? res.status(200).send(okResponse) : res.status(200).json({ received: true, status: "processed", payment_id: paymentId });
      return new Response(okResponse, { status: 200, headers: corsHeaders });
    } catch (err: any) {
      console.error("[MercadoPago Webhook Exception]", err);
      const errResponse = JSON.stringify({ received: true, error: err?.message || "Internal error" });
      if (res && res.status) return res.status(200).send ? res.status(200).send(errResponse) : res.status(200).json({ received: true });
      return new Response(errResponse, { status: 200, headers: corsHeaders });
    }
  }

  const defaultResponse = JSON.stringify({ received: true });
  if (res && res.status) return res.status(200).send ? res.status(200).send(defaultResponse) : res.status(200).json({ received: true });
  return new Response(defaultResponse, { status: 200, headers: corsHeaders });
}
