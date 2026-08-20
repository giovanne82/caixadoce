-- ==============================================================================
-- CAIXADOCE - SCHEMA INICIAL DO BANCO DE DADOS SUPABASE
-- ==============================================================================

-- 1. Tabela de Estabelecimentos / Unidades
CREATE TABLE IF NOT EXISTS public.estabelecimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    endereco TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    tipo_documento TEXT DEFAULT 'CNPJ',
    numero_documento TEXT,
    chave_pix TEXT,
    tipo_chave_pix TEXT DEFAULT 'email',
    responsavel TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    logo_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    telefone TEXT,
    funcao TEXT DEFAULT 'admin' CHECK (funcao IN ('admin', 'gerente', 'operador')),
    estabelecimento_codigo TEXT REFERENCES public.estabelecimentos(codigo) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Colaboradores / Membros da Equipe
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    funcao TEXT NOT NULL DEFAULT 'operador' CHECK (funcao IN ('admin', 'gerente', 'operador')),
    ativo BOOLEAN DEFAULT true NOT NULL,
    abas_permitidas JSONB DEFAULT '["dashboard", "financeiro"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Transações Financeiras (Fluxo de Caixa & Vendas)
CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria TEXT NOT NULL,
    data TEXT NOT NULL,
    metodo_pagamento TEXT NOT NULL DEFAULT 'pix' CHECK (metodo_pagamento IN ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'boleto')),
    status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'pendente', 'cancelada')),
    cliente_ou_fornecedor TEXT,
    observacoes TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Assinaturas e Stripe
CREATE TABLE IF NOT EXISTS public.assinaturas_stripe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plano_id TEXT NOT NULL DEFAULT 'pro',
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'ativo', 'pendente', 'cancelado', 'expirado')),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_renovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_stripe ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Permissivas para Usuários Autenticados
CREATE POLICY "Permitir leitura para autenticados em estabelecimentos"
    ON public.estabelecimentos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção e edição em estabelecimentos"
    ON public.estabelecimentos FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo em perfis para o próprio usuário"
    ON public.perfis FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir tudo em transações financeiras para autenticados"
    ON public.transacoes_financeiras FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo em colaboradores para autenticados"
    ON public.colaboradores FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir leitura de assinaturas para autenticados"
    ON public.assinaturas_stripe FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
