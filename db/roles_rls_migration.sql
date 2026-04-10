-- =====================================================
-- Миграция: Роли и RLS для Mini CRM
-- Выполнить в Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Добавить поле role в specialists
-- =====================================================
ALTER TABLE public.specialists
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'specialist' 
CHECK (role IN ('admin', 'specialist'));

-- =====================================================
-- 2. Добавить поле auth_user_id если его нет
-- =====================================================
ALTER TABLE public.specialists
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_specialists_auth_user_id 
ON public.specialists(auth_user_id);

-- =====================================================
-- 3. Создать helper функции
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_specialist_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.specialists s
  WHERE s.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_specialist_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.role
  FROM public.specialists s
  WHERE s.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- =====================================================
-- 4. Включить RLS на таблицах
-- =====================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS политики для LEADS
-- =====================================================

-- Specialist: видит только свои лиды
DROP POLICY IF EXISTS specialist_select_own_leads ON public.leads;
CREATE POLICY specialist_select_own_leads
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.current_specialist_role() = 'specialist'
  AND specialist_id = public.current_specialist_id()
);

-- Admin: видит все лиды
DROP POLICY IF EXISTS admin_select_all_leads ON public.leads;
CREATE POLICY admin_select_all_leads
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.current_specialist_role() = 'admin'
);

-- Specialist: может обновлять только свои лиды
DROP POLICY IF EXISTS specialist_update_own_leads ON public.leads;
CREATE POLICY specialist_update_own_leads
ON public.leads
FOR UPDATE
TO authenticated
USING (
  public.current_specialist_role() = 'specialist'
  AND specialist_id = public.current_specialist_id()
)
WITH CHECK (
  public.current_specialist_role() = 'specialist'
  AND specialist_id = public.current_specialist_id()
);

-- Admin: может обновлять любые лиды
DROP POLICY IF EXISTS admin_update_all_leads ON public.leads;
CREATE POLICY admin_update_all_leads
ON public.leads
FOR UPDATE
TO authenticated
USING (
  public.current_specialist_role() = 'admin'
)
WITH CHECK (
  public.current_specialist_role() = 'admin'
);

-- =====================================================
-- 6. RLS политики для CLIENTS
-- =====================================================

-- Specialist: видит только своих клиентов
DROP POLICY IF EXISTS specialist_select_own_clients ON public.clients;
CREATE POLICY specialist_select_own_clients
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.current_specialist_role() = 'specialist'
  AND specialist_id = public.current_specialist_id()
);

-- Admin: видит всех клиентов
DROP POLICY IF EXISTS admin_select_all_clients ON public.clients;
CREATE POLICY admin_select_all_clients
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.current_specialist_role() = 'admin'
);

-- Specialist: может обновлять только своих клиентов
DROP POLICY IF EXISTS specialist_update_own_clients ON public.clients;
CREATE POLICY specialist_update_own_clients
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.current_specialist_role() = 'specialist'
  AND specialist_id = public.current_specialist_id()
)
WITH CHECK (
  public.current_specialist_role() = 'specialist'
  AND specialist_id = public.current_specialist_id()
);

-- Admin: может обновлять любых клиентов
DROP POLICY IF EXISTS admin_update_all_clients ON public.clients;
CREATE POLICY admin_update_all_clients
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.current_specialist_role() = 'admin'
)
WITH CHECK (
  public.current_specialist_role() = 'admin'
);

-- =====================================================
-- 7. RLS политики для SESSIONS
-- =====================================================

-- Specialist: видит только свои сессии
DROP POLICY IF EXISTS specialist_select_own_sessions ON public.sessions;
CREATE POLICY specialist_select_own_sessions
ON public.sessions
FOR SELECT
TO authenticated
USING (
  public.current_specialist_role() = 'specialist'
  AND client_id IN (
    SELECT id FROM public.clients 
    WHERE specialist_id = public.current_specialist_id()
  )
);

-- Admin: видит все сессии
DROP POLICY IF EXISTS admin_select_all_sessions ON public.sessions;
CREATE POLICY admin_select_all_sessions
ON public.sessions
FOR SELECT
TO authenticated
USING (
  public.current_specialist_role() = 'admin'
);

-- Specialist: может создавать сессии для своих клиентов
DROP POLICY IF EXISTS specialist_insert_own_sessions ON public.sessions;
CREATE POLICY specialist_insert_own_sessions
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_specialist_role() = 'specialist'
  AND client_id IN (
    SELECT id FROM public.clients 
    WHERE specialist_id = public.current_specialist_id()
  )
);

-- Admin: может создавать любые сессии
DROP POLICY IF EXISTS admin_insert_all_sessions ON public.sessions;
CREATE POLICY admin_insert_all_sessions
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_specialist_role() = 'admin'
);

-- =====================================================
-- 8. Обновить вашу роль на admin
-- ВАЖНО: Замените UUID на ваш specialist_id
-- =====================================================
-- UPDATE public.specialists 
-- SET role = 'admin' 
-- WHERE id = 'ВАШ_UUID_ЗДЕСЬ';

-- Для поиска вашего specialist_id по email:
-- SELECT id, email, full_name FROM public.specialists;
