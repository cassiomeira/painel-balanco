-- Adicionar coluna para estoque esperado da planilha
ALTER TABLE public.products_base 
ADD COLUMN IF NOT EXISTS expected_quantity integer DEFAULT 0;

COMMENT ON COLUMN public.products_base.expected_quantity IS 'Quantidade original de estoque vinda da planilha Excel';
