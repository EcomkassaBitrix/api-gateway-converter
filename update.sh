#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== eKomKassa Gateway Update Script ===${NC}"
echo ""

cd /var/www/ekomkassa-gateway

echo -e "${YELLOW}Проверка изменений...${NC}"
git status

echo -e "${YELLOW}Добавление файлов в git...${NC}"
git add .

echo -e "${YELLOW}Введите сообщение коммита (или нического):${NC}"
read -r commit_message

if [ -z "$commit_message" ]; then
    commit_message="Auto-update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo -e "${YELLOW}Создание коммита...${NC}"
git commit -m "$commit_message"

if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка при создании коммита или нет изменений${NC}"
else
    echo -e "${GREEN}✓ Коммит создан успешно${NC}"
fi

echo -e "${YELLOW}Отправка изменений в GitHub...${NC}"
git push origin main

if [ $? -ne 0 YELLOW}Попытка push в ветку master...${NC}"
    git push origin master
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка при отправке в Git${NC}"
    else
        echo -e "${GREEN}✓ Изменения отправлены в GitHub (master)${NC}"
    fi
else
    echo -e "${GREEN}✓ Изменения отправлены в GitHub (main)${NC}"
fi

echo -e "${YELLOW}Перезапуск сервиса...${NC}"
systemctl restart ekomkassa-gateway

if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка при перезапуске сервиса${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Сервис перезапущен${NC}"
fi

sleep 2
systemctl status ekomkassa-gateway --no-pager -l

if systemctl is-active --quiet ekomkassa-gateway; then
    echo -e "${GREEN}✓ Сервис работает нормально${NC}"
else
    echo -e "${RED}✗ Сервис не запущен!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Последние 20 строк логов:${NC}"
journalctl -u ekomkassa-gateway -n 20 --no-pager

echo ""
echo -e "${GREEN}=== Обновление завершено ===${NC}"
