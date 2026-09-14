-- Migration 0036: Hotfix de RLS para Acesso Público ao Cardápio (Resolução do Erro 500)
-- Garante que a leitura (SELECT) das tabelas públicas do cardápio seja 100% irrestrita para visitantes anônimos ('anon') e autenticados ('authenticated'),
-- sem realizar nenhuma verificação de auth.uid() ou JOIN com tabelas de assinaturas que possam falhar com erro 500 no Postgres.

-- 1. TABELA PRODUTOS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir leitura publica de produtos" ON public.produtos;
DROP POLICY IF EXISTS "allow_all_produtos" ON public.produtos;
DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;

CREATE POLICY "Permitir leitura publica de produtos"
ON public.produtos
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercao de produtos" ON public.produtos;
CREATE POLICY "Permitir insercao de produtos"
ON public.produtos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao de produtos" ON public.produtos;
CREATE POLICY "Permitir atualizacao de produtos"
ON public.produtos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao de produtos" ON public.produtos;
CREATE POLICY "Permitir exclusao de produtos"
ON public.produtos FOR DELETE TO anon, authenticated USING (true);

GRANT ALL ON public.produtos TO anon, authenticated, service_role;

-- 2. TABELA PRODUCTS (Tabela legada)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de produtos" ON public.products;
DROP POLICY IF EXISTS "Permitir leitura publica de products" ON public.products;
DROP POLICY IF EXISTS "allow_all_products" ON public.products;
DROP POLICY IF EXISTS "products_select_policy" ON public.products;

CREATE POLICY "Permitir leitura publica de products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);

GRANT ALL ON public.products TO anon, authenticated, service_role;

-- 3. TABELA KITS
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em kits" ON public.kits;
DROP POLICY IF EXISTS "Permitir leitura publica em kits" ON public.kits;

CREATE POLICY "Permitir leitura publica em kits"
ON public.kits
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercao em kits" ON public.kits;
CREATE POLICY "Permitir insercao em kits" ON public.kits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualizacao em kits" ON public.kits;
CREATE POLICY "Permitir atualizacao em kits" ON public.kits FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusao em kits" ON public.kits;
CREATE POLICY "Permitir exclusao em kits" ON public.kits FOR DELETE USING (true);

GRANT ALL ON public.kits TO anon, authenticated, service_role;

-- 4. TABELA KIT_ITENS
ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total em kit_itens" ON public.kit_itens;
DROP POLICY IF EXISTS "Permitir leitura publica em kit_itens" ON public.kit_itens;

CREATE POLICY "Permitir leitura publica em kit_itens"
ON public.kit_itens
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir insercao em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir insercao em kit_itens" ON public.kit_itens FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualizacao em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir atualizacao em kit_itens" ON public.kit_itens FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Permitir exclusao em kit_itens" ON public.kit_itens;
CREATE POLICY "Permitir exclusao em kit_itens" ON public.kit_itens FOR DELETE USING (true);

GRANT ALL ON public.kit_itens TO anon, authenticated, service_role;

-- 5. TABELA ESTABELECIMENTOS
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "estabelecimentos_select_policy" ON public.estabelecimentos;
DROP POLICY IF EXISTS "allow_all_estabelecimentos" ON public.estabelecimentos;

CREATE POLICY "Permitir leitura publica de estabelecimentos"
ON public.estabelecimentos
FOR SELECT
TO anon, authenticated
USING (true);

GRANT ALL ON public.estabelecimentos TO anon, authenticated, service_role;

-- 6. TABELA DATAS_BLOQUEADAS
ALTER TABLE public.datas_bloqueadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de datas bloqueadas" ON public.datas_bloqueadas;
DROP POLICY IF EXISTS "allow_all_datas" ON public.datas_bloqueadas;

CREATE POLICY "Permitir leitura publica de datas bloqueadas"
ON public.datas_bloqueadas
FOR SELECT
TO anon, authenticated
USING (true);

GRANT ALL ON public.datas_bloqueadas TO anon, authenticated, service_role;

-- 7. TABELA PIX_ACCOUNTS
ALTER TABLE public.pix_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de contas pix para clientes" ON public.pix_accounts;
DROP POLICY IF EXISTS "Usuarios gerenciam suas proprias contas pix" ON public.pix_accounts;

CREATE POLICY "Leitura publica de contas pix para clientes"
ON public.pix_accounts
FOR SELECT
TO anon, authenticated
USING (true);

GRANT ALL ON public.pix_accounts TO anon, authenticated, service_role;

-- 8. TABELAS ORDERS & ENCOMENDAS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir clientes criarem pedidos publicos" ON public.orders;
CREATE POLICY "Permitir clientes criarem pedidos publicos" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir leitura publica de pedidos" ON public.orders;
CREATE POLICY "Permitir leitura publica de pedidos" ON public.orders FOR SELECT TO anon, authenticated USING (true);

GRANT ALL ON public.orders TO anon, authenticated, service_role;

ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir clientes criarem encomendas publicas" ON public.encomendas;
CREATE POLICY "Permitir clientes criarem encomendas publicas" ON public.encomendas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir leitura publica de encomendas" ON public.encomendas;
CREATE POLICY "Permitir leitura publica de encomendas" ON public.encomendas FOR SELECT TO anon, authenticated USING (true);

GRANT ALL ON public.encomendas TO anon, authenticated, service_role;

-- Recarregar o Schema Cache do PostgREST imediatamente no Supabase
NOTIFY pgrst, 'reload schema';
