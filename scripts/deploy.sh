#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — сборка и запуск прод-стека (Docker)
# =============================================================================
#  Запускать на СЕРВЕРЕ из каталога проекта:
#    cd /opt/polus-servis77 && bash scripts/deploy.sh
#
#  Поднимает PostgreSQL + Redis + Node.js (server) + Nginx и применяет миграции.
# =============================================================================

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

# ── 1. Проверки ──────────────────────────────────────────────────────────────
command -v docker >/dev/null || err "Docker не установлен. Сначала: sudo bash scripts/server-provision.sh"

if [[ ! -f .env ]]; then
  cp .env.example .env
  err "Создан .env из шаблона. Заполните его (SMTP, JWT_SECRET, DATABASE_URL) и запустите снова."
fi

if grep -q "change_me_to_a_strong_random_secret" .env; then
  warn "JWT_SECRET в .env всё ещё дефолтный — сгенерируйте: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
fi

if [[ ! -f nginx/ssl/fullchain.pem || ! -f nginx/ssl/privkey.pem ]]; then
  warn "Нет SSL-сертификатов в nginx/ssl/ — nginx не поднимется по HTTPS."
  warn "Выпустите их: sudo bash scripts/ssl-init.sh"
fi

# ── 2. Сборка и запуск ───────────────────────────────────────────────────────
log "Сборка образов..."
docker compose --profile prod build

log "Запуск стека..."
docker compose --profile prod up -d

# ── 3. Миграции БД (ждём готовности postgres) ───────────────────────────────
log "Ожидание готовности базы данных..."
sleep 5
log "Применение миграций Prisma..."
docker compose --profile prod run --rm server npx prisma migrate deploy \
  || warn "Миграции не применились (если БД новая — проверьте DATABASE_URL и наличие миграций)"

# ── 4. Статус ────────────────────────────────────────────────────────────────
log "Текущие контейнеры:"
docker compose --profile prod ps

cat <<EOF

$(log "Деплой завершён.")
Проверьте:
  https://polus-servis77.ru            — сайт
  https://polus-servis77.ru/api/health — здоровье API
Логи:  docker compose --profile prod logs -f server
EOF
