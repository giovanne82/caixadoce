-- ==============================================================================
-- Migração: Permitir Leitura Pública de Artigos (Incluindo Rascunhos para Testes)
-- ==============================================================================

-- Atualiza a política de SELECT para permitir a leitura pública de todos os posts da tabela
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view all blog posts" ON public.blog_posts;

CREATE POLICY "Public can view all blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (true);
