export interface StripeConnectAccount {
  accountId: string;
  establishmentCode: string;
  status: "connected" | "pending" | "disconnected";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export async function createStripeConnectAccount(establishmentCode: string, email: string): Promise<{ onboardingUrl: string }> {
  console.log("[Stripe Connect] Gerando onboarding para:", establishmentCode, email);
  return {
    onboardingUrl: `https://connect.stripe.com/setup/s/test_${establishmentCode}`,
  };
}

export function getStripeConnectStatus(establishmentCode: string): StripeConnectAccount {
  try {
    const raw = localStorage.getItem(`caixadoce_stripe_connect_${establishmentCode}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    accountId: `acct_caixadoce_${establishmentCode}`,
    establishmentCode,
    status: "disconnected",
    chargesEnabled: false,
    payoutsEnabled: false,
  };
}
