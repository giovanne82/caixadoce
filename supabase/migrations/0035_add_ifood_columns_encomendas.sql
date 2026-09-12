-- Migration 0035: Add iFood columns (origem, codigo_pedido_ifood, dados_brutos) to public.encomendas
ALTER TABLE public.encomendas ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'Manual';
ALTER TABLE public.encomendas ADD COLUMN IF NOT EXISTS codigo_pedido_ifood TEXT;
ALTER TABLE public.encomendas ADD COLUMN IF NOT EXISTS dados_brutos JSONB;

CREATE INDEX IF NOT EXISTS idx_encomendas_codigo_ifood ON public.encomendas(codigo_pedido_ifood);
CREATE INDEX IF NOT EXISTS idx_encomendas_origem ON public.encomendas(origem);
