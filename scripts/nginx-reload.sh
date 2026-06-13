#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — применение конфига nginx
# =============================================================================
#  ВАЖНО: nginx/nginx.conf монтируется в контейнер как ОДИНОЧНЫЙ ФАЙЛ.
#  После `git pull` файл заменяется (новый inode), а bind-mount остаётся
#  привязан к старому — поэтому обычный `nginx -s reload` читает СТАРЫЙ
#  конфиг. Чтобы применился новый файл, контейнер nginx нужно ПЕРЕСОЗДАТЬ.
#
#  Запускать на СЕРВЕРЕ после обновления кода (git pull):
#    cd /opt/polus-servis77 && bash scripts/nginx-reload.sh
# =============================================================================

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

command -v docker >/dev/null || err "Docker не установлен."

# 1. Проверяем НОВЫЙ конфиг в одноразовом контейнере.
#    `run` создаёт свежий контейнер → монтируется текущий (новый) файл,
#    сеть compose даёт резолв upstream'а 'mailer'.
log "Проверка нового конфига nginx..."
if ! docker compose run --rm -T nginx nginx -t; then
  err "Конфиг невалиден — ничего не менял. Исправьте nginx/nginx.conf."
fi

# 2. Пересоздаём рабочий контейнер nginx, чтобы он прочитал новый файл.
log "Применение: пересоздаю контейнер nginx..."
docker compose up -d --force-recreate nginx

sleep 2
if ! docker compose ps --status running nginx 2>/dev/null | grep -q nginx; then
  err "nginx не поднялся после пересоздания. Логи: docker compose logs --tail=40 nginx"
fi

log "Готово. Новый конфиг применён."
echo
echo "Проверка (должно быть так):"
echo "  curl -sI https://polus-servis77.ru/            | head -1   # 200"
echo "  curl -s  https://polus-servis77.ru/api/health             # {\"ok\":true,...}"
echo "  curl -sI https://polus-servis77.ru/nesushestvuet | head -1 # 404"
echo "  curl -sI https://polus-servis77.ru/DEPLOY.md   | head -1   # 404"
echo "  curl -sI https://polus-servis77.ru/admin       | head -1   # 404"
echo "  curl -sI https://polus-servis77.ru/admin/      | head -1   # 404"
