# Statly CRM

Telegram Mini App для владельцев каналов и рекламных менеджеров.

Планируйте рекламные размещения, учитывайте сделки и смотрите доход по каналам — прямо внутри Telegram.

Frontend — вайбкод. Backend — нет.

## Возможности

- календарь размещений по дням, неделям и месяцам;
- учёт стоимости, формата, рекламодателя и статуса оплаты;
- аналитика по каналам и периодам;
- доступ менеджеров к каналам владельца;
- напоминания о размещениях в Telegram.

## Стек

| Часть | Технологии |
|-------|------------|
| Frontend | React, TypeScript, Vite |
| Backend | Python 3.12, FastAPI, SQLAlchemy async, asyncpg |
| Database | PostgreSQL |
| Bot | aiogram (long polling) |
| Jobs | APScheduler |
| Payments | Telegram Stars, Crypto Pay |
| Observability | Loki, Grafana Alloy, Grafana |

## Структура репозитория

```text
backend/          # FastAPI API, бот, планировщик
frontend/         # Telegram Mini App (Vite)
observability/    # Loki, Alloy, Grafana
compose.yaml      # локальный стек: app + db + логи
```

## Быстрый старт (Docker)

Нужны Docker и Docker Compose. Единственный ручной шаг — заполнить `.env`:

```bash
cp .env.example .env
docker compose up --build -d
```

После запуска:

- API: `http://localhost:8000`
- Grafana: `http://localhost:3001` (логин/пароль из `.env`)

Полезные команды:

```bash
docker compose down                          # стоп (данные сохраняются)
docker compose up --build -d app             # пересборка после правок кода
docker compose up -d --force-recreate app    # после смены .env
docker compose logs -f app                   # логи приложения
```

## Локальный запуск без Docker

### Требования

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+

### Backend

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

В `backend/.env` для разработки:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost:5432/statly
ALLOW_INSECURE_INIT_DATA=true
APP_ENV=development
```

`ALLOW_INSECURE_INIT_DATA=true` — только локально. В production должно быть `false`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`

## Конфигурация

Шаблоны окружения:

- корневой [.env.example](.env.example) — для Docker Compose;
- [backend/.env.example](backend/.env.example) — для запуска backend без Docker.

## Сборка frontend

```bash
cd frontend && npm run build
```
