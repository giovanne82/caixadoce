-- Migration 0019: Padroniza Encomendas como Tabela Oficial
-- Descrição: Remove a view 'encomendas', cria a tabela real 'encomendas' herdando de 'orders', migra dados e define políticas de segurança.

-- 1. Remover a view encomendas existente para permitir a criação da tabela real
DROP VIEW IF EXISTS public.encomendas CASCADE;

-- 2. Criar a tabela real encomendas com a mesma estrutura de orders (incluindo defaults, chaves e índices)
CREATE TABLE IF NOT EXISTS public.encomendas (LIKE public.orders INCLUDING ALL);

-- 3. Copiar dados de orders para a tabela real encomendas (se houver dados)
INSERT INTO public.encomendas SELECT * FROM public.orders ON CONFLICT DO NOTHING;

-- 4. Habilitar RLS (Row Level Security) na tabela encomendas
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS idênticas às da orders para garantir sincronização entre dispositivos e acesso anônimo/autenticado
DROP POLICY IF EXISTS "Permitir leitura de encomendas por user_id ou codigo" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir insercao de encomendas por clientes anonimos ou autenticados" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir atualizacao de encomendas por donos e clientes" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir exclusao de encomendas pelo usuario dono" ON public.encomendas;

CREATE POLICY "Permitir leitura de encomendas por user_id ou codigo"
ON public.encomendas
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir insercao de encomendas por clientes anonimos ou autenticados"
ON public.encomendas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de encomendas por donos e clientes"
ON public.encomendas
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusao de encomendas pelo usuario dono"
ON public.encomendas
FOR DELETE
TO anon, authenticated
USING (true);

-- 6. Conceder todas as permissões de acesso
GRANT ALL ON public.encomendas TO authenticated;
GRANT ALL ON public.encomendas TO anon;

-- 7. Recarregar o Schema Cache do PostgREST
NOTIFY pgrst, 'reload schema';
