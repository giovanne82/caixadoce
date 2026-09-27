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
  const rawStatus = String(row.status || "").trim().toLowerCase();
  const isPublished =
    rawStatus === "published" ||
    rawStatus === "publicado" ||
    rawStatus === "publish" ||
    rawStatus === "publicar" ||
    rawStatus === "ativo" ||
    rawStatus === "active" ||
    rawStatus === "true";

  const rawSlug = String(row.slug || `post-${row.id}`).trim();

  return {
    id: String(row.id),
    title: String(row.title || "Sem Título").trim(),
    slug: rawSlug,
    content: String(row.content || ""),
    cost_simulation: normalizeCostSimulation(row.cost_simulation),
    status: isPublished ? "published" : "draft",
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
 * Busca posts da tabela `blog_posts`.
 * Se `includeDrafts` for true (usuário autenticado/admin), traz todos os posts.
 * Se for false (visitante público), filtra apenas os publicados.
 */
export async function fetchPublishedBlogPosts(includeDrafts = true): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchPublishedBlogPosts] Erro no Supabase:", error);
      return [];
    }

    if (data && Array.isArray(data)) {
      const normalized = data.map(normalizeBlogPost);
      if (includeDrafts) {
        return normalized;
      }
      return normalized.filter((p) => p.status === "published");
    }
  } catch (err) {
    console.error("[fetchPublishedBlogPosts] Exceção ao buscar posts do Supabase:", err);
  }

  return [];
}

/**
 * Busca um post específico pelo `slug` (ou ID) diretamente no Supabase.
 * Trata variações de maiúsculas/minúsculas, decodificação de URL, espaços em branco e status.
 */
export async function fetchBlogPostBySlug(rawSlug: string, isAdminOrAuthenticated = false): Promise<BlogPost | null> {
  if (!rawSlug) return null;

  try {
    const cleanSlug = decodeURIComponent(rawSlug).trim();
    const cleanSlugLower = cleanSlug.toLowerCase();

    // 1. Tentativa prioritária: Busca direta por slug (case-insensitive ou exato)
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .or(`slug.ilike.${cleanSlug},slug.eq.${cleanSlug},slug.eq.${rawSlug}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const post = normalizeBlogPost(data);
      if (post.status === "published" || isAdminOrAuthenticated) {
        return post;
      }
      return null;
    }

    // 2. Fallback por ID (se o slug passado for o UUID do artigo)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug)) {
      const { data: byId } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", cleanSlug)
        .maybeSingle();

      if (byId) {
        const post = normalizeBlogPost(byId);
        if (post.status === "published" || isAdminOrAuthenticated) {
          return post;
        }
        return null;
      }
    }

    // 3. Fallback inteligente: buscar posts e comparar slugs normalizados (remove acentos, hífens e pontuação)
    const { data: allRows } = await supabase
      .from("blog_posts")
      .select("*")
      .limit(100);

    if (allRows && allRows.length > 0) {
      const matchedRow = allRows.find((row: any) => {
        const rowSlug = String(row.slug || "").trim().toLowerCase();
        const rowSlugDecoded = decodeURIComponent(rowSlug).trim().toLowerCase();
        const targetSlugDecoded = cleanSlugLower;

        // Comparações flexíveis
        if (rowSlug === targetSlugDecoded || rowSlugDecoded === targetSlugDecoded) return true;
        if (rowSlug.replace(/-/g, " ") === targetSlugDecoded.replace(/-/g, " ")) return true;
        if (String(row.id) === cleanSlug) return true;

        // Comparação com título slugificado
        const titleSlug = String(row.title || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        return titleSlug === targetSlugDecoded;
      });

      if (matchedRow) {
        const post = normalizeBlogPost(matchedRow);
        if (post.status === "published" || isAdminOrAuthenticated) {
          return post;
        }
        return null;
      }
    }
  } catch (err) {
    console.error(`[fetchBlogPostBySlug] Exceção ao buscar post '${rawSlug}':`, err);
  }

  return null;
}

/**
 * Publica um post (muda status de 'draft' para 'published')
 */
export async function publishBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[publishBlogPost] Erro ao publicar:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Atualiza os dados de um post do blog
 */
export async function updateBlogPost(
  id: string,
  dados: Partial<BlogPost>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dados.title !== undefined) payload.title = dados.title;
    if (dados.slug !== undefined) payload.slug = dados.slug;
    if (dados.content !== undefined) payload.content = dados.content;
    if (dados.cost_simulation !== undefined) payload.cost_simulation = dados.cost_simulation;
    if (dados.status !== undefined) payload.status = dados.status;
    if (dados.cover_image !== undefined) payload.cover_image = dados.cover_image;
    if (dados.category !== undefined) payload.category = dados.category;
    if (dados.reading_time !== undefined) payload.reading_time = dados.reading_time;
    if (dados.author !== undefined) payload.author = dados.author;
    if (dados.excerpt !== undefined) payload.excerpt = dados.excerpt;

    const { error } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("[updateBlogPost] Erro ao atualizar:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Exclui um post do blog
 */
export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[deleteBlogPost] Erro ao excluir:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
