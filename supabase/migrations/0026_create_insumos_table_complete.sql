-- Migration: 0026_create_insumos_table_complete.sql
-- Description: Garantia de criação completa e permissões para a tabela insumos no Supabase

CREATE TABLE IF NOT EXISTS public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_codigo TEXT NOT NULL,
  user_id TEXT,
  nome TEXT NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'kg',
  custo_atual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  qtd_embalagem_original NUMERIC(12, 3) NOT NULL DEFAULT 1.000,
  unidade_embalagem_original TEXT DEFAULT 'kg',
  fornecedor TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adição de colunas caso a tabela já tenha sido criada anteriormente sem elas
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS unidade_embalagem_original TEXT DEFAULT 'kg';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS fornecedor TEXT DEFAULT '';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS observacoes TEXT DEFAULT '';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS qtd_embalagem_original NUMERIC(12, 3) DEFAULT 1.000;

-- Índices de busca por estabelecimento e nome do insumo
CREATE INDEX IF NOT EXISTS idx_insumos_estabelecimento ON public.insumos(estabelecimento_codigo);
CREATE INDEX IF NOT EXISTS idx_insumos_nome ON public.insumos(nome);

-- Habilitar RLS
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas para SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Permitir leitura total em insumos" ON public.insumos;
CREATE POLICY "Permitir leitura total em insumos"
  ON public.insumos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insercao em insumos" ON public.insumos;
CREATE POLICY "Permitir insercao em insumos"
  ON public.insumos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao em insumos" ON public.insumos;
CREATE POLICY "Permitir atualizacao em insumos"
  ON public.insumos FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Permitir exclusao em insumos" ON public.insumos;
CREATE POLICY "Permitir exclusao em insumos"
  ON public.insumos FOR DELETE
  USING (true);

-- Conceder permissões para roles anon, authenticated e service_role
GRANT ALL ON TABLE public.insumos TO anon, authenticated, service_role;
