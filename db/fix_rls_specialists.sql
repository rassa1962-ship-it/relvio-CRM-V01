-- Исправление RLS для specialists
-- Выполнить в Supabase SQL Editor

-- 1. Удалить старую политику если есть
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.specialists;

-- 2. Создать правильную политику для вставки
-- Пользователь может вставить только свою запись (где auth_user_id = его id)
CREATE POLICY "Insert own specialist profile"
ON public.specialists
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- 3. Также создадим политику для обновления
CREATE POLICY "Update own specialist profile"
ON public.specialists
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- 4. Политика для чтения - каждый видит свою запись
CREATE POLICY "Read own specialist profile"
ON public.specialists
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- 5. Для админов - полный доступ
CREATE POLICY "Admin full access"
ON public.specialists
FOR ALL
TO authenticated
USING (
  role = 'admin'
)
WITH CHECK (
  role = 'admin'
);
