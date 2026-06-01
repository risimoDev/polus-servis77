#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — автоматическая установка SSL (Let's Encrypt / Certbot)
# =============================================================================
#  Запускать на сервере с правами root:
#    chmod +x scripts/setup-ssl.sh && sudo ./scripts/setup-ssl.sh
# =============================================================================

DOMAIN="polus-servis77.ru"
WWW_DOMAIN="www.polus-servis77.ru"
EMAIL="help@polus-servis77.ru"
WEBROOT="/var/www/html"
NGINX_CONF="/etc/nginx/conf.d/polus-servis77.conf"
NGINX_SSL_DIR="/etc/nginx/ssl"

log() { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
error() { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

# ── 0. Проверка root ────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Скрипт нужно запускать от root (sudo)"
fi

# ── 1. Установка Certbot ───────────────────────────────────────────────────
log "Установка certbot..."
if command -v apt-get &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx nginx
elif command -v yum &>/dev/null; then
  yum install -y epel-release
  yum install -y certbot python3-certbot-nginx nginx
elif command -v dnf &>/dev/null; then
  dnf install -y certbot python3-certbot-nginx nginx
else
  error "Не удалось определить пакетный менеджер (apt/yum/dnf)"
fi

# ── 2. Проверка что nginx запущен ──────────────────────────────────────────
log "Перезапуск nginx..."
systemctl enable nginx
systemctl restart nginx || warn "Nginx не запустился — проверьте конфиг вручную"

# ── 3. Проверка DNS ────────────────────────────────────────────────────────
log "Проверка DNS-разрешения для $DOMAIN ..."
SERVER_IP=$(curl -s -4 https://api.ipify.org 2>/dev/null || echo "unknown")
RESOLVED_IP=$(dig +short "$DOMAIN" A 2>/dev/null | head -n1 || echo "")
if [[ -n "$RESOLVED_IP" && "$RESOLVED_IP" != "$SERVER_IP" ]]; then
  warn "DNS A-запись $DOMAIN → $RESOLVED_IP, а IP сервера $SERVER_IP"
  warn "Убедитесь, что A-запись указывает на этот сервер, иначе certbot не сможет проверить владение доменом"
  read -rp "Продолжить anyway? [y/N]: " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# ── 4. Получение сертификата (standalone — самый надёжный) ──────────────────
log "Запрос сертификата Let's Encrypt для $DOMAIN и $WWW_DOMAIN ..."
log "Nginx будет остановлен на ~10 секунд для ACME-валидации..."

systemctl stop nginx || true

certbot certonly \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --standalone \
  -d "$DOMAIN" -d "$WWW_DOMAIN" \
  || error "Certbot (standalone) не смог получить сертификат"

systemctl start nginx || warn "Nginx не запустился — проверьте вручную"

# ── 5. Проверка что сертификаты создались ──────────────────────────────────
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
if [[ ! -f "$CERT_PATH" || ! -f "$KEY_PATH" ]]; then
  error "Сертификаты не найдены: $CERT_PATH / $KEY_PATH"
fi
log "Сертификаты получены: $CERT_PATH"

# ── 6. Обновление nginx конфига ────────────────────────────────────────────
log "Обновление nginx конфига..."

mkdir -p /etc/nginx/conf.d

# Копируем наш site.conf на сервер (если есть рядом)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/../nginx/site.conf" ]]; then
  cp -f "$SCRIPT_DIR/../nginx/site.conf" "$NGINX_CONF"
  log "Скопирован nginx/site.conf → $NGINX_CONF"
else
  warn "Локальный nginx/site.conf не найден. Убедитесь, что $NGINX_CONF содержит пути к SSL."
fi

# Подставляем реальные пути сертификатов в конфиг
sed -i "s|# ssl_certificate.*|ssl_certificate     $CERT_PATH;|" "$NGINX_CONF"
sed -i "s|# ssl_certificate_key.*|ssl_certificate_key $KEY_PATH;|" "$NGINX_CONF"

# ── 7. Проверка и reload nginx ─────────────────────────────────────────────
log "Проверка синтаксиса nginx..."
nginx -t || error "Ошибка в конфиге nginx"

log "Перезагрузка nginx..."
systemctl reload nginx

# ── 8. Настройка автообновления (cron + systemd timer) ───────────────────
log "Настройка автообновления сертификатов..."

# Systemd timer (если доступен)
if systemctl list-timers --quiet certbot.timer 2>/dev/null; then
  systemctl enable certbot.timer
  systemctl start certbot.timer
  log "Включён systemd timer certbot"
else
  # Cron fallback
  CRON_JOB="0 3 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
  if ! grep -q "certbot renew" /etc/crontab 2>/dev/null; then
    echo "$CRON_JOB" >> /etc/crontab
    log "Добавлена cron-задача в /etc/crontab (ежедневно в 03:00)"
  else
    log "Cron-задача certbot уже существует"
  fi
fi

# ── 9. Финальная проверка ─────────────────────────────────────────────────
log "Проверка HTTPS..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200\|301\|302"; then
  log "HTTPS работает! https://$DOMAIN"
else
  warn "Проверьте https://$DOMAIN вручную (возможно, DNS ещё не обновился)"
fi

log "Готово. SSL установлен и настроен на автообновление."
