# Развёртывание «Полюс Сервис 77» на сервере

Стек поднимается в Docker: **PostgreSQL + Redis + Node.js (API) + Nginx**.
Форма заявок отправляется на Node API (`/api/v1/contact`) и уходит письмом через SMTP.

---

## 0. Что нужно заранее

- Сервер с **Ubuntu 22.04+**, root/sudo-доступ по SSH.
- Домен **polus-servis77.ru** с DNS-доступом (где правятся записи).
- Почтовый ящик и **SMTP-доступ** (host, port, login, пароль) — для отправки заявок.

### DNS-записи домена

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` (polus-servis77.ru) | IP вашего сервера |
| A | `www` | IP вашего сервера |

Дождитесь, пока `polus-servis77.ru` начнёт резолвиться в IP сервера (`ping polus-servis77.ru`), иначе не выпустится SSL.

---

## 1. Провижининг сервера (один раз)

Сначала закиньте на сервер скрипт провижининга (он поставит Docker и rsync,
без которых не сработает загрузка проекта):

```bash
# локально
scp scripts/server-provision.sh root@<IP-сервера>:/root/

# на сервере, от root
sudo bash /root/server-provision.sh
```

Скрипт установит Docker + Compose + rsync, откроет порты 22/80/443, создаст `/opt/polus-servis77`.

---

## 2. Загрузка проекта на сервер

**Локально**, из корня проекта (Windows — Git Bash/WSL, есть `rsync` и `ssh`):

```bash
bash scripts/upload.sh root@<IP-сервера>
```

Зальёт файлы в `/opt/polus-servis77`, не трогая `.env`, SSL и загруженные файлы.
Повторяйте эту команду при каждом обновлении сайта.

---

## 3. Настройка .env

На сервере:

```bash
cd /opt/polus-servis77
cp .env.example .env
nano .env
```

Заполните обязательно:

- **`JWT_SECRET`** — случайная строка ≥32 символов. Сгенерировать:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- **База данных** — придумайте пароль и пропишите его в трёх местах согласованно:
  - `DATABASE_URL="postgresql://polus:ВАШ_ПАРОЛЬ@postgres:5432/polus_servis"` (хост именно `postgres`!)
  - `DB_PASS=ВАШ_ПАРОЛЬ`
- **SMTP** (данные вашего провайдера):
  - `SMTP_HOST`, `SMTP_PORT` (465 или 587), `SMTP_SECURE` (true для 465 / false для 587)
  - `SMTP_USER` — ящик-отправитель (напр. noreply@polus-servis77.ru)
  - `SMTP_PASS` — пароль ящика (или «пароль приложения»)
  - `MAIL_FROM` = `SMTP_USER`; `MAIL_TO` = куда приходят заявки (help@polus-servis77.ru)
- `CORS_ORIGINS=https://polus-servis77.ru,https://www.polus-servis77.ru`

---

## 4. SSL-сертификат (один раз)

DNS уже должен указывать на сервер. Затем:

```bash
sudo bash scripts/ssl-init.sh
```

Выпустит сертификат Let's Encrypt, положит его в `nginx/ssl/` и настроит автообновление
(хук перезапустит nginx-контейнер при продлении).

---

## 5. Запуск

```bash
cd /opt/polus-servis77
bash scripts/deploy.sh
```

Соберёт образы, поднимет весь стек и применит миграции БД.

---

## 6. Проверка

- `https://polus-servis77.ru` — сайт открывается с замком.
- `http://polus-servis77.ru` → 301 на HTTPS; `https://www...` → 301 на без-www.
- `https://polus-servis77.ru/api/health` → `{"ok":true,...}`.
- Отправьте заявку через форму на сайте → письмо должно прийти на `MAIL_TO`.

Проверка API напрямую:

```bash
curl -X POST https://polus-servis77.ru/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Тест","phone":"+79990000000","message":"проверка"}'
# Ожидается: {"ok":true}
```

---

## 7. Почта — чтобы заявки доходили и не падали в спам

Отправка уже работает после шага 3 (SMTP в `.env`). Для **доставляемости** добавьте DNS-записи
(значения берёте у своего почтового провайдера):

| Тип | Имя | Значение (пример) |
|-----|-----|--------|
| TXT | `@` | `v=spf1 include:_spf.<провайдер> ~all` |
| TXT | `mail._domainkey` (имя даёт провайдер) | DKIM-ключ от провайдера |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:help@polus-servis77.ru` |

Если письма не приходят:
- проверьте логи API: `docker compose --profile prod logs -f server`;
- убедитесь, что хостинг не блокирует исходящий порт 465/587;
- проверьте логин/пароль SMTP и что провайдер разрешает SMTP для этого ящика.

---

## 8. Обновление сайта

```bash
# локально
bash scripts/upload.sh root@<IP> --deploy
```

Флаг `--deploy` сразу пересоберёт и перезапустит стек на сервере.

---

## 9. Полезные команды

```bash
cd /opt/polus-servis77

docker compose --profile prod ps              # статус контейнеров
docker compose --profile prod logs -f server  # логи API
docker compose --profile prod logs -f nginx   # логи nginx
docker compose --profile prod restart nginx   # перезапуск nginx
docker compose --profile prod down            # остановить всё

sudo certbot certificates                      # статус SSL
sudo certbot renew --dry-run                   # тест автопродления
```
