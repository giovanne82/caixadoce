-- Migration 0015: Adicionar colunas de personalizacao do cardapio na tabela estabelecimentos
-- Copie e cole este script no Editor SQL do seu projeto Supabase se o console exibir erro 400 (column does not exist)

ALTER TABLE public.estabelecimentos
ADD COLUMN IF NOT EXISTS menu_title TEXT DEFAULT 'Cardápio de Bolos & Doces Especiais',
ADD COLUMN IF NOT EXISTS menu_slogan TEXT DEFAULT 'Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe.',
ADD COLUMN IF NOT EXISTS store_logo_url TEXT,
ADD COLUMN IF NOT EXISTS titulo_cardapio TEXT DEFAULT 'Cardápio de Bolos & Doces Especiais',
ADD COLUMN IF NOT EXISTS slogan_cardapio TEXT DEFAULT 'Doces frescos feitos sob encomenda com ingredientes nobres e amor em cada detalhe.',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Recarregar o Schema Cache do PostgREST no Supabase imediatamente
NOTIFY pgrst, 'reload schema';
