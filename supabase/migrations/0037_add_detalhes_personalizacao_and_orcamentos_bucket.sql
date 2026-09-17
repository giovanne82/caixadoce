-- ==============================================================================
-- Migration 0037: Assistente de Orçamento Personalizado
-- 1. Adiciona a coluna detalhes_personalizacao (JSONB) na tabela encomendas
-- 2. Criação e configuração do Bucket 'orcamentos-anexos' no Supabase Storage
-- 3. Políticas de Segurança (RLS) para Upload Anônimo/Público e Visualização
-- ==============================================================================

-- 1. Adiciona coluna JSONB na tabela de encomendas/orçamentos
ALTER TABLE public.encomendas 
ADD COLUMN IF NOT EXISTS detalhes_personalizacao JSONB;

CREATE INDEX IF NOT EXISTS idx_encomendas_detalhes_personalizacao 
ON public.encomendas USING gin (detalhes_personalizacao);

-- 2. Criação do Bucket 'orcamentos-anexos' no Supabase Storage (10MB max, imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orcamentos-anexos',
  'orcamentos-anexos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic'];

-- 3. Políticas de Segurança (RLS) para o bucket 'orcamentos-anexos'
-- Nota: RLS já vem habilitado por padrão em storage.objects no Supabase

-- 4. Política de INSERT (Upload): Permite que qualquer cliente (anônimo ou logado) envie fotos de inspiração
DROP POLICY IF EXISTS "Permitir upload publico em orcamentos-anexos" ON storage.objects;
CREATE POLICY "Permitir upload publico em orcamentos-anexos"
ON storage.objects
FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'orcamentos-anexos');

-- 5. Política de SELECT (Download/Visualização): Permite que clientes e confeiteiros vejam as fotos
DROP POLICY IF EXISTS "Permitir leitura publica em orcamentos-anexos" ON storage.objects;
CREATE POLICY "Permitir leitura publica em orcamentos-anexos"
ON storage.objects
FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'orcamentos-anexos');

-- 6. Política de DELETE/UPDATE: Permite que usuários autenticados gerenciem os arquivos
DROP POLICY IF EXISTS "Permitir gerenciamento por autenticados em orcamentos-anexos" ON storage.objects;
CREATE POLICY "Permitir gerenciamento por autenticados em orcamentos-anexos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'orcamentos-anexos')
WITH CHECK (bucket_id = 'orcamentos-anexos');
