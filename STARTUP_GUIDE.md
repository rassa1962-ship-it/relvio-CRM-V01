# 🚀 Шпаргалка по запуску проектов

## Структура проектов

```
C:\Users\rassa\Mini CRM MHNext\   ← Mini CRM (frontend + backend)
C:\Users\rassa\mini-mh\           ← mini-MH (Next.js мини-апп)
```

---

## Mini CRM

### Frontend (React)
```powershell
cd "C:\Users\rassa\Mini CRM MHNext"
cd frontend
npm run dev
```
📍 Откроется: **http://localhost:3000**

---

### Backend (Express)
```powershell
cd "C:\Users\rassa\Mini CRM MHNext"
cd backend
npm run dev
```
📍 Работает: **http://localhost:3001**

---

## mini-MH (мини-апп для сбора лидов)

```powershell
cd "C:\Users\rassa\mini-mh"
npm run dev:webpack
```
📍 Откроется: **http://localhost:3002**

---

## Быстрый запуск (все 3 сервиса)

Открой **3 отдельных терминала**:

### Терминал 1 - Mini CRM Frontend
```powershell
cd "C:\Users\rassa\Mini CRM MHNext"
cd frontend
npm run dev
```

### Терминал 2 - Mini CRM Backend
```powershell
cd "C:\Users\rassa\Mini CRM MHNext"
cd backend
npm run dev
```

### Терминал 3 - mini-MH
```powershell
cd "C:\Users\rassa\mini-mh"
npm run dev:webpack
```

---

## URLs

| Сервис | URL | Описание |
|--------|-----|----------|
| Mini CRM | http://localhost:3000 | CRM для психологов |
| Backend API | http://localhost:3001 | API для CRM |
| mini-MH | http://localhost:3002 | Мини-апп для лидов |

---

## Если что-то не работает

### Ошибка "port already in use"
```powershell
taskkill /F /PID <номер_процесса>
```
Или используй другой порт.

### Перезапуск
1. Нажми `Ctrl+C` в терминале
2. Запусти заново

### Ошибка 404 в админке
- Убедись что backend запущен
- Перезапусти backend полностью

---

## Команды для разработки

```powershell
# Перезапуск backend
cd backend
npm run dev

# Пересборка frontend
cd frontend
npm run build

# Линтинг
cd frontend
npm run lint
```

---

## Роли

- **Mini CRM** - управление лидами, клиентами, сессиями
- **mini-MH** - лендинг для сбора лидов с бессонницей
- **Backend API** - связующее звено между ними
