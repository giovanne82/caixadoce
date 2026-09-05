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
  tipoFretePadrao: "bairros",
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
 * Obtém a configuração de frete do estabelecimento de forma síncrona (Cache Local com Fallback Seguro)
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
 * Carrega a configuração de frete atualizada diretamente do Supabase e sincroniza no cache local
 */
export async function carregarConfiguracaoFreteAsync(estabelecimentoCodigo: string): Promise<ConfiguracaoFrete> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    const { data, error } = await supabase
      .from("estabelecimentos")
      .select("frete_config, taxa_entrega_padrao, aceita_delivery")
      .eq("codigo", code)
      .maybeSingle();

    if (!error && data && data.frete_config) {
      const configSupabase = typeof data.frete_config === "string" 
        ? JSON.parse(data.frete_config) 
        : data.frete_config;
      
      const configUnificada: ConfiguracaoFrete = {
        ...CONFIG_FRETE_PADRAO,
        ...configSupabase,
        regrasBairros: Array.isArray(configSupabase.regrasBairros) ? configSupabase.regrasBairros : CONFIG_FRETE_PADRAO.regrasBairros,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(`${STORAGE_PREFIX}${code}`, JSON.stringify(configUnificada));
        window.dispatchEvent(new CustomEvent("freteConfigUpdated", { detail: configUnificada }));
      }
      return configUnificada;
    }
  } catch (e) {
    console.warn("Aviso ao buscar frete_config do Supabase:", e);
  }

  return obterConfiguracaoFrete(code);
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
 * Calcula o frete de um pedido com base na Zona de Entrega / Região selecionada
 */
export function calcularFretePedido(
  config: ConfiguracaoFrete,
  subtotal: number,
  regiaoIdOuNome?: string,
  tipoEntrega: "retirada" | "delivery" = "delivery"
): {
  valorFrete: number;
  isGratis: boolean;
  motivo?: string;
  tempoEstimadoMinutos: number;
  bairroIdentificado?: string;
  naoAtendido?: boolean;
} {
  if (tipoEntrega === "retirada") {
    return {
      valorFrete: 0,
      isGratis: true,
      motivo: "Retirada no Local (Grátis)",
      tempoEstimadoMinutos: 0,
      naoAtendido: false,
    };
  }

  // 1. Regra de Frete Grátis Total da Loja
  if (config.tipoFretePadrao === "gratis_total") {
    return {
      valorFrete: 0,
      isGratis: true,
      motivo: "Frete Grátis em toda a loja!",
      tempoEstimadoMinutos: config.tempoMedioMinutos || 45,
      naoAtendido: false,
    };
  }

  // 2. Regra de Frete Grátis Condicional por Valor Mínimo de Pedido
  if (config.freteGratisAtivo && subtotal >= config.valorMinimoFreteGratis) {
    return {
      valorFrete: 0,
      isGratis: true,
      motivo: `Frete Grátis (Pedido acima de R$ ${config.valorMinimoFreteGratis.toFixed(2).replace(".", ",")})`,
      tempoEstimadoMinutos: config.tempoMedioMinutos || 45,
      naoAtendido: false,
    };
  }

  // 3. Correspondência por ID ou Nome da Zona de Entrega / Região
  const temRegrasAtivas = Array.isArray(config.regrasBairros) && config.regrasBairros.some((r) => r.ativo);
  const termoLimpo = regiaoIdOuNome ? regiaoIdOuNome.trim().toLowerCase() : "";

  if (termoLimpo && temRegrasAtivas) {
    const regraEncontrada = config.regrasBairros.find(
      (r) => r.ativo && (r.id === regiaoIdOuNome || r.bairro.toLowerCase() === termoLimpo)
    );

    if (regraEncontrada) {
      const valor = Number(regraEncontrada.valor) || 0;
      return {
        valorFrete: valor,
        isGratis: valor === 0,
        motivo: valor === 0 ? `Frete Grátis (${regraEncontrada.bairro})` : `Taxa (${regraEncontrada.bairro})`,
        tempoEstimadoMinutos: regraEncontrada.prazoMinutos || config.tempoMedioMinutos || 45,
        bairroIdentificado: regraEncontrada.bairro,
        naoAtendido: false,
      };
    }
  }

  // 4. Fallback: Frete Fixo Padrão ou Sob Consulta
  const valorFixo = Number(config.valorFixoPadrao) || 0;
  return {
    valorFrete: valorFixo,
    isGratis: valorFixo === 0,
    motivo: config.tipoFretePadrao === "consulta" ? "Frete a combinar" : "Taxa de Entrega Padrão",
    tempoEstimadoMinutos: config.tempoMedioMinutos || 45,
    naoAtendido: false,
  };
}
