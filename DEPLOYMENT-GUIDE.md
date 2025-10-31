# 🚀 Быстрая инструкция: Деплой на gw.ecomkassa.ru

## Что делает этот проект?

Конвертер API запросов: **Ferma протокол → eKomKassa API**

После деплоя ваши API endpoints будут доступны по адресам:
- `https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken` ✅
- `https://gw.ecomkassa.ru/api/kkt/cloud/status` ✅
- `https://gw.ecomkassa.ru/api/kkt/cloud/receipt` ✅

---

## Архитектура проекта

```
┌─────────────────────────────────────────┐
│  gw.ecomkassa.ru                        │
├─────────────────────────────────────────┤
│                                         │
│  nginx (веб-сервер)                     │
│    ↓                                    │
│    ├─ /              → Frontend (React) │
│    ├─ /api/*        → Backend (Node.js) │
│    └─ /health       → Health check      │
│                                         │
│  Backend Server (Express.js)            │
│    - Запущен на localhost:3001          │
│    - Управляется через PM2              │
│    - Проксируется через nginx           │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📋 Минимальная установка (5 минут)

### 1. На сервере установите Node.js и PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2
```

### 2. Загрузите проект:

```bash
cd /var/www
git clone <your-repo-url> ekomkassa-gateway
cd ekomkassa-gateway
```

### 3. Настройте backend:

```bash
cd server
npm install
cp .env.example .env
nano .env  # Укажите PORT=3001, NODE_ENV=production
pm2 start index.js --name ekomkassa-gateway
pm2 save
```

### 4. Соберите frontend:

```bash
cd /var/www/ekomkassa-gateway
npm install
npm run build
```

### 5. Настройте nginx:

```bash
sudo nano /etc/nginx/sites-available/gw.ecomkassa.ru
```

Вставьте:

```nginx
server {
    listen 80;
    server_name gw.ecomkassa.ru;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://localhost:3001/health;
    }

    location / {
        root /var/www/ekomkassa-gateway/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Активируйте:

```bash
sudo ln -s /etc/nginx/sites-available/gw.ecomkassa.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Установите SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gw.ecomkassa.ru
```

---

## ✅ Проверка работы

### Тест 1: Health Check

```bash
curl https://gw.ecomkassa.ru/health
```

Ответ: `{"status":"ok","timestamp":"..."}`

### Тест 2: API Авторизация (через Postman)

**POST** `https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken`

```json
{
  "login": "your_login",
  "password": "your_password"
}
```

Должен вернуть токен eKomKassa.

---

## 🔄 Обновление после изменений кода

```bash
cd /var/www/ekomkassa-gateway

# Backend
cd server
git pull
npm install
pm2 restart ekomkassa-gateway

# Frontend
cd ..
git pull
npm install
npm run build
```

---

## 📚 Подробная документация

- **Полная инструкция**: `server/DEPLOY.md`
- **API документация**: `server/README.md`
- **Nginx конфигурация**: `server/nginx-config-example.conf`

---

## 🆘 Помощь

### Логи сервера:

```bash
pm2 logs ekomkassa-gateway
```

### Логи nginx:

```bash
tail -f /var/log/nginx/gw.ecomkassa.ru-error.log
```

### Перезапуск:

```bash
pm2 restart ekomkassa-gateway
sudo systemctl reload nginx
```

---

## 🎯 Итог

После деплоя у вас будет:

1. ✅ **Frontend** на `https://gw.ecomkassa.ru` — красивый интерфейс для тестирования
2. ✅ **API endpoints** на `/api/*` — работают из Postman, curl, или любого HTTP клиента
3. ✅ **SSL сертификат** — автоматическое продление через Let's Encrypt
4. ✅ **Логирование** — все запросы логируются (опционально в PostgreSQL)

Ваш шлюз готов к использованию в production! 🚀
