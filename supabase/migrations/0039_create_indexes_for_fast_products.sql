-- =========================================================================
-- Migration 0039: Índices B-Tree de Alta Performance e Otimização do Planejador
-- Elimina de vez o 'statement timeout' e faz as consultas responderem em milissegundos
-- =========================================================================

-- 1. Criar índices na tabela produtos
CREATE INDEX IF NOT EXISTS idx_produtos_estabelecimento_id ON public.produtos (estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_produtos_estabelecimento_codigo ON public.produtos (estabelecimento_codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos (codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos (ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_visivel_cardapio ON public.produtos (visivel_cardapio_digital);
CREATE INDEX IF NOT EXISTS idx_produtos_filtro_cardapio ON public.produtos (estabelecimento_id, ativo, visivel_cardapio_digital);

-- 2. Criar índices na tabela estabelecimentos
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_id ON public.estabelecimentos (id);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_codigo ON public.estabelecimentos (codigo);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_slug ON public.estabelecimentos (slug);

-- 3. Criar índices na tabela kits
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        CREATE INDEX IF NOT EXISTS idx_kits_estabelecimento_id ON public.kits (estabelecimento_id);
        CREATE INDEX IF NOT EXISTS idx_kits_estabelecimento_codigo ON public.kits (estabelecimento_codigo);
        CREATE INDEX IF NOT EXISTS idx_kits_ativo ON public.kits (ativo);
    END IF;
END $$;

-- 4. Atualizar estatísticas do planejador do PostgreSQL (compatível com transações)
ANALYZE public.produtos;
ANALYZE public.estabelecimentos;

-- 5. Recarregar Schema Cache
NOTIFY pgrst, 'reload schema';
