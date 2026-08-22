import { calculateDynamicTotal, type DynamicFeeResult } from "./stripeFees";

export interface StripeConnectAccount {
  accountId: string | null;
  establishmentCode: string;
  status: "connected" | "pending" | "disconnected";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  repassarTaxaStripe: boolean;
}

export interface StripeCheckoutItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateStripeSessionPayload {
  establishmentCode: string;
  customerName: string;
  customerEmail?: string;
  customerWhatsapp: string;
  items: StripeCheckoutItem[];
  subtotal: number;
  installments?: number;
  repassarTaxa: boolean;
  stripeAccountId?: string | null;
}

/**
 * Obtém as configurações do Stripe Connect do estabelecimento (do localStorage/Supabase)
 */
export function obterConfiguracoesStripeLoja(establishmentCode: string): StripeConnectAccount {
  const code = (establishmentCode || "CD-1001").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_stripe_connect_${code}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Erro ao ler configurações Stripe:", e);
  }

  return {
    accountId: null,
    establishmentCode: code,
    status: "disconnected",
    chargesEnabled: false,
    payoutsEnabled: false,
    repassarTaxaStripe: true,
  };
}

/**
 * Salva as configurações do Stripe Connect e opção de repasse de taxa da loja
 */
export function salvarConfiguracoesStripeLoja(
  establishmentCode: string,
  novosDados: Partial<StripeConnectAccount>
): StripeConnectAccount {
  const atual = obterConfiguracoesStripeLoja(establishmentCode);
  const atualizado: StripeConnectAccount = {
    ...atual,
    ...novosDados,
  };

  try {
    localStorage.setItem(
      `caixadoce_stripe_connect_${atualizado.establishmentCode}`,
      JSON.stringify(atualizado)
    );
  } catch (e) {
    console.warn("Erro ao salvar configurações Stripe:", e);
  }

  return atualizado;
}

/**
 * Simula o processo de onboarding do Stripe Connect para o lojista
 */
export async function createStripeConnectAccount(
  establishmentCode: string,
  email: string = "admin@caixadoce.com.br"
): Promise<{ onboardingUrl: string; mockAccountId: string }> {
  const mockAccountId = `acct_1N9x${Math.floor(100000 + Math.random() * 900000)}`;

  salvarConfiguracoesStripeLoja(establishmentCode, {
    accountId: mockAccountId,
    status: "connected",
    chargesEnabled: true,
    payoutsEnabled: true,
  });

  return {
    mockAccountId,
    onboardingUrl: `https://connect.stripe.com/setup/s/test_${establishmentCode}`,
  };
}

/**
 * Prepara a sessão de checkout com linha adicional transparente para 'Taxa de Conveniência (Cartão)'
 */
export async function createStripeSession(payload: CreateStripeSessionPayload): Promise<{
  sessionId: string;
  checkoutUrl: string;
  feeResult: DynamicFeeResult;
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: { name: string };
      unit_amount: number;
    };
    quantity: number;
  }>;
  feeItem?: {
    name: string;
    amount: number;
  };
}> {
  const { subtotal, installments = 1, repassarTaxa } = payload;
  const feeResult = calculateDynamicTotal(subtotal, installments, repassarTaxa);

  // Line items dos produtos do pedido
  const lineItems = payload.items.map((it) => ({
    price_data: {
      currency: "brl",
      product_data: {
        name: it.name,
      },
      unit_amount: Math.round(it.unitPrice * 100),
    },
    quantity: it.quantity,
  }));

  // Linha adicional transparente para Taxa de Conveniência (Cartão) com valor exato das parcelas
  if (repassarTaxa && feeResult.feeAmount > 0) {
    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: {
          name: `Taxa de Conveniência e Processamento (${feeResult.installments}x no Cartão)`,
        },
        unit_amount: Math.round(feeResult.feeAmount * 100),
      },
      quantity: 1,
    });
  }

  console.log("[Stripe Connect API / Checkout] Sessão de pagamento com markup dinâmico gerada:", {
    establishmentCode: payload.establishmentCode,
    subtotal: feeResult.subtotal,
    installments: feeResult.installments,
    feeAmount: feeResult.feeAmount,
    totalAmount: feeResult.totalAmount,
    installmentValue: feeResult.installmentValue,
  });

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishmentCode: payload.establishmentCode,
        customerName: payload.customerName,
        customerWhatsapp: payload.customerWhatsapp,
        items: payload.items,
        repassarTaxa,
        installments: feeResult.installments,
        feeAmount: feeResult.feeAmount,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return {
          sessionId: data.id || `cs_${Date.now()}`,
          checkoutUrl: data.url,
          feeResult,
          lineItems,
          feeItem:
            repassarTaxa && feeResult.feeAmount > 0
              ? {
                  name: `Taxa de Conveniência (${feeResult.installments}x no Cartão)`,
                  amount: feeResult.feeAmount,
                }
              : undefined,
        };
      }
    }
  } catch {
    // Fallback silencioso
  }

  const mockSessionId = `cs_stripe_${Date.now()}`;
  return {
    sessionId: mockSessionId,
    checkoutUrl: `https://checkout.stripe.com/pay/${mockSessionId}?amount=${Math.round(
      feeResult.totalAmount * 100
    )}&installments=${feeResult.installments}`,
    feeResult,
    lineItems,
    feeItem:
      repassarTaxa && feeResult.feeAmount > 0
        ? {
            name: `Taxa de Conveniência (${feeResult.installments}x no Cartão)`,
            amount: feeResult.feeAmount,
          }
        : undefined,
  };
}
