-- ==============================================================================
-- CAIXADOCE - DROPAR VIEW E CRIAR TABELA FÍSICA LISTAS_COMPRAS (0012)
-- ==============================================================================

-- 1. DROPAR VIEW ANTERIOR LISTAS_COMPRAS SE EXISTIR (Evita erro 42809)
DROP VIEW IF EXISTS public.listas_compras CASCADE;

-- 2. CRIAR A TABELA FÍSICA LISTAS_COMPRAS
CREATE TABLE IF NOT EXISTS public.listas_compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT,
    codigo TEXT,
    store_id TEXT,
    nome TEXT NOT NULL DEFAULT 'Lista de Compras',
    name TEXT DEFAULT 'Lista de Compras',
    data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'pendente',
    itens JSONB DEFAULT '[]'::jsonb,
    valor_estimado NUMERIC(10, 2) DEFAULT 0.00,
    comprovante_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Garantir todas as colunas essenciais
ALTER TABLE public.listas_compras
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS nome TEXT DEFAULT 'Lista de Compras',
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Lista de Compras',
ADD COLUMN IF NOT EXISTS data TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Atualização segura de aliases entre colunas
UPDATE public.listas_compras SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.listas_compras SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.listas_compras SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);
UPDATE public.listas_compras SET name = COALESCE(name, nome);
UPDATE public.listas_compras SET nome = COALESCE(nome, name);

-- 3. CRIAR VIEW SHOPPING_LISTS (ALIAS)
CREATE OR REPLACE VIEW public.shopping_lists AS SELECT * FROM public.listas_compras;

-- 4. GARANTIR COLUNAS NA TABELA EXPENSES
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT;

UPDATE public.expenses SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.expenses SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.expenses SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);

-- 5. HABILITAR RLS COM POLÍTICA AMPLA
ALTER TABLE public.listas_compras ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN EXECUTE 'CREATE POLICY "allow_all_listas_compras" ON public.listas_compras FOR ALL USING (true) WITH CHECK (true)'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 6. RECARREGAR CACHE DE SCHEMA NA API REST DO SUPABASE
NOTIFY pgrst, 'reload schema';
