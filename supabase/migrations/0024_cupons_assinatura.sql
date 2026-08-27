-- Migration 0024: Cria tabela cupons_assinatura e adiciona trial_dias_adicionais em estabelecimentos

CREATE TABLE IF NOT EXISTS public.cupons_assinatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  tipo_desconto text NOT NULL DEFAULT 'dias_gratis', -- 'dias_gratis' ou 'percentual'
  valor numeric NOT NULL DEFAULT 60,
  limite_uso integer DEFAULT 10,
  usos_atuais integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Adiciona coluna trial_dias_adicionais na tabela estabelecimentos caso não exista
ALTER TABLE public.estabelecimentos
ADD COLUMN IF NOT EXISTS trial_dias_adicionais integer DEFAULT 0;

-- Habilita RLS para a tabela cupons_assinatura
ALTER TABLE public.cupons_assinatura ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura pública/autenticada de cupons ativos
CREATE POLICY "Permitir leitura de cupons ativos"
ON public.cupons_assinatura
FOR SELECT
USING (true);

-- Policy para permitir atualização do contador de usos_atuais
CREATE POLICY "Permitir atualizacao de usos de cupons"
ON public.cupons_assinatura
FOR UPDATE
USING (true);

-- Insere cupons iniciais para Beta Testers caso não existam
INSERT INTO public.cupons_assinatura (codigo, tipo_desconto, valor, limite_uso, ativo)
VALUES 
  ('BETA60', 'dias_gratis', 60, 500, true),
  ('BETA30', 'dias_gratis', 30, 500, true),
  ('BETAVIP90', 'dias_gratis', 90, 100, true)
ON CONFLICT (codigo) DO NOTHING;
