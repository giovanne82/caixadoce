-- ==============================================================================
-- Migração 0029: Adicionar coluna opcoes (JSONB) na tabela produtos
-- ==============================================================================

ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS opcoes JSONB DEFAULT '[]'::jsonb;
