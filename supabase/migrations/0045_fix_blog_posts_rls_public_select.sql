-- ==============================================================================
-- MIGRATION 0045: RLS Totalmente Seguro & Tolerante a Status do Blog (Case-Insensitive)
-- ==============================================================================

-- 1. Habilita RLS na tabela blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza de políticas anteriores
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can delete blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow select blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow all for authenticated blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow insert for authenticated blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow update for authenticated blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow delete for authenticated blog_posts" ON public.blog_posts;

-- 3. Política de SELECT:
-- - Visitantes anônimos (anon) conseguem ler qualquer post publicado (published, publicado, publish, etc. case-insensitive)
-- - Usuários autenticados (admin/dono) e service_role conseguem ver TODOS os posts (incluindo rascunhos)
CREATE POLICY "Allow select blog_posts"
  ON public.blog_posts
  FOR SELECT
  USING (
    LOWER(status) IN ('published', 'publicado', 'publish', 'ativo', 'active')
    OR auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );

-- 4. Políticas de Modificação (INSERT, UPDATE, DELETE):
CREATE POLICY "Allow insert for authenticated blog_posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Allow update for authenticated blog_posts"
  ON public.blog_posts
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Allow delete for authenticated blog_posts"
  ON public.blog_posts
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );

-- 5. Normaliza status existentes na tabela para minúsculas 'published' se estavam como 'publicado' ou 'Published'
UPDATE public.blog_posts
SET status = 'published'
WHERE LOWER(status) IN ('published', 'publicado', 'publish', 'ativo');

-- 6. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
