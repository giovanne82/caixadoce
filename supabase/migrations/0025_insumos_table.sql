-- Migration: 0025_insumos_table.sql
-- Description: Tabela de Cadastro de Insumos e Materiais para Ficha Técnica

CREATE TABLE IF NOT EXISTS public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_codigo TEXT NOT NULL,
  user_id UUID,
  nome TEXT NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'kg',
  custo_atual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  qtd_embalagem_original NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  fornecedor TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para otimização de busca por estabelecimento
CREATE INDEX IF NOT EXISTS idx_insumos_estabelecimento ON public.insumos(estabelecimento_codigo);
CREATE INDEX IF NOT EXISTS idx_insumos_nome ON public.insumos(nome);

-- Habilitar RLS
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS permissivas para o estabelecimento
DROP POLICY IF EXISTS "Permitir leitura total em insumos por estabelecimento" ON public.insumos;
CREATE POLICY "Permitir leitura total em insumos por estabelecimento"
  ON public.insumos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insercao em insumos por estabelecimento" ON public.insumos;
CREATE POLICY "Permitir insercao em insumos por estabelecimento"
  ON public.insumos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao em insumos por estabelecimento" ON public.insumos;
CREATE POLICY "Permitir atualizacao em insumos por estabelecimento"
  ON public.insumos FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Permitir exclusao em insumos por estabelecimento" ON public.insumos;
CREATE POLICY "Permitir exclusao em insumos por estabelecimento"
  ON public.insumos FOR DELETE
  USING (true);
