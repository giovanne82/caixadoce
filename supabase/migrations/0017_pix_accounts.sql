-- Migration 0017: Suporte a Multiplas Contas Pix e Nome do Favorecido

-- 1. Criar tabela auxiliar pix_accounts vinculada ao usuario
CREATE TABLE IF NOT EXISTS public.pix_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'email',
  chave TEXT NOT NULL,
  favorecido TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela pix_accounts
ALTER TABLE public.pix_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gerenciam suas proprias contas pix" ON public.pix_accounts;
CREATE POLICY "Usuarios gerenciam suas proprias contas pix"
ON public.pix_accounts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Leitura publica de contas pix para clientes" ON public.pix_accounts;
CREATE POLICY "Leitura publica de contas pix para clientes"
ON public.pix_accounts
FOR SELECT
TO anon, authenticated
USING (true);

-- Permissões de tabela para as roles authenticated e anon
GRANT ALL ON public.pix_accounts TO authenticated;
GRANT SELECT ON public.pix_accounts TO anon;

-- 2. Adicionar colunas JSONB na tabela estabelecimentos para retrocompatibilidade/fallback
ALTER TABLE public.estabelecimentos
ADD COLUMN IF NOT EXISTS pix_accounts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pix_keys JSONB DEFAULT '[]'::jsonb;

-- Recarregar o Schema Cache do PostgREST no Supabase
NOTIFY pgrst, 'reload schema';
