import { supabase } from "@/integrations/supabase/client";

export interface InsumoPadrao {
  id: string;
  nome: string;
  categoria:
    | "Chocolates & Coberturas"
    | "Lácteos & Recheios"
    | "Confeitos & Açúcares"
    | "Embalagens & Caixas"
    | "Aditivos & Corantes"
    | "Hortifrúti & Frutas"
    | "Outros Insumos";
  unidadeBase: "g" | "kg" | "ml" | "l" | "un" | "bdj" | "cx" | "pct";
  precoBaseSugerido: number;
  sinonimos?: string[];
}

export interface HistoricoCompraInsumo {
  id: string;
  estabelecimentoCodigo: string;
  insumoPadraoId?: string;
  nomeInsumo: string;
  categoria: string;
  fornecedorNome: string;
  dataCompra: string;
  quantidadeComprada: number;
  embalagemQtd: number; // ex: 25 se for fardo/caixa
  quantidadeTotalUnidades: number;
  valorPagoTotal: number;
  valorUnitarioCalculado: number;
  unidadeMedida: string; // "g", "kg", "un", "bdj", "ml", "cx"
  createdAt?: string;
}

export interface FichaTecnicaItem {
  id: string;
  estabelecimentoCodigo: string;
  produtoId: string;
  insumoNome: string;
  insumoPadraoId?: string;
  precoEmbalagem: number; // Preço pago pela embalagem/produto (ex: R$ 34,90)
  qtdEmbalagemOriginal: number; // Qtd da embalagem original de compra (ex: 1kg, 1000g)
  quantidadeUsada: number; // Qtd usada na receita (ex: 100g, 2 un, 250ml)
  unidadeMedida: "g" | "kg" | "ml" | "l" | "un" | "bdj" | "pct" | "cx" | string; // Unidade de Uso
  unidadeEmbalagem?: "g" | "kg" | "ml" | "l" | "un" | "bdj" | "pct" | "cx" | string; // Unidade de Compra
  precoUnitarioAplicado?: number; // Compatibilidade com precoEmbalagem
  custoTotalItem: number;
  createdAt?: string;
}

export interface CalculoFichaTecnicaResultado {
  custoInsumosTotal: number;
  custosOperacionaisPerc: number;
  custosOperacionaisValor: number;
  custoTotalReceita: number;
  rendimentoQuantidade: number;
  custoUnitarioItem: number;
  margemLucroPerc: number;
  precoVendaSugeridoUnitario: number;
  precoVendaSugeridoLote: number;
}

