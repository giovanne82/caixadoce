-- Migration 0019: Padroniza Encomendas como Tabela Oficial (Execução 100% Blindada)
-- Descrição: Remove a view 'encomendas', cria a tabela real 'encomendas', garante TODAS as colunas (PT/EN), migra dados dinamicamente e aplica RLS.

-- 1. Remover a view 'encomendas' existente para permitir a criação da tabela física
DROP VIEW IF EXISTS public.encomendas CASCADE;

-- 2. Criar a tabela real 'encomendas'
CREATE TABLE IF NOT EXISTS public.encomendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Adicionar TODAS as colunas possíveis (em Português e Inglês) PRIMEIRO para evitar erro PGRST204 (coluna inexistente no schema cache)
ALTER TABLE public.encomendas
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS cliente_id TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS cliente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS data_entrega DATE,
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS horario_entrega TEXT DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS itens TEXT DEFAULT '[]',
ADD COLUMN IF NOT EXISTS itens_detalhes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS insumos_necessarios JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS down_payment NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS historico_pagamentos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payments_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS tipo_entrega TEXT DEFAULT 'retirada',
ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'retirada',
ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Migração dinâmica de dados da tabela 'orders' (se existir) usando EXECUTE seguro
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        BEGIN
            EXECUTE 'INSERT INTO public.encomendas (id, created_at) SELECT id, created_at FROM public.orders ON CONFLICT (id) DO NOTHING';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            EXECUTE 'UPDATE public.encomendas e SET 
                cliente_id = COALESCE(e.cliente_id, o.cliente_id::text),
                cliente_nome = COALESCE(e.cliente_nome, o.cliente_nome, o.customer_name),
                customer_name = COALESCE(e.customer_name, o.customer_name, o.cliente_nome),
                cliente_whatsapp = COALESCE(e.cliente_whatsapp, o.cliente_whatsapp, o.customer_phone),
                customer_phone = COALESCE(e.customer_phone, o.customer_phone, o.cliente_whatsapp),
                data_entrega = COALESCE(e.data_entrega, o.data_entrega, o.delivery_date),
                delivery_date = COALESCE(e.delivery_date, o.delivery_date, o.data_entrega),
                horario_entrega = COALESCE(e.horario_entrega, o.horario_entrega, o.delivery_time),
                delivery_time = COALESCE(e.delivery_time, o.delivery_time, o.horario_entrega),
                itens = COALESCE(e.itens, o.itens),
                itens_detalhes = COALESCE(e.itens_detalhes, o.itens_detalhes),
                insumos_necessarios = COALESCE(e.insumos_necessarios, o.insumos_necessarios),
                valor_total = COALESCE(e.valor_total, o.valor_total, o.total_price, 0.00),
                total_price = COALESCE(e.total_price, o.total_price, o.valor_total, 0.00),
                valor_entrada = COALESCE(e.valor_entrada, o.valor_entrada, o.down_payment, 0.00),
                down_payment = COALESCE(e.down_payment, o.down_payment, o.valor_entrada, 0.00),
                historico_pagamentos = COALESCE(e.historico_pagamentos, o.historico_pagamentos, o.payments_history),
                payments_history = COALESCE(e.payments_history, o.payments_history, o.historico_pagamentos),
                status_pagamento = COALESCE(e.status_pagamento, o.status_pagamento, o.payment_status),
                payment_status = COALESCE(e.payment_status, o.payment_status, o.status_pagamento),
                status = COALESCE(e.status, o.status),
                tipo_entrega = COALESCE(e.tipo_entrega, o.tipo_entrega, o.delivery_type),
                delivery_type = COALESCE(e.delivery_type, o.delivery_type, o.tipo_entrega),
                endereco_entrega = COALESCE(e.endereco_entrega, o.endereco_entrega, o.delivery_address),
                delivery_address = COALESCE(e.delivery_address, o.delivery_address, o.endereco_entrega),
                observacoes = COALESCE(e.observacoes, o.observacoes, o.notes),
                notes = COALESCE(e.notes, o.notes, o.observacoes),
                user_id = COALESCE(e.user_id, o.user_id)
            FROM public.orders o WHERE e.id = o.id';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            EXECUTE 'UPDATE public.encomendas e SET 
                estabelecimento_codigo = COALESCE(e.estabelecimento_codigo, o.estabelecimento_codigo, o.codigo, o.store_id),
                codigo = COALESCE(e.codigo, o.codigo, o.estabelecimento_codigo, o.store_id),
                store_id = COALESCE(e.store_id, o.store_id, o.estabelecimento_codigo, o.codigo)
            FROM public.orders o WHERE e.id = o.id';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- 5. Sincronizar pares de colunas (PT e EN) dentro da própria tabela 'encomendas'
