#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — применение конфига nginx без простоя
# =============================================================================
#  Конфиг nginx/nginx.conf монтируется в контейнер, поэтому пересборка не нужна:
#  достаточно проверить синтаксис и сделать reload.
#
#  Запускать на СЕРВЕРЕ после обновления кода (git pull):
#    cd /opt/polus-servis77 && bash scripts/nginx-reload.sh
# =============================================================================

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

command -v docker >/dev/null || err "Docker не установлен."

# Контейнер nginx запущен?
if ! docker compose ps --status running nginx 2>/dev/null | grep -q nginx; then
  warn "Контейнер nginx не запущен — поднимаю стек."
  docker compose up -d
  sleep 3
fi

# 1. Проверка синтаксиса (внутри контейнера, где резолвится host 'mailer')
log "Проверка конфигурации nginx..."
if ! docker compose exec -T nginx nginx -t; then
  err "Ошибка в конфигурации nginx — reload отменён. Исправьте nginx/nginx.conf."
fi

# 2. Горячая перезагрузка без обрыва соединений
log "Перезагрузка nginx..."
docker compose exec -T nginx nginx -s reload

log "Готово. Конфиг применён."
echo
echo "Проверка:"
echo "  curl -I  https://polus-servis77.ru/                  # 200"
echo "  curl -I  https://polus-servis77.ru/api/health        # 200"
echo "  curl -sI https://polus-servis77.ru/nesushestvuet | head -1   # 404"
echo "  curl -sI https://polus-servis77.ru/DEPLOY.md | head -1        # 404"
