# Mini CRM MHNext - Product Specification

## 1. Overview

### Что такое Mini CRM MHNext?

**Mini CRM MHNext** — это **агрегатор каналов** для психотерапевтической ниши, который является полигоном для испытаний и сбора информации.

### Архитектура продукта

```
┌─────────────────────────────────────────────────────────────────┐
│                   Mini CRM MHNext (Полевое тестирование)         │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   mini-mh    │    │    Другие    │    │    Ручное    │     │
│   │  (воронка)   │    │   каналы     │    │   добавление │     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                    │                    │             │
│          └────────────────────┼────────────────────┘             │
│                               ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐     │
│   │              Mini CRM (агрегатор каналов)               │     │
│   │  • Приём лидов с разных источников                      │     │
│   │  • Распределение специалистам                           │     │
│   │  • Аналитика воронки                                   │     │
│   │  • Инструменты продаж (скрипты, шаблоны)               │     │
│   └─────────────────────────┬───────────────────────────┘     │
│                             │                                    │
│              ┌──────────────┴──────────────┐                   │
│              │    Анализ и изучение         │                   │
│              │    лучших практик            │                   │
│              └──────────────┬──────────────┘                   │
│                             ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐     │
│   │              Mental Helper Next (ФЛАГМАН)                 │     │
│   │   • Нативное B2C приложение (iOS)                       │     │
│   │   • Главный поставщик лидов для CRM                    │     │
│   │   • Быстрая помощь при стрессе и кризисах              │     │
│   │   • Мягкий мост к живому специалисту                   │     │
│   │   • Внедрение лучших практик из полевых испытаний     │     │
│   └─────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Проблема
- Нет системы для отслеживания лидов (потенциальных клиентов)
- Ручное ведение клиентов в таблицах/заметках
- Нет автоматического распределения лидов между специалистами
- Нет аналитики по воронке продаж

### Решение
Mini CRM — система для автоматизации работы с лидами:
- Приём лидов с лендингов (mini-mh приложение)
- Поддержка всех популярных каналов связи
- Автоматическое распределение лидов специалистам
- Отслеживание статуса лида (новый → в диалоге → записан → оплачен)
- Аналитика воронки и метрик

---

## 1.1 Каналы связи

### Поддерживаемые каналы
- 📱 **Телефон** — звонки, SMS, WhatsApp
- 📧 **Email** — почтовые рассылки
- 💬 **Telegram** — мессенджер
- 🔵 **VK** — социальная сеть
- 📱 **in_app** — внутренние обращения
- ➕ **Другое** — прочие каналы

### Архитектура каналов
```
Лид → [Канал] → Mini CRM → [Распределение] → Специалист
```

---

## 2. User Flow

### Flow 1: Создание лида (Landing → CRM)
```
1. Пользователь заходит на mini-mh (localhost:3002)
2. Заполняет форму (имя, контакт, сегмент)
3. Нажимает "Отправить"
4. Лид уходит в CRM на backend (localhost:3001)
5. Лид автоматически распределяется специалисту
6. Специалист видит лид в Dashboard
```

### Flow 2: Работа с лидом
```
1. Специалист видит лид в таблице на Dashboard
2. Меняет статус: new → contacted → booked → paid
3. Копирует скрипт продажи (быстрые действия)
4. Создаёт сессию (встречу) с клиентом
5. Отмечает оплату
```

---

## 3. Список функций

### Основные функции

#### Лиды
- [x] Приём лидов через API
- [x] Автоматическое распределение специалистам
- [x] Статусы: new, contacted, booked, paid, no_response, declined
- [x] Поля: имя, контакт, канал (telegram, email, phone), сегмент
- [x] Время отклика (first_contact_at)

#### Сессии (встречи)
- [x] Создание сессий
- [x] Статусы: scheduled, done, no_show, cancelled
- [x] Формат: online/offline
- [x] Длительность, цена, оплата

#### Клиенты
- [x] Привязка лидов к клиентам
- [x] История сессий
- [x] Статусы: new, active, paused, closed

#### Аналитика
- [x] Воронка (new → contacted → booked → paid)
- [x] KPI: количество, выручка, забытые лиды
- [x] Визуальный график воронки

#### Инструменты продаж
- [x] Кнопки быстрых действий (скрипты)
- [x] Шаблоны: приветствие, диагностика, предложение, дожим

---

## 4. Архитектура

### Тех-стек

#### Frontend (Mini CRM)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Auth**: Supabase Auth
- **State**: React hooks

#### Backend (CRM API)
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **ORM**: прямое подключение через supabase-js

#### Landing (mini-mh)
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS v4
- **API**: Отправка лидов в CRM

### База данных (Supabase)

```
specialists ( специалисты )
├── id (uuid)
├── email (text)
├── password_hash (text)
├── full_name (text)
└── timezone (text)

