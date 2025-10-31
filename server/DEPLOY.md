# 🚀 Инструкция по деплою на сервер

Полное руководство по развертыванию eKomKassa Gateway на вашем сервере `gw.ecomkassa.ru`

## Предварительные требования

- Ubuntu/Debian сервер с root доступом
- Домен `gw.ecomkassa.ru` направлен на IP сервера (A-запись в DNS)
- SSH доступ к серверу

---

## Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

---

## Шаг 2: Установка Node.js 18+

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Проверяем установку
node --version  # должно быть >= v18.0.0
npm --version
```

---

## Шаг 3: Установка PM2 (процесс-менеджер)

```bash
npm install -g pm2
```

---

## Шаг 4: Установка nginx

```bash
apt install -y nginx

# Проверяем статус
systemctl status nginx
```

---

## Шаг 5: Установка PostgreSQL (опционально, для логов)

```bash
# Если хотите логировать запросы в БД
apt install -y postgresql postgresql-contrib

# Создаём БД и пользователя
sudo -u postgres psql

# В psql консоли:
CREATE DATABASE ekomkassa_gateway;
CREATE USER gateway_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ekomkassa_gateway TO gateway_user;
\q
```

Примените миграции из `/db_migrations` если нужно логирование.

---

## Шаг 6: Загрузка проекта на сервер

### Вариант A: Через Git (рекомендуется)

```bash
cd /var/www
git clone https://github.com/your-username/ekomkassa-gateway.git
cd ekomkassa-gateway
```

### Вариант B: Через scp (если нет Git)

На вашем локальном компьютере:

```bash
# Сначала соберите frontend
npm run build

# Загрузите на сервер
scp -r ./dist root@your-server-ip:/var/www/ekomkassa-gateway/
scp -r ./server root@your-server-ip:/var/www/ekomkassa-gateway/
```

---

## Шаг 7: Настройка backend

```bash
cd /var/www/ekomkassa-gateway/server

# Устанавливаем зависимости
npm install --production

# Создаём .env файл
nano .env
```

Содержимое `.env`:

```env
PORT=3001
NODE_ENV=production

# Если используете PostgreSQL для логов
DATABASE_URL=postgresql://gateway_user:your_secure_password@localhost:5432/ekomkassa_gateway
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Шаг 8: Тестовый запуск

```bash
# Проверяем что сервер запускается
npm start

# Должно появиться:
# 🚀 eKomKassa Gateway Server running on port 3001
# ...

# Проверяем в другой консоли:
curl http://localhost:3001/health

# Должен вернуть: {"status":"ok","timestamp":"..."}
```

Если всё работает, останавливаем: `Ctrl+C`

---

## Шаг 9: Запуск через PM2

```bash
cd /var/www/ekomkassa-gateway/server

# Запускаем сервер
pm2 start index.js --name ekomkassa-gateway

# Проверяем статус
pm2 status

# Сохраняем конфигурацию
pm2 save

# Настраиваем автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую выдаст PM2
```

### Полезные команды PM2:

```bash
pm2 logs ekomkassa-gateway    # Смотреть логи
pm2 restart ekomkassa-gateway # Перезапустить
pm2 stop ekomkassa-gateway    # Остановить
pm2 delete ekomkassa-gateway  # Удалить из PM2
```

---

## Шаг 10: Сборка frontend

```bash
cd /var/www/ekomkassa-gateway

# Устанавливаем зависимости
npm install

# Собираем production build
npm run build

# Результат будет в папке /var/www/ekomkassa-gateway/dist
```

---

## Шаг 11: Настройка nginx

```bash
# Создаём конфигурацию
nano /etc/nginx/sites-available/gw.ecomkassa.ru
```

Скопируйте содержимое из `nginx-config-example.conf` или используйте:

```nginx
server {
    listen 80;
    server_name gw.ecomkassa.ru;

    access_log /var/log/nginx/gw.ecomkassa.ru-access.log;
    error_log /var/log/nginx/gw.ecomkassa.ru-error.log;

    client_max_body_size 10M;

    # API endpoints -> Express.js
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }

    # Frontend (React SPA)
    location / {
        root /var/www/ekomkassa-gateway/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Активируем конфигурацию:

```bash
# Создаём символическую ссылку
ln -s /etc/nginx/sites-available/gw.ecomkassa.ru /etc/nginx/sites-enabled/

