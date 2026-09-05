-- Migration 0027: Adicionar coluna banner_url na tabela estabelecimentos
-- Resolve erro 400 (Bad Request: Could not find the 'banner_url' column)

ALTER TABLE public.estabelecimentos
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Recarregar o Schema Cache do PostgREST no Supabase imediatamente
NOTIFY pgrst, 'reload schema';
