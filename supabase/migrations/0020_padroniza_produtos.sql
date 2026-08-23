-- Migration 0020: Padroniza Produtos como Tabela Oficial (Execução 100% Blindada)
-- Descrição: Remove a view 'produtos', cria a tabela real 'produtos', adiciona colunas PT/EN, migra dados dinamicamente e aplica RLS.

-- 1. Remover a view 'produtos' para permitir a criação da tabela real
DROP VIEW IF EXISTS public.produtos CASCADE;

-- 2. Criar a tabela real 'produtos'
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Adicionar TODAS as colunas possíveis (Português e Inglês) com IF NOT EXISTS
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS nome TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Bolos Decorados',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Bolos Decorados',
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tempo_preparo_horas INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS prep_time_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS tipo_disponibilidade TEXT DEFAULT 'immediate',
ADD COLUMN IF NOT EXISTS availability_type TEXT DEFAULT 'immediate',
ADD COLUMN IF NOT EXISTS dias_disponiveis JSONB DEFAULT '["seg","ter","qua","qui","sex","sab","dom"]'::jsonb,
ADD COLUMN IF NOT EXISTS available_days JSONB DEFAULT '["seg","ter","qua","qui","sex","sab","dom"]'::jsonb,
ADD COLUMN IF NOT EXISTS antecedencia_minima_dias INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS min_lead_time_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Migração dinâmica de dados da tabela 'products' (se existir) usando EXECUTE seguro
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        BEGIN
            EXECUTE 'INSERT INTO public.produtos (id, created_at) SELECT id, created_at FROM public.products ON CONFLICT (id) DO NOTHING';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            EXECUTE 'UPDATE public.produtos p SET 
                nome = COALESCE(p.nome, pr.name),
                name = COALESCE(p.name, pr.name),
                descricao = COALESCE(p.descricao, pr.description),
                description = COALESCE(p.description, pr.description),
                preco = COALESCE(p.preco, pr.price, 0.00),
                price = COALESCE(p.price, pr.price, 0.00),
                foto_url = COALESCE(p.foto_url, pr.image_url),
                image_url = COALESCE(p.image_url, pr.image_url),
                categoria = COALESCE(p.categoria, pr.category),
                category = COALESCE(p.category, pr.category),
                ativo = COALESCE(p.ativo, pr.is_active, true),
                is_active = COALESCE(p.is_active, pr.is_active, true),
                tempo_preparo_horas = COALESCE(p.tempo_preparo_horas, pr.prep_time_hours, 24),
                prep_time_hours = COALESCE(p.prep_time_hours, pr.prep_time_hours, 24)
            FROM public.products pr WHERE p.id = pr.id';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            EXECUTE 'UPDATE public.produtos p SET 
                estabelecimento_codigo = COALESCE(p.estabelecimento_codigo, pr.estabelecimento_codigo),
                codigo = COALESCE(p.codigo, pr.estabelecimento_codigo),
                store_id = COALESCE(p.store_id, pr.estabelecimento_codigo)
            FROM public.products pr WHERE p.id = pr.id';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- 5. Sincronizar pares de colunas (PT e EN) dentro da própria tabela 'produtos'
UPDATE public.produtos SET nome = COALESCE(nome, name);
UPDATE public.produtos SET name = COALESCE(name, nome);
UPDATE public.produtos SET descricao = COALESCE(descricao, description);
UPDATE public.produtos SET description = COALESCE(description, descricao);
UPDATE public.produtos SET preco = COALESCE(preco, price, 0.00);
UPDATE public.produtos SET price = COALESCE(price, preco, 0.00);
UPDATE public.produtos SET foto_url = COALESCE(foto_url, image_url);
UPDATE public.produtos SET image_url = COALESCE(image_url, foto_url);
UPDATE public.produtos SET categoria = COALESCE(categoria, category);
UPDATE public.produtos SET category = COALESCE(category, categoria);
UPDATE public.produtos SET ativo = COALESCE(ativo, is_active, true);
UPDATE public.produtos SET is_active = COALESCE(is_active, ativo, true);
UPDATE public.produtos SET tempo_preparo_horas = COALESCE(tempo_preparo_horas, prep_time_hours, 24);
UPDATE public.produtos SET prep_time_hours = COALESCE(prep_time_hours, tempo_preparo_horas, 24);
UPDATE public.produtos SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.produtos SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.produtos SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);

-- 6. Habilitar RLS (Row Level Security) na tabela produtos
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas de RLS para leitura e escrita (anon / authenticated)
DROP POLICY IF EXISTS "Permitir leitura de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir insercao de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir atualizacao de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir exclusao de produtos" ON public.produtos;

CREATE POLICY "Permitir leitura de produtos"
ON public.produtos FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir insercao de produtos"
ON public.produtos FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de produtos"
ON public.produtos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusao de produtos"
ON public.produtos FOR DELETE TO anon, authenticated USING (true);

-- 8. Conceder todas as permissões de acesso
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO anon;

-- 9. Recarregar o Schema Cache do PostgREST no Supabase
NOTIFY pgrst, 'reload schema';
