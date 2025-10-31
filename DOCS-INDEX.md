# 📚 Документация проекта - Навигация

## 🚀 Быстрый старт

Выберите нужный раздел:

### Для новичков

1. **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** ⭐ НАЧНИТЕ ЗДЕСЬ
   - Деплой за 5 минут
   - Минимальные команды
   - Только самое важное

2. **[server/QUICK-START.md](./server/QUICK-START.md)** 
   - Копируй-вставляй команды
   - Деплой за 10 минут
   - Готовые конфиги

### Для продвинутых

3. **[server/DEPLOY.md](./server/DEPLOY.md)**
   - Полная инструкция по деплою
   - Пошаговое руководство
   - Troubleshooting
   - Безопасность и мониторинг

4. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - Архитектура проекта
   - Схемы и диаграммы
   - Маппинг данных Ferma ↔ eKomKassa
   - Производительность и масштабирование

---

## 📡 API Документация

5. **[server/README.md](./server/README.md)**
   - API endpoints
   - Примеры запросов
   - Форматы данных
   - Разработка

---

## 🛠️ Конфигурация

6. **[server/nginx-config-example.conf](./server/nginx-config-example.conf)**
   - Готовая конфигурация nginx
   - SSL настройки
   - Кеширование и безопасность

7. **[server/.env.example](./server/.env.example)**
   - Переменные окружения
   - Настройка БД
   - Порты и режимы

---

## 📖 Общая информация

8. **[PROJECT-INFO.md](./PROJECT-INFO.md)**
   - Описание проекта
   - Технологии
   - Структура файлов
   - Ссылки

---

## 🎯 По задачам

### Задача: "Хочу запустить проект локально"

```bash
# Frontend
npm install
npm run dev

# Backend
cd server
npm install
npm start
```

Смотрите: [server/README.md](./server/README.md)

---

### Задача: "Хочу задеплоить на свой сервер"

1. Читайте: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) — быстрый старт
2. Используйте: [server/QUICK-START.md](./server/QUICK-START.md) — готовые команды
3. При проблемах: [server/DEPLOY.md](./server/DEPLOY.md) — подробное руководство

---

### Задача: "Хочу понять как работает конвертация Ferma → eKomKassa"

Читайте: [ARCHITECTURE.md](./ARCHITECTURE.md) → раздел "Маппинг данных"

---

### Задача: "Нужно настроить nginx"

1. Копируйте: [server/nginx-config-example.conf](./server/nginx-config-example.conf)
2. Следуйте: [server/DEPLOY.md](./server/DEPLOY.md) → Шаг 11

---

### Задача: "Что-то сломалось после деплоя"

1. [server/DEPLOY.md](./server/DEPLOY.md) → раздел "Troubleshooting"
2. [server/QUICK-START.md](./server/QUICK-START.md) → раздел "Если что-то сломалось"

Команды:
```bash
pm2 logs ekomkassa-gateway
tail -f /var/log/nginx/error.log
```

---

### Задача: "Хочу протестировать API через Postman"

Читайте: [server/README.md](./server/README.md) → раздел "API Endpoints"

Примеры запросов там же.

---

### Задача: "Как масштабировать проект?"

Читайте: [ARCHITECTURE.md](./ARCHITECTURE.md) → раздел "Масштабирование"

---

## 🗂️ Все файлы документации

```
📁 Корень проекта
├── 📄 DEPLOYMENT-GUIDE.md      ⭐ Быстрый старт (5 минут)
├── 📄 PROJECT-INFO.md          📖 О проекте
├── 📄 ARCHITECTURE.md          🏗️ Архитектура
├── 📄 DOCS-INDEX.md            📚 Этот файл (навигация)
│
└── 📁 server/
    ├── 📄 README.md            📡 API документация
    ├── 📄 DEPLOY.md            🚀 Полная инструкция деплоя
    ├── 📄 QUICK-START.md       ⚡ Деплой за 10 минут
    ├── 📄 nginx-config-example.conf  🔧 Nginx конфиг
    ├── 📄 .env.example         ⚙️ Переменные окружения
    └── 📄 test-api.sh          🧪 Тестовый скрипт
```

---

## 🆘 Частые вопросы

### Q: С чего начать?

**A:** [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) — там всё пошагово.

### Q: Как работают пути `/api/*` на моём сервере?

**A:** nginx проксирует их на Express.js сервер (localhost:3001). Смотрите [ARCHITECTURE.md](./ARCHITECTURE.md).

### Q: Где посмотреть примеры API запросов?

**A:** [server/README.md](./server/README.md) → раздел "API Endpoints".

### Q: Как включить логирование в PostgreSQL?

**A:** [server/DEPLOY.md](./server/DEPLOY.md) → Шаг 5 (установка PostgreSQL).

### Q: Проект не запускается, что делать?

**A:** 
1. Проверьте логи: `pm2 logs ekomkassa-gateway`
2. Смотрите [server/DEPLOY.md](./server/DEPLOY.md) → "Troubleshooting"

### Q: Как обновить проект после изменений?

**A:**
```bash
cd /var/www/ekomkassa-gateway
git pull
cd server && npm install && pm2 restart ekomkassa-gateway
cd .. && npm install && npm run build
```

---

## 📞 Поддержка

Если не нашли ответ в документации:

1. Проверьте логи:
   ```bash
   pm2 logs ekomkassa-gateway
   tail -f /var/log/nginx/error.log
   ```

2. Ищите похожую ошибку в [server/DEPLOY.md](./server/DEPLOY.md) → Troubleshooting

3. Перечитайте [ARCHITECTURE.md](./ARCHITECTURE.md) — возможно проблема в понимании архитектуры

---

**Успешного деплоя! 🚀**
