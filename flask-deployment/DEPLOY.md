# Инструкция по развёртыванию Flask Gateway на gw.ecomkassa.ru

Эта инструкция описывает полное развёртывание:
1. Flask API (backend) для работы с eKomKassa
2. React веб-интерфейс (frontend) для управления через браузер
3. PostgreSQL для логирования запросов
4. Nginx + SSL для публикации в интернет

## Подготовка сервера

### 1. Установка необходимых пакетов

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Python, pip, PostgreSQL
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx
```

### 2. Создание базы данных PostgreSQL

```bash
# Подключиться к PostgreSQL
sudo -u postgres psql

# Выполнить SQL команды:
CREATE DATABASE ekomkassa_logs;
CREATE USER logger_user WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE ekomkassa_logs TO logger_user;
\c ekomkassa_logs
GRANT ALL PRIVILEGES ON TABLE logs TO logger_user;
GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO logger_user;
\q
```

SQL для создания таблицы логов:

```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    function_name VARCHAR(50) NOT NULL,
    log_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    request_id VARCHAR(100),
    duration_ms INTEGER,
    status_code INTEGER
);

CREATE INDEX idx_logs_function_created ON logs(function_name, created_at DESC);
CREATE INDEX idx_logs_request_id ON logs(request_id);
CREATE INDEX idx_logs_level ON logs(log_level);
```

## Развёртывание приложения

### 3. Создание директории приложения

```bash
# Создать директорию
sudo mkdir -p /var/www/ekomkassa-gateway
sudo chown $USER:$USER /var/www/ekomkassa-gateway
cd /var/www/ekomkassa-gateway
```

### 4. Копирование файлов

Скопируйте следующие файлы на сервер в `/var/www/ekomkassa-gateway/`:
- `app.py` - главное приложение
- `requirements.txt` - зависимости Python

```bash
# Пример с использованием scp (выполнить на локальной машине)
scp app.py user@gw.ecomkassa.ru:/var/www/ekomkassa-gateway/
scp requirements.txt user@gw.ecomkassa.ru:/var/www/ekomkassa-gateway/
```

### 5. Создание виртуального окружения

```bash
cd /var/www/ekomkassa-gateway

# Создать виртуальное окружение
python3 -m venv venv

# Активировать
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Деактивировать
deactivate
```

### 6. Создание директории для логов

```bash
sudo mkdir -p /var/log/ekomkassa-gateway
sudo chown www-data:www-data /var/log/ekomkassa-gateway
```

### 7. Настройка systemd сервиса

```bash
# Скопировать файл сервиса
sudo cp ekomkassa-gateway.service /etc/systemd/system/

# Установить права
sudo chown www-data:www-data /var/www/ekomkassa-gateway -R

# Перезагрузить systemd
sudo systemctl daemon-reload

# Включить автозапуск
sudo systemctl enable ekomkassa-gateway

# Запустить сервис
sudo systemctl start ekomkassa-gateway

# Проверить статус
sudo systemctl status ekomkassa-gateway
```

### 8. Настройка Nginx

```bash
# Скопировать конфигурацию Nginx
sudo cp nginx-site.conf /etc/nginx/sites-available/ekomkassa-gateway

# ВАЖНО: Отредактируйте пути к SSL сертификатам в файле
sudo nano /etc/nginx/sites-available/ekomkassa-gateway

# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/ekomkassa-gateway /etc/nginx/sites-enabled/

# Проверить конфигурацию Nginx
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

## Проверка работы

### 9. Тестирование эндпоинтов

```bash
# Health check
curl https://gw.ecomkassa.ru/health

# Должен вернуть:
# {"status": "ok", "timestamp": "2025-10-21T..."}
```

### 10. Просмотр логов

```bash
# Логи приложения
sudo journalctl -u ekomkassa-gateway -f

# Логи Gunicorn
tail -f /var/log/ekomkassa-gateway/error.log
tail -f /var/log/ekomkassa-gateway/access.log

# Логи Nginx
tail -f /var/log/nginx/ekomkassa-gateway-access.log
tail -f /var/log/nginx/ekomkassa-gateway-error.log
```

## Управление сервисом

```bash
# Перезапустить приложение
sudo systemctl restart ekomkassa-gateway

# Остановить
sudo systemctl stop ekomkassa-gateway

# Посмотреть статус
sudo systemctl status ekomkassa-gateway

# Просмотреть логи
sudo journalctl -u ekomkassa-gateway -n 100
```

## Обновление приложения

```bash
# Остановить сервис
sudo systemctl stop ekomkassa-gateway

# Обновить файлы (app.py)
cd /var/www/ekomkassa-gateway

# Если нужно обновить зависимости
source venv/bin/activate
pip install -r requirements.txt --upgrade
deactivate

# Запустить сервис
sudo systemctl start ekomkassa-gateway
```

## Переменные окружения

В файле `/etc/systemd/system/ekomkassa-gateway.service` настроены:

- `DATABASE_URL=postgresql://logger_user:postgres@localhost:5432/ekomkassa_logs`

При необходимости изменить пароль или параметры БД - отредактируйте этот файл и выполните:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ekomkassa-gateway
```

## Развёртывание веб-интерфейса (опционально)

Если вы хотите веб-интерфейс на `https://gw.ecomkassa.ru/`, следуйте инструкции в файле **BUILD_FRONTEND.md**.

Краткая версия:

```bash
# 1. Скачать билд из poehali.dev (Скачать → Скачать билд)
# Или собрать локально: npm run build

# 2. Скопировать на сервер
rsync -avz --delete dist/ user@gw.ecomkassa.ru:/var/www/ekomkassa-gateway/dist/

# 3. Обновить app.py (уже готов в репозитории)
# 4. Перезапустить сервис
sudo systemctl restart ekomkassa-gateway
```

После этого:
- `https://gw.ecomkassa.ru/` - веб-интерфейс для работы с API
- `https://gw.ecomkassa.ru/api/*` - API эндпоинты (как раньше)

## Доступные эндпоинты

После развёртывания будут доступны:

### API эндпоинты:
1. **POST** `https://gw.ecomkassa.ru/api/Authorization/CreateAuthToken`
2. **GET** `https://gw.ecomkassa.ru/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}`
3. **POST** `https://gw.ecomkassa.ru/api/kkt/cloud/receipt`
4. **GET** `https://gw.ecomkassa.ru/health`

### Веб-интерфейс (если развёрнут):
1. **GET** `https://gw.ecomkassa.ru/` - главная страница с формами тестирования API
2. **GET** `https://gw.ecomkassa.ru/logs` - просмотр логов из базы данных

Все запросы логируются в PostgreSQL базу данных `ekomkassa_logs`.

## Безопасность

- Убедитесь, что SSL сертификаты установлены корректно
- Настройте firewall для доступа только к портам 80 и 443
- Регулярно обновляйте систему и зависимости
- Используйте сложные пароли для PostgreSQL

## Мониторинг

Для мониторинга работы системы рекомендуется:

1. Настроить alerts на ошибки в journalctl
2. Мониторить нагрузку на PostgreSQL
3. Следить за размером таблицы логов (рекомендуется периодическая очистка старых записей)

Пример очистки старых логов (старше 30 дней):

```sql
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';
```