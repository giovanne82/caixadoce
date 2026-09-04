import { supabase } from "@/integrations/supabase/client";

export interface RegraFreteBairro {
  id: string;
  bairro: string;
  valor: number;
  prazoMinutos?: number;
  ativo: boolean;
}

export interface ConfiguracaoFrete {
  tipoFretePadrao: "fixo" | "bairros" | "gratis_total" | "consulta";
  valorFixoPadrao: number;
  permitirRetirada: boolean;
  freteGratisAtivo: boolean;
  valorMinimoFreteGratis: number;
  regrasBairros: RegraFreteBairro[];
  tempoMedioMinutos: number;
  instrucoesEntrega: string;
}

export const CONFIG_FRETE_PADRAO: ConfiguracaoFrete = {
  tipoFretePadrao: "fixo",
  valorFixoPadrao: 10,
  permitirRetirada: true,
  freteGratisAtivo: false,
  valorMinimoFreteGratis: 120,
  regrasBairros: [
    { id: "b-1", bairro: "Centro", valor: 7, prazoMinutos: 40, ativo: true },
    { id: "b-2", bairro: "Bairros Próximos (até 5km)", valor: 10, prazoMinutos: 50, ativo: true },
    { id: "b-3", bairro: "Região Metropolitana / Demais Bairros", valor: 16, prazoMinutos: 60, ativo: true },
  ],
  tempoMedioMinutos: 45,
  instrucoesEntrega: "Entregas realizadas com todo o cuidado através de motoboy parceiro.",
};

const STORAGE_PREFIX = "caixadoce_frete_config_";

/**
 * Obtém a configuração de frete do estabelecimento (Cache local + Supabase)
 */
export function obterConfiguracaoFrete(estabelecimentoCodigo: string): ConfiguracaoFrete {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  if (typeof window === "undefined") return CONFIG_FRETE_PADRAO;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${code}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...CONFIG_FRETE_PADRAO,
        ...parsed,
        regrasBairros: Array.isArray(parsed.regrasBairros) ? parsed.regrasBairros : CONFIG_FRETE_PADRAO.regrasBairros,
      };
    }
  } catch (e) {
    console.warn("Erro ao ler configuração de frete local:", e);
  }

  return CONFIG_FRETE_PADRAO;
}

/**
 * Salva a configuração de frete no LocalStorage e sincroniza com o Supabase
 */
export async function salvarConfiguracaoFrete(
  estabelecimentoCodigo: string,
  config: ConfiguracaoFrete
): Promise<void> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();

  if (typeof window !== "undefined") {
    localStorage.setItem(`${STORAGE_PREFIX}${code}`, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("freteConfigUpdated", { detail: config }));
  }

  try {
    // Tenta persistir no campo de metadados ou tabela estabelecimentos
    const { error } = await supabase
      .from("estabelecimentos")
      .update({
        frete_config: config,
        taxa_entrega_padrao: config.valorFixoPadrao,
        aceita_delivery: config.tipoFretePadrao !== "consulta",
      } as any)
      .eq("codigo", code);

    if (error) {
      console.warn("Aviso ao salvar frete_config no Supabase:", error);
    }
  } catch (e) {
    console.warn("Erro na sincronização de frete com Supabase:", e);
  }
}

/**
 * Calcula o frete de um pedido com base nas regras ativas
 */
export function calcularFretePedido(
  config: ConfiguracaoFrete,
  subtotal: number,
  bairroEscolhido?: string,
  tipoEntrega: "retirada" | "delivery" = "delivery"
): {
  valorFrete: number;
  isGratis: boolean;
  motivo?: string;
  tempoEstimadoMinutos: number;
} {
  if (tipoEntrega === "retirada") {
    return {
      valorFrete: 0,
      isGratis: true,
      motivo: "Retirada no Local (Grátis)",
      tempoEstimadoMinutos: 0,
    };
  }

  // 1. Regra de Frete Grátis Total
  if (config.tipoFretePadrao === "gratis_total") {
    return {
      valorFrete: 0,
      isGratis: true,
      motivo: "Frete Grátis em toda a loja!",
      tempoEstimadoMinutos: config.tempoMedioMinutos || 45,
    };
  }

  // 2. Regra de Frete Grátis Condicional por Valor Mínimo
  if (config.freteGratisAtivo && subtotal >= config.valorMinimoFreteGratis) {
    return {
      valorFrete: 0,
      isGratis: true,
      motivo: `Frete Grátis (Pedido acima de R$ ${config.valorMinimoFreteGratis.toFixed(2).replace(".", ",")})`,
      tempoEstimadoMinutos: config.tempoMedioMinutos || 45,
    };
  }

  // 3. Regra por Bairros/Regiões
  if (config.tipoFretePadrao === "bairros" && bairroEscolhido) {
    const bairroFormatado = bairroEscolhido.trim().toLowerCase();
    const regraEncontrada = config.regrasBairros.find(
      (r) => r.ativo && (r.bairro.toLowerCase() === bairroFormatado || r.id === bairroEscolhido)
    );

    if (regraEncontrada) {
      return {
        valorFrete: Number(regraEncontrada.valor) || 0,
        isGratis: Number(regraEncontrada.valor) === 0,
        motivo: `Taxa do Bairro ${regraEncontrada.bairro}`,
        tempoEstimadoMinutos: regraEncontrada.prazoMinutos || config.tempoMedioMinutos || 45,
      };
    }
  }

  // 4. Fallback: Frete Fixo Padrão
  return {
    valorFrete: Number(config.valorFixoPadrao) || 0,
    isGratis: Number(config.valorFixoPadrao) === 0,
    motivo: config.tipoFretePadrao === "consulta" ? "Frete a combinar" : "Taxa de Entrega Padrão",
    tempoEstimadoMinutos: config.tempoMedioMinutos || 45,
  };
}
