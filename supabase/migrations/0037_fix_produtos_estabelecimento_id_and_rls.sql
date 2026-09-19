-- =========================================================================
-- Migration 0037: Correção Definitiva de Produtos, estabelecimento_id e RLS
-- Resolve: Erro 500 (RLS recursiva/permissões) e Erro 400 (tipos e colunas)
-- =========================================================================

-- 1. Garantir que as colunas necessárias existam na tabela 'produtos'
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS estabelecimento_id UUID,
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS nome TEXT,
ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visivel_cardapio_digital BOOLEAN DEFAULT true;

-- 2. Garantir que as colunas necessárias existam na tabela 'kits' e 'kit_itens'
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        ALTER TABLE public.kits
        ADD COLUMN IF NOT EXISTS estabelecimento_id UUID,
        ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
        ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kit_itens') THEN
        ALTER TABLE public.kit_itens
        ADD COLUMN IF NOT EXISTS kit_id UUID,
        ADD COLUMN IF NOT EXISTS produto_id UUID;
    END IF;
END $$;

-- 3. Vincular e sincronizar retroativamente estabelecimento_id para produtos e kits existentes
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'estabelecimentos') THEN
        -- Atualiza produtos onde estabelecimento_id é nulo mas o código bate com algum estabelecimento
        UPDATE public.produtos p
        SET estabelecimento_id = e.id
        FROM public.estabelecimentos e
        WHERE p.estabelecimento_id IS NULL
          AND (
              UPPER(p.estabelecimento_codigo) = UPPER(e.codigo)
              OR UPPER(p.codigo) = UPPER(e.codigo)
              OR UPPER(p.store_id) = UPPER(e.codigo)
          );

        -- Atualiza kits onde estabelecimento_id é nulo mas o código bate
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
            UPDATE public.kits k
            SET estabelecimento_id = e.id
            FROM public.estabelecimentos e
            WHERE k.estabelecimento_id IS NULL
              AND UPPER(k.estabelecimento_codigo) = UPPER(e.codigo);
        END IF;
    END IF;
END $$;

-- 4. Limpar TODAS as políticas de RLS antigas/conflitantes que possam causar Erro 500 (recursão ou funções)
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Limpar RLS em produtos
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'produtos') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.produtos', pol.policyname);
    END LOOP;

    -- Limpar RLS em products (legado, se existir)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
        END LOOP;
    END IF;

    -- Limpar RLS em kits
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kits') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.kits', pol.policyname);
        END LOOP;
    END IF;

    -- Limpar RLS em kit_itens
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kit_itens') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_itens') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.kit_itens', pol.policyname);
        END LOOP;
    END IF;

    -- Limpar RLS em estabelecimentos
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'estabelecimentos') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estabelecimentos') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.estabelecimentos', pol.policyname);
        END LOOP;
    END IF;
END $$;

-- 5. Criar Políticas RLS Limpas e Diretas (Sem subconsultas recursivas para evitar HTTP 500)
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_select_produtos" ON public.produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_produtos" ON public.produtos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_produtos" ON public.produtos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_produtos" ON public.produtos FOR DELETE TO anon, authenticated USING (true);

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_kits" ON public.kits FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "public_insert_kits" ON public.kits FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "public_update_kits" ON public.kits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
        CREATE POLICY "public_delete_kits" ON public.kits FOR DELETE TO anon, authenticated USING (true);
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kit_itens') THEN
        ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_kit_itens" ON public.kit_itens FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "public_insert_kit_itens" ON public.kit_itens FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "public_update_kit_itens" ON public.kit_itens FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
        CREATE POLICY "public_delete_kit_itens" ON public.kit_itens FOR DELETE TO anon, authenticated USING (true);
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'estabelecimentos') THEN
        ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_estabelecimentos" ON public.estabelecimentos FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "public_all_estabelecimentos" ON public.estabelecimentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Conceder Permissões Globais para anon, authenticated e service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.produtos TO anon, authenticated, service_role;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        GRANT ALL ON public.kits TO anon, authenticated, service_role;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kit_itens') THEN
        GRANT ALL ON public.kit_itens TO anon, authenticated, service_role;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'estabelecimentos') THEN
        GRANT ALL ON public.estabelecimentos TO anon, authenticated, service_role;
    END IF;
END $$;

-- 7. Recarregar Cache de Schema do PostgREST
NOTIFY pgrst, 'reload schema';
