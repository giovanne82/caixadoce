import { supabase } from "@/integrations/supabase/client";
import { BlogPost, CostSimulation, CostSimulationIngredient } from "@/types/blog";

/**
 * Normaliza e sanitiza o objeto de simulação de custos gerado pela IA ou Webhook,
 * garantindo compatibilidade com qualquer variação de formato (string JSON, chaves em português/inglês, etc).
 */
export function normalizeCostSimulation(raw: any): CostSimulation | null {
  if (!raw) return null;

  let sim: any = raw;
  if (typeof raw === "string") {
    try {
      sim = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!sim || typeof sim !== "object") return null;

  const rawIngredients = sim.ingredientes || sim.ingredients || sim.itens || sim.items || [];
  if (!Array.isArray(rawIngredients)) return null;

  const ingredientes: CostSimulationIngredient[] = rawIngredients.map((item: any) => {
    const nome = String(item.item || item.nome || item.name || item.ingrediente || "Insumo").trim();
    const quantidade = String(item.quantidade || item.qtd || item.quantity || "1 porção").trim();
    const precoUnitario = Number(item.preco_unitario || item.preco || item.unit_price || item.valor || 0);
    const custoProporcional = Number(
      item.custo_proporcional || item.custo || item.cost || item.proportional_cost || precoUnitario || 0
    );

    return {
      item: nome,
      quantidade,
      preco_unitario: isNaN(precoUnitario) ? 0 : precoUnitario,
      custo_proporcional: isNaN(custoProporcional) ? 0 : custoProporcional,
    };
  });

  const custoTotalCalculado = ingredientes.reduce((acc, cur) => acc + cur.custo_proporcional, 0);
  const custoTotal = Number(sim.custo_total || sim.total_cost || custoTotalCalculado || 0);
  const precoSugerido = Number(sim.preco_sugerido || sim.suggested_price || sim.preco_venda || (custoTotal * 2.5) || 0);
  
  let margem = Number(sim.margem_lucro || sim.profit_margin || sim.margem || 0);
  if (!margem && precoSugerido > 0 && custoTotal > 0) {
    margem = ((precoSugerido - custoTotal) / precoSugerido) * 100;
  }

  return {
    rendimento: sim.rendimento || sim.yield || undefined,
    tempo_preparo: sim.tempo_preparo || sim.prep_time || undefined,
    ingredientes,
    custo_total: isNaN(custoTotal) ? 0 : custoTotal,
    preco_sugerido: isNaN(precoSugerido) ? 0 : precoSugerido,
    margem_lucro: isNaN(margem) ? 0 : Math.round(margem * 10) / 10,
    lucro_bruto: Number(sim.lucro_bruto || (precoSugerido - custoTotal)),
    observacoes: sim.observacoes || sim.notes || sim.dica || undefined,
  };
}

/**
 * Normaliza uma linha da tabela `blog_posts` vinda do Supabase
 */
export function normalizeBlogPost(row: any): BlogPost {
  return {
    id: String(row.id),
    title: String(row.title || "Sem Título"),
    slug: String(row.slug || `post-${row.id}`),
    content: String(row.content || ""),
    cost_simulation: normalizeCostSimulation(row.cost_simulation),
    status: (row.status === "published" ? "published" : "draft") as "draft" | "published",
    cover_image: row.cover_image || null,
    category: row.category || "Receitas Virais",
    reading_time: row.reading_time || "5 min de leitura",
    author: row.author || "Equipe CaixaDoce",
    excerpt: row.excerpt || (row.content ? row.content.slice(0, 160).replace(/[#*`_]/g, "").trim() + "..." : ""),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

/**
 * Busca todos os posts da tabela `blog_posts` no Supabase.
 * Para permitir testes imediatos dos artigos recebidos do Make em status 'draft',
 * selecionamos todos os posts ordenados pelos mais recentes.
 */
export async function fetchPublishedBlogPosts(includeDrafts = true): Promise<BlogPost[]> {
  try {
    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeDrafts) {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;

    if (error) {
      console.error("[fetchPublishedBlogPosts] Erro no Supabase:", error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map(normalizeBlogPost);
    }
  } catch (err) {
    console.error("[fetchPublishedBlogPosts] Exceção ao buscar posts do Supabase:", err);
  }

  return [];
}

/**
 * Busca um post específico pelo `slug` diretamente no Supabase.
 */
export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!slug) return null;

  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(`[fetchBlogPostBySlug] Erro ao buscar post pelo slug '${slug}':`, error);
      return null;
    }

    if (data) {
      return normalizeBlogPost(data);
    }
  } catch (err) {
    console.error(`[fetchBlogPostBySlug] Exceção ao buscar post '${slug}':`, err);
  }

  return null;
}
