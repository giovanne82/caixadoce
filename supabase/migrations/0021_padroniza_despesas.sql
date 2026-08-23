-- Migration 0021: Padronização da Tabela despesas (Notinhas e Compras OCR)

CREATE TABLE IF NOT EXISTS public.despesas (
    id TEXT PRIMARY KEY,
    estabelecimento_codigo TEXT NOT NULL DEFAULT 'CD-1001',
    user_id UUID,
    fornecedor_nome TEXT,
    fornecedor_endereco TEXT,
    numero_nota TEXT,
    numero_pedido TEXT,
    data_compra TEXT,
    hora_compra TEXT,
    valor_total NUMERIC(10,2) DEFAULT 0,
    valor_producao NUMERIC(10,2) DEFAULT 0,
    valor_utensilios NUMERIC(10,2) DEFAULT 0,
    valor_consumo_proprio NUMERIC(10,2) DEFAULT 0,
    valor_outros NUMERIC(10,2) DEFAULT 0,
    itens JSONB DEFAULT '[]'::jsonb,
    comprovante_url TEXT,
    metodo_pagamento TEXT DEFAULT 'dinheiro',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir a criação de todas as colunas caso a tabela despesas já existisse previamente
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT DEFAULT 'CD-1001';
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS fornecedor_endereco TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS numero_nota TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS numero_pedido TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS data_compra TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS hora_compra TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor_producao NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor_utensilios NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor_consumo_proprio NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor_outros NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro';
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Desabilitar RLS ou permitir livre sincronização entre aparelhos
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;
