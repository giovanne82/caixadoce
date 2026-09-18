import { obterTokensIFoodEstabelecimento, renovarAccessTokenIFood, getSupabaseBackendClient } from "./ifood-service";

export interface IFoodMerchantStatusResponse {
  success: boolean;
  isAvailable: boolean;
  state: "OK" | "CLOSED" | "WARNING" | "UNKNOWN";
  title?: string;
  subtitle?: string;
  description?: string;
  reasons?: string[];
  merchantId?: string;
  raw?: any;
  error?: string;
  status?: number;
}

export interface IFoodShiftItem {
  dayOfWeek: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
  start: string; // HH:mm:ss
  duration: number; // minutes
  salesChannel?: "IFOOD" | "DELIVERY" | "ALL";
  status?: "AVAILABLE" | "UNAVAILABLE";
}

/**
 * Consulta o status da loja (aberta/fechada/interrompida) na API do iFood
 */
export async function consultarStatusLojaIFood(
  estabelecimentoCodigo?: string
): Promise<IFoodMerchantStatusResponse> {
  const estData = await obterTokensIFoodEstabelecimento(estabelecimentoCodigo);
  if ("error" in estData && estData.error) {
    return {
      success: false,
      isAvailable: false,
      state: "UNKNOWN",
      error: estData.error,
      status: 404,
    };
  }

  let accessToken = estData.accessToken;
  const merchantId = estData.merchantId;

  if (!accessToken || !merchantId) {
    return {
      success: false,
      isAvailable: false,
      state: "UNKNOWN",
      error: "Loja não possui token ou merchantId do iFood configurado.",
      status: 401,
    };
  }

  const ifoodUrl = `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/status`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  try {
    let res = await fetch(ifoodUrl, { method: "GET", headers });

    // Auto-refresh caso 401
    if (res.status === 401 && estData.refreshToken) {
      try {
        accessToken = await renovarAccessTokenIFood(estData.id, estData.refreshToken);
        headers.Authorization = `Bearer ${accessToken}`;
        res = await fetch(ifoodUrl, { method: "GET", headers });
      } catch (renewErr) {
        console.error("[iFood Status Renew Error]", renewErr);
      }
    }

    if (!res.ok) {
      const errTxt = await res.text();
      return {
        success: false,
        isAvailable: false,
        state: "UNKNOWN",
        merchantId,
        error: `iFood retornou HTTP ${res.status}: ${errTxt}`,
        status: res.status,
      };
    }

    const data = await res.json();
    const statusList = Array.isArray(data) ? data : [data];
    const deliveryStatus = statusList.find((s: any) => s.operation === "DELIVERY") || statusList[0] || {};

    const isAvailable = Boolean(deliveryStatus.available ?? (deliveryStatus.state === "OK"));
    const state = deliveryStatus.state || (isAvailable ? "OK" : "CLOSED");
    const reasons = Array.isArray(deliveryStatus.reasons)
      ? deliveryStatus.reasons.map((r: any) => (typeof r === "string" ? r : r.description || r.code || JSON.stringify(r)))
      : [];

    const msgObj = deliveryStatus.message || {};
    const title = msgObj.title || (isAvailable ? "Loja Aberta" : "Loja Fechada");
    const subtitle = msgObj.subtitle || (isAvailable ? "Recebendo pedidos normalmente" : "Operação temporariamente fechada");
    const description = msgObj.description || reasons.join(", ");

    return {
      success: true,
      isAvailable,
      state,
      title,
      subtitle,
      description,
      reasons,
      merchantId,
      raw: data,
      status: 200,
    };
  } catch (err: any) {
    console.error("[consultarStatusLojaIFood Exception]", err);
    return {
      success: false,
      isAvailable: false,
      state: "UNKNOWN",
      merchantId,
      error: err.message || "Falha de conexão com a API do iFood.",
      status: 500,
    };
  }
}

/**
 * Altera o status da loja no iFood (Abrir / Fechar via Interrupções de Operação)
 */
