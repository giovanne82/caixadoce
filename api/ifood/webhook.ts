// Vercel Serverless Function for iFood & Mercado Pago Webhook (/api/ifood/webhook)
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

let cachedAppToken: { token: string; expiresAt: number } | null = null;

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

/**
 * Obtém o access_token oficial da Aplicação (CaixaDoce) via client_credentials
 * para responder a eventos e realizar Acknowledgment na esteira do iFood.
 */
async function obterTokenAppIFood(): Promise<string> {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt > now + 60000 && cachedAppToken.token) {
    return cachedAppToken.token;
  }

  const ifoodClientId =
    (typeof process !== "undefined" && (process.env?.IFOOD_CLIENT_ID || process.env?.VITE_IFOOD_CLIENT_ID)) || "";
  const ifoodClientSecret =
    (typeof process !== "undefined" && (process.env?.IFOOD_CLIENT_SECRET || process.env?.VITE_IFOOD_CLIENT_SECRET)) || "";

  if (ifoodClientId && ifoodClientSecret) {
    try {
      console.log(`[iFood Webhook App Token] Solicitando token de autenticação da aplicação CaixaDoce (${ifoodClientId.slice(0, 8)}...)...`);
      const bodyParams = new URLSearchParams();
      bodyParams.append("grantType", "client_credentials");
      bodyParams.append("clientId", ifoodClientId.trim());
      bodyParams.append("clientSecret", ifoodClientSecret.trim());

      const res = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: bodyParams.toString(),
      });

      if (res.ok) {
        const data: any = await res.json();
        const token = data.accessToken || data.access_token;
        const expiresIn = Number(data.expiresIn || data.expires_in || 21599);
        if (token) {
          cachedAppToken = {
            token,
            expiresAt: now + expiresIn * 1000,
          };
          console.log("[iFood Webhook App Token Success] Token de aplicação CaixaDoce gerado e cacheado com sucesso!");

          try {
            const supabase = getSupabaseBackendClient();
            await supabase
              .from("estabelecimentos")
              .update({
                ifood_access_token: token,
                ifood_status: "conectado",
                updated_at: new Date().toISOString(),
              })
              .ilike("codigo", "CD-5411");
          } catch (e) {
            console.warn("[iFood Webhook Token Sync Warn]", e);
          }

          return token;
        }
      } else {
        const errTxt = await res.text();
        console.error(`[iFood Webhook App Token Error] HTTP ${res.status}: ${errTxt}`);
      }
    } catch (err) {
      console.error("[iFood Webhook App Token Exception]", err);
    }
  }

  try {
    const supabase = getSupabaseBackendClient();
    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("ifood_access_token")
      .ilike("codigo", "CD-5411")
      .maybeSingle();

    if (est?.ifood_access_token) {
      return est.ifood_access_token;
    }
  } catch (dbErr) {
    console.warn("[iFood Webhook DB Token Fallback Error]", dbErr);
  }

  return "";
}

/**
 * Envia o Acknowledgment (confirmação de recebimento) dos eventos para a API do iFood
 */
