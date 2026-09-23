import { supabase } from "@/integrations/supabase/client";
import { BlogPost } from "@/types/blog";

export const FALLBACK_BLOG_POSTS: BlogPost[] = [
  {
    id: "post-bento-cake",
    title: "Bolo Bentô Cake Viral 2026: Receita Passo a Passo e Ficha Técnica Completa",
    slug: "bolo-bento-cake-viral-2026",
    category: "Receitas Virais",
    reading_time: "4 min de leitura",
    author: "Equipe CaixaDoce & Chef Confeiteira",
    excerpt: "Aprenda a fazer a massa perfeita de Bentô Cake e veja a simulação real de custos de ingredientes com chantilly Norcau para lucrar mais de 70%.",
    cover_image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: "published",
    content: `## O Fenômeno do Bentô Cake na Confeitaria Artesanal

O Bentô Cake (ou bolo na marmitinha) tornou-se o queridinho dos clientes por ser um presente fofo, divertido e perfeito para comemorações íntimas. Para a confeiteira, representa uma das maiores margens de lucro da vitrine, pois tem baixo custo de insumos e alta percepção de valor devido à personalização.

---

### Por que esta receita é ideal para vender todos os dias?
- **Rendimento Perfeito:** Uma única fornada rende 3 mini bolos de 10cm x 7cm de altura (cerca de 350g cada).
- **Massa Estruturada e Úmida:** Não esfarela ao esculpir ou cortar e suporta recheios cremosos sem vazar.
- **Decoração Rápida com Chantilly Estabilizado:** Agilidade para atender pedidos de pronta entrega no mesmo dia.

---

### Ingredientes da Massa Chiffon de Baunilha:
- **3 ovos inteiros** (150g)
- **150g de açúcar refinado**
- **120ml de leite morno**
- **60ml de óleo de soja ou girassol**
- **180g de farinha de trigo peneirada**
- **10g de fermento em pó**
- **1 colher de sobremesa de essência de baunilha**

---

### Recheio de Brigadeiro Gourmet Aveludado:
- **1 lata de Leite Condensado (395g)**
- **1 caixinha de Creme de Leite 17% ou 20% (200g)**
- **100g de Chocolate Nobre meio amargo picado**

---

### Passo a Passo de Execução:
1. **Massa Aerada:** Bata os ovos com o açúcar na velocidade máxima da batedeira por 6 minutos até triplicar de volume.
2. **Emulsão:** Reduza a velocidade e verta o óleo em fio e depois o leite morno. Bata por apenas 30 segundos.
3. **Peneira:** Incorpore a farinha em duas etapas mexendo com fouet delicadamente. Finalize com o fermento.
4. **Fornada:** Divida a massa em 3 forminhas redondas de 10cm previamente untadas com papel manteiga no fundo. Asse a 180°C por 25 a 30 minutos.
5. **Cobertura:** Bata o chantilly Puratos Norcau bem gelado até o ponto firme de bico e use corantes em gel para colorir e escrever as frases do meme.`,
    cost_simulation: {
      rendimento: "3 Bentô Cakes de 350g (ou 1 bolo de festa de 1.2kg)",
      tempo_preparo: "1h 15min",
      ingredientes: [
        {
          item: "Puratos Norcau Chantilly 1L",
          quantidade: "400ml",
          preco_unitario: 16.90,
          custo_proporcional: 6.76,
        },
        {
          item: "Leite Condensado Moça / Nestlé 395g",
          quantidade: "1 lata",
          preco_unitario: 7.50,
          custo_proporcional: 7.50,
        },
        {
          item: "Creme de Leite 200g",
          quantidade: "1 caixa",
          preco_unitario: 3.80,
          custo_proporcional: 3.80,
        },
        {
          item: "Farinha, ovos, óleo e açúcar",
          quantidade: "1 porção",
          preco_unitario: 4.80,
          custo_proporcional: 4.80,
        },
        {
          item: "Embalagens Bentô Box Lancheira (x3)",
          quantidade: "3 unidades",
          preco_unitario: 2.00,
          custo_proporcional: 6.00,
        },
      ],
      custo_total: 28.86,
      preco_sugerido: 105.00,
      margem_lucro: 72.5,
      lucro_bruto: 76.14,
      observacoes: "Custo unitário por Bento pronto na embalagem com vela e laço: R$ 9,62. Preço de venda praticado: R$ 35,00/un.",
    },
  },
  {
    id: "post-brigadeiro-gourmet",
    title: "Brigadeiro Gourmet Perfeito que Não Cristaliza: Ficha Técnica e Custos Unitários",
    slug: "brigadeiro-gourmet-perfeito-precificacao",
    category: "Doces Finos",
    reading_time: "5 min de leitura",
    author: "Equipe CaixaDoce",
    excerpt: "Descubra a técnica de emulsão com manteiga e glucose para garantir 15 dias de validade e o cálculo exato do cento de doces.",
    cover_image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=1200&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    status: "published",
    content: `## O Segredo do Brigadeiro Gourmet com Brilho Espelhado

Muitas confeiteiras sofrem com brigadeiros que açucaram após 3 dias na vitrine. Com o balanceamento correto de gordura e sólidos de cacau, é possível obter um doce extremamente aveludado e com durabilidade comercial.

---

### Dicas de Ouro da Confeiteira Profissional:
- Utilize sempre panela de fundo triplo para não queimar os cantos.
- Fogo médio para baixo durante todo o cozimento (cerca de 14 a 18 minutos).
- Deixe o brigadeiro descansar por no mínimo 8 horas em temperatura ambiente embalado em plástico filme em contato.

---

### Ingredientes para 1 Cento (100 unidades de 15g):
- **4 latas de Leite Condensado Integral 8%**
- **4 caixinhas de Creme de Leite 20% de gordura**
- **120g de Chocolate em pó 50% Cacau**
- **100g de Chocolate Nobre Meio Amargo**
- **300g de confeito Granulado Belga Callebaut**`,
    cost_simulation: {
      rendimento: "100 brigadeiros gourmet de 15g (1 Cento)",
      tempo_preparo: "50 min",
      ingredientes: [
        {
          item: "Leite Condensado Integral (4 latas)",
          quantidade: "4 latas",
          preco_unitario: 6.90,
          custo_proporcional: 27.60,
        },
        {
          item: "Creme de Leite 20% (4 caixas)",
          quantidade: "4 cx",
          preco_unitario: 3.90,
          custo_proporcional: 15.60,
        },
        {
          item: "Chocolate em Pó 50% Cacau (120g)",
          quantidade: "120g",
          preco_unitario: 34.00,
          custo_proporcional: 4.08,
        },
        {
          item: "Granulado Belga Split Callebaut (300g)",
          quantidade: "300g",
          preco_unitario: 68.00,
          custo_proporcional: 20.40,
        },
        {
          item: "Forminhas 4 Pétalas e Tapetinhos",
          quantidade: "100 un",
          preco_unitario: 0.12,
          custo_proporcional: 12.00,
        },
      ],
      custo_total: 79.68,
      preco_sugerido: 220.00,
      margem_lucro: 63.8,
      lucro_bruto: 140.32,
      observacoes: "Custo por brigadeiro pronto e embalado: R$ 0,80. Venda mínima recomendada: R$ 2,20/unidade ou R$ 220,00 o cento.",
    },
  },
  {
    id: "post-bolo-vulcao-ninho-nutella",
    title: "Bolo Vulcão de Ninho com Nutella: A Sobremesa Mais Desejada no Cardápio",
    slug: "bolo-vulcao-ninho-com-nutella-calculo",
    category: "Cardápio Lucrativo",
    reading_time: "6 min de leitura",
    author: "Chef Confeitaria",
    excerpt: "Como transformar um simples bolo caseiro em uma atração visual com cascata de creme de Ninho e Nutella pura.",
    cover_image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=1200&q=80",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    status: "published",
    content: `## A Magia da Cobertura Vulcão

O bolo vulcão é imbatível nas redes sociais. Quando o cliente corta a primeira fatia, a piscina central transborda criando vídeos hipnotizantes para o Instagram e TikTok.

---

### Dicas de Produção:
1. **Forma com Furo Central Grande:** Utilize formas de 20cm a 22cm com cone largo para armazenar bastante recheio.
2. **Ponto do Recheio Vulcão:** O brigadeiro de leite Ninho deve ter ponto de calda espessa (cai em fita contínua) para escorrer com facilidade.
3. **Nutella em Ponto de Bico:** Aqueça levemente a Nutella em banho-maria morno antes de fazer os fios por cima do bolo.`,
    cost_simulation: {
      rendimento: "1 Bolo Vulcão Grande (Serve 14 fatias - 1.8kg)",
      tempo_preparo: "1h",
      ingredientes: [
        {
          item: "Leite em Pó Ninho Original (150g)",
          quantidade: "150g",
          preco_unitario: 22.00,
          custo_proporcional: 8.25,
        },
        {
          item: "Nutella Pura Ferrero (180g)",
          quantidade: "180g",
          preco_unitario: 38.00,
          custo_proporcional: 13.68,
        },
        {
          item: "Leite Condensado e Creme de Leite",
          quantidade: "2 latas / 2 cx",
          preco_unitario: 21.00,
          custo_proporcional: 21.00,
        },
        {
          item: "Massa de Chocolate Fofinha",
          quantidade: "1 bolo 22cm",
          preco_unitario: 6.50,
          custo_proporcional: 6.50,
        },
        {
          item: "Prato Descartável com Tampa Alta G-50M",
          quantidade: "1 un",
          preco_unitario: 4.50,
          custo_proporcional: 4.50,
        },
      ],
      custo_total: 53.93,
      preco_sugerido: 120.00,
      margem_lucro: 55.1,
      lucro_bruto: 66.07,
      observacoes: "Ideal para encomendas de final de semana e pronta entrega no iFood / Cardápio Digital.",
    },
  },
];

export async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as BlogPost[];
    }
  } catch (err) {
    console.warn("[fetchPublishedBlogPosts] Erro ao buscar posts do Supabase, usando dados locais:", err);
  }

  return FALLBACK_BLOG_POSTS;
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      return data as BlogPost;
    }
  } catch (err) {
    console.warn(`[fetchBlogPostBySlug] Erro ao buscar post '${slug}', usando fallback:`, err);
  }

  const fallback = FALLBACK_BLOG_POSTS.find((p) => p.slug === slug);
  return fallback || null;
}
