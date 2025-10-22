#!/bin/bash

# Скрипт для исправления двойного json.loads в Flask app.py

APP_FILE="/var/www/ekomkassa-gateway/flask-deployment/app.py"

echo "Исправляю JSON парсинг в $APP_FILE..."

# Создаём бэкап
cp "$APP_FILE" "${APP_FILE}.backup_$(date +%Y%m%d_%H%M%S)"

# Исправляем json.loads на прямое использование row[X]
sed -i "s/'request_headers': json\.loads(row\[7\]) if row\[7\] else None/'request_headers': row[7]/g" "$APP_FILE"
sed -i "s/'request_body': json\.loads(row\[8\]) if row\[8\] else None/'request_body': row[8]/g" "$APP_FILE"
sed -i "s/'target_headers': json\.loads(row\[11\]) if row\[11\] else None/'target_headers': row[11]/g" "$APP_FILE"
sed -i "s/'target_body': json\.loads(row\[12\]) if row\[12\] else None/'target_body': row[12]/g" "$APP_FILE"
sed -i "s/'response_headers': json\.loads(row\[14\]) if row\[14\] else None/'response_headers': row[14]/g" "$APP_FILE"
sed -i "s/'response_body': json\.loads(row\[15\]) if row\[15\] else None/'response_body': row[15]/g" "$APP_FILE"
sed -i "s/'client_response_body': json\.loads(row\[17\]) if row\[17\] else None/'client_response_body': row[17]/g" "$APP_FILE"

echo "Файл исправлен!"
echo "Перезапускаю службу..."

systemctl restart ekomkassa-gateway

echo "Готово! Проверяю статус службы:"
systemctl status ekomkassa-gateway --no-pager -l

echo ""
echo "✅ Исправление завершено!"
echo "Бэкап сохранён в: ${APP_FILE}.backup_*"
