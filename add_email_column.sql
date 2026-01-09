-- Adicionar coluna para email do usuário
alter table public.inventory_logs
add column user_email text;

-- Atualizar permissões (garantir que tudo continua funcionando)
grant all on public.inventory_logs to anon, authenticated, service_role;
