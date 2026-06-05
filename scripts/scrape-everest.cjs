/*
 * scrape-everest.cjs — разовый сбор данных с сайта партнёра (everest-59.ru).
 *
 * Партнёр дал согласие на использование его карточек товаров (фото, описания,
 * характеристики) на нашем сайте. Скрипт обходит листинг категории, открывает
 * каждую карточку и складывает извлечённые данные в JSON. К веб-приложению
 * polus-servis77 он отношения не имеет — это автономная утилита для подготовки
 * данных.
 *
 * Запуск:
 *   node scripts/scrape-everest.cjs                       # категория по умолчанию
 *   node scripts/scrape-everest.cjs <путь-категории>      # своя категория
 *   node scripts/scrape-everest.cjs --images              # ещё и скачать картинки
 *
 * Пример:
 *   node scripts/scrape-everest.cjs catalog/plastinchatye_teploobmenniki/ --images
 *
 * Результат:
 *   assets/data/everest/<slug>.json   — массив товаров
 *   assets/images/everest/<file>      — картинки (только с флагом --images)
 *
 * Требует Node 18+ (используется встроенный fetch). HTML парсится регулярными
 * выражениями — сайт на Bitrix со стабильной разметкой, внешних зависимостей нет.
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');   // для конвертации картинок в webp

/* ── Настройки ──────────────────────────────────────────────── */
const ORIGIN   = 'https://everest-59.ru';
const UA       = 'Mozilla/5.0 (compatible; polus-servis-importer/1.0)';
const DELAY_MS = 700;          // пауза между запросами — не нагружаем партнёра
const RETRIES  = 3;
const OUT_DIR  = path.join('assets', 'data', 'everest');
const IMG_DIR  = path.join('assets', 'images', 'everest');

const args        = process.argv.slice(2);
const downloadImg = args.includes('--images');
const catPath     = (args.find(a => !a.startsWith('--')) || 'catalog/plastinchatye_teploobmenniki/')
  .replace(/^\/+/, '')
  .replace(/\/?$/, '/');

/* ── Утилиты ────────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

const decode = s => (s || '')
  .replace(/&quot;/g, '"').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&deg;/g, '°');

const stripTags = s => decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const absUrl = u => (u && u.startsWith('/')) ? ORIGIN + u : u;

async function fetchHtml(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (attempt === RETRIES) throw e;
      await sleep(DELAY_MS * attempt * 2);
    }
  }
}

/* ── Парсинг листинга категории ─────────────────────────────── */
async function collectProductLinks() {
  const catRe = new RegExp(
    'href="(/' + catPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z0-9_]+/\\d+/)"',
    'g',
  );
  const seen = new Set();
  for (let page = 1; ; page++) {
    const url  = `${ORIGIN}/${catPath}${page > 1 ? `?PAGEN_1=${page}` : ''}`;
    const html = await fetchHtml(url);
    const links = [...new Set([...html.matchAll(catRe)].map(m => m[1]))];
    const fresh = links.filter(l => !seen.has(l));
    fresh.forEach(l => seen.add(l));
    process.stdout.write(`  страница ${page}: +${fresh.length} (всего ${seen.size})\n`);
    if (!fresh.length) break;        // новых ссылок нет — листинг кончился
    await sleep(DELAY_MS);
  }
  return [...seen];
}

