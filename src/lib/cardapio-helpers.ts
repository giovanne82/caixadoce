import type { ProdutoCardapio, RegrasAgendamento } from "./caixadoce-data";
import { REGRAS_AGENDAMENTO_PADRAO } from "./constants";

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function aplicarMascaraTelefone(valor: string): string {
  const limpo = (valor || "").replace(/\D/g, "").slice(0, 11);
  if (!limpo) return "";
  if (limpo.length <= 2) return `(${limpo}`;
  if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
  if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
}

/**
 * Normaliza uma string de telefone removendo parênteses, espaços, traços e caracteres não-numéricos.
 * Exemplo: "(11) 98765-4321" -> "11987654321"
 */
export function limparTelefone(valor?: string): string {
  if (!valor) return "";
  return String(valor).replace(/\D/g, "");
}

export function aplicarMascaraMoedaInput(valorInput: string): string {
  const digitos = valorInput.replace(/\D/g, "");
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  return `R$ ${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(centavos))}`;
}

export function converterMoedaInputParaNumero(valorFormatado: string | number): number {
  if (typeof valorFormatado === "number") {
    return isNaN(valorFormatado) ? 0 : valorFormatado;
  }
  if (!valorFormatado) return 0;

  const str = String(valorFormatado).trim();
  if (!str) return 0;

  if (str.includes(",")) {
    const limpo = str.replace(/[^\d,]/g, "").replace(",", ".");
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  }

  if (str.includes(".")) {
    const limpo = str.replace(/[^\d.]/g, "");
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  }

  const apenasDigitos = str.replace(/\D/g, "");
  if (!apenasDigitos) return 0;
  return Number(apenasDigitos) / 100;
}

export function formatarWhatsappLink(whatsapp: string, mensagem?: string): string {
  const cleanPhone = (whatsapp || "").replace(/\D/g, "");
  const textEncoded = mensagem ? encodeURIComponent(mensagem) : "";
  if (!cleanPhone) {
    return `https://api.whatsapp.com/send?text=${textEncoded}`;
  }
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${formattedPhone}${textEncoded ? `?text=${textEncoded}` : ""}`;
}

export function formatarLinkRedeSocial(tipo: "instagram" | "tiktok" | "facebook" | "whatsapp", valor?: string): string {
  if (!valor) return "";
  const v = valor.trim();
  if (!v) return "";

  if (v.startsWith("http://") || v.startsWith("https://")) {
    return v;
  }

  const clean = v.replace(/^@/, "").trim();

  switch (tipo) {
    case "instagram":
      return `https://instagram.com/${clean}`;
    case "tiktok":
      return `https://www.tiktok.com/@${clean}`;
    case "facebook":
      return v.includes("facebook.com") ? `https://${v}` : `https://facebook.com/${clean}`;
    case "whatsapp":
      const digits = v.replace(/\D/g, "");
      const fullDigits = digits.length <= 11 ? `55${digits}` : digits;
      return `https://wa.me/${fullDigits}`;
    default:
      return v;
  }
}

export function obterProdutosCardapio(codigoLoja?: string): ProdutoCardapio[] {
  const code = (codigoLoja || "CD-1001").toUpperCase();
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_cardapio_${code}`);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function salvarProdutosCardapio(codigoLoja: string, produtos: ProdutoCardapio[]) {
  const code = (codigoLoja || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_cardapio_${code}`, JSON.stringify(produtos));
  } catch (e) {
    console.warn("Erro ao salvar produtos do cardápio:", e);
  }
}

