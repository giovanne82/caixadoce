-- Migration: 0025_insumos_table.sql
-- Description: Tabela de Cadastro de Insumos e Materiais para Ficha Técnica

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Suporte a alterações/colunas para tabelas legadas
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS unidade_embalagem_original TEXT DEFAULT 'kg';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS fornecedor TEXT DEFAULT '';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS observacoes TEXT DEFAULT '';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS qtd_embalagem_original NUMERIC(12, 3) DEFAULT 1.000;

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

-- Conceder permissões públicas/autenticadas
GRANT ALL ON TABLE public.insumos TO anon, authenticated, service_role;
