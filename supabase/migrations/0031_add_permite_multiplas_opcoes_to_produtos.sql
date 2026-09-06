-- Migration 0031: Adiciona coluna permite_multiplas_opcoes na tabela produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS permite_multiplas_opcoes BOOLEAN DEFAULT false;
