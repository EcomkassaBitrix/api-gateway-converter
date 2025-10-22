#!/bin/bash

# EcomKassa Gateway - Setup GitHub Webhook Auto-Deploy
# Этот скрипт настраивает автоматический деплой при push в GitHub

set -e

echo "🔧 Setting up GitHub Webhook Auto-Deploy..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Переменные
WEBHOOK_DIR="/var/www/webhook"
WEBHOOK_SERVICE="github-webhook"
PROJECT_DIR="/var/www/ekomkassa-gateway"

# Создать директорию для webhook
echo -e "${YELLOW}📁 Creating webhook directory...${NC}"
sudo mkdir -p "$WEBHOOK_DIR"
cd "$WEBHOOK_DIR"

# Создать webhook сервер на Python
echo -e "${YELLOW}📝 Creating webhook server...${NC}"
sudo tee webhook-server.py > /dev/null <<'EOF'
#!/usr/bin/env python3
"""
GitHub Webhook Server for EcomKassa Gateway Auto-Deploy
Listens for GitHub push events and triggers deployment
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import hmac
import hashlib
import os

# Секрет для проверки webhook (рекомендуется установить)
WEBHOOK_SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET', '')
DEPLOY_SCRIPT = '/var/www/ekomkassa-gateway/flask-deployment/deploy.sh'

class WebhookHandler(BaseHTTPRequestHandler):
    
    def do_POST(self):
        if self.path != '/webhook':
            self.send_response(404)
            self.end_headers()
            return
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Проверка подписи GitHub (если установлен секрет)
        if WEBHOOK_SECRET:
            signature = self.headers.get('X-Hub-Signature-256', '')
            expected_signature = 'sha256=' + hmac.new(
                WEBHOOK_SECRET.encode(),
                post_data,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                print('❌ Invalid signature')
                self.send_response(401)
                self.end_headers()
                self.wfile.write(b'Invalid signature')
                return
        
        try:
            payload = json.loads(post_data)
            
            # Проверка что это push в main
            if payload.get('ref') == 'refs/heads/main':
                print(f"✅ Received push to main branch")
                print(f"📝 Commit: {payload['head_commit']['message']}")
                print(f"👤 Author: {payload['head_commit']['author']['name']}")
                
                # Запустить скрипт деплоя
                print(f"🚀 Starting deployment...")
                result = subprocess.run(
                    ['bash', DEPLOY_SCRIPT],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    print('✅ Deployment successful')
                    response = {'status': 'success', 'message': 'Deployment completed'}
                else:
                    print(f'❌ Deployment failed: {result.stderr}')
                    response = {'status': 'error', 'message': result.stderr}
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            else:
                print(f"ℹ️  Ignoring push to {payload.get('ref')}")
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'OK (ignored)')
        
        except Exception as e:
            print(f'❌ Error: {str(e)}')
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f'Error: {str(e)}'.encode())
    
    def log_message(self, format, *args):
        # Кастомный формат логов
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == '__main__':
    PORT = 9000
    server = HTTPServer(('0.0.0.0', PORT), WebhookHandler)
    print(f'🌐 Webhook server started on port {PORT}')
    print(f'📍 Endpoint: http://your-server:9000/webhook')
    
    if WEBHOOK_SECRET:
        print('🔒 Signature verification: ENABLED')
    else:
        print('⚠️  Signature verification: DISABLED (set GITHUB_WEBHOOK_SECRET)')
    
    server.serve_forever()
EOF

sudo chmod +x webhook-server.py

# Создать systemd service
echo -e "${YELLOW}⚙️  Creating systemd service...${NC}"
sudo tee /etc/systemd/system/${WEBHOOK_SERVICE}.service > /dev/null <<EOF
[Unit]
Description=GitHub Webhook Auto-Deploy Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${WEBHOOK_DIR}
ExecStart=/usr/bin/python3 ${WEBHOOK_DIR}/webhook-server.py
Restart=always
RestartSec=10

# Environment variables
Environment="GITHUB_WEBHOOK_SECRET="

[Install]
WantedBy=multi-user.target
EOF

# Перезагрузить systemd
echo -e "${YELLOW}🔄 Reloading systemd...${NC}"
sudo systemctl daemon-reload

# Запустить сервис
echo -e "${YELLOW}▶️  Starting webhook service...${NC}"
sudo systemctl enable ${WEBHOOK_SERVICE}
sudo systemctl start ${WEBHOOK_SERVICE}

# Проверить статус
sleep 2
if sudo systemctl is-active --quiet ${WEBHOOK_SERVICE}; then
    echo -e "${GREEN}✅ Webhook service is running${NC}"
else
    echo -e "${RED}❌ Webhook service failed to start${NC}"
    sudo journalctl -u ${WEBHOOK_SERVICE} -n 20
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Webhook setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Get your server IP: curl ifconfig.me"
echo "2. Open your GitHub repository settings"
echo "3. Go to Settings → Webhooks → Add webhook"
echo "4. Set Payload URL: http://YOUR_SERVER_IP:9000/webhook"
echo "5. Set Content type: application/json"
echo "6. Select: Just the push event"
echo "7. Click Add webhook"
echo ""
echo -e "${YELLOW}🔒 Security (recommended):${NC}"
echo "1. Generate secret: openssl rand -hex 20"
echo "2. Add secret to GitHub webhook settings"
echo "3. Set environment variable: sudo systemctl edit ${WEBHOOK_SERVICE}"
echo "   Add: Environment=\"GITHUB_WEBHOOK_SECRET=your_secret_here\""
echo "4. Restart: sudo systemctl restart ${WEBHOOK_SERVICE}"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo "- Check status: sudo systemctl status ${WEBHOOK_SERVICE}"
echo "- View logs: sudo journalctl -u ${WEBHOOK_SERVICE} -f"
echo "- Restart: sudo systemctl restart ${WEBHOOK_SERVICE}"
echo "- Stop: sudo systemctl stop ${WEBHOOK_SERVICE}"
