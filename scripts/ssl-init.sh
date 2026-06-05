#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — первичный выпуск SSL для Docker-развёртывания
# =============================================================================
#  Получает сертификат Let's Encrypt (standalone) и кладёт его в nginx/ssl,
#  откуда его читает nginx-контейнер. Настраивает автообновление через
#  deploy-hook (scripts/docker-renew-hook.sh).
#
#  Запускать на сервере от root ПОСЛЕ того, как DNS A-записи указывают на сервер:
#    sudo bash scripts/ssl-init.sh
# =============================================================================

DOMAIN="polus-servis77.ru"
WWW_DOMAIN="www.polus-servis77.ru"
EMAIL="help@polus-servis77.ru"
APP_DIR="/opt/polus-servis77"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || err "Запускать от root (sudo)"

# ── 1. certbot ───────────────────────────────────────────────────────────────
if ! command -v certbot >/dev/null; then
  log "Установка certbot..."
  apt-get update -qq && apt-get install -y -qq certbot
fi

mkdir -p "$APP_DIR/nginx/ssl"

# ── 2. Освобождаем порт 80 (если nginx-контейнер запущен) ────────────────────
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q nginx; then
  log "Останавливаю nginx-контейнер на время валидации..."
  (cd "$APP_DIR" && docker compose --profile prod stop nginx) || true
  STOPPED_NGINX=1
fi

# ── 3. Выпуск сертификата (standalone слушает :80) ───────────────────────────
log "Запрос сертификата для $DOMAIN и $WWW_DOMAIN..."
certbot certonly --non-interactive --agree-tos --email "$EMAIL" \
  --standalone -d "$DOMAIN" -d "$WWW_DOMAIN" \
  || err "Certbot не смог получить сертификат (проверьте DNS и что порт 80 свободен)"

# ── 4. Копируем сертификаты в проект ─────────────────────────────────────────
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/nginx/ssl/"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$APP_DIR/nginx/ssl/"
log "Сертификаты скопированы в $APP_DIR/nginx/ssl/"

# ── 5. Автообновление: deploy-hook перезапускает nginx-контейнер ─────────────
HOOK_DIR="/etc/letsencrypt/renewal-hooks/deploy"
mkdir -p "$HOOK_DIR"
if [[ -f "$APP_DIR/scripts/docker-renew-hook.sh" ]]; then
  chmod +x "$APP_DIR/scripts/docker-renew-hook.sh"
  ln -sf "$APP_DIR/scripts/docker-renew-hook.sh" "$HOOK_DIR/polus-servis77.sh"
  log "Deploy-hook автообновления установлен"
else
  warn "scripts/docker-renew-hook.sh не найден — настройте автокопирование сертификатов вручную"
fi

# ── 6. Поднимаем nginx обратно ───────────────────────────────────────────────
if [[ "${STOPPED_NGINX:-0}" == "1" ]]; then
  (cd "$APP_DIR" && docker compose --profile prod start nginx) || true
fi

log "Готово. Сертификат выпущен и настроен на автообновление."
