import { supabase } from "@/integrations/supabase/client";
import type { ProdutoCardapio, KitProduto, KitItemComponente } from "@/lib/caixadoce-data";

/**
 * Calcula em tempo real o Custo Total dos Insumos e a Margem de Lucro (%) para um kit.
 */
export function calcularCustosEMargemKit(
  itens: KitItemComponente[],
  produtosCardapio: ProdutoCardapio[],
  precoVenda: number,
  fichasTecnicasMapa: Record<string, number> = {}
) {
  let custoTotalInsumos = 0;

  for (const item of itens) {
    const qtd = Math.max(0, Number(item.quantidade) || 0);
    const prod = produtosCardapio.find((p) => p.id === item.produtoId);

    // 1. Tenta obter o custo da ficha técnica ou do snapshot
    let custoUnitario = item.custoUnitarioSnapshot || 0;
    if (prod && fichasTecnicasMapa[prod.id]) {
      custoUnitario = fichasTecnicasMapa[prod.id];
    } else if (prod && prod.custoTotalInsumos) {
      custoUnitario = prod.custoTotalInsumos;
    } else if (prod && prod.preco) {
      // Se não houver custo de ficha técnica cadastrado, adota 40% do preço como estimativa de custo base
      custoUnitario = prod.preco * 0.4;
    }

    custoTotalInsumos += custoUnitario * qtd;
  }

  const preco = Math.max(0, Number(precoVenda) || 0);
  let margemLucroPercentual = 0;

  if (preco > 0) {
    margemLucroPercentual = ((preco - custoTotalInsumos) / preco) * 100;
  }

  return {
    custoTotalInsumos: Number(custoTotalInsumos.toFixed(2)),
    margemLucroPercentual: Number(margemLucroPercentual.toFixed(1)),
  };
}

/**
 * Converte um KitProduto em ProdutoCardapio com a flag `isKit: true` para renderização homogênea.
 */
export function converterKitParaProdutoCardapio(kit: KitProduto): ProdutoCardapio {
  return {
    id: kit.id,
    estabelecimentoCodigo: kit.estabelecimentoCodigo,
    nome: kit.nome,
    descricao: kit.descricao || "",
    preco: kit.precoVenda,
    categoria: kit.categoria || "Kits & Combos",
    fotoUrl: kit.fotoUrl || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
    ativo: kit.ativo !== false,
    createdAt: kit.createdAt,
    isKit: true,
    custoTotalInsumos: kit.custoTotalInsumos,
    margemLucroPercentual: kit.margemLucroPercentual,
    prazoEntregaIndependente: kit.prazoEntrega,
    itensKit: kit.itens,
  };
}

/**
 * Busca todos os Kits do estabelecimento no Supabase (tabela `kits` + `kit_itens`).
 */
export async function obterKitsEstabelecimento(estabelecimentoCodigo: string): Promise<KitProduto[]> {
  const code = (estabelecimentoCodigo || "CD-1001").toUpperCase();

  try {
    const { data: kitsData, error: kitsErr } = await supabase
      .from("kits")
      .select("*")
      .ilike("estabelecimento_codigo", code);

    if (kitsErr || !kitsData) {
      console.warn("[Kits Service] Tabela 'kits' não disponível no Supabase ou erro:", kitsErr?.message);
      return [];
    }

    const kitIds = kitsData.map((k: any) => k.id);
    let itensData: any[] = [];

    if (kitIds.length > 0) {
      const { data: fetchItens } = await supabase
        .from("kit_itens")
        .select("*")
        .in("kit_id", kitIds);
      if (fetchItens) itensData = fetchItens;
    }

    return kitsData.map((k: any) => {
      const componentes = itensData
        .filter((it: any) => it.kit_id === k.id)
        .map((it: any) => ({
          produtoId: it.produto_id,
          quantidade: Number(it.quantidade) || 1,
        }));

      return {
        id: k.id,
        estabelecimentoCodigo: k.estabelecimento_codigo,
        nome: k.nome,
        descricao: k.descricao || "",
        precoVenda: Number(k.preco_venda) || 0,
        custoTotalInsumos: Number(k.custo_total) || 0,
        margemLucroPercentual: Number(k.margem_lucro) || 0,
        prazoEntrega: k.prazo_entrega || "2 dias úteis",
        fotoUrl: k.foto_url || "",
        categoria: "Kits & Combos",
        ativo: k.ativo !== false,
        itens: componentes,
        createdAt: k.created_at,
      };
    });
  } catch (err) {
    console.error("[Kits Service Error]", err);
    return [];
  }
}

/**
 * Salva (cria ou atualiza) um Kit no Supabase.
 */
export async function salvarKitEstabelecimento(kit: KitProduto): Promise<KitProduto> {
  const code = (kit.estabelecimentoCodigo || "CD-1001").toUpperCase();

  const payloadKit = {
    id: kit.id,
    estabelecimento_codigo: code,
    nome: kit.nome,
    descricao: kit.descricao || "",
    preco_venda: kit.precoVenda,
    custo_total: kit.custoTotalInsumos,
    margem_lucro: kit.margemLucroPercentual,
    prazo_entrega: kit.prazoEntrega || "2 dias úteis",
    foto_url: kit.fotoUrl || "",
    ativo: kit.ativo !== false,
    updated_at: new Date().toISOString(),
  };

  try {
    // 1. Salva na tabela `kits`
    const { data: savedKit, error: kitErr } = await supabase
      .from("kits")
      .upsert([payloadKit], { onConflict: "id" })
      .select()
      .single();

    if (kitErr) {
      console.warn("[Kits Service] Falha no upsert da tabela 'kits':", kitErr.message);
    }

    const kitIdFinal = savedKit?.id || kit.id;

    // 2. Atualiza a tabela `kit_itens`
    await supabase.from("kit_itens").delete().eq("kit_id", kitIdFinal);

    if (kit.itens && kit.itens.length > 0) {
      const rowsItens = kit.itens.map((it) => ({
        kit_id: kitIdFinal,
        produto_id: it.produtoId,
        quantidade: it.quantidade,
      }));
      await supabase.from("kit_itens").insert(rowsItens);
    }

    return { ...kit, id: kitIdFinal };
  } catch (e) {
    console.error("[Kits Service] Erro ao salvar kit no Supabase:", e);
    return kit;
  }
}

/**
 * Exclui um kit do Supabase.
 */
export async function excluirKitEstabelecimento(kitId: string): Promise<void> {
  try {
    await supabase.from("kit_itens").delete().eq("kit_id", kitId);
    await supabase.from("kits").delete().eq("id", kitId);
  } catch (e) {
    console.error("[Kits Service] Erro ao excluir kit:", e);
  }
}

/**
 * Calcula a expansão de baixa de estoque proporcional para itens de um Kit em uma venda.
 */
export function expandirItensKitParaBaixaEstoque(
  itensKit: KitItemComponente[],
  quantidadeKitVendida: number = 1
): Array<{ produtoId: string; quantidadeDedução: number }> {
  const qtdKit = Math.max(1, Number(quantidadeKitVendida) || 1);
  return itensKit.map((item) => ({
    produtoId: item.produtoId,
    quantidadeDedução: (Number(item.quantidade) || 1) * qtdKit,
  }));
}
