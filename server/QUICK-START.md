# ⚡ Деплой за 10 минут

Минимальные команды для запуска на `gw.ecomkassa.ru`

## 📋 Checklist

### ✅ Шаг 1: Подготовка сервера

```bash
# Подключаемся к серверу
ssh root@your-server-ip

# Устанавливаем всё необходимое одной командой
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash - && \
sudo apt update && \
sudo apt install -y nodejs nginx certbot python3-certbot-nginx && \
sudo npm install -g pm2
```

---

### ✅ Шаг 2: Загрузка проекта

```bash
# Клонируем репозиторий
cd /var/www
git clone https://github.com/your-username/ekomkassa-gateway.git
cd ekomkassa-gateway
```

---

### ✅ Шаг 3: Backend

```bash
cd /var/www/ekomkassa-gateway/server

# Устанавливаем зависимости
npm install --production

# Создаём .env
cat > .env << EOF
PORT=3001
NODE_ENV=production
EOF

# Запускаем через PM2
pm2 start index.js --name ekomkassa-gateway
pm2 save
pm2 startup  # Выполните команду которую выдаст PM2

# Проверяем
curl http://localhost:3001/health
```

Должно вернуть: `{"status":"ok","timestamp":"..."}`

---

### ✅ Шаг 4: Frontend

```bash
cd /var/www/ekomkassa-gateway

# Устанавливаем зависимости
npm install

# Собираем production build
npm run build

# Проверяем что файлы собрались
ls -la dist/
```

---

### ✅ Шаг 5: Nginx

```bash
# Создаём конфигурацию
cat > /etc/nginx/sites-available/gw.ecomkassa.ru << 'EOF'
server {
    listen 80;
    server_name gw.ecomkassa.ru;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:3001/health;
    }

    location / {
        root /var/www/ekomkassa-gateway/dist;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Активируем
ln -s /etc/nginx/sites-available/gw.ecomkassa.ru /etc/nginx/sites-enabled/

# Проверяем и перезагружаем
nginx -t && systemctl reload nginx
```

---

### ✅ Шаг 6: SSL

```bash
# Получаем SSL сертификат
certbot --nginx -d gw.ecomkassa.ru

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с ToS (Y)
# - Согласитесь на редирект HTTP → HTTPS (2)
```

---

## 🎉 Готово!

Проверяем:

```bash
# Health check
curl https://gw.ecomkassa.ru/health

# Frontend
curl https://gw.ecomkassa.ru/

# API (через Postman или curl)
curl -X POST https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken \
  -H "Content-Type: application/json" \
  -d '{"login":"test","password":"test"}'
```

---

## 🔄 Обновление

```bash
cd /var/www/ekomkassa-gateway

# Загружаем изменения
git pull

# Backend
cd server
npm install
pm2 restart ekomkassa-gateway

# Frontend
cd ..
npm install
npm run build
```

---

## 🐛 Если что-то сломалось

```bash
# Логи backend
pm2 logs ekomkassa-gateway

# Логи nginx
tail -f /var/log/nginx/error.log

# Перезапустить всё
pm2 restart ekomkassa-gateway
systemctl reload nginx
```

---

## 📞 Нужна помощь?

Смотрите подробную инструкцию: [DEPLOY.md](./DEPLOY.md)
