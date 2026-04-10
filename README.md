# Mini CRM MHNext - План и Setup

## Описание
Backend (Node/Express + Supabase) + Web-Dashboard (React/Vite) для психолога. Лидогенерация из mental-helper app через /api/public/leads.

## Быстрый старт
1. Создайте Supabase проект (https://supabase.com/dashboard): new project.
2. В SQL Editor запустите `db/schema.sql`.
3. Включите Auth > Email (allow signups).
4. Создайте specialist: INSERT into specialists (email, password_hash, full_name) VALUES ('test@ex.com', '<hash>', 'Test Psych'); Получите UUID.
5. Backend:
   ```
   cd \"C:/Users/rassa/Mini CRM MHNext\"/backend
   npm install
   cp .env.example .env
   # Заполните SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY из Supabase Settings > API
   npm run dev
   ```
   Backend: http://localhost:3001

6. Frontend:
   ```
   cd \"C:/Users/rassa/Mini CRM MHNext\"/frontend
   npm install
   cp .env.example .env  # SUPABASE_URL, SUPABASE_ANON_KEY
   npm run dev
   ```
   Dashboard: http://localhost:3000

7. Тестирование:
   - POST http://localhost:3001/api/public/leads {specialist_id: 'uuid', ...}
   - Login в dashboard, view leads.

## Структура
See PLAN.md, TODO.md

## Зависимости
Node 18+, npm.

## Подробная документация
Новая подробная документация: см. [README_MHNext.md](README_MHNext.md).


