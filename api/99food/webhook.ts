// Vercel Serverless Function for 99Food Webhook (/api/99food/webhook)
import { createClient } from "@supabase/supabase-js";
import { NineNineFoodAdapter } from "../../src/lib/integrations/nineNineFoodAdapter";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

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

// Localiza e mapeia o estabelecimento no Supabase pelo merchantId/shopId do 99Food
async function buscarEstabelecimentoMapeado(supabase: any, merchantId: string) {
  const cleanMerchantId = String(merchantId || "").trim();

  const persistirMerchantId = async (est: any) => {
    if (!est?.id || !cleanMerchantId) return est;
    try {
      await supabase
        .from("estabelecimentos")
        .update({
          nine_nine_food_merchant_id: cleanMerchantId,
          nine_nine_food_status: "conectado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", est.id);
      console.log(`[99Food Merchant Persist] merchantId '${cleanMerchantId}' salvo com sucesso na loja '${est.codigo}' (ID: ${est.id})`);
    } catch (pErr) {
      console.warn("[99Food Merchant Persist Warn]", pErr);
    }
    return est;
  };

  // 1. Busca direta por nine_nine_food_merchant_id
  if (cleanMerchantId) {
    try {
      const { data: estMatch } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, user_id, nine_nine_food_merchant_id, nine_nine_food_status")
        .ilike("nine_nine_food_merchant_id", cleanMerchantId)
        .maybeSingle();

      if (estMatch?.codigo) {
        console.log(`[99Food Match Direct] Loja encontrada por merchantId: '${estMatch.codigo}' (UUID: ${estMatch.id})`);
        return await persistirMerchantId(estMatch);
      }
    } catch (e) {
      console.warn("[99Food Match Direct Error]", e);
    }
  }

  // 2. Busca pela loja ativa prioritária 'CD-5411'
  try {
    const { data: estCd5411 } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, user_id, nine_nine_food_merchant_id, nine_nine_food_status")
      .ilike("codigo", "CD-5411")
      .maybeSingle();

    if (estCd5411?.codigo) {
      console.log(`[99Food Match CD-5411] Loja ativa CD-5411 encontrada (UUID: ${estCd5411.id}). Vinculando merchantId '${cleanMerchantId}'...`);
      return await persistirMerchantId(estCd5411);
    }
  } catch (err5411) {
    console.warn("[99Food Match CD-5411 Warn]", err5411);
  }

  // 3. Busca ampla em todos os estabelecimentos
  try {
    const { data: todosEsts } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, user_id, nine_nine_food_merchant_id, nine_nine_food_status")
      .order("created_at", { ascending: false });

    if (Array.isArray(todosEsts) && todosEsts.length > 0) {
      const conectado = todosEsts.find((e: any) => e.nine_nine_food_status === "conectado");
      if (conectado) {
        return await persistirMerchantId(conectado);
      }
      return await persistirMerchantId(todosEsts[0]);
    }
  } catch (errG) {
    console.warn("[99Food Match List Error]", errG);
  }

  return { codigo: "CD-5411" };
}

async function process99FoodEvents(rawBody: any) {
  try {
    const adapter = new NineNineFoodAdapter();
    const normalizedOrders = adapter.parseWebhook(rawBody);

    let body = rawBody;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = [];
      }
    }

    const events = Array.isArray(body) ? body : body?.events || (body ? [body] : []);
    if (events.length === 0 && normalizedOrders.length === 0) return;

    const supabase = getSupabaseBackendClient();
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    // 1. Processar status updates em eventos simples
    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const eventType = String(
        event.event_type || event.type || event.action || event.code || ""
      ).toUpperCase();
      const orderId = String(
        event.order_id || event.id || event.order?.order_id || event.order?.id || ""
      ).trim();

      if (eventType === "ORDER_CONFIRMED" || eventType === "CFM") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "em_producao", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_99food.eq.${orderId},id.eq.${orderId}`);
        }
      } else if (eventType === "ORDER_DISPATCHED" || eventType === "DSP") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "pronta", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_99food.eq.${orderId},id.eq.${orderId}`);
        }
      } else if (eventType === "ORDER_CANCELLED" || eventType === "CAN") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "cancelada", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_99food.eq.${orderId},id.eq.${orderId}`);
        }
      } else if (eventType === "ORDER_COMPLETED" || eventType === "CON") {
        if (orderId) {
          await supabase
            .from("encomendas")
            .update({ status: "entregue", updated_at: new Date().toISOString() })
            .or(`codigo_pedido_99food.eq.${orderId},id.eq.${orderId}`);
        }
      }
    }

    // 2. Processar criação de novas encomendas normalizadas
    for (const order of normalizedOrders) {
      if (!order.orderId) continue;

      const est = await buscarEstabelecimentoMapeado(supabase, order.merchantId);
      const estCodigo = est?.codigo || "CD-5411";
      const estId = est?.id || null;
      const estUserId = est?.user_id || null;

      // Evita duplicações
      let isDuplicate = false;
      try {
        const { data: existing } = await supabase
          .from("encomendas")
          .select("id, estabelecimento_codigo")
          .eq("codigo_pedido_99food", order.orderId)
          .maybeSingle();

        if (existing?.id) {
          console.log(`[99Food Webhook] Pedido ${order.orderId} já existe (ID: ${existing.id}).`);
          isDuplicate = true;
        }
      } catch (dupErr) {
        console.warn("[99Food Webhook Dup Check Error]", dupErr);
      }

      if (isDuplicate) continue;

      const payloadEncomenda = adapter.toEncomendaPayload(
        order,
        estCodigo,
        estId,
        estUserId
      );

      console.log(`[99Food Webhook Inserção] Salvando pedido ${order.orderId} para '${estCodigo}'...`);

      try {
        const { data: insertData, error: insertErr } = await supabase
          .from("encomendas")
          .insert(payloadEncomenda)
          .select("id");

        if (insertErr) {
          console.error("[99Food Webhook Insert Error]", insertErr);
          throw insertErr;
        } else {
          console.log(`[99Food Webhook Success] Pedido 99Food ${order.orderId} salvo com sucesso! Encomenda ID: ${insertData?.[0]?.id || "ok"}`);
        }
      } catch (directErr) {
        console.warn("[99Food Webhook] Tentando contingência via REST direto...", directErr);
        try {
          const restRes = await fetch(`${supabaseUrl}/rest/v1/encomendas`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(payloadEncomenda),
          });

          if (restRes.ok) {
            console.log(`[99Food Webhook REST Success] Pedido 99Food ${order.orderId} salvo via REST com sucesso!`);
          } else {
            const restErr = await restRes.text();
            console.error(`[99Food Webhook REST Fail] HTTP ${restRes.status}: ${restErr}`);
          }
        } catch (restFetchErr) {
          console.error("[99Food Webhook REST Exception]", restFetchErr);
        }
      }
    }
  } catch (err) {
    console.error("[99Food Webhook Exception]", err);
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
    return res.status(200).send("Webhook 99Food CaixaDoce Ativo");
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("📦 Evento 99Food Recebido:", typeof body === "object" ? JSON.stringify(body) : body);
      await process99FoodEvents(body);
    } catch (err) {
      console.error("[99Food Webhook Handler Error]", err);
    }
    return res.status(200).json({ code: 0, message: "success" });
  }

  return res.status(200).json({ code: 0, message: "success" });
}
