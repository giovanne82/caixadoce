// =========================================================================
// HORARIOS DE FUNCIONAMENTO, EXCEÇÕES & CONTROLE MASTER - CAIXADOCE
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

export type ModoControleExpediente = "manual" | "automatico";

export interface DataExcecaoItem {
  data: string; // "YYYY-MM-DD"
  motivo: string; // Ex: "Feriado de Natal", "Folga da Equipe", etc.
}

export interface ConfiguracaoHorariosCompleta {
  modo_controle: ModoControleExpediente; // "automatico" (padrão) | "manual"
  loja_pausada: boolean; // Master Switch / Botão de Pânico (true = fechada imediatamente)
  status_manual: "aberta" | "fechada"; // Quando em modo manual
  dias: HorariosFuncionamento;
  datas_excecoes: DataExcecaoItem[];
}

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

export const CONFIG_HORARIOS_PADRAO: ConfiguracaoHorariosCompleta = {
  modo_controle: "automatico",
  loja_pausada: false,
  status_manual: "aberta",
  dias: { ...HORARIOS_FUNCIONAMENTO_PADRAO },
  datas_excecoes: [],
};

/**
 * Normaliza os horários por dia da semana garantindo que todos os 7 dias existam.
 */
export function normalizarHorariosDias(diasRaw?: any): HorariosFuncionamento {
  if (!diasRaw || typeof diasRaw !== "object") {
    return { ...HORARIOS_FUNCIONAMENTO_PADRAO };
  }

  const res: any = {};
  for (const item of DIAS_SEMANA_ORDEM) {
    const d = diasRaw[item.key] || (HORARIOS_FUNCIONAMENTO_PADRAO as any)[item.key];
    res[item.key] = {
      aberto: typeof d?.aberto === "boolean" ? d.aberto : true,
      inicio: d?.inicio && typeof d.inicio === "string" ? d.inicio.trim() : "08:00",
      fim: d?.fim && typeof d.fim === "string" ? d.fim.trim() : "18:00",
    };
  }
  return res as HorariosFuncionamento;
}

export const normalizarHorarios = normalizarHorariosDias;

/**
 * Normaliza a configuração completa de expediente com suporte a legado (se vier apenas o objeto de dias).
 */
export function normalizarConfiguracaoCompleta(raw?: any): ConfiguracaoHorariosCompleta {
  if (!raw || typeof raw !== "object") {
    return {
      modo_controle: "automatico",
      loja_pausada: false,
      status_manual: "aberta",
      dias: { ...HORARIOS_FUNCIONAMENTO_PADRAO },
      datas_excecoes: [],
    };
  }

  // Se o objeto raw for a estrutura antiga contendo diretamente as chaves dos dias (segunda, terca...)
  const diasSource = raw.dias || (raw.segunda !== undefined ? raw : null);
  const dias = normalizarHorariosDias(diasSource);

  // Normaliza lista de exceções
  let excecoes: DataExcecaoItem[] = [];
  if (Array.isArray(raw.datas_excecoes)) {
    excecoes = raw.datas_excecoes
      .filter((e: any) => e && (typeof e === "string" || (typeof e === "object" && e.data)))
      .map((e: any) => {
        if (typeof e === "string") {
          return { data: e.trim(), motivo: "Feriado / Folga programada" };
        }
        return {
          data: String(e.data || "").trim(),
          motivo: String(e.motivo || "Feriado / Folga programada").trim(),
        };
      })
      .filter((e: DataExcecaoItem) => /^\d{4}-\d{2}-\d{2}$/.test(e.data));
  } else if (Array.isArray(raw.datasExcecoes)) {
    excecoes = raw.datasExcecoes;
  }

  return {
    modo_controle: raw.modo_controle === "manual" ? "manual" : "automatico",
    loja_pausada: Boolean(raw.loja_pausada || raw.lojaPausada || raw.pausa_emergencial),
    status_manual: raw.status_manual === "fechada" ? "fechada" : "aberta",
    dias,
    datas_excecoes: excecoes,
  };
}

export interface StatusLojaHorario {
  aberta: boolean;
  motivo: string;
  origemDecisao: "pausa_manual" | "modo_manual" | "excecao_data" | "horario_semanal";
  lojaPausada: boolean;
  modoControle: ModoControleExpediente;
  statusManual: "aberta" | "fechada";
  diaAtualKey: DiaSemana;
  diaAtualLabel: string;
  dataHojeStr: string; // "YYYY-MM-DD"
  isDataExcecaoHoje: boolean;
  motivoExcecaoHoje?: string;
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
  datasExcecoes: DataExcecaoItem[];
}

/**
 * Avalia o status da loja respeitando rigorosamente a HIERARQUIA DE LIBERAÇÃO:
 * 1. Botão de Pânico / Pausa Manual (Master Switch) -> Prioridade Máxima
 * 2. Modo Apenas Manual (se modo_controle === 'manual')
 * 3. Calendário de Exceções (Feriados / Folgas na data de hoje)
 * 4. Horário Automático da Semana (Segunda a Domingo)
 */
