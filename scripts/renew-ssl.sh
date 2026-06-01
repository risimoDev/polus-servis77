#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — ручное/тестовое обновление SSL-сертификатов
# =============================================================================
#  Certbot обычно обновляет сертификаты автоматически через systemd/cron.
#  Этот скрипт для ручного запуска или отладки.
# =============================================================================

DOMAIN="polus-servis77.ru"

log() { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
error() { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

if [[ $EUID -ne 0 ]]; then
  error "Скрипт нужно запускать от root (sudo)"
fi

log "Проверка срока действия сертификата для $DOMAIN ..."

CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [[ ! -f "$CERT" ]]; then
  error "Сертификат не найден: $CERT"
fi

# Покажем дату истечения
EXPIRY=$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)
log "Текущий сертификат истекает: $EXPIRY"

log "Запуск certbot renew..."
certbot renew --quiet --deploy-hook 'systemctl reload nginx'

log "Nginx reloaded. Проверка HTTPS..."
curl -s -I "https://$DOMAIN" | head -n1 || warn "Проверьте https://$DOMAIN вручную"

log "Обновление завершено."
