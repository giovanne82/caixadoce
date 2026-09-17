import { DeliveryIntegrationAdapter, DeliveryPlatform, NormalizedDeliveryOrder } from "./types";
import { IFoodAdapter } from "./ifoodAdapter";
import { getSupabaseBackendClient } from "@/lib/ifood-service";

export * from "./types";
export * from "./ifoodAdapter";

// Instância Singleton do Adapter do iFood
const ifoodAdapterInstance = new IFoodAdapter();

/**
 * Factory para obter o adapter correto por plataforma
 */
export function getDeliveryAdapter(platform: DeliveryPlatform): DeliveryIntegrationAdapter {
  switch (platform) {
    case "ifood":
      return ifoodAdapterInstance;
    default:
      throw new Error(`Plataforma de delivery não suportada: ${platform}`);
  }
}

/**
 * Processa um pedido normalizado de qualquer adapter e salva na tabela 'encomendas' do Supabase
 */
export async function saveNormalizedOrderToEncomendas(
  order: NormalizedDeliveryOrder,
  estabelecimentoCodigo: string,
  estabelecimentoId?: string | null,
  userId?: string | null
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const adapter = getDeliveryAdapter(order.platform);
    const payload = adapter.toEncomendaPayload(
      order,
      estabelecimentoCodigo,
      estabelecimentoId,
      userId
    );

    const supabase = getSupabaseBackendClient();

    // 1. Evita duplicidade pelo ID do pedido da plataforma
    const idColumn = "codigo_pedido_ifood";
    const { data: existing } = await supabase
      .from("encomendas")
      .select("id, estabelecimento_codigo")
      .eq(idColumn, order.orderId)
      .maybeSingle();

    if (existing?.id) {
      console.log(`[Adapter Save] Pedido ${order.platform} #${order.orderId} já existe (${existing.id}). Atualizando...`);
      const { data: updated, error: updateErr } = await supabase
        .from("encomendas")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return { success: true, data: updated };
    }

    // 2. Insere novo pedido
    const { data: inserted, error: insertErr } = await supabase
      .from("encomendas")
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;
    console.log(`[Adapter Save] Pedido ${order.platform} #${order.orderId} inserido com sucesso para loja ${estabelecimentoCodigo}`);
    return { success: true, data: inserted };
  } catch (err: any) {
    console.error(`[Adapter Save Exception ${order.platform}]`, err);
    return { success: false, error: err.message || "Erro ao salvar pedido de delivery no banco." };
  }
}