async function acknowledgeIFoodEvents(eventIds: string[], appToken: string) {
  if (!eventIds || eventIds.length === 0 || !appToken) return false;

  const payload = JSON.stringify(eventIds.map((id) => ({ id })));
  console.log(`[iFood Webhook ACK] Confirmando ${eventIds.length} eventos no iFood com token do App CaixaDoce... Payload:`, payload);

  const endpoints = [
    "https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment",
    "https://merchant-api.ifood.com.br/order/v1.0/events:acknowledgment",
    "https://merchant-api.ifood.com.br/events/v1.0/events/acknowledgment",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: payload,
      });

      if (res.ok || res.status === 200 || res.status === 202 || res.status === 204) {
        console.log(`[iFood Webhook ACK Success] Eventos confirmados com sucesso no endpoint ${endpoint} (HTTP ${res.status})!`);
        return true;
      } else {
        const errText = await res.text();
        console.warn(`[iFood Webhook ACK Warn] Endpoint ${endpoint} retornou ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.warn(`[iFood Webhook ACK Error] Falha ao enviar acknowledgment para ${endpoint}:`, err);
    }
  }

  return false;
}

function extrairDetalhesEventoIFood(event: any) {
  const p = event?.order || event?.data || event?.details || event || {};

  let valorTotal = 0;
  if (typeof p.total?.orderAmount === "number" && p.total.orderAmount > 0) valorTotal = p.total.orderAmount;
  else if (typeof p.orderAmount === "number" && p.orderAmount > 0) valorTotal = p.orderAmount;
  else if (typeof p.payments?.total?.value === "number" && p.payments.total.value > 0) valorTotal = p.payments.total.value;
  else if (typeof p.payments?.total === "number" && p.payments.total > 0) valorTotal = p.payments.total;
  else if (typeof p.payments?.totalAmount === "number" && p.payments.totalAmount > 0) valorTotal = p.payments.totalAmount;
  else if (typeof p.total?.value === "number" && p.total.value > 0) valorTotal = p.total.value;
  else if (typeof p.total === "number" && p.total > 0) valorTotal = p.total;
  else if (typeof p.valor_total === "number" && p.valor_total > 0) valorTotal = p.valor_total;
  else if (typeof p.total_price === "number" && p.total_price > 0) valorTotal = p.total_price;
  else if (typeof p.amount === "number" && p.amount > 0) valorTotal = p.amount;
  else if (Array.isArray(p.payments?.methods) && p.payments.methods.length > 0) {
    const soma = p.payments.methods.reduce((acc: number, m: any) => acc + Number(m.value || m.amount || 0), 0);
    if (soma > 0) valorTotal = soma;
  }

  const rawItems: any[] =
    (Array.isArray(p.items) && p.items) ||
    (Array.isArray(p.order?.items) && p.order.items) ||
    (Array.isArray(p.data?.items) && p.data.items) ||
    (Array.isArray(p.itens) && p.itens) ||
    [];

  const itensDetalhes: any[] = [];
  const nomesResumo: string[] = [];

  rawItems.forEach((it: any, idx: number) => {
    const nome = String(it.name || it.nome || it.productName || it.title || it.description || `Item #${idx + 1}`).trim();
    const quantidade = Number(it.quantity || it.qtd || it.quantidade || 1);
    const precoUnit = Number(it.unitPrice || it.unit_price || it.price || it.preco || 0);

    const rawOptions = it.options || it.subItems || it.sub_items || it.opcoes || [];
    const opcoes_selecionadas = Array.isArray(rawOptions)
      ? rawOptions.map((opt: any) => ({
          nome: String(opt.name || opt.nome || opt.description || "").trim(),
          quantidade: Number(opt.quantity || opt.qtd || 1),
          preco: Number(opt.unitPrice || opt.price || 0),
        })).filter((o: any) => Boolean(o.nome))
      : [];

    itensDetalhes.push({
      id: String(it.id || it.externalCode || `ifood_item_${idx}`),
      nome,
      quantidade,
      precoUnitario: precoUnit,
      opcoes_selecionadas: opcoes_selecionadas.length > 0 ? opcoes_selecionadas : undefined,
    });

    const optionsDesc = opcoes_selecionadas.length > 0
      ? ` (${opcoes_selecionadas.map((o) => (o.quantidade > 1 ? `${o.quantidade}x ${o.nome}` : o.nome)).join(", ")})`
      : "";

    nomesResumo.push(`${quantidade > 1 ? `${quantidade}x ` : ""}${nome}${optionsDesc}`);
  });

  const clienteNome = String(
    p.customer?.name ||
    p.order?.customer?.name ||
    p.client_name ||
    p.cliente_nome ||
    p.customer?.phone?.number ||
    ""
  ).trim();

  const clienteWhatsapp = String(
    p.customer?.phone?.number ||
    p.customer?.phone ||
    p.customer_phone ||
    p.cliente_whatsapp ||
    ""
  ).trim();

  const deliveryRaw = p.delivery?.deliveryDateTime || p.deliveryDateTime || p.order?.deliveryDateTime || p.createdAt || event.createdAt || "";
  let dataEntrega = "";
  let horarioEntrega = "14:00";
  if (deliveryRaw) {
    try {
      const dObj = new Date(deliveryRaw);
      if (!isNaN(dObj.getTime())) {
        dataEntrega = dObj.toISOString().split("T")[0];
        const hh = String(dObj.getHours()).padStart(2, "0");
        const mm = String(dObj.getMinutes()).padStart(2, "0");
        horarioEntrega = `${hh}:${mm}`;
      }
    } catch {}
  }
  if (!dataEntrega) {
    dataEntrega = new Date().toISOString().split("T")[0];
  }

  const deliveryType = String(p.delivery?.deliveryType || p.deliveryType || "delivery").toLowerCase().includes("takeout") ? "retirada" : "delivery";
  const addressObj = p.delivery?.deliveryAddress || p.deliveryAddress;
  let enderecoEntrega = "";
  if (typeof addressObj === "string") {
    enderecoEntrega = addressObj;
  } else if (addressObj && typeof addressObj === "object") {
    const parts = [
      addressObj.formattedAddress || addressObj.streetName || addressObj.street,
      addressObj.streetNumber || addressObj.number,
      addressObj.neighborhood || addressObj.bairro,
      addressObj.city || addressObj.cidade,
      addressObj.complement || addressObj.complemento,
    ].filter(Boolean);
    enderecoEntrega = parts.join(", ");
  }

  return {
    valorTotal,
    itens: nomesResumo.join(", ") || "",
    itensDetalhes,
    clienteNome: clienteNome || "Cliente iFood",
    clienteWhatsapp,
    dataEntrega,
    horarioEntrega,
    tipoEntrega: deliveryType,
    enderecoEntrega,
  };
}

