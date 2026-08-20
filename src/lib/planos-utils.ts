export type PlanoId = "freemium" | "pro" | "ilimitado";

export interface PlanoConfig {
  id: PlanoId;
  nome: string;
  badge?: string;
  precoMensal: number;
  descricao: string;
  recursos: string[];
  destaque?: boolean;
  limiteTransacoesMensais?: number;
  limiteColaboradores?: number;
}

export const PLANOS_CONFIG: Record<PlanoId, PlanoConfig> = {
  freemium: {
    id: "freemium",
    nome: "Plano Inicial (Trial)",
    precoMensal: 0,
    descricao: "Ideal para começar a organizar as finanças e vendas do seu negócio.",
    recursos: [
      "Até 50 transações por mês",
      "1 Colaborador",
      "Controle de Entradas e Saídas",
      "Exportação de Relatórios Simples",
      "Suporte via Comunidade",
    ],
    limiteTransacoesMensais: 50,
    limiteColaboradores: 1,
  },
  pro: {
    id: "pro",
    nome: "Plano Profissional",
    badge: "Mais Popular",
    precoMensal: 79.90,
    descricao: "Controle completo para confeiteiros, lojas e negócios em expansão.",
    recursos: [
      "Transações Ilimitadas",
      "Até 5 Colaboradores com níveis de acesso",
      "Gestão de Pedidos e Vendas",
      "Emissão de Recibos & Comprovantes Pix",
      "Relatórios Financeiros Avançados",
      "Suporte Prioritário no WhatsApp",
    ],
    destaque: true,
    limiteColaboradores: 5,
  },
  ilimitado: {
    id: "ilimitado",
    nome: "Plano Enterprise / Ilimitado",
    precoMensal: 149.90,
    descricao: "Múltiplas unidades, suporte dedicado e recursos premium sem limites.",
    recursos: [
      "Todas as funcionalidades do Pro",
      "Colaboradores Ilimitados",
      "Múltiplas Unidades / Caixas",
      "Integração Stripe Connect & Automações",
      "Acesso antecipado a novos recursos",
      "Gerente de Conta Dedicado",
    ],
  },
};

export interface InfoPlanoEstabelecimento {
  planoId: PlanoId;
  status: "ativo" | "trial" | "expirado" | "cancelado";
  diasRestantesTrial?: number;
  dataInicio?: string;
  dataRenovacao?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export function obterPlanoEfetivoEstabelecimento(codigo?: string): InfoPlanoEstabelecimento {
  const code = (codigo || "DEFAULT").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_plano_${code}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Padrão: 30 dias de Trial no plano Pro
  return {
    planoId: "pro",
    status: "trial",
    diasRestantesTrial: 30,
    dataInicio: new Date().toISOString(),
  };
}

export function salvarDadosPlanoEstabelecimento(codigo: string, info: Partial<InfoPlanoEstabelecimento>) {
  const code = (codigo || "DEFAULT").toUpperCase();
  try {
    const current = obterPlanoEfetivoEstabelecimento(code);
    const updated = { ...current, ...info };
    localStorage.setItem(`caixadoce_plano_${code}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Erro ao salvar plano no localStorage:", e);
  }
}
