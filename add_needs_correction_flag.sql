-- Adicionar flag para produtos que precisam correção de código
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE public.inventory_logs 
ADD COLUMN IF NOT EXISTS needs_correction boolean DEFAULT false;

-- Índice para facilitar busca de produtos pendentes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_needs_correction 
ON public.inventory_logs (needs_correction) 
WHERE needs_correction = true;

COMMENT ON COLUMN public.inventory_logs.needs_correction IS 'Marca produtos sem código EAN que precisam correção futura';
