export type PlanoId = "basico" | "mensal" | "anual" | "freemium" | "pro" | "ilimitado";

export interface PlanoConfig {
  id: PlanoId;
  nome: string;
  badge?: string;
  precoMensal: number;
  precoAnualTotal?: number;
  faturamento: string;
  descricao: string;
  recursos: string[];
  destaque?: boolean;
  recomendado?: boolean;
}

export const PLANOS_CONFIG: Record<string, PlanoConfig> = {
  basico: {
    id: "basico",
    nome: "Plano Básico (Gratuito)",
    precoMensal: 0,
    faturamento: "Gratuito para sempre",
    descricao: "Para organizar suas listas de compras e matérias-primas de forma simples.",
    recursos: [
      "Lista de Compras Interativa (Exclusiva)",
    ],
  },
  mensal: {
    id: "mensal",
    nome: "Plano Mensal Completo",
    badge: "🔥 ACESSO COMPLETO PRO",
    precoMensal: 19.90,
    faturamento: "R$ 19,90 / mês",
    descricao: "Acesso total ilimitado a todas as ferramentas da plataforma sem fidelidade.",
    recursos: [
      "Escanear a Notinha com IA (Ilimitado)",
      "Ficha Técnica & Precificação de Produtos (Custo Real sem Prejuízo)",
      "Atualização automática de custos com base no último preço comprado",
      "Milhares de pré-cadastros de insumos para a Lista de Compras",
      "Controlar pedidos de clientes (Calendário de Encomendas)",
      "Controle financeiro dos pedidos e fluxo de caixa",
      "Cardápio digital personalizado",
      "Consolidação automática de receitas na Lista de Compras",
      "Compartilhamento de conta com outro usuário",
    ],
  },
  anual: {
    id: "anual",
    nome: "Plano Anual Completo",
    badge: "⭐ MELHOR CUSTO-BENEFÍCIO",
    precoMensal: 14.90,
    precoAnualTotal: 178.80,
    faturamento: "12x R$ 14,90 (R$ 178,80/ano)",
    descricao: "A escolha mais inteligente e econômica para transformar a sua confeitaria com todos os recursos.",
    recursos: [
      "Escanear a Notinha com IA (Ilimitado)",
      "Ficha Técnica & Precificação de Produtos (Custo Real sem Prejuízo)",
      "Atualização automática de custos com base no último preço comprado",
      "Milhares de pré-cadastros de insumos para a Lista de Compras",
      "Controlar pedidos de clientes (Calendário de Encomendas)",
      "Controle financeiro dos pedidos e fluxo de caixa",
      "Cardápio digital personalizado",
      "Consolidação automática de receitas na Lista de Compras",
      "Compartilhamento de conta com outro usuário",
    ],
    destaque: true,
    recomendado: true,
  },
  // Compatibilidade com chaves de planos legados
  freemium: {
    id: "basico",
    nome: "Plano Básico (Gratuito)",
    precoMensal: 0,
    faturamento: "Gratuito para sempre",
    descricao: "Acesso exclusivo à Lista de Compras.",
    recursos: [
      "Lista de Compras Interativa (Exclusiva)",
    ],
  },
  pro: {
    id: "mensal",
    nome: "Plano Mensal Completo",
    precoMensal: 19.90,
    faturamento: "R$ 19,90 / mês",
    descricao: "Acesso total ilimitado.",
    recursos: [
      "Escanear a Notinha com IA (Ilimitado)",
      "Ficha Técnica & Precificação de Produtos (Custo Real sem Prejuízo)",
      "Atualização automática de custos com base no último preço comprado",
      "Milhares de pré-cadastros de insumos para a Lista de Compras",
      "Controlar pedidos de clientes (Calendário de Encomendas)",
      "Controle financeiro dos pedidos e fluxo de caixa",
      "Cardápio digital personalizado",
      "Consolidação automática de receitas na Lista de Compras",
      "Compartilhamento de conta com outro usuário",
    ],
    destaque: true,
  },
  ilimitado: {
    id: "anual",
    nome: "Plano Anual Completo",
    badge: "MELHOR CUSTO-BENEFÍCIO",
    precoMensal: 14.90,
    precoAnualTotal: 178.80,
    faturamento: "12x R$ 14,90",
    descricao: "A maior economia.",
    recursos: [
      "Escanear a Notinha com IA (Ilimitado)",
      "Ficha Técnica & Precificação de Produtos (Custo Real sem Prejuízo)",
      "Atualização automática de custos com base no último preço comprado",
      "Milhares de pré-cadastros de insumos para a Lista de Compras",
      "Controlar pedidos de clientes (Calendário de Encomendas)",
      "Controle financeiro dos pedidos e fluxo de caixa",
      "Cardápio digital personalizado",
      "Consolidação automática de receitas na Lista de Compras",
      "Compartilhamento de conta com outro usuário",
    ],
  },
};

