-- Migration 0022: Limpeza e Deleção em Cascata de Transações Órfãs de Notinhas

-- 1. Deletar lançamentos de transações financeiras cujo fornecedor/descrição refere-se a notinhas excluídas
DELETE FROM public.transacoes_financeiras tf
WHERE (tf.descricao LIKE 'Compra Insumos / Notinha%' OR tf.categoria LIKE '%Produção%')
  AND NOT EXISTS (
    SELECT 1 FROM public.despesas d
    WHERE d.fornecedor_nome = tf.cliente_ou_fornecedor
  );

-- 2. Garantir que as tabelas despesas e transacoes_financeiras possuam acesso livre
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras DISABLE ROW LEVEL SECURITY;
