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
  quantidadeUsada: number;
  unidadeMedida: "g" | "kg" | "ml" | "l" | "un" | "bdj" | "pct" | "cx";
  precoUnitarioAplicado: number;
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
 * Calcula o preço médio ponderado individual de um insumo especificamente para aquele estabelecimento/usuário.
 * Se não houver compras registradas daquela confeiteira, retorna o preço base padrão.
 */
export async function calcularPrecoMedioInsumo(
  estabelecimentoCodigo: string,
  insumoNome: string,
  unidadeDesejada: string = "un"
): Promise<{ precoMedioUnitario: number; totalComprasRegistradas: number; deNotaFiscal: boolean }> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();
  const nomeLimpo = insumoNome.trim().toLowerCase();

  try {
    // 1. Busca no Supabase por compras do usuário
    const { data, error } = await supabase
      .from("historico_compras_insumos" as any)
      .select("*")
      .eq("estabelecimento_codigo", code);

    if (!error && data && data.length > 0) {
      // Filtrar compras correspondentes pelo nome ou sinônimo
      const comprasFiltradas = data.filter((item: any) => {
        const itemNome = (item.nome_insumo || "").toLowerCase();
        return itemNome.includes(nomeLimpo) || nomeLimpo.includes(itemNome);
      });

      if (comprasFiltradas.length > 0) {
        let somaValorTotal = 0;
        let somaQtdTotal = 0;

        comprasFiltradas.forEach((c: any) => {
          const valor = Number(c.valor_pago_total) || 0;
          const qtd = Number(c.quantidade_total_unidades) || Number(c.quantidade_comprada) || 1;
          somaValorTotal += valor;
          somaQtdTotal += qtd;
        });

        if (somaQtdTotal > 0) {
          const precoUnitarioCalculado = parseFloat((somaValorTotal / somaQtdTotal).toFixed(4));
          return {
            precoMedioUnitario: precoUnitarioCalculado,
            totalComprasRegistradas: comprasFiltradas.length,
            deNotaFiscal: true,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar histórico de compras no Supabase:", e);
  }

  // 2. Fallback no Cache Local
  try {
    const raw = localStorage.getItem(`caixadoce_historico_insumos_${code}`);
    if (raw) {
      const historicoLocal: HistoricoCompraInsumo[] = JSON.parse(raw);
      const comprasFiltradas = historicoLocal.filter((item) =>
        item.nomeInsumo.toLowerCase().includes(nomeLimpo) || nomeLimpo.includes(item.nomeInsumo.toLowerCase())
      );

      if (comprasFiltradas.length > 0) {
        let somaValorTotal = 0;
        let somaQtdTotal = 0;

        comprasFiltradas.forEach((c) => {
          somaValorTotal += c.valorPagoTotal;
          somaQtdTotal += c.quantidadeTotalUnidades || c.quantidadeComprada || 1;
        });

        if (somaQtdTotal > 0) {
          return {
            precoMedioUnitario: parseFloat((somaValorTotal / somaQtdTotal).toFixed(4)),
            totalComprasRegistradas: comprasFiltradas.length,
            deNotaFiscal: true,
          };
        }
      }
    }
  } catch {}

  // 3. Fallback no Catálogo Mestre Padrão
  const padraoEncontrado = INSUMOS_PADRAO_CATALOGO.find(
    (i) =>
      i.nome.toLowerCase().includes(nomeLimpo) ||
      nomeLimpo.includes(i.nome.toLowerCase()) ||
      i.sinonimos?.some((s) => nomeLimpo.includes(s.toLowerCase()))
  );

  if (padraoEncontrado) {
    return {
      precoMedioUnitario: padraoEncontrado.precoBaseSugerido,
      totalComprasRegistradas: 0,
      deNotaFiscal: false,
    };
  }

  return {
    precoMedioUnitario: 10.0, // valor inicial padrão
    totalComprasRegistradas: 0,
    deNotaFiscal: false,
  };
}

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
    await supabase
      .from("ficha_tecnica_itens" as any)
      .delete()
      .eq("estabelecimento_codigo", code)
      .eq("produto_id", produtoId);

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
      const mapeados: FichaTecnicaItem[] = data.map((d: any) => ({
        id: String(d.id),
        estabelecimentoCodigo: d.estabelecimento_codigo,
        produtoId: d.produto_id,
        insumoNome: d.insumo_nome,
        quantidadeUsada: Number(d.quantidade_usada),
        unidadeMedida: d.unidade_medida || "g",
        precoUnitarioAplicado: Number(d.preco_unitario_aplicado),
        custoTotalItem: Number(d.custo_total_item),
        createdAt: d.created_at,
      }));
      localStorage.setItem(`caixadoce_ficha_tecnica_${code}_${produtoId}`, JSON.stringify(mapeados));
      return mapeados;
    }
  } catch {}

  // 2. Cache Local
  try {
    const raw = localStorage.getItem(`caixadoce_ficha_tecnica_${code}_${produtoId}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

/**
 * Realiza os cálculos de Custo, Margem e Preço Sugerido da Ficha Técnica
 */
export function calcularTotaisFichaTecnica(
  itens: { quantidadeUsada: number; precoUnitarioAplicado: number }[],
  rendimentoQtd: number = 1,
  custosOperacionaisPerc: number = 15,
  margemLucroPerc: number = 100
): CalculoFichaTecnicaResultado {
  const custoInsumosTotal = itens.reduce((sum, item) => {
    const totalItem = (Number(item.quantidadeUsada) || 0) * (Number(item.precoUnitarioAplicado) || 0);
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
