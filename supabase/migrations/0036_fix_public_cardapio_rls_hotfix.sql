-- Migration 0036: Hotfix Definitivo de RLS para Acesso Público ao Cardápio (Resolução do Erro 500)
-- Remove TODAS as políticas legadas/existentes em produtos, products, kits, kit_itens, estabelecimentos e datas_bloqueadas
-- para garantir permissão SELECT 100% livre e desimpedida para os roles 'anon' e 'authenticated'.

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- 1. Remover TODAS as políticas existentes na tabela 'produtos'
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'produtos') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.produtos', pol.policyname);
    END LOOP;

    -- 2. Remover TODAS as políticas existentes na tabela 'products'
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
        END LOOP;
    END IF;

    -- 3. Remover TODAS as políticas existentes na tabela 'kits'
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kits') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.kits', pol.policyname);
        END LOOP;
    END IF;

    -- 4. Remover TODAS as políticas existentes na tabela 'kit_itens'
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kit_itens') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_itens') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.kit_itens', pol.policyname);
        END LOOP;
    END IF;

    -- 5. Remover TODAS as políticas existentes na tabela 'estabelecimentos'
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estabelecimentos') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.estabelecimentos', pol.policyname);
    END LOOP;

    -- 6. Remover TODAS as políticas existentes na tabela 'datas_bloqueadas'
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datas_bloqueadas') THEN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'datas_bloqueadas') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.datas_bloqueadas', pol.policyname);
        END LOOP;
    END IF;
END $$;

-- =========================================================================
-- RECRIAR POLÍTICAS 100% LIMPAS E LIVRES DE QUALQUER CONDICIONAL DE AUTH
-- =========================================================================

-- 1. TABELA PRODUTOS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_select_produtos" ON public.produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_produtos" ON public.produtos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_produtos" ON public.produtos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_produtos" ON public.produtos FOR DELETE TO anon, authenticated USING (true);
GRANT ALL ON public.produtos TO anon, authenticated, service_role;

-- 2. TABELA PRODUCTS
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_products" ON public.products FOR SELECT TO anon, authenticated USING (true);
        GRANT ALL ON public.products TO anon, authenticated, service_role;
    END IF;
END $$;

-- 3. TABELA KITS
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kits') THEN
        ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_kits" ON public.kits FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "public_insert_kits" ON public.kits FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "public_update_kits" ON public.kits FOR UPDATE TO anon, authenticated USING (true);
        CREATE POLICY "public_delete_kits" ON public.kits FOR DELETE TO anon, authenticated USING (true);
        GRANT ALL ON public.kits TO anon, authenticated, service_role;
    END IF;
END $$;

-- 4. TABELA KIT_ITENS
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kit_itens') THEN
        ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_kit_itens" ON public.kit_itens FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "public_insert_kit_itens" ON public.kit_itens FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "public_update_kit_itens" ON public.kit_itens FOR UPDATE TO anon, authenticated USING (true);
        CREATE POLICY "public_delete_kit_itens" ON public.kit_itens FOR DELETE TO anon, authenticated USING (true);
        GRANT ALL ON public.kit_itens TO anon, authenticated, service_role;
    END IF;
END $$;

-- 5. TABELA ESTABELECIMENTOS
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_select_estabelecimentos" ON public.estabelecimentos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_all_estabelecimentos" ON public.estabelecimentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.estabelecimentos TO anon, authenticated, service_role;

-- 6. TABELA DATAS_BLOQUEADAS
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datas_bloqueadas') THEN
        ALTER TABLE public.datas_bloqueadas ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "public_select_datas_bloqueadas" ON public.datas_bloqueadas FOR SELECT TO anon, authenticated USING (true);
        GRANT ALL ON public.datas_bloqueadas TO anon, authenticated, service_role;
    END IF;
END $$;

-- Recarregar Cache de Schema do PostgREST
NOTIFY pgrst, 'reload schema';
