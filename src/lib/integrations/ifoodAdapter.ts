import {
  DeliveryIntegrationAdapter,
  NormalizedDeliveryOrder,
  NormalizedDeliveryItem,
  DeliveryOrderActionResult,
} from "./types";
import { executarAcaoPedidoIFood } from "@/lib/ifood-service";

export class IFoodAdapter implements DeliveryIntegrationAdapter {
  readonly platform = "ifood" as const;
  readonly name = "iFood Delivery";

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
      : parsedBody
      ? [parsedBody]
      : [];
    const orders: NormalizedDeliveryOrder[] = [];

    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const code = String(event.code || event.type || "").toUpperCase();

      // Ignora eventos que não são de criação/colocação de pedido
      if (
        code === "HEARTBEAT" ||
        code === "STATUS" ||
        code === "TEST" ||
        code === "KTM" ||
        code === "KEEP_ALIVE" ||
        code === "INFO"
      ) {
        continue;
      }

      if (code === "PLC" || code === "PLACED" || code === "ORDER_PLACED") {
        const orderData = event.order || event.data || event.details || event;
        const merchantId = String(event.merchantId || event.merchant?.id || "").trim();
        const orderId = String(
          event.correlationId || event.orderId || event.id || orderData.id || ""
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
      rawOrder.id || rawOrder.orderId || rawOrder.correlationId || ""
    ).trim();
    const displayId = String(rawOrder.displayId || rawOrder.shortReference || orderId.slice(-4));

    // Normalização de Itens
    const rawItems: any[] =
      (Array.isArray(rawOrder.items) && rawOrder.items) ||
      (Array.isArray(rawOrder.order?.items) && rawOrder.order.items) ||
      (Array.isArray(rawOrder.itens) && rawOrder.itens) ||
      [];

    const items: NormalizedDeliveryItem[] = rawItems.map((it: any, idx: number) => {
      const quantity = Number(it.quantity || it.qtd || 1);
      const unitPrice = Number(it.unitPrice || it.price || 0);
      const totalPrice = Number(it.totalPrice || unitPrice * quantity || 0);

      const subItems = Array.isArray(it.options || it.subItems || it.complements)
        ? (it.options || it.subItems || it.complements).map((opt: any) => ({
            name: String(opt.name || opt.nome || "Opção").trim(),
            quantity: Number(opt.quantity || 1),
            price: Number(opt.price || opt.unitPrice || 0),
          }))
        : undefined;

      return {
        id: String(it.id || `ifood_item_${idx}`),
        name: String(it.name || it.nome || `Item #${idx + 1}`).trim(),
        quantity,
        unitPrice,
        totalPrice,
        notes: it.observations || it.notes || it.observacoes || undefined,
        subItems,
      };
    });

    // Valores
    let totalAmount = 0;
    if (typeof rawOrder.total?.orderAmount === "number" && rawOrder.total.orderAmount > 0) {
      totalAmount = rawOrder.total.orderAmount;
    } else if (typeof rawOrder.orderAmount === "number" && rawOrder.orderAmount > 0) {
      totalAmount = rawOrder.orderAmount;
    } else if (
      typeof rawOrder.payments?.total?.value === "number" &&
      rawOrder.payments.total.value > 0
    ) {
      totalAmount = rawOrder.payments.total.value;
    } else if (typeof rawOrder.payments?.total === "number" && rawOrder.payments.total > 0) {
      totalAmount = rawOrder.payments.total;
    } else if (typeof rawOrder.valor_total === "number" && rawOrder.valor_total > 0) {
      totalAmount = rawOrder.valor_total;
    } else {
      totalAmount = items.reduce((acc, it) => acc + (it.totalPrice || it.unitPrice * it.quantity), 0);
    }

    const deliveryFee = Number(
      rawOrder.total?.deliveryFee || rawOrder.deliveryFee || rawOrder.taxaEntrega || 0
    );
    const discount = Number(
      rawOrder.total?.benefits || rawOrder.discount || rawOrder.desconto || 0
    );

    // Cliente
    const customerObj = rawOrder.customer || rawOrder.order?.customer || {};
    const customerName = String(
      customerObj.name || rawOrder.client_name || rawOrder.cliente_nome || "Cliente iFood"
    ).trim();
    const customerPhone = String(
      customerObj.phone?.number || customerObj.phone || rawOrder.cliente_whatsapp || ""
    ).trim();
    const customerDocument = customerObj.documentNumber || customerObj.taxPayerIdentificationNumber;

    // Endereço
    const addrObj =
      rawOrder.delivery?.deliveryAddress || rawOrder.deliveryAddress || rawOrder.endereco;
    let address = undefined;
    if (addrObj) {
      address = {
        street: addrObj.streetName || addrObj.street || addrObj.logradouro,
        number: addrObj.streetNumber || addrObj.number || addrObj.numero,
        complement: addrObj.complement || addrObj.complemento,
        neighborhood: addrObj.neighborhood || addrObj.bairro,
        city: addrObj.city || addrObj.cidade,
        state: addrObj.state || addrObj.estado || addrObj.uf,
        postalCode: addrObj.postalCode || addrObj.cep,
        formattedAddress: addrObj.formattedAddress || addrObj.enderecoCompleto,
        reference: addrObj.reference || addrObj.pontoReferencia,
      };
    }

    // Pagamentos
    const paymentsMethods = Array.isArray(rawOrder.payments?.methods)
      ? rawOrder.payments.methods
      : Array.isArray(rawOrder.payments)
      ? rawOrder.payments
      : [];

    const payments = paymentsMethods.map((p: any) => ({
      method: String(p.method || p.type || p.code || "iFood Pay"),
      type: p.type || (p.prepaid ? "ONLINE" : "OFFLINE"),
      isPrepaid: Boolean(p.prepaid ?? true),
      value: Number(p.value || totalAmount),
      changeFor: p.changeFor ? Number(p.changeFor) : undefined,
    }));

    return {
      platform: "ifood",
      orderId,
      displayId,
      merchantId: merchantId || String(rawOrder.merchantId || rawOrder.merchant?.id || ""),
      status: "placed",
      createdAt: rawOrder.createdAt || new Date().toISOString(),
      scheduledTo: rawOrder.delivery?.deliveryDateTime || rawOrder.schedule?.deliveryDateTime,
      customer: {
        name: customerName,
        phone: customerPhone,
        document: customerDocument,
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
      id: it.id || `item_${idx}`,
      nome: it.name,
      quantidade: it.quantity,
      precoUnitario: it.unitPrice,
      total: it.totalPrice || it.unitPrice * it.quantity,
      observacoes: it.notes,
    }));

