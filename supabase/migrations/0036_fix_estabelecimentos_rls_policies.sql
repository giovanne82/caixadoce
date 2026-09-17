-- ==============================================================================
-- MIGRATION 0036: CORREÇÃO DE POLÍTICAS RLS NA TABELA ESTABELECIMENTOS
-- ==============================================================================

ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS signature_data_url TEXT;

-- Habilitar RLS
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas/conflitantes
DROP POLICY IF EXISTS "estabelecimentos_select_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "estabelecimentos_update_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "estabelecimentos_insert_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "estabelecimentos_upsert_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Permitir leitura total em estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Permitir leitura publica de estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Permitir insercao e edicao pelo usuario dono" ON public.estabelecimentos;
DROP POLICY IF EXISTS "allow_all_estabelecimentos" ON public.estabelecimentos;

-- 1. Política de leitura: Permite leitura pública (cardápio e consulta de loja)
CREATE POLICY "estabelecimentos_select_policy" ON public.estabelecimentos
    FOR SELECT USING (true);

-- 2. Política de atualização: Permite se user_id = auth.uid(), ou se user_id IS NULL, ou se o usuário estiver autenticado
CREATE POLICY "estabelecimentos_update_policy" ON public.estabelecimentos
    FOR UPDATE USING (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'authenticated'
    ) WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'authenticated'
    );

-- 3. Política de inserção: Permite a qualquer usuário autenticado ou com user_id vinculado
CREATE POLICY "estabelecimentos_insert_policy" ON public.estabelecimentos
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'authenticated'
    );

-- Garantir privilégios
GRANT ALL ON TABLE public.estabelecimentos TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
