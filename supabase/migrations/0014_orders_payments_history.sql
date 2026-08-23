-- Migration 0014: Add payments_history JSONB column to orders and migrate existing valor_entrada
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payments_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS historico_pagamentos JSONB DEFAULT '[]'::jsonb;

-- Populate payments_history for existing rows with valor_entrada > 0
UPDATE public.orders
SET payments_history = jsonb_build_array(
  jsonb_build_object(
    'id', 'pay_initial',
    'data', COALESCE(created_at::text, CURRENT_DATE::text),
    'date', COALESCE(created_at::text, CURRENT_DATE::text),
    'valor', COALESCE(valor_entrada, down_payment, 0),
    'amount', COALESCE(valor_entrada, down_payment, 0)
  )
),
historico_pagamentos = jsonb_build_array(
  jsonb_build_object(
    'id', 'pay_initial',
    'data', COALESCE(created_at::text, CURRENT_DATE::text),
    'date', COALESCE(created_at::text, CURRENT_DATE::text),
    'valor', COALESCE(valor_entrada, down_payment, 0),
    'amount', COALESCE(valor_entrada, down_payment, 0)
  )
)
WHERE (COALESCE(valor_entrada, down_payment, 0) > 0)
  AND (payments_history IS NULL OR payments_history = '[]'::jsonb);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
