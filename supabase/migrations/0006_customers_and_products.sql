-- ==============================================================================
-- CAIXADOCE - TABELAS DE CLIENTES (CUSTOMERS) E PRODUTOS (PRODUCTS)
-- ==============================================================================

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em customers para autenticados"
    ON public.customers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Tabela de Produtos / Cardápio
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    category TEXT NOT NULL DEFAULT 'Bolos Decorados',
    is_active BOOLEAN NOT NULL DEFAULT true,
    prep_time_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de produtos ativos"
    ON public.products FOR SELECT
    USING (true);

CREATE POLICY "Permitir tudo em products para autenticados"
    ON public.products FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Adicionar coluna itens_detalhes e cliente_id na tabela orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS itens_detalhes JSONB DEFAULT '[]'::jsonb;
