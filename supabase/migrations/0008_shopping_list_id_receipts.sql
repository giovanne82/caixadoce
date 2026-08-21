-- ==============================================================================
-- CAIXADOCE - ADICIONANDO SHOPPING_LIST_ID ÀS NOTINHAS VINCULADAS
-- ==============================================================================

ALTER TABLE public.shopping_list_receipts 
ADD COLUMN IF NOT EXISTS shopping_list_id TEXT;

CREATE INDEX IF NOT EXISTS idx_shopping_list_receipts_list 
ON public.shopping_list_receipts (estabelecimento_codigo, shopping_list_id);
