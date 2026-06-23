#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — загрузка проекта на сервер (rsync) + деплой
# =============================================================================
#  Запускать ЛОКАЛЬНО из корня проекта:
#    bash scripts/upload.sh user@<IP-сервера> [--deploy]
#
#  Примеры:
#    bash scripts/upload.sh root@203.0.113.10            # только залить файлы
#    bash scripts/upload.sh root@203.0.113.10 --deploy   # залить и пересобрать стек
#
#  .env и storage/uploads НЕ перезаписываются (исключены из синхронизации).
#  Требуется ssh-доступ к серверу и установленный rsync (локально и на сервере).
# =============================================================================

REMOTE="${1:-}"
DEPLOY="${2:-}"
APP_DIR="/opt/polus-servis77"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

[[ -n "$REMOTE" ]] || err "Укажите цель: bash scripts/upload.sh user@host [--deploy]"
command -v rsync >/dev/null || err "rsync не установлен локально"

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Пререндер страниц услуг (SEO): обновляем /service/<slug>.html из services.json
command -v node >/dev/null || err "node не установлен локально — нужен для пререндера страниц услуг"
log "Пререндер страниц услуг..."
node scripts/prerender-services.cjs

log "Синхронизация проекта → $REMOTE:$APP_DIR"
rsync -avz --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.env' \
  --exclude='nginx/ssl/' \
  --exclude='storage/uploads/' \
  --exclude='storage/logs/' \
  --exclude='*.log' \
  ./ "$REMOTE:$APP_DIR/"

log "Файлы загружены."

if [[ "$DEPLOY" == "--deploy" ]]; then
  log "Запуск деплоя на сервере..."
  ssh "$REMOTE" "cd $APP_DIR && bash scripts/deploy.sh"
else
  cat <<EOF

Дальше — на сервере:
  ssh $REMOTE
  cd $APP_DIR
  cp .env.example .env && nano .env     # если ещё не настроен
  sudo bash scripts/ssl-init.sh         # если сертификат ещё не выпущен
  bash scripts/deploy.sh

Либо повторите с флагом --deploy:
  bash scripts/upload.sh $REMOTE --deploy
EOF
fi
