# Mini CRM MHNext

**Mini CRM MHNext** — агрегатор каналов для психологов: приём лидов из Mental Helper (mini-mh) и других источников, распределение специалистам, воронка продаж и аналитика. Полигон для полевых испытаний перед масштабированием на Mental Helper Next (флагман).

---

## Статус проекта

| Фаза | Статус | Что включает |
|-------|--------|--------------|
| Phase 1 — Базовая CRM | ✅ Завершена | Auth, Dashboard, Leads, Backend API |
| Phase 2 — Расширение | ✅ Завершена | RLS, Admin-панель, воронка, stale-leads, аналитика |
| Phase 3 — MHNext Bridge | 🔄 В процессе | Мост mini-mh → /api/public/leads (сценарий «бессонница + ИИ») |
| Phase 4 — Premium | ⏳ TODO | Премиум-аналитика, агрегация сегментов |

### Что работает сейчас
- **Авторизация** — Supabase Auth (email/password), JWT-токены
- **Dashboard** — KPI-блоки (новые лиды, выручка, забытые), таблица последних лидов, форма добавления
- **Leads** — таблица с фильтром по статусу, смена статуса, модалка с деталями
- **Admin-панель** — все лиды, назначение специалистам, обновление статусов
- **Воронка** — GET /api/funnel/summary (new → contacted → booked → paid)
- **Stale-leads** — автоматическое обнаружение «забытых» лидов (>2 часов без действия)
- **Auto-assign** — автоматическое распределение новых лидов специалисту с наименьшей нагрузкой
- **RLS** — Row Level Security на specialists, leads, clients

---

## Архитектура

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   mini-mh    │    │  Другие      │    │  Ручное      │
│  (Next.js)   │    │  каналы      │    │  добавление  │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
       ┌───────────────────────────────────────┐
       │         Mini CRM Backend              │
       │    Express + Supabase (port 3001)     │
       │  • API: /api/public/leads, /api/leads │
       │  • Auth middleware (JWT)               │
       │  • Auto-assign, funnel, analytics     │
       └───────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────────────┐
       │         Supabase (PostgreSQL)         │
       │  specialists, leads, clients, sessions│
       │  RLS enabled                          │
       └───────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────────────┐
       │       Mini CRM Frontend               │
       │    React 18 + Vite (port 3000)        │
       │  /login, /dashboard, /leads, /profile │
       │  /admin/leads                         │
       └───────────────────────────────────────┘
```

---

## API Endpoints

### Публичные (без авторизации)

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/public/leads` | Создание лида. Принимает `specialist_id`, `mh_segment_code`, `contact_channel`, `contact_value`, `meta`. Автоматическое распределение если specialist_id не указан. |

### Аутентифицированные (JWT required)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/me` | Профиль текущего специалиста |
| `GET` | `/api/leads` | Список лидов текущего специалиста. Фильтр: `?status=new` |
| `PATCH` | `/api/leads/:id` | Обновить лид (статус, client_id). Только свои лиды |
| `GET` | `/api/clients` | Список клиентов текущего специалиста |
| `POST` | `/api/clients` | Создать клиента (display_name, contact_channel, contact_value) |
| `GET` | `/api/sessions` | Список сессий. Фильтры: `?client_id=`, `?from=`, `?to=` |
| `POST` | `/api/sessions` | Создать сессию (client_id, start_time, format, status) |
| `GET` | `/api/funnel/summary` | KPI воронки за 30 дней (по статусам, выручка, avgResponseMinutes, stale) |
| `GET` | `/api/leads/stale` | Забытые лиды (>2 часов без действия в статусах new/contacted) |

### Администратор (admin role required)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/admin/leads` | Все лиды. Фильтры: `?status=`, `?channel=`, `?source=`, `?dateFrom=`, `?dateTo=`, `?limit=`, `?offset=` |
| `GET` | `/admin/specialists` | Список всех специалистов (id, full_name, email) |
| `PATCH` | `/admin/leads/:id` | Обновить любой лид (status, specialist_id, client_id, price). Авто-создание клиента при status=booked |
| `GET` | `/api/analytics/by-source` | Аналитика по источникам и типам проблем за период |

---

## Статусы лида

| Код | Название | Описание |
|-----|----------|----------|
| `new` | Новый | Лид только что поступил |
| `contacted` | В диалоге | Специалист начал работу с лидом |
| `booked` | Записан | Клиент записан на сессию |
| `paid` | Оплачен | Сессия оплачена |
| `no_response` | Не дозвонился | Не удалось связаться |
| `declined` | Отказ | Клиент отказался |

**Конверсия:** new → contacted → booked → paid

---

## Быстрый старт

