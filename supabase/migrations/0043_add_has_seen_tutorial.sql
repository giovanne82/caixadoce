-- ==============================================================================
-- MIGRATION 0043: Persistência Cross-Device do Tutorial de Onboarding
-- ==============================================================================

-- 1. Adiciona a coluna has_seen_tutorial na tabela estabelecimentos
ALTER TABLE public.estabelecimentos 
ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT false NOT NULL;

-- 2. Adiciona a coluna has_seen_tutorial na tabela perfis caso ela exista
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'perfis') THEN
        ALTER TABLE public.perfis 
        ADD COLUMN IF NOT EXISTS has_seen_tutorial BOOLEAN DEFAULT false NOT NULL;
    END IF;
END $$;

-- 3. Atualiza as políticas de RLS para permitir atualização do campo
NOTIFY pgrst, 'reload schema';