// Catálogo Mestre de Insumos Padrão de Confeitaria
export const INSUMOS_PADRAO_CATALOGO: InsumoPadrao[] = [
  // Chocolates Nobres
  { id: "ins-1", nome: "Chocolate Nobre Ao Leite Melken", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 58.90, sinonimos: ["melken ao leite", "chocolate melken", "choc nobre ao leite"] },
  { id: "ins-2", nome: "Chocolate Nobre Meio Amargo Melken", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 59.90, sinonimos: ["melken meio amargo", "choc nobre meio amargo"] },
  { id: "ins-3", nome: "Chocolate Nobre Branco Melken", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 64.90, sinonimos: ["melken branco", "choc nobre branco"] },
  { id: "ins-4", nome: "Chocolate Nobre Callebaut 811 54.5%", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 129.00, sinonimos: ["callebaut 811", "callebaut meio amargo"] },
  { id: "ins-5", nome: "Chocolate Nobre Sicao Ao Leite", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 49.90, sinonimos: ["sicao ao leite", "choc sicao"] },
  
  // Coberturas Fracionadas
  { id: "ins-6", nome: "Cobertura Fracionada Top Ao Leite Harald", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 34.90, sinonimos: ["harald top ao leite", "cobertura top ao leite", "fracionado top"] },
  { id: "ins-7", nome: "Cobertura Fracionada Top Meio Amargo Harald", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 34.90, sinonimos: ["harald top meio amargo", "cobertura top meio amargo"] },
  { id: "ins-8", nome: "Cobertura Fracionada Top Branco Harald", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 36.90, sinonimos: ["harald top branco", "cobertura top branco"] },
  { id: "ins-9", nome: "Cobertura Fracionada Mavalério Ao Leite", categoria: "Chocolates & Coberturas", unidadeBase: "kg", precoBaseSugerido: 32.90, sinonimos: ["mavalerio ao leite", "cobertura mavalerio"] },
  
  // Lácteos & Recheios
  { id: "ins-10", nome: "Leite Condensado Moça Nestlé 395g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 8.50, sinonimos: ["leite condensado moca", "l.c. moca"] },
  { id: "ins-11", nome: "Leite Condensado Piracanjuba 395g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 5.80, sinonimos: ["leite condensado piracanjuba", "l.c. piracanjuba"] },
  { id: "ins-12", nome: "Leite Condensado Itambé 395g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 5.60, sinonimos: ["leite condensado itambe"] },
  { id: "ins-13", nome: "Creme de Leite Nestlé 200g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 4.20, sinonimos: ["creme de leite moca", "creme de leite nestle"] },
  { id: "ins-14", nome: "Creme de Leite Italac 200g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 3.49, sinonimos: ["creme de leite italac"] },
  { id: "ins-15", nome: "Chantilly Norcau Chanty 1L", categoria: "Lácteos & Recheios", unidadeBase: "l", precoBaseSugerido: 18.90, sinonimos: ["norcau 1l", "chantilly norcau"] },
  { id: "ins-16", nome: "Chantilly Amélia Supreme 1L", categoria: "Lácteos & Recheios", unidadeBase: "l", precoBaseSugerido: 21.90, sinonimos: ["amelia supreme", "chantilly amelia"] },
  { id: "ins-17", nome: "Cream Cheese Philadelphia 300g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 19.90, sinonimos: ["philadelphia 300g", "cream cheese"] },
  { id: "ins-18", nome: "Manteiga Sem Sal Extra 200g", categoria: "Lácteos & Recheios", unidadeBase: "un", precoBaseSugerido: 11.50, sinonimos: ["manteiga extra", "manteiga sem sal"] },
  
  // Confeitos & Açúcares
  { id: "ins-19", nome: "Granulado Gourmet Melken Ao Leite 500g", categoria: "Confeitos & Açúcares", unidadeBase: "un", precoBaseSugerido: 28.90, sinonimos: ["granule melken", "granulado gourmet ao leite"] },
  { id: "ins-20", nome: "Granulado Crocante Mavalério 500g", categoria: "Confeitos & Açúcares", unidadeBase: "un", precoBaseSugerido: 9.90, sinonimos: ["granulado mavalerio", "granulado comum"] },
  { id: "ins-21", nome: "Açúcar Confeiteiro Impalpável Arcolor 1kg", categoria: "Confeitos & Açúcares", unidadeBase: "kg", precoBaseSugerido: 12.90, sinonimos: ["açucar impalpavel arcolor"] },
  { id: "ins-22", nome: "Açúcar Refinado União 1kg", categoria: "Confeitos & Açúcares", unidadeBase: "kg", precoBaseSugerido: 4.80, sinonimos: ["açucar uniao", "açucar refinado"] },
  { id: "ins-23", nome: "Farinha de Trigo Anatória 1kg", categoria: "Confeitos & Açúcares", unidadeBase: "kg", precoBaseSugerido: 4.50, sinonimos: ["farinha trigo anatoria"] },
  { id: "ins-24", nome: "Cacau em Pó 100% Melken 500g", categoria: "Confeitos & Açúcares", unidadeBase: "un", precoBaseSugerido: 24.90, sinonimos: ["cacau 100% melken", "cacau 100%"] },
  { id: "ins-25", nome: "Cacau em Pó 50% Two Cats / Harald 500g", categoria: "Confeitos & Açúcares", unidadeBase: "un", precoBaseSugerido: 16.90, sinonimos: ["cacau 50%", "chocolate em po 50%"] },

  // Embalagens & Caixas
  { id: "ins-26", nome: "Caixa para Bolo Alta 25x25x18cm (Unidade)", categoria: "Embalagens & Caixas", unidadeBase: "un", precoBaseSugerido: 6.50, sinonimos: ["caixa bolo alta 25x25x18", "caixa bolo 25cm alta"] },
  { id: "ins-27", nome: "Caixa para Salgados/Tortas Rasa 25x25x3cm (Unidade)", categoria: "Embalagens & Caixas", unidadeBase: "un", precoBaseSugerido: 3.20, sinonimos: ["caixa salgado rasa 25x25x3", "caixa torta rasa 25cm"] },
  { id: "ins-28", nome: "Cakeboard Mdf 25cm Redondo", categoria: "Embalagens & Caixas", unidadeBase: "un", precoBaseSugerido: 4.80, sinonimos: ["cakeboard 25cm", "prato mdf 25cm"] },
  { id: "ins-29", nome: "Forminha de Doce Nº 5 (Pacote c/ 100 un)", categoria: "Embalagens & Caixas", unidadeBase: "pct", precoBaseSugerido: 5.90, sinonimos: ["forminha n5", "forminha brigadeiro n5"] },
  { id: "ins-30", nome: "Caixa para Doces / Trufas c/ 12 Cavidades", categoria: "Embalagens & Caixas", unidadeBase: "un", precoBaseSugerido: 4.20, sinonimos: ["caixa trufa 12", "caixa brigadeiro 12"] },

  // Hortifrúti & Frutas
  { id: "ins-31", nome: "Morango (Bandeja 250g)", categoria: "Hortifrúti & Frutas", unidadeBase: "bdj", precoBaseSugerido: 8.50, sinonimos: ["morango bdj 250g", "morango fresca"] },
  { id: "ins-32", nome: "Uva Thompson Sem Semente (Bandeja 500g)", categoria: "Hortifrúti & Frutas", unidadeBase: "bdj", precoBaseSugerido: 11.90, sinonimos: ["uva thompson bdj", "uva sem semente"] },
  { id: "ins-33", nome: "Maracujá (Kg)", categoria: "Hortifrúti & Frutas", unidadeBase: "kg", precoBaseSugerido: 12.00, sinonimos: ["maracuja kg"] },

  // Aditivos & Corantes
  { id: "ins-34", nome: "Corante em Gel Vermelho Morango Softgel Mix 25g", categoria: "Aditivos & Corantes", unidadeBase: "un", precoBaseSugerido: 6.90, sinonimos: ["corante gel vermelho", "softgel mix vermelho"] },
  { id: "ins-35", nome: "Essência de Baunilha Branca Arcolor 30ml", categoria: "Aditivos & Corantes", unidadeBase: "un", precoBaseSugerido: 4.50, sinonimos: ["essencia baunilha branca"] },
];

/**
 * Busca o ÚLTIMO PREÇO COMPRADO de determinado insumo especificamente para aquele estabelecimento/usuário.
 * Se o item digitado/selecionado foi capturado em notas ou compras anteriores, o sistema sugere estritamente
 * o valor da última compra realizada. Se não houver histórico, retorna o preço base padrão.
 */
export async function calcularPrecoMedioInsumo(
  estabelecimentoCodigo: string,
  insumoNome: string,
  unidadeDesejada: string = "un"
): Promise<{ precoMedioUnitario: number; totalComprasRegistradas: number; deNotaFiscal: boolean }> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  const nomeLimpo = insumoNome.trim().toLowerCase();

  // Palavras-chave relevantes (desconsiderando numerais curtos e conectivos)
  const tokens = nomeLimpo
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !["com", "para", "sem", "das", "dos", "que"].includes(w));

  // 1. Busca no Supabase por compras do usuário ordenadas pela mais recente (created_at DESC)
  try {
    const { data, error } = await supabase
      .from("historico_compras_insumos" as any)
      .select("*")
      .eq("estabelecimento_codigo", code)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const comprasFiltradas = data.filter((item: any) => {
        const itemNome = (item.nome_insumo || "").toLowerCase();
        if (itemNome.includes(nomeLimpo) || nomeLimpo.includes(itemNome)) return true;
        if (tokens.length > 0) {
          const acertos = tokens.filter((tok) => itemNome.includes(tok));
          return acertos.length >= Math.ceil(tokens.length * 0.6);
        }
        return false;
      });

      if (comprasFiltradas.length > 0) {
        // Pega ESTRITAMENTE o valor da última compra realizada
        const ultimaCompra = comprasFiltradas[0];
        const valorPago = Number(ultimaCompra.valor_pago_total) || Number(ultimaCompra.valor_unitario_calculado) || 0;

        if (valorPago > 0) {
          return {
            precoMedioUnitario: parseFloat(valorPago.toFixed(2)),
            totalComprasRegistradas: comprasFiltradas.length,
            deNotaFiscal: true,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar histórico no Supabase:", e);
  }

  // 2. Fallback no Cache Local (Notinhas & Histórico ordenados pelo registro mais recente)
  try {
    const rawHistorico = localStorage.getItem(`caixadoce_historico_insumos_${code}`);
    const rawDespesas = localStorage.getItem(`caixadoce_despesas_${code}`);
    
    let itensLocal: { nome: string; valorTotal: number; timestamp: number }[] = [];

    if (rawHistorico) {
      const parsed: HistoricoCompraInsumo[] = JSON.parse(rawHistorico);
      parsed.forEach((h) => {
        itensLocal.push({
          nome: h.nomeInsumo,
          valorTotal: h.valorPagoTotal,
          timestamp: new Date(h.createdAt || h.dataCompra || 0).getTime(),
        });
      });
    }

    if (rawDespesas) {
      const parsedDespesas: any[] = JSON.parse(rawDespesas);
      parsedDespesas.forEach((d) => {
        const t = new Date(d.dataCompra || d.createdAt || 0).getTime();
        if (Array.isArray(d.itens)) {
          d.itens.forEach((it: any) => {
            itensLocal.push({
              nome: it.nome || "Insumo",
              valorTotal: Number(it.valorTotal) || 0,
              timestamp: t,
            });
          });
        }
      });
    }

    if (itensLocal.length > 0) {
      // Ordena do registro mais recente para o mais antigo
      itensLocal.sort((a, b) => b.timestamp - a.timestamp);

      const matches = itensLocal.filter((it) => {
        const itemNome = (it.nome || "").toLowerCase();
        if (itemNome.includes(nomeLimpo) || nomeLimpo.includes(itemNome)) return true;
        if (tokens.length > 0) {
          const acertos = tokens.filter((tok) => itemNome.includes(tok));
          return acertos.length >= Math.ceil(tokens.length * 0.6);
        }
        return false;
      });

      if (matches.length > 0) {
        const ultimoItem = matches[0];
        if (ultimoItem.valorTotal > 0) {
          return {
            precoMedioUnitario: parseFloat(ultimoItem.valorTotal.toFixed(2)),
            totalComprasRegistradas: matches.length,
            deNotaFiscal: true,
          };
        }
      }
    }
  } catch {}

  // 3. Fallback no Catálogo Mestre Padrão de Confeitaria
  const padraoEncontrado = INSUMOS_PADRAO_CATALOGO.find((i) => {
    const iNome = i.nome.toLowerCase();
    if (iNome.includes(nomeLimpo) || nomeLimpo.includes(iNome)) return true;
    if (i.sinonimos?.some((s) => nomeLimpo.includes(s.toLowerCase()) || s.toLowerCase().includes(nomeLimpo))) {
      return true;
    }
    if (tokens.length > 0) {
      const acertos = tokens.filter((tok) => iNome.includes(tok));
      return acertos.length >= Math.ceil(tokens.length * 0.5);
    }
    return false;
  });

  if (padraoEncontrado) {
    return {
      precoMedioUnitario: padraoEncontrado.precoBaseSugerido,
      totalComprasRegistradas: 0,
      deNotaFiscal: false,
    };
  }

  // 4. Estimativa Realista por Categoria caso seja um insumo personalizado novo
  if (nomeLimpo.includes("choc") || nomeLimpo.includes("cacau") || nomeLimpo.includes("melken") || nomeLimpo.includes("sicao")) {
    return { precoMedioUnitario: 38.50, totalComprasRegistradas: 0, deNotaFiscal: false };
  }
  if (nomeLimpo.includes("leite") || nomeLimpo.includes("creme") || nomeLimpo.includes("moca")) {
    return { precoMedioUnitario: 7.50, totalComprasRegistradas: 0, deNotaFiscal: false };
  }
  if (nomeLimpo.includes("morango") || nomeLimpo.includes("uva") || nomeLimpo.includes("fruta")) {
    return { precoMedioUnitario: 8.50, totalComprasRegistradas: 0, deNotaFiscal: false };
  }
  if (nomeLimpo.includes("caixa") || nomeLimpo.includes("embalagem") || nomeLimpo.includes("cakeboard")) {
    return { precoMedioUnitario: 5.50, totalComprasRegistradas: 0, deNotaFiscal: false };
  }

  return {
    precoMedioUnitario: 15.00,
    totalComprasRegistradas: 0,
    deNotaFiscal: false,
  };
}

export const calcularUltimoPrecoInsumo = calcularPrecoMedioInsumo;

/**
 * Salva novo registro de compra de insumo no histórico individual do usuário
 */
export async function registrarCompraInsumo(
  compra: Omit<HistoricoCompraInsumo, "id" | "createdAt">
): Promise<void> {
  const code = (compra.estabelecimentoCodigo || "CD-1001").toUpperCase();
  const novoId = crypto.randomUUID();
  const novaCompra: HistoricoCompraInsumo = {
    ...compra,
    id: novoId,
    estabelecimentoCodigo: code,
    createdAt: new Date().toISOString(),
  };

  // 1. Salvar no Supabase
  try {
    await supabase.from("historico_compras_insumos" as any).insert([
      {
        id: novaCompra.id,
        estabelecimento_codigo: code,
        nome_insumo: novaCompra.nomeInsumo,
        categoria: novaCompra.categoria,
        fornecedor_nome: novaCompra.fornecedorNome,
        data_compra: novaCompra.dataCompra,
        quantidade_comprada: novaCompra.quantidadeComprada,
        embalagem_qtd: novaCompra.embalagemQtd || 1,
        quantidade_total_unidades: novaCompra.quantidadeTotalUnidades,
        valor_pago_total: novaCompra.valorPagoTotal,
        valor_unitario_calculado: novaCompra.valorUnitarioCalculado,
        unidade_medida: novaCompra.unidadeMedida,
      },
    ]);
  } catch (e) {
    console.warn("Aviso ao salvar no Supabase (historico_compras_insumos):", e);
  }

  // 2. Salvar no Cache Local
  try {
    const raw = localStorage.getItem(`caixadoce_historico_insumos_${code}`);
    const lista: HistoricoCompraInsumo[] = raw ? JSON.parse(raw) : [];
    lista.unshift(novaCompra);
    localStorage.setItem(`caixadoce_historico_insumos_${code}`, JSON.stringify(lista));
  } catch {}
}

/**
 * Salva ou atualiza a Ficha Técnica de um produto no Supabase e no Cache Local
 */
export async function salvarFichaTecnicaProduto(
  estabelecimentoCodigo: string,
  produtoId: string,
  itens: Omit<FichaTecnicaItem, "id" | "estabelecimentoCodigo" | "produtoId">[]
): Promise<FichaTecnicaItem[]> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();

  const itensFormatados: FichaTecnicaItem[] = itens.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    estabelecimentoCodigo: code,
    produtoId,
    createdAt: new Date().toISOString(),
  }));

  // 1. Salvar no Supabase (Remove anteriores e insere novos)
  try {
    const { error: delErr } = await supabase
      .from("ficha_tecnica_itens" as any)
      .delete()
      .eq("estabelecimento_codigo", code)
      .eq("produto_id", produtoId);

    if (delErr) {
      console.warn("Aviso ao limpar itens antigos da ficha técnica no Supabase:", delErr.message);
    }

    for (const item of itensFormatados) {
      await supabase.from("ficha_tecnica_itens" as any).insert([
        {
          id: item.id,
          estabelecimento_codigo: code,
          produto_id: produtoId,
          insumo_nome: item.insumoNome,
          quantidade_usada: item.quantidadeUsada,
          unidade_medida: item.unidadeMedida,
          preco_unitario_aplicado: item.precoUnitarioAplicado,
          custo_total_item: item.custoTotalItem,
        },
      ]);
    }
  } catch (e) {
    console.warn("Aviso ao salvar ficha técnica no Supabase:", e);
  }

  // 2. Salvar no Cache Local
  try {
    localStorage.setItem(`caixadoce_ficha_tecnica_${code}_${produtoId}`, JSON.stringify(itensFormatados));
  } catch {}

  return itensFormatados;
}

/**
 * Carrega os itens da Ficha Técnica de um produto
 */
export async function obterFichaTecnicaProduto(
  estabelecimentoCodigo: string,
  produtoId: string
): Promise<FichaTecnicaItem[]> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();

  // 1. Busca no Supabase
  try {
    const { data, error } = await supabase
      .from("ficha_tecnica_itens" as any)
      .select("*")
      .eq("estabelecimento_codigo", code)
      .eq("produto_id", produtoId);

    if (!error && data && data.length > 0) {
      const mapeados: FichaTecnicaItem[] = data.map((d: any) => {
        const precoEmb = Number(d.preco_embalagem ?? d.preco_unitario_aplicado ?? 0);
        const unid = d.unidade_medida || "g";
        const unidEmb = d.unidade_embalagem || d.unidadeEmbalagem || (unid === "g" || unid === "ml" ? "kg" : unid);
        const qtdEmb = Number(
          d.qtd_embalagem_original ?? (unidEmb === "kg" || unidEmb === "l" ? 1 : 1000)
        );
        const qtdUsada = Number(d.quantidade_usada ?? 0);

        return {
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimento_codigo,
          produtoId: d.produto_id,
          insumoNome: d.insumo_nome,
          precoEmbalagem: precoEmb,
          qtdEmbalagemOriginal: qtdEmb,
          quantidadeUsada: qtdUsada,
          unidadeMedida: unid,
          unidadeEmbalagem: unidEmb,
          precoUnitarioAplicado: precoEmb,
          custoTotalItem:
            Number(d.custo_total_item) ||
            calcularCustoItemFichaTecnica(qtdUsada, unid, precoEmb, qtdEmb, unidEmb),
          createdAt: d.created_at,
        };
      });
      localStorage.setItem(`caixadoce_ficha_tecnica_${code}_${produtoId}`, JSON.stringify(mapeados));
      return mapeados;
    }
  } catch {}

  // 2. Cache Local
  try {
    const raw = localStorage.getItem(`caixadoce_ficha_tecnica_${code}_${produtoId}`);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      return parsed.map((d) => {
        const precoEmb = Number(d.precoEmbalagem ?? d.precoUnitarioAplicado ?? 0);
        const unid = d.unidadeMedida || "g";
        const unidEmb = d.unidadeEmbalagem || (unid === "g" || unid === "ml" ? "kg" : unid);
        const qtdEmb = Number(
          d.qtdEmbalagemOriginal ?? (unidEmb === "kg" || unidEmb === "l" ? 1 : 1000)
        );
        const qtdUsada = Number(d.quantidadeUsada ?? 0);

        return {
          id: String(d.id),
          estabelecimentoCodigo: d.estabelecimentoCodigo,
          produtoId: d.produtoId,
          insumoNome: d.insumoNome,
          precoEmbalagem: precoEmb,
          qtdEmbalagemOriginal: qtdEmb,
          quantidadeUsada: qtdUsada,
          unidadeMedida: unid,
          unidadeEmbalagem: unidEmb,
          precoUnitarioAplicado: precoEmb,
          custoTotalItem:
            Number(d.custoTotalItem) ||
            calcularCustoItemFichaTecnica(qtdUsada, unid, precoEmb, qtdEmb, unidEmb),
          createdAt: d.createdAt,
        };
      });
    }
  } catch {}

  return [];
}

/**
 * Calcula o custo real de um item da Ficha Técnica vinculando unidades e fazendo conversão matemática:
 * Exemplo 1: Embalagem de 1kg a R$ 38,50 e uso de 250g -> (38,50 / 1000g) * 250g = R$ 9,63
 * Exemplo 2: Embalagem de 1L a R$ 20,00 e uso de 250ml -> (20,00 / 1000ml) * 250ml = R$ 5,00
 * Exemplo 3: Embalagem de 25 un a R$ 12,50 e uso de 2 un -> (12,50 / 25un) * 2un = R$ 1,00
 */
export function calcularCustoItemFichaTecnica(
  quantidadeUsada: number,
  unidadeMedida: string,
  precoEmbalagem: number,
  qtdEmbalagemOriginal: number = 1000,
  unidadeEmbalagem?: string
): number {
  const qtdUsada = Number(quantidadeUsada) || 0;
  const precoEmb = Number(precoEmbalagem) || 0;
  const qtdEmbOrig = Number(qtdEmbalagemOriginal) > 0 ? Number(qtdEmbalagemOriginal) : 1;

  const uUsada = (unidadeMedida || "g").toLowerCase();
  const uEmb = (unidadeEmbalagem || uUsada).toLowerCase();

  let fatorUsadaG = 1;
  if (uUsada === "kg") fatorUsadaG = 1000;
  else if (uUsada === "g") fatorUsadaG = 1;

  let fatorEmbG = 1;
  if (uEmb === "kg") fatorEmbG = 1000;
  else if (uEmb === "g") fatorEmbG = 1;

  let fatorUsadaMl = 1;
  if (uUsada === "l") fatorUsadaMl = 1000;
  else if (uUsada === "ml") fatorUsadaMl = 1;

  let fatorEmbMl = 1;
  if (uEmb === "l") fatorEmbMl = 1000;
  else if (uEmb === "ml") fatorEmbMl = 1;

  let qtdUsadaBase = qtdUsada;
  let qtdEmbBase = qtdEmbOrig;

  if ((uUsada === "g" || uUsada === "kg") && (uEmb === "g" || uEmb === "kg")) {
    qtdUsadaBase = qtdUsada * fatorUsadaG;
    qtdEmbBase = qtdEmbOrig * fatorEmbG;
  } else if ((uUsada === "ml" || uUsada === "l") && (uEmb === "ml" || uEmb === "l")) {
    qtdUsadaBase = qtdUsada * fatorUsadaMl;
    qtdEmbBase = qtdEmbOrig * fatorEmbMl;
  }

  if (qtdEmbBase <= 0) qtdEmbBase = 1;

  const custoCalculado = (precoEmb / qtdEmbBase) * qtdUsadaBase;
  return parseFloat(custoCalculado.toFixed(2));
}

/**
 * Realiza os cálculos de Custo, Margem e Preço Sugerido da Ficha Técnica
 */
export function calcularTotaisFichaTecnica(
  itens: FichaTecnicaItem[],
  rendimentoQtd: number = 1,
  custosOperacionaisPerc: number = 15,
  margemLucroPerc: number = 100
): CalculoFichaTecnicaResultado {
  const custoInsumosTotal = itens.reduce((sum, item) => {
    const precoEmb = Number(item.precoEmbalagem ?? item.precoUnitarioAplicado ?? 0);
    const qtdEmb = Number(
      item.qtdEmbalagemOriginal ?? (item.unidadeEmbalagem === "kg" || item.unidadeEmbalagem === "l" ? 1 : 1000)
    );
    const totalItem = calcularCustoItemFichaTecnica(
      item.quantidadeUsada,
      item.unidadeMedida || "g",
      precoEmb,
      qtdEmb,
      item.unidadeEmbalagem || item.unidadeMedida
    );
    return sum + totalItem;
  }, 0);

  const custosOperacionaisValor = parseFloat((custoInsumosTotal * (custosOperacionaisPerc / 100)).toFixed(2));
  const custoTotalReceita = parseFloat((custoInsumosTotal + custosOperacionaisValor).toFixed(2));

  const rendimentoFinal = rendimentoQtd > 0 ? rendimentoQtd : 1;
  const custoUnitarioItem = parseFloat((custoTotalReceita / rendimentoFinal).toFixed(2));

  const precoVendaSugeridoLote = parseFloat((custoTotalReceita * (1 + margemLucroPerc / 100)).toFixed(2));
  const precoVendaSugeridoUnitario = parseFloat((precoVendaSugeridoLote / rendimentoFinal).toFixed(2));

  return {
    custoInsumosTotal: parseFloat(custoInsumosTotal.toFixed(2)),
    custosOperacionaisPerc,
    custosOperacionaisValor,
    custoTotalReceita,
    rendimentoQuantidade: rendimentoFinal,
    custoUnitarioItem,
    margemLucroPerc,
    precoVendaSugeridoUnitario,
    precoVendaSugeridoLote,
  };
}
