-- Migration 0023: Adiciona colunas cnpj, tipo_documento e numero_documento na tabela estabelecimentos

ALTER TABLE public.estabelecimentos 
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS tipo_documento text DEFAULT 'CNPJ',
ADD COLUMN IF NOT EXISTS numero_documento text;
