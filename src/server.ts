import Stripe from "stripe";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Mapeamento em memória de links curtos de cobrança (cobrancaId -> Stripe Checkout Session URL)
const paymentLinksMap = new Map<string, { url: string; description?: string; amount?: number; createdAt: number }>();

async function getCheckoutUrlFromSupabase(id: string): Promise<string | null> {
  if (!id) return null;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://camuhitzmsfmxvsowzlf.supabase.co";
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/transacoes_financeiras?id=eq.${encodeURIComponent(id)}&select=id,comprovante_url,descricao,valor`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0]?.comprovante_url) {
        return data[0].comprovante_url;
      }
    }
  } catch (err) {
    console.error("[Supabase Get Link Error]", err);
  }
  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Proxy Handler para Redirecionamento 302 direto no Servidor (/pagar/*)
      if (url.pathname.startsWith("/pagar/") && request.method === "GET") {
        const cobrancaId = url.pathname.replace("/pagar/", "").trim();
        if (cobrancaId) {
          let targetUrl = paymentLinksMap.get(cobrancaId)?.url;

          if (!targetUrl) {
            targetUrl = (await getCheckoutUrlFromSupabase(cobrancaId)) || undefined;
          }

          if (!targetUrl && cobrancaId.startsWith("cs_")) {
            try {
              const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
              if (stripeSecretKey) {
                const stripe = new Stripe(stripeSecretKey);
                const session = await stripe.checkout.sessions.retrieve(cobrancaId);
                if (session.url) targetUrl = session.url;
              }
            } catch (err) {
              console.error("[Stripe Redirect Error]", err);
            }
          }

          if (targetUrl) {
            return Response.redirect(targetUrl, 302);
          }
        }
      }

      // Endpoint para resolução assíncrona do link curto de cobrança (/api/resolve-pay-link?id=...)
      if (url.pathname === "/api/resolve-pay-link" && request.method === "GET") {
        const id = url.searchParams.get("id") || "";
        let entry = paymentLinksMap.get(id);

        if (!entry || !entry.url) {
          const dbUrl = await getCheckoutUrlFromSupabase(id);
          if (dbUrl) {
            entry = { url: dbUrl, description: "Cobrança Stripe", amount: 0, createdAt: Date.now() };
            paymentLinksMap.set(id, entry);
          }
        }

        if (!entry && id.startsWith("cs_")) {
          try {
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (stripeSecretKey) {
              const stripe = new Stripe(stripeSecretKey);
              const session = await stripe.checkout.sessions.retrieve(id);
              if (session.url) {
                entry = { url: session.url, description: "Cobrança Stripe", amount: (session.amount_total || 0) / 100, createdAt: Date.now() };
                paymentLinksMap.set(id, entry);
              }
            }
          } catch {}
        }

        if (entry && entry.url) {
          return new Response(
            JSON.stringify({ success: true, url: entry.url, description: entry.description, amount: entry.amount }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: "Link de cobrança não encontrado ou expirado." }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }

      // Handler para criação de Sessão de Checkout do Stripe (Cobrança Avulsa & Pedidos)
      if (url.pathname === "/api/create-checkout-session" && request.method === "POST") {
        try {
          const bodyText = await request.text();
          const payload = JSON.parse(bodyText);

          const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
          if (!stripeSecretKey) {
            return new Response(
              JSON.stringify({
                error: "Chave secreta do Stripe (STRIPE_SECRET_KEY) não encontrada nas variáveis de ambiente.",
              }),
              {
                status: 400,
                headers: { "content-type": "application/json" },
              }
            );
          }

          const stripe = new Stripe(stripeSecretKey);
          const origin = url.origin || "https://caixadoce.com.br";
          let lineItems: Array<Stripe.Checkout.SessionCreateParams.LineItem> = [];

          // 1. Cobrança Avulsa (description + amount)
          if (payload.description && payload.amount) {
            lineItems = [
              {
                price_data: {
                  currency: "brl",
                  product_data: {
                    name: payload.description,
                  },
                  unit_amount: Math.round(Number(payload.amount) * 100),
                },
                quantity: 1,
              },
            ];
          } else if (Array.isArray(payload.items)) {
            // 2. Carrinho de Produtos
            lineItems = payload.items.map((it: any) => ({
              price_data: {
                currency: "brl",
                product_data: {
                  name: it.name,
                },
                unit_amount: Math.round(Number(it.unitPrice) * 100),
              },
              quantity: it.quantity,
            }));

            if (payload.repassarTaxa && payload.feeAmount > 0) {
              lineItems.push({
                price_data: {
                  currency: "brl",
                  product_data: {
                    name: `Taxa de Conveniência (${payload.installments || 1}x no Cartão)`,
                  },
                  unit_amount: Math.round(Number(payload.feeAmount) * 100),
                },
                quantity: 1,
              });
            }
          }

          if (lineItems.length === 0) {
            return new Response(
              JSON.stringify({ error: "Nenhum item informado para criar a sessão de pagamento." }),
              { status: 400, headers: { "content-type": "application/json" } }
            );
          }

          const storeCode = payload.establishmentCode || "CD-1001";

          // Comissão de 1.5% retida pela plataforma CaixaDoce em cada transação via Stripe Connect
          const totalCentavos = lineItems.reduce((acc, item) => {
            const unit = item.price_data?.unit_amount || 0;
            const qty = Number(item.quantity) || 1;
            return acc + unit * qty;
          }, 0);
          const applicationFeeAmount = Math.round(totalCentavos * 0.015); // 1,5% de comissão da plataforma

          const sessionOptions: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ["card"],
            mode: "payment",
            line_items: lineItems,
            success_url: `${origin}/pedido-confirmado?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/cardapio/${storeCode}`,
            metadata: {
              establishmentCode: storeCode,
              orderId: payload.orderId || payload.pedidoId || "",
              customerName: payload.customerName || "",
              customerWhatsapp: payload.customerWhatsapp || "",
            },
          };

          if (payload.stripeAccountId) {
            sessionOptions.payment_intent_data = {
              application_fee_amount: applicationFeeAmount,
            };
          }

          const requestOptions = payload.stripeAccountId
            ? { stripeAccount: payload.stripeAccountId }
            : undefined;

          const session = await stripe.checkout.sessions.create(sessionOptions, requestOptions);

          if (!session.url) {
            return new Response(
              JSON.stringify({ error: "URL da sessão de checkout não foi gerada pelo Stripe." }),
              { status: 500, headers: { "content-type": "application/json" } }
            );
          }

          const cobrancaId = `cob_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
          const shortPayUrl = `${origin}/pagar/${cobrancaId}`;

          paymentLinksMap.set(cobrancaId, {
            url: session.url,
            description: payload.description || "Cobrança CaixaDoce",
            amount: payload.amount || 0,
            createdAt: Date.now(),
          });

          paymentLinksMap.set(session.id, {
            url: session.url,
            description: payload.description || "Cobrança CaixaDoce",
            amount: payload.amount || 0,
            createdAt: Date.now(),
          });

          // PERSISTÊNCIA NO SUPABASE: INSERT/UPSERT da URL da Stripe com ID cobrancaId
          const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://camuhitzmsfmxvsowzlf.supabase.co";
          const supabaseKey =
            process.env.VITE_SUPABASE_ANON_KEY ||
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

          try {
            await fetch(`${supabaseUrl}/rest/v1/transacoes_financeiras`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                id: cobrancaId,
                estabelecimento_codigo: storeCode,
                descricao: payload.description || "Cobrança Avulsa / Link",
                valor: payload.amount || 0,
                tipo: "receita",
                categoria: "Cobrança Online / Stripe",
                metodo_pagamento: "cartao_credito",
                status: "pendente",
                comprovante_url: session.url,
                cliente_ou_fornecedor: payload.customerName || "Cliente Stripe",
                data: new Date().toLocaleDateString("pt-BR"),
                origem: "Stripe",
              }),
            });
            console.log(`[Supabase] Cobrança ${cobrancaId} salva no Supabase com comprovante_url=${session.url}`);
          } catch (dbErr) {
            console.error("[Supabase Error] Erro ao salvar cobrança no Supabase:", dbErr);
          }

          return new Response(
            JSON.stringify({
              id: session.id,
              cobrancaId,
              shortPayUrl,
              url: session.url,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              error: err?.message || "Erro ao comunicar com a API do Stripe.",
            }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            }
          );
        }
      }

      // Handler para o Webhook do Stripe (CaixaDoce & Cobrança Avulsa)
      if (
        (url.pathname === "/api/stripe/webhook" || url.pathname === "/api/webhook/stripe") &&
        request.method === "POST"
      ) {
        try {
          const bodyText = await request.text();
          const sig = request.headers.get("stripe-signature");
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

          let event: Stripe.Event;

          if (webhookSecret && sig) {
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
            const stripe = new Stripe(stripeSecretKey);
            event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
          } else {
            event = JSON.parse(bodyText);
          }

          console.log("[CaixaDoce Stripe Webhook] Evento recebido:", event.type);

          if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
            const session = event.data.object as any;
            const amountTotal = session.amount_total ? session.amount_total / 100 : (session.amount ? session.amount / 100 : 0);
            const description =
              session.description ||
              session.metadata?.description ||
              "Cobrança Cartão de Crédito (Stripe)";
            const establishmentCode = session.metadata?.establishmentCode || session.metadata?.estabelecimento_codigo || "CD-1001";
            const orderId = session.metadata?.orderId || session.metadata?.pedidoId || "";
            const customerName =
              session.metadata?.customerName ||
              session.customer_details?.name ||
              "Cliente Stripe";

            const supabaseUrl =
              process.env.VITE_SUPABASE_URL || "https://camuhitzmsfmxvsowzlf.supabase.co";
            const supabaseKey =
              process.env.VITE_SUPABASE_ANON_KEY ||
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbXVoaXR6bXNmbXh2c293emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzAzMTYsImV4cCI6MjEwMjYwNjMxNn0.km5zbjt0ZchneApZvVXzjdkYWS44CMZWwaLRz8nSeyY";

            // 1. Atualizar a Encomenda no Supabase se houver orderId vinculado
            if (orderId) {
              try {
                const fetchRes = await fetch(`${supabaseUrl}/rest/v1/encomendas?id=eq.${orderId}&select=*`, {
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                  },
                });

                if (fetchRes.ok) {
                  const encList = await fetchRes.json();
                  if (encList && encList.length > 0) {
                    const enc = encList[0];
                    const histAtual = Array.isArray(enc.historico_pagamentos)
                      ? enc.historico_pagamentos
                      : Array.isArray(enc.payments_history)
                      ? enc.payments_history
                      : [];

                    const novoPag = {
                      id: `pay_stripe_${Date.now()}`,
                      data: new Date().toISOString().split("T")[0],
                      valor: amountTotal,
                      observacao: "Pagamento Online via Cartão / Stripe",
                    };

                    const novoHistorico = [...histAtual, novoPag];
                    const totalPago = novoHistorico.reduce((sum: number, p: any) => sum + Number(p.valor || 0), 0);
                    const valorTotalEnc = Number(enc.valor_total || enc.total_price || enc.total_amount || 0);
                    const statusPag = totalPago >= valorTotalEnc && valorTotalEnc > 0 ? "pago_integral" : "sinal_pago";

                    await fetch(`${supabaseUrl}/rest/v1/encomendas?id=eq.${orderId}`, {
                      method: "PATCH",
                      headers: {
                        apikey: supabaseKey,
                        Authorization: `Bearer ${supabaseKey}`,
                        "Content-Type": "application/json",
                        Prefer: "return=minimal",
                      },
                      body: JSON.stringify({
                        status_pagamento: statusPag,
                        payment_status: statusPag,
                        valor_entrada: totalPago,
                        down_payment: totalPago,
                        historico_pagamentos: novoHistorico,
                        payments_history: novoHistorico,
                        updated_at: new Date().toISOString(),
                      }),
                    });
                    console.log(`[Stripe Webhook] Encomenda ${orderId} atualizada para ${statusPag} com pagamento de R$ ${amountTotal}!`);
                  }
                }
              } catch (encErr) {
                console.error("[Stripe Webhook] Erro ao atualizar encomenda no Supabase:", encErr);
              }
            }

            // 2. Registrar transação financeira
            try {
              await fetch(`${supabaseUrl}/rest/v1/transacoes_financeiras`, {
                method: "POST",
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  id: `tr_stripe_${Date.now()}`,
                  estabelecimento_codigo: establishmentCode,
                  descricao: description,
                  valor: amountTotal,
                  tipo: "receita",
                  categoria: "Cobrança Online / Stripe",
                  metodo_pagamento: "cartao_credito",
                  status: "concluida",
                  cliente_ou_fornecedor: customerName,
                  data: new Date().toLocaleDateString("pt-BR"),
                  origem: "Stripe",
                }),
              });
              console.log("[Stripe Webhook] Transação de Stripe inserida na tabela transacoes_financeiras!");
            } catch (dbErr) {
              console.error("[Stripe Webhook] Erro ao inserir transação no banco:", dbErr);
            }
          }

          return new Response(
            JSON.stringify({
              received: true,
              type: event.type,
              status: "caixadoce_webhook_processed",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: "Erro ao processar webhook do Stripe", message: e.message }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            }
          );
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
