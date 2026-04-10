-- Migration: Add meta field to leads table (Phase 3.1 MUST)
/* 
Выполнить в Supabase SQL Editor: https://supabase.com/dashboard
✓ Добавляет meta (jsonb) для хранения дополнительных данных из mini-mh
✓ Обновляет CHECK constraint для contact_channel (добавляет 'vk', 'phone')
✓ Создаёт GIN index для быстрых JSONB запросов
✓ Безопасно: IF NOT EXISTS, DROP IF EXISTS
*/

-- 1. Добавить поле meta (jsonb)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}';

-- 2. GIN индекс для meta (быстрые JSON запросы)
CREATE INDEX IF NOT EXISTS idx_leads_meta_gin 
ON public.leads USING GIN (meta);

-- 3. Обновить CHECK constraint для contact_channel (добавить vk, phone)
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_contact_channel_check;

ALTER TABLE public.leads 
ADD CONSTRAINT leads_contact_channel_check 
  CHECK (contact_channel IN ('telegram','vk','email','phone','in_app','other'));

-- 4. ПРОВЕРКА РЕЗУЛЬТАТА (выполнить ПОСЛЕ миграции)

-- Проверка поля meta:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'meta';

-- Проверка CHECK constraint:
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.leads'::regclass 
  AND contype = 'c' 
  AND conname LIKE '%contact_channel%';

-- Проверка тестовых данных:
SELECT id, mh_segment_code, contact_channel, meta 
FROM leads 
ORDER BY created_at DESC 
LIMIT 3;

-- ✅ Migration завершена. Meta = jsonb, constraint включает vk/phone.
