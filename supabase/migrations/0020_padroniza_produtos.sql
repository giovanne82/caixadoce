-- Migration 0020: Padroniza Produtos como Tabela Oficial
-- Descrição: Remove a view 'produtos', cria a tabela real 'produtos' com suporte duplo a colunas em português/inglês, migra dados e define políticas RLS.

-- 1. Remover a view produtos existente para permitir a criação da tabela física
DROP VIEW IF EXISTS public.produtos CASCADE;

-- 2. Criar a tabela real produtos com a mesma estrutura base de products
CREATE TABLE IF NOT EXISTS public.produtos (LIKE public.products INCLUDING ALL);

-- 3. Adicionar colunas em português e suporte a aliases para evitar erros de schema cache
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS nome TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Bolos Decorados',
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tempo_preparo_horas INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS tipo_disponibilidade TEXT DEFAULT 'immediate',
ADD COLUMN IF NOT EXISTS dias_disponiveis JSONB DEFAULT '["seg","ter","qua","qui","sex","sab","dom"]'::jsonb,
ADD COLUMN IF NOT EXISTS antecedencia_minima_dias INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Copiar dados de products para produtos se houver registros
INSERT INTO public.produtos SELECT * FROM public.products ON CONFLICT DO NOTHING;

-- Sincronizar aliases de colunas em português/inglês se já houver dados
UPDATE public.produtos SET nome = COALESCE(nome, name);
UPDATE public.produtos SET name = COALESCE(name, nome);
UPDATE public.produtos SET descricao = COALESCE(descricao, description);
UPDATE public.produtos SET description = COALESCE(description, descricao);
UPDATE public.produtos SET preco = COALESCE(preco, price);
UPDATE public.produtos SET price = COALESCE(price, preco);
UPDATE public.produtos SET foto_url = COALESCE(foto_url, image_url);
UPDATE public.produtos SET image_url = COALESCE(image_url, foto_url);
UPDATE public.produtos SET categoria = COALESCE(categoria, category);
UPDATE public.produtos SET category = COALESCE(category, categoria);
UPDATE public.produtos SET ativo = COALESCE(ativo, is_active);
UPDATE public.produtos SET is_active = COALESCE(is_active, ativo);
UPDATE public.produtos SET tempo_preparo_horas = COALESCE(tempo_preparo_horas, prep_time_hours);
UPDATE public.produtos SET prep_time_hours = COALESCE(prep_time_hours, tempo_preparo_horas);
UPDATE public.produtos SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.produtos SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);

-- 5. Habilitar RLS (Row Level Security) na tabela produtos
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de RLS para sincronização e acesso público (anon / authenticated)
DROP POLICY IF EXISTS "Permitir leitura de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir insercao de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir atualizacao de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir exclusao de produtos" ON public.produtos;

CREATE POLICY "Permitir leitura de produtos"
ON public.produtos
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir insercao de produtos"
ON public.produtos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de produtos"
ON public.produtos
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusao de produtos"
ON public.produtos
FOR DELETE
TO anon, authenticated
USING (true);

-- 7. Conceder todas as permissões de acesso
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO anon;

-- 8. Recarregar o Schema Cache do PostgREST
NOTIFY pgrst, 'reload schema';
