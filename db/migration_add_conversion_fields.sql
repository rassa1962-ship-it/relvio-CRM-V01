-- Миграция для увеличения конверсии лидов
-- Добавляет поля для отслеживания времени ответа, причин отказа и оплат

-- 1. Время до первого контакта (ключевой метрика)
ALTER TABLE leads ADD COLUMN first_contact_at timestamptz;

-- 2. Время оплаты
ALTER TABLE leads ADD COLUMN paid_at timestamptz;

-- 3. Сумма оплаты
ALTER TABLE leads ADD COLUMN price numeric(12,2);

-- 4. Причина отказа (критично для аналитики)
ALTER TABLE leads ADD COLUMN decline_reason text;

-- Комментарии для decline_reason:
-- 'price' - дорого
-- 'not_relevant' - не актуально
-- 'changed_mind' - передумал
-- 'other' - другое

-- 5. Время назначения специалисту
ALTER TABLE leads ADD COLUMN assigned_at timestamptz;

-- Индекс для быстрого поиска забытых лидов
CREATE INDEX IF NOT EXISTS leads_stale_idx ON leads (status, updated_at) 
WHERE status IN ('new', 'contacted');

-- Комментарий к таблице
COMMENT ON TABLE leads IS 'Лиды с расширенными полями для конверсии';
