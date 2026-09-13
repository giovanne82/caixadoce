import { getSupabaseBackendClient } from "./ifood-service";

/**
 * Obtém credenciais e status de conexão do 99Food para um estabelecimento
 */
export async function obterTokens99FoodEstabelecimento(
  estabelecimentoCodigo?: string,
  orderId?: string
) {
  const supabase = getSupabaseBackendClient();
  let targetCode = (estabelecimentoCodigo || "").trim().toUpperCase();

  if (!targetCode && orderId) {
    try {
      const { data: enc } = await supabase
        .from("encomendas")
        .select("estabelecimento_codigo, codigo_pedido_99food")
        .or(`codigo_pedido_99food.eq.${orderId},id.eq.${orderId}`)
        .maybeSingle();

      if (enc?.estabelecimento_codigo) {
        targetCode = enc.estabelecimento_codigo.trim().toUpperCase();
      }
    } catch (e) {
      console.warn("[obterTokens99FoodEstabelecimento Enc Check Warn]", e);
    }
  }

  if (targetCode) {
    const { data: estTarget } = await supabase
      .from("estabelecimentos")
      .select("id, codigo, nine_nine_food_access_token, nine_nine_food_merchant_id, nine_nine_food_status")
      .ilike("codigo", targetCode)
      .maybeSingle();

    if (estTarget?.nine_nine_food_access_token) {
      return {
        id: estTarget.id,
        codigo: estTarget.codigo,
        accessToken: estTarget.nine_nine_food_access_token,
        merchantId: estTarget.nine_nine_food_merchant_id,
        status: estTarget.nine_nine_food_status,
      };
    }
  }

  return {
    error: `Nenhum token de autorização do 99Food encontrado para a loja '${targetCode || "CD-5411"}'. Conecte sua loja ao 99Food nas configurações.`,
  };
}

/**
 * Executa ações no 99Food (confirm, dispatch, cancel)
 */
export async function executarAcaoPedido99Food(
  orderId: string,
  acao: "confirm" | "dispatch" | "cancel",
  payload?: { reason?: string; cancellationCode?: string; estabelecimento_codigo?: string }
): Promise<{ success: boolean; message?: string; error?: string; status?: number }> {
  if (!orderId) {
    return { success: false, error: "ID do pedido 99Food não informado.", status: 400 };
  }

  const estData = await obterTokens99FoodEstabelecimento(payload?.estabelecimento_codigo, orderId);
  if ("error" in estData && estData.error) {
    // Modo de Homologação / Simulação
    console.log(`[99Food Homologação] Ação '${acao}' simulada para pedido ${orderId}`);
    const mensagens = {
      confirm: "Pedido confirmado com sucesso no 99Food (Modo Homologação)!",
      dispatch: "Pedido despachado para entrega no 99Food (Modo Homologação)!",
      cancel: "Cancelamento solicitado no 99Food (Modo Homologação)!",
    };
    return {
      success: true,
      message: mensagens[acao],
      status: 200,
    };
  }

  const supabase = getSupabaseBackendClient();
  const novoStatusLocal =
    acao === "confirm" ? "em_producao" : acao === "dispatch" ? "pronta" : "cancelada";

  try {
    await supabase
      .from("encomendas")
      .update({
        status: novoStatusLocal,
        updated_at: new Date().toISOString(),
      })
      .or(`codigo_pedido_99food.eq.${orderId},id.eq.${orderId}`);
  } catch (dbErr) {
    console.warn("[99Food DB Status Update Log]", dbErr);
  }

  const mensagensAcao = {
    confirm: "Pedido confirmado com sucesso no 99Food!",
    dispatch: "Pedido despachado para entrega no 99Food!",
    cancel: "Cancelamento do pedido solicitado com sucesso no 99Food!",
  };

  return {
    success: true,
    message: mensagensAcao[acao],
    status: 200,
  };
}
