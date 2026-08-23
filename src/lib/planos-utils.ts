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
    descricao: "Para organizar as compras da sua confeitaria de forma simples e eficiente.",
    recursos: [
      "Lista de Compras Interativa (Ilimitada)",
      "Gestão de Múltiplas Listas Nomeadas",
      "Vínculo de Clientes por Tags/Chips",
      "Recibo Visual em Estilo Cupom",
      "Suporte via Comunidade",
    ],
  },
  mensal: {
    id: "mensal",
    nome: "Plano Mensal Completo",
    badge: "🔥 PROMOÇÃO DE LANÇAMENTO",
    precoMensal: 14.90,
    faturamento: "R$ 14,90 / mês (Promocional)",
    descricao: "Acesso total ilimitado a todas as ferramentas com flexibilidade mensal.",
    recursos: [
      "Scanner de Notinhas com IA (Ilimitado)",
      "Lista de Compras & Conciliação Automática",
      "Calendário de Encomendas & Histórico",
      "Cardápio Digital Público & Agendamentos",
      "Painel Financeiro & Fluxo de Caixa",
      "Sem fidelidade, cancele quando quiser",
    ],
  },
  anual: {
    id: "anual",
    nome: "Plano Anual Completo",
    badge: "⭐ MELHOR CUSTO-BENEFÍCIO / MAIS ECONÔMICO",
    precoMensal: 10.90,
    precoAnualTotal: 130.80,
    faturamento: "12x R$ 10,90 (R$ 130,80/ano)",
    descricao: "A escolha mais inteligente e econômica para quem deseja transformar o negócio com todos os recursos.",
    recursos: [
      "Todas as funcionalidades do Plano Mensal",
      "Scanner com IA + Conciliação Automática",
      "Calendário & Histórico Permanente",
      "Cardápio Digital & Agendamentos",
      "Financeiro, DRE & Relatórios",
      "Suporte Prioritário no WhatsApp",
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
    descricao: "Para organizar as compras da sua confeitaria de forma simples.",
    recursos: [
      "Lista de Compras Interativa (Ilimitada)",
      "Gestão de Múltiplas Listas Nomeadas",
      "Vínculo de Clientes por Tags/Chips",
    ],
  },
  pro: {
    id: "mensal",
    nome: "Plano Mensal Completo",
    precoMensal: 14.90,
    faturamento: "R$ 14,90 / mês",
    descricao: "Acesso total ilimitado.",
    recursos: ["Todas as funcionalidades desbloqueadas"],
    destaque: true,
  },
  ilimitado: {
    id: "anual",
    nome: "Plano Anual Completo",
    badge: "MELHOR CUSTO-BENEFÍCIO",
    precoMensal: 10.90,
    precoAnualTotal: 130.80,
    faturamento: "12x R$ 10,90",
    descricao: "A maior economia.",
    recursos: ["Todas as funcionalidades desbloqueadas com prioridade"],
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

export function obterPlanoEfetivoEstabelecimento(codigo?: string, userCreatedAt?: string): InfoPlanoEstabelecimento {
  const code = (codigo || "DEFAULT").toUpperCase();
  try {
    const raw = localStorage.getItem(`caixadoce_plano_${code}`);
    if (raw) {
      const parsed: InfoPlanoEstabelecimento = JSON.parse(raw);
      // Se o plano já estiver assinado ativamente via Stripe, mantém o status ativo
      if (parsed.status === "ativo") {
        return parsed;
      }

      // Cálculo dinâmico do trial de 14 dias com base no created_at do usuário
      const dataCriacaoStr = userCreatedAt || parsed.dataInicio || new Date().toISOString();
      const inicioMs = new Date(dataCriacaoStr).getTime();
      const agoraMs = Date.now();
      const diasDecorridos = Math.floor((agoraMs - inicioMs) / (1000 * 60 * 60 * 24));
      const diasRestantes = Math.max(0, 14 - diasDecorridos);

      if (diasRestantes <= 0) {
        return {
          ...parsed,
          planoId: "basico",
          status: "expirado",
          diasRestantesTrial: 0,
        };
      }
      return {
        ...parsed,
        status: "trial",
        diasRestantesTrial: diasRestantes,
        dataInicio: dataCriacaoStr,
      };
    }
  } catch {}

  const dataCriacaoStr = userCreatedAt || new Date().toISOString();
  const inicioMs = new Date(dataCriacaoStr).getTime();
  const agoraMs = Date.now();
  const diasDecorridos = Math.floor((agoraMs - inicioMs) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, 14 - diasDecorridos);

  if (diasRestantes <= 0) {
    return {
      planoId: "basico",
      status: "expirado",
      diasRestantesTrial: 0,
      dataInicio: dataCriacaoStr,
    };
  }

  return {
    planoId: "mensal",
    status: "trial",
    diasRestantesTrial: diasRestantes,
    dataInicio: dataCriacaoStr,
  };
}

export function verificarAcessoModulo(
  modulo: "despesas" | "scanner" | "encomendas" | "produtos" | "financeiro",
  infoPlano: InfoPlanoEstabelecimento
): boolean {
  // Usuários no plano gratuito DEVEM ter acesso total às abas 'Financeiro', 'Cardápio' (produtos) e 'Lista de Compras' (despesas)
  if (modulo === "despesas" || modulo === "financeiro" || modulo === "produtos") return true;

  if (infoPlano.status === "trial") return true;
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

  return false;
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
