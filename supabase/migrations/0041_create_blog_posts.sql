-- ==============================================================================
-- Migração: Criação da Tabela de Blog Posts com Simulação de Custos e RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  cost_simulation JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  cover_image TEXT,
  category TEXT DEFAULT 'Receitas Lucrativas',
  reading_time TEXT DEFAULT '5 min de leitura',
  author TEXT DEFAULT 'Equipe CaixaDoce',
  excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para consultas rápidas por slug e status
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts(created_at DESC);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 1. Qualquer visitante público pode ler posts que estão 'published'
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- 2. Administradores autenticados e service_role podem gerenciar todos os posts
DROP POLICY IF EXISTS "Authenticated users can insert blog posts" ON public.blog_posts;
CREATE POLICY "Authenticated users can insert blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can update blog posts" ON public.blog_posts;
CREATE POLICY "Authenticated users can update blog posts"
  ON public.blog_posts
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can delete blog posts" ON public.blog_posts;
CREATE POLICY "Authenticated users can delete blog posts"
  ON public.blog_posts
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Inserção de posts semente caso a tabela esteja vazia
INSERT INTO public.blog_posts (title, slug, content, cost_simulation, status, cover_image, category, reading_time, author, excerpt)
VALUES 
(
  'Bolo Bentô Cake Viral 2026: Receita Passo a Passo e Precificação Real',
  'bolo-bento-cake-viral-2026',
  '# Bento Cake Tendência 2026: O Mini Bolo que Vende Todo Santo Dia

Os mini bolos com mensagens personalizadas (Bento Cakes) continuam sendo uma das maiores febres da confeitaria artesanal. Além de terem altíssima procura para aniversários de namoro, memes e datas comemorativas, eles possuem uma das margens de lucro mais atrativas do mercado!

---

### Por que o Bentô Cake é tão lucrativo?
1. **Baixo desperdício de insumos:** As porções de 350g a 500g utilizam formas de 10cm, facilitando o assamento em lotes.
2. **Alto valor percebido:** A personalização com frases criativas e desenhos eleva o preço de venda de R$ 35 a R$ 60 por unidade.
3. **Decoração rápida:** O acabamento em chantilly estabilizado ou chantininho é simples e rápido de produzir em grande escala.

---

### Ingredientes da Massa Fofinha e Estruturada:
- 3 ovos médios em temperatura ambiente
- 150g de açúcar refinado
- 120ml de leite integral morno
- 60ml de óleo de girassol ou milho
- 180g de farinha de trigo peneirada
- 10g de fermento químico em pó
- 1 colher de chá de essência de baunilha

---

### Modo de Preparo:
1. **Massa:** Bata os ovos com o açúcar na batedeira até obter um creme fofo e esbranquiçado (cerca de 5 minutos).
2. **Líquidos:** Diminua a velocidade da batedeira e adicione o óleo e o leite morno aos poucos.
3. **Secos:** Desligue a batedeira e incorpore a farinha peneirada delicadamente com um fouet, de baixo para cima. Adicione o fermento por último.
4. **Forno:** Distribua em 3 forminhas de 10cm untadas e asse em forno pré-aquecido a 180°C por cerca de 25 a 30 minutos.
5. **Montagem:** Recheie com brigadeiro cremoso e cubra com chantilly estabilizado, finalizando com a embalagem lancheira de bagaço de cana ou isopor.',
  '{
    "rendimento": "3 Bentô Cakes de 350g",
    "tempo_preparo": "1h 20min",
    "ingredientes": [
      { "item": "Puratos Norcau Chantilly 1L", "quantidade": "400ml", "preco_unitario": 16.90, "custo_proporcional": 6.76 },
      { "item": "Leite Condensado 395g", "quantidade": "1 lata", "preco_unitario": 6.80, "custo_proporcional": 6.80 },
      { "item": "Creme de Leite 200g", "quantidade": "1 cx", "preco_unitario": 3.90, "custo_proporcional": 3.90 },
      { "item": "Farinha, ovos, açúcar e fermento", "quantidade": "1 receita", "preco_unitario": 5.40, "custo_proporcional": 5.40 },
      { "item": "Embalagens Bentô Box + Velas (3 un)", "quantidade": "3 un", "preco_unitario": 6.00, "custo_proporcional": 6.00 }
    ],
    "custo_total": 28.86,
    "preco_sugerido": 105.00,
    "margem_lucro": 72.5,
    "lucro_bruto": 76.14,
    "observacoes": "Custo de R$ 9,62 por bentô cake completo com embalagem. Preço sugerido de venda: R$ 35,00 por unidade."
  }'::jsonb,
  'published',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
  'Receitas Virais',
  '4 min de leitura',
  'Chef Giovanna Confeitaria',
  'Aprenda a receita secreta da massa estruturada e veja o cálculo exato do custo e margem de lucro do mini bolo mais vendido do Brasil.'
)
ON CONFLICT (slug) DO NOTHING;
