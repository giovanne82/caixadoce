import {
  DeliveryIntegrationAdapter,
  NormalizedDeliveryOrder,
  NormalizedDeliveryItem,
  DeliveryOrderActionResult,
} from "./types";
import { executarAcaoPedido99Food } from "@/lib/nine-nine-food-service";

/**
 * Adapter dedicado para integração de Webhooks, APIs e Pedidos do 99Food.
 * Mantém isolamento total de regras e tradução de campos.
 */
export class NineNineFoodAdapter implements DeliveryIntegrationAdapter {
  readonly platform = "99food" as const;
  readonly name = "99Food Delivery";

  parseWebhook(body: any): NormalizedDeliveryOrder[] {
    let parsedBody = body;
    if (typeof parsedBody === "string") {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        parsedBody = [];
      }
    }

    const events = Array.isArray(parsedBody)
      ? parsedBody
      : parsedBody?.events || (parsedBody ? [parsedBody] : []);
    const orders: NormalizedDeliveryOrder[] = [];

    for (const event of events) {
      if (!event || typeof event !== "object") continue;

      // 99Food usa campos como 'event_type', 'type' ou 'action'
      const eventType = String(
        event.event_type || event.type || event.action || event.code || ""
      ).toUpperCase();

      if (
        eventType === "PING" ||
        eventType === "HEARTBEAT" ||
        eventType === "TEST" ||
        eventType === "STATUS_CHECK"
      ) {
        continue;
      }

      // Eventos de criação de pedido: 'ORDER_CREATED', 'NEW_ORDER', 'ORDER_PLACED', 'PLC'
      if (
        eventType === "ORDER_CREATED" ||
        eventType === "NEW_ORDER" ||
        eventType === "ORDER_PLACED" ||
        eventType === "PLC" ||
        event.order_id ||
        event.order
      ) {
        const orderData = event.order || event.data || event.payload || event;
        const merchantId = String(
          event.shop_id || event.merchant_id || event.store_id || orderData.shop_id || ""
        ).trim();

        const orderId = String(
          event.order_id || orderData.order_id || orderData.id || ""
        ).trim();

        if (orderId) {
          orders.push(this.normalizeOrder({ ...orderData, id: orderId }, merchantId));
        }
      }
    }

