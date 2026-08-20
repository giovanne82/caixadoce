export interface StripeCheckoutOptions {
  establishmentCode: string;
  userEmail?: string;
  planId?: string;
  returnUrl?: string;
}

export interface StripeWebhookPayload {
  id: string;
  type: "checkout.session.completed" | "invoice.paid" | "customer.subscription.updated" | "customer.subscription.deleted";
  data: {
    object: {
      id: string;
      customer_email?: string;
      subscription?: string;
      payment_status?: string;
      status?: string;
      metadata?: {
        establishmentCode?: string;
        userEmail?: string;
        planId?: string;
      };
    };
  };
}

/**
 * Processa eventos do Webhook do Stripe para o CaixaDoce.
 */
export function processStripeWebhookEvent(eventPayload: StripeWebhookPayload): {
  success: boolean;
  establishmentCode?: string;
  message: string;
} {
  const { type, data } = eventPayload;
  const obj = data.object;
  const establishmentCode = obj.metadata?.establishmentCode || "CD-1001";
  const planId = obj.metadata?.planId || "pro";

  console.log(`[CaixaDoce Stripe Webhook] Processando evento: ${type} para ${establishmentCode}`);

  if (type === "checkout.session.completed" || type === "invoice.paid") {
    const isPaid = obj.payment_status === "paid" || obj.status === "active" || obj.status === "paid";

    if (isPaid || type === "checkout.session.completed") {
      try {
        localStorage.setItem(`caixadoce_stripe_status_${establishmentCode}`, "ativo");
        localStorage.setItem(`caixadoce_stripe_customer_id_${establishmentCode}`, obj.id || "cus_caixadoce");
        localStorage.setItem(`caixadoce_stripe_last_payment_${establishmentCode}`, new Date().toISOString());
        localStorage.setItem(`caixadoce_plano_ativo_${establishmentCode}`, planId);
      } catch (e) {
        console.warn("[Stripe Webhook] Erro ao persistir estado:", e);
      }

      return {
        success: true,
        establishmentCode,
        message: `Assinatura do CaixaDoce ativada com sucesso via Webhook (${type})!`,
      };
    }
  } else if (type === "customer.subscription.deleted") {
    try {
      localStorage.setItem(`caixadoce_stripe_status_${establishmentCode}`, "cancelado");
    } catch {}

    return {
      success: false,
      establishmentCode,
      message: "Assinatura cancelada via Webhook.",
    };
  }

  return {
    success: false,
    establishmentCode,
    message: `Evento Webhook ${type} recebido sem alteração de status.`,
  };
}

/**
 * Inicia o fluxo de checkout do Stripe para o CaixaDoce.
 */
export async function initiateStripeCheckout(options: StripeCheckoutOptions): Promise<{ checkoutUrl: string }> {
  const { establishmentCode, userEmail = "admin@caixadoce.com.br", planId = "pro", returnUrl = window.location.origin } = options;

  console.log("[CaixaDoce Stripe] Iniciando checkout de assinatura:", establishmentCode, planId);

  // Simulação de confirmação instantânea em ambiente dev
  setTimeout(() => {
    processStripeWebhookEvent({
      id: `evt_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          customer_email: userEmail,
          payment_status: "paid",
          status: "complete",
          metadata: {
            establishmentCode,
            userEmail,
            planId,
          },
        },
      },
    });
  }, 1200);

  const checkoutUrl = `${returnUrl}?checkout_status=success&session_id=cs_test_${Date.now()}`;
  return { checkoutUrl };
}
