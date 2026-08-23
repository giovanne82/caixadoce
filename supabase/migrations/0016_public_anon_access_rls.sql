-- Migration 0016: Habilitar Acesso Público RLS para Clientes (role 'anon')
-- Execute este script no Supabase SQL Editor para liberar a leitura do cardapio sem login

-- 1. Habilitar RLS e criar politica de leitura publica na tabela estabelecimentos
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de estabelecimentos" ON public.estabelecimentos;
CREATE POLICY "Permitir leitura publica de estabelecimentos"
ON public.estabelecimentos
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Habilitar RLS e criar politica de leitura publica na tabela products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de produtos" ON public.products;
CREATE POLICY "Permitir leitura publica de produtos"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Habilitar RLS e criar politica de leitura publica na tabela datas_bloqueadas
ALTER TABLE public.datas_bloqueadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de datas bloqueadas" ON public.datas_bloqueadas;
CREATE POLICY "Permitir leitura publica de datas bloqueadas"
ON public.datas_bloqueadas
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Habilitar RLS e permitir insercao publica de pedidos na tabela orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir clientes criarem pedidos publicos" ON public.orders;
CREATE POLICY "Permitir clientes criarem pedidos publicos"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura publica de pedidos" ON public.orders;
CREATE POLICY "Permitir leitura publica de pedidos"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

-- Conceder permissoes explicitas para o role anon
GRANT SELECT ON public.estabelecimentos TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.datas_bloqueadas TO anon, authenticated;
GRANT INSERT, SELECT ON public.orders TO anon, authenticated;

-- Recarregar o Schema Cache do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
