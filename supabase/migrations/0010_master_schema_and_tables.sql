-- ==============================================================================
-- CAIXADOCE - MASTER MIGRATION & SCHEMA CACHE RELOAD (0010)
-- ==============================================================================

-- 1. TABELA ESTABELECIMENTOS
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

-- 2. TABELA PERFIS
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    telefone TEXT,
    funcao TEXT DEFAULT 'admin',
    estabelecimento_codigo TEXT REFERENCES public.estabelecimentos(codigo) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA COLABORADORES
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    funcao TEXT NOT NULL DEFAULT 'operador',
    ativo BOOLEAN DEFAULT true NOT NULL,
    abas_permitidas JSONB DEFAULT '["dashboard", "financeiro"]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria TEXT NOT NULL,
    data TEXT NOT NULL,
    metodo_pagamento TEXT NOT NULL DEFAULT 'pix',
    status TEXT NOT NULL DEFAULT 'concluida',
    cliente_ou_fornecedor TEXT,
    observacoes TEXT,
    origem TEXT DEFAULT 'Manual',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA EXPENSES (DESPESAS / NOTAS FISCAIS)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    fornecedor_nome TEXT NOT NULL,
    fornecedor_endereco TEXT,
    numero_nota TEXT,
    numero_pedido TEXT,
    data_compra DATE NOT NULL,
    hora_compra TEXT,
    valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_producao NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_utensilios NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_consumo_proprio NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_outros NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    comprovante_url TEXT,
    metodo_pagamento TEXT DEFAULT 'pix',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA CUSTOMERS (CLIENTES)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA PRODUCTS (PRODUTOS / CARDÁPIO)
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
    availability_type TEXT DEFAULT 'immediate',
    available_days JSONB DEFAULT '["seg","ter","qua","qui","sex","sab","dom"]'::jsonb,
    min_lead_time_days INTEGER DEFAULT 1,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA ORDERS (ENCOMENDAS / PEDIDOS)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    cliente_nome TEXT NOT NULL,
    cliente_whatsapp TEXT NOT NULL,
    cliente_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    data_entrega DATE NOT NULL,
    horario_entrega TEXT NOT NULL DEFAULT '14:00',
    itens TEXT NOT NULL,
    itens_detalhes JSONB DEFAULT '[]'::jsonb,
    valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_entrada NUMERIC(10, 2) DEFAULT 0.00,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente',
    status TEXT NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    endereco_entrega TEXT,
    tipo_entrega TEXT DEFAULT 'retirada',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELA DATAS BLOQUEADAS
CREATE TABLE IF NOT EXISTS public.datas_bloqueadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    data DATE NOT NULL,
    motivo TEXT NOT NULL DEFAULT 'Agenda Lotada',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABELA SHOPPING LIST RECEIPTS
CREATE TABLE IF NOT EXISTS public.shopping_list_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_receipt_per_store UNIQUE (estabelecimento_codigo, receipt_id)
);

-- ==============================================================================
-- CRIAÇÃO DE ALIASES (VIEWS) PARA GARANTIR SUPORTE TANTO EM PORTUGUÊS QUANTO INGLÊS
-- ==============================================================================
CREATE OR REPLACE VIEW public.stores AS SELECT * FROM public.estabelecimentos;
CREATE OR REPLACE VIEW public.produtos AS SELECT * FROM public.products;
CREATE OR REPLACE VIEW public.clientes AS SELECT * FROM public.customers;
CREATE OR REPLACE VIEW public.encomendas AS SELECT * FROM public.orders;
CREATE OR REPLACE VIEW public.transacoes AS SELECT * FROM public.transacoes_financeiras;
CREATE OR REPLACE VIEW public.listas_compras AS SELECT * FROM public.shopping_list_receipts;

-- ==============================================================================
-- RLS (ROW LEVEL SECURITY) EM TODAS AS TABELAS
-- ==============================================================================
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datas_bloqueadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_receipts ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PERMISSIVAS PARA USUÁRIOS AUTENTICADOS (SEM CONFLITO OU ERRO 404)
DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_estabelecimentos" ON public.estabelecimentos FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_products" ON public.products FOR ALL USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_datas" ON public.datas_bloqueadas FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_transacoes" ON public.transacoes_financeiras FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "allow_all_shopping" ON public.shopping_list_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- FORÇAR RECARREGAMENTO DO SCHEMA CACHE DA API REST DO SUPABASE
NOTIFY pgrst, 'reload schema';
