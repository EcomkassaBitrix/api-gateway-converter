# 🏗️ Архитектура проекта

## Общая схема

```
┌─────────────────────────────────────────────────────────────┐
│                   gw.ecomkassa.ru                           │
│                   (Ваш сервер)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     nginx (порт 80/443)                     │
│                     SSL Termination                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────────┐
    │   /api/*          │   │   /                   │
    │   Проксируется    │   │   Статические файлы   │
    │   на localhost    │   │   (React SPA)         │
    │   :3001           │   │   /dist               │
    └───────────────────┘   └───────────────────────┘
                │
                ▼
    ┌───────────────────────────────────┐
    │   Express.js Server               │
    │   (PM2 process manager)           │
    │                                   │
    │   Routes:                         │
    │   POST /api/Authorization/        │
    │        CreateAuthToken            │
    │   GET  /api/kkt/cloud/status      │
    │   POST /api/kkt/cloud/receipt     │
    │   GET  /health                    │
    └───────────────────────────────────┘
                │
                ▼
    ┌───────────────────────────────────┐
    │   PostgreSQL (опционально)        │
    │   Таблица: logs                   │
    │   Логирование запросов            │
    └───────────────────────────────────┘
```

---

## Поток данных

### 1. Авторизация

```
Пользователь (Postman/curl)
    │
    │ POST /api/Authorization/CreateAuthToken
    │ { login, password }
    ▼
nginx (gw.ecomkassa.ru:443)
    │
    │ Проксирует на localhost:3001
    ▼
Express.js Server
    │
    │ Логирует запрос в PostgreSQL
    │
    │ Конвертирует: login → login
    │                password → pass
    ▼
eKomKassa API
(https://app.ecomkassa.ru/fiscalorder/v5/getToken)
    │
    │ { token, group_code }
    ▼
Express.js Server
    │
    │ Логирует ответ в PostgreSQL
    ▼
nginx → Пользователь
    │
    │ { token, group_code }
    ✓
```

### 2. Создание чека (Ferma формат)

```
Пользователь
    │
    │ POST /api/kkt/cloud/receipt
    │ { Request: { CustomerReceipt: {...} }, token }
    ▼
nginx
    │
    ▼
Express.js Server
    │
    │ Конвертирует Ferma → eKomKassa:
    │   - Items[] → items[]
    │   - Vat ("Vat20") → vat.type ("vat20")
    │   - TaxationSystem ("Common") → sno ("osn")
    │   - PaymentMethod (4) → payment_method ("full_payment")
    │   - Measure ("PIECE") → measure (0)
    │
    │ Формирует payload для eKomKassa
    ▼
eKomKassa API
(https://app.ecomkassa.ru/fiscalorder/v5/700/sell)
    │
    │ { uuid, status, ... }
    ▼
Express.js Server
    │
    │ Логирует в PostgreSQL
    ▼
nginx → Пользователь
    │
    │ { uuid, status }
    ✓
```

---

## Структура файлов

### Frontend (React SPA)

```
src/
├── components/
│   ├── ui/                    # shadcn/ui компоненты
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   └── gateway/               # Компоненты Gateway
│       ├── AuthTab.tsx        # Вкладка авторизации
│       ├── StatusTab.tsx      # Вкладка статуса чека
│       ├── ReceiptTab.tsx     # Вкладка создания чека
│       └── TestResults.tsx    # Результаты тестов
│
├── pages/
│   ├── Index.tsx              # Главная страница (форма)
│   ├── RequestLogs.tsx        # Страница логов
│   └── NotFound.tsx           # 404 страница
│
├── lib/
│   └── utils.ts               # Утилиты (cn, getApiUrl)
│
├── App.tsx                    # React Router
├── main.tsx                   # Entry point
└── index.css                  # Tailwind CSS

dist/                          # Production build
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── ...
```

### Backend (Express.js Server)

```
server/
├── index.js                   # Основной сервер
│   ├── Express app setup
│   ├── CORS middleware
│   ├── POST /api/Authorization/CreateAuthToken
│   ├── GET  /api/kkt/cloud/status
│   ├── POST /api/kkt/cloud/receipt
│   │   ├── convertFermaToEkomkassa()
│   │   └── convertSimpleFormat()
│   ├── GET  /health
│   └── logToDB()
│
├── package.json               # Зависимости
├── .env.example               # Пример конфигурации
├── .env                       # Локальная конфигурация
├── .gitignore
│
├── README.md                  # API документация
├── DEPLOY.md                  # Подробная инструкция
├── QUICK-START.md             # Быстрый старт
├── nginx-config-example.conf  # Nginx конфиг
└── test-api.sh                # Тестовый скрипт
```

### Database

