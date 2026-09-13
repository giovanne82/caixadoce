// =========================================================================
// HORARIOS DE FUNCIONAMENTO & REGRAS DE EXPEDIENTE - CAIXADOCE
// =========================================================================

export type DiaSemana =
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado"
  | "domingo";

export interface HorarioDiaConfig {
  aberto: boolean;
  inicio: string; // Ex: "08:00"
  fim: string;    // Ex: "18:00"
}

export type HorariosFuncionamento = Record<DiaSemana, HorarioDiaConfig>;

export interface DiaSemanaItem {
  key: DiaSemana;
  label: string;
  shortLabel: string;
  dayIndex: number; // 0 = Domingo, 1 = Segunda, ... 6 = Sábado
}

export const DIAS_SEMANA_ORDEM: DiaSemanaItem[] = [
  { key: "segunda", label: "Segunda-feira", shortLabel: "Seg", dayIndex: 1 },
  { key: "terca", label: "Terça-feira", shortLabel: "Ter", dayIndex: 2 },
  { key: "quarta", label: "Quarta-feira", shortLabel: "Qua", dayIndex: 3 },
  { key: "quinta", label: "Quinta-feira", shortLabel: "Qui", dayIndex: 4 },
  { key: "sexta", label: "Sexta-feira", shortLabel: "Sex", dayIndex: 5 },
  { key: "sabado", label: "Sábado", shortLabel: "Sáb", dayIndex: 6 },
  { key: "domingo", label: "Domingo", shortLabel: "Dom", dayIndex: 0 },
];

export const HORARIOS_FUNCIONAMENTO_PADRAO: HorariosFuncionamento = {
  segunda: { aberto: true, inicio: "08:00", fim: "18:00" },
  terca: { aberto: true, inicio: "08:00", fim: "18:00" },
  quarta: { aberto: true, inicio: "08:00", fim: "18:00" },
  quinta: { aberto: true, inicio: "08:00", fim: "18:00" },
  sexta: { aberto: true, inicio: "08:00", fim: "18:00" },
  sabado: { aberto: true, inicio: "08:00", fim: "18:00" },
  domingo: { aberto: false, inicio: "08:00", fim: "14:00" },
};

/**
 * Normaliza os horários garantindo que todos os 7 dias existam com valores válidos.
 */
export function normalizarHorarios(horariosRaw?: any): HorariosFuncionamento {
  if (!horariosRaw || typeof horariosRaw !== "object") {
    return { ...HORARIOS_FUNCIONAMENTO_PADRAO };
  }

  const res: any = {};
  for (const item of DIAS_SEMANA_ORDEM) {
    const d = horariosRaw[item.key] || (HORARIOS_FUNCIONAMENTO_PADRAO as any)[item.key];
    res[item.key] = {
      aberto: typeof d?.aberto === "boolean" ? d.aberto : true,
      inicio: d?.inicio && typeof d.inicio === "string" ? d.inicio.trim() : "08:00",
      fim: d?.fim && typeof d.fim === "string" ? d.fim.trim() : "18:00",
    };
  }
  return res as HorariosFuncionamento;
}

export interface StatusLojaHorario {
  aberta: boolean;
  motivo: string;
  diaAtualKey: DiaSemana;
  diaAtualLabel: string;
  horarioHojeFormatado: string;
  tabelaSemana: Array<{
    diaKey: DiaSemana;
    label: string;
    shortLabel: string;
    aberto: boolean;
    inicio: string;
    fim: string;
    textoFormatado: string;
    isHoje: boolean;
  }>;
}

/**
 * Verifica se a loja está aberta no momento com base nos horários configurados.
 * Utiliza o horário local do cliente / fuso brasileiro (America/Sao_Paulo).
 */
