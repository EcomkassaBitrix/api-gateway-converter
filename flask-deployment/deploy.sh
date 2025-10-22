#!/bin/bash

# EcomKassa Gateway - Auto Deploy Script
# Этот скрипт автоматически обновляет код и перезапускает сервис

set -e  # Останавливаться при ошибках

echo "🚀 Starting deployment..."

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Переменные
PROJECT_DIR="/var/www/ekomkassa-gateway"
SERVICE_NAME="ekomkassa-gateway"
BRANCH="main"

echo -e "${YELLOW}📁 Project directory: ${PROJECT_DIR}${NC}"
echo -e "${YELLOW}🔧 Service: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}🌿 Branch: ${BRANCH}${NC}"
echo ""

# Проверка что мы в правильной директории
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Error: Directory ${PROJECT_DIR} not found${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Получить текущий коммит
OLD_COMMIT=$(git rev-parse --short HEAD)
echo -e "${YELLOW}📌 Current commit: ${OLD_COMMIT}${NC}"

# Остановить сервис перед обновлением
echo -e "${YELLOW}⏸️  Stopping service...${NC}"
sudo systemctl stop "$SERVICE_NAME"

# Получить изменения из Git
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# Получить новый коммит
NEW_COMMIT=$(git rev-parse --short HEAD)
echo -e "${GREEN}✅ Updated to commit: ${NEW_COMMIT}${NC}"

# Показать что изменилось
if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
    echo -e "${YELLOW}📝 Changes:${NC}"
    git log --oneline "$OLD_COMMIT..$NEW_COMMIT"
    echo ""
else
    echo -e "${YELLOW}ℹ️  No new changes${NC}"
fi

# Установить/обновить зависимости Python если requirements.txt изменился
if git diff --name-only "$OLD_COMMIT..$NEW_COMMIT" | grep -q "requirements.txt"; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    pip3 install -r requirements.txt
fi

# Запустить сервис
echo -e "${YELLOW}▶️  Starting service...${NC}"
sudo systemctl start "$SERVICE_NAME"

# Подождать 2 секунды
sleep 2

# Проверить статус
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Service is running${NC}"
    
    # Показать статус
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo -e "${GREEN}📊 Check logs: sudo journalctl -u ${SERVICE_NAME} -n 50 -f${NC}"
else
    echo -e "${RED}❌ Service failed to start${NC}"
    echo -e "${RED}📋 Check logs: sudo journalctl -u ${SERVICE_NAME} -n 50${NC}"
    exit 1
fi
