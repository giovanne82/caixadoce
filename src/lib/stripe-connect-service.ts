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
 * Calcula a taxa de processamento do cartão via Stripe com repasse transparente
 * Fórmula solicitada: (Subtotal / (1 - 0.0499)) - Subtotal + 0.39
 */
export function calcularTaxaStripePassThrough(
  subtotal: number,
  repassarTaxa: boolean = true
): {
  subtotal: number;
  taxaProcessamento: number;
  totalAPagar: number;
} {
  if (!repassarTaxa || subtotal <= 0) {
    return {
      subtotal,
      taxaProcessamento: 0,
      totalAPagar: subtotal,
    };
  }

  const taxaCalculada = subtotal / (1 - 0.0499) - subtotal + 0.39;
  const taxaProcessamento = parseFloat(Math.max(0, taxaCalculada).toFixed(2));
  const totalAPagar = parseFloat((subtotal + taxaProcessamento).toFixed(2));

  return {
    subtotal,
    taxaProcessamento,
    totalAPagar,
  };
}

/**
 * Prepara a sessão de checkout com linha adicional transparente para 'Taxa de Processamento e Conveniência'
 */
export async function createStripeSession(payload: CreateStripeSessionPayload): Promise<{
  sessionId: string;
  checkoutUrl: string;
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
  const { subtotal, repassarTaxa } = payload;
  const { taxaProcessamento, totalAPagar } = calcularTaxaStripePassThrough(subtotal, repassarTaxa);

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

  // Linha adicional transparente para taxa de processamento e conveniência do cartão
  if (repassarTaxa && taxaProcessamento > 0) {
    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: {
          name: "Taxa de Processamento e Conveniência (Cartão via Stripe)",
        },
        unit_amount: Math.round(taxaProcessamento * 100),
      },
      quantity: 1,
    });
  }

  console.log("[Stripe Connect API / Checkout] Sessão de pagamento via cartão criada:", {
    establishmentCode: payload.establishmentCode,
    subtotal,
    taxaProcessamento,
    totalAPagar,
    itemsCount: lineItems.length,
  });

  const mockSessionId = `cs_stripe_${Date.now()}`;
  return {
    sessionId: mockSessionId,
    checkoutUrl: `https://checkout.stripe.com/pay/${mockSessionId}?amount=${Math.round(totalAPagar * 100)}`,
    lineItems,
    feeItem:
      repassarTaxa && taxaProcessamento > 0
        ? {
            name: "Taxa de Processamento e Conveniência (Cartão via Stripe)",
            amount: taxaProcessamento,
          }
        : undefined,
  };
}
