-- Migration 0020: Padroniza Produtos como Tabela Oficial (Execução 100% Segura)
-- Descrição: Remove a view 'produtos', cria a tabela real 'produtos', garante TODAS as colunas (PT/EN), migra dados e aplica políticas RLS.

-- 1. Remover a view 'produtos' existente para permitir a criação da tabela física
DROP VIEW IF EXISTS public.produtos CASCADE;

-- 2. Criar a tabela real 'produtos' baseada na tabela 'products' (se existir) ou criar do zero se não existir
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Adicionar TODAS as colunas possíveis (em Português e Inglês) para evitar erro 42703 (coluna inexistente)
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

-- 4. Copiar dados da tabela 'products' para 'produtos' se a tabela 'products' existir
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        INSERT INTO public.produtos (
            id, estabelecimento_codigo, codigo, store_id,
            nome, name, descricao, description,
            preco, price, foto_url, image_url,
            categoria, category, ativo, is_active,
            tempo_preparo_horas, prep_time_hours, user_id, created_at
        )
        SELECT 
            id, 
            estabelecimento_codigo, 
            estabelecimento_codigo AS codigo, 
            estabelecimento_codigo AS store_id,
            name AS nome, 
            name, 
            description AS descricao, 
            description,
            price AS preco, 
            price, 
            image_url AS foto_url, 
            image_url,
            category AS categoria, 
            category, 
            is_active AS ativo, 
            is_active,
            prep_time_hours AS tempo_preparo_horas, 
            prep_time_hours, 
            user_id, 
            created_at
        FROM public.products
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 5. Sincronizar os valores das colunas equivalentes (PT e EN)
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

-- 7. Criar políticas de RLS para leitura pública e escrita (anon / authenticated)
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
