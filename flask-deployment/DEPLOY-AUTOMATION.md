# 🚀 Автоматизация деплоя EcomKassa Gateway

Два способа автоматического обновления сервера:

## Способ 1: Ручной деплой (быстро и просто)

### Установка:

```bash
# На сервере выполни один раз:
cd /var/www/ekomkassa-gateway/flask-deployment
chmod +x deploy.sh
```

### Использование:

```bash
# Просто запусти скрипт:
sudo ./deploy.sh
```

**Что делает скрипт:**
- ✅ Останавливает сервис
- ✅ Забирает последние изменения из Git
- ✅ Показывает что изменилось
- ✅ Обновляет зависимости (если нужно)
- ✅ Запускает сервис обратно
- ✅ Проверяет что всё работает

---

## Способ 2: Автоматический деплой через GitHub Webhook (продвинутый)

Сервер будет **автоматически обновляться** при каждом push в GitHub!

### Установка:

```bash
# 1. На сервере выполни:
cd /var/www/ekomkassa-gateway/flask-deployment
chmod +x setup-webhook.sh deploy.sh
sudo ./setup-webhook.sh
```

Скрипт создаст webhook-сервер который будет слушать события от GitHub.

### Настройка GitHub:

```bash
# 2. Узнай IP сервера:
curl ifconfig.me
```

**3. Открой GitHub → твой репозиторий → Settings → Webhooks → Add webhook**

Заполни:
- **Payload URL:** `http://ВАШ_IP:9000/webhook`
- **Content type:** `application/json`
- **Which events:** Just the push event
- **Active:** ✅ галочка

**4. Сохрани webhook**

### Проверка:

```bash
# Посмотреть статус webhook-сервера:
sudo systemctl status github-webhook

# Посмотреть логи в реальном времени:
sudo journalctl -u github-webhook -f
```

Теперь сделай `git push` — и сервер обновится автоматически! 🎉

---

## Добавить секрет (рекомендуется для безопасности)

Чтобы только GitHub мог запускать деплой:

```bash
# 1. Сгенерируй секрет:
openssl rand -hex 20

# 2. Скопируй секрет

# 3. Добавь в GitHub webhook:
# Settings → Webhooks → Edit → Secret → вставь секрет → Update webhook

# 4. Добавь секрет на сервер:
sudo systemctl edit github-webhook

# Добавь эту строку (замени YOUR_SECRET):
# [Service]
# Environment="GITHUB_WEBHOOK_SECRET=YOUR_SECRET"

# 5. Сохрани (Ctrl+X → Y → Enter)

# 6. Перезапусти:
sudo systemctl restart github-webhook
```

---

## Полезные команды

### Деплой скрипт:
```bash
# Запустить деплой вручную
sudo /var/www/ekomkassa-gateway/flask-deployment/deploy.sh

# Посмотреть логи основного сервиса
sudo journalctl -u ekomkassa-gateway -n 50 -f
```

### Webhook сервер:
```bash
# Статус
sudo systemctl status github-webhook

# Логи
sudo journalctl -u github-webhook -f

# Перезапуск
sudo systemctl restart github-webhook

# Остановка
sudo systemctl stop github-webhook

# Отключить автозапуск
sudo systemctl disable github-webhook
```

---

## Структура файлов

```
flask-deployment/
├── deploy.sh              # Скрипт деплоя (работает для обоих способов)
├── setup-webhook.sh       # Установка webhook сервера
└── DEPLOY-AUTOMATION.md   # Эта инструкция

/var/www/webhook/          # Создаётся при установке webhook
└── webhook-server.py      # Сервер для приёма событий от GitHub
```

---

## Troubleshooting

### Webhook не срабатывает:

```bash
# 1. Проверь что сервер запущен:
sudo systemctl status github-webhook

# 2. Проверь что порт 9000 открыт:
sudo netstat -tlnp | grep 9000

# 3. Проверь файрвол:
sudo ufw status
sudo ufw allow 9000/tcp

# 4. Проверь логи:
sudo journalctl -u github-webhook -n 100
```

### Деплой падает с ошибкой:

```bash
# Запусти скрипт вручную чтобы увидеть ошибку:
cd /var/www/ekomkassa-gateway/flask-deployment
sudo bash -x ./deploy.sh
```

### GitHub webhook показывает ошибку:

Проверь в GitHub: Settings → Webhooks → Recent Deliveries  
Там видно какой ответ вернул сервер.

---

## Безопасность

### ✅ Рекомендации:
- Используй секрет для webhook (см. выше)
- Закрой порт 9000 от внешнего доступа через Nginx proxy
- Регулярно проверяй логи: `sudo journalctl -u github-webhook`

### 🔒 Proxy через Nginx (опционально):

Если не хочешь открывать порт 9000:

```nginx
# /etc/nginx/sites-available/gw.ecomkassa.ru

server {
    listen 80;
    server_name gw.ecomkassa.ru;
    
    # ... другие настройки ...
    
    location /webhook {
        proxy_pass http://127.0.0.1:9000/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Тогда в GitHub webhook используй: `http://gw.ecomkassa.ru/webhook`

---

## Откат при проблемах

```bash
# Откатиться на предыдущий коммит:
cd /var/www/ekomkassa-gateway
git log --oneline -n 10  # Выбери коммит
sudo git reset --hard COMMIT_HASH
sudo systemctl restart ekomkassa-gateway
```

---

Готово! Теперь деплой — это одна команда или вообще автомат 🚀
