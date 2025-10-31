#!/bin/bash

echo "🚀 Начинаем обновление..."

echo "📥 Получаем последние изменения из GitHub..."
git pull origin main

echo "📦 Устанавливаем зависимости..."
npm install

echo "🔨 Собираем проект..."
npm run build

echo "✅ Обновление завершено!"