/* ── Парсинг карточки товара ────────────────────────────────── */
function parseProduct(html, url) {
  const pick = re => { const m = html.match(re); return m ? stripTags(m[1]) : ''; };

  const name    = pick(/<h1[^>]*id="pagetitle"[^>]*>([\s\S]*?)<\/h1>/) || pick(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const article = pick(/itemprop="sku"[^>]*content="([^"]*)"/);
  const priceRaw = pick(/itemprop="price"[^>]*content="([^"]*)"/);
  const price   = priceRaw ? Number(priceRaw.replace(/[^\d.]/g, '')) || null : null;

  // Характеристики: пары char_name / char_value в порядке следования
  const names = [...html.matchAll(/class="char_name"[^>]*>([\s\S]*?)<\/(?:td|div|span)>/g)].map(m => stripTags(m[1]));
  const vals  = [...html.matchAll(/class="char_value"[^>]*>([\s\S]*?)<\/(?:td|div|span)>/g)].map(m => stripTags(m[1]));
  const specs = {};
  names.forEach((n, i) => { if (n && vals[i] !== undefined) specs[n] = vals[i]; });

  // Картинки товара. Ссылки бывают двух видов:
  //   оригинал:  /upload/iblock/<hash>/<file>
  //   превью:    /upload/resize_cache/iblock/<hash>/<W>_<H>_.../<file>
  // Превью приводим к оригиналу (/upload/iblock/<hash>/<file>), чтобы картинка
  // не задваивалась и не терялась, если прямой ссылки на оригинал нет.
  // Но мелкие превью из сайдбара (иконки категорий 120×120, 32×32) к товару
  // не относятся — отбрасываем всё, что меньше 300px по ширине.
  const raw = [...html.matchAll(/(?:src|data-src|href)="(\/upload\/(?:resize_cache\/)?iblock\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi)]
    .map(m => m[1]);
  const images = [...new Set(
    raw
      .filter(u => {
        const m = u.match(/\/resize_cache\/iblock\/[^/]+\/(\d+)_\d+_/);
        return !m || Number(m[1]) >= 300;     // оригиналы пропускаем как есть
      })
      .map(u => u.replace(/\/upload\/resize_cache\/iblock\/([^/]+)\/[^/]+\//, '/upload/iblock/$1/')),
  )].map(absUrl);

  // Описание (мета og:description как краткое; характеристики дают остальное)
  const ogDesc = pick(/property="og:description"[^>]*content="([^"]*)"/);

  return {
    name,
    article,
    price,
    currency: price ? 'RUB' : null,
    specs,
    images,
    description: ogDesc,
    sourceUrl: absUrl(url),
  };
}

/* ── Скачивание картинок (опционально) ──────────────────────── */
async function downloadImages(products) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  let saved = 0;
  for (const p of products) {
    const local = [];
    for (const imgUrl of p.images) {
      // Сохраняем сразу в webp (меньше размер, быстрее грузится)
      const file = path.basename(new URL(imgUrl).pathname).replace(/\.(png|jpe?g|webp)$/i, '.webp');
      const dest = path.join(IMG_DIR, file);
      if (!fs.existsSync(dest)) {
        try {
          const res = await fetch(imgUrl, { headers: { 'User-Agent': UA } });
          if (res.ok) {
            await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: 85 }).toFile(dest);
            saved++;
            await sleep(DELAY_MS / 2);
          }
        } catch { /* пропускаем битую картинку */ }
      }
      local.push(`${IMG_DIR.replace(/\\/g, '/')}/${file}`);
    }
    p.localImages = local;
  }
  console.log(`Скачано картинок: ${saved}`);
}

/* ── Основной поток ─────────────────────────────────────────── */
(async () => {
  console.log(`Категория: /${catPath}`);
  console.log('Сбор ссылок на товары…');
  const links = await collectProductLinks();
  console.log(`Найдено товаров: ${links.length}\n`);

  const products = [];
  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    try {
      const html = await fetchHtml(ORIGIN + url);
      const p = parseProduct(html, url);
      products.push(p);
      process.stdout.write(`[${i + 1}/${links.length}] ${p.name || '???'} — ${p.images.length} фото, ${Object.keys(p.specs).length} хар-к\n`);
    } catch (e) {
      process.stdout.write(`[${i + 1}/${links.length}] ОШИБКА ${url}: ${e.message}\n`);
    }
    await sleep(DELAY_MS);
  }

  if (downloadImg) {
    console.log('\nСкачивание картинок…');
    await downloadImages(products);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = catPath.replace(/\/$/, '').split('/').pop();
  const dest = path.join(OUT_DIR, `${slug}.json`);
  fs.writeFileSync(dest, JSON.stringify({
    source:     ORIGIN,
    category:   catPath,
    scrapedAt:  new Date().toISOString(),
    count:      products.length,
    products,
  }, null, 2), 'utf8');

  console.log(`\nГотово. ${products.length} товаров → ${dest}`);
})().catch(e => { console.error('Сбой:', e); process.exit(1); });
