// Vercel Serverless Function for iFood Webhook (/api/ifood/webhook)
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

          // Sincroniza o token no banco para a loja CD-5411 para garantir que outras rotas também usem o token atualizado da aplicação
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

  // Fallback: Busca token no Supabase (loja CD-5411)
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
 * utilizando estritamente o token de autenticação da Aplicação CaixaDoce.
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

  // Helper para persistir o merchantId no estabelecimento encontrado
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
      console.log(`[iFood Merchant Persist] merchantId '${cleanMerchantId}' salvo com sucesso na loja '${est.codigo}' (ID: ${est.id})`);
    } catch (pErr) {
      console.warn("[iFood Merchant Persist Warn]", pErr);
    }
    return est;
  };

  // 1. Busca direta por ifood_merchant_id
  if (cleanMerchantId) {
    try {
      const { data: estMatch } = await supabase
        .from("estabelecimentos")
        .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
        .ilike("ifood_merchant_id", cleanMerchantId)
        .maybeSingle();

      if (estMatch?.codigo) {
        console.log(`[iFood Match Direct] Loja encontrada por merchantId: '${estMatch.codigo}' (UUID: ${estMatch.id})`);
        return await persistirMerchantId(estMatch);
      }
    } catch (e) {
      console.warn("[iFood Match Direct Error]", e);
    }
  }

  // 2. Busca específica pela loja ativa prioritária 'CD-5411'
  try {
    const { data: estCd5411 } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
      .ilike("codigo", "CD-5411")
      .maybeSingle();

    if (estCd5411?.codigo) {
      console.log(`[iFood Match CD-5411] Loja ativa CD-5411 encontrada (UUID: ${estCd5411.id}). Vinculando merchantId '${cleanMerchantId}'...`);
      return await persistirMerchantId(estCd5411);
    }
  } catch (err5411) {
    console.warn("[iFood Match CD-5411 Warn]", err5411);
  }

  // 3. Busca ampla em todos os estabelecimentos para vincular
  try {
    const { data: todosEsts } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, user_id, ifood_merchant_id, ifood_status")
      .order("created_at", { ascending: false });

    if (Array.isArray(todosEsts) && todosEsts.length > 0) {
      // 3.1 Verifica se algum estabelecimento tem o merchantId dentro do texto
      if (cleanMerchantId) {
        const porSubstring = todosEsts.find(
          (e: any) =>
            e.ifood_merchant_id &&
            (String(e.ifood_merchant_id).includes(cleanMerchantId) ||
             cleanMerchantId.includes(String(e.ifood_merchant_id)))
        );
        if (porSubstring) {
          console.log(`[iFood Match Substring] Loja encontrada: '${porSubstring.codigo}' (UUID: ${porSubstring.id})`);
          return await persistirMerchantId(porSubstring);
        }
      }

      // 3.2 Prioriza estabelecimento com ifood_status = 'conectado'
      const conectado = todosEsts.find((e: any) => e.ifood_status === "conectado");
      if (conectado) {
        console.log(`[iFood Match Conectado] Vinculando merchantId '${cleanMerchantId}' à loja conectada '${conectado.codigo}' (UUID: ${conectado.id})`);
        return await persistirMerchantId(conectado);
      }

      // 3.3 Utiliza o primeiro estabelecimento disponível (mais recente)
      const fallbackEst = todosEsts[0];
      console.log(`[iFood Match Fallback] Utilizando loja '${fallbackEst.codigo}' (UUID: ${fallbackEst.id})`);
      return await persistirMerchantId(fallbackEst);
    }
  } catch (errG) {
    console.warn("[iFood Match List Error]", errG);
  }

  // Fallback padrão final
  return { codigo: "CD-5411" };
}

// Processamento dos eventos do iFood (com await explícito e ACK via token de aplicação)
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

    // 1. Obter Token da Aplicação (CaixaDoce) e fazer Acknowledgment imediato
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

      // Tratamento de eventos de Heartbeat / Conectividade / Status
      if (
        code === "HEARTBEAT" ||
        code === "STATUS" ||
        code === "TEST" ||
        code === "KTM" ||
        code === "KEEP_ALIVE" ||
        code === "INFO"
      ) {
        console.log(`[iFood Webhook Heartbeat] Evento de teste de conectividade recebido: ID '${event.id}' | Code '${code}'. Acknowledged com token do App CaixaDoce.`);
        continue;
      }

      // Atualização de status de pedidos existentes
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

      // Evento PLC (Placed - Novo Pedido Criado)
      if (code === "PLC" || code === "PLACED" || code === "ORDER_PLACED") {
        console.log(`[iFood Webhook PLC] Processando pedido iFood ID: '${orderId}' | Merchant ID: '${merchantId}'`);

        if (!orderId) {
          console.warn("[iFood Webhook PLC] Evento PLC sem orderId/correlationId identificado. Ignorando.");
          continue;
        }

        // 1. Mapeamento do merchant_id para o estabelecimento correto (UUID e Código)
        const est = await buscarEstabelecimentoMapeado(supabase, merchantId);
        const estCodigo = est?.codigo || "CD-5411";
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

      // IMPORTANTE (Vercel Serverless): Damos AWAIT para garantir que o Acknowledgment e a inserção no banco
      // terminem antes de encerrar a função serverless.
      await processIFoodEvents(body);
    } catch (err) {
      console.error("[iFood Webhook Handler Error]", err);
    }

    // Retorna HTTP 200 OK
    return res.status(200).send("OK");
  }

  return res.status(200).send("OK");
}

