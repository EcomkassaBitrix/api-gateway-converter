#!/bin/bash
cd /var/www/ekomkassa-gateway
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git add .
git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin $BRANCH
systemctl restart ekomkassa-gateway
systemctl status ekomkassa-gateway --no-pager
