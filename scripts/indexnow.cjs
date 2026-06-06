/*
 * indexnow.cjs — уведомляет поисковики (Яндекс и др.) об изменениях по протоколу IndexNow.
 *
 * Берёт список URL из sitemap.xml и отправляет его на IndexNow.
 * Запускать после деплоя/обновления контента:
 *   node scripts/indexnow.cjs
 *
 * Можно передать конкретные изменённые URL (тогда sitemap не читается):
 *   node scripts/indexnow.cjs https://polus-servis77.ru/catalog.html https://polus-servis77.ru/
 *
 * Документация: https://yandex.ru/support/webmaster/ru/indexing-options/index-now.html
 * Требует Node 18+ (встроенный fetch).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const HOST     = 'polus-servis77.ru';
const KEY      = 'a790da1b5dc0851cadbb3630139ac157';
const KEY_FILE = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://yandex.com/indexnow';   // общий протокол; уведомляет Яндекс
const SITEMAP  = path.join(__dirname, '..', 'sitemap.xml');

// URL из аргументов или из sitemap.xml
function getUrls() {
  const fromArgs = process.argv.slice(2).filter(a => /^https?:\/\//.test(a));
  if (fromArgs.length) return fromArgs;

  const xml = fs.readFileSync(SITEMAP, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

(async () => {
  const urlList = getUrls();
  if (!urlList.length) {
    console.error('Нет URL для отправки (sitemap пуст или не найден).');
    process.exit(1);
  }

  const body = { host: HOST, key: KEY, keyLocation: KEY_FILE, urlList };

  console.log(`Отправка ${urlList.length} URL в IndexNow (${ENDPOINT})...`);
  try {
    const res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body:    JSON.stringify(body),
    });
    const text = await res.text().catch(() => '');
    // IndexNow: 200/202 — принято; 403 — ключ не найден/не совпал; 422 — некорректные URL
    if (res.status === 200 || res.status === 202) {
      console.log(`Готово. HTTP ${res.status} — URL приняты на обработку.`);
    } else {
      console.error(`HTTP ${res.status}. Ответ: ${text || '(пусто)'}`);
      if (res.status === 403) console.error(`Проверьте, что ключ доступен: ${KEY_FILE}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('Ошибка запроса:', e.message);
    process.exit(1);
  }
})();