```
db_migrations/
└── V1__init.sql               # Создание таблицы logs

logs table:
├── id (SERIAL PRIMARY KEY)
├── function_name (VARCHAR)    # 'auth', 'status', 'receipt'
├── log_level (VARCHAR)        # 'INFO', 'ERROR'
├── message (TEXT)
├── request_data (TEXT)        # JSON
├── response_data (TEXT)       # JSON
├── request_id (VARCHAR)
├── duration_ms (INTEGER)
├── status_code (INTEGER)
└── timestamp (TIMESTAMP)
```

---

## Маппинг данных (Ferma → eKomKassa)

### Типы НДС

| Ferma           | eKomKassa |
|-----------------|-----------|
| VatNo           | none      |
| Vat0            | vat0      |
| Vat10           | vat10     |
| Vat20           | vat20     |
| CalculatedVat10110 | vat10  |
| CalculatedVat20120 | vat20  |

### Система налогообложения

| Ferma                    | eKomKassa       |
|--------------------------|-----------------|
| Common                   | osn             |
| Simplified               | usn_income      |
| SimplifiedWithExpenses   | usn_income_outcome |
| Unified                  | envd            |
| Patent                   | patent          |
| UnifiedAgricultural      | esn             |

### Признак способа расчёта

| Ferma (число) | eKomKassa          |
|---------------|--------------------|
| 0             | full_prepayment    |
| 1             | prepayment         |
| 2             | advance            |
| 3             | full_payment       |
| 4             | partial_payment    |
| 5             | credit             |
| 6             | credit_payment     |

### Единицы измерения

| Ferma                | eKomKassa (число) |
|----------------------|-------------------|
| PIECE                | 0                 |
| GRAM                 | 10                |
| KILOGRAM             | 11                |
| METER                | 22                |
| LITER                | 41                |
| KILOWATT_HOUR        | 50                |
| DAY                  | 70                |
| HOUR                 | 71                |
| OTHER                | 255               |

### Типы операций

| Ferma                      | eKomKassa               |
|----------------------------|-------------------------|
| Income                     | sell                    |
| IncomeReturn               | sell_refund             |
| Outcome                    | buy                     |
| OutcomeReturn              | buy_refund              |
| IncomeCorrection           | sell_correction         |
| OutcomeCorrection          | buy_correction          |

---

## Безопасность

### 1. SSL/TLS

```
Let's Encrypt (Certbot)
    ↓
Автоматическое продление каждые 90 дней
    ↓
nginx с SSL конфигурацией
    ↓
TLS 1.2 / 1.3 только
```

### 2. Заголовки безопасности

```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### 3. Изоляция процессов

```
PM2 запускает Node.js процесс
    ↓
Работает от непривилегированного пользователя
    ↓
Доступ только к localhost:3001
    ↓
nginx проксирует только /api/* paths
```

### 4. Логи

```
PostgreSQL logs table
    ↓
Логирование запросов/ответов
    ↓
Мониторинг ошибок
    ↓
Request ID для трейсинга
```

---

## Производительность

### Nginx

- **Кеширование статики**: 1 год для JS/CSS/images
- **gzip сжатие**: включено
- **HTTP/2**: поддерживается

### Express.js

- **PM2 cluster mode**: можно запустить несколько инстансов
- **Таймауты**: 60 секунд на запрос
- **Keep-Alive**: соединения переиспользуются

### PostgreSQL

- **Connection pooling**: через pg.Pool
- **Индексы**: на request_id, timestamp
- **Опциональность**: можно отключить для лучшей производительности

---

## Мониторинг

```bash
# PM2 статус
pm2 status

# Логи в реальном времени
pm2 logs ekomkassa-gateway

# Ресурсы
pm2 monit

# Nginx статус
systemctl status nginx

# Логи nginx
tail -f /var/log/nginx/gw.ecomkassa.ru-access.log
tail -f /var/log/nginx/gw.ecomkassa.ru-error.log
```

---

## Резервное копирование

### База данных

```bash
# Бэкап
pg_dump ekomkassa_gateway > backup_$(date +%Y%m%d).sql

# Восстановление
psql ekomkassa_gateway < backup_20241015.sql
```

### Код проекта

```bash
# Через Git
git pull  # Всегда можно откатиться на предыдущий коммит

# Ручной бэкап
tar -czf backup_$(date +%Y%m%d).tar.gz /var/www/ekomkassa-gateway/
```

---

## Масштабирование

### Вертикальное (больше ресурсов одного сервера)

```bash
# Запустить несколько инстансов через PM2
pm2 start index.js -i 4 --name ekomkassa-gateway

# PM2 автоматически распределит нагрузку
```

### Горизонтальное (несколько серверов)

```
Load Balancer (nginx)
    ↓
    ├── Server 1 (gw1.ecomkassa.ru)
    ├── Server 2 (gw2.ecomkassa.ru)
    └── Server 3 (gw3.ecomkassa.ru)
         ↓
Shared PostgreSQL
```

---

Вопросы? Смотрите [DEPLOY.md](./server/DEPLOY.md) для подробностей! 🚀
