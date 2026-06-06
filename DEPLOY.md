# Развёртывание «Полюс Сервис 77» на сервере

Лендинг + каталог. В Docker поднимается только **Nginx** (отдаёт статику) и
**mailer** — крошечный сервис на Node, который принимает форму (`/api/v1/contact`)
и отправляет письмо через ваш SMTP. Без базы данных и лишних зависимостей.

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

Нужны только данные вашего SMTP:

- `SMTP_HOST`, `SMTP_PORT` (465 или 587), `SMTP_SECURE` (true для 465 / false для 587)
- `SMTP_USER` — ящик-отправитель (напр. noreply@polus-servis77.ru)
- `SMTP_PASS` — пароль ящика (или «пароль приложения»)
- `MAIL_FROM` = `SMTP_USER`; `MAIL_TO` = куда приходят заявки (help@polus-servis77.ru)

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
- проверьте логи сервиса формы: `docker compose logs -f mailer`;
- убедитесь, что хостинг не блокирует исходящий порт 465/587;
- проверьте логин/пароль SMTP и что провайдер разрешает SMTP для этого ящика.

---

## 8. Обновление сайта

```bash
# локально
bash scripts/upload.sh root@<IP> --deploy
```

Флаг `--deploy` сразу пересоберёт и перезапустит стек на сервере.

После значимого обновления контента полезно уведомить Яндекс (см. ниже).

---

## 8a. IndexNow — мгновенное уведомление поисковиков

Протокол [IndexNow](https://yandex.ru/support/webmaster/ru/indexing-options/index-now.html)
сообщает Яндексу (и Bing/Seznam) об изменениях, чтобы робот пришёл сразу, а не ждал обхода.

Уже настроено: ключ-файл `a790da1b5dc0851cadbb3630139ac157.txt` лежит в корне и отдаётся
по `https://polus-servis77.ru/a790da1b5dc0851cadbb3630139ac157.txt`.

После обновления контента (новые услуги, изменения в каталоге, цены) запустите:

```bash
# все URL из sitemap
node scripts/indexnow.cjs

# или только изменённые страницы
node scripts/indexnow.cjs https://polus-servis77.ru/catalog.html https://polus-servis77.ru/
```

Это дополнение к `sitemap.xml`, а не замена. Отправляйте только новые/изменённые URL.

---

## 9. Полезные команды

```bash
cd /opt/polus-servis77

docker compose ps                  # статус контейнеров
docker compose logs -f mailer      # логи сервиса формы
docker compose logs -f nginx       # логи nginx
docker compose restart nginx       # перезапуск nginx
docker compose down                # остановить всё

sudo certbot certificates                      # статус SSL
sudo certbot renew --dry-run                   # тест автопродления
```
