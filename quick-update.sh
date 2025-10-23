#!/bin/bash
cd /var/www/ekomkassa-gateway
git add .
git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main || git push origin master
systemctl restart ekomkassa-gateway
systemctl status ekomkassa-gateway --no-pager
