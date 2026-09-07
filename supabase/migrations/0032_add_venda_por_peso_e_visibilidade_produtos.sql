-- Migration 0032: Adiciona colunas de venda por peso e visibilidade por canal na tabela produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS vende_por_peso BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unidade_venda VARCHAR(10) DEFAULT 'un';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS visivel_pdv BOOLEAN DEFAULT true;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS visivel_cardapio_digital BOOLEAN DEFAULT true;

-- Conceder permissões e recarregar o schema cache
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO anon;
NOTIFY pgrst, 'reload schema';