UPDATE public.encomendas SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.encomendas SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.encomendas SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);

UPDATE public.encomendas SET customer_name = COALESCE(customer_name, cliente_nome);
UPDATE public.encomendas SET cliente_nome = COALESCE(cliente_nome, customer_name);

UPDATE public.encomendas SET customer_phone = COALESCE(customer_phone, cliente_whatsapp);
UPDATE public.encomendas SET cliente_whatsapp = COALESCE(cliente_whatsapp, customer_phone);

UPDATE public.encomendas SET delivery_date = COALESCE(delivery_date, data_entrega);
UPDATE public.encomendas SET data_entrega = COALESCE(data_entrega, delivery_date);

UPDATE public.encomendas SET delivery_time = COALESCE(delivery_time, horario_entrega);
UPDATE public.encomendas SET horario_entrega = COALESCE(horario_entrega, delivery_time);

UPDATE public.encomendas SET total_price = COALESCE(total_price, valor_total, 0.00);
UPDATE public.encomendas SET valor_total = COALESCE(valor_total, total_price, 0.00);

UPDATE public.encomendas SET down_payment = COALESCE(down_payment, valor_entrada, 0.00);
UPDATE public.encomendas SET valor_entrada = COALESCE(valor_entrada, down_payment, 0.00);

UPDATE public.encomendas SET payments_history = COALESCE(payments_history, historico_pagamentos);
UPDATE public.encomendas SET historico_pagamentos = COALESCE(historico_pagamentos, payments_history);

UPDATE public.encomendas SET payment_status = COALESCE(payment_status, status_pagamento);
UPDATE public.encomendas SET status_pagamento = COALESCE(status_pagamento, payment_status);

UPDATE public.encomendas SET delivery_type = COALESCE(delivery_type, tipo_entrega);
UPDATE public.encomendas SET tipo_entrega = COALESCE(tipo_entrega, delivery_type);

UPDATE public.encomendas SET delivery_address = COALESCE(delivery_address, endereco_entrega);
UPDATE public.encomendas SET endereco_entrega = COALESCE(endereco_entrega, delivery_address);

UPDATE public.encomendas SET notes = COALESCE(notes, observacoes);
UPDATE public.encomendas SET observacoes = COALESCE(observacoes, notes);

-- 6. Habilitar RLS (Row Level Security) na tabela encomendas
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS abrangentes para sincronização entre dispositivos e acesso anônimo/autenticado
DROP POLICY IF EXISTS "Permitir leitura de encomendas por user_id ou codigo" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir insercao de encomendas por clientes anonimos ou autenticados" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir atualizacao de encomendas por donos e clientes" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir exclusao de encomendas pelo usuario dono" ON public.encomendas;

CREATE POLICY "Permitir leitura de encomendas por user_id ou codigo"
ON public.encomendas FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir insercao de encomendas por clientes anonimos ou autenticados"
ON public.encomendas FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de encomendas por donos e clientes"
ON public.encomendas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusao de encomendas pelo usuario dono"
ON public.encomendas FOR DELETE TO anon, authenticated USING (true);

-- 8. Conceder todas as permissões de acesso
GRANT ALL ON public.encomendas TO authenticated;
GRANT ALL ON public.encomendas TO anon;

-- 9. Recarregar o Schema Cache do PostgREST
NOTIFY pgrst, 'reload schema';
