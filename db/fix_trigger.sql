-- Исправленный trigger для автоматического создания специалиста
-- Выполнить в Supabase SQL Editor

-- Удалить старую функцию и trigger если есть
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Создать новую функцию
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Пытаемся вставить, если email уже есть - ничего не делаем
  INSERT INTO public.specialists (auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'specialist'
  )
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Создать trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
