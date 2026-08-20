-- ==============================================================================
-- CAIXADOCE - TABELAS DE ENCOMENDAS E CALENDÁRIO
-- ==============================================================================

-- 1. Tabela de Encomendas (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    cliente_nome TEXT NOT NULL,
    cliente_whatsapp TEXT NOT NULL,
    data_entrega DATE NOT NULL,
    horario_entrega TEXT NOT NULL DEFAULT '14:00',
    itens TEXT NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valor_entrada NUMERIC(10, 2) DEFAULT 0.00,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'sinal_pago', 'pago_integral', 'pago_na_entrega')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_producao', 'pronta', 'entregue', 'cancelada')),
    observacoes TEXT,
    endereco_entrega TEXT,
    tipo_entrega TEXT DEFAULT 'retirada' CHECK (tipo_entrega IN ('retirada', 'delivery')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Datas Bloqueadas no Calendário
CREATE TABLE IF NOT EXISTS public.datas_bloqueadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL REFERENCES public.estabelecimentos(codigo) ON DELETE CASCADE,
    data DATE NOT NULL,
    motivo TEXT NOT NULL DEFAULT 'Agenda Lotada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datas_bloqueadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em orders para usuarios autenticados"
    ON public.orders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir tudo em datas_bloqueadas para usuarios autenticados"
    ON public.datas_bloqueadas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
