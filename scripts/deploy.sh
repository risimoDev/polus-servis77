#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — сборка и запуск (Docker)
# =============================================================================
#  Лендинг + каталог: nginx (статика) + mailer (отправка формы).
#  Запускать на СЕРВЕРЕ из каталога проекта:
#    cd /opt/polus-servis77 && bash scripts/deploy.sh
# =============================================================================

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

command -v docker >/dev/null || err "Docker не установлен. Сначала: sudo bash scripts/server-provision.sh"

if [[ ! -f .env ]]; then
  cp .env.example .env
  err "Создан .env из шаблона. Впишите SMTP-данные и запустите снова."
fi

if [[ ! -f nginx/ssl/fullchain.pem || ! -f nginx/ssl/privkey.pem ]]; then
  warn "Нет SSL-сертификатов в nginx/ssl/ — nginx не поднимется по HTTPS."
  warn "Выпустите их: sudo bash scripts/ssl-init.sh"
fi

log "Сборка и запуск..."
docker compose up -d --build

log "Контейнеры:"
docker compose ps

cat <<EOF

$(log "Деплой завершён.")
Проверьте:
  https://polus-servis77.ru             — сайт
  https://polus-servis77.ru/api/health  — здоровье сервиса формы
Логи формы:  docker compose logs -f mailer
EOF
