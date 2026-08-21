-- ==============================================================================
-- CAIXADOCE - TABELA DE NOTINHAS VINCULADAS À LISTA DE COMPRAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.shopping_list_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_receipt_per_store UNIQUE (estabelecimento_codigo, receipt_id)
);

ALTER TABLE public.shopping_list_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em shopping_list_receipts para autenticados"
    ON public.shopping_list_receipts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
