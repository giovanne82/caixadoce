-- Migration: Add iFood OAuth 2.0 Integration columns to estabelecimentos table
ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS ifood_access_token TEXT;
ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS ifood_refresh_token TEXT;
ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS ifood_merchant_id TEXT;
ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS ifood_code_verifier TEXT;
ALTER TABLE public.estabelecimentos ADD COLUMN IF NOT EXISTS ifood_status TEXT DEFAULT 'desconectado';

CREATE INDEX IF NOT EXISTS idx_estabelecimentos_ifood_merchant ON public.estabelecimentos(ifood_merchant_id);