export function verificarStatusFuncionamento(
  configRaw?: any,
  dataReferencia: Date = new Date()
): StatusLojaHorario {
  const config = normalizarConfiguracaoCompleta(configRaw);

  let dayIndex = dataReferencia.getDay();
  let horaAtualStr = "";
  let dataHojeStr = "";

  try {
    const timeFmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).format(dataReferencia);
    horaAtualStr = timeFmt;

    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dataReferencia);
    dataHojeStr = dateParts; // Formato YYYY-MM-DD

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
    const y = dataReferencia.getFullYear();
    const m = String(dataReferencia.getMonth() + 1).padStart(2, "0");
    const d = String(dataReferencia.getDate()).padStart(2, "0");
    dataHojeStr = `${y}-${m}-${d}`;
    const h = String(dataReferencia.getHours()).padStart(2, "0");
    const min = String(dataReferencia.getMinutes()).padStart(2, "0");
    horaAtualStr = `${h}:${min}`;
    dayIndex = dataReferencia.getDay();
  }

  const diaAtualItem =
    DIAS_SEMANA_ORDEM.find((d) => d.dayIndex === dayIndex) || DIAS_SEMANA_ORDEM[0];
  const configHoje = config.dias[diaAtualItem.key] || HORARIOS_FUNCIONAMENTO_PADRAO[diaAtualItem.key];

  const tabelaSemana = DIAS_SEMANA_ORDEM.map((item) => {
    const cfg = config.dias[item.key] || HORARIOS_FUNCIONAMENTO_PADRAO[item.key];
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

  const horarioHojeFormatado = configHoje.aberto
    ? `${configHoje.inicio} às ${configHoje.fim}`
    : "Fechado";

  // =========================================================================
  // CAMADA 1: MASTER SWITCH / BOTÃO DE PÂNICO (PAUSA MANUAL FORÇADA)
  // =========================================================================
  if (config.loja_pausada) {
    return {
      aberta: false,
      motivo: "Loja pausada manualmente pelo lojista",
      origemDecisao: "pausa_manual",
      lojaPausada: true,
      modoControle: config.modo_controle,
      statusManual: config.status_manual,
      diaAtualKey: diaAtualItem.key,
      diaAtualLabel: diaAtualItem.label,
      dataHojeStr,
      isDataExcecaoHoje: false,
      horarioHojeFormatado,
      tabelaSemana,
      datasExcecoes: config.datas_excecoes,
    };
  }

  // =========================================================================
  // CAMADA 2: MODO APENAS MANUAL
  // =========================================================================
  if (config.modo_controle === "manual") {
    const isManualAberta = config.status_manual === "aberta";
    return {
      aberta: isManualAberta,
      motivo: isManualAberta ? "Aberta (Modo Manual)" : "Fechada manualmente",
      origemDecisao: "modo_manual",
      lojaPausada: false,
      modoControle: "manual",
      statusManual: config.status_manual,
      diaAtualKey: diaAtualItem.key,
      diaAtualLabel: diaAtualItem.label,
      dataHojeStr,
      isDataExcecaoHoje: false,
      horarioHojeFormatado: isManualAberta ? "Operação Manual Aberta" : "Fechada Manualmente",
      tabelaSemana,
      datasExcecoes: config.datas_excecoes,
    };
  }

  // =========================================================================
  // CAMADA 3: CALENDÁRIO DE EXCEÇÕES (FERIADOS E FOLGAS)
  // =========================================================================
  const excecaoHoje = config.datas_excecoes.find((e) => e.data === dataHojeStr);
  if (excecaoHoje) {
    return {
      aberta: false,
      motivo: excecaoHoje.motivo ? `Fechado: ${excecaoHoje.motivo}` : "Feriado / Folga programada",
      origemDecisao: "excecao_data",
      lojaPausada: false,
      modoControle: "automatico",
      statusManual: config.status_manual,
      diaAtualKey: diaAtualItem.key,
      diaAtualLabel: diaAtualItem.label,
      dataHojeStr,
      isDataExcecaoHoje: true,
      motivoExcecaoHoje: excecaoHoje.motivo,
      horarioHojeFormatado: "Fechado (Feriado/Folga)",
      tabelaSemana,
      datasExcecoes: config.datas_excecoes,
    };
  }

  // =========================================================================
  // CAMADA 4: HORÁRIO AUTOMÁTICO DA SEMANA
  // =========================================================================
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

  return {
    aberta,
    motivo,
    origemDecisao: "horario_semanal",
    lojaPausada: false,
    modoControle: "automatico",
    statusManual: config.status_manual,
    diaAtualKey: diaAtualItem.key,
    diaAtualLabel: diaAtualItem.label,
    dataHojeStr,
    isDataExcecaoHoje: false,
    horarioHojeFormatado,
    tabelaSemana,
    datasExcecoes: config.datas_excecoes,
  };
}

/**
 * Salva a configuração completa no localStorage.
 */
export function salvarHorariosLocal(
  codigoLoja: string,
  config: ConfiguracaoHorariosCompleta
): void {
  if (typeof window === "undefined" || !codigoLoja) return;
  try {
    localStorage.setItem(
      `caixadoce_horarios_${codigoLoja.toUpperCase()}`,
      JSON.stringify(config)
    );
  } catch (err) {
    console.error("[HorariosService] Erro ao salvar horários no localStorage:", err);
  }
}

/**
 * Recupera a configuração completa do localStorage.
 */
export function obterHorariosLocal(
  codigoLoja: string
): ConfiguracaoHorariosCompleta | null {
  if (typeof window === "undefined" || !codigoLoja) return null;
  try {
    const raw = localStorage.getItem(`caixadoce_horarios_${codigoLoja.toUpperCase()}`);
    if (raw) {
      return normalizarConfiguracaoCompleta(JSON.parse(raw));
    }
  } catch (err) {
    console.error("[HorariosService] Erro ao ler horários do localStorage:", err);
  }
  return null;
}
