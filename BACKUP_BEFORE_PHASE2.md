# Backup before Phase 2 - "Запуск и первые деньги"

## Дата: 2026-03-20

### Текущее состояние (до изменений):

**Backend:**
- POST /api/public/leads - создание лида
- GET /admin/leads - все лиды
- GET /admin/specialists - специалисты
- PATCH /admin/leads/:id - обновление

**Frontend:**
- /admin/leads страница с модалом
- Нет авто-распределения
- Нет статуса "paid"
- Нет timestamps (assigned_at, first_contact_at)

**Схема БД:**
- specialist_id NOT NULL
- status: new, contacted, booked, no_response, declined

---

## Планируемые изменения:

### Backend:
1. specialist_id сделать nullable
2. Авто-распределение при создании лида
3. Добавить статус "paid"
4. Добавить timestamps (assigned_at, first_contact_at)
5. Логика при обновлении

### Frontend:
1. Убрать модал, добавить inline dropdown
2. Optimistic UI
3. Подсветка горячих лидов (score >= 7)
4. Кликабельные контакты
5. Мини-аналитика
