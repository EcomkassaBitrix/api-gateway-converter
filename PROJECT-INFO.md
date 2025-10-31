# eKomKassa API Gateway Converter

🔄 Конвертер API запросов из протокола **Ferma** в формат **eKomKassa**

## 🎯 Что это?

API Gateway для интеграции кассовых систем, работающих с Ferma протоколом, с онлайн-кассой eKomKassa.

### Возможности:

- ✅ Авторизация (получение токена eKomKassa)
- ✅ Создание чеков (конвертация Ferma → eKomKassa)
- ✅ Проверка статуса чеков
- ✅ Логирование всех запросов
- ✅ Веб-интерфейс для тестирования

---

## 🚀 Быстрый старт

### Локальная разработка

1. **Frontend (React)**
```bash
npm install
npm run dev
```

2. **Backend (Express.js)**
```bash
cd server
npm install
npm start
```

### Production деплой на свой сервер

**📖 Полная инструкция**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

**Кратко:**
```bash
# На сервере (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2

# Загрузить проект
cd /var/www
git clone <your-repo> ekomkassa-gateway
cd ekomkassa-gateway

# Backend
cd server
npm install
pm2 start index.js --name ekomkassa-gateway
pm2 save

# Frontend
cd ..
npm install
npm run build

# Настроить nginx (см. server/nginx-config-example.conf)
# Установить SSL: sudo certbot --nginx -d gw.ecomkassa.ru
```

---

## 📡 API Endpoints

После деплоя доступны по адресу `https://gw.ecomkassa.ru/api/...`

### 1. Авторизация

**POST** `/api/Authorization/CreateAuthToken`

Request:
```json
{
  "login": "your_login",
  "password": "your_password"
}
```

Response:
```json
{
  "token": "eyJhbGc...",
  "group_code": "700"
}
```

### 2. Статус чека

**GET** `/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}&group_code={code}`

### 3. Создание чека

**POST** `/api/kkt/cloud/receipt`

Поддерживает 2 формата:
- **Ferma API** (полная конвертация)
- **eKomKassa API** (прямая отправка)

---

## 📂 Структура проекта

```
.
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # UI компоненты
│   ├── pages/              # Страницы (Index, RequestLogs)
│   └── lib/                # Утилиты
│
├── server/                 # Backend (Express.js + Node.js)
│   ├── index.js            # Основной сервер
│   ├── package.json        # Зависимости
│   ├── README.md           # API документация
│   ├── DEPLOY.md           # Подробная инструкция по деплою
│   └── nginx-config-example.conf  # Пример конфигурации nginx
│
├── backend/                # Cloud Functions (для poehali.dev)
│   ├── ekomkassa-auth/     # Авторизация
│   ├── ekomkassa-status/   # Статус чека
│   └── ekomkassa-receipt/  # Создание чека
│
├── db_migrations/          # SQL миграции для БД
│
├── dist/                   # Production build (после npm run build)
│
└── DEPLOYMENT-GUIDE.md     # Быстрая инструкция по деплою
```

---

## 🛠️ Технологии

**Frontend:**
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Vite

**Backend:**
- Node.js 18+
- Express.js
- Axios
- PostgreSQL (опционально, для логов)

**Инфраструктура:**
- PM2 (процесс-менеджер)
- nginx (веб-сервер)
- Let's Encrypt (SSL)

---

## 📚 Документация

- **API документация**: [server/README.md](./server/README.md)
- **Инструкция по деплою**: [server/DEPLOY.md](./server/DEPLOY.md)
- **Быстрый старт**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

---

## 🔗 Полезные ссылки

- **Frontend (poehali.dev)**: https://api-gateway-converter--preview.poehali.dev/
- **Production**: https://gw.ecomkassa.ru *(после деплоя)*
- **eKomKassa API**: https://app.ecomkassa.ru/
- **Ferma API**: https://ferma.ofd.ru/

---

## 🆘 Поддержка

Если возникли вопросы:

1. Проверьте [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
2. Посмотрите логи: `pm2 logs ekomkassa-gateway`
3. Проверьте nginx: `tail -f /var/log/nginx/gw.ecomkassa.ru-error.log`

---

## 📝 Лицензия

MIT
