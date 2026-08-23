-- ==============================================================================
-- CAIXADOCE - SCHEMA ALIGNMENT MIGRATION (0011)
-- Garantia de nomes de colunas em Português e Inglês para evitar HTTP 400 Bad Request
-- ==============================================================================

-- 1. ALINHAMENTO DE COLUNAS DA TABELA ORDERS (ENCOMENDAS)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_time TEXT,
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS down_payment NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'retirada',
ADD COLUMN IF NOT EXISTS insumos_necessarios JSONB DEFAULT '[]'::jsonb;

-- Copiar valores entre colunas equivalentes se nulos
UPDATE public.orders SET codigo = estabelecimento_codigo WHERE codigo IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.orders SET store_id = estabelecimento_codigo WHERE store_id IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.orders SET customer_name = cliente_nome WHERE customer_name IS NULL AND cliente_nome IS NOT NULL;
UPDATE public.orders SET customer_phone = cliente_whatsapp WHERE customer_phone IS NULL AND cliente_whatsapp IS NOT NULL;
UPDATE public.orders SET delivery_date = data_entrega WHERE delivery_date IS NULL AND data_entrega IS NOT NULL;
UPDATE public.orders SET data_entrega = delivery_date WHERE data_entrega IS NULL AND delivery_date IS NOT NULL;

-- 2. ALINHAMENTO DE COLUNAS DA TABELA DATAS_BLOQUEADAS
ALTER TABLE public.datas_bloqueadas
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS blocked_date DATE,
ADD COLUMN IF NOT EXISTS reason TEXT;

UPDATE public.datas_bloqueadas SET codigo = estabelecimento_codigo WHERE codigo IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.datas_bloqueadas SET store_id = estabelecimento_codigo WHERE store_id IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.datas_bloqueadas SET blocked_date = data WHERE blocked_date IS NULL AND data IS NOT NULL;

-- 3. ALINHAMENTO DE COLUNAS DA TABELA CUSTOMERS (CLIENTES)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS cliente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT;

UPDATE public.customers SET codigo = estabelecimento_codigo WHERE codigo IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.customers SET store_id = estabelecimento_codigo WHERE store_id IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.customers SET cliente_nome = name WHERE cliente_nome IS NULL AND name IS NOT NULL;
UPDATE public.customers SET cliente_whatsapp = whatsapp WHERE cliente_whatsapp IS NULL AND whatsapp IS NOT NULL;

-- 4. ALINHAMENTO DE COLUNAS DA TABELA EXPENSES (DESPESAS / SCANNER)
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS purchase_date DATE;

UPDATE public.expenses SET codigo = estabelecimento_codigo WHERE codigo IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.expenses SET store_id = estabelecimento_codigo WHERE store_id IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.expenses SET supplier_name = fornecedor_nome WHERE supplier_name IS NULL AND fornecedor_nome IS NOT NULL;
UPDATE public.expenses SET purchase_date = data_compra WHERE purchase_date IS NULL AND data_compra IS NOT NULL;

-- 5. ALINHAMENTO DE COLUNAS DA TABELA TRANSACOES_FINANCEIRAS
ALTER TABLE public.transacoes_financeiras
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);

UPDATE public.transacoes_financeiras SET codigo = estabelecimento_codigo WHERE codigo IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.transacoes_financeiras SET store_id = estabelecimento_codigo WHERE store_id IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.transacoes_financeiras SET description = descricao WHERE description IS NULL AND descricao IS NOT NULL;
UPDATE public.transacoes_financeiras SET amount = valor WHERE amount IS NULL AND valor IS NOT NULL;

-- 6. ALINHAMENTO DE COLUNAS DA TABELA PRODUCTS (PRODUTOS / CARDÁPIO)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS nome TEXT;

UPDATE public.products SET codigo = estabelecimento_codigo WHERE codigo IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.products SET store_id = estabelecimento_codigo WHERE store_id IS NULL AND estabelecimento_codigo IS NOT NULL;
UPDATE public.products SET nome = name WHERE nome IS NULL AND name IS NOT NULL;

-- RECARREGAR SCHEMA CACHE DO SUPABASE
NOTIFY pgrst, 'reload schema';
