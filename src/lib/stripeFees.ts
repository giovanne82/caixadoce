/**
 * Motor matemático de cálculo de taxas dinâmicas e parcelamento do Stripe Connect
 * Inclui taxa base da Stripe BR + 1% de Application Fee da plataforma CaixaDoce
 */

export interface InstallmentFeeRule {
  installments: number;
  ratePercentage: number; // ex: 0.0499 (4.99%)
  label: string;
}

// Tabela de taxas incrementais de 1x até 12x (incremento de 0.50% por parcela)
export const STRIPE_FEE_TABLE: InstallmentFeeRule[] = Array.from({ length: 12 }, (_, i) => {
  const installments = i + 1;
  // 1x = 4.99% (0.0499), 2x = 5.49% (0.0549), 3x = 5.99% (0.0599)... 12x = 10.49% (0.1049)
  const ratePercentage = parseFloat((0.0499 + i * 0.005).toFixed(4));
  return {
    installments,
    ratePercentage,
    label: `${installments}x`,
  };
});

export const STRIPE_FIXED_FEE = 0.39; // R$ 0,39 taxa fixa por transação

export interface DynamicFeeResult {
  subtotal: number;
  installments: number;
  ratePercentage: number;
  totalAmount: number;
  feeAmount: number;
  installmentValue: number;
  formattedSubtotal: string;
  formattedFeeAmount: string;
  formattedTotalAmount: string;
  formattedInstallmentValue: string;
}

/**
 * Aplica a fórmula exata de repasse por markup inverso (gross-up):
 * Total = (subtotal + 0.39) / (1 - taxa_percentual_da_parcela)
 */
export function calculateDynamicTotal(
  subtotal: number,
  installments: number = 1,
  repassarTaxa: boolean = true
): DynamicFeeResult {
  if (subtotal <= 0) {
    return {
      subtotal: 0,
      installments: 1,
      ratePercentage: 0,
      totalAmount: 0,
      feeAmount: 0,
      installmentValue: 0,
      formattedSubtotal: "R$ 0,00",
      formattedFeeAmount: "R$ 0,00",
      formattedTotalAmount: "R$ 0,00",
      formattedInstallmentValue: "R$ 0,00",
    };
  }

  const instCount = Math.max(1, Math.min(12, installments));
  const rule = STRIPE_FEE_TABLE.find((r) => r.installments === instCount) || STRIPE_FEE_TABLE[0];

  let totalAmount = subtotal;
  let feeAmount = 0;

  if (repassarTaxa) {
    // Fórmula de repasse exato: Total = (subtotal + 0.39) / (1 - ratePercentage)
    const rawTotal = (subtotal + STRIPE_FIXED_FEE) / (1 - rule.ratePercentage);
    totalAmount = parseFloat(rawTotal.toFixed(2));
    feeAmount = parseFloat((totalAmount - subtotal).toFixed(2));
  }

  const rawInstallmentVal = totalAmount / instCount;
  const installmentValue = parseFloat(rawInstallmentVal.toFixed(2));

  const formatar = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return {
    subtotal,
    installments: instCount,
    ratePercentage: rule.ratePercentage,
    totalAmount,
    feeAmount,
    installmentValue,
    formattedSubtotal: formatar(subtotal),
    formattedFeeAmount: formatar(feeAmount),
    formattedTotalAmount: formatar(totalAmount),
    formattedInstallmentValue: formatar(installmentValue),
  };
}

export interface InstallmentOptionItem {
  installments: number;
  label: string;
  installmentValue: number;
  totalAmount: number;
  feeAmount: number;
  formattedOptionText: string;
}

/**
 * Gera as opções formatadas para o Select/Combobox de parcelamento (1x até 12x)
 */
export function getInstallmentOptions(
  subtotal: number,
  repassarTaxa: boolean = true
): InstallmentOptionItem[] {
  const formatar = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return STRIPE_FEE_TABLE.map((rule) => {
    const res = calculateDynamicTotal(subtotal, rule.installments, repassarTaxa);

    const formattedOptionText =
      rule.installments === 1
        ? `1x de ${res.formattedInstallmentValue} (À vista - Total ${res.formattedTotalAmount})`
        : `${rule.installments}x de ${res.formattedInstallmentValue} (Total ${res.formattedTotalAmount})`;

    return {
      installments: rule.installments,
      label: rule.label,
      installmentValue: res.installmentValue,
      totalAmount: res.totalAmount,
      feeAmount: res.feeAmount,
      formattedOptionText,
    };
  });
}