### Требования
- Node.js 18+
- npm
- Supabase проект (https://supabase.com/dashboard)

### 1. Настройка Supabase

```bash
# Создайте проект на supabase.com
# В SQL Editor запустите db/schema.sql
# Включите Auth → Email (allow signups)
```

### 2. Backend (port 3001)

```bash
cd backend
npm install
cp .env.example .env
# Заполните .env:
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_ANON_KEY=your-anon-key
#   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npm run dev
# → http://localhost:3001
```

### 3. Frontend — Mini CRM (port 3000)

```bash
cd frontend
npm install
cp .env.example .env
# Заполните .env:
#   VITE_SUPABASE_URL=https://xxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key
#   VITE_API_URL=http://localhost:3001
npm run dev
# → http://localhost:3000
```

### 4. mini-mh — Landing (port 3002)

```bash
cd ../mini-mh
npm install
npm run dev
# → http://localhost:3002
```

### 5. Тестирование

```bash
# Создать лид через API
curl -X POST http://localhost:3001/api/public/leads \
  -H "Content-Type: application/json" \
  -d '{"specialist_id":"<uuid>","mh_segment_code":"ai_bridge_insomnia","contact_channel":"telegram","contact_value":"@testuser"}'

# Войти в Dashboard → http://localhost:3000/login
# Посмотреть лиды → http://localhost:3000/leads
```

---

## Стек технологий

### Backend
| Пакет | Версия |
|-------|--------|
| express | 4.19.2 |
| @supabase/supabase-js | 2.45.4 |
| zod | 3.23.8 |
| cors | 2.8.5 |
| typescript | 5.5.4 |
| tsx | 4.19.1 |

### Frontend
| Пакет | Версия |
|-------|--------|
| react | 18.3.1 |
| react-dom | 18.3.1 |
| react-router-dom | 6.26.2 |
| @supabase/supabase-js | 2.45.4 |
| tailwindcss | 3.4.13 |
| vite | 5.4.8 |
| typescript | 5.6.3 |
| lucide-react | 0.451.0 |
| class-variance-authority | 0.7.0 |

### База данных
| Компонент | Описание |
|-----------|----------|
| Supabase | PostgreSQL + Auth + RLS |
| RLS | Включён на specialists, leads, clients |

---

## Структура проекта

```
Mini CRM MHNext/
├── README_MHNext.md          # Этот файл
├── README.md                 # (legacy) Устаревший readme
├── SPEC.md                   # Продуктовая спецификация
├── PLAN.md                   # План разработки
├── STATE.md                  # Текущее состояние проекта
├── TODO.md                   # Список задач
├── STARTUP_GUIDE.md          # Гайд по запуску
├── REPORT.md                 # Отчёт (Supabase credentials, endpoints)
├── RECOMMENDATIONS.md        # Рекомендации
├── BACKUP_BEFORE_PHASE2.md   # Бэкап перед Phase 2
├── MONETIZATION_SQL.sql      # SQL для монетизации
├── PHASE2_SQL_CHANGES.sql    # SQL миграции Phase 2
│
├── backend/                  # CRM API (Express + Supabase)
│   ├── src/
│   │   ├── server.ts         # Все API routes
│   │   ├── types.ts          # TypeScript типы
│   │   └── middleware/
│   │       └── auth.ts       # JWT аутентификация
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Mini CRM UI (React + Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx           # Маршрутизация
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # KPI + форма добавления лида
│   │   │   ├── Leads.tsx      # Таблица лидов + фильтры
│   │   │   ├── AdminLeads.tsx # Админ-панель
│   │   │   ├── Login.tsx      # Авторизация
│   │   │   └── Profile.tsx    # Профиль
│   │   ├── api/
│   │   │   ├── client.ts      # HTTP клиент с JWT
│   │   │   └── adminLeads.ts  # Admin API
│   │   └── hooks/
│   │       ├── useAuth.tsx    # Supabase Auth hook
│   │       ├── useUser.tsx    # User context
│   │       └── useTheme.tsx   # Theme hook
│   └── package.json
│
├── db/                       # SQL скрипты
│   ├── schema.sql            # Основная схема
│   ├── roles_rls_migration.sql
│   ├── fix_*.sql             # Исправления
│   └── migration_*.sql       # Миграции
│
└── docs/
    └── tree_current_mhnext.txt
```

> **Примечание:** Директория `mini-mh/` (Next.js landing) находится вне этого репозитория: `C:\Users\rassa\mini-mh`

---

## RLS (Row Level Security)

Политики безопасности на уровне строк:

| Таблица | Политика | Описание |
|---------|----------|----------|
| specialists | `specialists_select_own` | SELECT только свой профиль (id = auth.uid()) |
| leads | `leads_select_own` | SELECT только свои лиды |
| leads | `leads_update_own` | UPDATE только свои лиды |
| clients | `clients_select_own` | SELECT только своих клиентов |
| clients | `clients_insert_own` | INSERT только с своим specialist_id |
| clients | `clients_update_own` | UPDATE только своих клиентов |

> `sessions` пока без RLS (связь идёт через clients.specialist_id).

---

## Ссылки

| Ресурс | URL |
|--------|-----|
| GitHub | https://github.com/rassa1962-ship-it/mini-mh |
| Supabase Dashboard | https://supabase.com/dashboard |
| Supabase Project | https://hdpnehemjbhvmdldrdeh.supabase.co |

---

## TODO

- [ ] Финализация моста mini-mh → /api/public/leads (Phase 3)
- [ ] RLS для sessions (через specialist_id или client_id → clients)
- [ ] Donut-график «Лиды по сегментам MH» на Dashboard
- [ ] Премиум-аналитика (агрегация по сегментам, Premium/VIP)
- [ ] Шаблоны/скрипты продаж в UI
- [ ] Mobile-оптимизация Dashboard

---

*Последнее обновление: 2026-03-29*