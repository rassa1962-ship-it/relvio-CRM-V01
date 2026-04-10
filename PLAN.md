# Текущее состояние Mini CRM - v2

## Что работает:

### ✅ Авторизация
- Supabase Auth включен (Email/Password)
- Страница Login с email/password формой
- Токен отправляется с каждым запросом
- Specialist_id = auth.users.id

### ✅ Dashboard
- KPI блоки показывают реальные данные (новые лиды = 2)
- Таблица "Последние лиды" с данными
- Форма "Добавить лида" работает!

### ✅ Backend
- POST /api/public/leads - создание лидов
- GET /api/leads - открыт без авторизации
- GET /api/funnel/summary - требует авторизацию
- GET /api/sessions - требует авторизацию

### ✅ Frontend
- http://localhost:3000 работает
- Форма добавления лидов на Dashboard
- Роутинг /login, /dashboard, /leads

## Изменённые файлы:
- frontend/src/hooks/useAuth.tsx - Supabase Auth
- frontend/src/pages/Login.tsx - форма входа
- frontend/src/api/client.ts - отправка токена
- frontend/src/pages/Dashboard.tsx - форма добавления лидов
- frontend/.env - исправлен URL
- backend/src/server.ts - исправлены ошибки

## Что нужно сделать (план):
1. Удалить старых лидов (не твой specialist_id)
2. Вернуть авторизацию на /api/leads
3. Настроить RLS политики
4. Подключить страницу Leads к меню

## Твой specialist_id:
`3a955f0f-d419-46df-bf97-a116d12fadf1`