export async function alterarStatusLojaIFood(
  estabelecimentoCodigo: string,
  statusAcao: "open" | "close",
  options?: { motivo?: string; duracaoMinutos?: number }
): Promise<{ success: boolean; message?: string; error?: string; status?: number }> {
  const estData = await obterTokensIFoodEstabelecimento(estabelecimentoCodigo);
  if ("error" in estData && estData.error) {
    return { success: false, error: estData.error, status: 404 };
  }

  let accessToken = estData.accessToken;
  const merchantId = estData.merchantId;

  if (!accessToken || !merchantId) {
    return {
      success: false,
      error: "Loja sem credenciais ou merchantId do iFood conectados.",
      status: 401,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const executeWithAuth = async (fn: () => Promise<Response>) => {
    let res = await fn();
    if (res.status === 401 && estData.refreshToken) {
      accessToken = await renovarAccessTokenIFood(estData.id, estData.refreshToken);
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fn();
    }
    return res;
  };

  try {
    if (statusAcao === "close") {
      // 1. Cria uma interrupção de funcionamento para fechar a loja
      const duracao = options?.duracaoMinutos || 1440; // 24h por padrão se não especificado
      const agora = new Date();
      const termino = new Date(agora.getTime() + duracao * 60 * 1000);

      const interruptionPayload = {
        description: options?.motivo || "Fechamento temporário pelo painel CaixaDoce",
        start: agora.toISOString(),
        end: termino.toISOString(),
      };

      console.log(`[iFood Merchant Close] Criando interrupção para loja ${merchantId}:`, interruptionPayload);

      const res = await executeWithAuth(() =>
        fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/interruptions`, {
          method: "POST",
          headers,
          body: JSON.stringify(interruptionPayload),
        })
      );

      if (!res.ok && res.status !== 200 && res.status !== 201 && res.status !== 202 && res.status !== 204) {
        const errTxt = await res.text();
        console.error(`[iFood Merchant Close Error] HTTP ${res.status}: ${errTxt}`);
        return {
          success: false,
          error: `Falha ao fechar loja no iFood (HTTP ${res.status}): ${errTxt}`,
          status: res.status,
        };
      }

      // Atualiza o Supabase
      const supabase = getSupabaseBackendClient();
      await supabase
        .from("estabelecimentos")
        .update({
          ifood_status: "conectado_fechado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", estData.id);

      return {
        success: true,
        message: "Loja fechada com sucesso no iFood!",
        status: 200,
      };
    } else {
      // 2. Para abrir a loja: busca todas as interrupções ativas e as remove
      console.log(`[iFood Merchant Open] Buscando interrupções ativas para a loja ${merchantId}...`);

      const listRes = await executeWithAuth(() =>
        fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/interruptions`, {
          method: "GET",
          headers,
        })
      );

      if (listRes.ok) {
        const interruptions = await listRes.json();
        if (Array.isArray(interruptions) && interruptions.length > 0) {
          console.log(`[iFood Merchant Open] Removendo ${interruptions.length} interrupção(ões)...`);
          for (const item of interruptions) {
            const intId = item.id || item.interruptionId;
            if (intId) {
              await executeWithAuth(() =>
                fetch(
                  `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/interruptions/${encodeURIComponent(intId)}`,
                  { method: "DELETE", headers }
                )
              ).catch((delErr) => console.warn(`[iFood Delete Interruption ${intId} Log]`, delErr));
            }
          }
        }
      }

      // Atualiza o Supabase
      const supabase = getSupabaseBackendClient();
      await supabase
        .from("estabelecimentos")
        .update({
          ifood_status: "conectado_aberto",
          updated_at: new Date().toISOString(),
        })
        .eq("id", estData.id);

      return {
        success: true,
        message: "Loja aberta com sucesso no iFood!",
        status: 200,
      };
    }
  } catch (err: any) {
    console.error("[alterarStatusLojaIFood Exception]", err);
    return {
      success: false,
      error: err.message || "Falha ao alterar status da loja no iFood.",
      status: 500,
    };
  }
}

/**
 * Consulta a grade de horários de funcionamento (Shifts) no iFood
 */
export async function consultarHorariosLojaIFood(
  estabelecimentoCodigo?: string
): Promise<{ success: boolean; shifts?: IFoodShiftItem[]; error?: string; status?: number }> {
  const estData = await obterTokensIFoodEstabelecimento(estabelecimentoCodigo);
  if ("error" in estData && estData.error) {
    return { success: false, error: estData.error, status: 404 };
  }

  let accessToken = estData.accessToken;
  const merchantId = estData.merchantId;

  if (!accessToken || !merchantId) {
    return { success: false, error: "Credenciais do iFood ausentes.", status: 401 };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  try {
    let res = await fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/shifts`, {
      method: "GET",
      headers,
    });

    if (res.status === 401 && estData.refreshToken) {
      accessToken = await renovarAccessTokenIFood(estData.id, estData.refreshToken);
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/shifts`, {
        method: "GET",
        headers,
      });
    }

    if (!res.ok) {
      const errTxt = await res.text();
      return { success: false, error: `iFood retornou HTTP ${res.status}: ${errTxt}`, status: res.status };
    }

    const data = await res.json();
    return { success: true, shifts: Array.isArray(data) ? data : [], status: 200 };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao consultar horários no iFood", status: 500 };
  }
}

/**
 * Sincroniza a grade de horários do estabelecimento com o iFood
 */
export async function sincronizarHorariosLojaIFood(
  estabelecimentoCodigo: string,
  shiftsCustom?: IFoodShiftItem[]
): Promise<{ success: boolean; message?: string; error?: string; status?: number }> {
  const estData = await obterTokensIFoodEstabelecimento(estabelecimentoCodigo);
  if ("error" in estData && estData.error) {
    return { success: false, error: estData.error, status: 404 };
  }

  let accessToken = estData.accessToken;
  const merchantId = estData.merchantId;

  if (!accessToken || !merchantId) {
    return { success: false, error: "Credenciais do iFood ausentes.", status: 401 };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Grade padrão diária (Segunda a Domingo, 08:00 às 22:00 -> duração 840 minutos) caso não fornecida
  const diasSemana: Array<IFoodShiftItem["dayOfWeek"]> = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];

  const defaultShifts: IFoodShiftItem[] = diasSemana.map((day) => ({
    dayOfWeek: day,
    start: "08:00:00",
    duration: 840,
    salesChannel: "IFOOD",
    status: "AVAILABLE",
  }));

  const payload = shiftsCustom && shiftsCustom.length > 0 ? shiftsCustom : defaultShifts;

  try {
    console.log(`[iFood Merchant Shifts] Sincronizando ${payload.length} turnos para loja ${merchantId}...`);

    let res = await fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/shifts`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401 && estData.refreshToken) {
      accessToken = await renovarAccessTokenIFood(estData.id, estData.refreshToken);
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(merchantId)}/shifts`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok && res.status !== 200 && res.status !== 201 && res.status !== 204) {
      const errTxt = await res.text();
      return {
        success: false,
        error: `Falha ao sincronizar horários (HTTP ${res.status}): ${errTxt}`,
        status: res.status,
      };
    }

    return {
      success: true,
      message: "Grade de horários sincronizada com sucesso no iFood!",
      status: 200,
    };
  } catch (err: any) {
    console.error("[sincronizarHorariosLojaIFood Exception]", err);
    return {
      success: false,
      error: err.message || "Erro ao conectar com API de horários do iFood.",
      status: 500,
    };
  }
}
