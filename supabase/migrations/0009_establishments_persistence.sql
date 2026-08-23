-- ==============================================================================
-- MIGRATION 0009: PERSISTÊNCIA E RLS DA TABELA ESTABELECIMENTOS (STORES)
-- ==============================================================================

-- 1. Criação ou Atualização da Tabela de Estabelecimentos
CREATE TABLE IF NOT EXISTS public.estabelecimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    responsavel TEXT,
    tipo_documento TEXT DEFAULT 'CNPJ',
    numero_documento TEXT,
    tipo_chave_pix TEXT DEFAULT 'email',
    chave_pix TEXT,
    cep TEXT,
    endereco TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    logo_url TEXT,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir constraint de unicidade no user_id se a tabela já existia
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'estabelecimentos_user_id_key'
    ) THEN
        ALTER TABLE public.estabelecimentos ADD CONSTRAINT estabelecimentos_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. Habilitação de Row Level Security (RLS)
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "estabelecimentos_select_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "estabelecimentos_upsert_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Permitir leitura publica de estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Permitir insercao e edicao pelo usuario dono" ON public.estabelecimentos;

-- 3. Política de Leitura (SELECT): Usuário lê sua própria loja ou consulta pública por código
CREATE POLICY "estabelecimentos_select_policy" ON public.estabelecimentos
    FOR SELECT USING (
        auth.uid() = user_id OR user_id IS NULL OR codigo IS NOT NULL
    );

-- 4. Política de Inserção / Edição (UPSERT): Autenticado apenas na sua própria loja (user_id = auth.uid())
CREATE POLICY "estabelecimentos_upsert_policy" ON public.estabelecimentos
    FOR ALL USING (
        auth.uid() = user_id OR user_id IS NULL
    ) WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL
    );