# Проверяем конфигурацию
nginx -t

# Если OK, перезагружаем nginx
systemctl reload nginx
```

---

## Шаг 12: Установка SSL сертификата

```bash
# Устанавливаем Certbot
apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат
certbot --nginx -d gw.ecomkassa.ru

# Следуйте инструкциям (введите email, согласитесь с ToS)
```

Certbot автоматически:
- Получит сертификат
- Обновит конфигурацию nginx
- Настроит автопродление

Проверка автопродления:

```bash
certbot renew --dry-run
```

---

## Шаг 13: Проверка работы

### 1. Проверка frontend

Откройте в браузере: `https://gw.ecomkassa.ru`

Должна загрузиться страница с конвертером.

### 2. Проверка API через Postman

**POST** `https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken`

Body (JSON):
```json
{
  "login": "your_real_login",
  "password": "your_real_password"
}
```

Должен вернуть токен от eKomKassa.

### 3. Проверка через curl

```bash
# Health check
curl https://gw.ecomkassa.ru/health

# Авторизация
curl -X POST https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken \
  -H "Content-Type: application/json" \
  -d '{"login":"test","password":"test123"}'
```

---

## Шаг 14: Настройка firewall (опционально)

```bash
# Разрешаем HTTP, HTTPS, SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включаем firewall
ufw enable
ufw status
```

---

## 🎉 Готово!

Ваш API Gateway работает на:

- **Frontend**: `https://gw.ecomkassa.ru`
- **API Auth**: `https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken`
- **API Status**: `https://gw.ecomkassa.ru/api/kkt/cloud/status`
- **API Receipt**: `https://gw.ecomkassa.ru/api/kkt/cloud/receipt`

---

## 🔄 Обновление после изменений

### Обновление backend:

```bash
cd /var/www/ekomkassa-gateway/server
git pull  # или загрузите новые файлы
npm install
pm2 restart ekomkassa-gateway
```

### Обновление frontend:

```bash
cd /var/www/ekomkassa-gateway
git pull
npm install
npm run build
# nginx автоматически подхватит новые файлы
```

---

## 🐛 Troubleshooting

### Проблема: 502 Bad Gateway

**Причина**: Express.js сервер не запущен

**Решение**:
```bash
pm2 status  # Проверить статус
pm2 logs ekomkassa-gateway  # Посмотреть ошибки
pm2 restart ekomkassa-gateway
```

### Проблема: Cannot find module 'express'

**Причина**: Не установлены зависимости

**Решение**:
```bash
cd /var/www/ekomkassa-gateway/server
npm install
pm2 restart ekomkassa-gateway
```

### Проблема: База данных не подключается

**Причина**: Неверный DATABASE_URL

**Решение**:
```bash
nano /var/www/ekomkassa-gateway/server/.env
# Проверьте DATABASE_URL
pm2 restart ekomkassa-gateway
```

### Проблема: SSL сертификат не обновляется

**Решение**:
```bash
certbot renew --force-renewal
systemctl reload nginx
```

---

## 📊 Мониторинг

### Логи nginx:

```bash
tail -f /var/log/nginx/gw.ecomkassa.ru-access.log
tail -f /var/log/nginx/gw.ecomkassa.ru-error.log
```

### Логи PM2:

```bash
pm2 logs ekomkassa-gateway --lines 100
```

### Системные ресурсы:

```bash
pm2 monit
```

---

## 🔐 Безопасность

1. **Регулярно обновляйте систему**:
   ```bash
   apt update && apt upgrade -y
   ```

2. **Настройте fail2ban** (защита от брутфорса):
   ```bash
   apt install -y fail2ban
   systemctl enable fail2ban
   ```

3. **Ограничьте SSH доступ** (только по ключу):
   ```bash
   nano /etc/ssh/sshd_config
   # PasswordAuthentication no
   systemctl restart sshd
   ```

4. **Мониторьте логи** на подозрительную активность

---

Если возникнут вопросы — пишите! 🚀
