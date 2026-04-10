-- ============================================
-- Phase 2: Система монетизации
-- Выполнить в Supabase SQL Editor
-- ============================================

-- 1. Добавить колонки для денег
ALTER TABLE leads ADD COLUMN IF NOT EXISTS price numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Проверить
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('price', 'paid_at');
