# Деплой Полюс Сервис 77 (polus-servis77.ru)

## 1. DNS

Убедитесь, что A-записи `polus-servis77.ru` и `www.polus-servis77.ru` указывают на IP вашего сервера.

## 2. Копирование проекта на сервер

```bash
# На сервере
mkdir -p /opt/polus-servis77
cd /opt/polus-servis77
git clone <repo> .        # или scp / rsync
```

## 3. Установка SSL (Let's Encrypt)

```bash
cd /opt/polus-servis77
chmod +x scripts/setup-ssl.sh
sudo ./scripts/setup-ssl.sh
```

Скрипт автоматически:
- Установит `certbot` и `nginx`
- Получит сертификаты для `polus-servis77.ru` + `www.polus-servis77.ru`
- Скопирует `nginx/site.conf` → `/etc/nginx/conf.d/polus-servis77.conf`
- Подставит пути к сертификатам в конфиг
- Проверит синтаксис и перезагрузит nginx
- Настроит автообновление через `cron` или `systemd timer`

### Ручное обновление (если нужно)

```bash
sudo ./scripts/renew-ssl.sh
```

Автообновление уже настроено cron'ом (`/etc/crontab`), certbot обновляет сертификаты за 30 дней до истечения.

## 4. Настройка .env

```bash
cp .env.example .env
nano .env
```

Обязательно проверьте:
- `CORS_ORIGINS=https://polus-servis77.ru`
- `SMTP_USER=noreply@polus-servis77.ru`
- `MAIL_FROM=noreply@polus-servis77.ru`
- `MAIL_TO=help@polus-servis77.ru`
- `JWT_SECRET` — сгенерируйте случайную строку ≥32 символов
- `DATABASE_URL`, `DB_*` — подстройте под вашу БД
- `SMTP_PASS` — пароль от почты

## 5. Запуск (без Docker — чистый лендинг)

Если используете только PHP + nginx (без Node.js API):

```bash
# Убедитесь, что nginx конфиг указывает на /opt/polus-servis77
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Запуск (Docker — полный стек)

```bash
# Подготовка SSL для Docker
cd /opt/polus-servis77
sudo cp /etc/letsencrypt/live/polus-servis77.ru/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/polus-servis77.ru/privkey.pem   nginx/ssl/

# Запуск
sudo docker compose --profile prod up -d
```

> **Важно:** при использовании Docker certbot должен быть установлен на **хосте**, а не внутри контейнера. После автообновления сертификатов на хосте выполняйте:
> ```bash
> sudo cp /etc/letsencrypt/live/polus-servis77.ru/*.pem /opt/polus-servis77/nginx/ssl/
> sudo docker compose restart nginx
> ```
> Это можно добавить в `renewal-hook` certbot или cron.

## 7. Проверка

- `https://polus-servis77.ru` — должен открываться с зелёным замком
- `http://polus-servis77.ru` → 301 redirect на HTTPS
- API: `https://polus-servis77.ru/api/health`

## 8. Полезные команды

```bash
# Проверка конфига nginx
sudo nginx -t

# Перезагрузка nginx
sudo systemctl reload nginx

# Логи certbot
sudo certbot certificates
sudo certbot renew --dry-run

# Логи nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Что изменено в коде при смене домена

Старый домен `risimobzkdev.ru` уже был полностью заменён на `polus-servis77.ru` во всех файлах проекта:

- `index.html` — `og:url`, `canonical`, `ld+json`, email
- `.env.example` — `CORS_ORIGINS`, `SMTP_USER`, `MAIL_FROM`, `MAIL_TO`
- `send.php` — `TO_EMAIL`, `FROM_EMAIL`
- `robots.txt` — `Sitemap`
- `sitemap.xml` — `<loc>`
- `nginx/site.conf` — `server_name`
- `nginx/nginx.conf` — `server_name`
- `src/Config/Mail.php` — `from_addr`, `to`
- `src/Config/App.php` — `APP_URL`
