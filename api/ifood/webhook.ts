// Vercel Serverless Function for iFood Webhook (/api/ifood/webhook)
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://camuhitzmsfmxvsowzlf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

function getSupabaseBackendClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  return createClient(supabaseUrl, DEFAULT_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Processamento assíncrono em segundo plano dos eventos do iFood
async function processIFoodEvents(body: any) {
  try {
    const events = Array.isArray(body) ? body : body ? [body] : [];
    if (events.length === 0) return;

    const supabase = getSupabaseBackendClient();

    for (const event of events) {
      const code = String(event.code || "").toUpperCase();

      // Isole os eventos cujo campo code seja igual a 'PLC' (Placed - Novo Pedido Criado)
      if (code === "PLC") {
        const orderId = event.correlationId || event.orderId || event.id || "";
        const merchantId = event.merchantId || event.merchant?.id || "";

        console.log(`[iFood Webhook PLC] Processando pedido iFood ID: ${orderId} | Merchant ID: ${merchantId}`);

        // Busca qual loja possui aquele merchantId atrelado na tabela estabelecimentos
        let estCode = "";
        if (merchantId) {
          const { data: estData } = await supabase
            .from("estabelecimentos")
            .select("codigo")
            .ilike("ifood_merchant_id", String(merchantId).trim())
            .maybeSingle();

          if (estData?.codigo) {
            estCode = estData.codigo;
          }
        }

        // Fallback: se não encontrou por merchantId, busca loja com iFood ativo
        if (!estCode) {
          const { data: estFallback } = await supabase
            .from("estabelecimentos")
            .select("codigo")
            .eq("ifood_status", "conectado")
            .limit(1)
            .maybeSingle();

          if (estFallback?.codigo) {
            estCode = estFallback.codigo;
          }
        }

        if (!orderId) continue;

        // Evita inserção duplicada do mesmo pedido
        const { data: existingOrder } = await supabase
          .from("encomendas")
          .select("id")
          .eq("codigo_pedido_ifood", orderId)
          .maybeSingle();

        if (existingOrder) {
          console.log(`[iFood Webhook PLC] Pedido ${orderId} já existe na tabela encomendas. Ignorando duplicata.`);
          continue;
        }

        // Prepara objeto de inserção na tabela encomendas do CaixaDoce
        const targetCode = estCode || "CD-1001";
        const agora = new Date().toISOString();
        const dataHoje = agora.split("T")[0];
        const horaHoje = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        const payloadEncomenda = {
          estabelecimento_codigo: targetCode,
          codigo: targetCode,
          store_id: targetCode,
          origem: "iFood",
          codigo_pedido_ifood: orderId,
          cliente_nome: "Cliente iFood",
          customer_name: "Cliente iFood",
          client_name: "Cliente iFood",
          status: "A Confirmar",
          status_pagamento: "pago",
          payment_status: "pago",
          tipo_entrega: "delivery",
          delivery_type: "delivery",
          observacoes: `Pedido iFood #${orderId}`,
          notes: `Pedido iFood #${orderId}`,
          dados_brutos: event,
          data_entrega: dataHoje,
          delivery_date: dataHoje,
          horario_entrega: horaHoje,
          delivery_time: horaHoje,
          valor_total: 0.00,
          total_price: 0.00,
          created_at: agora,
        };

        const { error: insertErr } = await supabase
          .from("encomendas")
          .insert(payloadEncomenda);

        if (insertErr) {
          console.error("[iFood Webhook PLC Error] Erro ao inserir encomenda no Supabase:", insertErr);
        } else {
          console.log(`[iFood Webhook PLC Success] Pedido iFood ${orderId} salvo com sucesso para a loja '${targetCode}'!`);
        }
      }
    }
  } catch (err) {
    console.error("[iFood Webhook Async Exception]", err);
  }
}

export default async function handler(req: any, res: any) {
  // Configuração estrita de CORS para permitir servidores do iFood
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // Requisição OPTIONS (Preflight CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Requisição GET (Health Check / Validação manual)
  if (req.method === "GET") {
    return res.status(200).send("Webhook iFood CaixaDoce Ativo");
  }

  // Requisição POST (Recebimento de Eventos em Tempo Real do iFood)
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("📦 Evento iFood Recebido:", typeof body === "object" ? JSON.stringify(body, null, 2) : body);

      // Executa o processamento no banco de dados de forma assíncrona sem travar o retorno HTTP
      processIFoodEvents(body).catch((err) =>
        console.error("[iFood Webhook Background Error]", err)
      );
    } catch (err) {
      console.error("[iFood Webhook Error]", err);
    }

    // Retorna HTTP 200 OK imediatamente (em menos de 3 segundos exigidos pelo iFood)
    return res.status(200).send("OK");
  }

  return res.status(200).send("OK");
}
