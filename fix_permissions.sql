-- RODE ISSO NO SUPABASE PARA LIBERAR O SITE
drop policy if exists "Enable read access for all users (Dashboard)" on public.inventory_logs;
drop policy if exists "Public Read Access" on public.inventory_logs;

create policy "Public Read Access"
on public.inventory_logs for select
to anon
using (true);

create policy "Authenticated Read Access"
on public.inventory_logs for select
to authenticated
using (true);
