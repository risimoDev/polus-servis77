#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
#  Полюс Сервис 77 — провижининг чистого Ubuntu-сервера
# =============================================================================
#  Устанавливает Docker, Docker Compose, firewall и готовит каталог проекта.
#  Запускать ОДИН РАЗ на сервере от root:
#    sudo bash scripts/server-provision.sh
#  (или: scp этот скрипт на сервер и запустить там)
# =============================================================================

APP_DIR="/opt/polus-servis77"

log()  { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[-]\033[0m $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || err "Запускать от root (sudo)"
command -v apt-get >/dev/null || err "Скрипт рассчитан на Ubuntu/Debian (apt)"

# ── 1. Базовые пакеты ────────────────────────────────────────────────────────
log "Обновление системы и установка зависимостей..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git ufw rsync

# ── 2. Docker Engine + Compose plugin (официальный репозиторий) ──────────────
if command -v docker >/dev/null; then
  log "Docker уже установлен: $(docker --version)"
else
  log "Установка Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  log "Docker установлен: $(docker --version)"
fi

# ── 3. Firewall (SSH + HTTP + HTTPS) ─────────────────────────────────────────
log "Настройка firewall (ufw)..."
ufw allow OpenSSH    >/dev/null 2>&1 || ufw allow 22/tcp
ufw allow 80/tcp     >/dev/null
ufw allow 443/tcp    >/dev/null
ufw --force enable   >/dev/null
log "Firewall: открыты 22, 80, 443"

# ── 4. Каталог проекта ───────────────────────────────────────────────────────
mkdir -p "$APP_DIR/nginx/ssl" "$APP_DIR/storage/uploads"
log "Каталог проекта готов: $APP_DIR"

cat <<EOF

$(log "Провижининг завершён.")

Дальше:
  1. Загрузите проект на сервер  — локально:  bash scripts/upload.sh user@<IP>
  2. Заполните $APP_DIR/.env       (cp .env.example .env && nano .env)
  3. Выпустите SSL-сертификат      — на сервере: sudo bash scripts/ssl-init.sh
  4. Запустите стек                — на сервере: bash scripts/deploy.sh
EOF