export interface InfoPlanoEstabelecimento {
  planoId: PlanoId;
  status: "ativo" | "trial" | "expirado" | "cancelado";
  diasRestantesTrial?: number;
  trialDiasAdicionais?: number;
  dataInicio?: string;
  dataRenovacao?: string;
  dataExpiracao?: string;
  tipoPagamento?: "pix" | "cartao_credito" | "stripe" | string;
  mercadoPagoPaymentId?: string;
  mercadoPagoSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export function obterPlanoEfetivoEstabelecimento(codigo?: string, userCreatedAt?: string): InfoPlanoEstabelecimento {
  const code = (codigo || "DEFAULT").toUpperCase();

  // Conta de Teste/Master (CD-1001) - Plano Mensal Completo PRO Vitalício sem expirar
  if (code === "CD-1001") {
    return {
      planoId: "ilimitado",
      status: "ativo",
      dataExpiracao: "2099-12-31T23:59:59.000Z",
    };
  }

  let planoSalvo: InfoPlanoEstabelecimento | null = null;
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_plano_${code}`);
      if (raw) {
        planoSalvo = JSON.parse(raw);
      }
    }
  } catch {}

  // 1. Se o usuário já possui um plano PAGO ativo
  if (planoSalvo && planoSalvo.status === "ativo" && (planoSalvo.planoId === "mensal" || planoSalvo.planoId === "anual" || planoSalvo.planoId === "pro" || planoSalvo.planoId === "ilimitado")) {
    if (planoSalvo.dataExpiracao) {
      const expMs = new Date(planoSalvo.dataExpiracao).getTime();
      if (Date.now() > expMs) {
        return {
          ...planoSalvo,
          planoId: "basico",
          status: "expirado",
          diasRestantesTrial: 0,
        };
      }
    }
    return planoSalvo;
  }

  // 2. Validação Segura do Trial (7 Dias Padrão + trialDiasAdicionais de Cupons Beta)
  const dataCriacaoStr = userCreatedAt || planoSalvo?.dataInicio;
  const diasAdicionais = Number(planoSalvo?.trialDiasAdicionais) || 0;
  const diasTotaisTrial = 7 + diasAdicionais;

  if (dataCriacaoStr) {
    const inicioMs = new Date(dataCriacaoStr).getTime();
    const agoraMs = Date.now();
    const diffMs = agoraMs - inicioMs;
    const diasDecorridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, diasTotaisTrial - diasDecorridos);

    if (diasDecorridos >= diasTotaisTrial || diasRestantes <= 0) {
      return {
        ...(planoSalvo || {}),
        planoId: "basico",
        status: "expirado",
        diasRestantesTrial: 0,
        trialDiasAdicionais: diasAdicionais,
        dataInicio: dataCriacaoStr,
      };
    }

    return {
      ...(planoSalvo || {}),
      planoId: "mensal",
      status: "trial",
      diasRestantesTrial: diasRestantes,
      trialDiasAdicionais: diasAdicionais,
      dataInicio: dataCriacaoStr,
    };
  }

  // Fallback se dataCriacaoStr não estiver disponível ainda
  const diasRestantes = planoSalvo?.diasRestantesTrial !== undefined ? planoSalvo.diasRestantesTrial : diasTotaisTrial;
  if (diasRestantes <= 0) {
    return {
      ...(planoSalvo || {}),
      planoId: "basico",
      status: "expirado",
      diasRestantesTrial: 0,
      trialDiasAdicionais: diasAdicionais,
    };
  }

  return {
    ...(planoSalvo || {}),
    planoId: "mensal",
    status: "trial",
    diasRestantesTrial: diasRestantes,
    trialDiasAdicionais: diasAdicionais,
  };
}

export function verificarAcessoModulo(
  modulo: "despesas" | "scanner" | "encomendas" | "produtos" | "financeiro",
  infoPlano: InfoPlanoEstabelecimento
): boolean {
  // 1. O plano gratuito permite EXCLUSIVAMENTE a Lista de Compras ('despesas')
  if (modulo === "despesas") return true;

  // 2. No período de teste de 7 dias (trial), todos os módulos ficam liberados
  if (infoPlano.status === "trial") return true;

  // 3. Se possuir uma assinatura ativa do plano Pro / Mensal / Anual / Ilimitado
  if (infoPlano.status === "ativo") {
    if (
      infoPlano.planoId === "mensal" ||
      infoPlano.planoId === "anual" ||
      infoPlano.planoId === "pro" ||
      infoPlano.planoId === "ilimitado"
    ) {
      return true;
    }
  }

  // 4. Caso contrário (Plano Gratuito / Básico ou trial expirado), bloqueia acesso
  return false;
}

export function formatarDataExpiracao(dataStr?: string): string {
  if (!dataStr) {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("pt-BR");
  }
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) {
      const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return fallback.toLocaleDateString("pt-BR");
    }
    return d.toLocaleDateString("pt-BR");
  } catch {
    const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return fallback.toLocaleDateString("pt-BR");
  }
}

export function salvarDadosPlanoEstabelecimento(codigo: string, info: Partial<InfoPlanoEstabelecimento>) {
  const code = (codigo || "DEFAULT").toUpperCase();
  try {
    const current = obterPlanoEfetivoEstabelecimento(code);
    const defaultExp = info.status === "ativo" && !info.dataExpiracao && !current.dataExpiracao
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    const updated = {
      ...current,
      ...info,
      ...(defaultExp ? { dataExpiracao: defaultExp } : {}),
    };
    localStorage.setItem(`caixadoce_plano_${code}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Erro ao salvar plano no localStorage:", e);
  }
}
