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

// Helper para extrair dados consolidados do payload do iFood
function extrairDetalhesEventoIFood(event: any) {
  const p = event?.order || event?.data || event?.details || event || {};

  // 1. Valor total
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

  // 2. Itens
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

  // 3. Cliente
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

  // 4. Data / Horário de Entrega
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

  // 5. Endereço e tipo
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

// Localiza e mapeia o estabelecimento no Supabase pelo merchantId do iFood
async function buscarEstabelecimentoMapeado(supabase: any, merchantId: string) {
  const cleanMerchantId = String(merchantId || "").trim();

  // 1. Busca direta por ifood_merchant_id
  if (cleanMerchantId) {
    try {
      const { data: estMatch } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
        .ilike("ifood_merchant_id", cleanMerchantId)
        .maybeSingle();

      if (estMatch?.codigo) {
        console.log(`[iFood Match Direct] Loja encontrada: '${estMatch.codigo}' (UUID: ${estMatch.id}) para merchantId '${cleanMerchantId}'`);
        return estMatch;
      }
    } catch (e) {
      console.warn("[iFood Match Direct Error]", e);
    }
  }

  // 2. Busca ampla em todos os estabelecimentos para vincular por status conectado ou único estabelecimento
  try {
    const { data: todosEsts } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
      .order("created_at", { ascending: false });

    if (Array.isArray(todosEsts) && todosEsts.length > 0) {
      // 2.1 Verifica se algum estabelecimento tem o merchantId dentro do texto
      if (cleanMerchantId) {
        const porSubstring = todosEsts.find(
          (e: any) =>
            e.ifood_merchant_id &&
            (String(e.ifood_merchant_id).includes(cleanMerchantId) ||
             cleanMerchantId.includes(String(e.ifood_merchant_id)))
        );
        if (porSubstring) {
          console.log(`[iFood Match Substring] Loja encontrada: '${porSubstring.codigo}' (UUID: ${porSubstring.id})`);
          return porSubstring;
        }
      }

      // 2.2 Prioriza estabelecimento com ifood_status = 'conectado'
      const conectado = todosEsts.find((e: any) => e.ifood_status === "conectado");
      if (conectado) {
        console.log(`[iFood Match Conectado] Vinculando merchantId '${cleanMerchantId}' à loja conectada '${conectado.codigo}' (UUID: ${conectado.id})`);
        if (cleanMerchantId && !conectado.ifood_merchant_id) {
          await supabase
            .from("estabelecimentos")
            .update({ ifood_merchant_id: cleanMerchantId, updated_at: new Date().toISOString() })
            .eq("id", conectado.id);
        }
        return conectado;
      }

      // 2.3 Se houver apenas 1 estabelecimento cadastrado, utiliza e vincula
      if (todosEsts.length === 1) {
        const unico = todosEsts[0];
        console.log(`[iFood Match Único] Utilizando único estabelecimento existente '${unico.codigo}' (UUID: ${unico.id})`);
        if (cleanMerchantId && !unico.ifood_merchant_id) {
          await supabase
            .from("estabelecimentos")
            .update({ ifood_merchant_id: cleanMerchantId, updated_at: new Date().toISOString() })
            .eq("id", unico.id);
        }
        return unico;
      }

      // 2.4 Utiliza o estabelecimento mais recente
      const fallbackEst = todosEsts[0];
      console.log(`[iFood Match Fallback] Utilizando loja mais recente '${fallbackEst.codigo}' (UUID: ${fallbackEst.id})`);
      return fallbackEst;
    }
  } catch (errG) {
    console.warn("[iFood Match List Error]", errG);
  }

  return null;
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

        if (!orderId) {
          console.warn("[iFood Webhook PLC] Evento PLC sem orderId/correlationId identificado. Ignorando.");
          continue;
        }

        // 1. Mapeamento do merchant_id para o estabelecimento correto (UUID e Código)
        const est = await buscarEstabelecimentoMapeado(supabase, merchantId);
        const estCodigo = est?.codigo || "CD-1001";
        const estId = est?.id || null;
        const estUserId = est?.user_id || null;

        console.log(`[iFood Webhook Mapeamento] merchantId '${merchantId}' -> Loja Código: '${estCodigo}' | Loja UUID: '${estId}'`);

        // 2. Extrai dados consolidados (valor, itens, cliente, datas)
        const detalhes = extrairDetalhesEventoIFood(event);

        // 3. Evita inserção duplicada do mesmo pedido
        let isDuplicate = false;
        try {
          const { data: existingOrder } = await supabase
            .from("encomendas")
            .select("id, estabelecimento_codigo")
            .eq("codigo_pedido_ifood", orderId)
            .maybeSingle();

          if (existingOrder?.id) {
            console.log(`[iFood Webhook PLC] Pedido ${orderId} já existe na tabela encomendas (ID: ${existingOrder.id}).`);
            // Se já existia mas estava com o código errado (ex: merchantId cru), atualiza para o código correto
            if (existingOrder.estabelecimento_codigo !== estCodigo) {
              console.log(`[iFood Webhook Correção] Atualizando estabelecimento_codigo da encomenda ${existingOrder.id} para '${estCodigo}'...`);
              await supabase
                .from("encomendas")
                .update({
                  estabelecimento_codigo: estCodigo,
                  codigo: estCodigo,
                  store_id: estCodigo,
                  ...(estId ? { estabelecimento_id: estId } : {}),
                  ...(estUserId ? { user_id: estUserId } : {}),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingOrder.id);
            }
            isDuplicate = true;
          }
        } catch (dupErr) {
          console.warn("[iFood Webhook] Verificação de duplicata via SDK falhou:", dupErr);
        }

        if (isDuplicate) continue;

        // 4. Objeto de inserção estruturado na tabela encomendas com mapeamento do estabelecimento
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

        if (estId) {
          payloadEncomenda.estabelecimento_id = estId;
        }
        if (estUserId) {
          payloadEncomenda.user_id = estUserId;
        }

        // 5. Inserção no Supabase com fallback resiliente para REST
        try {
          const { data: insertData, error: insertErr } = await supabase
            .from("encomendas")
            .insert(payloadEncomenda)
            .select("id");

          if (insertErr) {
            console.error("[iFood Webhook PLC Error] Erro ao inserir encomenda via Supabase SDK:", insertErr);
            throw insertErr;
          } else {
            console.log(`[iFood Webhook PLC Success] Pedido iFood ${orderId} salvo com sucesso para a loja '${estCodigo}' (UUID: ${estId}, Encomenda ID: ${insertData?.[0]?.id || "ok"})!`);
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
                Prefer: "return=representation",
              },
              body: JSON.stringify(payloadEncomenda),
            });

            if (restRes.ok) {
              console.log(`[iFood Webhook PLC Contingência Success] Pedido iFood ${orderId} salvo com sucesso via REST para '${estCodigo}' (UUID: ${estId})!`);
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
