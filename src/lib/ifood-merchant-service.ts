import {
  obterTokensIFoodEstabelecimento,
  renovarAccessTokenIFood,
  obterTokenAppIFood,
  getSupabaseBackendClient,
} from "./ifood-service";

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
 * Resolve credenciais ativas do iFood (token e merchantId) com múltiplas camadas de fallback
 */
async function resolverCredenciaisIFood(
  estabelecimentoCodigo?: string,
  env?: any
): Promise<{
  estId: string;
  accessToken: string | null;
  refreshToken: string | null;
  merchantId: string | null;
  error?: string;
}> {
  const estData = await obterTokensIFoodEstabelecimento(estabelecimentoCodigo, undefined, env);
  const estId = ("id" in estData ? estData.id : null) || "";
  let accessToken = ("accessToken" in estData ? estData.accessToken : null) || null;
  const refreshToken = ("refreshToken" in estData ? estData.refreshToken : null) || null;
  let merchantId = ("merchantId" in estData ? estData.merchantId : null) || null;

  const envObj = (env as Record<string, string>) || {};
  const procObj = (typeof process !== "undefined" && process.env ? process.env : {}) as Record<string, string>;

  // 1. Se não tiver accessToken salvo, tenta renovar pelo refresh_token
  if (!accessToken && refreshToken && estId) {
    try {
      accessToken = await renovarAccessTokenIFood(estId, refreshToken, env);
    } catch (e) {
      console.warn("[resolverCredenciaisIFood Refresh Warning]", e);
    }
  }

  // 2. Se ainda não tiver accessToken, tenta obter via client_credentials da aplicação
  if (!accessToken) {
    try {
      accessToken = await obterTokenAppIFood(env);
      if (accessToken && estId) {
        const supabase = getSupabaseBackendClient();
        await supabase
          .from("estabelecimentos")
          .update({ ifood_access_token: accessToken, updated_at: new Date().toISOString() })
          .eq("id", estId);
      }
    } catch (e) {
      console.warn("[resolverCredenciaisIFood App Token Warning]", e);
    }
  }

  // 3. Resolução do merchantId
  if (!merchantId) {
    merchantId =
      envObj.IFOOD_MERCHANT_ID ||
      procObj.IFOOD_MERCHANT_ID ||
      envObj.VITE_IFOOD_MERCHANT_ID ||
      procObj.VITE_IFOOD_MERCHANT_ID ||
      null;
  }

  // 4. Descoberta automática do merchantId na API do iFood se tivermos accessToken
  if (!merchantId && accessToken) {
    try {
      const mRes = await fetch("https://merchant-api.ifood.com.br/merchant/v1.0/merchants", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (mRes.ok) {
        const mList = await mRes.json();
        if (Array.isArray(mList) && mList.length > 0) {
          merchantId = mList[0].id || mList[0].merchantId || null;
          if (merchantId && estId) {
            const supabase = getSupabaseBackendClient();
            await supabase
              .from("estabelecimentos")
              .update({ ifood_merchant_id: merchantId, updated_at: new Date().toISOString() })
              .eq("id", estId);
          }
        }
      }
    } catch (mErr) {
      console.warn("[resolverCredenciaisIFood Merchant Discovery Warning]", mErr);
    }
  }

  return {
    estId,
    accessToken,
    refreshToken,
    merchantId,
  };
}

/**
 * Executa uma chamada à API do iFood com auto-refresh e fallback em caso de 401
 */
async function fetchComAutoRefresh(
  url: string,
  options: RequestInit,
  authInfo: { estId: string; accessToken: string; refreshToken: string | null },
  env?: any
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${authInfo.accessToken}`);
  headers.set("Accept", "application/json");

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    console.warn(`[iFood Auto-Refresh] Recebido 401 em ${url}. Tentando renovar credenciais...`);
    let novoToken: string | null = null;

    // Tentativa 1: Refresh Token
    if (authInfo.refreshToken && authInfo.estId) {
      try {
        novoToken = await renovarAccessTokenIFood(authInfo.estId, authInfo.refreshToken, env);
      } catch (rErr) {
        console.warn("[iFood Auto-Refresh Refresh Token Fail]", rErr);
      }
    }

    // Tentativa 2: Client Credentials App Token
    if (!novoToken) {
      try {
        novoToken = await obterTokenAppIFood(env);
        if (novoToken && authInfo.estId) {
          const supabase = getSupabaseBackendClient();
          await supabase
            .from("estabelecimentos")
            .update({ ifood_access_token: novoToken, updated_at: new Date().toISOString() })
            .eq("id", authInfo.estId);
        }
      } catch (cErr) {
        console.warn("[iFood Auto-Refresh App Token Fail]", cErr);
      }
    }

    if (novoToken) {
      headers.set("Authorization", `Bearer ${novoToken}`);
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}

/**
 * Consulta o status da loja (aberta/fechada/interrompida) na API do iFood
 */
export async function consultarStatusLojaIFood(
  estabelecimentoCodigo?: string,
  env?: any
): Promise<IFoodMerchantStatusResponse> {
  const auth = await resolverCredenciaisIFood(estabelecimentoCodigo, env);

  if (!auth.accessToken || !auth.merchantId) {
    return {
      success: true,
      isAvailable: false,
      state: "UNKNOWN",
      title: "Loja Não Conectada",
      subtitle: "Aguardando autorização no iFood",
      description: "Conecte sua loja ao iFood usando o botão 'Conectar Loja ao iFood' acima.",
      merchantId: auth.merchantId || undefined,
      status: 200,
    };
  }

  const ifoodUrl = `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/status`;

  try {
    const res = await fetchComAutoRefresh(
      ifoodUrl,
      { method: "GET" },
      { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
      env
    );

    if (!res.ok) {
      const errTxt = await res.text();
      console.warn(`[consultarStatusLojaIFood Warning] HTTP ${res.status}: ${errTxt}`);
      return {
        success: false,
        isAvailable: false,
        state: "UNKNOWN",
        merchantId: auth.merchantId,
        error: `iFood retornou status ${res.status}: ${errTxt}`,
        status: 200, // Retorna 200 para evitar quebra de UI no frontend
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
      merchantId: auth.merchantId,
      raw: data,
      status: 200,
    };
  } catch (err: any) {
    console.error("[consultarStatusLojaIFood Exception]", err);
    return {
      success: false,
      isAvailable: false,
      state: "UNKNOWN",
      merchantId: auth.merchantId,
      error: err.message || "Falha de conexão com a API do iFood.",
      status: 200,
    };
  }
}

/**
 * Altera o status da loja no iFood (Abrir / Fechar via Interrupções de Operação)
 */
export async function alterarStatusLojaIFood(
  estabelecimentoCodigo: string,
  statusAcao: "open" | "close",
  options?: { motivo?: string; duracaoMinutos?: number },
  env?: any
): Promise<{ success: boolean; message?: string; error?: string; status?: number }> {
  const auth = await resolverCredenciaisIFood(estabelecimentoCodigo, env);

  if (!auth.accessToken || !auth.merchantId) {
    return {
      success: false,
      error: "Loja sem credenciais ou merchantId do iFood configurados.",
      status: 400,
    };
  }

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

      console.log(`[iFood Merchant Close] Criando interrupção para loja ${auth.merchantId}:`, interruptionPayload);

      const res = await fetchComAutoRefresh(
        `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/interruptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(interruptionPayload),
        },
        { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
        env
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
      if (auth.estId) {
        const supabase = getSupabaseBackendClient();
        await supabase
          .from("estabelecimentos")
          .update({
            ifood_status: "conectado_fechado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", auth.estId);
      }

      return {
        success: true,
        message: "Loja fechada com sucesso no iFood!",
        status: 200,
      };
    } else {
      // 2. Para abrir a loja: busca todas as interrupções ativas e as remove
      console.log(`[iFood Merchant Open] Buscando interrupções ativas para a loja ${auth.merchantId}...`);

      const listRes = await fetchComAutoRefresh(
        `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/interruptions`,
        { method: "GET" },
        { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
        env
      );

      if (listRes.ok) {
        const interruptions = await listRes.json();
        if (Array.isArray(interruptions) && interruptions.length > 0) {
          console.log(`[iFood Merchant Open] Removendo ${interruptions.length} interrupção(ões)...`);
          for (const item of interruptions) {
            const intId = item.id || item.interruptionId;
            if (intId) {
              await fetchComAutoRefresh(
                `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/interruptions/${encodeURIComponent(intId)}`,
                { method: "DELETE" },
                { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
                env
              ).catch((delErr) => console.warn(`[iFood Delete Interruption ${intId} Log]`, delErr));
            }
          }
        }
      }

      // Atualiza o Supabase
      if (auth.estId) {
        const supabase = getSupabaseBackendClient();
        await supabase
          .from("estabelecimentos")
          .update({
            ifood_status: "conectado_aberto",
            updated_at: new Date().toISOString(),
          })
          .eq("id", auth.estId);
      }

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
  estabelecimentoCodigo?: string,
  env?: any
): Promise<{ success: boolean; shifts?: IFoodShiftItem[]; error?: string; status?: number }> {
  const auth = await resolverCredenciaisIFood(estabelecimentoCodigo, env);

  if (!auth.accessToken || !auth.merchantId) {
    return { success: false, error: "Credenciais do iFood ausentes.", status: 400 };
  }

  try {
    const res = await fetchComAutoRefresh(
      `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/shifts`,
      { method: "GET" },
      { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
      env
    );

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
  shiftsCustom?: IFoodShiftItem[],
  env?: any
): Promise<{ success: boolean; message?: string; error?: string; status?: number }> {
  const auth = await resolverCredenciaisIFood(estabelecimentoCodigo, env);

  if (!auth.accessToken || !auth.merchantId) {
    return { success: false, error: "Credenciais do iFood ausentes.", status: 400 };
  }

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
    console.log(`[iFood Merchant Shifts] Sincronizando ${payload.length} turnos para loja ${auth.merchantId}...`);

    const shiftsUrl = `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/shifts`;

    let res = await fetchComAutoRefresh(
      shiftsUrl,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
      env
    );

    // Fallback para rota opening-hours se a rota shifts devolver 404
    if (res.status === 404) {
      console.warn(`[iFood Merchant Shifts] Rota /shifts retornou 404. Tentando rota /opening-hours...`);
      const openingHoursUrl = `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${encodeURIComponent(auth.merchantId)}/opening-hours`;
      res = await fetchComAutoRefresh(
        openingHoursUrl,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        { estId: auth.estId, accessToken: auth.accessToken, refreshToken: auth.refreshToken },
        env
      );
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
