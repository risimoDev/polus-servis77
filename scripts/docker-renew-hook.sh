#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Certbot deploy-hook для Docker-развёртывания
#  Копирует обновлённые сертификаты в проект и перезапускает nginx-контейнер
# =============================================================================
#  Установка:
#    sudo chmod +x scripts/docker-renew-hook.sh
#    sudo ln -s /opt/polus-servis77/scripts/docker-renew-hook.sh \
#               /etc/letsencrypt/renewal-hooks/deploy/polus-servis77.sh
# =============================================================================

PROJECT_DIR="/opt/polus-servis77"
DOMAIN="polus-servis77.ru"

log() { echo -e "\033[1;32m[+]\033[0m $*"; }
error() { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

log "Certbot deploy-hook для $DOMAIN"

# Проверим что проект существует
if [[ ! -d "$PROJECT_DIR" ]]; then
  error "Проект не найден: $PROJECT_DIR"
fi

# Копируем сертификаты
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$PROJECT_DIR/nginx/ssl/"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$PROJECT_DIR/nginx/ssl/"
log "Сертификаты скопированы в $PROJECT_DIR/nginx/ssl/"

# Перезапускаем nginx в Docker (если контейнер запущен)
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q "polus-servis77-nginx-1\|nginx"; then
  cd "$PROJECT_DIR"
  docker compose restart nginx || docker compose --profile prod restart nginx
  log "Nginx-контейнер перезапущен"
else
  log "Docker nginx не найден — пропущено"
fi

log "Deploy-hook завершён."
