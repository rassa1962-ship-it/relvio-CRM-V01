# STATE — Mini CRM + Mental Helper + Контент

## 1) Mini CRM — база (auth + /leads + Dashboard)

**Сейчас состояние:**
- Backend на http://localhost:3001 (Express + Supabase).
- Supabase Auth (email/password) подключен, login-форма работает.
- Фронт отправляет Authorization: Bearer <token> на защищённые маршруты.
- Dashboard:
  - KPI показывают реальные данные (например, "2 новых лида").
  - Кнопка "Добавить лида" создаёт лиды, они пишутся в Supabase и отображаются в CRM.
  - Есть кнопка "Все лиды" → переход на страницу /leads.
- /leads:
  - Подключена к роутеру.
  - Таблица: Дата, Канал, Контакт, Сегмент MH, Статус, Действия.
  - Фильтр по статусу.
  - Изменение статуса через Select.
  - Клик "Подробнее" открывает модал с деталями.
  - Есть кнопка "Назад" для возврата на Dashboard.

**Следующие 3–5 шагов:**
1. Проверить, что /api/leads, /api/funnel/summary, /api/sessions используют middleware authenticate и на уровне backend фильтруют данные по specialist_id.
2. На /leads слегка отполировать UX:
   - финализировать тексты статусов (Новый, В диалоге, Записан, Не дозвонился, Отказ, Клиент),
   - задать базовые цвета бейджей статуса.
3. Спланировать (в TODO) интерактивный donut-график "Лиды по сегментам MH" на Dashboard (данные по mh_segment_code за 7/30 дней).
4. (Опционально) добавить на /leads быстрый фильтр по каналу связи (TG/VK/Email/Phone).

**Done:**
- Auth через Supabase настроен, токен отправляется с запросами.
- Dashboard показывает реальные KPI и блок "Последние/новые лиды".
- Форма "Добавить лида" на Dashboard создаёт лиды.
- Страница /leads реализована (таблица + фильтр по статусу + смена статуса + модал + навигация).

---

## 2) RLS и безопасность

**Сейчас состояние:**
- RLS включён для таблиц:
  - specialists
  - leads
  - clients
  - (sessions пока без RLS, т.к. нет прямого поля specialist_id, связь идёт через clients).
- Предположение: `specialists.id = auth.uid()` (идентификатор пользователя в Supabase Auth).

**Политики (уже созданы):**

```sql
ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- sessions пока без RLS

-- specialists
CREATE POLICY "specialists_select_own"
ON public.specialists
FOR SELECT TO authenticated
USING (id = auth.uid());

-- leads
CREATE POLICY "leads_select_own"
ON public.leads
FOR SELECT TO authenticated
USING (specialist_id = auth.uid());

CREATE POLICY "leads_update_own"
ON public.leads
FOR UPDATE TO authenticated
USING (specialist_id = auth.uid());

-- clients
CREATE POLICY "clients_select_own"
ON public.clients
FOR SELECT TO authenticated
USING (specialist_id = auth.uid());

CREATE POLICY "clients_insert_own"
ON public.clients
FOR INSERT TO authenticated
WITH CHECK (specialist_id = auth.uid());

CREATE POLICY "clients_update_own"
ON public.clients
FOR UPDATE TO authenticated
USING (specialist_id = auth.uid());
Следующие 2–3 шага:

Убедиться, что все запросы с фронта к specialists/leads/clients выполняются от имени authenticated (есть JWT), а не анонимно.

Проверить, что POST /api/public/leads выполняет INSERT через supabaseAdmin (service_role) и не ломается о RLS.

На будущее: когда появится необходимость читать sessions напрямую из Supabase (через supabasePublic), решить:

либо добавить specialist_id в sessions и сделать политики по аналогии,

либо написать политику через client_id → clients.specialist_id.

3) Мост MHNext → /api/public/leads (бессонница + ИИ)
Сейчас состояние:

Продуман формат JSON для сценария "бессонница + ИИ-мост" (mh_segment_code = 'ai_bridge_insomnia').

Определён набор полей в leads:

specialist_id, status, mh_segment_code, contact_channel, contact_value, meta.

Следующие шаги:

Добавить поле meta (jsonb) в таблицу leads, если ещё не добавлено.

Обновить backend /api/public/leads:

валидировать specialist_id, mh_segment_code, contact_channel, contact_value, meta,

сохранять status = 'new' и meta.

В MHNext реализовать вызов POST /api/public/leads с этим JSON после экрана мостика.

Протестировать полный путь: пройти часть протокола → увидеть мост → оставить контакт → увидеть лид в /leads.

4) Dashboard /leads — визуал и статусы
Сейчас состояние:

/leads уже работает как рабочий стол (таблица + фильтры + статусы).

Статусы технически есть, но тексты/цвета ещё можно уточнить.

План по улучшению:

Зафиксировать словарь статусов в UI:

new → "Новый",

in_dialogue → "В диалоге",

booked → "Записан",

not_reached → "Не дозвонился",

rejected → "Отказ",

client → "Клиент".

Добавить цветовую схему бейджей (минимальный визуальный код).

Записать в TODO виджет donut "Лиды по сегментам MH" на Dashboard (12+ неделя, не сейчас).

5) Премиум‑аналитика (глобальный обзор сегментов)
Сейчас состояние:

Идея сформулирована: Premium/VIP‑уровень даёт доступ к агрегированному, анонимному обзору всех сегментов MH (без персональных данных).

Формат данных примерно такой:

json
[
  { "mh_segment_code": "insomnia", "leads_count": 1200, "active_users_30d": 800 },
  { "mh_segment_code": "anxiety", "leads_count": 950,  "active_users_30d": 600 }
]
Следующие шаги (на будущее, не в ближайших спринтах):

Определить флаг is_premium для specialists.

Спроектировать агрегирующий endpoint (или cron/материализованный view) для глобальной аналитики по сегментам.

Добавить на Dashboard премиум‑блок: "Общий обзор сегментов Mental Helper" (donut/бар-чарт) без персоналий.

text

Если захочешь, можем в следующий заход дооформить отдельный ROADMAP.md (по версиям: 0.1 — внутренняя, 0.2 — пилот с коллегами, 0.3 — мост MH, 0.4 — премиум‑аналитика).