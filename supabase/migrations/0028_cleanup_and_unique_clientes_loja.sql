-- ==============================================================================
-- Migração 0028: Limpeza de Duplicatas e Restrição UNIQUE em clientes_loja
-- ==============================================================================

-- 1. Normaliza todos os telefones existentes removendo qualquer caractere não numérico
UPDATE public.clientes_loja
SET telefone = regexp_replace(telefone, '\D', '', 'g')
WHERE telefone ~ '\D';

-- 2. Consolidação de duplicatas por (estabelecimento_codigo, telefone)
DO $$
DECLARE
    rec RECORD;
    canonical_id UUID;
    v_ids UUID[];
BEGIN
    FOR rec IN
        SELECT 
            estabelecimento_codigo, 
            telefone, 
            array_agg(id ORDER BY created_at ASC, id ASC) AS ids,
            COUNT(*) AS qtd, 
            COALESCE(SUM(total_pedidos), 1) AS soma_pedidos, 
            COALESCE(SUM(total_gasto), 0.00) AS soma_gasto
        FROM public.clientes_loja
        WHERE telefone IS NOT NULL AND telefone <> ''
        GROUP BY estabelecimento_codigo, telefone
        HAVING COUNT(*) > 1
    LOOP
        v_ids := rec.ids;
        canonical_id := v_ids[1];

        -- Atualiza o registro canônico mais antigo com as métricas consolidadas
        UPDATE public.clientes_loja
        SET total_pedidos = rec.soma_pedidos,
            total_gasto = rec.soma_gasto,
            updated_at = NOW()
        WHERE id = canonical_id;

        -- Re-aponta pedidos que estavam vinculados aos registros duplicados secundários
        UPDATE public.encomendas
        SET cliente_id = canonical_id::text
        WHERE cliente_id = ANY(v_ids[2:]::text[]);

        -- Remove os registros duplicados secundários
        DELETE FROM public.clientes_loja
        WHERE id = ANY(v_ids[2:]);
    END LOOP;
END $$;

-- 3. Cria índice UNIQUE composto para impedir qualquer inserção duplicada futura
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_loja_code_tel 
ON public.clientes_loja (estabelecimento_codigo, telefone);