export function obterRegrasAgendamento(estabelecimentoCodigo?: string): RegrasAgendamento {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`caixadoce_regras_agendamento_${code}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...REGRAS_AGENDAMENTO_PADRAO, ...parsed };
      }
    }
  } catch {}
  return REGRAS_AGENDAMENTO_PADRAO;
}

export function salvarRegrasAgendamentoStorage(estabelecimentoCodigo: string, regras: RegrasAgendamento) {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  try {
    localStorage.setItem(`caixadoce_regras_agendamento_${code}`, JSON.stringify(regras));
  } catch (e) {
    console.warn("Erro ao salvar regras de agendamento:", e);
  }
}

export function validarDataEntrega(
  dataIso: string,
  regras: RegrasAgendamento
): { valida: boolean; motivo?: string } {
  if (!dataIso) return { valida: false, motivo: "Selecione uma data para a encomenda." };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const parts = dataIso.split("-").map(Number);
  if (parts.length !== 3) return { valida: false, motivo: "Data em formato inválido." };
  const [ano, mes, dia] = parts;
  const dataAlvo = new Date(ano, mes - 1, dia);
  dataAlvo.setHours(0, 0, 0, 0);

  const diffTime = dataAlvo.getTime() - hoje.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < (regras.antecedenciaMinimaDias || 0)) {
    if (regras.antecedenciaMinimaDias === 0) {
      if (diffDays < 0) return { valida: false, motivo: "A data informada já passou." };
    } else {
      return {
        valida: false,
        motivo: `Encomendas devem ser feitas com no mínimo ${regras.antecedenciaMinimaDias} dia(s) de antecedência.`,
      };
    }
  }

  const diaSemana = dataAlvo.getDay();
  if (!regras.diasSemanaDisponiveis || !regras.diasSemanaDisponiveis.includes(diaSemana)) {
    const NOMES_DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return {
      valida: false,
      motivo: `A loja não realiza entregas em ${NOMES_DIAS[diaSemana]}s.`,
    };
  }

  if (regras.datasBloqueadas && regras.datasBloqueadas.includes(dataIso)) {
    return {
      valida: false,
      motivo: "Esta data está indisponível na agenda da loja (agenda cheia ou recesso).",
    };
  }

  return { valida: true };
}

export function validarHorarioEntrega(
  horario: string,
  regras: RegrasAgendamento
): { valido: boolean; motivo?: string } {
  if (!horario) return { valido: true };

  const hForm = horario.trim();
  if (hForm < regras.horarioAbertura || hForm > regras.horarioFechamento) {
    return {
      valido: false,
      motivo: `Horário fora do expediente da loja (${regras.horarioAbertura} às ${regras.horarioFechamento}).`,
    };
  }

  return { valido: true };
}

export function formatarBadgeDisponibilidadeProduto(prod: ProdutoCardapio): {
  texto: string;
  isProntaEntrega: boolean;
} {
  const isPronta = prod.availability_type === "pronta_entrega";

  if (isPronta) {
    if (prod.available_days && prod.available_days.length > 0 && prod.available_days.length < 7) {
      const DIAS_SIGLAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const ordenados = [...prod.available_days].sort((a, b) => a - b);
      const primeiro = DIAS_SIGLAS[ordenados[0]];
      const ultimo = DIAS_SIGLAS[ordenados[ordenados.length - 1]];
      const diasTexto = ordenados.length === 1 ? primeiro : `${primeiro} a ${ultimo}`;
      return {
        texto: `⚡ Pronta Entrega (${diasTexto})`,
        isProntaEntrega: true,
      };
    }
    return {
      texto: "⚡ Pronta Entrega",
      isProntaEntrega: true,
    };
  }

  const diasLead = prod.min_lead_time_days ?? (prod.tempoPreparoHoras ? Math.ceil(prod.tempoPreparoHoras / 24) : 1);
  if (diasLead === 0) {
    return {
      texto: "🕒 Encomenda no mesmo dia",
      isProntaEntrega: false,
    };
  } else if (diasLead === 1) {
    return {
      texto: "🕒 Antecedência: ~24h",
      isProntaEntrega: false,
    };
  } else {
    return {
      texto: `🕒 Antecedência: ${diasLead} dia(s)`,
      isProntaEntrega: false,
    };
  }
}

export function calcularRegrasAgendamentoCarrinho(
  regrasLoja: RegrasAgendamento,
  itensCarrinho: { produto: ProdutoCardapio; quantidade: number }[]
): RegrasAgendamento {
  if (!itensCarrinho || itensCarrinho.length === 0) return regrasLoja;

  const todosProntaEntrega = itensCarrinho.every(
    (item) => item.produto.availability_type === "pronta_entrega"
  );

  let maxLeadTime = todosProntaEntrega ? 0 : (regrasLoja.antecedenciaMinimaDias || 0);
  let diasPermitidos = [...(regrasLoja.diasSemanaDisponiveis || [0, 1, 2, 3, 4, 5, 6])];

  itensCarrinho.forEach(({ produto }) => {
    const isEncomenda = produto.availability_type !== "pronta_entrega";

    if (isEncomenda) {
      const leadTime =
        produto.min_lead_time_days ??
        (produto.tempoPreparoHoras ? Math.ceil(produto.tempoPreparoHoras / 24) : 1);
      if (leadTime > maxLeadTime) {
        maxLeadTime = leadTime;
      }
    }

    if (produto.availability_type === "pronta_entrega" && produto.available_days && produto.available_days.length > 0) {
      diasPermitidos = diasPermitidos.filter((d) => produto.available_days!.includes(d));
    }
  });

  return {
    ...regrasLoja,
    antecedenciaMinimaDias: maxLeadTime,
    diasSemanaDisponiveis: diasPermitidos,
  };
}

export interface PaletaCorTema {
  id: string;
  nome: string;
  hex: string;
  corClara: string;
  texto: string;
}

export const PALETAS_CORES_TEMA: PaletaCorTema[] = [
  {
    id: "roxo_caixadoce",
    nome: "Roxo / Lilás (Padrão)",
    hex: "#8E7CC3",
    corClara: "#F3EEF9",
    texto: "#2E1A47",
  },
  {
    id: "rosa_confeitaria",
    nome: "Rosa Chiclete / Confeitaria",
    hex: "#EC4899",
    corClara: "#FDF2F8",
    texto: "#831843",
  },
  {
    id: "vermelho_morango",
    nome: "Vermelho Morango & Cereja",
    hex: "#E11D48",
    corClara: "#FFF1F2",
    texto: "#881337",
  },
  {
    id: "chocolate_dourado",
    nome: "Chocolate Gourmet & Caramelo",
    hex: "#92400E",
    corClara: "#FEF3C7",
    texto: "#451A03",
  },
  {
    id: "verde_menta",
    nome: "Verde Menta / Pistache",
    hex: "#059669",
    corClara: "#ECFDF5",
    texto: "#064E3B",
  },
  {
    id: "azul_tiffany",
    nome: "Azul Bebê / Tiffany",
    hex: "#0284C7",
    corClara: "#F0F9FF",
    texto: "#0C4A6E",
  },
  {
    id: "preto_elegante",
    nome: "Preto / Grafite Moderno",
    hex: "#18181B",
    corClara: "#F4F4F5",
    texto: "#09090B",
  },
];
