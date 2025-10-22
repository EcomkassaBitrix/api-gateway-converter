# Инструкция по сборке и развёртыванию веб-интерфейса

Эта инструкция описывает, как собрать React приложение и развернуть его на сервере `gw.ecomkassa.ru` вместе с Flask API.

## Шаг 1: Сборка React приложения (на локальной машине)

### Вариант А: Скачать готовый билд из poehali.dev

1. В редакторе poehali.dev нажмите **Скачать → Скачать билд**
2. Скачается архив `build.zip` с готовыми статическими файлами
3. Распакуйте архив - внутри будет папка `dist/` с файлами

### Вариант Б: Собрать самостоятельно (если есть исходники)

Если вы склонировали проект из GitHub:

```bash
# Перейти в директорию проекта
cd /path/to/api-gateway-converter

# Установить зависимости
npm install
# или
bun install

# Собрать production билд
npm run build
# или
bun run build
```

После сборки появится папка `dist/` с готовыми файлами.

## Шаг 2: Загрузить билд на сервер

```bash
# Создать директорию dist на сервере (если её нет)
ssh user@gw.ecomkassa.ru "mkdir -p /var/www/ekomkassa-gateway/dist"

# Скопировать все файлы из dist/ на сервер
scp -r dist/* user@gw.ecomkassa.ru:/var/www/ekomkassa-gateway/dist/

# Или используя rsync (рекомендуется)
rsync -avz --delete dist/ user@gw.ecomkassa.ru:/var/www/ekomkassa-gateway/dist/
```

## Шаг 3: Настроить права доступа на сервере

```bash
# Подключиться к серверу
ssh user@gw.ecomkassa.ru

# Установить права для www-data
sudo chown -R www-data:www-data /var/www/ekomkassa-gateway/dist
sudo chmod -R 755 /var/www/ekomkassa-gateway/dist
```

## Шаг 4: Обновить Flask приложение

Обновлённый файл `app.py` уже настроен для раздачи статических файлов из папки `dist/`.

Проверьте что в `/var/www/ekomkassa-gateway/app.py` есть эти строки:

```python
from flask import Flask, request, jsonify, send_from_directory
# ...
app = Flask(__name__, static_folder='dist', static_url_path='')
# ...
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
```

## Шаг 5: Перезапустить Flask сервис

```bash
# Перезапустить приложение
sudo systemctl restart ekomkassa-gateway

# Проверить статус
sudo systemctl status ekomkassa-gateway

# Посмотреть логи
sudo journalctl -u ekomkassa-gateway -n 50 -f
```

## Шаг 6: Обновить Nginx конфигурацию (если нужно)

Текущая конфигурация Nginx уже проксирует все запросы на Flask:

```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    # ...
}
```

Flask сам будет отдавать:
- Статические файлы (HTML, JS, CSS) для веб-интерфейса
- API эндпоинты (`/api/*`) для работы с eKomKassa

## Шаг 7: Проверить работу

```bash
# Проверить главную страницу
curl https://gw.ecomkassa.ru/

# Должен вернуться HTML код страницы

# Проверить API (должно работать как раньше)
curl https://gw.ecomkassa.ru/health

# Должен вернуть: {"status":"ok","timestamp":"..."}
```

Откройте в браузере:
- `https://gw.ecomkassa.ru/` - веб-интерфейс
- `https://gw.ecomkassa.ru/logs` - страница логов (если есть в React приложении)

## Структура файлов на сервере

```
/var/www/ekomkassa-gateway/
├── app.py                    # Flask приложение
├── requirements.txt          # Python зависимости
├── venv/                     # Виртуальное окружение Python
└── dist/                     # Статические файлы React (билд)
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   ├── index-[hash].css
    │   └── ...
    └── ...
```

## Обновление веб-интерфейса в будущем

Когда нужно обновить веб-интерфейс:

1. Соберите новый билд (`npm run build` или скачайте из poehali.dev)
2. Скопируйте файлы на сервер:
   ```bash
   rsync -avz --delete dist/ user@gw.ecomkassa.ru:/var/www/ekomkassa-gateway/dist/
   ```
3. Перезапустите Flask:
   ```bash
   sudo systemctl restart ekomkassa-gateway
   ```

## Важные замечания

1. **Backend API работает без изменений** - все эндпоинты `/api/*` продолжают работать
2. **React Router** - Flask настроен для SPA, все неизвестные URL перенаправляются на `index.html`
3. **CORS** - настроен в Flask для API эндпоинтов, фронтенд работает с тем же доменом
4. **HTTPS** - весь трафик (и UI, и API) идёт через HTTPS с Let's Encrypt сертификатом

## Траблшутинг

### Проблема: 404 на главной странице

```bash
# Проверить что dist/ существует и содержит файлы
ls -la /var/www/ekomkassa-gateway/dist/

# Проверить права
ls -la /var/www/ekomkassa-gateway/
```

### Проблема: Статика не обновляется

```bash
# Очистить кэш браузера (Ctrl+Shift+R)
# Или проверить что файлы обновились на сервере
ls -lht /var/www/ekomkassa-gateway/dist/assets/ | head
```

### Проблема: API не работает

```bash
# Проверить что Flask запущен
sudo systemctl status ekomkassa-gateway

# Проверить логи
sudo journalctl -u ekomkassa-gateway -n 100
```

### Проблема: Белый экран в браузере

```bash
# Открыть DevTools в браузере (F12)
# Проверить Console на ошибки загрузки JS/CSS
# Проверить что пути к файлам корректны в index.html
```

## Альтернатива: Nginx раздаёт статику напрямую

Если хотите чтобы Nginx раздавал статические файлы напрямую (быстрее):

```nginx
# В /etc/nginx/sites-available/flask-app.conf добавить:
location / {
    root /var/www/ekomkassa-gateway/dist;
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:5000;
    # ... остальные proxy_set_header
}

location /health {
    proxy_pass http://127.0.0.1:5000/health;
}
```

Но текущий вариант (Flask раздаёт всё) проще в настройке и работает отлично.
