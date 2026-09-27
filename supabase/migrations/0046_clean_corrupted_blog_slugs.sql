-- ==============================================================================
-- MIGRATION 0046: Limpeza e Correção de Slugs Corrompidos na Tabela blog_posts
-- ==============================================================================

-- 1. Função PL/pgSQL para gerar slugs limpos e seguros diretamente no PostgreSQL
CREATE OR REPLACE FUNCTION public.clean_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF input_text IS NULL OR TRIM(input_text) = '' THEN
        RETURN 'post-' || substr(md5(random()::text), 1, 8);
    END IF;

    -- 1. Remove qualquer resíduo literal de regex (ex: /[...]/g, /\s+/g)
    cleaned := regexp_replace(input_text, '/\[\^[^\]]+\]/[a-z]*', '', 'gi');
    cleaned := regexp_replace(cleaned, '/\\s\+/[a-z]*', '', 'gi');
    cleaned := regexp_replace(cleaned, '/[^/]+/[a-z]*', '', 'gi');

    -- 2. Converte para minúsculas e remove acentuação usando unaccent se disponível, ou substituições manuais
    cleaned := lower(cleaned);
    cleaned := translate(cleaned,
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn');

    -- 3. Substitui qualquer caractere não alfanumérico por hífen
    cleaned := regexp_replace(cleaned, '[^a-z0-9]+', '-', 'g');

    -- 4. Remove hífens duplicados e hífens no início/fim
    cleaned := regexp_replace(cleaned, '-+', '-', 'g');
    cleaned := regexp_replace(cleaned, '^-+|-+$', '', 'g');

    IF cleaned = '' THEN
        RETURN 'post-' || substr(md5(random()::text), 1, 8);
    END IF;

    RETURN cleaned;
END;
$$ LANGUAGE plpgsql;

-- 2. Atualiza todos os posts existentes na tabela que contenham slugs corrompidos com regex ou caracteres inválidos
UPDATE public.blog_posts
SET slug = public.clean_slug(
    CASE 
        WHEN slug LIKE '%/%' OR slug LIKE '%[%' OR slug LIKE '%\%' OR slug LIKE '% %'
        THEN title 
        ELSE slug 
    END
),
updated_at = timezone('utc'::text, now())
WHERE slug LIKE '%/%' OR slug LIKE '%[%' OR slug LIKE '%\%' OR slug LIKE '% %';

-- 3. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
