# Postman коллекция для EcomKassa API

Эта папка содержит готовые Postman коллекции для тестирования API шлюза EcomKassa.

## Содержимое

- **EcomKassa API.postman_collection.json** - основная коллекция с запросами
- **EcomKassa Environment.postman_environment.json** - переменные окружения

## Быстрый старт

### 1. Импорт в Postman

1. Открой Postman
2. Нажми **Import** в левом верхнем углу
3. Перетащи оба JSON файла в окно импорта:
   - `EcomKassa API.postman_collection.json`
   - `EcomKassa Environment.postman_environment.json`
4. Нажми **Import**

### 2. Настройка переменных окружения

1. В Postman выбери окружение **EcomKassa Environment** в правом верхнем углу
2. Нажми на иконку глаза → **Edit**
3. Заполни значения:
   - `login` - твой логин кассы
   - `password` - твой пароль кассы
   - `kkt_uuid` - UUID кассы
   - `baseUrl` - уже заполнен: `https://gw.ecomkassa.ru`
   - `authToken` - оставь пустым (заполнится автоматически)
4. Нажми **Save**

### 3. Использование

#### Шаг 1: Получить токен авторизации

1. Открой папку **1. Authorization**
2. Выбери запрос **Create Auth Token**
3. Нажми **Send**
4. Токен автоматически сохранится в переменную `authToken`

#### Шаг 2: Проверить статус кассы

1. Открой папку **2. KKT Operations**
2. Выбери запрос **Get KKT Status**
3. Нажми **Send**
4. Получишь информацию о статусе кассы

#### Шаг 3: Создать чек

1. В папке **2. KKT Operations**
2. Выбери запрос **Create Receipt**
3. Измени данные в теле запроса (товары, суммы) если нужно
4. Нажми **Send**
5. Получишь информацию о созданном чеке

#### Шаг 4: Проверить работоспособность API

1. Открой папку **3. Health Check**
2. Выбери запрос **Health Check**
3. Нажми **Send**
4. Если API работает, получишь `{"status": "ok"}`

## Структура коллекции

### 1. Authorization
- **Create Auth Token** - получение токена авторизации

### 2. KKT Operations
- **Get KKT Status** - получение статуса кассы
- **Create Receipt** - создание нового чека

### 3. Health Check
- **Health Check** - проверка работоспособности API

## Автоматизация

Коллекция включает автоматические скрипты:

- После получения токена в **Create Auth Token**, он автоматически сохраняется в переменную `authToken`
- Все последующие запросы автоматически используют этот токен
- При создании чека автоматически генерируется уникальный `InvoiceId`

## Переменные окружения

| Переменная | Описание | Пример значения |
|-----------|----------|----------------|
| `baseUrl` | Базовый URL API | `https://gw.ecomkassa.ru` |
| `login` | Логин кассы | `test_login` |
| `password` | Пароль кассы | `test_password` |
| `kkt_uuid` | UUID кассы | `00000000-0000-0000-0000-000000000000` |
| `authToken` | Токен авторизации | Автоматически заполняется |

## Примеры запросов

### Создание чека (пример тела запроса)

```json
{
  "AuthToken": "{{authToken}}",
  "Request": {
    "UUID": "{{kkt_uuid}}",
    "Request": {
      "Type": "Income",
      "InvoiceId": "{{$randomUUID}}",
      "TaxationType": "OSN",
      "ClientInfo": {
        "EmailOrPhone": "+79001234567"
      },
      "Items": [
        {
          "Price": 100.00,
          "Quantity": 1,
          "Amount": 100.00,
          "Name": "Тестовый товар",
          "Tax": "NDS20",
          "PaymentMethod": "FullPayment",
          "PaymentObject": "Commodity"
        }
      ],
      "Cash": 0.00,
      "ElectronicPayment": 100.00,
      "AdvancePayment": 0.00,
      "Credit": 0.00,
      "CashProvision": 0.00
    }
  }
}
```

## Troubleshooting

### Ошибка 401 Unauthorized
- Проверь правильность `login` и `password` в переменных окружения
- Получи новый токен через **Create Auth Token**

### Ошибка 404 Not Found
- Проверь что `baseUrl` правильный: `https://gw.ecomkassa.ru`
- Проверь что API развёрнут и работает

### Ошибка 500 Internal Server Error
- Проверь логи сервера: `sudo journalctl -u ekomkassa-gateway -n 50`
- Убедись что база данных доступна

## Логи

Все запросы логируются в PostgreSQL базу данных `ekomkassa_logs`.

Для просмотра логов:
- Через веб-интерфейс: `https://gw.ecomkassa.ru/logs`
- Через SQL: подключись к базе и выполни `SELECT * FROM request_logs ORDER BY timestamp DESC LIMIT 100;`

## Дополнительная информация

- [Документация API](../flask-deployment/DEPLOY.md)
- [Руководство по развёртыванию](../flask-deployment/DEPLOY.md)
- [Telegram сообщество](https://t.me/+QgiLIa1gFRY4Y2Iy)
