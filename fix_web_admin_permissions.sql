-- PERMISSÕES PARA O PAINEL WEB FUNCIONAR
-- O Painel Web está usando a chave "anônima" por enquanto, então precisamos liberar a edição/exclusão.

-- 1. Habilitar DELETE (Excluir) para todos (Painel Web)
CREATE POLICY "Enable Delete for Anon"
ON public.inventory_logs
FOR DELETE
TO anon
USING (true);

-- 2. Habilitar UPDATE (Editar) para todos (Painel Web)
CREATE POLICY "Enable Update for Anon"
ON public.inventory_logs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 3. Habilitar insert também (caso precise)
CREATE POLICY "Enable Insert for Anon"
ON public.inventory_logs
FOR INSERT
TO anon
WITH CHECK (true);