export function verificarStatusFuncionamento(
  horariosRaw?: any,
  dataReferencia: Date = new Date()
): StatusLojaHorario {
  const horarios = normalizarHorarios(horariosRaw);

  // Determina dia da semana (0=Dom, 1=Seg.. 6=Sab)
  let dayIndex = dataReferencia.getDay();
  let horaAtualStr = "";

  try {
    const timeFmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).format(dataReferencia);
    horaAtualStr = timeFmt;

    const weekdayStr = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
    })
      .format(dataReferencia)
      .toLowerCase();

    if (weekdayStr.startsWith("dom")) dayIndex = 0;
    else if (weekdayStr.startsWith("seg")) dayIndex = 1;
    else if (weekdayStr.startsWith("ter")) dayIndex = 2;
    else if (weekdayStr.startsWith("qua")) dayIndex = 3;
    else if (weekdayStr.startsWith("qui")) dayIndex = 4;
    else if (weekdayStr.startsWith("sex")) dayIndex = 5;
    else if (weekdayStr.startsWith("sáb") || weekdayStr.startsWith("sab")) dayIndex = 6;
  } catch {
    const h = String(dataReferencia.getHours()).padStart(2, "0");
    const m = String(dataReferencia.getMinutes()).padStart(2, "0");
    horaAtualStr = `${h}:${m}`;
    dayIndex = dataReferencia.getDay();
  }

  const diaAtualItem =
    DIAS_SEMANA_ORDEM.find((d) => d.dayIndex === dayIndex) || DIAS_SEMANA_ORDEM[0];
  const configHoje = horarios[diaAtualItem.key] || HORARIOS_FUNCIONAMENTO_PADRAO[diaAtualItem.key];

  let aberta = false;
  let motivo = "Fechado";

  if (!configHoje.aberto) {
    aberta = false;
    motivo = "Fechado hoje";
  } else {
    const inicio = configHoje.inicio || "08:00";
    const fim = configHoje.fim || "18:00";

    if (fim >= inicio) {
      aberta = horaAtualStr >= inicio && horaAtualStr <= fim;
    } else {
      // Caso atravesse a meia-noite (ex: 18:00 às 02:00)
      aberta = horaAtualStr >= inicio || horaAtualStr <= fim;
    }

    if (aberta) {
      motivo = "Aberto agora";
    } else if (horaAtualStr < inicio) {
      motivo = `Abre hoje às ${inicio}`;
    } else {
      motivo = `Fechou às ${fim}`;
    }
  }

  const horarioHojeFormatado = configHoje.aberto
    ? `${configHoje.inicio} às ${configHoje.fim}`
    : "Fechado";

  const tabelaSemana = DIAS_SEMANA_ORDEM.map((item) => {
    const cfg = horarios[item.key] || HORARIOS_FUNCIONAMENTO_PADRAO[item.key];
    const isHoje = item.key === diaAtualItem.key;
    const textoFormatado = cfg.aberto ? `${cfg.inicio} às ${cfg.fim}` : "Fechado";
    return {
      diaKey: item.key,
      label: item.label,
      shortLabel: item.shortLabel,
      aberto: cfg.aberto,
      inicio: cfg.inicio,
      fim: cfg.fim,
      textoFormatado,
      isHoje,
    };
  });

  return {
    aberta,
    motivo,
    diaAtualKey: diaAtualItem.key,
    diaAtualLabel: diaAtualItem.label,
    horarioHojeFormatado,
    tabelaSemana,
  };
}

/**
 * Salva os horários em localStorage como fallback e cache rápido por loja.
 */
export function salvarHorariosLocal(codigoLoja: string, horarios: HorariosFuncionamento): void {
  if (typeof window === "undefined" || !codigoLoja) return;
  try {
    localStorage.setItem(`caixadoce_horarios_${codigoLoja.toUpperCase()}`, JSON.stringify(horarios));
  } catch (err) {
    console.error("[HorariosService] Erro ao salvar horários no localStorage:", err);
  }
}

/**
 * Recupera os horários do localStorage.
 */
export function obterHorariosLocal(codigoLoja: string): HorariosFuncionamento | null {
  if (typeof window === "undefined" || !codigoLoja) return null;
  try {
    const raw = localStorage.getItem(`caixadoce_horarios_${codigoLoja.toUpperCase()}`);
    if (raw) {
      return normalizarHorarios(JSON.parse(raw));
    }
  } catch (err) {
    console.error("[HorariosService] Erro ao ler horários do localStorage:", err);
  }
  return null;
}
