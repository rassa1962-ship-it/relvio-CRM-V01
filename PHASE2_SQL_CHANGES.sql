-- ============================================
-- Mini CRM Phase 2 - SQL Changes
-- Выполнить в Supabase SQL Editor
-- ============================================

-- 1.1 Сделать specialist_id nullable
ALTER TABLE leads ALTER COLUMN specialist_id DROP NOT NULL;

-- 1.4 Добавить статус 'paid'
-- Удаляем старое ограничение
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
-- Добавляем новое с 'paid'
ALTER TABLE leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'contacted', 'booked', 'paid', 'no_response', 'declined'));

-- 1.5 Добавить timestamps
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at timestamptz;

-- Проверить результат
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads';
