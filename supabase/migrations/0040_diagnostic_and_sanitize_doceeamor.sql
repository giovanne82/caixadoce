-- =========================================================================
-- Script de Diagnóstico e Inspeção de Produtos da loja doceeamordoceria
-- Execute este script no SQL Editor do Supabase para inspecionar os dados
-- =========================================================================

-- 1. Ver Políticas RLS ativas na tabela produtos
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('produtos', 'products', 'estabelecimentos', 'kits');

-- 2. Inspecionar as linhas dos produtos da loja doceeamordoceria (CD-1004)
SELECT 
    id,
    nome,
    preco,
    categoria,
    ativo,
    visivel_cardapio_digital,
    estabelecimento_id,
    estabelecimento_codigo,
    codigo,
    CASE 
        WHEN opcoes IS NULL THEN 'NULL'
        ELSE jsonb_typeof(opcoes)
    END as tipo_opcoes,
    CASE 
        WHEN available_days IS NULL THEN 'NULL'
        ELSE jsonb_typeof(available_days)
    END as tipo_dias,
    array_length(galeria_fotos, 1) as total_fotos
FROM public.produtos
WHERE 
    estabelecimento_codigo ILIKE '%CD-1004%'
    OR codigo ILIKE '%CD-1004%'
    OR estabelecimento_id = 'e32228b7-82b8-4fff-8e89-32b2b8a1bcfe';
