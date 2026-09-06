-- Migration 0030: Criação e Padronização das Tabelas kits e kit_itens
-- Garante tabelas para suporte a Kits e Combos no cardápio público e painel administrativo

CREATE TABLE IF NOT EXISTS public.kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_codigo TEXT NOT NULL,
    estabelecimento_id UUID,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    preco_venda NUMERIC(10, 2) DEFAULT 0.00,
    custo_total NUMERIC(10, 2) DEFAULT 0.00,
    margem_lucro NUMERIC(10, 2) DEFAULT 0.00,
    prazo_entrega TEXT DEFAULT '2 dias úteis',
    foto_url TEXT DEFAULT '',
    categoria TEXT DEFAULT 'Kits & Combos',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS estabelecimento_codigo TEXT;
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS estabelecimento_id UUID;
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '';
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS custo_total NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS prazo_entrega TEXT DEFAULT '2 dias úteis';
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT '';
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Kits & Combos';
ALTER TABLE public.kits ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_kits_estabelecimento_codigo ON public.kits(estabelecimento_codigo);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em kits" ON public.kits;
CREATE POLICY "Permitir leitura total em kits" ON public.kits FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao em kits" ON public.kits;
CREATE POLICY "Permitir insercao em kits" ON public.kits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualizacao em kits" ON public.kits;
CREATE POLICY "Permitir atualizacao em kits" ON public.kits FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusao em kits" ON public.kits;
CREATE POLICY "Permitir exclusao em kits" ON public.kits FOR DELETE USING (true);
GRANT ALL ON TABLE public.kits TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.kit_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kit_id UUID,
    produto_id TEXT NOT NULL,
    quantidade NUMERIC(10, 2) DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.kit_itens ADD COLUMN IF NOT EXISTS kit_id UUID;
ALTER TABLE public.kit_itens ADD COLUMN IF NOT EXISTS produto_id TEXT;
ALTER TABLE public.kit_itens ADD COLUMN IF NOT EXISTS quantidade NUMERIC(10, 2) DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_kit_itens_kit_id ON public.kit_itens(kit_id);

ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir leitura total em kit_itens" ON public.kit_itens FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insercao em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir insercao em kit_itens" ON public.kit_itens FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualizacao em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir atualizacao em kit_itens" ON public.kit_itens FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusao em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir exclusao em kit_itens" ON public.kit_itens FOR DELETE USING (true);
GRANT ALL ON TABLE public.kit_itens TO anon, authenticated, service_role;
