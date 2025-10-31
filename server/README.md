# eKomKassa Gateway Server

Express.js сервер для конвертации Ferma API → eKomKassa API

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Настройка окружения

Создайте файл `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/ekomkassa_gateway
```

**Примечание:** `DATABASE_URL` опциональна. Если не указана, логирование в БД будет отключено.

### 3. Запуск сервера

**Development (с auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Сервер запустится на `http://localhost:3001`

## 📡 API Endpoints

### 1. Авторизация (получение токена)

**POST** `/api/Authorization/CreateAuthToken`

**Request:**
```json
{
  "login": "your_login",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "group_code": "700"
}
```

### 2. Статус чека

**GET** `/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}&group_code={group_code}`

**Query Parameters:**
- `uuid` (required) - ID чека
- `AuthToken` (required) - Токен авторизации
- `group_code` (optional, default: 700) - Код группы eKomKassa

**Response:**
```json
{
  "status": "done",
  "uuid": "...",
  "error": null
}
```

### 3. Создание чека

**POST** `/api/kkt/cloud/receipt`

**Формат 1: Ferma API (полная конвертация)**
```json
{
  "token": "eyJhbGc...",
  "group_code": "700",
  "Request": {
    "Type": "Income",
    "Inn": "1234567890",
    "RequestId": "order-123",
    "CustomerReceipt": {
      "TaxationSystem": "Common",
      "Email": "client@example.com",
      "Phone": "+79991234567",
      "Items": [
        {
          "Label": "Товар 1",
          "Price": 100.00,
          "Quantity": 2,
          "Amount": 200.00,
          "Vat": "Vat20",
          "PaymentMethod": 4,
          "Measure": "PIECE"
        }
      ],
      "CashlessPayments": [
        {
          "PaymentSum": 200.00
        }
      ]
    }
  }
}
```

**Формат 2: Упрощённый (прямая отправка в eKomKassa)**
```json
{
  "token": "eyJhbGc...",
  "group_code": "700",
  "operation": "sell",
  "external_id": "order-123",
  "receipt": {
    "client": {
      "email": "client@example.com"
    },
    "company": {
      "email": "shop@example.com",
      "sno": "osn",
      "inn": "1234567890",
      "payment_address": "https://example.com"
    },
    "items": [
      {
        "name": "Товар 1",
        "price": 100.00,
        "quantity": 2,
        "sum": 200.00,
        "payment_method": "full_payment",
        "payment_object": 4,
        "measure": 0,
        "vat": {
          "type": "vat20"
        }
      }
    ],
    "payments": [
      {
        "type": 1,
        "sum": 200.00
      }
    ],
    "total": 200.00
  }
}
```

### 4. Health Check

**GET** `/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🖥️ Деплой на сервер

### Ubuntu/Debian с nginx

#### 1. Установите Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Установите PM2 (процесс-менеджер)

```bash
sudo npm install -g pm2
```

#### 3. Загрузите проект на сервер

```bash
cd /var/www
git clone <your-repo-url> ekomkassa-gateway
cd ekomkassa-gateway/server
npm install
```

#### 4. Настройте .env

```bash
nano .env
```

Укажите:
```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
```

#### 5. Запустите с PM2

```bash
pm2 start index.js --name ekomkassa-gateway
pm2 save
pm2 startup
```

#### 6. Настройте nginx

Создайте файл `/etc/nginx/sites-available/gw.ecomkassa.ru`:

```nginx
server {
    listen 80;
    server_name gw.ecomkassa.ru;

    # API endpoints - проксируем на Express.js
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend (React SPA)
    location / {
        root /var/www/ekomkassa-gateway/dist;
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/gw.ecomkassa.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Настройте SSL (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d gw.ecomkassa.ru
```

### 🎯 Готово!

Теперь ваш API доступен по адресам:

- `https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken`
- `https://gw.ecomkassa.ru/api/kkt/cloud/status`
- `https://gw.ecomkassa.ru/api/kkt/cloud/receipt`

## 📊 Мониторинг

### Логи PM2

```bash
pm2 logs ekomkassa-gateway
```

### Статус процесса

```bash
pm2 status
```

### Перезапуск

```bash
pm2 restart ekomkassa-gateway
```

## 🔧 Разработка

### Структура проекта

```
server/
├── index.js          # Основной файл сервера
├── package.json      # Зависимости
├── .env.example      # Пример конфигурации
├── .env              # Локальная конфигурация (не коммитится)
└── README.md         # Документация
```

### Тестирование через curl

**Авторизация:**
```bash
curl -X POST http://localhost:3001/api/Authorization/CreateAuthToken \
  -H "Content-Type: application/json" \
  -d '{"login": "test", "password": "test123"}'
```

**Статус:**
```bash
curl "http://localhost:3001/api/kkt/cloud/status?uuid=test-uuid&AuthToken=your-token"
```

## 🐛 Troubleshooting

### Ошибка: Cannot find module 'express'

```bash
cd server
npm install
```

### Порт 3001 занят

Измените `PORT` в `.env` файле:
```env
PORT=3002
```

### База данных не подключается

Проверьте:
1. PostgreSQL запущен: `sudo systemctl status postgresql`
2. DATABASE_URL корректен в `.env`
3. Таблица `logs` создана (см. миграции в `/db_migrations`)
