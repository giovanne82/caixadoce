-- Migration 0013: Add customization columns to estabelecimentos (logo, title, slogan)
ALTER TABLE public.estabelecimentos
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS store_logo_url TEXT,
ADD COLUMN IF NOT EXISTS titulo_cardapio TEXT DEFAULT 'Cardápio de Bolos & Doces Especiais',
ADD COLUMN IF NOT EXISTS menu_title TEXT DEFAULT 'Cardápio de Bolos & Doces Especiais',
ADD COLUMN IF NOT EXISTS slogan_cardapio TEXT DEFAULT 'Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe.',
ADD COLUMN IF NOT EXISTS menu_slogan TEXT DEFAULT 'Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