    const dataEntrega = order.scheduledTo
      ? order.scheduledTo.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const horarioEntrega = order.scheduledTo && order.scheduledTo.includes("T")
      ? order.scheduledTo.split("T")[1]?.slice(0, 5)
      : "14:00";

    const payload: Record<string, any> = {
      origem: "iFood",
      codigo_pedido_ifood: order.orderId,
      dados_brutos: order.rawPayload,
      status: "pendente",
      estabelecimento_codigo: estabelecimentoCodigo,
      codigo: estabelecimentoCodigo,
      store_id: estabelecimentoCodigo,
      client_name: order.customer.name,
      cliente_nome: order.customer.name,
      customer_name: order.customer.name,
      itens: itensNomes.join(", ") || `Pedido iFood #${order.displayId || order.orderId}`,
      itens_detalhes: itensDetalhes,
      valor_total: order.totalAmount,
      total_price: order.totalAmount,
      total_amount: order.totalAmount,
      status_pagamento: order.payments.some((p) => p.isPrepaid) ? "pago_integral" : "pendente",
      metodo_pagamento: order.payments[0]?.method || "iFood Pay",
      forma_pagamento: order.payments[0]?.method || "iFood",
      origem_pagamento: "ifood",
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
    return executarAcaoPedidoIFood(orderId, action, {
      reason: options?.reason,
      cancellationCode: options?.cancellationCode,
      estabelecimento_codigo: options?.estabelecimentoCodigo,
    });
  }
}
