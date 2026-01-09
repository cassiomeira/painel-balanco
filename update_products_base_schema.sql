-- Adicionar colunas para controle de contagem
ALTER TABLE public.products_base 
ADD COLUMN IF NOT EXISTS current_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_counted_at timestamp with time zone;

-- Criar função RPC para incrementar contagem de forma segura (previne condições de corrida)
create or replace function increment_product_count(p_ean text, p_qty int)
returns void
language plpgsql
as $$
begin
  update public.products_base
  set 
    current_quantity = current_quantity + p_qty,
    last_counted_at = now()
  where ean = p_ean;
end;
$$;
