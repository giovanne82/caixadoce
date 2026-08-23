-- ==============================================================================
-- CAIXADOCE - SCHEMA ALIGNMENT MIGRATION (0011) - SAFE EXECUTION
-- ==============================================================================

-- 1. ADICIONAR TODAS AS COLUNAS POSSÍVEIS PRIMEIRO (Evita erro 42703 no UPDATE)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS cliente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS data_entrega DATE,
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS horario_entrega TEXT DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS down_payment NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS tipo_entrega TEXT DEFAULT 'retirada',
ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'retirada',
ADD COLUMN IF NOT EXISTS itens TEXT DEFAULT '[]',
ADD COLUMN IF NOT EXISTS itens_detalhes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS insumos_necessarios JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. COPIAR VALORES ENTRE COLUNAS EQUIVALENTES COM SEGURANÇA
UPDATE public.orders SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.orders SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.orders SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);

UPDATE public.orders SET customer_name = COALESCE(customer_name, cliente_nome);
UPDATE public.orders SET cliente_nome = COALESCE(cliente_nome, customer_name);

UPDATE public.orders SET customer_phone = COALESCE(customer_phone, cliente_whatsapp);
UPDATE public.orders SET cliente_whatsapp = COALESCE(cliente_whatsapp, customer_phone);

UPDATE public.orders SET delivery_date = COALESCE(delivery_date, data_entrega);
UPDATE public.orders SET data_entrega = COALESCE(data_entrega, delivery_date);

-- 3. TABELA DATAS BLOQUEADAS
ALTER TABLE public.datas_bloqueadas
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS data DATE,
ADD COLUMN IF NOT EXISTS blocked_date DATE,
ADD COLUMN IF NOT EXISTS motivo TEXT DEFAULT 'Agenda Lotada',
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Agenda Lotada',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.datas_bloqueadas SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.datas_bloqueadas SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.datas_bloqueadas SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);
UPDATE public.datas_bloqueadas SET blocked_date = COALESCE(blocked_date, data);
UPDATE public.datas_bloqueadas SET data = COALESCE(data, blocked_date);

-- 4. TABELA CUSTOMERS (CLIENTES)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT,
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS cliente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.customers SET codigo = COALESCE(codigo, estabelecimento_codigo, store_id);
UPDATE public.customers SET store_id = COALESCE(store_id, estabelecimento_codigo, codigo);
UPDATE public.customers SET estabelecimento_codigo = COALESCE(estabelecimento_codigo, codigo, store_id);

-- RECARREGAR SCHEMA CACHE DO SUPABASE
NOTIFY pgrst, 'reload schema';
