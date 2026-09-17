import { supabase } from "@/integrations/supabase/client";
import { type DetalhesPersonalizacaoOrcamento } from "@/lib/caixadoce-data";

export interface CriarOrcamentoPersonalizadoInput {
  estabelecimentoCodigo: string;
  storeUserId?: string | null;
  clienteNome: string;
  clienteWhatsapp: string;
  dataEntrega: string;
  horarioEntrega?: string;
  tipoEntrega: "retirada" | "delivery";
  enderecoEntrega?: string;
  detalhesPersonalizacao: DetalhesPersonalizacaoOrcamento;
}

/**
 * Faz o upload da foto de inspiração/referência para o bucket 'orcamentos-anexos' no Supabase Storage
 */
export async function uploadFotoInspiracaoOrcamento(
  file: File,
  estabelecimentoCodigo: string
): Promise<{ publicUrl: string | null; path: string | null; error: string | null }> {
  try {
    if (!file) {
      return { publicUrl: null, path: null, error: "Nenhum arquivo selecionado" };
    }

    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return {
        publicUrl: null,
        path: null,
        error: `A imagem excede o tamanho máximo de ${MAX_SIZE_MB}MB. Por favor, envie uma foto menor.`,
      };
    }

    const cleanCode = (estabelecimentoCodigo || "geral").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ext = file.name.split(".").pop() || "jpg";
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filePath = `referencias/${cleanCode}/${uniqueId}_${cleanFileName}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("orcamentos-anexos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[Upload Foto Inspiração] Erro no bucket 'orcamentos-anexos':", uploadError.message);
      return {
        publicUrl: null,
        path: null,
        error: `Falha no upload da foto: ${uploadError.message}. Verifique se o bucket 'orcamentos-anexos' está criado no Supabase.`,
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("orcamentos-anexos").getPublicUrl(uploadData.path);

    return {
      publicUrl: publicUrl || null,
      path: uploadData.path,
      error: null,
    };
  } catch (err: any) {
    console.error("[Upload Foto Inspiração] Exceção:", err);
    return {
      publicUrl: null,
      path: null,
      error: err?.message || "Erro inesperado ao enviar a foto de inspiração.",
    };
  }
}

/**
 * Cria o registro estruturado de orçamento personalizado na tabela 'encomendas'
 */
export async function salvarOrcamentoPersonalizado(input: CriarOrcamentoPersonalizadoInput): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> {
  try {
    const {
      estabelecimentoCodigo,
      storeUserId,
      clienteNome,
      clienteWhatsapp,
      dataEntrega,
      horarioEntrega = "15:00",
      tipoEntrega,
      enderecoEntrega = "",
      detalhesPersonalizacao,
    } = input;

    const orderId = crypto.randomUUID();

    const tipoLabel =
      detalhesPersonalizacao.tipo_pedido === "bolo"
        ? "🎂 Bolo Personalizado"
        : detalhesPersonalizacao.tipo_pedido === "doces"
        ? "🧁 Doces Finos / Festa"
        : "🎂🧁 Bolo + Doces Personalizados";

    const resumoItens = `${tipoLabel} (${detalhesPersonalizacao.rendimento_quantidade || "Sob medida"}) - Tema: ${
      detalhesPersonalizacao.tema_festa || "Personalizado"
    }`;

    let obsConsolidada = `[ORÇAMENTO PERSONALIZADO SOB MEDIDA]\n`;
    obsConsolidada += `• Tipo: ${tipoLabel}\n`;
    obsConsolidada += `• Rendimento/Qtd: ${detalhesPersonalizacao.rendimento_quantidade}\n`;
    obsConsolidada += `• Sabores/Recheios: ${detalhesPersonalizacao.sabores_recheios}\n`;
    if (detalhesPersonalizacao.tema_festa) obsConsolidada += `• Tema: ${detalhesPersonalizacao.tema_festa}\n`;
    if (detalhesPersonalizacao.paleta_cores) obsConsolidada += `• Paleta de Cores: ${detalhesPersonalizacao.paleta_cores}\n`;
    if (detalhesPersonalizacao.decoracao_desejada) obsConsolidada += `• Decoração: ${detalhesPersonalizacao.decoracao_desejada}\n`;

    const extrasAtivos: string[] = [];
    if (detalhesPersonalizacao.extras?.topo_bolo) extrasAtivos.push("Topo de Bolo");
    if (detalhesPersonalizacao.extras?.velas) extrasAtivos.push("Vela Especial");
    if (detalhesPersonalizacao.extras?.embalagem_presente) extrasAtivos.push("Embalagem Presente");
    if (extrasAtivos.length > 0) obsConsolidada += `• Extras: ${extrasAtivos.join(", ")}\n`;
    if (detalhesPersonalizacao.observacoes) obsConsolidada += `• Observações: ${detalhesPersonalizacao.observacoes}\n`;
    if (detalhesPersonalizacao.foto_inspiracao_url) obsConsolidada += `• Foto Inspiração: ${detalhesPersonalizacao.foto_inspiracao_url}\n`;

    const payload: Record<string, any> = {
      id: orderId,
      estabelecimento_codigo: estabelecimentoCodigo,
      user_id: storeUserId || null,
      cliente_nome: clienteNome,
      cliente_whatsapp: clienteWhatsapp,
      data_entrega: dataEntrega,
      horario_entrega: horarioEntrega,
      tipo_entrega: tipoEntrega,
      endereco_entrega: tipoEntrega === "delivery" ? enderecoEntrega : "",
      taxa_entrega: 0,
      valor_total: 0,
      total_amount: 0,
      valor_entrada: 0,
      status: "pendente",
      status_pagamento: "orcamento",
      metodo_pagamento: "Orçamento",
      forma_pagamento: "Orçamento",
      origem_pagamento: "orcamento",
      origem: "cardapio_personalizado",
      is_orcamento: true,
      itens: resumoItens,
      itens_detalhes: [
        {
          nome: tipoLabel,
          quantidade: 1,
          rendimento: detalhesPersonalizacao.rendimento_quantidade,
          sabores: detalhesPersonalizacao.sabores_recheios,
          tema: detalhesPersonalizacao.tema_festa,
          foto_url: detalhesPersonalizacao.foto_inspiracao_url,
        },
      ],
      tem_topo_bolo: Boolean(detalhesPersonalizacao.extras?.topo_bolo),
      detalhes_topo_bolo: detalhesPersonalizacao.extras?.topo_bolo ? `Topo Tema: ${detalhesPersonalizacao.tema_festa || "Personalizado"}` : "",
      tem_vela: Boolean(detalhesPersonalizacao.extras?.velas),
      detalhes_vela: detalhesPersonalizacao.extras?.velas ? "Vela Especial Inclusa" : "",
      observacoes: obsConsolidada,
      detalhes_personalizacao: detalhesPersonalizacao,
      created_at: new Date().toISOString(),
    };

    let { error } = await supabase.from("encomendas").insert([payload]);

    if (error) {
      console.warn("[Salvar Orçamento] Erro com payload completo, tentando fallback:", error.message);
      const { detalhes_personalizacao: _dp, ...payloadFallback } = payload;
      const resFallback = await supabase.from("encomendas").insert([payloadFallback]);
      error = resFallback.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, orderId };
  } catch (err: any) {
    console.error("[Salvar Orçamento] Exceção:", err);
    return { success: false, error: err?.message || "Erro inesperado ao salvar orçamento." };
  }
}

/**
 * Gera o link formatado do WhatsApp para envio do orçamento
 */
export function gerarLinkWhatsAppOrcamentoPersonalizado(
  confeitariaWhatsapp: string,
  confeitariaNome: string,
  clienteNome: string,
  dataEntrega: string,
  horarioEntrega: string,
  tipoEntrega: string,
  enderecoEntrega: string,
  detalhes: DetalhesPersonalizacaoOrcamento
): string {
  const cleanPhone = (confeitariaWhatsapp || "").replace(/\D/g, "");
  const dataFmt = dataEntrega ? dataEntrega.split("-").reverse().join("/") : "A combinar";

  const tipoLabel =
    detalhes.tipo_pedido === "bolo"
      ? "🎂 Bolo Personalizado"
      : detalhes.tipo_pedido === "doces"
      ? "🧁 Doces Finos / Festa"
      : "🎂🧁 Bolo + Doces Personalizados";

  let texto = `*NOVA SOLICITAÇÃO DE ORÇAMENTO PERSONALIZADO* 📝✨\n`;
  texto += `Olá, *${confeitariaNome || "Confeitaria"}*! Montei meu pedido personalizado pelo seu cardápio:\n\n`;
  texto += `👤 *Cliente:* ${clienteNome}\n`;
  texto += `📅 *Data Desejada:* ${dataFmt} às ${horarioEntrega || "15:00"}\n`;
  texto += `📍 *Forma de Entrega:* ${tipoEntrega === "delivery" ? `Entrega em ${enderecoEntrega || "endereço a combinar"}` : "Retirada no Balcão"}\n\n`;

  texto += `*DETALHES DO PEDIDO:*\n`;
  texto += `🍰 *Item:* ${tipoLabel}\n`;
  texto += `👥 *Quantidade/Rendimento:* ${detalhes.rendimento_quantidade}\n`;
  texto += `🍫 *Sabores/Recheios:* ${detalhes.sabores_recheios}\n`;
  if (detalhes.tema_festa) texto += `🎈 *Tema da Festa:* ${detalhes.tema_festa}\n`;
  if (detalhes.paleta_cores) texto += `🎨 *Paleta de Cores:* ${detalhes.paleta_cores}\n`;
  if (detalhes.decoracao_desejada) texto += `✨ *Decoração:* ${detalhes.decoracao_desejada}\n`;

  const extras: string[] = [];
  if (detalhes.extras?.topo_bolo) extras.push("Topo de Bolo Personalizado");
  if (detalhes.extras?.velas) extras.push("Vela Especial");
  if (detalhes.extras?.embalagem_presente) extras.push("Embalagem Presente");
  if (extras.length > 0) texto += `🎁 *Extras:* ${extras.join(" + ")}\n`;

  if (detalhes.observacoes) texto += `💬 *Observações:* ${detalhes.observacoes}\n`;
  if (detalhes.foto_inspiracao_url) {
    texto += `\n📸 *Foto de Inspiração/Referência:* ${detalhes.foto_inspiracao_url}\n`;
  }

  texto += `\n_Poderia me passar o valor e disponibilidade para esta data? Muito obrigado(a)!_`;

  if (!cleanPhone) return "";

  const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(texto)}`;
}
