#!/bin/bash

BASE_URL="http://localhost:3001"
echo "🧪 Тестирование eKomKassa Gateway API"
echo "========================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Health Check
echo -e "${YELLOW}📍 Test 1: Health Check${NC}"
echo "GET $BASE_URL/health"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Status: $http_code${NC}"
    echo "Response: $body"
else
    echo -e "${RED}❌ Status: $http_code${NC}"
    echo "Response: $body"
fi
echo ""
echo "========================================"
echo ""

# 2. Авторизация (тестовый запрос)
echo -e "${YELLOW}📍 Test 2: Authorization (без реальных credentials)${NC}"
echo "POST $BASE_URL/api/Authorization/CreateAuthToken"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/Authorization/CreateAuthToken" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test_user",
    "password": "test_password"
  }')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo -e "Status: $http_code"
echo "Response: $body"
echo ""
echo "========================================"
echo ""

# 3. Статус чека (без токена - должна быть ошибка 400)
echo -e "${YELLOW}📍 Test 3: Status Check (без AuthToken)${NC}"
echo "GET $BASE_URL/api/kkt/cloud/status?uuid=test-uuid"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/kkt/cloud/status?uuid=test-uuid")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✅ Expected 400 (AuthToken required)${NC}"
    echo "Response: $body"
else
    echo -e "${RED}❌ Unexpected status: $http_code${NC}"
    echo "Response: $body"
fi
echo ""
echo "========================================"
echo ""

# 4. Создание чека (без токена - должна быть ошибка 401)
echo -e "${YELLOW}📍 Test 4: Receipt Creation (без token)${NC}"
echo "POST $BASE_URL/api/kkt/cloud/receipt"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/kkt/cloud/receipt" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "test-123",
    "receipt": {
      "items": [
        {
          "name": "Test Item",
          "price": 100,
          "quantity": 1,
          "sum": 100
        }
      ]
    }
  }')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ Expected 401 (Token required)${NC}"
    echo "Response: $body"
else
    echo -e "${RED}❌ Unexpected status: $http_code${NC}"
    echo "Response: $body"
fi
echo ""
echo "========================================"
echo ""

echo -e "${GREEN}🎉 Тесты завершены!${NC}"
echo ""
echo "ℹ️  Для полного тестирования с реальными credentials:"
echo "   - Получите токен через POST /api/Authorization/CreateAuthToken"
echo "   - Используйте его для запросов /api/kkt/cloud/status и /api/kkt/cloud/receipt"
