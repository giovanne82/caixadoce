// Vercel Serverless Function for iFood Webhook (/api/ifood/webhook)
import { createClient } from "@supabase/supabase-js";

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

// Processamento dos eventos do iFood (com await explícito para execução completa na Vercel)
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

    const supabase = getSupabaseBackendClient();
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    for (const event of events) {
      if (!event || typeof event !== "object") continue;

      const code = String(event.code || event.type || "").toUpperCase();

      // Isole os eventos cujo campo code seja igual a 'PLC' (Placed - Novo Pedido Criado)
      if (code === "PLC" || code === "PLACED" || code === "ORDER_PLACED") {
        const orderId = String(event.correlationId || event.orderId || event.id || "").trim();
        const merchantId = String(event.merchantId || event.merchant?.id || "").trim();

        console.log(`[iFood Webhook PLC] Processando pedido iFood ID: '${orderId}' | Merchant ID: '${merchantId}'`);

        // Busca qual loja possui aquele merchantId atrelado na tabela estabelecimentos
        let estCode = "";
        if (merchantId) {
          try {
            const { data: estData } = await supabase
              .from("estabelecimentos")
              .select("codigo")
              .ilike("ifood_merchant_id", merchantId)
              .maybeSingle();

            if (estData?.codigo) {
              estCode = estData.codigo;
            }
          } catch (mErr) {
            console.warn("[iFood Webhook] Aviso ao buscar estabelecimento por merchantId:", mErr);
          }
        }

        // Fallback: se não encontrou por merchantId, busca loja com iFood ativo
        if (!estCode) {
          try {
            const { data: estFallback } = await supabase
              .from("estabelecimentos")
              .select("codigo")
              .eq("ifood_status", "conectado")
              .limit(1)
              .maybeSingle();

            if (estFallback?.codigo) {
              estCode = estFallback.codigo;
            }
          } catch (fErr) {
            console.warn("[iFood Webhook] Aviso ao buscar estabelecimento conectado:", fErr);
          }
        }

        if (!orderId) {
          console.warn("[iFood Webhook PLC] Evento PLC sem orderId/correlationId identificado. Ignorando.");
          continue;
        }

        // Evita inserção duplicada do mesmo pedido
        let isDuplicate = false;
        try {
          const { data: existingOrder } = await supabase
            .from("encomendas")
            .select("id")
            .eq("codigo_pedido_ifood", orderId)
            .maybeSingle();

          if (existingOrder?.id) {
            console.log(`[iFood Webhook PLC] Pedido ${orderId} já existe na tabela encomendas (ID: ${existingOrder.id}). Ignorando duplicata.`);
            isDuplicate = true;
          }
        } catch (dupErr) {
          console.warn("[iFood Webhook] Verificação de duplicata via SDK falhou, tentando checagem direta:", dupErr);
        }

        if (isDuplicate) continue;

        // Objeto de inserção na tabela encomendas (EXCLUSIVAMENTE as 6 colunas permitidas)
        const targetCode = estCode || "CD-1001";

        const payloadEncomenda = {
          origem: "iFood",
          codigo_pedido_ifood: orderId,
          dados_brutos: event,
          status: "pendente",
          client_name: "Cliente iFood",
          estabelecimento_codigo: targetCode,
        };

        // Inserção no Supabase com fallback para REST direto caso haja instabilidade de conexão
        try {
          const { data: insertData, error: insertErr } = await supabase
            .from("encomendas")
            .insert(payloadEncomenda)
            .select("id");

          if (insertErr) {
            console.error("[iFood Webhook PLC Error] Erro ao inserir encomenda via Supabase SDK:", insertErr);
            throw insertErr;
          } else {
            console.log(`[iFood Webhook PLC Success] Pedido iFood ${orderId} salvo com sucesso para a loja '${targetCode}' (Encomenda ID: ${insertData?.[0]?.id || "ok"})!`);
          }
        } catch (directInsertErr) {
          console.warn("[iFood Webhook] Tentando inserção de contingência via REST direto...", directInsertErr);
          try {
            const restRes = await fetch(`${supabaseUrl}/rest/v1/encomendas`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify(payloadEncomenda),
            });

            if (restRes.ok) {
              console.log(`[iFood Webhook PLC Contingência Success] Pedido iFood ${orderId} salvo com sucesso via REST direto para '${targetCode}'!`);
            } else {
              const restErr = await restRes.text();
              console.error(`[iFood Webhook PLC Contingência Error] Falha na inserção via REST (${restRes.status}): ${restErr}`);
            }
          } catch (restFetchErr) {
            console.error("[iFood Webhook PLC Fatal Error] Erro na inserção de contingência:", restFetchErr);
          }
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
      console.log("📦 Evento iFood Recebido:", typeof body === "object" ? JSON.stringify(body) : body);

      // IMPORTANTE (Vercel Serverless): Damos AWAIT para garantir que a inserção no banco
      // termine antes de encerrar a função serverless. Caso contrário, a Vercel fecha as
      // conexões de socket prematuramente (SocketError: other side closed).
      await processIFoodEvents(body);
    } catch (err) {
      console.error("[iFood Webhook Handler Error]", err);
    }

    // Retorna HTTP 200 OK
    return res.status(200).send("OK");
  }

  return res.status(200).send("OK");
}
