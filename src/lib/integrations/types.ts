export type DeliveryPlatform = "ifood";

export type DeliveryOrderStatus =
  | "placed"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled";

export interface NormalizedDeliveryItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  notes?: string;
  subItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface NormalizedDeliveryCustomer {
  name: string;
  phone?: string;
  document?: string;
}

export interface NormalizedDeliveryAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  formattedAddress?: string;
  reference?: string;
}

export interface NormalizedDeliveryPayment {
  method: string;
  type?: string;
  isPrepaid: boolean;
  value: number;
  changeFor?: number;
}

export interface NormalizedDeliveryOrder {
  platform: DeliveryPlatform;
  orderId: string;
  displayId?: string;
  merchantId?: string;
  status: DeliveryOrderStatus;
  createdAt: string;
  scheduledTo?: string;
  customer: NormalizedDeliveryCustomer;
  address?: NormalizedDeliveryAddress;
  items: NormalizedDeliveryItem[];
  totalAmount: number;
  deliveryFee?: number;
  discount?: number;
  payments: NormalizedDeliveryPayment[];
  rawPayload: any;
}

export interface DeliveryOrderActionResult {
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
}

/**
 * Interface base para o padrão Adapter de Plataformas de Delivery (iFood)
 */
export interface DeliveryIntegrationAdapter {
  readonly platform: DeliveryPlatform;
  readonly name: string;

  /**
   * Converte o payload bruto do webhook ou evento da plataforma em pedidos normalizados
   */
  parseWebhook(body: any): NormalizedDeliveryOrder[];

  /**
   * Normaliza um objeto de pedido bruto recebido da API da plataforma
   */
  normalizeOrder(rawOrder: any, merchantId?: string): NormalizedDeliveryOrder;

  /**
   * Converte o pedido normalizado no schema de inserção da tabela 'encomendas' do CaixaDoce
   */
  toEncomendaPayload(
    order: NormalizedDeliveryOrder,
    estabelecimentoCodigo: string,
    estabelecimentoId?: string | null,
    userId?: string | null
  ): Record<string, any>;

  /**
   * Executa ações de ciclo de vida do pedido na plataforma (confirmar, despachar, cancelar)
   */
  executeOrderAction(
    orderId: string,
    action: "confirm" | "dispatch" | "cancel",
    options?: {
      reason?: string;
      cancellationCode?: string;
      estabelecimentoCodigo?: string;
    }
  ): Promise<DeliveryOrderActionResult>;
}