clients ( клиенты )
├── id (uuid)
├── specialist_id (uuid)
├── display_name (text)
├── contact_channel (text)
├── contact_value (text)
├── status (text)
├── source (text)
└── created_at (timestamptz)

leads ( лиды )
├── id (uuid)
├── specialist_id (uuid)
├── client_id (uuid, nullable)
├── campaign_id (uuid, nullable)
├── mh_segment_code (text)
├── contact_channel (text)
├── contact_value (text)
├── status (text)
├── meta (jsonb)
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── first_contact_at (timestamptz, nullable)
└── ...расширенные поля

sessions ( сессии )
├── id (uuid)
├── client_id (uuid)
├── start_time (timestamptz)
├── duration_minutes (int)
├── format (text)
├── status (text)
├── short_summary (text)
├── price (numeric)
├── is_paid (boolean)
└── created_at (timestamptz)
```

### API Routes

```
POST /api/public/leads    — Создать лид (публичный)
GET  /api/admin/leads     — Список лидов (админ)
GET  /api/admin/specialists — Список специалистов
PATCH /api/admin/leads/:id — Обновить лид
```

---

## 5. Метрики успеха

### KPI
- **Конверсия**: new → contacted → booked → paid
- **Время ответа**: < 5 мин (отлично), 5-30 мин (хорошо), >60 мин (плохо)
- **Выручка**: сумма оплаченных сессий
- **Забытые лиды**: без действия > 2 часов

### Цели
- [ ] > 50% лидов доходят до статуса "contacted" за 30 мин
- [ ] > 20% конверсия в записи
- [ ] Среднее время ответа < 10 мин

---

## 6. Запуск

### Требования
- Node.js 18+
- Supabase аккаунт

### Установка

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Настроить .env (SUPABASE_URL, SUPABASE_KEY)
npm run dev

# Frontend (Mini CRM)
cd frontend
npm install
npm run dev

# Landing (mini-mh)
cd mini-mh
npm install
npm run dev
```

### Порты
- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- mini-mh: http://localhost:3002

---

## 7. Структура проекта

```
Mini CRM MHNext/
├── SPEC.md                  # Этот документ
├── README.md                # Основная документация
├── STARTUP_GUIDE.md         # Гайд по запуску
├── PLAN.md                  # План разработки
├── REPORT.md                # Отчёт
├── STATE.md                 # Текущее состояние
│
├── backend/                 # CRM API
│   ├── src/
│   │   ├── server.ts       # Express сервер
│   │   ├── types.ts        # TypeScript типы
│   │   └── middleware/
│   │       └── auth.ts     # Аутентификация
│   └── package.json
│
├── frontend/                # Mini CRM UI
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Leads.tsx
│   │   │   └── ...
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── hooks/
│   │       └── useAuth.tsx
│   └── package.json
│
├── mini-mh/                 # Landing страница
│   ├── app/
│   │   ├── page.tsx
│   │   └── lead/
│   │       └── page.tsx
│   ├── lib/
│   │   └── crmApi.ts
│   └── package.json
│
└── db/
    ├── schema.sql           # Базовая схема
    ├── migration_*.sql      # Миграции
    └── fix_*.sql           # Исправления
```

---

## 8. Версии

- **v1.0.0** - Базовая CRM с лидами и сессиями
- **v1.1.0** - Аналитика и KPI
- **v1.2.0** - Инструменты продаж (скрипты)

---

*Generated: 2026-03-21*