async function buscarEstabelecimentoMapeado(supabase: any, merchantId: string) {
  const cleanMerchantId = String(merchantId || "").trim();

  const persistirMerchantId = async (est: any) => {
    if (!est?.id || !cleanMerchantId) return est;
    try {
      await supabase
        .from("estabelecimentos")
        .update({
          ifood_merchant_id: cleanMerchantId,
          ifood_status: "conectado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", est.id);
    } catch (pErr) {
      console.warn("[iFood Merchant Persist Warn]", pErr);
    }
    return est;
  };

  if (cleanMerchantId) {
    try {
      const { data: estMatch } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
        .ilike("ifood_merchant_id", cleanMerchantId)
        .maybeSingle();

      if (estMatch?.codigo) {
        return await persistirMerchantId(estMatch);
      }
    } catch (e) {
      console.warn("[iFood Match Direct Error]", e);
    }
  }

  try {
    const { data: estCd5411 } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
      .ilike("codigo", "CD-5411")
      .maybeSingle();

    if (estCd5411?.codigo) {
      return await persistirMerchantId(estCd5411);
    }
  } catch (err5411) {
    console.warn("[iFood Match CD-5411 Warn]", err5411);
  }

  return { codigo: "CD-5411" };
}

async function processIFoodEvents(rawBody: any) {
  try {
    let body = rawBody;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = [];
      }
    }

    const events = Array.isArray(body) ? body : body ? [body] : [];
    if (events.length === 0) return;

    const eventIds = events.map((e: any) => e.id).filter(Boolean);
    const appToken = await obterTokenAppIFood();

    if (eventIds.length > 0 && appToken) {
      await acknowledgeIFoodEvents(eventIds, appToken);
    }

    const supabase = getSupabaseBackendClient();
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    for (const event of events) {
      if (!event || typeof event !== "object") continue;

      const code = String(event.code || event.type || "").toUpperCase();
      const orderId = String(event.correlationId || event.orderId || event.id || "").trim();
      const merchantId = String(event.merchantId || event.merchant?.id || "").trim();

      if (
        code === "HEARTBEAT" ||
        code === "STATUS" ||
        code === "TEST" ||
        code === "KTM" ||
        code === "KEEP_ALIVE" ||
        code === "INFO"
      ) {
        continue;
      }

      if (code === "CFM" || code === "CONFIRMED") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "em_producao", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`);
        }
        continue;
      }

      if (code === "DSP" || code === "DISPATCHED") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "pronta", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`);
        }
        continue;
      }

      if (code === "CAN" || code === "CANCELLED" || code === "CANCELLATION_REQUESTED") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "cancelada", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`);
        }
        continue;
      }

      if (code === "CON" || code === "CONCLUDED") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "entregue", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_ifood.eq.${orderId},id.eq.${orderId}`);
        }
        continue;
      }

      if (code === "PLC" || code === "PLACED" || code === "ORDER_PLACED") {
        if (!orderId) continue;

        const est = await buscarEstabelecimentoMapeado(supabase, merchantId);
        const estCodigo = est?.codigo || "CD-5411";
        const estId = est?.id || null;
        const estUserId = est?.user_id || null;

        const detalhes = extrairDetalhesEventoIFood(event);

        let isDuplicate = false;
        try {
          const { data: existingOrder } = await supabase
            .from("encomendas")
            .select("id, estabelecimento_codigo")
            .eq("codigo_pedido_ifood", orderId)
            .maybeSingle();

          if (existingOrder?.id) {
            isDuplicate = true;
          }
        } catch (dupErr) {}

        if (isDuplicate) continue;

        const payloadEncomenda: any = {
          origem: "iFood",
          codigo_pedido_ifood: orderId,
          dados_brutos: event,
          status: "pendente",
          estabelecimento_codigo: estCodigo,
          codigo: estCodigo,
          store_id: estCodigo,
          client_name: detalhes.clienteNome,
          cliente_nome: detalhes.clienteNome,
          customer_name: detalhes.clienteNome,
          data_entrega: detalhes.dataEntrega,
          delivery_date: detalhes.dataEntrega,
          horario_entrega: detalhes.horarioEntrega,
          delivery_time: detalhes.horarioEntrega,
          itens: detalhes.itens || `Pedido iFood #${orderId}`,
          itens_detalhes: detalhes.itensDetalhes,
          valor_total: detalhes.valorTotal,
          total_price: detalhes.valorTotal,
          total_amount: detalhes.valorTotal,
          status_pagamento: "pendente",
          tipo_entrega: detalhes.tipoEntrega,
          endereco_entrega: detalhes.enderecoEntrega,
        };

        if (detalhes.clienteWhatsapp) {
          payloadEncomenda.cliente_whatsapp = detalhes.clienteWhatsapp;
          payloadEncomenda.client_phone = detalhes.clienteWhatsapp;
          payloadEncomenda.customer_phone = detalhes.clienteWhatsapp;
        }

        if (estId) payloadEncomenda.estabelecimento_id = estId;
        if (estUserId) payloadEncomenda.user_id = estUserId;

        try {
          await supabase.from("encomendas").insert(payloadEncomenda);
        } catch (directInsertErr) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/encomendas`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
              },
              body: JSON.stringify(payloadEncomenda),
            });
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error("[iFood Webhook Async Exception]", err);
  }
}

/**
 * Processamento de Webhooks do Mercado Pago (Pix & Assinaturas)
 */
async function processMercadoPagoEvents(req: any) {
  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }

    let paymentId =
      req.query?.["data.id"] ||
      req.query?.id ||
      req.query?.data_id ||
      body?.data?.id ||
      body?.id ||
      (body?.resource ? String(body.resource).split("/").pop() : null);

    console.log(`[MercadoPago Webhook] Notificação processada. Payment ID: ${paymentId}`);

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
      console.log(`[MercadoPago Webhook] Simulação/Teste detectado (ID: '${paymentId}'). Retornando OK.`);
      return;
    }

    const mpToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      process.env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
      process.env.MP_ACCESS_TOKEN ||
      "APP_USR-3682622436709302-082412-8dce93a51299673df017bb9caf9b848b-78387856";

    let paymentData: any = null;
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}`, Accept: "application/json" },
      });
      if (mpRes.ok) {
        paymentData = await mpRes.json();
      }
    } catch (fetchErr: any) {
      console.warn(`[MercadoPago Webhook Exception Captured] Erro ao consultar MP:`, fetchErr?.message || fetchErr);
    }

    if (paymentData && (paymentData.status === "approved" || paymentData.status === "authorized")) {
      const externalRef = String(
        paymentData.external_reference ||
        paymentData.metadata?.external_reference ||
        ""
      ).trim();

      const amount = Number(paymentData.transaction_amount || 0);
      const payerEmail = String(paymentData.payer?.email || "").trim();

      const supabase = getSupabaseBackendClient();
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
    }
  } catch (err) {
    console.error("[MercadoPago Webhook Async Exception]", err);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).send("Webhook iFood & Mercado Pago CaixaDoce Ativo");
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      const query = req.query || {};

      const isMercadoPago =
        query["data.id"] ||
        query.data_id ||
        query.topic === "payment" ||
        body?.action === "test" ||
        body?.type === "payment" ||
        body?.live_mode === false ||
        (body?.data && body?.data?.id) ||
        (body?.resource && String(body.resource).includes("payments"));

      if (isMercadoPago) {
        console.log("📦 Evento Mercado Pago Recebido:", typeof body === "object" ? JSON.stringify(body) : body);
        await processMercadoPagoEvents(req);
      } else {
        console.log("📦 Evento iFood Recebido:", typeof body === "object" ? JSON.stringify(body) : body);
        await processIFoodEvents(body);
      }
    } catch (err) {
      console.error("[Webhook Handler Error]", err);
    }

    return res.status(200).send("OK");
  }

  return res.status(200).send("OK");
}
