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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

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
          const sessionOptions: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ["card"],
            mode: "payment",
            line_items: lineItems,
            success_url: `${origin}/pedido-confirmado?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/cardapio/${storeCode}`,
            metadata: {
              establishmentCode: storeCode,
              customerName: payload.customerName || "",
              customerWhatsapp: payload.customerWhatsapp || "",
            },
          };

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

          return new Response(JSON.stringify({ id: session.id, url: session.url }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
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

      // Handler para o Webhook do Stripe (CaixaDoce)
      if (url.pathname === "/api/stripe/webhook" && request.method === "POST") {
        try {
          const bodyText = await request.text();
          const event = JSON.parse(bodyText);

          console.log("[CaixaDoce Stripe Webhook] Evento recebido:", event.type);

          return new Response(
            JSON.stringify({
              received: true,
              type: event.type,
              status: "caixadoce_subscription_processed",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            }
          );
        } catch (e: any) {
          return new Response(JSON.stringify({ error: "Invalid webhook payload", message: e.message }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
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
