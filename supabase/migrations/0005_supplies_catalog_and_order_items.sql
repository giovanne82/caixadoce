-- ==============================================================================
-- CAIXADOCE - CATÁLOGO DE INSUMOS (ARTFESTA) E INSUMOS POR ENCOMENDA
-- ==============================================================================

-- 1. Tabela de Catálogo de Insumos
CREATE TABLE IF NOT EXISTS public.supplies_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Outros Insumos',
    marca TEXT,
    unidade_padrao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.supplies_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em supplies_catalog para autenticados"
    ON public.supplies_catalog FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Adicionar coluna insumos_necessarios na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS insumos_necessarios JSONB DEFAULT '[]'::jsonb;

-- 3. Adicionar colunas de metadados fiscais na tabela expenses
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS hora_compra TEXT,
ADD COLUMN IF NOT EXISTS numero_nota TEXT,
ADD COLUMN IF NOT EXISTS numero_pedido TEXT,
ADD COLUMN IF NOT EXISTS fornecedor_endereco TEXT;
