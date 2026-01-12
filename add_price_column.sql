-- Adicionar coluna para preço/valor do produto
ALTER TABLE public.products_base 
ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN public.products_base.price IS 'Preço/Valor unitário do produto vindo da planilha';