    return orders;
  }

  normalizeOrder(rawOrder: any, merchantId?: string): NormalizedDeliveryOrder {
    const orderId = String(
      rawOrder.id || rawOrder.order_id || rawOrder.orderId || ""
    ).trim();

    const displayId = String(
      rawOrder.display_id ||
        rawOrder.order_seq ||
        rawOrder.short_id ||
        orderId.slice(-4)
    );

    // Normalização dos itens no formato 99Food
    const rawItems: any[] =
      (Array.isArray(rawOrder.items) && rawOrder.items) ||
      (Array.isArray(rawOrder.products) && rawOrder.products) ||
      (Array.isArray(rawOrder.food_list) && rawOrder.food_list) ||
      [];

    const items: NormalizedDeliveryItem[] = rawItems.map((it: any, idx: number) => {
      const quantity = Number(it.quantity || it.count || it.amount || 1);
      const unitPrice = Number(it.price || it.unit_price || it.item_price || 0) / (it.price > 1000 ? 100 : 1); // 99Food pode enviar em centavos
      const totalPrice = Number(it.total_price || unitPrice * quantity);

      const subItems = Array.isArray(it.modifiers || it.options || it.specs)
        ? (it.modifiers || it.options || it.specs).map((opt: any) => ({
            name: String(opt.name || opt.spec_name || "Adicional").trim(),
            quantity: Number(opt.quantity || 1),
            price: Number(opt.price || 0) / (opt.price > 1000 ? 100 : 1),
          }))
        : undefined;

      return {
        id: String(it.id || it.item_id || it.sku_id || `99_item_${idx}`),
        name: String(it.name || it.item_name || `Item 99Food #${idx + 1}`).trim(),
        quantity,
        unitPrice,
        totalPrice,
        notes: it.remark || it.note || it.observacoes || undefined,
        subItems,
      };
    });

    // Valores
    let totalAmount = 0;
    if (typeof rawOrder.total_amount === "number") {
      totalAmount = rawOrder.total_amount > 1000 ? rawOrder.total_amount / 100 : rawOrder.total_amount;
    } else if (typeof rawOrder.pay_amount === "number") {
      totalAmount = rawOrder.pay_amount > 1000 ? rawOrder.pay_amount / 100 : rawOrder.pay_amount;
    } else if (typeof rawOrder.order_amount === "number") {
      totalAmount = rawOrder.order_amount > 1000 ? rawOrder.order_amount / 100 : rawOrder.order_amount;
    } else if (typeof rawOrder.valor_total === "number") {
      totalAmount = rawOrder.valor_total;
    } else {
      totalAmount = items.reduce((acc, it) => acc + (it.totalPrice || it.unitPrice * it.quantity), 0);
    }

    const deliveryFee = Number(
      rawOrder.delivery_fee || rawOrder.shipping_fee || rawOrder.freight || 0
    );
    const discount = Number(rawOrder.discount_fee || rawOrder.discount || 0);

    // Cliente
    const customerObj = rawOrder.customer || rawOrder.user || rawOrder.buyer || {};
    const customerName = String(
      customerObj.name ||
        customerObj.user_name ||
        rawOrder.receiver_name ||
        rawOrder.client_name ||
        "Cliente 99Food"
    ).trim();

    const customerPhone = String(
      customerObj.phone ||
        customerObj.telephone ||
        rawOrder.receiver_phone ||
        rawOrder.cliente_whatsapp ||
        ""
    ).trim();

    // Endereço de entrega
    const addrObj = rawOrder.delivery_address || rawOrder.address || rawOrder.receiver_address;
    let address = undefined;
    if (addrObj) {
      address = {
        street: addrObj.street || addrObj.address_line1 || addrObj.rua,
        number: addrObj.number || addrObj.house_number || addrObj.numero,
        complement: addrObj.complement || addrObj.building || addrObj.complemento,
        neighborhood: addrObj.neighborhood || addrObj.district || addrObj.bairro,
        city: addrObj.city || addrObj.cidade,
        state: addrObj.state || addrObj.province || addrObj.uf,
        postalCode: addrObj.zip_code || addrObj.postal_code || addrObj.cep,
        formattedAddress:
          addrObj.formatted_address ||
          addrObj.full_address ||
          (typeof addrObj === "string" ? addrObj : undefined),
        reference: addrObj.landmark || addrObj.reference,
      };
    }

    // Pagamentos
    const paymentType = String(rawOrder.pay_type || rawOrder.payment_method || "99Pay / Online");
    const isPrepaid = Boolean(
      rawOrder.is_prepaid ??
        (paymentType.toLowerCase().includes("online") ||
          paymentType.toLowerCase().includes("99pay") ||
          paymentType.toLowerCase().includes("pix"))
    );

    const payments = [
      {
        method: paymentType,
        type: isPrepaid ? "ONLINE" : "OFFLINE",
        isPrepaid,
        value: totalAmount,
      },
    ];

    return {
      platform: "99food",
      orderId,
      displayId,
      merchantId: merchantId || String(rawOrder.shop_id || rawOrder.store_id || ""),
      status: "placed",
      createdAt: rawOrder.create_time || rawOrder.created_at || new Date().toISOString(),
      scheduledTo: rawOrder.expected_delivery_time || rawOrder.scheduled_time,
      customer: {
        name: customerName,
        phone: customerPhone,
        document: customerObj.cpf || customerObj.document,
      },
      address,
      items,
      totalAmount,
      deliveryFee,
      discount,
      payments,
      rawPayload: rawOrder,
    };
  }

  toEncomendaPayload(
    order: NormalizedDeliveryOrder,
    estabelecimentoCodigo: string,
    estabelecimentoId?: string | null,
    userId?: string | null
  ): Record<string, any> {
    const itensNomes = order.items.map(
      (it) => `${it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name}`
    );

    const itensDetalhes = order.items.map((it, idx) => ({
      id: it.id || `item_99_${idx}`,
      nome: it.name,
      quantidade: it.quantity,
      precoUnitario: it.unitPrice,
      total: it.totalPrice || it.unitPrice * it.quantity,
      observacoes: it.notes,
    }));

    const dataEntrega = order.scheduledTo
      ? order.scheduledTo.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const horarioEntrega =
      order.scheduledTo && order.scheduledTo.includes("T")
        ? order.scheduledTo.split("T")[1]?.slice(0, 5)
        : "14:00";

    const payload: Record<string, any> = {
      origem: "99Food",
      codigo_pedido_99food: order.orderId,
      dados_brutos: order.rawPayload,
      status: "pendente",
      estabelecimento_codigo: estabelecimentoCodigo,
      codigo: estabelecimentoCodigo,
      store_id: estabelecimentoCodigo,
      client_name: order.customer.name,
      cliente_nome: order.customer.name,
      customer_name: order.customer.name,
      itens: itensNomes.join(", ") || `Pedido 99Food #${order.displayId || order.orderId}`,
      itens_detalhes: itensDetalhes,
      valor_total: order.totalAmount,
      total_price: order.totalAmount,
      total_amount: order.totalAmount,
      status_pagamento: order.payments.some((p) => p.isPrepaid) ? "pago_integral" : "pendente",
      metodo_pagamento: order.payments[0]?.method || "99Pay",
      forma_pagamento: order.payments[0]?.method || "99Food",
      origem_pagamento: "99food",
      data_entrega: dataEntrega,
      horario_entrega: horarioEntrega,
    };

    if (order.customer.phone) {
      payload.cliente_whatsapp = order.customer.phone;
    }
    if (estabelecimentoId) {
      payload.estabelecimento_id = estabelecimentoId;
    }
    if (userId) {
      payload.user_id = userId;
    }
    if (order.address?.formattedAddress) {
      payload.endereco_entrega = order.address.formattedAddress;
    }

    return payload;
  }

  async executeOrderAction(
    orderId: string,
    action: "confirm" | "dispatch" | "cancel",
    options?: {
      reason?: string;
      cancellationCode?: string;
      estabelecimentoCodigo?: string;
    }
  ): Promise<DeliveryOrderActionResult> {
    return executarAcaoPedido99Food(orderId, action, {
      reason: options?.reason,
      cancellationCode: options?.cancellationCode,
      estabelecimento_codigo: options?.estabelecimentoCodigo,
    });
  }
}
