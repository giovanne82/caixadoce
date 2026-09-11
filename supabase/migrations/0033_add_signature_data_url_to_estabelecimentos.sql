-- Migration 0033: Adiciona coluna signature_data_url na tabela estabelecimentos
ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS signature_data_url TEXT;

-- Conceder permissões e recarregar o schema cache no PostgREST
GRANT ALL ON public.estabelecimentos TO authenticated;
GRANT ALL ON public.estabelecimentos TO anon;
NOTIFY pgrst, 'reload schema';
