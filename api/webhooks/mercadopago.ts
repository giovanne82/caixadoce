// Vercel Serverless Function for Mercado Pago Webhook (/api/webhooks/mercadopago)
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

const DEFAULT_MP_ACCESS_TOKEN =
  "APP_USR-3682622436709302-082412-8dce93a51299673df017bb9caf9b848b-78387856";

function getSupabaseConfig() {
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
    DEFAULT_SUPABASE_ANON_KEY;

  return { supabaseUrl, supabaseKey };
}

function getSupabaseBackendClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getMercadoPagoAccessToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    DEFAULT_MP_ACCESS_TOKEN
  );
}

export async function processMercadoPagoWebhook(req: any) {
  // Extract payment ID from query params or body
  let paymentId: string | null = null;

  if (req.query) {
    paymentId =
      (req.query["data.id"] as string) ||
      (req.query.id as string) ||
      (req.query["id"] as string) ||
      (req.query.data_id as string) ||
      null;
  }

  if (!paymentId && req.body) {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    paymentId =
      body.data?.id ||
      body.id ||
      (body.resource ? String(body.resource).split("/").pop() : null) ||
      null;
  }

  console.log(`[MercadoPago Webhook] Request received. Payment ID: ${paymentId}`);

  let body: any = null;
  if (req.body) {
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {}
  }

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
    console.log(`[MercadoPago Webhook] Evento de SIMULAÇÃO/TESTE recebido (Payment ID: '${paymentId}'). Retornando OK.`);
    return { received: true, status: "ok_simulation", paymentId };
  }

  const mpToken = getMercadoPagoAccessToken();
  if (!mpToken) {
    console.error("[MercadoPago Webhook Error] Access token not configured.");
    return { received: true, status: "error_no_access_token" };
  }

  // Fetch payment details from Mercado Pago API
  let paymentData: any = null;
  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpToken}`,
        Accept: "application/json",
      },
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text().catch(() => "");
      console.warn(`[MercadoPago Webhook Warn] HTTP ${mpRes.status} querying payment ${paymentId}: ${errText}`);
      return { received: true, status: "mp_api_non_ok_captured", code: mpRes.status, paymentId };
    }

    paymentData = await mpRes.json();
  } catch (errFetch: any) {
    console.warn(`[MercadoPago Webhook Exception Captured] Erro ao consultar MP para ID '${paymentId}':`, errFetch?.message || errFetch);
    return { received: true, status: "mp_api_exception_captured", paymentId };
  }
  const status = String(paymentData.status || "").toLowerCase();
  const externalRef = String(
    paymentData.external_reference ||
    paymentData.metadata?.external_reference ||
    paymentData.metadata?.estabelecimento_codigo ||
    paymentData.metadata?.pedido_id ||
    paymentData.metadata?.order_id ||
    ""
  ).trim();

  const amount = Number(
    paymentData.transaction_amount ||
    paymentData.transaction_details?.total_paid_amount ||
    0
  );

  const payerEmail = String(
    paymentData.payer?.email ||
    paymentData.metadata?.email ||
    ""
  ).trim();

  console.log(
    `[MercadoPago Webhook] Payment ${paymentId}: status='${status}', external_ref='${externalRef}', amount=${amount}, payer='${payerEmail}'`
  );

  if (status !== "approved" && status !== "authorized") {
    console.log(`[MercadoPago Webhook] Payment ${paymentId} status is '${status}' (not approved). Skipping update.`);
    return { received: true, status: `ignored_status_${status}`, paymentId };
  }

  const supabase = getSupabaseBackendClient();
  const now = new Date();
  const agoraMs = now.getTime();

  let estAtualizado = false;

  // 1. Tentar atualizar Estabelecimento (Assinatura de Plano)
  if (externalRef || payerEmail) {
    try {
      let estMatch: any = null;

      // Busca por código (ex: CD-1004) ou UUID de estabelecimento
      if (externalRef) {
        const { data: listCod } = await supabase
          .from("estabelecimentos")
          .select("id, codigo, plano_expira_em, plano_exp, email")
          .or(`codigo.ilike.${externalRef},id.eq.${externalRef},slug.ilike.${externalRef}`)
          .limit(1);

        if (listCod && listCod.length > 0) {
          estMatch = listCod[0];
        }
      }

      // Se não encontrou por external_reference, busca por e-mail do pagador
      if (!estMatch && payerEmail) {
        const { data: listEmail } = await supabase
          .from("estabelecimentos")
          .select("id, codigo, plano_expira_em, plano_exp, email")
          .ilike("email", payerEmail)
          .limit(1);

        if (listEmail && listEmail.length > 0) {
          estMatch = listEmail[0];
        }
      }

      if (estMatch) {
        console.log(`[MercadoPago Webhook] Estabelecimento encontrado: '${estMatch.codigo}' (ID: ${estMatch.id})`);

        // Calcular validade: +365 dias para plano anual (ex: valor >= R$100 ou descrição anual), senão +30 dias
        const isAnual =
          amount >= 100 ||
          String(paymentData.description || "").toLowerCase().includes("anual") ||
          String(paymentData.metadata?.plano || "").toLowerCase().includes("anual");

        const duracaoDias = isAnual ? 365 : 30;

        let baseMs = agoraMs;
        const expExistenteStr = estMatch.plano_expira_em || estMatch.plano_exp;
        if (expExistenteStr) {
          const expMs = new Date(expExistenteStr).getTime();
          if (!isNaN(expMs) && expMs > agoraMs) {
            baseMs = expMs;
          }
        }

        const novaExpiraIso = new Date(baseMs + duracaoDias * 24 * 60 * 60 * 1000).toISOString();

        const patchPayload: any = {
          plano_expira_em: novaExpiraIso,
          plano_exp: novaExpiraIso,
          status: "ativo",
          plano_status: "ativo",
          status_assinatura: "ativo",
          is_pro: true,
          plano_id: isAnual ? "anual" : "mensal",
          updated_at: now.toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("estabelecimentos")
          .update(patchPayload)
          .eq("id", estMatch.id);

        if (updateErr) {
          console.error(`[MercadoPago Webhook Error] Falha ao atualizar estabelecimento ${estMatch.codigo}:`, updateErr);
        } else {
          console.log(
            `[MercadoPago Webhook Success] Assinatura renovada para a loja '${estMatch.codigo}'! +${duracaoDias} dias. Nova expiração: ${novaExpiraIso}`
          );
          estAtualizado = true;
        }
      }
    } catch (eEst) {
      console.error("[MercadoPago Webhook Exception] Erro ao processar atualização de estabelecimento:", eEst);
    }
  }

  // 2. Tentar atualizar Encomenda (Pedido de Loja), se external_reference corresponder a uma encomenda
  if (externalRef) {
    try {
      const { data: listEnc } = await supabase
        .from("encomendas")
        .select("id, valor_total, historico_pagamentos")
        .or(`id.eq.${externalRef},codigo_pedido_ifood.eq.${externalRef},codigo.eq.${externalRef}`)
        .limit(1);

      if (listEnc && listEnc.length > 0) {
        const encRow = listEnc[0];
        const valorPago = amount > 0 ? amount : Number(encRow.valor_total || 0);

        const historicoExistente = Array.isArray(encRow.historico_pagamentos) ? encRow.historico_pagamentos : [];
        const novoHistorico = [
          ...historicoExistente,
          {
            id: `mp_${paymentId}`,
            data: now.toISOString().split("T")[0],
            valor: valorPago,
            observacao: "Pagamento aprovado via Webhook Mercado Pago",
          },
        ];

        await supabase
          .from("encomendas")
          .update({
            status_pagamento: "pago_integral",
            metodo_pagamento: "Mercado Pago",
            forma_pagamento: "Mercado Pago",
            origem_pagamento: "mercadopago",
            valor_entrada: valorPago,
            historico_pagamentos: novoHistorico,
            updated_at: now.toISOString(),
          })
          .eq("id", encRow.id);

        console.log(`[MercadoPago Webhook Success] Encomenda ID ${encRow.id} atualizada para PAGO!`);
      }
    } catch (eEnc) {
      console.error("[MercadoPago Webhook Exception] Erro ao processar atualização de encomenda:", eEnc);
    }
  }

  return {
    received: true,
    status: "processed",
    paymentId,
    estabelecimentoAtualizado: estAtualizado,
  };
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).send("Webhook Mercado Pago CaixaDoce Ativo");
  }

  if (req.method === "POST") {
    try {
      const result = await processMercadoPagoWebhook(req);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("[MercadoPago Webhook Handler Error]", err);
      return res.status(200).json({ received: true, error: err?.message || "Internal error" });
    }
  }

  return res.status(200).send("OK");
}
