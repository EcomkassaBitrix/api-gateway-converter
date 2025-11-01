# eKomKassa Gateway - Postman Collection

Коллекция запросов для тестирования API eKomKassa Gateway.

## 📦 Установка

### Вариант 1: Импорт через файлы

1. Откройте Postman
2. Нажмите `Import` в левом верхнем углу
3. Перетащите файлы:
   - `eKomKassa-Gateway.postman_collection.json` - коллекция запросов
   - `eKomKassa-Gateway.postman_environment.json` - переменные окружения

### Вариант 2: Импорт через ссылку

Скопируйте содержимое файлов и импортируйте через `Raw text` в Postman.

## ⚙️ Настройка переменных окружения

После импорта откройте `eKomKassa Gateway Environment` и заполните:

| Переменная | Описание | Пример значения |
|------------|----------|-----------------|
| `base_url` | URL вашего Gateway | `https://ekomkassa-gateway.example.com` |
| `login` | Логин для eKomKassa | `your_login` |
| `password` | Пароль для eKomKassa | `your_password` |
| `group_code` | Код группы ККТ | `700` |
| `auth_token` | Токен (заполняется автоматически) | - |
| `receipt_uuid` | UUID чека (заполняется автоматически) | - |

## 🚀 Быстрый старт

### 1. Получение токена авторизации

Запустите запрос: `Authentication > Get Auth Token`

- Токен автоматически сохранится в переменную `auth_token`
- Используется во всех последующих запросах

### 2. Создание чека

Запустите запрос: `Receipt > Create Receipt (Income)`

- UUID чека автоматически сохранится в `receipt_uuid`
- Можно сразу проверить статус

### 3. Проверка статуса чека

Запустите запрос: `Status > Get Receipt Status`

- Использует UUID из предыдущего шага
- Показывает статус фискализации

## 📋 Список запросов

### 🔐 Authentication
- **Get Auth Token** - получение токена для работы с API

### 🧾 Receipt
- **Create Receipt (Income)** - создание чека прихода (продажа)
- **Create Receipt (Income Return)** - создание чека возврата прихода
- **Create Receipt (Simple Format)** - упрощенный формат (прямая проксация)

### 📊 Status
- **Get Receipt Status** - получение статуса чека (авто UUID)
- **Get Receipt Status (Manual UUID)** - проверка с ручным вводом UUID

### 🛠️ Health & Admin
- **Health Check** - проверка работоспособности сервиса
- **Admin Login** - авторизация в админ-панели
- **Get Logs** - получение логов приложения
- **Get Request Logs** - детальные логи всех запросов

## 🔄 Автоматизация

### Автосохранение токена

После успешного запроса `Get Auth Token` выполняется скрипт:

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.Status === 'Success' && jsonData.Data && jsonData.Data.AuthToken) {
        pm.environment.set('auth_token', jsonData.Data.AuthToken);
    }
}
```

### Автосохранение UUID чека

После успешного создания чека выполняется скрипт:

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.Status === 'Success' && jsonData.Data && jsonData.Data.ReceiptId) {
        pm.environment.set('receipt_uuid', jsonData.Data.ReceiptId);
    }
}
```

## 📝 Примеры ответов

### Успешная авторизация
```json
{
  "Status": "Success",
  "Data": {
    "AuthToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "ExpirationDateUtc": "2099-12-31T23:59:59"
  }
}
```

### Успешное создание чека
```json
{
  "Status": "Success",
  "Data": {
    "ReceiptId": "105134235"
  }
}
```

### Статус чека (в обработке)
```json
{
  "Status": "Success",
  "Data": {
    "StatusCode": 0,
    "StatusName": "NEW",
    "StatusMessage": "Запрос на чек получен",
    "ReceiptId": "105134235",
    "Device": null
  }
}
```

### Статус чека (обработан)
```json
{
  "Status": "Success",
  "Data": {
    "StatusCode": 1,
    "StatusName": "PROCESSED",
    "StatusMessage": "Чек сформирован на кассе",
    "ReceiptId": "105134235",
    "Device": {
      "DeviceId": "0000111122223333",
      "FN": "9999888877776666",
      "FDN": "12345",
      "FPD": "1234567890",
      "OfdReceiptUrl": "https://check.ofd.ru/..."
    }
  }
}
```

### Ошибка
```json
{
  "Status": "Failed",
  "Error": {
    "Code": 401,
    "Message": "Авторизация невозможна. Неверные учетные данные"
  }
}
```

## 🔍 Отладка

### Просмотр логов через API

1. Авторизуйтесь: `Admin > Admin Login`
2. Получите логи: `Admin > Get Logs` или `Admin > Get Request Logs`

### Просмотр логов через веб-интерфейс

Откройте в браузере: `{{base_url}}/request-logs`

## ⚠️ Важные замечания

1. **Токен сохраняется автоматически** - не нужно копировать вручную
2. **UUID чека сохраняется автоматически** - можно сразу проверять статус
3. **GroupCode по умолчанию 700** - измените если нужен другой
4. **Админ-панель** требует авторизации (login: `admin`, password: `GatewayEcomkassa`)

## 📚 Дополнительная информация

- Документация API: см. `flask-deployment/app.py`
- Веб-интерфейс: `{{base_url}}/`
- Логи запросов: `{{base_url}}/request-logs`
- Health check: `{{base_url}}/health`

## 🐛 Проблемы?

Если запросы не работают:

1. Проверьте `base_url` в переменных окружения
2. Убедитесь что сервис запущен: `curl {{base_url}}/health`
3. Проверьте токен: запустите `Get Auth Token` заново
4. Посмотрите логи: `Get Request Logs` или веб-интерфейс
