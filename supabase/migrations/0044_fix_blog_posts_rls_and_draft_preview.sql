-- ==============================================================================
-- MIGRATION 0044: RLS para Visualização e Edição de Rascunhos do Blog
-- ==============================================================================

-- 1. Habilita RLS na tabela blog_posts se ainda não estiver habilitada
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza de políticas antigas
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can delete blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow select blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow all for authenticated blog_posts" ON public.blog_posts;

-- 3. Política de SELECT:
-- - Visitantes anônimos só conseguem ver posts com status 'published'
-- - Usuários autenticados (Admin/Dono) e service_role conseguem ver TODOS os posts (incluindo 'draft' para pré-visualização)
CREATE POLICY "Allow select blog_posts"
  ON public.blog_posts
  FOR SELECT
  USING (
    status = 'published'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );

-- 4. Políticas de Modificação (INSERT, UPDATE, DELETE):
-- Apenas usuários autenticados ou service_role podem criar, atualizar e excluir posts
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

-- 5. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
