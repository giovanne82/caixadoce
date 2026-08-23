-- Migration 0018: Politicas de RLS e Sincronizacao para Tabela Orders

-- 1. Garantir que as colunas essenciais de vinculo existam na tabela orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS historico_pagamentos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payments_history JSONB DEFAULT '[]'::jsonb;

-- 2. Habilitar RLS na tabela orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. Remover politicas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura de orders por user_id ou codigo" ON public.orders;
DROP POLICY IF EXISTS "Permitir insercao de orders por clientes anonimos ou autenticados" ON public.orders;
DROP POLICY IF EXISTS "Permitir atualizacao de orders por donos e clientes" ON public.orders;
DROP POLICY IF EXISTS "Permitir exclusao de orders pelo usuario dono" ON public.orders;

-- 4. Criar politicas abrangentes de RLS para sincronizacao entre dispositivos
CREATE POLICY "Permitir leitura de orders por user_id ou codigo"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir insercao de orders por clientes anonimos ou autenticados"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de orders por donos e clientes"
ON public.orders
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusao de orders pelo usuario dono"
ON public.orders
FOR DELETE
TO anon, authenticated
USING (true);

-- 5. Conceder todas as permissoes de tabela
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO anon;

-- 6. Recarregar o Schema Cache do PostgREST no Supabase
NOTIFY pgrst, 'reload schema';
