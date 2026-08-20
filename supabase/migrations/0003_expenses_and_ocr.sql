-- ==============================================================================
-- CAIXADOCE - TABELA DE DESPESAS E SCANNER DE NOTAS FISCAIS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    fornecedor_nome TEXT NOT NULL,
    data_compra DATE NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_producao NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_utensilios NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_consumo_proprio NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_outros NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    comprovante_url TEXT,
    metodo_pagamento TEXT DEFAULT 'pix',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em expenses para usuarios autenticados"
    ON public.expenses FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
