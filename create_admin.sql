-- ==========================================================
-- СКРИПТ СОЗДАНИЯ ПЕРВОГО АДМИНИСТРАТОРА
-- Запустить это в Supabase SQL Editor
-- ==========================================================

-- 1. Создаём пользователя в auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@relvio.solutions',  -- ✏️ Заменить на твой email
  crypt('Relvio2026!', gen_salt('bf')),  -- ✏️ Заменить на твой пароль
  now(),
  '{"role": "admin"}',
  '{"name": "Admin"}',
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- 2. Создаём профиль в public.profiles
INSERT INTO public.profiles (
  id,
  user_id,
  email,
  role,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'admin@relvio.solutions'),  -- ✏️ Тот же email что и выше
  'admin@relvio.solutions',  -- ✏️ Тот же email что и выше
  'admin',
  now(),
  now()
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Создаём специалиста в public.specialists
INSERT INTO public.specialists (
  auth_user_id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@relvio.solutions'),  -- ✏️ Тот же email что и выше
  'admin@relvio.solutions',  -- ✏️ Тот же email что и выше
  'Главный администратор',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT (auth_user_id) DO NOTHING;

-- 4. Проверка результата
SELECT '✅ Администратор создан успешно!' as result;
SELECT * FROM auth.users WHERE email = 'admin@relvio.solutions';
SELECT * FROM public.profiles WHERE email = 'admin@relvio.solutions';