-- RPC Function para Exclusão de Conta no Supabase
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Deleta o usuário da tabela auth.users (cascateia para tabelas públicas)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
