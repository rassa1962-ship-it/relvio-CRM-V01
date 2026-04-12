-- ==========================================================
-- СКРИПТ СОЗДАНИЯ АДМИНИСТРАТОРА
-- Запустить это в Supabase SQL Editor
-- ==========================================================

-- ❗ ВАЖНО: Пароль администратора устанавливается ВРУЧНУЮ в панели Supabase
-- ❗ Никогда не храните реальные пароли в репозитории!

-- 1. specialist role='admin' (только public таблица)
DELETE FROM public.specialists WHERE email = 'rassa1962@gmail.com';
INSERT INTO public.specialists (id, email, full_name, role, auth_user_id) 
VALUES (
  gen_random_uuid(), 
  'rassa1962@gmail.com', 
  'Главный Админ', 
  'admin', 
  (SELECT id FROM auth.users WHERE email = 'rassa1962@gmail.com')
);

-- 2. ПРОВЕРКА specialist
SELECT * FROM specialists WHERE email = 'rassa1962@gmail.com';

-- 3. Инструкция по установке пароля:
-- Supabase Dashboard → Authentication → Users
-- Найди rassa1962@gmail.com → View → Update Password
-- Установите надёжный уникальный пароль
-- Отметьте Email confirmed: true

-- ✅ ТЕСТ: Dashboard → должна быть кнопка "Админ"